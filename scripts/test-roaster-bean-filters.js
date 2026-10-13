const assert = require("assert");
const {
  getRoasterBeanFilterValues,
  normalizeRoasterBeanFilters,
  buildRoasterBeanFilterGroups
} = require("../data/roaster-bean-filters");

const varietyOf = (variety) => getRoasterBeanFilterValues({ variety }, "variety");
assert.deepEqual(varietyOf("Gesha"), ["瑰夏"]);
assert.deepEqual(varietyOf("黄卡杜艾、帕莱索"), ["卡杜艾", "其他"]);
assert.deepEqual(varietyOf("SL-28、Ruiru 11、Batian"), ["SL28", "其他"]);
assert.deepEqual(varietyOf("74110（74-110）"), ["74110"]);
assert.deepEqual(varietyOf("JARC 74158、Heirloom原生种"), ["74158", "埃塞原生种"]);
assert.deepEqual(varietyOf("74158 库鲁梅"), ["74158"]);
assert.deepEqual(varietyOf("74112（74-112）"), ["埃塞原生种"]);
assert.deepEqual(varietyOf("Pink Bourbon粉红波旁"), ["粉红波旁"]);
assert.deepEqual(varietyOf("Bourbon Ají"), ["其他"]);
assert.deepEqual(varietyOf("SL9（Geisha Inca）"), ["其他"]);

const processOf = (process) => getRoasterBeanFilterValues({ process }, "process");
assert.deepEqual(processOf("经典水洗（高架床干燥）"), ["水洗"]);
assert.deepEqual(processOf("水洗（15小时发酵）"), ["水洗"]);
assert.deepEqual(processOf("96小时 Mosto 厌氧日晒"), ["日晒", "厌氧 / 特殊发酵"]);
assert.deepEqual(processOf("72小时发酵日晒"), ["日晒", "厌氧 / 特殊发酵"]);
assert.deepEqual(processOf("黄蜜处理"), ["蜜处理"]);
assert.deepEqual(processOf("水洗 · 甘蔗乙酸乙酯脱咖啡因"), ["水洗", "低因"]);
assert.deepEqual(processOf("拼配"), ["其他"]);

const beans = [
  { variety: "Ombligon", process: "日晒", country: "哥伦比亚" },
  { variety: "瑰夏", process: "水洗", country: "巴拿马" },
  { variety: "Geisha", process: "厌氧水洗", country: "巴拿马" },
  { variety: "SL28、SL34", process: "水洗", country: "肯尼亚" }
];
const groups = buildRoasterBeanFilterGroups(beans, { variety: ["瑰夏", "黄卡杜艾、帕莱索"], country: ["巴拿马"] });
const optionsOf = (key) => groups.find((group) => group.key === key).options.map((option) => option.value);
assert.deepEqual(optionsOf("variety"), ["瑰夏", "SL28", "SL34", "其他"]);
assert.deepEqual(optionsOf("process"), ["水洗", "日晒", "厌氧 / 特殊发酵"]);
assert.deepEqual(optionsOf("country"), ["巴拿马", "哥伦比亚", "肯尼亚"]);
assert.deepEqual(
  groups.find((group) => group.key === "variety").options.filter((option) => option.isSelected).map((option) => option.value),
  ["瑰夏"]
);
// 旧版本存下来的组合选项不再存在，应被丢弃
assert.deepEqual(normalizeRoasterBeanFilters(beans, { variety: ["黄卡杜艾、帕莱索"] }).variety, []);

console.log("roaster bean filter tests passed");
