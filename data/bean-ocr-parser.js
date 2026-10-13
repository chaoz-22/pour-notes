const { ROASTERS } = require("./roasters");
const { getBundledRoasterBeans } = require("./roaster-beans");

const COUNTRY_ALIASES = [
  ["ethiopia", "埃塞俄比亚"],
  ["ethiopian", "埃塞俄比亚"],
  ["kenya", "肯尼亚"],
  ["kenyan", "肯尼亚"],
  ["colombia", "哥伦比亚"],
  ["colombian", "哥伦比亚"],
  ["panama", "巴拿马"],
  ["costa rica", "哥斯达黎加"],
  ["guatemala", "危地马拉"],
  ["honduras", "洪都拉斯"],
  ["el salvador", "萨尔瓦多"],
  ["nicaragua", "尼加拉瓜"],
  ["brazil", "巴西"],
  ["bolivia", "玻利维亚"],
  ["peru", "秘鲁"],
  ["ecuador", "厄瓜多尔"],
  ["rwanda", "卢旺达"],
  ["burundi", "布隆迪"],
  ["tanzania", "坦桑尼亚"],
  ["indonesia", "印度尼西亚"],
  ["malaysia", "马来西亚"],
  ["china", "中国"]
];

// Include Chinese label text as aliases as well. The general PP-OCRv5 model
// returns mixed Chinese and English in the same line.
COUNTRY_ALIASES.slice().forEach(([, chineseName]) => {
  COUNTRY_ALIASES.push([chineseName, chineseName]);
});

const PROCESS_ALIASES = [
  ["inoculated anaerobic pulp natural", "接种酵母厌氧果肉日晒"],
  ["anaerobic pulp natural", "厌氧果肉日晒"],
  ["black diamond natural", "黑钻日晒"],
  ["anaerobic natural", "厌氧日晒"],
  ["anaerobic washed", "厌氧水洗"],
  ["carbonic maceration", "二氧化碳浸渍"],
  ["double fermentation", "双重发酵"],
  ["wet hulled", "湿刨法"],
  ["classic washed", "水洗"],
  ["fully washed", "水洗"],
  ["washed", "水洗"],
  ["natural", "日晒"],
  ["honey", "蜜处理"],
  ["anaerobic", "厌氧处理"],
  ["experimental", "实验处理"],
  ["水洗", "水洗"],
  ["日晒", "日晒"],
  ["蜜处理", "蜜处理"],
  ["厌氧", "厌氧处理"]
];

const VARIETY_ALIASES = [
  ["gesha 1931", "瑰夏 1931"],
  ["pink bourbon", "粉红波旁"],
  ["yellow bourbon", "黄波旁"],
  ["red bourbon", "红波旁"],
  ["san isidro 39", "San Isidro 39"],
  ["typica mejorado", "改良铁皮卡"],
  ["wush wush", "Wush Wush"],
  ["sl28", "SL28"],
  ["sl34", "SL34"],
  ["sl9", "SL9"],
  ["74110", "74110"],
  ["74112", "74112"],
  ["74158", "74158"],
  ["geisha", "瑰夏"],
  ["gesha", "瑰夏"],
  ["caturra", "Caturra"],
  ["catuai", "卡杜艾"],
  ["pacamara", "帕卡马拉"],
  ["sidra", "Sidra"],
  ["laurina", "Laurina"],
  ["chiroso", "Chiroso"],
  ["castillo", "Castillo"],
  ["ombligon", "Ombligon"],
  ["bourbon", "波旁"],
  ["typica", "铁皮卡"],
  ["瑰夏", "瑰夏"],
  ["波旁", "波旁"]
];

const ROAST_ALIASES = [
  ["extra light", "极浅烘"],
  ["light medium", "浅中烘"],
  ["medium dark", "中深烘"],
  ["light roast", "浅烘"],
  ["medium roast", "中烘"],
  ["dark roast", "深烘"],
  ["filter roast", "浅烘"],
  ["极浅烘", "极浅烘"],
  ["浅中烘", "浅中烘"],
  ["中深烘", "中深烘"],
  ["浅烘", "浅烘"],
  ["中烘", "中烘"],
  ["深烘", "深烘"]
];

