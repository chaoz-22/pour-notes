"""从 Cafe24 店铺读取咖啡豆（Aery 用的韩国建站系统）。

没有商品接口，只能读分类列表页的网页：每个商品一个 themePrdItems 块。
商品介绍是商品页上的图片，图片地址放在 detail_images 里，上线和核对时再读成文字。
"""

from __future__ import annotations

import html
import re
import time
from collections import Counter
from pathlib import Path

from catalog import cached, excluded_by_title, get_text, plain_text, source_hash

PAGE_INTERVAL = 0.5
ITEM_RE = re.compile(r'(?=<div class="themePrdItems)')
STRIP_RE = re.compile(r"<(script|style|noscript|svg|template)\b.*?</\1>", re.S | re.I)
# 商品介绍编辑器上传的图片，懒加载时地址在 ec-data-src 里
DETAIL_IMAGE_RE = re.compile(r'<img[^>]+?(?:ec-data-src|src)="((?:https:)?//[^"]+/web/upload/NNEditor/[^"]+)"')
# 同一张图复制到别的商品时会换目录、加 copy-编号- 前缀或 " (2)" 后缀（文件名里写作 2028229）
COPY_PREFIX_RE = re.compile(r"^copy-\d+-")
COPY_SUFFIX_RE = re.compile(r"2028\d+29$")


def _image_key(url: str) -> str:
    """介绍图的文件名去掉复制时加的前后缀，用来认出不同商品上的同一张图。"""
    name = url.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    return COPY_SUFFIX_RE.sub("", COPY_PREFIX_RE.sub("", name))


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
            page = get_text(f"{base}/product/{product['slug']}/{product['number']}/")
            product["body"] = plain_text(STRIP_RE.sub(" ", page))
            product["detail_images"] = list(dict.fromkeys(
                "https:" + url if url.startswith("//") else url for url in DETAIL_IMAGE_RE.findall(page)
            ))
        # 不止一款挂着的图是全店通用的运费说明、冲煮指南，不算这款豆子的介绍
        # 同一款在列表里可能出现两次，按商品编号计数
        by_number = {product["number"]: {_image_key(url) for url in product["detail_images"]} for product in products}
        shared = Counter(key for keys in by_number.values() for key in keys)
        for product in products:
            product["detail_images"] = [url for url in product["detail_images"] if shared[_image_key(url)] == 1]
        return products

    return cached(cache_dir, roaster["slug"], load)


def list_coffees(roaster: dict, cache_dir: Path | None = None) -> list[dict]:
    """返回该店官网上的咖啡豆，每款一条。"""
    items, seen = [], set()
    for product in fetch_products(roaster, cache_dir):
        if product["number"] in seen:
            continue
        seen.add(product["number"])
        detail_images = product.get("detail_images", [])
        # 介绍图换了网页文字不一定变，指纹里带上图片地址
        body = "\n".join([product["body"], *detail_images])
        items.append({
            "roaster": roaster["name"],
            "handle": f"{product['slug']}-{product['number']}",
            "title": product["title"],
            "body": body,
            "source_hash": source_hash(product["title"], body),
            "url": f"https://{roaster['host']}/product/{product['slug']}/{product['number']}/",
            "available": not product["sold_out"],
            "sizes": [],
            "image": product["image"],
            "published_at": "",
            "detail_images": detail_images,
        })
    return items
