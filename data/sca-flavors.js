// SCA/WCR Coffee Taster's Flavor Wheel (2016) taxonomy.
// Chinese labels are paired with the standard English terms for unambiguous reference.
const SCA_FLAVOR_CATEGORIES = [
  {
    id: "floral",
    name: "花香",
    english: "Floral",
    color: "#d82b8b",
    softColor: "#fff2f8",
    description: "轻盈、清晰的花朵与茶香。",
    groups: [
      { name: "浅雅 / 综合花香", english: "Floral", flavors: [
        { name: "洋甘菊", english: "Chamomile" },
        { name: "玫瑰", english: "Rose" },
        { name: "茉莉", english: "Jasmine" }
      ] },
      { name: "氧化茶香", english: "Black Tea", flavors: [
        { name: "红茶", english: "Black Tea" }
      ] }
    ]
  },
  {
    id: "fruity",
    name: "果香",
    english: "Fruity",
    color: "#e83b25",
    softColor: "#fff3ef",
    description: "从莓果、柑橘到熟果的甜美与芳香气息。",
    groups: [
      { name: "浆果", english: "Berry", flavors: [
        { name: "蓝莓", english: "Blueberry" },
        { name: "草莓", english: "Strawberry" },
        { name: "黑莓", english: "Blackberry" },
        { name: "覆盆子", english: "Raspberry" }
      ] },
      { name: "果干", english: "Dried Fruit", flavors: [
        { name: "葡萄干", english: "Raisin" },
        { name: "西梅干", english: "Prune" }
      ] },
      { name: "其他水果", english: "Other Fruit", flavors: [
        { name: "椰子", english: "Coconut" },
        { name: "樱桃", english: "Cherry" },
        { name: "石榴", english: "Pomegranate" },
        { name: "菠萝", english: "Pineapple" },
        { name: "葡萄", english: "Grape" },
        { name: "苹果", english: "Apple" },
        { name: "桃子", english: "Peach" },
        { name: "梨", english: "Pear" }
      ] },
      { name: "柑橘类水果", english: "Citrus Fruit", flavors: [
        { name: "西柚", english: "Grapefruit" },
        { name: "橙子", english: "Orange" },
        { name: "柠檬", english: "Lemon" },
        { name: "青柠", english: "Lime" }
      ] }
    ]
  },
  {
    id: "sour-fermented",
    name: "酸味 / 发酵",
    english: "Sour / Fermented",
    color: "#d9c900",
    softColor: "#fffceb",
    description: "明亮酸质，以及酒香或发酵产生的气息。",
    groups: [
      { name: "酸味", english: "Sour", flavors: [
        { name: "酸香", english: "Sour Aromatics" },
        { name: "醋酸", english: "Acetic Acid" },
        { name: "丁酸", english: "Butyric Acid" },
        { name: "异戊酸", english: "Isovaleric Acid" },
        { name: "柠檬酸", english: "Citric Acid" },
        { name: "苹果酸", english: "Malic Acid" }
      ] },
      { name: "酒香 / 发酵", english: "Alcohol / Fermented", flavors: [
        { name: "酒香", english: "Winey" },
        { name: "威士忌", english: "Whiskey" },
        { name: "发酵", english: "Fermented" },
        { name: "过熟", english: "Overripe" }
      ] }
    ]
  },
  {
    id: "green-vegetative",
    name: "绿色植物 / 蔬菜",
    shortName: "绿色植物 / 蔬菜",
    english: "Green / Vegetative",
    color: "#20a83a",
    softColor: "#effaf1",
    description: "新鲜植物、豆荚、草本与生青气息。",
    groups: [
      { name: "橄榄油", english: "Olive Oil", flavors: [
        { name: "橄榄油", english: "Olive Oil" }
      ] },
      { name: "生味", english: "Raw", flavors: [
        { name: "生味", english: "Raw" }
      ] },
      { name: "绿色植物", english: "Green / Vegetative", flavors: [
        { name: "未成熟", english: "Under-ripe" },
        { name: "豆荚", english: "Peapod" },
        { name: "清新", english: "Fresh" },
        { name: "深绿蔬菜", english: "Dark Green" },
        { name: "蔬菜", english: "Vegetative" },
        { name: "干草", english: "Hay-like" },
        { name: "草本", english: "Herb-like" },
        { name: "豆味", english: "Beany" }
      ] }
    ]
  },
  {
    id: "other",
    name: "其他 / 瑕疵",
    english: "Other",
    color: "#5b8db7",
    softColor: "#f1f7fb",
    description: "纸质、霉土、木质及化学类描述。",
    groups: [
      { name: "纸质 / 霉味", english: "Papery / Musty", flavors: [
        { name: "陈味", english: "Stale" },
        { name: "纸板", english: "Cardboard" },
        { name: "纸张", english: "Papery" },
        { name: "木质", english: "Woody" },
        { name: "霉湿", english: "Moldy / Damp" },
        { name: "霉尘", english: "Musty / Dusty" },
        { name: "霉土", english: "Musty / Earthy" },
        { name: "动物气息", english: "Animalic" },
        { name: "肉汤", english: "Meaty / Brothy" }
      ] },
      { name: "化学气息", english: "Chemical", flavors: [
        { name: "苦味", english: "Bitter" },
        { name: "咸味", english: "Salty" },
        { name: "药味", english: "Medicinal" },
        { name: "石油", english: "Petroleum" },
        { name: "臭鼬味", english: "Skunky" },
        { name: "橡胶", english: "Rubber" }
      ] }
    ]
  },
  {
    id: "roasted",
    name: "烘烤",
    english: "Roasted",
    color: "#a84a25",
    softColor: "#fbf2ed",
    description: "谷物、烟熏、焦糖化与烘焙反应气息。",
    groups: [
      { name: "烟斗烟草", english: "Pipe Tobacco", flavors: [
        { name: "烟斗烟草", english: "Pipe Tobacco" }
      ] },
      { name: "烟草", english: "Tobacco", flavors: [
        { name: "烟草", english: "Tobacco" }
      ] },
      { name: "焦烤", english: "Burnt", flavors: [
        { name: "辛焦", english: "Acrid" },
        { name: "灰烬", english: "Ashy" },
        { name: "烟熏", english: "Smoky" },
        { name: "深烘焙", english: "Brown, Roast" }
      ] },
      { name: "谷物", english: "Cereal", flavors: [
        { name: "谷物", english: "Grain" },
        { name: "麦芽", english: "Malt" }
      ] }
    ]
  },
  {
    id: "spices",
    name: "香料",
    english: "Spices",
    color: "#d62d2d",
    softColor: "#fff1f1",
    description: "刺激香料、胡椒与温暖的棕色香料。",
    groups: [
      { name: "刺激香料", english: "Pungent", flavors: [
        { name: "刺激性", english: "Pungent" },
        { name: "胡椒", english: "Pepper" }
      ] },
      { name: "棕色香料", english: "Brown Spice", flavors: [
        { name: "八角", english: "Anise" },
        { name: "肉豆蔻", english: "Nutmeg" },
        { name: "肉桂", english: "Cinnamon" },
        { name: "丁香", english: "Clove" }
      ] }
    ]
  },
  {
    id: "nutty-cocoa",
    name: "坚果 / 可可",
    english: "Nutty / Cocoa",
    color: "#bd782d",
    softColor: "#fcf5ec",
    description: "坚果脂香、可可与巧克力气息。",
    groups: [
      { name: "坚果", english: "Nutty", flavors: [
        { name: "花生", english: "Peanuts" },
        { name: "榛子", english: "Hazelnut" },
        { name: "杏仁", english: "Almond" }
      ] },
      { name: "可可", english: "Cocoa", flavors: [
        { name: "巧克力", english: "Chocolate" },
        { name: "黑巧克力", english: "Dark Chocolate" }
      ] }
    ]
  },
  {
    id: "sweet",
    name: "甜感",
    english: "Sweet",
    color: "#f39724",
    softColor: "#fff8ec",
    description: "糖、蜂蜜、香草与整体甜香。",
    groups: [
      { name: "红糖", english: "Brown Sugar", flavors: [
        { name: "糖蜜", english: "Molasses" },
        { name: "枫糖浆", english: "Maple Syrup" },
        { name: "焦糖", english: "Caramelized" },
        { name: "蜂蜜", english: "Honey" }
      ] },
      { name: "香草", english: "Vanilla", flavors: [
        { name: "香草", english: "Vanilla" },
      ] },
      { name: "香兰素", english: "Vanillin", flavors: [
        { name: "香兰素", english: "Vanillin" },
      ] },
      { name: "整体甜感", english: "Overall Sweet", flavors: [
        { name: "整体甜感", english: "Overall Sweet" },
      ] },
      { name: "甜香", english: "Sweet Aromatics", flavors: [
        { name: "甜香", english: "Sweet Aromatics" }
      ] }
    ]
  }
];

