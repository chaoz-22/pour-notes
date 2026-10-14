"""用 DeepSeek 把官网商品页整理成寻豆指南的中文豆子信息，并核对已有的资料。"""

from __future__ import annotations

import html
import json
import os
import re
import urllib.request
import openai
from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError

from catalog import USER_AGENT

BASE_URL = "https://api.deepseek.com"
# 核对已有资料需要判断力，默认用 pro；想更省可以把环境变量 DEEPSEEK_MODEL 设成 deepseek-flash
MODEL = os.environ.get("DEEPSEEK_MODEL") or "deepseek-v4-pro"
MAX_ATTEMPTS = 3
MAX_PAGE_CHARS = 20000

SYSTEM_PROMPT = """你在为一个手冲咖啡小程序的「寻豆指南」整理豆子资料。用户会给你一款咖啡豆在烘焙商官网上的页面文字，请据此填写这款豆子的中文资料卡。

资料卡是给中文读者看的，他们想知道这支豆子从哪来、谁种的、怎么处理的、喝起来什么味道。所以：

- 只写页面上有依据的内容。页面没提到的字段留空字符串（列表留空），不要凭常识补全，也不要推测海拔、采收期、价格这类具体数字。读者会拿这些信息去买豆子，编出来的细节比空着更糟。
- 用自己的话写成通顺的中文，不要逐句翻译官网原文。
- 人名、庄园名、处理站名、产区名、品种的专有名称保留官网的原文写法，不要音译；国家名和常见品种、处理法用中文通行译名（瑰夏、粉红波旁、水洗、日晒、蜜处理、厌氧日晒等）。
- name 用这款豆子最核心的短名（通常是生产者或庄园名），不要带年份、国家、规格。
- flavorNotes 用官网给出的风味词原文，每个单词首字母大写（如 Ripe Peach）；flavorText 是对应的中文，用顿号分隔。
- 整体要精简，读者是在手机上快速浏览。只留对选豆有用的信息，不写客套话、不重复其他字段已经有的内容。
- summary 用一句话描述杯中风味，不超过 25 个字。
- producerStory 写 2 到 3 段，每段一两句：先讲产地和生产者，再讲这个批次或品种的特别之处。杯中风味已经在 summary 里，不用再单独写一段。
- processingDetail 用一句话写清处理步骤；transparency 只在官网公布了收购价、FOB 等生豆价格信息时填写，不写零售价。

下面的示例是同一家烘焙商已经整理好的资料卡，请沿用它们的用词习惯和各字段的写法。示例的故事部分篇幅偏长，你写的要比示例更短，以上面的篇幅要求为准。"""


class BeanInfo(BaseModel):
    # 除 name 外都有默认值：模型漏掉某个字段时按"官网没提"处理，不必整条作废
    name: str = Field(min_length=1, description="豆子短名，保留官网原文写法")
    detailName: str = Field("", description="更完整的名称；与 name 相同或没有必要时留空")
    country: str = Field("", description="产地国家，中文")
    region: str = Field("", description="产区，保留原文")
    farmOrStation: str = Field("", description="庄园或处理站")
    producer: str = Field("", description="生产者")
    process: str = Field("", description="处理法，中文")
    variety: str = Field("", description="品种；多个品种用顿号分隔")
    altitude: str = Field("", description="海拔，如 1900masl")
    roast: str = Field("", description="烘焙度，中文，如 浅烘")
    harvest: str = Field("", description="采收时间，如 2026年7月")
    flavorNotes: list[str] = Field([], description="官网风味词原文")
    flavorText: str = Field("", description="风味词的中文，用顿号分隔")
    summary: str = Field("", description="一句话的杯中风味描述")
    producerStoryTitle: str = Field("", description="故事小标题")
    producerStory: list[str] = Field([], description="产地与生产者故事，每个元素一个自然段")
    processingDetail: str = Field("", description="处理过程")
    transparency: str = Field("", description="价格透明度信息；官网没有则留空")


# 核对时不动名字：用户已经眼熟的豆名不因为官网换了写法而改变
VERIFY_FIELDS = [field for field in BeanInfo.model_fields if field not in ("name", "detailName")]
LIST_FIELDS = ("flavorNotes", "producerStory")

VERIFY_PROMPT = """你在为一个手冲咖啡小程序的「寻豆指南」核对豆子资料。用户会给你一款咖啡豆的官网页面文字，以及小程序里现有的中文资料卡。请对照官网，找出资料卡里写错的地方并给出改正。

这些资料卡大多是人工整理的，读者会按上面的信息去买豆子，所以事实要和官网一致；但人工写的文字本身有价值，不要为了风格去改它。具体来说：

- 只在资料卡与官网页面明确矛盾时才改，比如产区、庄园、生产者、品种、处理法、海拔、采收时间、风味词、价格写得和官网不一样。
- 资料卡某个字段是空的，而官网页面明确给出了这项信息，可以补上。
- 官网页面没有提到的内容不算错。资料卡里的信息可能来自豆袋或烘焙商的其他渠道，保持原样。
- 措辞、译名、详略、段落划分的差异不算错，不要改。国家名、常见品种和处理法用中文通行译名是这份资料卡的既定写法。
- 改正时只动出错的地方。producerStory 这类长文字，在原文上做最小改动后给出完整的新值，不要重写。
- 人名、庄园名、产区名保留官网的原文写法，不要音译。

每条改正填 field、新值和一句话的 reason（用中文说明官网是怎么写的）。字符串字段把新值填在 text，flavorNotes 和 producerStory 把新值填在 items。全部一致就返回空列表。"""


