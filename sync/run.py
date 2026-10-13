#!/usr/bin/env python3
"""对比各烘焙商官网和数据库里的豆单，生成差异报告；加 --apply 才会写数据库。

用法：
    python3 sync/run.py                        # 全部已接入的烘焙商，只出报告
    python3 sync/run.py --roaster Sey          # 只看某一家，可重复
    sync/.venv/bin/python sync/run.py --roaster Sey --apply  # 上新并更新这一家，写入云端
    python3 sync/run.py --cache                # 本地调试：官网数据缓存到 sync/.cache/

配置了 CLOUDBASE_API_KEY（环境变量或 sync/.env）时读云端数据库，否则读本地的
cloud-data/roaster_guide_beans.json。--apply 还需要 ANTHROPIC_API_KEY 和
sync/requirements.txt 里的依赖。售罄和下架不处理，由人工在控制台改 enabled。
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import cloudbase
from matching import match
from roasters import ROASTERS
from shopify import list_coffees

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = ROOT / "cloud-data" / "roaster_guide_beans.json"
DEFAULT_REPORT = ROOT / "sync" / "reports" / "latest.md"
CACHE_DIR = ROOT / "sync" / ".cache"
BACKUP_DIR = ROOT / "sync" / "backups"


def load_beans(path: Path) -> list[dict]:
    lines = path.read_text(encoding="utf-8").splitlines()
    return [json.loads(line) for line in lines if line.strip()]


def compare(roaster: dict, beans: list[dict], items: list[dict]) -> dict:
    result = match(beans, items, roaster["slug"])
    confident = [pair for pair in result["pairs"] if pair["confident"]]
    return {
        "name": roaster["name"],
        "bean_count": len(beans),
        "on_sale_count": sum(1 for item in items if item["available"]),
        "listed": [pair for pair in confident if pair["item"]["available"]],
        "sold_out": [pair for pair in confident if not pair["item"]["available"]],
        "uncertain": [pair for pair in result["pairs"] if not pair["confident"]],
        "missing": result["unmatched_beans"],
        "new": [item for item in result["unmatched_items"] if item["available"]],
    }


def backup_beans(beans: list[dict]) -> Path:
    """写库前把云端现有数据原样存一份到本地。"""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    path = BACKUP_DIR / f"beans-{datetime.now().strftime('%Y%m%d-%H%M%S')}.jsonl"
    path.write_text("".join(json.dumps(bean, ensure_ascii=False) + "\n" for bean in beans), encoding="utf-8")
    return path


def link_sources(result: dict) -> int:
    """给已对上、但还没记官网链接的豆子补上链接和信息指纹，不动其他内容。"""
    linked = 0
    for pair in result["listed"] + result["sold_out"]:
        bean, item = pair["bean"], pair["item"]
        if bean.get("sourceUrl"):
            continue
        cloudbase.update_bean(bean["_id"], {"sourceUrl": item["url"], "sourceHash": item["source_hash"]})
        linked += 1
    return linked


def publish_changes(roaster: dict, result: dict, own_beans: list[dict]) -> list[tuple[str, str]]:
    """上线新豆、更新官网信息有变的豆子。单款失败不影响其他，返回失败清单。"""
    import publish  # 只有写库时才需要 Claude 和图片处理的依赖

    failures = []
    for item in result["new"]:
        try:
            bean = publish.publish_new(roaster, item, own_beans)
            print(f"  已上线：{bean['name']}（{bean['_id']}）")
        except Exception as error:
            failures.append((f"{roaster['name']} · {item['title']}", f"{type(error).__name__}: {error}"))
    for pair in result["listed"] + result["sold_out"]:
        bean, item = pair["bean"], pair["item"]
        if not publish.needs_refresh(bean, item):
            continue
        try:
            changed = publish.refresh(roaster, bean, item, own_beans)
            print(f"  已更新：{bean['name']}（{'、'.join(changed) or '内容无变化'}）")
        except Exception as error:
            failures.append((f"{roaster['name']} · {bean['name']}", f"{type(error).__name__}: {error}"))
    return failures


def _item_link(item: dict) -> str:
    sizes = f" · {'/'.join(item['sizes'])}" if item["sizes"] else ""
    return f"[{item['title']}]({item['url']}){sizes}"


def _pair_line(pair: dict) -> str:
    return f"- {pair['bean']['name']} ↔ {_item_link(pair['item'])}"


def render(results: list[dict], failures: list[tuple[str, str]], skipped: dict[str, int], source: str) -> str:
    lines = [
        "# 官网豆单差异报告",
        "",
        f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}。数据库以{source}为准。",
        "只统计手冲（Filter）和全能烘焙（Omni）的豆子，意式烘焙不计入。",
        "",
        "## 汇总",
        "",
        "| 烘焙商 | 库内 | 官网在售 | 在售且已收录 | 库内已售罄 | 库内但官网找不到 | 官网新豆 | 待确认 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for result in results:
        lines.append(
            f"| {result['name']} | {result['bean_count']} | {result['on_sale_count']} "
            f"| {len(result['listed'])} | {len(result['sold_out'])} | {len(result['missing'])} "
            f"| {len(result['new'])} | {len(result['uncertain'])} |"
        )

    for result in results:
        lines += ["", f"## {result['name']}"]
        sections = [
            ("官网新豆（在售，库里没有）", [f"- {_item_link(item)}" for item in result["new"]]),
            ("库内但官网已售罄", [_pair_line(pair) for pair in result["sold_out"]]),
            ("库内但官网找不到（可能已下架，或名字对不上）",
             [f"- {bean['name']}（`{bean['id']}`）" for bean in result["missing"]]),
            ("待确认的匹配（名字相近，但没完全对上，或处理法、品种不一致）", [_pair_line(pair) for pair in result["uncertain"]]),
            ("在售且已收录", [_pair_line(pair) for pair in result["listed"]]),
        ]
        for title, rows in sections:
            if rows:
                lines += ["", f"### {title}（{len(rows)}）", "", *rows]

    if failures:
        lines += ["", "## 失败", ""]
        lines += [f"- {name}：{error}" for name, error in failures]
    if skipped:
        lines += ["", "## 尚未接入的烘焙商", ""]
        lines += [f"- {name}（库内 {count} 款）" for name, count in sorted(skipped.items())]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--roaster", action="append", help="只处理指定烘焙商，可重复")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="豆单 JSON Lines 文件")
    parser.add_argument("--out", type=Path, default=DEFAULT_REPORT, help="报告输出路径")
    parser.add_argument("--cache", action="store_true", help="缓存官网数据，仅用于本地调试")
    parser.add_argument("--apply", action="store_true", help="把结果写入云端数据库（默认只出报告）")
    args = parser.parse_args()

    known = {roaster["name"] for roaster in ROASTERS}
    unknown = set(args.roaster or []) - known
    if unknown:
        print(f"未接入的烘焙商：{', '.join(sorted(unknown))}", file=sys.stderr)
        return 2

    cloudbase.load_env_file()
    use_cloud = bool(os.environ.get("CLOUDBASE_API_KEY"))
    if args.apply and not use_cloud:
        print("--apply 需要先配置 CLOUDBASE_API_KEY", file=sys.stderr)
        return 2
    beans = cloudbase.list_beans() if use_cloud else load_beans(args.db)
    source = "云端数据库" if use_cloud else f"本地的 `{args.db.name}`"
    if args.apply:
        print(f"已备份云端现有数据到 {backup_beans(beans)}")
    roasters = [roaster for roaster in ROASTERS if not args.roaster or roaster["name"] in args.roaster]
    results, failures = [], []
    for roaster in roasters:
        try:
            items = list_coffees(roaster, CACHE_DIR if args.cache else None)
        except Exception as error:  # 一家失败不影响其他家
            failures.append((roaster["name"], f"{type(error).__name__}: {error}"))
            print(f"{roaster['name']}: 抓取失败 {error}", file=sys.stderr)
            continue
        own_beans = [bean for bean in beans if bean.get("roaster") == roaster["name"]]
        result = compare(roaster, own_beans, items)
        results.append(result)
        print(
            f"{result['name']}: 库内 {result['bean_count']}，官网在售 {result['on_sale_count']}，"
            f"新豆 {len(result['new'])}，售罄 {len(result['sold_out'])}，"
            f"找不到 {len(result['missing'])}，待确认 {len(result['uncertain'])}"
        )
        if args.apply:
            print(f"  已为 {link_sources(result)} 款豆子补上官网链接")
            item_failures = publish_changes(roaster, result, own_beans)
            for name, error in item_failures:
                print(f"  失败：{name}：{error}", file=sys.stderr)
            failures.extend(item_failures)

    skipped: dict[str, int] = {}
    if not args.roaster:
        for bean in beans:
            if bean.get("roaster") not in known:
                skipped[bean.get("roaster")] = skipped.get(bean.get("roaster"), 0) + 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(render(results, failures, skipped, source), encoding="utf-8")
    print(f"报告已写入 {args.out}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