const SCA_FLAVOR_GROUP_DESCRIPTIONS = Object.freeze({
  Berry: "细腻而明亮的红色、蓝色与深色莓果气息。",
  "Dried Fruit": "浓缩、成熟，带有果脯般的甜香。",
  "Other Fruit": "核果、仁果与热带水果的复合果香。",
  "Citrus Fruit": "从西柚到青柠，清晰而鲜活的柑橘香气。",
  Floral: "清雅的花瓣、香水与白色花朵气息。",
  "Black Tea": "干净、轻盈并带有浸泡红茶的芳香。",
  Sour: "从明亮果酸到挥发性酸香。",
  "Alcohol / Fermented": "酒香、发酵与熟成果实的复杂气息。",
  "Green / Vegetative": "新鲜植物、豆荚与草本气息。",
  "Olive Oil": "圆润、青绿的橄榄油芳香。",
  Raw: "未加工谷物或生鲜原料般的气息。",
  "Papery / Musty": "纸张、木质、陈旧或潮湿土壤气息。",
  Chemical: "药品、石油、橡胶等化学类描述。",
  Tobacco: "干燥烟叶与烟斗烟草气息。",
  "Pipe Tobacco": "甜暖、干燥的烟斗烟草气息。",
  Burnt: "深度烘烤、烟熏、焦黑与灰烬气息。",
  Cereal: "烤谷物、麦芽与谷粒气息。",
  Pungent: "刺激而鲜明的香料与胡椒气息。",
  "Brown Spice": "肉桂、丁香等温暖的棕色香料。",
  Nutty: "花生、榛子与杏仁的坚果脂香。",
  Cocoa: "可可粉、巧克力与深色可可气息。",
  "Brown Sugar": "糖蜜、蜂蜜、焦糖与枫糖浆甜香。",
  Vanilla: "柔和、甜暖的天然香草气息。",
  Vanillin: "清晰、直接的香兰素甜香。",
  "Overall Sweet": "没有指向具体食物的整体甜感。",
  "Sweet Aromatics": "香草与整体柔和甜香。"
});