class Correction(BaseModel):
    field: str
    text: str = Field("", description="字符串字段的新值；列表字段留空")
    items: list[str] = Field([], description="flavorNotes 或 producerStory 的完整新值；其他字段留空列表")
    reason: str = Field("", description="一句话说明官网是怎么写的")


class Verification(BaseModel):
    corrections: list[Correction]


BEAN_FORMAT = {
    name: [field.description] if name in LIST_FIELDS else field.description
    for name, field in BeanInfo.model_fields.items()
}
VERIFY_FORMAT = {
    "corrections": [{
        "field": "要改正的字段名，只能是这些之一：" + "、".join(VERIFY_FIELDS),
        "text": Correction.model_fields["text"].description,
        "items": [Correction.model_fields["items"].description],
        "reason": Correction.model_fields["reason"].description,
    }]
}


class ExtractionError(RuntimeError):
    pass


def fetch_page_text(url: str) -> str:
    """取商品页的可读文字。很多细节（海拔、处理过程、价格）只在页面上，不在商品接口里。"""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        page = response.read().decode("utf-8", "replace")
    page = re.sub(r"<(script|style|noscript|svg|template)\b.*?</\1>", " ", page, flags=re.S | re.I)
    text = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", page)).split())
    if len(text) > MAX_PAGE_CHARS:
        raise ExtractionError(f"商品页文字过长（{len(text)} 字），需要先为这家店单独处理：{url}")
    return text


def _example_cards(examples: list[dict]) -> str:
    fields = list(BeanInfo.model_fields)
    cards = [{field: bean.get(field) or ([] if field in ("flavorNotes", "producerStory") else "") for field in fields}
             for bean in examples]
    return "\n\n".join(json.dumps(card, ensure_ascii=False, indent=2) for card in cards)


def _json_instructions(output_format: type[BaseModel]) -> str:
    """DeepSeek 只有普通的 JSON 模式，不会按 schema 约束输出，所以把格式写进提示词。"""
    example = VERIFY_FORMAT if output_format is Verification else BEAN_FORMAT
    return (
        "\n\n请只输出一个 json 对象，不要输出任何其他文字。格式如下（值的位置写的是说明）：\n"
        + json.dumps(example, ensure_ascii=False, indent=2)
    )


def _ask(system: str, user: str, output_format: type[BaseModel], title: str, thinking: bool) -> BaseModel:
    client = OpenAI(api_key=os.environ.get("DEEPSEEK_API_KEY"), base_url=BASE_URL)
    problem = ""
    for _ in range(MAX_ATTEMPTS):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                max_tokens=8000,
                messages=[
                    {"role": "system", "content": system + _json_instructions(output_format)},
                    {"role": "user", "content": user},
                ],
                response_format={"type": "json_object"},
                extra_body={"thinking": {"type": "enabled" if thinking else "disabled"}},
            )
        except openai.RateLimitError as error:
            raise ExtractionError(f"DeepSeek API 限流：{error.message}") from error
        except openai.APIStatusError as error:
            raise ExtractionError(f"DeepSeek API 返回错误（{error.status_code}）：{error.message}") from error
        except openai.APIConnectionError as error:
            raise ExtractionError(f"连不上 DeepSeek API：{error}") from error

        # JSON 模式不保证字段齐全，偶尔还会返回空内容；校验不过就重试
        content = response.choices[0].message.content or ""
        try:
            return output_format.model_validate_json(content)
        except ValidationError as error:
            problem = f"finish_reason={response.choices[0].finish_reason}，{error.error_count()} 处格式错误"
    raise ExtractionError(f"重试 {MAX_ATTEMPTS} 次仍没有得到合格的结果（{problem}）：{title}")


def _page_message(roaster_name: str, item: dict, page_text: str) -> str:
    return (
        f"烘焙商：{roaster_name}\n"
        f"官网商品标题：{item['title']}\n"
        f"商品页地址：{item['url']}\n\n"
        f"<page_text>\n{page_text}\n</page_text>"
    )


def extract_bean(roaster_name: str, item: dict, page_text: str, examples: list[dict]) -> dict:
    """返回按 BeanInfo 填好的字段。examples 是同一家烘焙商已有的豆子，用来对齐写法。"""
    system = SYSTEM_PROMPT
    if examples:
        system += "\n\n<examples>\n" + _example_cards(examples) + "\n</examples>"
    # 整理新豆是照着页面填表，不开思考也写得好，快十倍
    info = _ask(system, _page_message(roaster_name, item, page_text), BeanInfo, item["title"], thinking=False)
    return info.model_dump()


def verify_bean(roaster_name: str, item: dict, page_text: str, bean: dict) -> list[dict]:
    """对照官网核对已有的资料卡，返回需要改正的字段：[{"field", "value", "reason"}]。"""
    card = {field: bean.get(field) or ([] if field in LIST_FIELDS else "") for field in VERIFY_FIELDS}
    user = (
        _page_message(roaster_name, item, page_text)
        + "\n\n<card>\n" + json.dumps(card, ensure_ascii=False, indent=2) + "\n</card>"
    )
    # 核对要判断哪些算"写错"，改错了会动到人工写的内容，值得多花时间思考
    result = _ask(VERIFY_PROMPT, user, Verification, item["title"], thinking=True)
    corrections = []
    for correction in result.corrections:
        if correction.field not in VERIFY_FIELDS:
            continue  # 模型想改名字之类不在核对范围内的字段，忽略
        value = correction.items if correction.field in LIST_FIELDS else correction.text
        if value and value != card[correction.field]:
            corrections.append({"field": correction.field, "value": value, "reason": correction.reason})
    return corrections
