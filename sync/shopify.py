"""从 Shopify 店铺读取商品，筛出咖啡豆并整理成统一结构。"""

from __future__ import annotations

import hashlib
import html
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from roasters import COMMON_EXCLUDE_TITLE

USER_AGENT = "PourNotesSync/0.1 (+https://github.com/chaoz-22/pour-notes)"
PAGE_SIZE = 250
MAX_PAGES = 20
REQUEST_INTERVAL = 1.0
RETRIES = 2
# 有的店铺把历年卖过的豆子都留在商品列表里，售罄超过这个天数的不再参与对比
ARCHIVE_DAYS = 365
BULK_GRAMS = 500

FILTER_WORDS_RE = re.compile(r"filter|pour[\s-]?over|omni", re.IGNORECASE)
SIZE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(kg|g|grams?|lbs?|pounds?|oz)\b", re.IGNORECASE)
SIZE_SUFFIX_RE = re.compile(
    r",\s*(?:tin\s*)?\d+(?:[.,]\d+)?\s*k?g(?:\s*tin)?\s*$", re.IGNORECASE
)
GRAMS_PER_UNIT = {"g": 1, "kg": 1000, "lb": 453.6, "oz": 28.35}


def _get_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(RETRIES + 1):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            if attempt == RETRIES:
                raise
            time.sleep(3 * (attempt + 1))
    raise AssertionError("unreachable")


def fetch_products(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    """读取店铺（或指定系列）的全部商品。cache_dir 仅用于本地调试，避免反复请求官网。"""
    cache_file = cache_dir / f"{roaster['slug']}.json" if cache_dir else None
    if cache_file and cache_file.is_file():
        return json.loads(cache_file.read_text(encoding="utf-8"))

    collection = roaster.get("collection")
    path = f"/collections/{collection}/products.json" if collection else "/products.json"
    products: list[dict] = []
    for page in range(1, MAX_PAGES + 1):
        if page > 1:
            time.sleep(REQUEST_INTERVAL)
        url = f"https://{roaster['host']}{path}?limit={PAGE_SIZE}&page={page}"
        batch = _get_json(url).get("products", [])
        products.extend(batch)
        if len(batch) < PAGE_SIZE:
            break

    if cache_file:
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps(products, ensure_ascii=False), encoding="utf-8")
    return products


def _is_espresso(product: dict) -> bool:
    """标题或分类写明 espresso 的算意式；店铺没标明用途时，再看介绍里是否只提 espresso。"""
    label = f"{product.get('title') or ''} {product.get('product_type') or ''}"
    if re.search("espresso", label, re.IGNORECASE):
        return True
    if FILTER_WORDS_RE.search(f"{label} {' '.join(map(str, product.get('tags') or []))}"):
        return False
    body = _plain_text(product.get("body_html") or "")
    return bool(re.search("espresso", body, re.IGNORECASE)) and not FILTER_WORDS_RE.search(body)


def is_coffee(roaster: dict, product: dict) -> bool:
    """是否是要收录的手冲（或全能烘焙）咖啡豆。"""
    title = product.get("title") or ""
    tags = {str(tag).lower() for tag in product.get("tags") or []}
    types = roaster.get("types")
    if types and product.get("product_type") not in types:
        return False
    if any(tag.lower() in tags for tag in roaster.get("exclude_tags", [])):
        return False
    require_tags = roaster.get("require_tags")
    if require_tags and not any(tag.lower() in tags for tag in require_tags):
        return False
    if re.search(COMMON_EXCLUDE_TITLE, title, re.IGNORECASE):
        return False
    exclude_title = roaster.get("exclude_title")
    if exclude_title and re.search(exclude_title, title, re.IGNORECASE):
        return False
    return not _is_espresso(product)