const META_LABEL_PATTERN = /^(origin|country|region|farm|estate|producer|variety|varietal|cultivar|process|processing|tasting notes?|flavou?r notes?|roast(?:ed)?(?: by| date| on)?|net weight|weight)\s*[:：-]?\s*/i;
const STOP_WORDS = new Set(["coffee", "filter", "whole", "bean", "beans", "lot", "the", "and", "from"]);
const CATALOG_NAME_DESCRIPTOR_WORDS = new Set([
  "anaerobic", "natural", "washed", "honey", "process", "processing"
]);

function cleanLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanMeaningfulValue(value) {
  const cleaned = cleanLine(value);
  return /^(?:[/—-]|n\/?a|null|unknown)$/i.test(cleaned) ? "" : cleaned;
}

function normalizeSearch(value) {
  return cleanLine(value)
    // PaddleOCR often removes spaces from title-cased English names. Preserve
    // their word boundaries before lower-casing (for example AloSkyProject).
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // Keep OCR text from different writing systems as separate tokens. Paddle
    // commonly returns strings such as "Aires地块巴拿马翡翠庄园".
    .replace(/([a-z0-9])([\u4e00-\u9fff])/gi, "$1 $2")
    .replace(/([\u4e00-\u9fff])([a-z0-9])/gi, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isOneEditApart(left, right) {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  return edits + Number(leftIndex < left.length || rightIndex < right.length) <= 1;
}

function tokensMatch(expected, actual) {
  if (expected === actual) return true;
  // Restrict fuzzy matching to longer words so short coffee codes do not
  // accidentally match unrelated OCR fragments.
  return expected.length >= 5 && actual.length >= 5 && isOneEditApart(expected, actual);
}

function tokenize(value) {
  return normalizeSearch(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function unique(values) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function findAlias(text, aliases) {
  const normalized = normalizeSearch(text);
  const match = aliases.find(([needle]) => normalized.includes(normalizeSearch(needle)));
  return match ? match[1] : "";
}

function findKnownRoaster(text) {
  const normalized = normalizeSearch(text);
  const matches = ROASTERS
    .map((roaster) => roaster.name)
    .filter((name) => ` ${normalized} `.includes(` ${normalizeSearch(name)} `))
    .sort((left, right) => right.length - left.length);
  return matches[0] || "";
}

function parseWeight(text) {
  const match = String(text || "").match(/(?:net\s*(?:weight|wt)\s*[:：-]?\s*)?(\d{2,4}(?:\.\d+)?)\s*(?:g|gram|grams)\b/i);
  if (!match) return "";
  const value = Number(match[1]);
  // Sample tubes and competition portions can be as small as 5–30g.
  return value >= 5 && value <= 5000 ? String(value) : "";
}

function normalizeDate(year, month, day) {
  const yyyy = Number(year);
  const mm = Number(month);
  const dd = Number(day);
  if (yyyy < 2000 || yyyy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
  return `${yyyy}.${mm}.${dd}`;
}

function parseRoastDate(lines) {
  const monthNumbers = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  const labeled = lines.filter((line) => /roast|烘焙/i.test(line));
  const candidates = unique(labeled.concat(lines));
  for (const line of candidates) {
    let match = line.match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/);
    if (match) return normalizeDate(match[1], match[2], match[3]);
    match = line.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/);
    if (match) return normalizeDate(match[3], match[2], match[1]);
    match = line.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(20\d{2})/i);
    if (match) return normalizeDate(match[3], monthNumbers[match[2].toLowerCase()], match[1]);
  }
  return "";
}

function valueAfterLabel(lines, labels) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const label = labels.find((item) => normalizeSearch(line).startsWith(normalizeSearch(item)));
    if (!label) continue;
    const inline = cleanLine(line.replace(new RegExp(`^${label}\\s*[:：-]?\\s*`, "i"), ""));
    if (inline && inline.toLowerCase() !== label.toLowerCase()) return inline;
    return cleanLine(lines[index + 1]);
  }
  return "";
}

