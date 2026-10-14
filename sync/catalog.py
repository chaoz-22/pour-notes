"""各家官网抓取共用的部分：网络请求、文字处理、规格解析和标题筛选。

每种建站系统一个模块（shopify / woocommerce / cafe24 / april / hatch），都提供
list_coffees(roaster, cache_dir)，返回结构相同的商品列表。
"""

from __future__ import annotations

import hashlib
import html
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

from roasters import COMMON_EXCLUDE_TITLE

USER_AGENT = "PourNotesSync/0.1 (+https://github.com/chaoz-22/pour-notes)"
REQUEST_INTERVAL = 1.0
RETRIES = 2

SIZE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(kg|grams?|gr|g|lbs?|pounds?|oz)\b", re.IGNORECASE)
GRAMS_PER_UNIT = {"g": 1, "kg": 1000, "lb": 453.6, "oz": 28.35}


def fetch(url: str, accept: str = "*/*") -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": accept})
    for attempt in range(RETRIES + 1):
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code < 500 or attempt == RETRIES:
                raise
        except (urllib.error.URLError, TimeoutError):
            if attempt == RETRIES:
                raise
        time.sleep(3 * (attempt + 1))
    raise AssertionError("unreachable")


def get_json(url: str):
    return json.loads(fetch(url, "application/json"))


def get_text(url: str) -> str:
    return fetch(url, "text/html").decode("utf-8", "replace")


def cached(cache_dir: Path | None, name: str, load):
    """cache_dir 仅用于本地调试，避免反复请求官网。"""
    cache_file = cache_dir / f"{name}.json" if cache_dir else None
    if cache_file and cache_file.is_file():
        return json.loads(cache_file.read_text(encoding="utf-8"))
    data = load()
    if cache_file:
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return data


def excluded_by_title(roaster: dict, title: str) -> bool:
    """标题说明它不是要收的豆子：订阅、礼品卡、挂耳之类，或这家单独配置的排除词。"""
    if re.search(COMMON_EXCLUDE_TITLE, title, re.IGNORECASE):
        return True
    exclude_title = roaster.get("exclude_title")
    return bool(exclude_title and re.search(exclude_title, title, re.IGNORECASE))


def parse_sizes(text: str) -> list[tuple[float, str]]:
    """从 "250 grams / October 5"、"Kangocho, Tin 4kg" 之类的文字里取出规格。"""
    sizes = []
    for amount, unit in SIZE_RE.findall(text or ""):
        unit = unit.lower()
        unit = {"gram": "g", "grams": "g", "gr": "g", "lbs": "lb", "pound": "lb", "pounds": "lb"}.get(unit, unit)
        value = float(amount.replace(",", "."))
        label = f"{value:g}{unit}"
        sizes.append((value * GRAMS_PER_UNIT[unit], label))
    return sizes


def plain_text(body_html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", body_html or "")
    return " ".join(html.unescape(text).split())


def source_hash(title: str, body: str) -> str:
    """官网标题和介绍的指纹，用来判断信息有没有变。库存、价格、烘焙日期的变化不算。

    改动算法时要同时改前缀版本号，否则所有豆子都会被误判为"官网有更新"。
    """
    return "v1:" + hashlib.sha256(f"{title}\n{body}".encode("utf-8")).hexdigest()[:16]


def size_labels(sizes: list[tuple[float, str]]) -> list[str]:
    """去重并从小到大排列；"200g (7oz)" 这种同一规格的两种写法只留公制。"""
    kept: list[tuple[float, str]] = []
    for grams, label in sorted(set(sizes)):
        if kept and grams - kept[-1][0] <= kept[-1][0] * 0.03:
            if label.endswith("g"):
                kept[-1] = (grams, label)
            continue
        kept.append((grams, label))
    return [label for _, label in kept]
