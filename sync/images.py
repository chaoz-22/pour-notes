"""把官网的豆子主图处理成寻豆指南用的缩略图。"""

from __future__ import annotations

import urllib.request
from io import BytesIO

from PIL import Image

from shopify import USER_AGENT

# 与现有缩略图一致：最长边 600 的 JPG
MAX_SIDE = 600
JPEG_QUALITY = 85
MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024


def make_thumbnail(url: str) -> bytes:
    """下载图片并转成 JPG；透明背景铺成白底。"""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read(MAX_DOWNLOAD_BYTES + 1)
    if len(data) > MAX_DOWNLOAD_BYTES:
        raise ValueError(f"图片超过 {MAX_DOWNLOAD_BYTES // 1024 // 1024}MB：{url}")

    with Image.open(BytesIO(data)) as image:
        image = image.convert("RGBA")
        canvas = Image.new("RGB", image.size, "white")
        canvas.paste(image, mask=image.getchannel("A"))
    canvas.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    output = BytesIO()
    canvas.save(output, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return output.getvalue()