// Concise Chinese translations of the WCR Sensory Lexicon 2.0 definitions.
// These describe sensory character only; they do not imply positive or negative quality.
const SCA_FLAVOR_DEFINITIONS_ZH = Object.freeze({
  "Black Tea": "与茶叶氧化相关，略带褐色、霉陈、干燥植物和干树皮的香气。",
  Chamomile: "洋甘菊特有的甜香、轻微花果香，以及略带木质的青香。",
  Rose: "新鲜或干燥玫瑰所呈现的甜美、柔和，并略带霉尘感的花香。",
  Jasmine: "浓郁、略辛香且甜美的花香，底层带有青绿与轻微霉尘气息。",
  Blueberry: "蓝莓特有的深色果香，略甜、略酸，并带有轻微霉陈、尘土与花香。",
  Strawberry: "草莓特有的微甜、微酸、花香与果香，常带有葡萄酒般气息。",
  Blackberry: "黑莓特有的甜美深色果香与花香，略酸，并带有些许木质气息。",
  Raspberry: "覆盆子特有的清淡甜香、果香与花香，略酸并带轻微霉陈气息。",
  Raisin: "葡萄干特有的浓缩甜香，带些酸感、褐色调、果香与花香。",
  Prune: "西梅干特有的深色果香，甜美、略带褐色与花香，并有霉陈和过熟气息。",
  Grapefruit: "西柚特有的柑橘、酸、苦与涩感，带果皮、尖锐及轻微甜香。",
  Orange: "橙子特有的柑橘甜香、花香与轻微酸感，也可能带苦味、果皮感和涩感。",
  Lemon: "柠檬特有的柑橘酸香与涩感，略甜，带果皮和些许花香。",
  Lime: "青柠特有的柑橘酸香，带涩、苦、青绿、果皮、尖锐感和些许花香。",
  Coconut: "椰子特有的轻微甜香、坚果香与些许木质气息。",
  Cherry: "樱桃特有的酸味果香，略带苦感与花香。",
  Pomegranate: "石榴般的酸甜果香，可带深色水果、霉土及甜菜或胡萝卜般根茎气息，并可能伴随涩感。",
  Pineapple: "菠萝特有的甜美、略显尖锐的果香。",
  Grape: "葡萄常见的甜美果香与花香，略酸并带轻微霉陈气息。",
  Apple: "新鲜或加工苹果常见的甜美、轻盈果香，并带些许花香。",
  Peach: "桃子特有的花香、香水感与甜美果香，并带轻微酸感。",
  Pear: "梨特有的甜美果香，略带花香、霉陈与木质气息。",
  "Sour Aromatics": "让人联想到酸味产品的香气。",
  "Acetic Acid": "与醋相关的酸香，带涩感并略显辛锐。",
  "Butyric Acid": "与帕玛森等熟成奶酪相关的酸味与发酵乳制品气息。",
  "Isovaleric Acid": "辛锐的酸香，让人联想到汗脚气味及 Romano 等熟成奶酪。",
  "Citric Acid": "温和、干净的酸香，略带柑橘气息并伴随涩感。",
  "Malic Acid": "尖锐并略带果香的酸感，同时伴随涩感。",
  Winey: "与葡萄酒相关的尖锐、辛香、略带果味和酒精感的香气。",
  Fermented: "发酵水果、糖或过度醒发面团特有的辛香、甜香与微酸，偶带酵母和酒精气息。",
  Overripe: "果蔬超过最佳成熟度后呈现的甜香、微酸、潮湿与霉土气息。",
  Whiskey: "由发酵谷物醪液蒸馏所得烈酒的典型香气。",
  "Olive Oil": "轻盈的油脂香气，可带黄油、青绿、胡椒、苦味与甜香。",
  Raw: "让人联想到未经烹煮或加工原料的气息。",
  "Under-ripe": "青涩或未成熟水果所呈现的香气。",
  Peapod: "甜、豆香、新鲜而生青的绿色香气，并带轻微霉土气息。",
  Fresh: "新割青草与叶类植物的绿色香气，兼具甜感与辛锐感。",
  "Dark Green": "熟菠菜、羽衣甘蓝或四季豆般的深重青菜气息，可带苦、甜、尘土、霉陈或泥土感。",
  Vegetative: "欧芹、菠菜或豆荚等绿色植物与蔬菜的尖锐、略辛香气息。",
  "Hay-like": "干草特有的轻甜、干燥、尘土气息，并带轻微青绿感。",
  "Herb-like": "绿色香草常见的甜香、轻微辛香与微苦，可带青绿或褐色调。",
  Beany: "豆类及豆制品特有的复合气息，包含霉土、霉尘、酸香、苦感、淀粉、豆荚青香、坚果或褐色调。",
  Stale: "以缺乏新鲜感为主要特征的气息。",
  Cardboard: "纸板或纸质包装材料特有的气息。",
  Papery: "白色纸杯或白纸特有的气息。",
  Woody: "树皮般的甜香、褐色调、霉陈与深沉木质气息。",
  "Moldy / Damp": "潮湿密闭空间或地下室般的气息，可带霉陈、尖锐与轻微青绿感。",
  "Musty / Dusty": "阁楼或衣橱等干燥封闭空间的气息，可带干燥霉陈、纸张、干土或谷物感。",
  "Musty / Earthy": "腐败植物与潮湿黑土般的厚重霉土气息，并略带甜感。",
  Animalic: "农场动物及其生活环境所产生气息的组合。",
  "Meaty / Brothy": "水煮肉、汤或高汤般的香气，肉味相对柔弱。",
  Bitter: "以咖啡因溶液为典型参照的基础苦味。",
  Salty: "以氯化钠为典型参照的基础咸味。",
  Medicinal: "创可贴、酒精或碘酒等消毒用品特有的干净、无菌感气息。",
  Petroleum: "原油及其精炼产品特有的化学气息，并带厚重油感。",
  Skunky: "让人联想到臭鼬的复合气息。",
  Rubber: "橡胶特有的深沉、厚重、略尖锐且辛烈的气息。",
  "Pipe Tobacco": "熟成烟草特有的褐色甜香，略辛，并带果香、花香与香料气息。",
  Tobacco: "熟成烟草特有的褐色调、轻微甜香与辛香。",
  Acrid: "过度烘烤或褐变食品所产生的尖锐、辛烈、苦涩与酸性气息。",
  Ashy: "燃烧残留物所呈现的干燥、尘土、脏污与烟熏气息。",
  Smoky: "木材、树叶或非天然材料燃烧后产生的强烈、辛锐烟熏气息。",
  "Brown, Roast": "浓郁、饱满、圆润且带一定深色调的烘烤香气，常伴随烘烤、坚果与甜香。",
  Grain: "谷物特有的浅褐色、尘土、霉陈与甜香。",
  Malt: "谷物特有的浅褐色、尘土、霉陈与甜香，并带酸感或轻微发酵气息。",
  Pungent: "在鼻腔中产生尖锐、具有穿透感的物理刺激。",
  Pepper: "黑胡椒粉特有的香料、辛锐、霉陈与木质气息。",
  Anise: "八角特有的辛香、甜香、褐色与焦糖化气息，也可能带石油、药感与花香。",
  Nutmeg: "肉豆蔻特有的湿润褐色、木质、辛锐与厚重气息，带石油感及轻微柠檬印象。",
  Cinnamon: "肉桂特有的甜香、褐色调、轻微木质与辛香。",
  Clove: "丁香特有的甜香、褐色调、香料与辛香，并带花香、柑橘、药感及轻微薄荷气息。",
  Peanuts: "花生特有的甜香、浅褐色与油脂气息，略带霉尘和豆香，并可能有轻微涩感。",
  Hazelnut: "榛子特有的木质、褐色、甜香、霉土与轻微雪松气息，也可带花香、豆香、油脂、涩与苦感。",
  Almond: "杏仁特有的甜香、浅褐色、木质与黄油气息，带玫瑰、樱桃或杏般花果香，并有涩感和轻微烟熏感。",
  Chocolate: "不同强度的可可、可可脂与深烘焙气息的组合。",
  "Dark Chocolate": "高强度的可可与可可脂气息，可带深烘焙、香料、焦味和霉陈，并具有更明显的涩与苦感。",
  Molasses: "糖蜜特有的深色焦糖化前调，可略带尖锐、辛焦与含硫气息。",
  "Maple Syrup": "枫糖浆特有的木质、甜香、焦糖化与褐色气息，并略带青绿感。",
  Caramelized: "糖或其他碳水化合物受热后产生的圆润、饱满、中度褐色甜香，不包含烧焦气息。",
  Honey: "蜂蜜特有的甜香、浅褐色调与轻微香料气息。",
  Vanilla: "香草豆特有的木质与轻微化学气息，可带褐色、豆香、花香和香料气息。",
  Vanillin: "极其甜美的非天然香草气息，让人联想到棉花糖与软糖。",
  "Overall Sweet": "甜味与甜香共同形成的整体甜感知。",
  "Sweet Aromatics": "让人联想到甜味物质的香气。"
});

