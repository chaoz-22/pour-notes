"""把只以图片形式放在商品页上的介绍读成文字（目前是 Aery）。

这类店的产区、海拔、风味都画在一张长图里，网页上没有对应的文字。这里让 Claude
逐字读出图里的文字，接在网页文字后面交给 DeepSeek 整理。密钥从环境变量
ANTHROPIC_API_KEY 读取；本地运行时从 sync/.env 加载。
"""

from __future__ import annotations

import base64
from io import BytesIO

import anthropic
from PIL import Image

from catalog import fetch

MODEL = "claude-opus-5-5"
# 介绍图常见 860×3800 这种长条，整张发过去会被缩到看不清字，切成几段再发
TILE_HEIGHT = 1200
MAX_WIDTH = 1200
MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024

PROMPT = """这些图片按顺序拼起来，是一款咖啡豆在烘焙商官网上的商品介绍图。请把图里的文字逐字转写出来。

- 保留原文语言，不要翻译、总结或改写；表格和「字段 : 值」写成一行一项。
- 按图片里的阅读顺序输出，切图处被拦腰截断的句子接起来写。
- 没有文字的照片、装饰图案跳过，不用描述。

只输出转写的文字，不要加任何说明。"""


class DetailImageError(RuntimeError):
    pass


def _tiles(url: str) -> list[bytes]:
    """下载一张介绍图，铺白底后按 TILE_HEIGHT 切成 JPG。"""
    data = fetch(url)
    if len(data) > MAX_DOWNLOAD_BYTES:
        raise DetailImageError(f"介绍图超过 {MAX_DOWNLOAD_BYTES // 1024 // 1024}MB：{url}")
    with Image.open(BytesIO(data)) as image:
        image = image.convert("RGBA")
        canvas = Image.new("RGB", image.size, "white")
        canvas.paste(image, mask=image.getchannel("A"))
    if canvas.width > MAX_WIDTH:
        canvas = canvas.resize((MAX_WIDTH, round(canvas.height * MAX_WIDTH / canvas.width)), Image.Resampling.LANCZOS)

    tiles = []
    for top in range(0, canvas.height, TILE_HEIGHT):
        output = BytesIO()
        canvas.crop((0, top, canvas.width, min(top + TILE_HEIGHT, canvas.height))).save(output, "JPEG", quality=90)
        tiles.append(output.getvalue())
    return tiles


def read_detail_images(urls: list[str], title: str) -> str:
    """返回介绍图里的文字；urls 为空时返回空字符串。"""
    if not urls:
        return ""
    content = [
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                     "data": base64.standard_b64encode(tile).decode("ascii")}}
        for url in urls for tile in _tiles(url)
    ]
    content.append({"type": "text", "text": PROMPT})

    client = anthropic.Anthropic()
    try:
        response = client.beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            # 照着图抄字不需要多想
            output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=[{"role": "user", "content": content}],
        )
    except anthropic.RateLimitError as error:
        raise DetailImageError(f"Claude API 限流：{error.message}") from error
    except anthropic.APIStatusError as error:
        raise DetailImageError(f"Claude API 返回错误（{error.status_code}）：{error.message}") from error
    except anthropic.APIConnectionError as error:
        raise DetailImageError(f"连不上 Claude API：{error}") from error

    if response.stop_reason == "refusal":
        raise DetailImageError(f"Claude 拒绝读取介绍图：{title}")
    if response.stop_reason == "max_tokens":
        raise DetailImageError(f"介绍图文字过长，转写被截断：{title}")
    text = "\n".join(block.text for block in response.content if block.type == "text").strip()
    if not text:
        raise DetailImageError(f"介绍图里没有读出文字：{title}")
    return text