function isDateOrWeightLine(value) {
  const line = cleanLine(value);
  if (!line) return false;
  if (/\b(?:roast|roasted|烘焙)\b/i.test(line)) return true;
  if (/\b\d{1,4}(?:\.\d+)?\s*(?:g|kg|gram|grams)\b/i.test(line)) return true;
  return /(?:20\d{2})[.\/-]\d{1,2}[.\/-]\d{1,2}|\d{1,2}[.\/-]\d{1,2}[.\/-](?:20\d{2})/.test(line);
}

function parseFlavorDescription(lines) {
  const labels = ["tasting notes", "tasting note", "flavour notes", "flavor notes", "notes", "风味描述", "风味"];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const label = labels.find((item) => normalizeSearch(line).startsWith(normalizeSearch(item)));
    if (!label) continue;
    const inline = cleanLine(line.replace(new RegExp(`^${label}\\s*[:：-]?\\s*`, "i"), ""));
    const candidate = inline || cleanLine(lines[index + 1]);
    if (candidate && !isDateOrWeightLine(candidate) && /[a-z\u4e00-\u9fff]/i.test(candidate)) return candidate;
  }
  return "";
}

function parseOrigin(lines, country) {
  const labeled = valueAfterLabel(lines, ["origin", "region", "farm", "estate", "producer", "产地", "庄园", "农场", "处理站"]);
  if (labeled && !isDateOrWeightLine(labeled)) return labeled;
  const countryName = cleanLine(country);
  for (const line of lines) {
    if (!/(?:庄园|农场|处理站|产区|地块|\bestate\b|\bfarm\b|\bregion\b)/i.test(line)) continue;
    let candidate = cleanLine(line)
      .replace(/([a-z0-9])([\u4e00-\u9fff])/gi, "$1|$2")
      .split(/[|｜]/)
      .filter(Boolean)
      .find((part) => /(?:庄园|农场|处理站|产区)/.test(part));
    if (!candidate) continue;
    if (countryName) candidate = candidate.replace(new RegExp(countryName, "g"), "");
    candidate = cleanLine(candidate.replace(/^地块\s*/, ""));
    if (candidate) return candidate;
  }
  return "";
}

function catalogBeanToFields(bean) {
  const flavorDescription = bean.flavorText
    || (Array.isArray(bean.flavorNotes) ? bean.flavorNotes.filter(Boolean).join("、") : "")
    || bean.summary
    || "";
  return {
    name: cleanMeaningfulValue(bean.detailName || bean.name),
    roaster: cleanMeaningfulValue(bean.roaster),
    country: cleanMeaningfulValue(bean.country),
    origin: cleanMeaningfulValue(bean.region || bean.origin || bean.farmOrStation),
    variety: cleanMeaningfulValue(bean.variety),
    process: cleanMeaningfulValue(bean.process),
    flavorDescription: cleanMeaningfulValue(flavorDescription),
    roastLevel: cleanMeaningfulValue(bean.roastLevel || bean.roast),
    initialWeight: parseWeight(bean.size),
    roastDate: ""
  };
}

