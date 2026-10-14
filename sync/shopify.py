"""从 Shopify 店铺读取商品，筛出咖啡豆并整理成统一结构。"""

from __future__ import annotations

import re
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

from catalog import (
    REQUEST_INTERVAL,
    cached,
    excluded_by_title,
    get_json,
    parse_sizes,
    plain_text,
    size_labels,
    source_hash,
)

PAGE_SIZE = 250
MAX_PAGES = 20
# 有的店铺把历年卖过的豆子都留在商品列表里，售罄超过这个天数的不再参与对比
ARCHIVE_DAYS = 365
BULK_GRAMS = 500

FILTER_WORDS_RE = re.compile(r"filter|pour[\s-]?over|omni", re.IGNORECASE)
SIZE_SUFFIX_RE = re.compile(
    r",\s*(?:tin\s*)?\d+(?:[.,]\d+)?\s*k?g(?:\s*tin)?\s*$", re.IGNORECASE
)


def fetch_products(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    """读取店铺（或指定系列）的全部商品。"""
    def load() -> list[dict]:
        collection = roaster.get("collection")
        path = f"/collections/{collection}/products.json" if collection else "/products.json"
        products: list[dict] = []
        for page in range(1, MAX_PAGES + 1):
            if page > 1:
                time.sleep(REQUEST_INTERVAL)
            batch = get_json(f"https://{roaster['host']}{path}?limit={PAGE_SIZE}&page={page}").get("products", [])
            products.extend(batch)
            if len(batch) < PAGE_SIZE:
                break
        return products

    return cached(cache_dir, roaster["slug"], load)


def _is_espresso(product: dict) -> bool:
    """标题或分类写明 espresso 的算意式；店铺没标明用途时，再看介绍里是否只提 espresso。"""
    label = f"{product.get('title') or ''} {product.get('product_type') or ''}"
    if re.search("espresso", label, re.IGNORECASE):
        return True
    if FILTER_WORDS_RE.search(f"{label} {' '.join(map(str, product.get('tags') or []))}"):
        return False
    body = plain_text(product.get("body_html") or "")
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
    if excluded_by_title(roaster, title):
        return False
    return not _is_espresso(product)


def _normalize(roaster: dict, product: dict) -> dict:
    variants = product.get("variants") or []
    title = " ".join((product.get("title") or "").split())
    body = plain_text(product.get("body_html") or "")
    sizes = parse_sizes(product.get("title") or "") if roaster.get("group_by_size") else []
    for variant in variants:
        sizes.extend(parse_sizes(variant.get("title") or ""))
    images = product.get("images") or []
    return {
        "roaster": roaster["name"],
        "handle": product["handle"],
        "title": title,
        "body": body,
        "source_hash": source_hash(title, body),
        "url": f"https://{roaster['host']}/products/{urllib.parse.quote(product['handle'])}",
        "available": any(variant.get("available") for variant in variants),
        "sizes": sizes,
        "image": images[0]["src"] if images else "",
        "published_at": product.get("published_at") or "",
    }


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
        item["sizes"] = size_labels(item["sizes"])
    return items
