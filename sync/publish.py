"""把官网新豆整理成文档并上线，或用官网最新信息更新已有的豆子。"""

from __future__ import annotations

import json

import cloudbase
from extract import BeanInfo, extract_bean, fetch_page_text
from images import make_thumbnail

IMAGE_DIR = "/assets/bean-thumbnails-jpg"
STORAGE_ROOT = "roaster-guide"
# 官网信息更新时不改名字，免得用户眼熟的豆名突然变了
REFRESH_FIELDS = [field for field in BeanInfo.model_fields if field not in ("name", "detailName")]


def _examples(own_beans: list[dict]) -> list[dict]:
    """挑这家烘焙商资料最完整的两款，给模型当写法示例。"""
    written = [bean for bean in own_beans if bean.get("producerStory")]
    return sorted(written, key=lambda bean: -len(json.dumps(bean, ensure_ascii=False)))[:2]


def _house_roast(own_beans: list[dict]) -> str:
    """这家已有的豆子烘焙度全都一样时，官网没写烘焙度的新豆沿用它。"""
    roasts = {bean.get("roast") for bean in own_beans}
    return roasts.pop() if len(roasts) == 1 else ""


def publish_new(roaster: dict, item: dict, own_beans: list[dict]) -> dict:
    bean_id = f"{roaster['slug']}-{item['handle']}"
    if any(bean["_id"] == bean_id for bean in own_beans):
        raise ValueError(f"{bean_id} 已存在，但没有和官网商品对应上，需要人工确认")

    info = extract_bean(roaster["name"], item, fetch_page_text(item["url"]), _examples(own_beans))
    image_path = ""
    if item["image"]:
        image_path = f"{IMAGE_DIR}/{roaster.get('image_dir', roaster['slug'])}/{bean_id}.jpg"
        cloudbase.upload_file(f"{STORAGE_ROOT}{image_path}", make_thumbnail(item["image"]))

    bean = {
        "_id": bean_id,
        "id": bean_id,
        **info,
        "roast": info["roast"] or _house_roast(own_beans),
        "roaster": roaster["name"],
        "image": image_path,
        "size": item["sizes"][0] if item["sizes"] else "",
        "enabled": True,
        "sourceUrl": item["url"],
        "sourceHash": item["source_hash"],
    }
    cloudbase.insert_bean(bean)
    return bean


def needs_refresh(bean: dict, item: dict) -> bool:
    """官网的标题或介绍和上次记录的不一样了。已下架的豆子不再跟进。"""
    recorded = bean.get("sourceHash") or ""
    return bean.get("enabled") is not False and bool(recorded) and recorded != item["source_hash"]


def refresh(roaster: dict, bean: dict, item: dict, own_beans: list[dict]) -> list[str]:
    """用官网最新信息改写已有豆子，返回改动了的字段。官网没提到的字段保持原样。"""
    same_version = bean["sourceHash"].split(":")[0] == item["source_hash"].split(":")[0]
    changes = {}
    if same_version:
        info = extract_bean(roaster["name"], item, fetch_page_text(item["url"]), _examples(own_beans))
        changes = {field: info[field] for field in REFRESH_FIELDS if info[field] and info[field] != bean.get(field)}
    cloudbase.update_bean(bean["_id"], {**changes, "sourceHash": item["source_hash"]})
    return list(changes)
