"""从 April 官网读取咖啡豆。

April 的官网是套在 Shopify 外面的自建前端，商品接口没有开放，
但系列页的网页里内嵌了该系列全部商品的数据（Next.js 的 initialProducts）。
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from catalog import cached, excluded_by_title, get_text, parse_sizes, plain_text, size_labels, source_hash

BASE_URL = "https://www.aprilcoffeeroasters.com"
PAYLOAD_RE = re.compile(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)')
MARKER = '"initialProducts":'


def parse_collection(page: str) -> list[dict]:
    """取出系列页里内嵌的商品数据。"""
    stream = "".join(json.loads(chunk) for chunk in PAYLOAD_RE.findall(page))
    start = stream.find(MARKER)
    if start < 0:
        raise ValueError("April 系列页里没有找到商品数据，页面结构可能变了")
    products, _ = json.JSONDecoder().raw_decode(stream[start + len(MARKER):])
    return products


def fetch_products(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    def load() -> list[dict]:
        products: dict[str, dict] = {}
        for collection in roaster["collections"]:
            for product in parse_collection(get_text(f"{BASE_URL}/collections/{collection}")):
                products.setdefault(product["handle"], product)
        return list(products.values())

    return cached(cache_dir, roaster["slug"], load)


def _normalize(roaster: dict, product: dict) -> dict:
    title = " ".join((product.get("title") or "").split())
    supplier = (product.get("supplierInformation") or {}).get("value") or ""
    description = plain_text((product.get("descriptionHtml") or product.get("description") or "").replace("<br>", " <br> "))
    body = f"{description} {supplier}".strip()
    sizes = [size for variant in product.get("variants") or [] for size in parse_sizes(variant.get("title") or "")]
    return {
        "roaster": roaster["name"],
        "handle": product["handle"],
        "title": title,
        "body": body,
        "source_hash": source_hash(title, body),
        "url": f"{BASE_URL}/product/{product['handle']}",  # 这家的商品页路径是单数 product
        "available": bool(product.get("availableForSale")),
        "sizes": size_labels(sizes),
        "image": (product.get("featuredImage") or {}).get("url") or "",
        "published_at": "",
        # 商品页的介绍是浏览器里才渲染出来的，直接抓网页拿不到，所以用内嵌数据里的文字
        "page_text": f"{title}\n{description}\n{supplier}",
    }


def list_coffees(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    """返回 April 官网上的咖啡豆，每款一条。"""
    products = fetch_products(roaster, cache_dir)
    return [_normalize(roaster, product) for product in products if not excluded_by_title(roaster, product.get("title") or "")]
