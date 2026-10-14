"""从 Cafe24 店铺读取咖啡豆（Aery 用的韩国建站系统）。

没有商品接口，只能读分类列表页的网页：每个商品一个 themePrdItems 块。
"""

from __future__ import annotations

import html
import re
import time
from pathlib import Path

from catalog import cached, excluded_by_title, get_text, plain_text, source_hash

PAGE_INTERVAL = 0.5
ITEM_RE = re.compile(r'(?=<div class="themePrdItems)')
STRIP_RE = re.compile(r"<(script|style|noscript|svg|template)\b.*?</\1>", re.S | re.I)


def parse_list(page: str) -> list[dict]:
    """从分类列表页取出每个商品的编号、链接、名称、图片和是否售罄。"""
    products = []
    for block in ITEM_RE.split(page)[1:]:
        link = re.search(r'href="/product/([^"/]+)/(\d+)/', block)
        name = re.search(r'<img[^>]+alt="([^"]*)"', block)
        image = re.search(r'data-src="([^"]+)"', block)
        if not link or not name:
            continue
        products.append({
            "slug": link.group(1),
            "number": link.group(2),
            "title": " ".join(html.unescape(name.group(1)).split()),
            "image": ("https:" + image.group(1)) if image and image.group(1).startswith("//") else (image.group(1) if image else ""),
            "sold_out": bool(re.search(r'ico_product_soldout|alt="Out-of-stock"', block)),
        })
    return products


def fetch_products(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    def load() -> list[dict]:
        base = f"https://{roaster['host']}"
        products = parse_list(get_text(f"{base}/product/list.html?cate_no={roaster['category']}"))
        products = [product for product in products if not excluded_by_title(roaster, product["title"])]
        for product in products:
            # 介绍文字只在商品页上，用来判断官网信息有没有变
            time.sleep(PAGE_INTERVAL)
            product["body"] = plain_text(STRIP_RE.sub(" ", get_text(f"{base}/product/{product['slug']}/{product['number']}/")))
        return products

    return cached(cache_dir, roaster["slug"], load)


def list_coffees(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    """返回该店官网上的咖啡豆，每款一条。"""
    items, seen = [], set()
    for product in fetch_products(roaster, cache_dir):
        if product["number"] in seen:
            continue
        seen.add(product["number"])
        items.append({
            "roaster": roaster["name"],
            "handle": f"{product['slug']}-{product['number']}",
            "title": product["title"],
            "body": product["body"],
            "source_hash": source_hash(product["title"], product["body"]),
            "url": f"https://{roaster['host']}/product/{product['slug']}/{product['number']}/",
            "available": not product["sold_out"],
            "sizes": [],
            "image": product["image"],
            "published_at": "",
        })
    return items