def _parse_sizes(text: str) -> list[tuple[float, str]]:
    """从 "250 grams / October 5"、"Kangocho, Tin 4kg" 之类的文字里取出规格。"""
    sizes = []
    for amount, unit in SIZE_RE.findall(text or ""):
        unit = unit.lower()
        unit = {"gram": "g", "grams": "g", "lbs": "lb", "pound": "lb", "pounds": "lb"}.get(unit, unit)
        value = float(amount.replace(",", "."))
        label = f"{value:g}{unit}"
        sizes.append((value * GRAMS_PER_UNIT[unit], label))
    return sizes


def _plain_text(body_html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", body_html or "")
    return " ".join(html.unescape(text).split())


def _source_hash(title: str, body: str) -> str:
    """官网标题和介绍的指纹，用来判断信息有没有变。库存、价格、烘焙日期的变化不算。

    改动算法时要同时改前缀版本号，否则所有豆子都会被误判为"官网有更新"。
    """
    return "v1:" + hashlib.sha256(f"{title}\n{body}".encode("utf-8")).hexdigest()[:16]


def _normalize(roaster: dict, product: dict) -> dict:
    variants = product.get("variants") or []
    title = " ".join((product.get("title") or "").split())
    body = _plain_text(product.get("body_html") or "")
    sizes = _parse_sizes(product.get("title") or "") if roaster.get("group_by_size") else []
    for variant in variants:
        sizes.extend(_parse_sizes(variant.get("title") or ""))
    images = product.get("images") or []
    return {
        "roaster": roaster["name"],
        "handle": product["handle"],
        "title": title,
        "body": body,
        "source_hash": _source_hash(title, body),
        "url": f"https://{roaster['host']}/products/{product['handle']}",
        "available": any(variant.get("available") for variant in variants),
        "sizes": sizes,
        "image": images[0]["src"] if images else "",
        "published_at": product.get("published_at") or "",
    }


def _size_labels(sizes: list[tuple[float, str]]) -> list[str]:
    """去重并从小到大排列；"200g (7oz)" 这种同一规格的两种写法只留公制。"""
    kept: list[tuple[float, str]] = []
    for grams, label in sorted(set(sizes)):
        if kept and grams - kept[-1][0] <= kept[-1][0] * 0.03:
            if label.endswith("g"):
                kept[-1] = (grams, label)
            continue
        kept.append((grams, label))
    return [label for _, label in kept]


def _published_after(item: dict, cutoff: datetime) -> bool:
    try:
        return datetime.fromisoformat(item["published_at"]) >= cutoff
    except ValueError:
        return True


def _merge_by_size(items: list[dict]) -> list[dict]:
    groups: dict[str, list[dict]] = {}
    for item in items:
        base_title = SIZE_SUFFIX_RE.sub("", item["title"]).strip()
        groups.setdefault(base_title.lower(), []).append({**item, "title": base_title})

    merged = []
    for group in groups.values():
        # 以最小规格的商品作为这款豆的代表，链接和图片都取它的
        primary = min(group, key=lambda item: min((g for g, _ in item["sizes"]), default=float("inf")))
        merged.append({
            **primary,
            "available": any(item["available"] for item in group),
            "sizes": [size for item in group for size in item["sizes"]],
            "published_at": max(item["published_at"] for item in group),
        })
    return merged


def list_coffees(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    """返回该烘焙商官网上的咖啡豆，每款一条。"""
    products = fetch_products(roaster, cache_dir)
    items = [_normalize(roaster, product) for product in products if is_coffee(roaster, product)]
    if roaster.get("group_by_size"):
        items = _merge_by_size(items)
    if roaster.get("skip_bulk"):
        items = [item for item in items if not item["sizes"] or min(g for g, _ in item["sizes"]) < BULK_GRAMS]
    cutoff = datetime.now(timezone.utc) - timedelta(days=ARCHIVE_DAYS)
    items = [item for item in items if item["available"] or _published_after(item, cutoff)]
    for item in items:
        item["sizes"] = _size_labels(item["sizes"])
    return items