function matchCatalogBean(lines) {
  const ocrTokens = new Set(tokenize(lines.join(" ")));
  const ocrTokenList = Array.from(ocrTokens);
  if (!ocrTokens.size) return null;
  let best = null;
  getBundledRoasterBeans().forEach((bean) => {
    const nameTokens = unique(tokenize(`${bean.name || ""} ${bean.detailName || ""}`));
    if (!nameTokens.length) return;
    const nameMatches = nameTokens.filter((token) => (
      ocrTokenList.some((ocrToken) => tokensMatch(token, ocrToken))
    )).length;
    const distinctiveNameMatched = nameTokens
      .filter((token) => !CATALOG_NAME_DESCRIPTOR_WORDS.has(token))
      .some((token) => ocrTokenList.some((ocrToken) => tokensMatch(token, ocrToken)));
    const nameCoverage = nameMatches / nameTokens.length;
    const roasterTokens = tokenize(bean.roaster || "");
    const roasterMatched = roasterTokens.some((token) => (
      ocrTokenList.some((ocrToken) => tokensMatch(token, ocrToken))
    ));
    const score = nameCoverage + (roasterMatched ? 0.22 : 0);
    if (nameMatches >= 1 && distinctiveNameMatched && (!best || score > best.score)) {
      best = { bean, score, nameCoverage, roasterMatched };
    }
  });
  if (!best) return null;
  const reliable = best.nameCoverage >= 0.66 || (best.nameCoverage >= 0.5 && best.roasterMatched);
  return reliable ? best : null;
}

function fallbackName(lines, fields) {
  const excluded = [fields.roaster, fields.country, fields.process, fields.variety, fields.roastLevel]
    .map(normalizeSearch)
    .filter(Boolean);
  return lines.find((line) => {
    const normalized = normalizeSearch(line);
    if (!normalized || META_LABEL_PATTERN.test(line)) return false;
    if (/^\d+(?:\.\d+)?\s*(?:g|kg)$/i.test(line)) return false;
    if (excluded.some((value) => normalized === value)) return false;
    return /[a-z\u4e00-\u9fff]/i.test(line) && line.length >= 3;
  }) || "";
}

function parseBeanOcrLines(input) {
  const lines = unique((Array.isArray(input) ? input : [])
    .map((item) => cleanLine(typeof item === "string" ? item : item && item.text))
    .filter(Boolean));
  const rawText = lines.join("\n");
  const catalogMatch = matchCatalogBean(lines);
  const detectedFields = {
    name: "",
    roaster: findKnownRoaster(rawText),
    country: findAlias(rawText, COUNTRY_ALIASES),
    origin: "",
    variety: findAlias(rawText, VARIETY_ALIASES),
    process: findAlias(rawText, PROCESS_ALIASES),
    flavorDescription: parseFlavorDescription(lines),
    roastLevel: findAlias(rawText, ROAST_ALIASES),
    initialWeight: parseWeight(rawText),
    roastDate: parseRoastDate(lines)
  };
  detectedFields.origin = parseOrigin(lines, detectedFields.country);
  const fields = {
    name: "",
    roaster: "",
    country: "",
    origin: "",
    variety: "",
    process: "",
    flavorDescription: "",
    roastLevel: "",
    initialWeight: "",
    roastDate: "",
    ...(catalogMatch ? catalogBeanToFields(catalogMatch.bean) : {})
  };
  Object.keys(detectedFields).forEach((key) => {
    const detected = detectedFields[key];
    if (!detected) return;
    if (key === "process" && fields.process) {
      const catalogProcess = normalizeSearch(fields.process);
      const detectedProcess = normalizeSearch(detected);
      // Preserve a more specific catalog description such as “暗室水洗”
      // when OCR only sees “水洗”, but trust the label when the processing
      // families conflict (for example catalog “水洗” vs label “日晒”).
      if (catalogProcess.includes(detectedProcess) || detectedProcess.includes(catalogProcess)) return;
    }
    fields[key] = detected;
  });
  if (!fields.roastDate) fields.roastDate = parseRoastDate(lines);
  if (!fields.name) fields.name = fallbackName(lines, fields);
  return {
    fields,
    rawLines: lines,
    catalogMatch: catalogMatch ? {
      id: catalogMatch.bean.id,
      name: catalogMatch.bean.name,
      roaster: catalogMatch.bean.roaster,
      score: Number(catalogMatch.score.toFixed(3))
    } : null,
    filledFields: Object.keys(fields).filter((key) => Boolean(fields[key]))
  };
}

module.exports = {
  parseBeanOcrLines
};
