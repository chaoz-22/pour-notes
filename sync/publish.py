"""把官网新豆整理成文档并上线，或对照官网核对、改正已有的豆子。"""

from __future__ import annotations

import hashlib
import json
import re

import cloudbase
from extract import extract_bean, fetch_page_text, verify_bean
from images import make_thumbnail

IMAGE_DIR = "/assets/bean-thumbnails-jpg"
STORAGE_ROOT = "roaster-guide"


def _examples(own_beans: list[dict]) -> list[dict]:
    """挑这家烘焙商资料最完整的两款，给模型当写法示例。"""
    written = [bean for bean in own_beans if bean.get("producerStory")]
    return sorted(written, key=lambda bean: -len(json.dumps(bean, ensure_ascii=False)))[:2]


def _house_roast(own_beans: list[dict]) -> str:
    """这家已有的豆子烘焙度全都一样时，官网没写烘焙度的新豆沿用它。"""
    roasts = {bean.get("roast") for bean in own_beans}
    return roasts.pop() if len(roasts) == 1 else ""


def _bean_id(roaster: dict, handle: str) -> str:
    """豆子 id 也用作图片文件名，只留英文数字；官网链接里有中文等字符时加一段指纹防重名。"""
    slug = re.sub(r"[^a-z0-9]+", "-", handle.lower()).strip("-")
    if slug != handle:
        slug = f"{slug}-{hashlib.sha256(handle.encode('utf-8')).hexdigest()[:6]}".strip("-")
    return f"{roaster['slug']}-{slug}"


def publish_new(roaster: dict, item: dict, own_beans: list[dict]) -> dict:
    bean_id = _bean_id(roaster, item["handle"])
    if any(bean["_id"] == bean_id for bean in own_beans):
        raise ValueError(f"{bean_id} 已存在，但没有和官网商品对应上，需要人工确认")

    info = extract_bean(roaster["name"], item, fetch_page_text(item["url"]), _examples(own_beans))
    image_path = ""
    if item["image"]:
        image_path = f"{IMAGE_DIR}/{roaster.get('image_dir', roaster['slug'])}/{bean_id}.jpg"
        cloudbase.upload_file(f"{STORAGE_ROOT}{image_path}", make_thumbnail(item["image"]))

    bean = {
        "_id": bean_id,
        "id": bean_id,
        **info,
        "roast": info["roast"] or _house_roast(own_beans),
        "roaster": roaster["name"],
        "image": image_path,
        "size": item["sizes"][0] if item["sizes"] else "",
        "enabled": True,
        "sourceUrl": item["url"],
        "sourceHash": item["source_hash"],
        "verifiedHash": item["source_hash"],  # 刚按官网生成的，不用再核对
    }
    cloudbase.insert_bean(bean)
    return bean


def needs_verify(bean: dict, item: dict) -> bool:
    """还没对照当前这版官网信息核对过。已下架的豆子不再跟进。"""
    return bean.get("enabled") is not False and bean.get("verifiedHash") != item["source_hash"]


def verify(roaster: dict, bean: dict, item: dict) -> list[dict]:
    """对照官网核对已有豆子，把写错的字段在原记录上改正，返回改动清单。

    核对过就记下官网信息的指纹；官网以后有变化时指纹对不上，会再核对一次。
    """
    corrections = verify_bean(roaster["name"], item, fetch_page_text(item["url"]), bean)
    changes = {correction["field"]: correction["value"] for correction in corrections}
    cloudbase.update_bean(bean["_id"], {**changes, "sourceHash": item["source_hash"], "verifiedHash": item["source_hash"]})
    return corrections
