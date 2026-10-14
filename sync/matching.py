"""把官网商品和数据库里已有的豆子对上号。

数据库里的豆名是人工整理的短名（如 "HLE Buenos Aires"），官网标题则很长，
所以按关键词重合度打分，而不是直接比较字符串。
"""

from __future__ import annotations

import re
import unicodedata

STOPWORDS = {
    "finca", "hacienda", "estate", "coffee", "coffees", "the", "by", "and",
    "de", "del", "la", "el", "las", "los", "lot", "lote",
}
ALIASES = {"gesha": "geisha"}
# 处理法、品种这类词很多豆子都有，不能单靠它们认定是同一款
GENERIC = {"washed", "natural", "honey", "anaerobic", "geisha"}
# 数据库里的处理法、品种是中文，换成官网标题里可能出现的英文词
CHINESE_HINTS = {
    "水洗": "washed",
    "日晒": "natural",
    "蜜": "honey",
    "厌氧": "anaerobic",
    "瑰夏": "geisha",
    "卡杜艾": "catuai",
    "卡杜拉": "caturra",
    "帕卡马拉": "pacamara",
    "铁皮卡": "typica",
    "波旁": "bourbon",
}
# 标题里出现、但和库里这款豆的处理法或品种对不上的词，说明多半是另一款
DESCRIPTORS = GENERIC | set(CHINESE_HINTS.values())
MIN_KEY_COVERAGE = 0.6
CONFLICT_PENALTY = 0.5


def tokens(text: str) -> set[str]:
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(char for char in text if not unicodedata.combining(char)).lower()
    words = [ALIASES.get(word, word) for word in re.findall(r"[a-z0-9]+", text)]
    kept = {word for word in words if word not in STOPWORDS}
    return kept or set(words)


def _bean_tokens(bean: dict, slug: str) -> tuple[set[str], set[str], set[str]]:
    name = tokens(bean.get("name", ""))
    bean_id = str(bean.get("id", ""))
    id_part = tokens(bean_id[len(slug) + 1:] if bean_id.startswith(slug + "-") else bean_id)
    extra = set(id_part)
    for field in ("detailName", "farmOrStation", "producer", "variety"):
        extra |= tokens(str(bean.get(field) or ""))
    chinese = f"{bean.get('process', '')}{bean.get('variety', '')}"
    extra |= {english for chinese_word, english in CHINESE_HINTS.items() if chinese_word in chinese}
    return name, id_part, extra - name


def _coverage(wanted: set[str], product: set[str]) -> float:
    wanted = (wanted - GENERIC) or wanted
    return len(wanted & product) / len(wanted) if wanted else 0


def _score(bean_tokens: tuple[set[str], set[str], set[str]], item: dict) -> dict | None:
    name, id_part, extra = bean_tokens
    title = tokens(item["title"])
    product = title | tokens(item["handle"])
    name_coverage = _coverage(name, product)
    key_coverage = max(name_coverage, _coverage(id_part, product))
    if name_coverage == 0 or key_coverage < MIN_KEY_COVERAGE:
        return None
    extra_coverage = len(extra & product) / len(extra) if extra else 0
    conflicts = len((title & DESCRIPTORS) - name - extra)
    return {
        "key_coverage": key_coverage,
        "conflicts": conflicts,
        "score": round(key_coverage * 2 + extra_coverage - CONFLICT_PENALTY * conflicts, 3),
        "precision": len(title & (name | extra)) / len(title) if title else 0,
    }


def match(beans: list[dict], items: list[dict], slug: str) -> dict:
    """一对一匹配。返回 pairs（bean, item, confident）以及两边各自没对上的。"""
    pairs = []
    used_beans: set[int] = set()
    used_items: set[int] = set()

    # 已经记过官网链接的豆子直接按链接对应，不受官网改标题的影响
    item_by_url = {item["url"]: index for index, item in enumerate(items)}
    for bean_index, bean in enumerate(beans):
        item_index = item_by_url.get(bean.get("sourceUrl"))
        if item_index is not None and item_index not in used_items:
            used_beans.add(bean_index)
            used_items.add(item_index)
            pairs.append({"bean": bean, "item": items[item_index], "confident": True})

    # 其余的按名字猜。已经填了 sourceUrl 的豆子不参与：链接对不上说明那个商品已下架，
    # 不能再把它错配给别的商品。
    candidates = []
    for bean_index, bean in enumerate(beans):
        if bean_index in used_beans or bean.get("sourceUrl"):
            continue
        bean_tokens = _bean_tokens(bean, slug)
        for item_index, item in enumerate(items):
            if item_index in used_items:
                continue
            scored = _score(bean_tokens, item)
            if scored:
                # 得分相同时，依次优先：在售的、标题更贴近的、更新上架的
                rank = (scored["score"], item["available"], scored["precision"], item["published_at"])
                confident = scored["key_coverage"] == 1 and scored["conflicts"] == 0
                candidates.append((rank, confident, bean_index, item_index))

    for _, confident, bean_index, item_index in sorted(candidates, reverse=True):
        if bean_index in used_beans or item_index in used_items:
            continue
        used_beans.add(bean_index)
        used_items.add(item_index)
        pairs.append({
            "bean": beans[bean_index],
            "item": items[item_index],
            "confident": confident,
        })

    return {
        "pairs": pairs,
        "unmatched_beans": [bean for index, bean in enumerate(beans) if index not in used_beans],
        "unmatched_items": [item for index, item in enumerate(items) if index not in used_items],
    }
