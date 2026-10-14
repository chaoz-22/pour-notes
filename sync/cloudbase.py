"""通过 CloudBase HTTP API 读写云端的豆单数据库和云存储。

密钥从环境变量 CLOUDBASE_API_KEY 读取；本地运行时从 sync/.env 加载。
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ENV_ID = "pour-notes-d8gg2pilacb585b96"
COLLECTION = "roaster_guide_beans"
GATEWAY_URL = f"https://{ENV_ID}.api.tcloudbasegateway.com"
DATABASE_URL = f"{GATEWAY_URL}/v1/database/instances/(default)/databases/(default)"
STORAGE_URL = f"{GATEWAY_URL}/v1/storages"
PAGE_SIZE = 100
RETRIES = 2
ENV_FILE = Path(__file__).resolve().parent / ".env"


class CloudBaseError(RuntimeError):
    pass


def load_env_file() -> None:
    """把 sync/.env 里的 KEY=VALUE 读进环境变量；已有的环境变量优先。"""
    if not ENV_FILE.is_file():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.strip().partition("=")
        if separator and key and not key.startswith("#") and value:
            os.environ.setdefault(key, value.strip())


def _call(method: str, url: str, query: dict | None = None, body: dict | list | None = None):
    api_key = os.environ.get("CLOUDBASE_API_KEY")
    if not api_key:
        raise CloudBaseError("缺少 CLOUDBASE_API_KEY，请在 sync/.env 或环境变量里配置")
    if query:
        url += "?" + urllib.parse.urlencode(query)
    request = urllib.request.Request(
        url,
        method=method,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    path = urllib.parse.urlparse(url).path
    for attempt in range(RETRIES + 1):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:500]
            raise CloudBaseError(f"{method} {path} 失败（HTTP {error.code}）：{detail}") from None
        except (urllib.error.URLError, TimeoutError) as error:
            # 网络抖动重试；新增文档除外，免得第一次其实成功了又插一遍
            if attempt == RETRIES or (method == "POST" and "/documents" in path):
                raise CloudBaseError(f"{method} {path} 网络错误：{error}") from None
            time.sleep(3 * (attempt + 1))
    raise AssertionError("unreachable")


def _request(method: str, path: str, query: dict | None = None, body: dict | None = None) -> dict:
    return _call(method, f"{DATABASE_URL}{path}", query, body)


def _from_ejson(value):
    """接口返回 Strict EJSON，把 {"$numberInt": "16"} 这类还原成普通数字。"""
    if isinstance(value, list):
        return [_from_ejson(item) for item in value]
    if isinstance(value, dict):
        if len(value) == 1:
            (key, inner), = value.items()
            if key in ("$numberInt", "$numberLong"):
                return int(inner)
            if key in ("$numberDouble", "$numberDecimal"):
                number = float(inner)
                return int(number) if number.is_integer() else number
        return {key: _from_ejson(inner) for key, inner in value.items()}
    return value


def count_beans() -> int:
    result = _request("GET", f"/collections/{COLLECTION}/documents", {"count": "true"})
    return int(_from_ejson(result["total"]))


def list_beans() -> list[dict]:
    """读取集合里的全部豆子（包括已下架的）。"""
    beans: list[dict] = []
    while True:
        page = _request(
            "GET",
            f"/collections/{COLLECTION}/documents",
            {"offset": len(beans), "limit": PAGE_SIZE, "order": json.dumps([{"field": "_id", "direction": "asc"}])},
        )
        items = _from_ejson(page.get("list") or [])
        beans.extend(items)
        if len(items) < PAGE_SIZE:
            return beans


def update_bean(bean_id: str, fields: dict) -> None:
    """只改指定字段，文档里的其他内容保持不变。"""
    _request(
        "PATCH",
        f"/collections/{COLLECTION}/documents/{urllib.parse.quote(bean_id, safe='')}",
        body={"data": {"$set": fields}, "replaceMode": False, "upsert": False},
    )


def insert_bean(bean: dict) -> None:
    _request("POST", f"/collections/{COLLECTION}/documents", body={"data": [bean]})


def upload_file(cloud_path: str, data: bytes) -> str:
    """上传到云存储的指定路径（已存在则覆盖），返回 cloud:// 文件 ID。"""
    info = _call("POST", f"{STORAGE_URL}/get-objects-upload-info", body=[{"objectId": cloud_path}])[0]
    if "uploadUrl" not in info:
        raise CloudBaseError(f"获取上传地址失败：{info.get('code')} {info.get('message')}")
    request = urllib.request.Request(
        info["uploadUrl"],
        method="PUT",
        data=data,
        headers={
            "Authorization": info["authorization"],
            "X-Cos-Security-Token": info["token"],
            "X-Cos-Meta-Fileid": info["cloudObjectMeta"],
        },
    )
    for attempt in range(RETRIES + 1):
        try:
            with urllib.request.urlopen(request, timeout=60):
                return info["cloudObjectId"]
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:300]
            raise CloudBaseError(f"上传 {cloud_path} 失败（HTTP {error.code}）：{detail}") from None
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt == RETRIES:
                raise CloudBaseError(f"上传 {cloud_path} 网络错误：{error}") from None
            time.sleep(3 * (attempt + 1))
    raise AssertionError("unreachable")
