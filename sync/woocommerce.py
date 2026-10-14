"""从 WooCommerce 店铺读取咖啡豆（Tanat、Dak、Peoplepossession 这类）。

用的是 WooCommerce 自带的公开商品接口 /wp-json/wc/store/v1/products。
"""

from __future__ import annotations

import html
import re
import time
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

PAGE_SIZE = 50  # 有的店一次要 100 条会超时
MAX_PAGES = 20
ROAST_ATTRIBUTE_RE = re.compile(r"roast|torr[ée]faction", re.IGNORECASE)
FILTER_TERM_RE = re.compile(r"filt|omni", re.IGNORECASE)


def fetch_products(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    def load() -> list[dict]:
        products: list[dict] = []
        for page in range(1, MAX_PAGES + 1):
            if page > 1:
                time.sleep(REQUEST_INTERVAL)
            url = f"https://{roaster['host']}/wp-json/wc/store/v1/products?per_page={PAGE_SIZE}&page={page}"
            batch = get_json(url)
            products.extend(batch)
            if len(batch) < PAGE_SIZE:
                break
        return products

    return cached(cache_dir, roaster["slug"], load)


def _terms(product: dict, name_pattern: re.Pattern) -> list[str]:
    return [
        term["name"]
        for attribute in product.get("attributes") or []
        if name_pattern.search(attribute.get("name") or "")
        for term in attribute.get("terms") or []
    ]


def is_coffee(roaster: dict, product: dict) -> bool:
    """是否是要收录的手冲（或全能烘焙）咖啡豆。"""
    categories = {html.unescape(category["name"]) for category in product.get("categories") or []}
    if not categories & set(roaster["categories"]):
        return False
    if excluded_by_title(roaster, html.unescape(product.get("name") or "")):
        return False
    # 商品标了烘焙用途、且只有意式的，不收
    roast_terms = _terms(product, ROAST_ATTRIBUTE_RE)
    only_espresso = any("espresso" in term.lower() for term in roast_terms) and not any(
        FILTER_TERM_RE.search(term) for term in roast_terms
    )
    return not only_espresso


def _normalize(roaster: dict, product: dict) -> dict:
    title = " ".join(html.unescape(product.get("name") or "").split())
    body = plain_text(f"{product.get('short_description') or ''} {product.get('description') or ''}")
    # 产地、品种、处理法常常只写在商品属性里，一并算进信息指纹
    attributes = "；".join(
        f"{attribute['name']}：{'、'.join(term['name'] for term in attribute.get('terms') or [])}"
        for attribute in product.get("attributes") or []
    )
    body = f"{body} {html.unescape(attributes)}".strip()
    sizes = [size for term in _terms(product, re.compile(r"weight|poids", re.IGNORECASE)) for size in parse_sizes(term)]
    images = product.get("images") or []
    return {
        "roaster": roaster["name"],
        "handle": product["slug"],
        "title": title,
        "body": body,
        "source_hash": source_hash(title, body),
        "url": product["permalink"],
        "available": bool(product.get("is_in_stock")),
        "sizes": size_labels(sizes),
        "image": images[0]["src"] if images else "",
        "published_at": "",
    }


def list_coffees(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    """返回该烘焙商官网上的咖啡豆，每款一条。"""
    products = fetch_products(roaster, cache_dir)
    return [_normalize(roaster, product) for product in products if is_coffee(roaster, product)]