function getDecoratedSCAFlavorCategories(customFlavors = []) {
  const customByGroup = (Array.isArray(customFlavors) ? customFlavors : []).reduce((result, flavor) => {
    const categoryId = String(flavor && flavor.categoryId || "");
    const category = SCA_FLAVOR_CATEGORIES.find((item) => item.id === categoryId);
    if (!category) return result;
    const requestedGroup = String(flavor && flavor.groupEnglish || "");
    const group = category.groups.find((item) => item.english === requestedGroup) || category.groups[0];
    if (!group) return result;
    const key = `${categoryId}:${group.english}`;
    if (!result[key]) result[key] = [];
    result[key].push({
      id: String(flavor.id || ""),
      name: String(flavor.name || "").trim(),
      english: String(flavor.english || "").trim() || "Custom",
      description: String(flavor.description || "").trim() || "用户自定义风味。",
      isCustom: true
    });
    return result;
  }, Object.create(null));
  return SCA_FLAVOR_CATEGORIES.map((category) => {
    const standardGroups = category.groups.map((group, index) => ({
      ...group,
      index,
      count: group.flavors.length + (customByGroup[`${category.id}:${group.english}`] || []).filter((flavor) => flavor.name).length,
      description: SCA_FLAVOR_GROUP_DESCRIPTIONS[group.english] || "沿 SCA 风味轮向外探索更具体的描述。",
      flavors: group.flavors.map((flavor) => ({
        ...flavor,
        id: `${category.id}-${group.english}-${flavor.english}`,
        description: SCA_FLAVOR_DEFINITIONS_ZH[flavor.english] || "WCR 感官词典暂未提供此词条的独立定义。"
      })).concat((customByGroup[`${category.id}:${group.english}`] || []).filter((flavor) => flavor.name))
    }));
    return {
      ...category,
      count: standardGroups.reduce((total, group) => total + group.flavors.length, 0),
      groupCount: standardGroups.length,
      cardStyle: `--accent:${category.color};--soft:${category.softColor};`,
      groups: standardGroups
    };
  });
}

module.exports = { SCA_FLAVOR_CATEGORIES, getDecoratedSCAFlavorCategories };
