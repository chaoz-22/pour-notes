"""从 Hatch 官网读取咖啡豆。

Hatch 是自建网站，没有商品接口，只能读商品列表页 /shop 的网页：
页面按分类分段，每段一个小标题，下面是商品卡片。
"""

from __future__ import annotations

import html
import re
import time
import urllib.parse
from pathlib import Path

from catalog import cached, excluded_by_title, get_text, plain_text, source_hash

BASE_URL = "https://hatchcrafted.com"
PAGE_INTERVAL = 0.5
CARD_RE = re.compile(r'(?=<a class="group block[^"]*" href="/shop/)')


def _text(fragment: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def parse_shop(page: str) -> list[dict]:
    """从商品列表页取出每个商品的分类、链接、标题、图片和是否售罄。"""
    page = re.sub(r"<script\b.*?</script>", "", page, flags=re.S)
    products = []
    for section in re.split(r"<section\b", page):
        heading = re.search(r"<h2[^>]*>(.*?)</h2>", section, re.S)
        if not heading:
            continue
        category = _text(heading.group(1))
        for card in CARD_RE.split(section)[1:]:
            slug = re.search(r'href="/shop/([^"/]+)"', card)
            title = re.search(r'<img alt="([^"]*)"', card)
            image = re.search(r"/_next/image\?url=([^&\"\s]+)", card)
            if not slug or not title:
                continue
            products.append({
                "category": category,
                "slug": slug.group(1),
                "title": " ".join(html.unescape(title.group(1)).split()),
                "image": urllib.parse.unquote(html.unescape(image.group(1))) if image else "",
                "sold_out": bool(re.search(r"sold\s*out", _text(card), re.IGNORECASE)),
            })
    return products


def fetch_products(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    def load() -> list[dict]:
        wanted = set(roaster["categories"])
        products = [product for product in parse_shop(get_text(f"{BASE_URL}/shop")) if product["category"] in wanted]
        for product in products:
            # 介绍文字只在商品页上，用来判断官网信息有没有变
            time.sleep(PAGE_INTERVAL)
            product["body"] = plain_text(
                re.sub(r"<(script|style|noscript|svg|template)\b.*?</\1>", " ", get_text(f"{BASE_URL}/shop/{product['slug']}"), flags=re.S | re.I)
            )
        return products

    return cached(cache_dir, roaster["slug"], load)


def list_coffees(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    """返回 Hatch 官网上的咖啡豆，每款一条。"""
    items, seen = [], set()
    for product in fetch_products(roaster, cache_dir):
        if product["slug"] in seen or excluded_by_title(roaster, product["title"]):
            continue
        seen.add(product["slug"])
        items.append({
            "roaster": roaster["name"],
            "handle": product["slug"],
            "title": product["title"],
            "body": product["body"],
            "source_hash": source_hash(product["title"], product["body"]),
            "url": f"{BASE_URL}/shop/{product['slug']}",
            "available": not product["sold_out"],
            "sizes": [],
            "image": product["image"],
            "published_at": "",
        })
    return items
