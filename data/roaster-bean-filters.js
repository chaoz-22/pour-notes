const ROASTER_BEAN_FILTER_FIELDS = [
  { key: "variety", label: "豆种" },
  { key: "process", label: "处理法" },
  { key: "country", label: "国家" }
];

const OTHER_FILTER_VALUE = "其他";

// 豆种只列这些常见的，其余归到「其他」。想增减常见豆种改这里即可。
const COMMON_VARIETIES = [
  "瑰夏",
  "波旁",
  "粉红波旁",
  "铁皮卡",
  "卡杜拉",
  "卡杜艾",
  "帕卡马拉",
  "SL28",
  "SL34",
  "74110",
  "74158",
  "埃塞原生种"
];

const VARIETY_ALIASES = Object.freeze({
  gesha: "瑰夏",
  geisha: "瑰夏",
  "gesha 1931": "瑰夏",
  "瑰夏1931": "瑰夏",
  红瑰夏: "瑰夏",
  "pink bourbon": "粉红波旁",
  "pink bourbon粉红波旁": "粉红波旁",
  bourbon: "波旁",
  "red bourbon": "波旁",
  "yellow bourbon": "波旁",
  "orange bourbon": "波旁",
  红波旁: "波旁",
  黄波旁: "波旁",
  typica: "铁皮卡",
  黄铁皮卡: "铁皮卡",
  caturra: "卡杜拉",
  catuai: "卡杜艾",
  红卡杜艾: "卡杜艾",
  黄卡杜艾: "卡杜艾",
  pacamara: "帕卡马拉",
  kurume: "74158",
  库鲁梅: "74158",
  库儒梅: "74158",
  wolisho: "埃塞原生种"
});

// 处理法按大类归并，一款豆可以同时属于多类（如「厌氧日晒」同时算日晒和厌氧）。
const PROCESS_CATEGORIES = [
  { value: "水洗", pattern: /水洗/ },
  { value: "日晒", pattern: /日晒/ },
  { value: "蜜处理", pattern: /蜜|去果皮/ },
  {
    value: "厌氧 / 特殊发酵",
    pattern: /厌氧|二氧化碳|氮气|mosto|酵母|共发酵|氧化|(?:延长|冷|双重|[2-9]\d+小时)发酵|发酵日晒/i
  },
  { value: "低因", pattern: /脱咖啡因|低因/ }
];

function freshRoasterBeanFilters() {
  return { variety: [], process: [], country: [] };
}

function splitFilterText(value) {
  return String(value || "")
    .split(/[、，,;/；]+/)
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function normalizeVariety(value) {
  // 「74110（74-110）」「SL9（Geisha Inca）」这类只看括号前的名字
  const text = String(value || "").replace(/[（(].*$/, "").trim();
  if (!text) return "";
  const slCode = text.match(/^SL[\s-]*(\d+)$/i);
  if (slCode) return `SL${slCode[1]}`;
  // 74110、74158 单独列出，其余 74 系编号和原生种统一归到「埃塞原生种」
  const jarcCode = text.match(/^(?:JARC\s*)?(74\d{2,3})/i);
  if (jarcCode && COMMON_VARIETIES.includes(jarcCode[1])) return jarcCode[1];
  if (jarcCode || /原生|heirloom|landrace/i.test(text)) return "埃塞原生种";
  return VARIETY_ALIASES[text.toLowerCase()] || text;
}

function getRoasterBeanFilterValues(bean, field) {
  const rawValue = String(bean && bean[field] || "").trim();
  if (!rawValue) return [];
  if (field === "variety") {
    const values = new Set();
    splitFilterText(rawValue).forEach((item) => {
      const variety = normalizeVariety(item);
      if (variety) values.add(COMMON_VARIETIES.includes(variety) ? variety : OTHER_FILTER_VALUE);
    });
    return Array.from(values);
  }
  if (field === "process") {
    const values = PROCESS_CATEGORIES
      .filter((category) => category.pattern.test(rawValue))
      .map((category) => category.value);
    return values.length ? values : [OTHER_FILTER_VALUE];
  }
  return Array.from(new Set(splitFilterText(rawValue)));
}

function getFieldOptionOrder(field) {
  if (field === "variety") return COMMON_VARIETIES;
  if (field === "process") return PROCESS_CATEGORIES.map((category) => category.value);
  return [];
}

// 选项按豆子数量从多到少排；数量相同按预设顺序，「其他」固定在最后。
function listRoasterBeanFilterValues(beans, field) {
  const counts = new Map();
  beans.forEach((bean) => {
    getRoasterBeanFilterValues(bean, field).forEach((value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });
  });
  const order = getFieldOptionOrder(field);
  const rank = (value) => {
    const index = order.indexOf(value);
    return index === -1 ? order.length : index;
  };
  return Array.from(counts.keys()).sort((left, right) => {
    if (left === OTHER_FILTER_VALUE || right === OTHER_FILTER_VALUE) {
      return (left === OTHER_FILTER_VALUE) - (right === OTHER_FILTER_VALUE);
    }
    return counts.get(right) - counts.get(left) || rank(left) - rank(right);
  });
}

function normalizeRoasterBeanFilters(beans, filters) {
  const source = filters && typeof filters === "object" ? filters : {};
  return ROASTER_BEAN_FILTER_FIELDS.reduce((result, definition) => {
    const availableValues = new Set(listRoasterBeanFilterValues(beans, definition.key));
    result[definition.key] = Array.from(new Set(
      (Array.isArray(source[definition.key]) ? source[definition.key] : [])
        .map((value) => String(value || "").trim())
        .filter((value) => availableValues.has(value))
    ));
    return result;
  }, freshRoasterBeanFilters());
}

function buildRoasterBeanFilterGroups(beans, filters) {
  const normalizedFilters = normalizeRoasterBeanFilters(beans, filters);
  return ROASTER_BEAN_FILTER_FIELDS.map((definition) => ({
    ...definition,
    options: listRoasterBeanFilterValues(beans, definition.key).map((value) => ({
      value,
      isSelected: normalizedFilters[definition.key].includes(value)
    }))
  }));
}

function countRoasterBeanFilters(filters) {
  return ROASTER_BEAN_FILTER_FIELDS.reduce((total, definition) => (
    total + (Array.isArray(filters && filters[definition.key]) ? filters[definition.key].length : 0)
  ), 0);
}

module.exports = {
  ROASTER_BEAN_FILTER_FIELDS,
  freshRoasterBeanFilters,
  getRoasterBeanFilterValues,
  normalizeRoasterBeanFilters,
  buildRoasterBeanFilterGroups,
  countRoasterBeanFilters
};
