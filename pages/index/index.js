const { getRoasterGuideCloudPath, ROASTER_GUIDE_CLOUD_ROOT } = require("../../data/cloud-config");
const { parseBeanOcrLines } = require("../../data/bean-ocr-parser");
const { getErrorMessage, recognizeBeanLabelPhoto } = require("../../data/bean-ocr-cloud");
const { getDecoratedSCAFlavorCategories } = require("../../data/sca-flavors");
const {
  ROASTER_BEAN_FILTER_FIELDS,
  freshRoasterBeanFilters,
  getRoasterBeanFilterValues,
  normalizeRoasterBeanFilters,
  buildRoasterBeanFilterGroups,
  countRoasterBeanFilters
} = require("../../data/roaster-bean-filters");

let roasterBeansModule = null;
let audioAssetsModule = null;
let roastersModule = null;

const BUYING_GUIDE_AVATAR_IMAGE = `${ROASTER_GUIDE_CLOUD_ROOT}/assets/buying-guide/youcao-avatar.png`;
const BUYING_GUIDE_BACKGROUND_IMAGE = `${ROASTER_GUIDE_CLOUD_ROOT}/assets/buying-guide/youcao-background.jpg`;
const BUYING_GUIDE_AVATAR_CACHE_ID = "buying-guide:avatar";
const BUYING_GUIDE_BACKGROUND_CACHE_ID = "buying-guide:background";

function getRoasterBeansModule() {
  if (!roasterBeansModule) roasterBeansModule = require("../../data/roaster-beans");
  return roasterBeansModule;
}

function getRoasterBeans(roasterName) {
  if (!roasterName) return [];
  if (!cachedRoasterBeanLists[roasterName]) {
    cachedRoasterBeanLists[roasterName] = getRoasterBeansModule().getRoasterBeans(roasterName);
  }
  return cachedRoasterBeanLists[roasterName];
}

function normalizeRoasterBeanSearchText(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  return (typeof text.normalize === "function" ? text.normalize("NFD") : text)
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesRoasterBeanSearchTerm(fields, term) {
  const normalizedTerm = normalizeRoasterBeanSearchText(term);
  if (!normalizedTerm) return true;
  const isShortLatinTerm = /^[a-z0-9]{1,2}$/.test(normalizedTerm);
  return fields.some((field) => {
    const normalizedField = normalizeRoasterBeanSearchText(field);
    if (!normalizedField) return false;
    if (!isShortLatinTerm) return normalizedField.includes(normalizedTerm);
    return normalizedField
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .some((word) => word.startsWith(normalizedTerm));
  });
}

function filterRoasterBeans(beans, query, filters) {
  const terms = normalizeRoasterBeanSearchText(query)
    .split(/\s+/)
    .filter(Boolean);
  const normalizedFilters = normalizeRoasterBeanFilters(beans, filters);
  return beans.filter((bean) => {
    const searchableFields = [
      bean.name,
      bean.country,
      bean.region,
      bean.farmOrStation,
      bean.producer,
      bean.process,
      bean.variety,
      bean.roast,
      ...getRoasterBeanFilterValues(bean, "variety"),
      ...getRoasterBeanFilterValues(bean, "process")
    ];
    const matchesSearch = terms.every((term) => matchesRoasterBeanSearchTerm(searchableFields, term));
    const matchesFilters = ROASTER_BEAN_FILTER_FIELDS.every((definition) => {
      const selectedValues = normalizedFilters[definition.key];
      if (!selectedValues.length) return true;
      const beanValues = getRoasterBeanFilterValues(bean, definition.key);
      return selectedValues.some((value) => beanValues.includes(value));
    });
    return matchesSearch && matchesFilters;
  });
}

function applyCloudRoasterBeans(beans) {
  if (!getRoasterBeansModule().setRoasterBeansCatalog(beans)) return false;
  Object.keys(cachedRoasterBeanLists).forEach((key) => delete cachedRoasterBeanLists[key]);
  Object.keys(cachedRoasterBeanDetailViews).forEach((key) => delete cachedRoasterBeanDetailViews[key]);
  return true;
}

function resetCloudRoasterBeans() {
  if (!getRoasterBeansModule().resetRoasterBeansCatalog()) return false;
  Object.keys(cachedRoasterBeanLists).forEach((key) => delete cachedRoasterBeanLists[key]);
  Object.keys(cachedRoasterBeanDetailViews).forEach((key) => delete cachedRoasterBeanDetailViews[key]);
  return true;
}

function applyRoasterBeanImageCache(cache) {
  if (!getRoasterBeansModule().setRoasterBeanImageCache(cache)) return false;
  Object.keys(cachedRoasterBeanLists).forEach((key) => delete cachedRoasterBeanLists[key]);
  Object.keys(cachedRoasterBeanDetailViews).forEach((key) => delete cachedRoasterBeanDetailViews[key]);
  return true;
}

function decorateRoasterBeanDetail(bean) {
  if (!bean) return null;
  return getRoasterBeansModule().decorateRoasterBeanDetail(bean);
}

function buildRoasterBeanDetailView(bean) {
  const cacheKey = bean && String(bean.id || "");
  if (cacheKey && cachedRoasterBeanDetailViews[cacheKey]) {
    return cachedRoasterBeanDetailViews[cacheKey];
  }
  let detail = decorateRoasterBeanDetail(bean);
  if (detail && detail.roasterBrewRecipe) {
    const roasterRecipe = buildRoasterRecipe(detail);
    detail = {
      ...detail,
      roasterRecipe,
      roasterRecipeDisplay: roasterRecipe ? decorateRecipe(roasterRecipe) : null
    };
  }
  if (cacheKey && detail) cachedRoasterBeanDetailViews[cacheKey] = detail;
  return detail;
}

function getRoasters(imageCache = {}) {
  if (!roastersModule) roastersModule = require("../../data/roasters");
  const cache = imageCache && typeof imageCache === "object" ? imageCache : {};
  return (roastersModule.ROASTERS || []).map((roaster) => {
    const logoCloudImage = String(roaster.logoImage || "");
    const logoCacheKey = `roaster-logo:${roaster.name}`;
    const cachedLogo = cache[logoCacheKey];
    return {
      ...roaster,
      logoCacheKey,
      logoCloudImage,
      logoImage: cachedLogo && cachedLogo.source === logoCloudImage && cachedLogo.path
        ? cachedLogo.path
        : ""
    };
  });
}

function getAudioAssets() {
  if (!audioAssetsModule) audioAssetsModule = require("../../data/audio-assets");
  return audioAssetsModule;
}

function getNavigationMetrics() {
  if (typeof wx === "undefined") {
    return {
      statusBarHeight: 20,
      navigationBarHeight: 44,
      menuSafeRight: 16
    };
  }
  let windowInfo = {};
  let menuButton = null;
  try {
    windowInfo = wx.getWindowInfo
      ? wx.getWindowInfo()
      : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {});
  } catch (error) {
    windowInfo = {};
  }
  try {
    menuButton = wx.getMenuButtonBoundingClientRect
      ? wx.getMenuButtonBoundingClientRect()
      : null;
  } catch (error) {
    menuButton = null;
  }
  const statusBarHeight = Math.max(0, Number(windowInfo.statusBarHeight) || 20);
  const windowWidth = Math.max(0, Number(windowInfo.windowWidth) || Number(windowInfo.screenWidth) || 375);
  const menuTop = Number(menuButton && menuButton.top);
  const menuHeight = Number(menuButton && menuButton.height);
  const menuLeft = Number(menuButton && menuButton.left);
  const navigationBarHeight = menuButton && menuHeight > 0
    ? Math.max(menuHeight, menuHeight + Math.max(4, menuTop - statusBarHeight) * 2)
    : 44;
  const menuSafeRight = menuButton && menuLeft > 0
    ? Math.max(16, windowWidth - menuLeft + 8)
    : 16;
  return {
    statusBarHeight: round(statusBarHeight),
    navigationBarHeight: round(navigationBarHeight),
    menuSafeRight: round(menuSafeRight)
  };
}

function isWechatDevtools() {
  if (typeof wx === "undefined") return false;
  try {
    const deviceInfo = wx.getDeviceInfo
      ? wx.getDeviceInfo()
      : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {});
    return String(deviceInfo.platform || "").toLowerCase() === "devtools";
  } catch (error) {
    return false;
  }
}

// Keep this key stable across releases so app updates continue reading the same user data.
const STORAGE_KEY = "pourNotes.miniprogram.state";
const STORAGE_BACKUP_KEY = `${STORAGE_KEY}.previousVersion`;
const STORAGE_SCHEMA_VERSION = 6;
const ROASTER_CATALOG_CACHE_KEY = "pourNotes.roasterCatalog.v1";
const ROASTER_IMAGE_CACHE_KEY = "pourNotes.roasterImages.v1";
const ROASTER_CATALOG_REFRESH_INTERVAL = 5 * 60 * 1000;
const ROASTER_IMAGE_DOWNLOAD_CONCURRENCY = 3;
const ROASTER_IMAGE_CACHE_FLUSH_DELAY = 180;
const ROASTER_CATALOG_FUNCTION = "roasterCatalog";
const SHARE_TITLE = "Pour Notes｜记录每一次手冲";
const SHARE_PATH = "/pages/index/index";
const SHARE_TIMELINE_QUERY = "source=timeline";
const SHARE_IMAGE_URL = "/assets/icons/share-cover-optimized.png";
const SHARE_TIMELINE_IMAGE_URL = "/assets/icons/share-timeline-cover-optimized.jpg";
const DING_AUDIO_FILE = "pour-notes-ding.wav";
const FINISH_AUDIO_FILE = "pour-notes-finish.wav";
const FLAVOR_CATEGORY_OPTIONS = getDecoratedSCAFlavorCategories();

function getFlavorCategoryOption(categoryId) {
  return FLAVOR_CATEGORY_OPTIONS.find((category) => category.id === categoryId) || FLAVOR_CATEGORY_OPTIONS[0];
}

function freshFlavorAddForm(categoryId = "", groupEnglish = "") {
  const category = getFlavorCategoryOption(categoryId);
  const group = category && (
    category.groups.find((item) => item.english === groupEnglish) || category.groups[0]
  );
  return {
    categoryId: category ? category.id : "",
    groupEnglish: group ? group.english : "",
    name: "",
    english: "",
    description: ""
  };
}

function normalizeCustomFlavor(flavor) {
  const source = flavor && typeof flavor === "object" ? flavor : {};
  const category = getFlavorCategoryOption(String(source.categoryId || ""));
  if (!category) return null;
  const group = category.groups.find((item) => item.english === String(source.groupEnglish || "")) || category.groups[0];
  const name = String(source.name || "").trim().slice(0, 24);
  const description = String(source.description || "").trim().slice(0, 180);
  if (!name || !description || !group) return null;
  return {
    id: String(source.id || newId("flavor")),
    categoryId: category.id,
    groupEnglish: group.english,
    name,
    english: String(source.english || "").trim().slice(0, 48),
    description,
    createdAt: String(source.createdAt || new Date().toISOString())
  };
}

const DEFAULT_DRIPPERS = [
  "AeroPress",
  "April Brewer",
  "Chemex",
  "Hario NEO",
  "Hario V30",
  "Hario V60",
  "Hario V60 Switch",
  "Origami",
  "Kalita 102",
  "Kalita Wave",
  "Kono Meimon",
  "Lili Dripper",
  "Orea V4",
  "Solo Dripper",
  "Timemore B75",
  "山文62"
];

const DEFAULT_STAGES = [
  { name: "闷蒸", duration: 30, cumulativeWater: 60 },
  { name: "主注水", duration: 60, cumulativeWater: 160 },
  { name: "完成萃取", duration: 50, cumulativeWater: 225 }
];
const WATER_TIMELINE_WIDTH = 560;
const WATER_TIMELINE_HEIGHT = 112;
const BEAN_ACTION_WIDTH_ACTIVE = 348;
const BEAN_ACTION_WIDTH_EMPTY = 232;
const BEAN_SWIPE_TRIGGER = 72;
const LOG_ACTION_WIDTH = 232;
const LOG_SWIPE_TRIGGER = 72;
const LOG_LIST_INITIAL_RENDER_COUNT = 20;
const LOG_LIST_RENDER_BATCH = 20;
const RECIPE_ACTION_WIDTH = 232;
const RECIPE_SWIPE_TRIGGER = 72;
let cachedWindowWidth = 0;
let cachedPresetRecipeDisplays = null;
const cachedRoasterBeanLists = Object.create(null);
const cachedRoasterBeanDetailViews = Object.create(null);
let presetRecipesModule = null;

function getPresetRecipes() {
  if (!presetRecipesModule) presetRecipesModule = require("../../data/preset-recipes");
  return presetRecipesModule.PRESET_RECIPES || [];
}

function getPresetRecipeDisplays() {
  if (!cachedPresetRecipeDisplays) {
    cachedPresetRecipeDisplays = sortPresetRecipes(getPresetRecipes())
      .map(normalizeRecipe)
      .map((recipe) => ({ ...decorateRecipe(recipe), isPreset: true }));
  }
  return cachedPresetRecipeDisplays;
}

function isPresetRecipeId(id) {
  return getPresetRecipes().some((item) => item.id === id);
}

function isSecondaryPageState(state = {}) {
  const activeTab = state.activeTab || "brew";
  if (activeTab === "brew") {
    return state.brewHomeVisible === false || state.homeView === "logs";
  }
  if (["stats", "recipes", "flavor"].includes(activeTab)) return true;
  if (["beans", "roasters"].includes(activeTab)) return state.beansView !== "list";
  if (activeTab === "mine") return state.mineView === "buyingGuide";
  return false;
}

function defaultStagesForWater(waterValue) {
  const water = Number(waterValue) || DEFAULT_STAGES[DEFAULT_STAGES.length - 1].cumulativeWater;
  return DEFAULT_STAGES.map((stage, index) => ({
    ...stage,
    cumulativeWater: index === DEFAULT_STAGES.length - 1 ? water : stage.cumulativeWater
  }));
}

function sortPresetRecipes(recipes) {
  return recipes
    .map((recipe, index) => ({ recipe, index }))
    .sort((left, right) => {
      const leftName = String(left.recipe.name || "");
      const rightName = String(right.recipe.name || "");
      const leftIsChampion = leftName.includes("冠军");
      const rightIsChampion = rightName.includes("冠军");
      if (leftIsChampion !== rightIsChampion) return leftIsChampion ? 1 : -1;
      if (leftIsChampion) {
        const leftYearMatch = leftName.match(/(?:19|20)\d{2}/);
        const rightYearMatch = rightName.match(/(?:19|20)\d{2}/);
        const yearDifference = Number(rightYearMatch && rightYearMatch[0]) - Number(leftYearMatch && leftYearMatch[0]);
        if (yearDifference) return yearDifference;
      }
      return left.index - right.index;
    })
    .map((item) => item.recipe);
}

const ROAST_LEVELS = ["极浅烘", "浅烘", "浅中烘", "中烘", "中深烘", "深烘"];
const RATIO_VALUES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const RATIO_LABELS = RATIO_VALUES.map((value) => `1:${value}`);
const FLAVOR_SCORE_AXES = [
  { key: "dryAroma", label: "干香" },
  { key: "wetAroma", label: "湿香" },
  { key: "sweetness", label: "甜感" },
  { key: "acidity", label: "酸质" },
  { key: "aftertaste", label: "余韵" },
  { key: "body", label: "醇厚度" },
  { key: "balance", label: "平衡度" },
  { key: "cleanliness", label: "干净度" }
];
// Reuse the SCA flavor-family colors so statistics and the flavor dictionary
// read as one visual system.
const STATS_PIE_COLORS = FLAVOR_CATEGORY_OPTIONS.map((category) => category.color);
const EMPTY_STATS_OVERVIEW = {
  range: "day",
  rangeName: "今日",
  periodText: "",
  breakdownPeriodText: "",
  totalGrams: 0,
  totalGramsText: "0g",
  brewCount: 0,
  brewCountText: "0 次",
  averageDoseText: "-",
  showTrendChart: false,
  hasTrendData: false,
  trendTitle: "日消耗趋势",
  trendPeriodText: "",
  trendBars: [],
  deltaText: "",
  deltaTone: "",
  averageRatingText: "-",
  summaryText: "",
  breakdowns: { region: [], variety: [], process: [], roaster: [] },
  regionBreakdown: [],
  regionPieStyle: "",
  varietyBreakdown: [],
  varietyPieStyle: "",
  processBreakdown: [],
  processPieStyle: "",
  roasterBreakdown: [],
  roasterPieStyle: "",
  isEmpty: true
};
function freshBrewForm() {
  const temperature = "92";
  return {
    dose: "15",
    ratio: 15,
    water: "225",
    temperature,
    waterQuality: "",
    filterPaper: "",
    sieve: "",
    screenSize: "",
    grinder: "",
    grind: "",
    totalTime: "2:20",
    stages: defaultStagesForWater(225).map((stage, index) => ({
      ...stage,
      id: `stage-${index}`,
      temperature
    })),
    tds: "",
    extractionRate: "",
    rating: 0,
    flavorScores: freshFlavorScores(),
    bitterness: 3,
    body: 3,
    notes: ""
  };
}

function normalizeRating(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(5, Math.round(numeric * 10) / 10));
}

function normalizeFlavorScore(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(10, Math.round(numeric * 10) / 10));
}

function normalizeFlavorScores(scores, fallback = 0) {
  const source = scores && typeof scores === "object" ? scores : {};
  const legacyAliases = {
    dryAroma: ["dryAroma", "aroma"],
    wetAroma: ["wetAroma", "aroma"]
  };
  return FLAVOR_SCORE_AXES.reduce((result, axis) => {
    const keys = legacyAliases[axis.key] || [axis.key];
    const sourceKey = keys.find((key) => source[key] !== "" && source[key] !== null && source[key] !== undefined);
    result[axis.key] = normalizeFlavorScore(sourceKey ? source[sourceKey] : undefined, fallback);
    return result;
  }, {});
}

function freshFlavorScores() {
  return normalizeFlavorScores({}, 0);
}

function getRatingStarWidths(rating) {
  const normalized = normalizeRating(rating);
  return [1, 2, 3, 4, 5].map((star) => {
    const fill = Math.max(0, Math.min(1, normalized - (star - 1)));
    if (fill <= 0) return 0;
    if (fill >= 1) return 100;
    // Compensate for the star glyph's empty left side so tenths stay visibly proportional.
    return Math.round(6 + fill * 94);
  });
}

function getFlavorRadarGeometry(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.42;
  const axes = FLAVOR_SCORE_AXES.map((axis, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / FLAVOR_SCORE_AXES.length;
    return {
      ...axis,
      angle,
      unitX: Math.cos(angle),
      unitY: Math.sin(angle)
    };
  });
  return { centerX, centerY, radius, axes };
}

function getFlavorRadarPercentPoint(axisIndex, score) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * axisIndex) / FLAVOR_SCORE_AXES.length;
  const distance = 42 * (normalizeFlavorScore(score, 0) / 10);
  return {
    x: 50 + Math.cos(angle) * distance,
    y: 50 + Math.sin(angle) * distance
  };
}

function createFlavorRadarSegment(start, end, key) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return {
    key,
    style: `left:${start.x.toFixed(3)}%;top:${start.y.toFixed(3)}%;width:${Math.sqrt(dx * dx + dy * dy).toFixed(3)}%;transform:rotate(${Math.atan2(dy, dx).toFixed(6)}rad);`
  };
}

function buildFlavorRadarGridSegments() {
  const segments = [];
  for (let level = 2; level <= 10; level += 2) {
    const points = FLAVOR_SCORE_AXES.map((axis, index) => getFlavorRadarPercentPoint(index, level));
    points.forEach((point, index) => {
      segments.push(createFlavorRadarSegment(
        point,
        points[(index + 1) % points.length],
        `grid-${level}-${index}`
      ));
    });
  }
  return segments;
}

function buildFlavorRadarAxisSegments() {
  const center = { x: 50, y: 50 };
  return FLAVOR_SCORE_AXES.map((axis, index) => createFlavorRadarSegment(
    center,
    getFlavorRadarPercentPoint(index, 5),
    `axis-${axis.key}`
  ));
}

function buildFlavorRadarView(scores) {
  const normalized = normalizeFlavorScores(scores, 0);
  const points = FLAVOR_SCORE_AXES.map((axis, index) => ({
    key: axis.key,
    ...getFlavorRadarPercentPoint(index, normalized[axis.key])
  }));
  const polygon = points.map((point) => `${point.x.toFixed(3)}% ${point.y.toFixed(3)}%`).join(",");
  return {
    fillStyle: `-webkit-clip-path:polygon(${polygon});clip-path:polygon(${polygon});`,
    segments: points.map((point, index) => createFlavorRadarSegment(
      point,
      points[(index + 1) % points.length],
      `value-${index}`
    )),
    points: points.map((point) => ({
      key: point.key,
      style: `left:${point.x.toFixed(3)}%;top:${point.y.toFixed(3)}%;`
    }))
  };
}

function freshBeanForm() {
  return {
    name: "",
    roaster: "",
    country: "",
    origin: "",
    variety: "",
    process: "",
    flavorDescription: "",
    roastLevel: "",
    initialWeight: "",
    roastDate: getTodayDateString()
  };
}

function freshRecipeForm() {
  const temperature = "";
  return {
    name: "",
    roasterName: "",
    dripper: "",
    dose: "",
    water: "",
    ratio: "",
    temperature,
    waterQuality: "",
    filterPaper: "",
    grinder: "",
    grind: "",
    totalTime: "2:20",
    stages: defaultStagesForWater(225).map((stage, index) => ({
      ...stage,
      id: `recipe-stage-${index}`,
      temperature
    })),
    target: ""
  };
}

function recipeFormFromRecipe(recipe) {
  const source = normalizeRecipe(recipe || {});
  const stages = decorateStages(source.stages, source.temperature);
  return {
    ...freshRecipeForm(),
    name: source.name,
    roasterName: source.roasterName,
    dripper: source.dripper,
    dose: String(source.dose || ""),
    water: String(source.water || ""),
    ratio: source.ratio || "",
    temperature: source.temperature === "" ? "" : String(source.temperature),
    waterQuality: source.waterQuality,
    filterPaper: source.filterPaper,
    grinder: source.grinder,
    grind: source.grind,
    totalTime: source.totalTime,
    stages: source.water === "" ? stages : alignFinalStageWater(stages, source.water),
    target: source.target
  };
}

function beanFormFromRoasterBean(bean, fallbackRoasterName = "") {
  const source = bean && typeof bean === "object" ? bean : {};
  const flavorDescription = source.flavorText
    || (Array.isArray(source.flavorNotes) ? source.flavorNotes.filter(Boolean).join("、") : "")
    || source.summary
    || "";
  return {
    ...freshBeanForm(),
    name: String(source.name || ""),
    roaster: String(source.roaster || fallbackRoasterName || ""),
    country: String(source.country || ""),
    origin: String(source.origin || source.region || ""),
    variety: String(source.variety || ""),
    process: String(source.process || ""),
    flavorDescription: String(flavorDescription || ""),
    roastLevel: String(source.roastLevel || ""),
    initialWeight: "",
    roastDate: getTodayDateString()
  };
}

function normalizeBrewDraftForm(form) {
  const base = freshBrewForm();
  const next = form && typeof form === "object" ? form : {};
  const dose = String(next.dose || base.dose);
  const ratio = Number(next.ratio) || Number(base.ratio);
  const water = String(next.water || base.water);
  const temperature = next.temperature === "" ? "" : String(next.temperature || base.temperature);
  const stages = Array.isArray(next.stages) && next.stages.length
    ? decorateStages(next.stages, temperature)
    : defaultStagesForWater(Number(water) || Number(base.water)).map((stage, index) => ({
      ...stage,
      id: `stage-${index}`,
      temperature
    }));
  return {
    dose,
    ratio,
    water,
    temperature,
    waterQuality: String(next.waterQuality || ""),
    filterPaper: String(next.filterPaper || ""),
    sieve: String(next.sieve || ""),
    screenSize: String(next.screenSize || ""),
    grinder: String(next.grinder || ""),
    grind: String(next.grind || ""),
    totalTime: String(next.totalTime || base.totalTime),
    stages,
    tds: String(next.tds || ""),
    extractionRate: String(next.extractionRate || ""),
    rating: normalizeRating(next.rating),
    flavorScores: normalizeFlavorScores(
      next.flavorScores || next.tasting || {
        acidity: 6 - Number(next.bitterness || base.bitterness),
        bitterness: next.bitterness,
        body: next.body
      },
      0
    ),
    bitterness: Number(next.bitterness) || base.bitterness,
    body: Number(next.body) || base.body,
    notes: String(next.notes || "")
  };
}

function buildLogStages(stages, actualTotalSeconds) {
  const decoratedStages = decorateStages(stages);
  const plannedTotal = sum(decoratedStages.map((stage) => stage.duration));
  const actualTotal = Math.max(0, Math.round(Number(actualTotalSeconds) || 0));
  const finalEndTime = actualTotal || plannedTotal;
  return decoratedStages.map((stage, index) => {
    const endTime = index === decoratedStages.length - 1 && finalEndTime ? finalEndTime : stage.end;
    return {
      name: stage.name,
      water: stage.cumulativeWater,
      cumulativeWater: stage.cumulativeWater,
      temperature: stage.temperature,
      duration: stage.duration,
      time: formatDuration(stage.duration),
      endTime,
      endTimeText: formatTime(endTime)
    };
  });
}

Page({
  data: {
    tabs: [
      { key: "brew", label: "首页" },
      { key: "beans", label: "豆仓" },
      { key: "roasters", label: "寻豆指南" },
      { key: "mine", label: "我的" }
    ],
    brewSteps: [
      { key: "dripper", number: "01", label: "滤杯" },
      { key: "prepare", number: "02", label: "准备" },
      { key: "params", number: "03", label: "参数" },
      { key: "timer", number: "04", label: "冲煮" },
      { key: "taste", number: "05", label: "评价" }
    ],
    brewStepTitles: ["选择滤杯", "准备冲煮", "参数调整", "冲煮计时", "结果评价"],
    ratingOptions: [1, 2, 3, 4, 5],
    flavorScoreAxes: FLAVOR_SCORE_AXES,
    flavorRadarGridSegments: buildFlavorRadarGridSegments(),
    flavorRadarAxisSegments: buildFlavorRadarAxisSegments(),
    brewFlavorRadar: buildFlavorRadarView(freshFlavorScores()),
    logFlavorRadar: buildFlavorRadarView(normalizeFlavorScores({}, 0)),
    brewRatingStarWidths: [0, 0, 0, 0, 0],
    selectedLogEditRatingStarWidths: [0, 0, 0, 0, 0],
    roastLevels: ROAST_LEVELS,
    ratioLabels: RATIO_LABELS,
    activeTab: "brew",
    mineView: "profile",
    homeView: "dashboard",
    recipesReturnTarget: null,
    flavorView: "overview",
    flavorQuery: "",
    flavorCategories: getDecoratedSCAFlavorCategories(),
    flavorSearchResults: [],
    flavorActiveCategory: null,
    flavorActiveGroup: null,
    flavorActiveFlavor: null,
    customFlavors: [],
    flavorAddOpen: false,
    flavorAddForm: freshFlavorAddForm("fruity"),
    flavorAddGroups: getFlavorCategoryOption("fruity").groups,
    flavorAddStyle: getFlavorCategoryOption("fruity").cardStyle,
    flavorAddCanSave: false,
    brewHomeVisible: true,
    brewFlowActive: false,
    resumeBrewFlowOnHome: false,
    brewStep: 0,
    brewStepTitle: "选择滤杯",
    lockBrewScreen: false,
    secondaryPageActive: false,
    contentScrollY: true,
    contentScrollTop: 0,
    contentScrollIntoView: "",
    edgeBackActive: false,
    edgeBackPageStyle: "",
    edgeBackPreviewStyle: "",
    edgeBackShadeStyle: "",
    edgeBackPreview: {
      kind: "list",
      title: "",
      subtitle: "",
      hasBack: false,
      showTabs: false,
      real: false,
      tab: "brew",
      segmented: false,
      segmentLeft: "",
      segmentRight: "",
      scrollTop: 0,
      flavorView: "overview",
      flavorActiveGroup: null,
      brewStep: 0,
      items: []
    },
    parameterKeyboardHeight: 0,
    parameterKeyboardInset: 0,
    parameterInputCursor: -1,
    statusBarHeight: 20,
    navigationBarHeight: 44,
    menuSafeRight: 16,
    beanMode: "existing",
    beanShelfMode: "active",
    beanLibraryMode: "stock",
    beanStockMode: "active",
    selectedRoasterName: "",
    selectedRoasterBeanId: "",
    selectedRoasterBeanName: "",
    beansView: "list",
    beansTitle: "豆仓",
    beanAddReturnMode: "",
    recipesView: "list",
    recipesTitle: "自建方案",
    recipeLibraryMode: "custom",
    recipeQuickImportMode: false,
    recipeLibraryEmptyText: "还没有保存的自建方案，点右下角 + 新建一个。",
    dripperDeleteMode: false,
    showCustomDripperForm: false,
    overviewBeanPickerOpen: false,
    editingBeanId: "",
    editingRecipeId: "",
    customDripperName: "",
    drippers: DEFAULT_DRIPPERS,
    displayDrippers: [],
    beans: [],
    availableBeans: [],
    displayBeanCards: [],
    beanStockEmptyText: "",
    recipes: [],
    displayRecipes: [],
    selectedRecipeId: "",
    selectedRecipeDetail: null,
    brewRecipeSourceId: "",
    brewRecipeSourceName: "",
    displayRoasters: [],
    displayRoasterBeans: [],
    roasterBeanSearchQuery: "",
    roasterBeanFilters: freshRoasterBeanFilters(),
    roasterBeanFilterGroups: [],
    roasterBeanActiveFilterCount: 0,
    roasterBeanSearchFilterOpen: false,
    selectedRoasterBeanDetail: null,
    logs: [],
    displayLogs: [],
    logRenderLimit: LOG_LIST_INITIAL_RENDER_COUNT,
    logTotalCount: 0,
    logHasMore: false,
    logDateFilter: "",
    logDateFilterText: "全部日期",
    logCalendarOpen: false,
    logCalendarYear: new Date().getFullYear(),
    logCalendarMonth: new Date().getMonth() + 1,
    logCalendarTitle: formatLogCalendarMonth(new Date().getFullYear(), new Date().getMonth() + 1),
    logCalendarWeekdays: ["日", "一", "二", "三", "四", "五", "六"],
    logCalendarDays: [],
    logListEmptyTitle: "暂无冲煮记录",
    logListEmptyCopy: "开始你的第一次冲煮",
    activeLogActionId: "",
    logSwipeMovingId: "",
    logSwipeStyle: "",
    logSwipeTapLocked: false,
    activeRecipeActionId: "",
    recipeTouchStartX: 0,
    recipeTouchStartY: 0,
    recipeTouchStartOpen: false,
    recipeSwipeMovingId: "",
    recipeSwipeStyle: "",
    recipeSwipeTapLocked: false,
    selectedLogId: "",
    selectedLogDetail: null,
    selectedLogEditMode: false,
    selectedLogEditForm: {},
    statsRangeOptions: [
      { key: "day", label: "日" },
      { key: "week", label: "周" },
      { key: "month", label: "月" },
      { key: "year", label: "年" }
    ],
    statsRange: "day",
    statsBreakdownKey: "region",
    statsBreakdownTabs: [
      { key: "region", label: "地区" },
      { key: "variety", label: "品种" },
      { key: "process", label: "处理法" },
      { key: "roaster", label: "烘焙商" }
    ],
    statsAnchorDate: "",
    statsCalendarOpen: false,
    statsCalendarYear: new Date().getFullYear(),
    statsCalendarMonth: new Date().getMonth() + 1,
    statsCalendarTitle: formatLogCalendarMonth(new Date().getFullYear(), new Date().getMonth() + 1),
    statsCalendarPanelTitle: formatLogCalendarMonth(new Date().getFullYear(), new Date().getMonth() + 1),
    statsCalendarWeekdays: ["日", "一", "二", "三", "四", "五", "六"],
    statsCalendarMonths: [],
    statsCalendarYears: [],
    statsCalendarDays: [],
    statsOverview: EMPTY_STATS_OVERVIEW,
    selectedBeanId: "",
    expandedBeanId: "",
    expandedLogId: "",
    walletStickyTop: 0,
    logDetailMoreOpen: false,
    paramMoreOpen: false,
    recipeDetailMoreOpen: false,
    recipeFormMoreOpen: false,
    recentGrindPresets: [],
    stageActionIndex: -1,
    expandedPickerBeanId: "",
    expandedRecipeId: "",
    activeBeanActionId: "",
    beanTouchStartX: 0,
    beanTouchStartY: 0,
    beanTouchStartOpen: false,
    beanTouchActionWidth: BEAN_ACTION_WIDTH_ACTIVE,
    beanSwipeMovingId: "",
    beanSwipeStyle: "",
    beanSwipeTapLocked: false,
    selectedBeanCard: null,
    selectedDripper: "Hario V60",
    selectedDripperDisplay: { name: "Hario V60", iconType: "cone" },
    brewForm: freshBrewForm(),
    parameterSummary: {
      coffee: "15g",
      water: "225g",
      waterLabel: "注水量（92°C）",
      grinder: "未设置",
      brewTime: "2:20"
    },
    quickBeanForm: freshBeanForm(),
    beanForm: freshBeanForm(),
    beanOcrBusy: false,
    recipeForm: freshRecipeForm(),
    ratioDisplay: "1:15",
    ratioPickerIndex: RATIO_VALUES.indexOf(15),
    timerElapsed: 0,
    timerDisplay: "0:00",
    timerRunning: false,
    timerFinished: false,
    timerCountdown: 0,
    timerStageIndex: 0,
    timerStageName: DEFAULT_STAGES[0].name,
    timerStageRange: "0:00-0:30",
    timerStageProgress: 0,
    timerWater: 60,
    roasterCatalogStatus: "local",
    profileNickname: "",
    profileAvatarUrl: "/assets/icons/profile-user.png",
    buyingGuideAvatarImage: "",
    buyingGuideBackgroundImage: "",
    showDataManager: false,
    dataManagerView: "main",
    dataImportScope: "all",
    dataExportBusy: false,
    dataImportBusy: false,
    showPrivacyAgreement: false
  },

  onLoad() {
    const navigationMetrics = getNavigationMetrics();
    this.contentScrollOffset = 0;
    this.parameterViewportBottom = 0;
    try {
      const windowInfo = wx.getWindowInfo
        ? wx.getWindowInfo()
        : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {});
      this.parameterViewportBottom = Math.max(0, Number(windowInfo.windowHeight) || 0);
    } catch (error) {
      this.parameterViewportBottom = 0;
    }
    this.contentScrollPositions = Object.create(null);
    this.contentNavigationToken = 0;
    this.contentScrollRestoring = false;
    this.edgeBackGesture = null;
    this.edgeBackOwnsTouch = false;
    this.edgeBackCompleting = false;
    this.edgeBackAnimationTimer = null;
    this.beanTouchGesture = null;
    this.parameterEditSnapshot = null;
    this.tabPageStates = Object.create(null);
    this.roasterCatalogReturnScrollTop = 0;
    this.roasterBeansReturnScrollTop = 0;
    this.roastersPageScrollTop = 0;
    this.roastersPageState = null;
    this.failedRoasterLogos = Object.create(null);
    this.restoreRoasterImageCache();
    this.restoreRoasterCatalogCache();
    this.bootstrap(navigationMetrics);
    this.enableShareMenu();
    this.loadRoasterCatalog();
  },

  onResize() {
    if (!this.data.parameterKeyboardHeight) {
      try {
        const windowInfo = wx.getWindowInfo
          ? wx.getWindowInfo()
          : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {});
        this.parameterViewportBottom = Math.max(
          Number(this.parameterViewportBottom) || 0,
          Number(windowInfo.windowHeight) || 0
        );
      } catch (error) {
        // Keep the largest known full-height viewport as the keyboard baseline.
      }
    }
    this.updateNavigationMetrics();
  },

  onShow() {
    // A navigation/scroll callback can be suspended while the mini program is in
    // the background. Always release transient gesture and restore locks when the
    // records route becomes visible again so the shared scroll-view stays usable.
    this.contentScrollRestoring = false;
    this.edgeBackGesture = null;
    this.edgeBackOwnsTouch = false;
    this.edgeBackCompleting = false;
    if (this.edgeBackAnimationTimer) {
      clearTimeout(this.edgeBackAnimationTimer);
      this.edgeBackAnimationTimer = null;
    }
    if (this.data.edgeBackActive) {
      this.setData({
        edgeBackActive: false,
        edgeBackPageStyle: "",
        edgeBackPreviewStyle: "",
        edgeBackShadeStyle: ""
      }, () => this.refreshDerived());
    }
    this.beanTouchGesture = null;
    this.logTouchGesture = null;
    if (
      this.data.activeTab === "beans"
      && this.data.beansView === "list"
      && (this.data.beanSwipeMovingId || this.data.beanSwipeStyle || this.data.beanSwipeTapLocked)
    ) {
      this.setData({
        beanSwipeMovingId: "",
        beanSwipeStyle: "",
        beanSwipeTapLocked: false
      });
    }
    if (
      this.data.activeTab === "brew"
      && this.data.brewHomeVisible
      && this.data.homeView === "logs"
    ) {
      this.setData({
        contentScrollY: true,
        logSwipeMovingId: "",
        logSwipeStyle: "",
        logSwipeTapLocked: false
      });
    }
  },

  onShareAppMessage() {
    return {
      title: SHARE_TITLE,
      path: SHARE_PATH,
      imageUrl: SHARE_IMAGE_URL
    };
  },

  onShareTimeline() {
    return {
      title: SHARE_TITLE,
      query: SHARE_TIMELINE_QUERY,
      imageUrl: SHARE_TIMELINE_IMAGE_URL
    };
  },

  onHide() {
    // Invalidate a pending two-step scroll restoration. wx.nextTick callbacks may
    // otherwise resume after the app returns and overwrite the current page state.
    this.contentNavigationToken = (Number(this.contentNavigationToken) || 0) + 1;
    this.contentScrollRestoring = false;
    this.edgeBackGesture = null;
    this.edgeBackOwnsTouch = false;
    this.edgeBackCompleting = false;
    if (this.edgeBackAnimationTimer) {
      clearTimeout(this.edgeBackAnimationTimer);
      this.edgeBackAnimationTimer = null;
    }
    this.beanTouchGesture = null;
    this.logTouchGesture = null;
    const discardPatch = {};
    if (this.data.selectedLogEditMode) {
      Object.assign(discardPatch, {
        selectedLogId: "",
        selectedLogEditMode: false,
        selectedLogEditForm: {}
      });
    }
    if (this.data.editingBeanId) {
      Object.assign(discardPatch, {
        beansView: "list",
        editingBeanId: "",
        beanAddReturnMode: "",
        beanForm: freshBeanForm()
      });
    }
    if (this.data.editingRecipeId) {
      Object.assign(discardPatch, {
        recipesView: "list",
        editingRecipeId: "",
        selectedRecipeId: "",
        recipeForm: freshRecipeForm()
      });
    }
    if (Object.keys(discardPatch).length) {
      this.setData(discardPatch, () => this.refreshDerived());
    }
    this.stopTimer();
    this.persist();
  },

  onUnload() {
    this.contentNavigationToken = (Number(this.contentNavigationToken) || 0) + 1;
    this.contentScrollRestoring = false;
    this.edgeBackGesture = null;
    this.edgeBackOwnsTouch = false;
    if (this.edgeBackAnimationTimer) {
      clearTimeout(this.edgeBackAnimationTimer);
      this.edgeBackAnimationTimer = null;
    }
    if (this.roasterImageCacheFlushTimer) {
      clearTimeout(this.roasterImageCacheFlushTimer);
      this.roasterImageCacheFlushTimer = null;
      this.saveRoasterImageCache();
    }
    this.roasterImageCacheGeneration = (Number(this.roasterImageCacheGeneration) || 0) + 1;
    this.roasterImageDownloadQueue = [];
    this.roasterImageCacheInFlight = Object.create(null);
    this.roasterImageDownloadActive = 0;
    this.stopTimer();
    this.persist();
    if (this.startupPersistTimer) {
      clearTimeout(this.startupPersistTimer);
      this.startupPersistTimer = null;
    }
    if (this.stageEditorBlurTimer) {
      clearTimeout(this.stageEditorBlurTimer);
      this.stageEditorBlurTimer = null;
    }
    if (this.parameterInputRevealTimer) {
      clearTimeout(this.parameterInputRevealTimer);
      this.parameterInputRevealTimer = null;
    }
    if (this.parameterInputBlurTimer) {
      clearTimeout(this.parameterInputBlurTimer);
      this.parameterInputBlurTimer = null;
    }
    this.destroyDingAudio();
  },

  enableShareMenu() {
    if (!wx.showShareMenu) return;
    wx.showShareMenu({
      withShareTicket: true,
      menus: ["shareAppMessage", "shareTimeline"]
    });
  },

  restoreRoasterImageCache() {
    this.roasterImageCache = Object.create(null);
    try {
      const cached = wx.getStorageSync(ROASTER_IMAGE_CACHE_KEY);
      const entries = cached && cached.entries && typeof cached.entries === "object" ? cached.entries : {};
      const fileSystem = wx.getFileSystemManager ? wx.getFileSystemManager() : null;
      Object.keys(entries).forEach((id) => {
        const entry = entries[id];
        if (!entry || !entry.path || !entry.source) return;
        try {
          if (fileSystem && fileSystem.accessSync) fileSystem.accessSync(entry.path);
          this.roasterImageCache[id] = {
            path: String(entry.path),
            source: String(entry.source)
          };
        } catch (error) {
          // Ignore files removed by WeChat or the operating system.
        }
      });
      applyRoasterBeanImageCache(this.roasterImageCache);
    } catch (error) {
      console.warn("Roaster image cache read failed.", error);
    }
  },

  saveRoasterImageCache() {
    try {
      const entries = Object.keys(this.roasterImageCache || {}).reduce((result, id) => {
        const entry = this.roasterImageCache[id];
        if (entry && entry.path && entry.source && !entry.transient) {
          result[id] = {
            path: String(entry.path),
            source: String(entry.source)
          };
        }
        return result;
      }, {});
      wx.setStorageSync(ROASTER_IMAGE_CACHE_KEY, {
        version: 1,
        savedAt: Date.now(),
        entries
      });
    } catch (error) {
      console.warn("Roaster image cache write failed.", error);
    }
  },

  handleRoasterGuideImageLoad(event) {
    const id = String(event && event.currentTarget && event.currentTarget.dataset.id || "");
    const source = String(event && event.currentTarget && event.currentTarget.dataset.source || "");
    this.queueRoasterGuideImage({ id, source }, true);
  },

  queueRoasterGuideImages(items, prioritize = false) {
    const sourceItems = Array.isArray(items) ? items : [];
    const orderedItems = prioritize ? sourceItems.slice().reverse() : sourceItems;
    orderedItems.forEach((item) => {
      if (!item) return;
      this.queueRoasterGuideImage({
        id: item.id || item.logoCacheKey || item.imageCacheKey,
        source: item.cloudImage || item.logoCloudImage || item.imageCloudSource
      }, prioritize, true);
    });
    this.processRoasterGuideImageQueue();
  },

  queueRoasterGuideImage(item, prioritize = false, deferProcess = false) {
    const id = String(item && item.id || "");
    const source = String(item && item.source || "");
    if (!id || !source.startsWith("cloud://")) return;
    const existing = this.roasterImageCache && this.roasterImageCache[id];
    if (existing && existing.source === source && existing.path) return;
    if (!wx.cloud || !wx.cloud.downloadFile || !wx.getFileSystemManager) {
      if (!this.roasterImageCache) this.roasterImageCache = Object.create(null);
      this.roasterImageCache[id] = {
        path: source,
        source,
        transient: true
      };
      this.scheduleRoasterImageCacheFlush();
      return;
    }
    if (!this.roasterImageDownloadQueue) this.roasterImageDownloadQueue = [];
    if (!this.roasterImageCacheInFlight) this.roasterImageCacheInFlight = Object.create(null);
    const queuedIndex = this.roasterImageDownloadQueue.findIndex((queued) => queued.id === id);
    if (this.roasterImageCacheInFlight[id]) return;
    if (queuedIndex >= 0) {
      this.roasterImageDownloadQueue[queuedIndex].source = source;
      if (prioritize && queuedIndex > 0) {
        const queued = this.roasterImageDownloadQueue.splice(queuedIndex, 1)[0];
        this.roasterImageDownloadQueue.unshift(queued);
      }
      return;
    }
    const entry = { id, source };
    if (prioritize) {
      this.roasterImageDownloadQueue.unshift(entry);
    } else {
      this.roasterImageDownloadQueue.push(entry);
    }
    if (!deferProcess) this.processRoasterGuideImageQueue();
  },

  processRoasterGuideImageQueue() {
    if (!this.roasterImageDownloadQueue) this.roasterImageDownloadQueue = [];
    if (!this.roasterImageCacheInFlight) this.roasterImageCacheInFlight = Object.create(null);
    if (!Number.isFinite(this.roasterImageDownloadActive)) this.roasterImageDownloadActive = 0;
    while (
      this.roasterImageDownloadActive < ROASTER_IMAGE_DOWNLOAD_CONCURRENCY
      && this.roasterImageDownloadQueue.length
    ) {
      const entry = this.roasterImageDownloadQueue.shift();
      const existing = this.roasterImageCache && this.roasterImageCache[entry.id];
      if (existing && existing.source === entry.source && existing.path) continue;
      this.downloadRoasterGuideImage(entry);
    }
  },

  downloadRoasterGuideImage(entry) {
    const { id, source } = entry;
    const cacheGeneration = Number(this.roasterImageCacheGeneration) || 0;
    this.roasterImageCacheInFlight[id] = true;
    this.roasterImageDownloadActive = (Number(this.roasterImageDownloadActive) || 0) + 1;
    const finish = () => {
      if (cacheGeneration !== (Number(this.roasterImageCacheGeneration) || 0)) return;
      delete this.roasterImageCacheInFlight[id];
      this.roasterImageDownloadActive = Math.max(0, (Number(this.roasterImageDownloadActive) || 0) - 1);
      this.processRoasterGuideImageQueue();
    };
    const useCloudFallback = () => {
      if (cacheGeneration !== (Number(this.roasterImageCacheGeneration) || 0)) return;
      if (!this.roasterImageCache) this.roasterImageCache = Object.create(null);
      this.roasterImageCache[id] = {
        path: source,
        source,
        transient: true
      };
      this.scheduleRoasterImageCacheFlush();
    };
    try {
      wx.cloud.downloadFile({
        fileID: source,
        success: (downloadResult) => {
          const tempFilePath = downloadResult && downloadResult.tempFilePath;
          if (!tempFilePath) {
            useCloudFallback();
            finish();
            return;
          }
          try {
            wx.getFileSystemManager().saveFile({
              tempFilePath,
              success: (saveResult) => {
                const savedFilePath = saveResult && saveResult.savedFilePath;
                if (!savedFilePath) {
                  useCloudFallback();
                  return;
                }
                if (cacheGeneration !== (Number(this.roasterImageCacheGeneration) || 0)) {
                  if (wx.getFileSystemManager().removeSavedFile) {
                    wx.getFileSystemManager().removeSavedFile({ filePath: savedFilePath });
                  }
                  return;
                }
                if (!this.roasterImageCache) this.roasterImageCache = Object.create(null);
                const previous = this.roasterImageCache[id];
                this.roasterImageCache[id] = { path: savedFilePath, source };
                if (
                  previous
                  && previous.path
                  && previous.path !== savedFilePath
                  && !String(previous.path).startsWith("cloud://")
                  && wx.getFileSystemManager().removeSavedFile
                ) {
                  wx.getFileSystemManager().removeSavedFile({ filePath: previous.path });
                }
                this.scheduleRoasterImageCacheFlush();
              },
              fail: useCloudFallback,
              complete: finish
            });
          } catch (error) {
            useCloudFallback();
            finish();
          }
        },
        fail: () => {
          useCloudFallback();
          finish();
        }
      });
    } catch (error) {
      useCloudFallback();
      finish();
    }
  },

  scheduleRoasterImageCacheFlush() {
    if (this.roasterImageCacheFlushTimer) return;
    this.roasterImageCacheFlushTimer = setTimeout(() => {
      this.roasterImageCacheFlushTimer = null;
      this.saveRoasterImageCache();
      applyRoasterBeanImageCache(this.roasterImageCache);
      if (this.data.activeTab === "mine" && this.data.mineView === "buyingGuide") {
        this.setData(this.getBuyingGuideImagePatch());
      }
      if (["roasters", "brew"].includes(this.data.activeTab)) this.refreshDerived();
    }, ROASTER_IMAGE_CACHE_FLUSH_DELAY);
  },

  getBuyingGuideImagePatch() {
    const cache = this.roasterImageCache || {};
    const avatar = cache[BUYING_GUIDE_AVATAR_CACHE_ID];
    const background = cache[BUYING_GUIDE_BACKGROUND_CACHE_ID];
    return {
      buyingGuideAvatarImage: avatar && avatar.source === BUYING_GUIDE_AVATAR_IMAGE
        ? avatar.path
        : "",
      buyingGuideBackgroundImage: background && background.source === BUYING_GUIDE_BACKGROUND_IMAGE
        ? background.path
        : ""
    };
  },

  queueBuyingGuideImages() {
    this.queueRoasterGuideImages([
      {
        id: BUYING_GUIDE_BACKGROUND_CACHE_ID,
        cloudImage: BUYING_GUIDE_BACKGROUND_IMAGE
      },
      {
        id: BUYING_GUIDE_AVATAR_CACHE_ID,
        cloudImage: BUYING_GUIDE_AVATAR_IMAGE
      }
    ], true);
  },

  restoreRoasterCatalogCache() {
    try {
      const cached = wx.getStorageSync(ROASTER_CATALOG_CACHE_KEY);
      if (!cached || !Array.isArray(cached.beans) || !applyCloudRoasterBeans(cached.beans)) return;
      this.roasterCatalogHasCache = true;
      this.roasterCatalogLastRefreshAt = Number(cached.savedAt) || 0;
      this.setData({ roasterCatalogStatus: "cache" });
    } catch (error) {
      console.warn("Roaster catalog cache read failed.", error);
    }
  },

  saveRoasterCatalogCache(beans) {
    try {
      wx.setStorageSync(ROASTER_CATALOG_CACHE_KEY, {
        version: 1,
        savedAt: Date.now(),
        beans
      });
      this.roasterCatalogHasCache = true;
    } catch (error) {
      console.warn("Roaster catalog cache write failed.", error);
    }
  },

  loadRoasterCatalog(options = {}) {
    const force = Boolean(options.force);
    const lastRefreshAt = Number(this.roasterCatalogLastRefreshAt) || 0;
    if (!force && Date.now() - lastRefreshAt < ROASTER_CATALOG_REFRESH_INTERVAL) return;
    if (!wx.cloud || !wx.cloud.callFunction || this.roasterCatalogLoading) return;
    this.roasterCatalogLoading = true;
    const cacheGeneration = Number(this.roasterCatalogCacheGeneration) || 0;
    wx.cloud.callFunction({
      name: ROASTER_CATALOG_FUNCTION,
      data: { action: "list" }
    }).then(({ result }) => {
      if (cacheGeneration !== (Number(this.roasterCatalogCacheGeneration) || 0)) return;
      if (!result || !result.ok || !Array.isArray(result.beans)) {
        throw new Error((result && result.message) || "云端豆单读取失败");
      }
      if (!applyCloudRoasterBeans(result.beans)) throw new Error("云端豆单格式错误");
      this.roasterCatalogLastRefreshAt = Date.now();
      this.saveRoasterCatalogCache(result.beans);
      this.setData({ roasterCatalogStatus: "cloud" });
      this.refreshDerived();
    }).catch((error) => {
      console.warn("Roaster catalog cloud load failed; using bundled fallback.", error);
      this.setData({ roasterCatalogStatus: this.roasterCatalogHasCache ? "cache" : "local" });
    }).finally(() => {
      this.roasterCatalogLoading = false;
    });
  },

  updateNavigationMetrics() {
    this.setData(getNavigationMetrics());
  },

  openPrivacyContract() {
    this.setData({ showPrivacyAgreement: true });
  },

  closePrivacyContract() {
    this.setData({ showPrivacyAgreement: false });
  },

  openBeanBuyingGuide() {
    this.navigateWithContentScroll({
      mineView: "buyingGuide",
      ...this.getBuyingGuideImagePatch()
    }, { scrollTop: 0 }, () => {
      this.refreshDerived();
      this.queueBuyingGuideImages();
    });
  },

  closeBeanBuyingGuide() {
    this.navigateWithContentScroll({ mineView: "profile" }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  openServiceAgreement() {
    wx.showModal({
      title: "服务协议",
      content: "Pour Notes 用于记录和管理个人咖啡冲煮数据。请妥善保管本机数据，并确保录入内容真实、合法。继续使用即表示你同意遵守本服务协议。",
      showCancel: false,
      confirmText: "我知道了",
      confirmColor: "#b88222"
    });
  },

  showComingSoon() {
    this.toast("功能待开发中");
  },

  openFlavorPage() {
    const shouldResumeBrewFlow = this.data.brewFlowActive || this.data.brewHomeVisible === false;
    this.navigateWithContentScroll({
      activeTab: "flavor",
      homeView: "dashboard",
      resumeBrewFlowOnHome: shouldResumeBrewFlow,
      flavorView: "overview",
      flavorQuery: "",
      flavorSearchResults: [],
      flavorActiveCategory: null,
      flavorActiveGroup: null,
      flavorActiveFlavor: null,
      flavorAddOpen: false
    }, { scrollTop: 0 });
  },

  flavorHeaderBack() {
    this.setData({ flavorActiveFlavor: null }, () => this.returnHome());
  },

  flavorGoBack() {
    if (this.data.flavorView === "group") {
      this.navigateWithContentScroll({
        flavorView: "category",
        flavorActiveGroup: null,
        flavorQuery: "",
        flavorSearchResults: []
      }, { scrollTop: 0 });
      return;
    }
    if (this.data.flavorView === "category") {
      this.navigateWithContentScroll({
        flavorView: "overview",
        flavorActiveCategory: null,
        flavorActiveGroup: null,
        flavorQuery: "",
        flavorSearchResults: []
      }, { scrollTop: 0 });
      return;
    }
    this.returnHome();
  },

  openFlavorCategory(event) {
    const id = event.currentTarget.dataset.id;
    const flavorActiveCategory = this.data.flavorCategories.find((category) => category.id === id);
    if (!flavorActiveCategory) return;
    this.navigateWithContentScroll({
      flavorView: "category",
      flavorActiveCategory,
      flavorActiveGroup: null,
      flavorQuery: "",
      flavorSearchResults: []
    }, { scrollTop: 0 });
  },

  openFlavorGroup(event) {
    const index = Number(event.currentTarget.dataset.index);
    const activeCategory = this.data.flavorActiveCategory;
    const flavorActiveGroup = activeCategory && activeCategory.groups[index];
    if (!flavorActiveGroup) return;
    this.navigateWithContentScroll({
      flavorView: "group",
      flavorActiveGroup,
      flavorActiveFlavor: null,
      flavorQuery: "",
      flavorSearchResults: []
    }, { scrollTop: 0 });
  },

  openFlavorDetail(event) {
    const index = Number(event.currentTarget.dataset.index);
    const category = this.data.flavorActiveCategory;
    const group = this.data.flavorActiveGroup;
    const flavor = group && group.flavors[index];
    if (!category || !group || !flavor) return;
    this.setData({
      flavorActiveFlavor: {
        ...flavor,
        groupName: group.name,
        groupEnglish: group.english,
        categoryName: category.name,
        color: category.color,
        softColor: category.softColor,
        detailStyle: `--accent:${category.color};--soft:${category.softColor};`,
        description: flavor.description
      }
    });
  },

  closeFlavorDetail() {
    this.setData({ flavorActiveFlavor: null });
  },

  onFlavorSearchInput(event) {
    const flavorQuery = String(event.detail.value || "").trim().toLowerCase();
    if (!flavorQuery) {
      this.setData({ flavorQuery: "", flavorSearchResults: [] });
      return;
    }
    const flavorSearchResults = [];
    this.data.flavorCategories.forEach((category) => {
      category.groups.forEach((group) => {
        group.flavors.forEach((flavor) => {
          const haystack = [category.name, category.english, group.name, group.english, flavor.name, flavor.english]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(flavorQuery)) return;
          flavorSearchResults.push({
            ...flavor,
            categoryId: category.id,
            categoryName: category.name,
            groupName: group.name,
            resultStyle: `--accent:${category.color};`
          });
        });
      });
    });
    this.setData({ flavorQuery, flavorSearchResults });
  },

  clearFlavorSearch() {
    this.setData({ flavorQuery: "", flavorSearchResults: [] });
  },

  openFlavorSearchResult(event) {
    const id = event.currentTarget.dataset.id;
    const flavorActiveCategory = this.data.flavorCategories.find((category) => category.id === id);
    if (!flavorActiveCategory) return;
    this.navigateWithContentScroll({
      flavorView: "category",
      flavorActiveCategory,
      flavorActiveGroup: null,
      flavorQuery: "",
      flavorSearchResults: []
    }, { scrollTop: 0 });
  },

  startFlavorRecord() {
    const categoryId = this.data.flavorActiveCategory && this.data.flavorActiveCategory.id
      ? this.data.flavorActiveCategory.id
      : "fruity";
    const groupEnglish = this.data.flavorActiveGroup && this.data.flavorActiveGroup.english
      ? this.data.flavorActiveGroup.english
      : "";
    const flavorAddForm = freshFlavorAddForm(categoryId, groupEnglish);
    const category = getFlavorCategoryOption(flavorAddForm.categoryId);
    this.setData({
      flavorAddOpen: true,
      flavorAddForm,
      flavorAddGroups: category ? category.groups : [],
      flavorAddStyle: category ? category.cardStyle : "",
      flavorAddCanSave: false,
      flavorActiveFlavor: null
    });
  },

  cancelFlavorAdd() {
    this.setData({ flavorAddOpen: false });
  },

  selectFlavorAddCategory(event) {
    const category = getFlavorCategoryOption(String(event.currentTarget.dataset.id || ""));
    if (!category) return;
    this.setData({
      "flavorAddForm.categoryId": category.id,
      "flavorAddForm.groupEnglish": category.groups[0] ? category.groups[0].english : "",
      flavorAddGroups: category.groups,
      flavorAddStyle: category.cardStyle
    });
  },

  selectFlavorAddGroup(event) {
    const groupEnglish = String(event.currentTarget.dataset.english || "");
    if (!this.data.flavorAddGroups.some((group) => group.english === groupEnglish)) return;
    this.setData({ "flavorAddForm.groupEnglish": groupEnglish });
  },

  onFlavorAddInput(event) {
    const field = String(event.currentTarget.dataset.field || "");
    if (!["name", "english", "description"].includes(field)) return;
    const maxLength = field === "name" ? 24 : (field === "english" ? 48 : 180);
    const value = String(event.detail.value || "").slice(0, maxLength);
    const flavorAddForm = { ...this.data.flavorAddForm, [field]: value };
    this.setData({
      flavorAddForm,
      flavorAddCanSave: Boolean(flavorAddForm.name.trim() && flavorAddForm.description.trim())
    });
  },

  saveFlavorAdd() {
    const form = this.data.flavorAddForm;
    if (!form.name.trim()) {
      this.toast("请填写风味名称");
      return;
    }
    if (!form.description.trim()) {
      this.toast("请填写风味描述");
      return;
    }
    const duplicate = this.data.customFlavors.some((flavor) => (
      flavor.categoryId === form.categoryId &&
      flavor.groupEnglish === form.groupEnglish &&
      flavor.name.toLowerCase() === form.name.trim().toLowerCase()
    ));
    if (duplicate) {
      this.toast("该族群中已有同名风味");
      return;
    }
    const customFlavor = normalizeCustomFlavor({
      ...form,
      id: newId("flavor"),
      createdAt: new Date().toISOString()
    });
    if (!customFlavor) {
      this.toast("风味信息不完整");
      return;
    }
    const customFlavors = this.data.customFlavors.concat(customFlavor);
    const flavorCategories = getDecoratedSCAFlavorCategories(customFlavors);
    const flavorActiveCategory = flavorCategories.find((category) => category.id === customFlavor.categoryId);
    const flavorActiveGroup = flavorActiveCategory && flavorActiveCategory.groups.find(
      (group) => group.english === customFlavor.groupEnglish
    );
    this.setData({
      customFlavors,
      flavorCategories,
      flavorView: "group",
      flavorActiveCategory: flavorActiveCategory || null,
      flavorActiveGroup: flavorActiveGroup || null,
      flavorActiveFlavor: null,
      flavorQuery: "",
      flavorSearchResults: [],
      flavorAddOpen: false,
      flavorAddCanSave: false
    }, () => {
      this.persist();
      this.toast("风味已添加");
    });
  },

  bootstrap(initialPatch = {}) {
    const stored = loadStoredState();
    const saved = stored.state;
    const runtimeVersion = getRuntimeVersion();
    this.storageWriteEnabled = stored.canPersist;
    this.storageSnapshot = saved;
    this.storageRuntimeVersion = runtimeVersion;
    this.storageNeedsVersionBackup = stored.found && (
      Number(saved.version) !== STORAGE_SCHEMA_VERSION ||
      Boolean(runtimeVersion && saved.appVersion !== runtimeVersion)
    );

    const beans = getStoredCollection(saved, "beans").map(normalizeBean);
    const recipes = getStoredCollection(saved, "recipes")
      .map(normalizeRecipe)
      .filter((recipe) => recipe.sourceType !== "roaster");
    const logs = getStoredCollection(saved, "logs").map(normalizeLog);
    const customFlavors = getStoredCollection(saved, "customFlavors")
      .map(normalizeCustomFlavor)
      .filter(Boolean);
    const flavorCategories = getDecoratedSCAFlavorCategories(customFlavors);
    const profile = normalizeProfile(saved.profile);
    const drippers = mergeUnique(DEFAULT_DRIPPERS, Array.isArray(saved.drippers) ? saved.drippers : []);
    const selectedBeanId = beans.some((bean) => bean.id === saved.selectedBeanId)
      ? saved.selectedBeanId
      : "";
    const selectedDripper = drippers.includes(saved.selectedDripper) ? saved.selectedDripper : drippers[0];

    this.setData({
      ...initialPatch,
      drippers,
      beans,
      recipes,
      logs,
      customFlavors,
      flavorCategories,
      flavorAddOpen: false,
      profileNickname: profile.nickname,
      profileAvatarUrl: profile.avatarUrl,
      selectedBeanId,
      selectedDripper
    });
    this.refreshDerived({
      skipCollectionNormalize: true,
      skipCollectionPatch: true
    });
    this.scheduleStartupPersist();
    if (!stored.canPersist) {
      this.toast("本地缓存读取异常，已暂停覆盖以保护原数据");
    } else if (stored.recoveredFromBackup) {
      this.toast("已从上一版本备份恢复本地数据");
    }
  },

  scheduleStartupPersist() {
    if (this.startupPersistTimer) clearTimeout(this.startupPersistTimer);
    this.startupPersistTimer = setTimeout(() => {
      this.startupPersistTimer = null;
      this.persist();
    }, 200);
  },

  persist() {
    if (this.startupPersistTimer) {
      clearTimeout(this.startupPersistTimer);
      this.startupPersistTimer = null;
    }
    if (this.storageWriteEnabled === false) return;
    const previous = isStoredState(this.storageSnapshot) ? this.storageSnapshot : {};
    const next = this.buildStoredState(previous);
    try {
      if (this.storageNeedsVersionBackup && isStoredState(previous)) {
        wx.setStorageSync(STORAGE_BACKUP_KEY, previous);
      }
      wx.setStorageSync(STORAGE_KEY, next);
      this.storageSnapshot = next;
      this.storageNeedsVersionBackup = false;
    } catch (error) {
      this.storageWriteEnabled = false;
      this.toast("本地缓存保存失败，已停止写入以避免覆盖原数据");
    }
  },

  buildStoredState(previousState = {}) {
    const previous = previousState && typeof previousState === "object" ? previousState : {};
    return {
      ...previous,
      version: STORAGE_SCHEMA_VERSION,
      appVersion: this.storageRuntimeVersion || previous.appVersion || "",
      drippers: this.data.drippers,
      beans: this.data.beans.map(normalizeBean),
      recipes: this.data.recipes.filter((recipe) => recipe.sourceType !== "roaster").map(normalizeRecipe),
      logs: this.data.logs.map(normalizeLog),
      customFlavors: this.data.customFlavors.map(normalizeCustomFlavor).filter(Boolean),
      selectedBeanId: this.data.selectedBeanId,
      selectedDripper: this.data.selectedDripper,
      profile: normalizeProfile({
        nickname: this.data.profileNickname,
        avatarUrl: this.data.profileAvatarUrl
      }),
      updatedAt: new Date().toISOString()
    };
  },

  handleChooseAvatar(event) {
    const avatarUrl = event && event.detail && event.detail.avatarUrl;
    if (!avatarUrl) return;
    const applyAvatar = (nextUrl) => {
      this.setData({ profileAvatarUrl: nextUrl || avatarUrl }, () => {
        this.persist();
      });
    };
    if (!wx.getFileSystemManager) {
      applyAvatar(avatarUrl);
      return;
    }
    try {
      wx.getFileSystemManager().saveFile({
        tempFilePath: avatarUrl,
        success: (result) => applyAvatar(result.savedFilePath || avatarUrl),
        fail: () => applyAvatar(avatarUrl)
      });
    } catch (error) {
      applyAvatar(avatarUrl);
    }
  },

  handleNicknameChange(event) {
    const nickname = String(event && event.detail && event.detail.value || "").trim().slice(0, 24);
    if (nickname === this.data.profileNickname) return;
    this.setData({ profileNickname: nickname }, () => this.persist());
  },

  refreshDerived(options = {}) {
    const skipCollectionNormalize = Boolean(options.skipCollectionNormalize);
    const beans = skipCollectionNormalize ? this.data.beans : this.data.beans.map(normalizeBean);
    const recipes = skipCollectionNormalize ? this.data.recipes : this.data.recipes.map(normalizeRecipe);
    const logs = skipCollectionNormalize ? this.data.logs : this.data.logs.map(normalizeLog);
    const selectedBeanId = beans.some((bean) => bean.id === this.data.selectedBeanId && (Number(bean.remainingWeight) || 0) > 0)
      ? this.data.selectedBeanId
      : "";
    const shouldBuildBeanCards = this.data.activeTab === "beans";
    const shouldBuildBrewBeanViews = this.data.activeTab === "brew" && !this.data.brewHomeVisible;
    const shouldBuildBeanDisplays = shouldBuildBeanCards || shouldBuildBrewBeanViews;
    const displayBeans = shouldBuildBeanDisplays ? beans.map((bean) => decorateBean(bean)) : [];
    const availableBeans = shouldBuildBrewBeanViews ? withDistinctCardArt(displayBeans.filter((bean) => !bean.isEmpty)) : [];
    const beanLibraryMode = this.data.beanLibraryMode === "roaster" ? "roaster" : "stock";
    const beanStockMode = this.data.beanStockMode === "empty" ? "empty" : "active";
    const beanShelfMode = beanLibraryMode === "roaster" ? "roaster" : beanStockMode;
    const displayBeanCards = shouldBuildBeanCards
      ? withDistinctCardArt(displayBeans.filter((bean) => beanStockMode === "empty" ? bean.isEmpty : !bean.isEmpty))
      : [];
    const beanStockEmptyText = beanStockMode === "empty"
      ? "还没有空袋豆子。豆子余量用完后，会自动进入这里。"
      : "还没有在库豆子，点右下角 + 添加第一包。";
    const activeBeanActionId = shouldBuildBeanCards && displayBeanCards.some((bean) => bean.id === this.data.activeBeanActionId)
      ? this.data.activeBeanActionId
      : "";
    const pickerWalletOpenId = [this.data.expandedPickerBeanId, selectedBeanId]
      .find((id) => id && availableBeans.some((bean) => bean.id === id))
      || (availableBeans.length ? availableBeans[availableBeans.length - 1].id : "");
    const selectedBeanCard = shouldBuildBrewBeanViews
      ? displayBeans.find((bean) => bean.id === selectedBeanId) || null
      : null;
    const expandedBeanId = beans.some((bean) => bean.id === this.data.expandedBeanId)
      ? this.data.expandedBeanId
      : "";
    const beanWalletOpenId = expandedBeanId && displayBeanCards.some((bean) => bean.id === expandedBeanId)
      ? expandedBeanId
      : (displayBeanCards.length ? displayBeanCards[displayBeanCards.length - 1].id : "");
    const shouldLoadRoasterBeans = this.data.activeTab === "roasters";
    const roasters = shouldLoadRoasterBeans ? getRoasters(this.roasterImageCache) : [];
    const selectedRoasterName = shouldLoadRoasterBeans
      ? (roasters.some((roaster) => roaster.name === this.data.selectedRoasterName) ? this.data.selectedRoasterName : "")
      : this.data.selectedRoasterName;
    const roasterBeans = shouldLoadRoasterBeans ? getRoasterBeans(selectedRoasterName) : [];
    const roasterBeanFilters = shouldLoadRoasterBeans
      ? normalizeRoasterBeanFilters(roasterBeans, this.data.roasterBeanFilters)
      : this.data.roasterBeanFilters;
    const roasterBeanFilterGroups = shouldLoadRoasterBeans
      ? buildRoasterBeanFilterGroups(roasterBeans, roasterBeanFilters)
      : this.data.roasterBeanFilterGroups;
    const roasterBeanActiveFilterCount = shouldLoadRoasterBeans
      ? countRoasterBeanFilters(roasterBeanFilters)
      : this.data.roasterBeanActiveFilterCount;
    const displayRoasterBeans = shouldLoadRoasterBeans
      ? filterRoasterBeans(
        roasterBeans,
        this.data.roasterBeanSearchQuery,
        roasterBeanFilters
      )
      : [];
    const selectedRoasterBean = shouldLoadRoasterBeans
      ? roasterBeans.find((bean) => bean.id === this.data.selectedRoasterBeanId) || null
      : null;
    const selectedRoasterBeanId = shouldLoadRoasterBeans
      ? (selectedRoasterBean ? selectedRoasterBean.id : "")
      : this.data.selectedRoasterBeanId;
    const selectedRoasterBeanName = shouldLoadRoasterBeans
      ? (selectedRoasterBean ? selectedRoasterBean.name : "")
      : this.data.selectedRoasterBeanName;
    const selectedRoasterBeanDetail = buildRoasterBeanDetailView(selectedRoasterBean);
    const displayDrippers = shouldBuildBrewBeanViews
      ? decorateDrippers(this.data.drippers, this.roasterImageCache)
      : [];
    const selectedDripperDisplay = shouldBuildBrewBeanViews && this.data.selectedDripper
      ? decorateDrippers([this.data.selectedDripper], this.roasterImageCache)[0]
      : this.data.selectedDripperDisplay;
    const parameterSummary = getParameterSummary(this.data.brewForm);
    const recipeLibraryMode = this.data.recipeLibraryMode === "preset" ? "preset" : "custom";
    const shouldBuildRecipeDisplays = this.data.activeTab === "recipes";
    const customRecipeDisplays = shouldBuildRecipeDisplays
      ? recipes
        .filter((recipe) => !["roaster", "preset"].includes(recipe.sourceType))
        .map(decorateRecipe)
      : [];
    const presetRecipeDisplays = shouldBuildRecipeDisplays && (recipeLibraryMode === "preset" || isPresetRecipeId(this.data.selectedRecipeId))
      ? getPresetRecipeDisplays()
      : [];
    const displayRecipes = shouldBuildRecipeDisplays
      ? withDistinctCardArt((recipeLibraryMode === "preset" ? presetRecipeDisplays : customRecipeDisplays).map((recipe) => ({
        ...recipe,
        artSeed: recipe.id,
        cardArtStyle: buildBeanCardArtStyle(recipe.id),
        walletSubtitleText: joinBeanCardParts([
          recipe.dripperText === "/" ? "" : recipe.dripperText,
          recipe.dose ? `${recipe.dose}g` : "",
          recipe.totalTimeText
        ])
      })))
      : [];
    const recipeWalletOpenId = [
      this.data.expandedRecipeId,
      this.data.recipeQuickImportMode ? this.data.brewRecipeSourceId : ""
    ].find((id) => id && displayRecipes.some((recipe) => recipe.id === id))
      || (displayRecipes.length ? displayRecipes[0].id : "");
    const selectedRecipeDetail = shouldBuildRecipeDisplays
      ? [...customRecipeDisplays, ...presetRecipeDisplays].find((recipe) => recipe.id === this.data.selectedRecipeId) || null
      : null;
    const selectedRecipeId = shouldBuildRecipeDisplays
      ? (selectedRecipeDetail ? selectedRecipeDetail.id : "")
      : this.data.selectedRecipeId;
    const activeRecipeActionId = shouldBuildRecipeDisplays && displayRecipes.some((recipe) => recipe.id === this.data.activeRecipeActionId)
      ? this.data.activeRecipeActionId
      : "";
    const failedRoasterLogos = this.failedRoasterLogos || {};
    const displayRoasters = shouldLoadRoasterBeans
      ? roasters.map((roaster) => ({
          ...roaster,
          logoImage: failedRoasterLogos[roaster.name] ? "" : roaster.logoImage
        }))
      : [];
    const shouldBuildLogViews = this.data.activeTab === "brew"
      && this.data.brewHomeVisible
      && this.data.homeView === "logs";
    const shouldBuildStats = this.data.activeTab === "stats";
    const shouldIndexLogBeans = shouldBuildLogViews || shouldBuildStats;
    const beansById = shouldIndexLogBeans
      ? beans.reduce((result, bean) => {
        result[bean.id] = bean;
        return result;
      }, {})
      : {};
    const logDateFilter = shouldBuildLogViews ? normalizeLogDateFilter(this.data.logDateFilter) : this.data.logDateFilter;
    const filteredLogSources = shouldBuildLogViews
      ? logs.filter((log) => (
        !logDateFilter || getLogDateKey(log.createdAt) === logDateFilter
      ))
      : [];
    const logRenderLimit = shouldBuildLogViews
      ? Math.max(LOG_LIST_INITIAL_RENDER_COUNT, Number(this.data.logRenderLimit) || 0)
      : this.data.logRenderLimit;
    // Record cards only use summary fields. Decorate the visible batch rather than
    // every saved log, since full decoration also builds charts and detail rows.
    const displayLogs = shouldBuildLogViews
      ? filteredLogSources
        .slice(0, logRenderLimit)
        .map((log) => decorateLogCard(log, beansById[log.beanId]))
      : [];
    const displayLogCards = withDistinctCardArt(displayLogs);
    const logTotalCount = shouldBuildLogViews ? filteredLogSources.length : this.data.logTotalCount;
    const logWalletOpenId = displayLogs.some((log) => log.id === this.data.expandedLogId)
      ? this.data.expandedLogId
      : (displayLogs.length ? displayLogs[0].id : "");
    const logHasMore = shouldBuildLogViews ? displayLogs.length < logTotalCount : false;
    const calendarView = shouldBuildLogViews
      ? normalizeLogCalendarView(
        this.data.logCalendarYear,
        this.data.logCalendarMonth,
        logDateFilter
      )
      : { year: this.data.logCalendarYear, month: this.data.logCalendarMonth };
    const logCalendarDays = shouldBuildLogViews
      ? buildLogCalendarDays(
        calendarView.year,
        calendarView.month,
        logDateFilter,
        logs
      )
      : this.data.logCalendarDays;
    const activeLogActionId = shouldBuildLogViews && displayLogs.some((log) => log.id === this.data.activeLogActionId)
      ? this.data.activeLogActionId
      : "";
    const selectedLogId = shouldBuildLogViews
      ? (logs.some((log) => log.id === this.data.selectedLogId) ? this.data.selectedLogId : "")
      : this.data.selectedLogId;
    const selectedLogSource = shouldBuildLogViews
      ? logs.find((log) => log.id === selectedLogId) || null
      : null;
    const selectedLogDetail = selectedLogSource
      ? decorateLog(selectedLogSource, beansById[selectedLogSource.beanId])
      : null;
    const selectedLogEditMode = selectedLogDetail ? this.data.selectedLogEditMode : false;
    const logFlavorRadarScores = selectedLogEditMode
      ? this.data.selectedLogEditForm && this.data.selectedLogEditForm.flavorScores
      : selectedLogDetail && selectedLogDetail.flavorScores;
    const statsOverview = shouldBuildStats
      ? buildStatsOverview(
        logs,
        this.data.statsRange,
        beansById,
        this.data.statsAnchorDate
      )
      : this.data.statsOverview;
    const statsCalendarSelectedDate = shouldBuildStats
      ? getLogDateKey(parseStatsDate(this.data.statsAnchorDate) || new Date())
      : "";
    const statsCalendarView = shouldBuildStats
      ? normalizeLogCalendarView(
        this.data.statsCalendarYear,
        this.data.statsCalendarMonth,
        statsCalendarSelectedDate
      )
      : { year: this.data.statsCalendarYear, month: this.data.statsCalendarMonth };
    const statsCalendarDays = shouldBuildStats
      ? buildStatsCalendarDays(
        statsCalendarView.year,
        statsCalendarView.month,
        this.data.statsRange,
        this.data.statsAnchorDate,
        logs
      )
      : this.data.statsCalendarDays;
    const statsCalendarMonths = shouldBuildStats
      ? buildStatsCalendarMonths(
        statsCalendarView.year,
        this.data.statsAnchorDate,
        logs
      )
      : this.data.statsCalendarMonths;
    const statsCalendarYears = shouldBuildStats
      ? buildStatsCalendarYears(
        statsCalendarView.year,
        this.data.statsAnchorDate,
        logs
      )
      : this.data.statsCalendarYears;
    const statsCalendarUsesYearPicker = this.data.statsRange === "month" || this.data.statsRange === "year";
    const stages = decorateStages(this.data.brewForm.stages);
    const recipeFormStages = decorateStages(this.data.recipeForm.stages);
    const timerInfo = getTimerInfo(this.data.timerElapsed, stages, this.data.brewForm.water);
    const brewStepTitle = this.data.brewStep === 1 && this.data.overviewBeanPickerOpen
      ? "选择咖啡豆"
      : (this.data.brewStepTitles[this.data.brewStep] || "Pour Notes");
    const lockBrewScreen = this.data.activeTab === "brew"
      && (
      (this.data.brewStep === 1 && !this.data.overviewBeanPickerOpen)
        || this.data.brewStep === 3
        || this.data.brewStep === 4
      );
    const homeDashboardLocked = this.data.activeTab === "brew"
      && this.data.brewHomeVisible
      && this.data.homeView === "dashboard";
    const minePageLocked = this.data.activeTab === "mine"
      && this.data.mineView === "profile";
    // The bean wallet scrolls inside its own scroll-view, so the page itself stays put.
    const beanWalletLocked = this.data.activeTab === "beans"
      && this.data.beansView === "list";
    const recipeWalletLocked = this.data.activeTab === "recipes"
      && this.data.recipesView === "list";
    const pickerWalletLocked = this.data.activeTab === "brew"
      && !this.data.brewHomeVisible
      && this.data.brewStep === 1
      && this.data.overviewBeanPickerOpen;
    const logWalletLocked = this.data.activeTab === "brew"
      && this.data.brewHomeVisible
      && this.data.homeView === "logs"
      && !this.data.selectedLogId;
    const secondaryPageActive = isSecondaryPageState(this.data);
    const patch = {
      selectedBeanId,
      expandedBeanId,
      selectedRoasterName,
      selectedRoasterBeanId,
      selectedRoasterBeanName,
      availableBeans,
      pickerWalletOpenId,
      displayBeanCards,
      beanWalletOpenId,
      beanLibraryMode,
      beanStockMode,
      beanShelfMode,
      beanStockEmptyText,
      activeBeanActionId,
      selectedBeanCard,
      displayRecipes,
      recipeWalletOpenId,
      recipeLibraryMode,
      recipeLibraryEmptyText: recipeLibraryMode === "preset" ? "暂无预设方案。" : "还没有保存的自建方案，点右下角 + 新建一个。",
      selectedRecipeId,
      selectedRecipeDetail,
      activeRecipeActionId,
      displayRoasters,
      displayRoasterBeans,
      roasterBeanFilters,
      roasterBeanFilterGroups,
      roasterBeanActiveFilterCount,
      selectedRoasterBeanDetail,
      displayLogs: displayLogCards,
      logWalletOpenId,
      logRenderLimit,
      logTotalCount,
      logHasMore,
      logDateFilter,
      logDateFilterText: logDateFilter ? formatLogDateFilterText(logDateFilter) : "全部日期",
      logCalendarYear: calendarView.year,
      logCalendarMonth: calendarView.month,
      logCalendarTitle: formatLogCalendarMonth(calendarView.year, calendarView.month),
      logCalendarDays,
      logListEmptyTitle: logDateFilter ? "当天暂无冲煮记录" : "暂无冲煮记录",
      logListEmptyCopy: logDateFilter ? "换一个日期试试" : "开始你的第一次冲煮",
      activeLogActionId,
      selectedLogId,
      selectedLogDetail,
      selectedLogEditMode,
      statsOverview,
      statsCalendarYear: statsCalendarView.year,
      statsCalendarMonth: statsCalendarView.month,
      statsCalendarTitle: formatLogCalendarMonth(statsCalendarView.year, statsCalendarView.month),
      statsCalendarPanelTitle: this.data.statsRange === "week"
        ? `${statsCalendarView.year}年`
        : (statsCalendarUsesYearPicker
          ? formatStatsCalendarYearPage(statsCalendarView.year)
          : formatLogCalendarMonth(statsCalendarView.year, statsCalendarView.month)),
      statsCalendarMonths,
      statsCalendarYears,
      statsCalendarDays,
      displayDrippers,
      selectedDripperDisplay,
      parameterSummary,
      brewStepTitle,
      lockBrewScreen,
      secondaryPageActive,
      // The log list and log detail share the outer scroll-view. Keeping it enabled
      // across that transition avoids the native scroll component getting stuck
      // after a detail view, swipe gesture, or app background/foreground cycle.
      contentScrollY: !lockBrewScreen && !homeDashboardLocked && !minePageLocked,
      // Wallet pages keep the shared outer scroll-view enabled (toggling it can leave the
      // native scroller stuck on the next page) and instead size themselves to one screen.
      walletPageActive: beanWalletLocked || logWalletLocked || pickerWalletLocked || recipeWalletLocked,
      beansTitle: this.getBeansTitle(this.data.beansView, selectedRoasterName, selectedRoasterBeanName),
      recipesTitle: this.getRecipesTitle(this.data.recipesView, selectedRecipeDetail),
      ratioDisplay: formatRatioDisplay(this.data.brewForm.dose, this.data.brewForm.water, this.data.brewForm.ratio),
      recentGrindPresets: this.data.activeTab === "brew" && this.data.brewStep === 2
        ? buildRecentGrindPresets(this.data.logs)
        : this.data.recentGrindPresets,
      ratioPickerIndex: Math.max(0, RATIO_VALUES.indexOf(Number(this.data.brewForm.ratio))),
      recipeFormRatioDisplay: formatRecipeRatioDisplay(this.data.recipeForm.dose, this.data.recipeForm.water, this.data.recipeForm.ratio),
      recipeFormRatioPickerIndex: Math.max(0, RATIO_VALUES.indexOf(Number(this.data.recipeForm.ratio))),
      "recipeForm.stages": recipeFormStages,
      "brewForm.stages": stages,
      brewFlavorRadar: buildFlavorRadarView(this.data.brewForm.flavorScores),
      logFlavorRadar: buildFlavorRadarView(logFlavorRadarScores),
      brewRatingStarWidths: getRatingStarWidths(this.data.brewForm.rating),
      selectedLogEditRatingStarWidths: getRatingStarWidths(
        this.data.selectedLogEditForm && this.data.selectedLogEditForm.rating
      ),
      ...timerInfo
    };
    if (!options.skipCollectionPatch) {
      Object.assign(patch, {
        beans,
        recipes,
        logs
      });
    }
    this.setData(patch, () => {
      if (beanWalletLocked || logWalletLocked || pickerWalletLocked || recipeWalletLocked) {
        this.measureWalletStickyTop();
      }
      if (this.data.activeTab === "roasters") {
        this.queueRoasterGuideImages(patch.displayRoasters);
        this.queueRoasterGuideImages(patch.displayRoasterBeans, this.data.beansView === "roasterBeans");
      }
      if (this.data.activeTab === "brew") {
        this.queueRoasterGuideImages(patch.displayDrippers);
        this.queueRoasterGuideImages(
          patch.selectedDripperDisplay ? [patch.selectedDripperDisplay] : [],
          true
        );
      }
    });
  },

  getBeansTitle(beansView, selectedRoasterName, selectedRoasterBeanName) {
    if (beansView === "add") return this.data.editingBeanId ? "编辑豆子" : "添加豆子";
    if (beansView === "roasterBeans") return selectedRoasterName || "寻豆指南";
    if (beansView === "roasterBeanDetail") return selectedRoasterBeanName || "豆子详情";
    return "豆仓";
  },

  getRecipesTitle(recipesView, selectedRecipeDetail) {
    if (recipesView === "add") return this.data.editingRecipeId ? "修改方案" : "新建方案";
    if (recipesView === "detail") return selectedRecipeDetail ? selectedRecipeDetail.nameText : "方案详情";
    return "自建方案";
  },

  handleContentScroll(event) {
    if (this.contentScrollRestoring) return;
    this.contentScrollOffset = Math.max(0, Number(event.detail.scrollTop) || 0);
  },

  loadMoreBrewLogs() {
    if (
      this.data.activeTab !== "brew"
      || !this.data.brewHomeVisible
      || this.data.homeView !== "logs"
      || this.data.selectedLogId
      || !this.data.logHasMore
    ) return;
    this.setData({
      logRenderLimit: (Number(this.data.logRenderLimit) || LOG_LIST_INITIAL_RENDER_COUNT)
        + LOG_LIST_RENDER_BATCH
    }, () => this.refreshDerived());
  },

  getContentScrollKey(state = this.data) {
    const activeTab = state.activeTab || "brew";
    if (activeTab === "brew") {
      if (state.brewHomeVisible) {
        if (state.homeView === "logs") {
          return state.selectedLogId ? `brew:logs:detail:${state.selectedLogId}` : "brew:logs:list";
        }
        return `brew:home:${state.homeView || "dashboard"}`;
      }
      const picker = state.overviewBeanPickerOpen ? ":bean-picker" : "";
      return `brew:flow:${Number(state.brewStep) || 0}${picker}`;
    }
    if (activeTab === "beans") {
      return `beans:${state.beansView || "list"}:${state.editingBeanId || ""}`;
    }
    if (activeTab === "roasters") {
      if (state.beansView === "roasterBeans") return `roasters:beans:${state.selectedRoasterName || ""}`;
      if (state.beansView === "roasterBeanDetail") return `roasters:detail:${state.selectedRoasterBeanId || ""}`;
      if (state.beansView === "add") return `roasters:add:${state.selectedRoasterBeanId || ""}`;
      return "roasters:catalog";
    }
    if (activeTab === "recipes") {
      if (state.recipesView === "detail") return `recipes:detail:${state.selectedRecipeId || ""}`;
      if (state.recipesView === "add") return `recipes:add:${state.editingRecipeId || "new"}`;
      const source = state.recipeQuickImportMode ? "quick" : "library";
      return `recipes:${source}:list:${state.recipeLibraryMode === "preset" ? "preset" : "custom"}`;
    }
    if (activeTab === "flavor") {
      const categoryId = state.flavorActiveCategory && state.flavorActiveCategory.id || "";
      const groupName = state.flavorActiveGroup && state.flavorActiveGroup.english || "";
      return `flavor:${state.flavorView || "overview"}:${categoryId}:${groupName}`;
    }
    if (activeTab === "mine") {
      return `mine:${state.mineView || "profile"}`;
    }
    return activeTab;
  },

  rememberCurrentContentScroll() {
    if (!this.contentScrollPositions) this.contentScrollPositions = Object.create(null);
    const key = this.getContentScrollKey();
    this.contentScrollPositions[key] = Math.max(0, Number(this.contentScrollOffset) || 0);
    return key;
  },

  getRememberedContentScroll(key, fallback = 0) {
    if (!this.contentScrollPositions) this.contentScrollPositions = Object.create(null);
    const value = this.contentScrollPositions[key];
    return value === undefined ? Math.max(0, Number(fallback) || 0) : Math.max(0, Number(value) || 0);
  },

  navigateWithContentScroll(patch, options = {}, afterPatch) {
    if (patch && patch.parameterKeyboardHeight === 0) {
      this.parameterKeyboardReportedHeight = 0;
      this.parameterFocusedInputId = "";
      if (this.parameterInputRevealTimer) {
        clearTimeout(this.parameterInputRevealTimer);
        this.parameterInputRevealTimer = null;
      }
    }
    if (options.rememberCurrent !== false) this.rememberCurrentContentScroll();
    const nextState = { ...this.data, ...patch };
    const targetKey = options.targetKey || this.getContentScrollKey(nextState);
    const targetScrollTop = options.scrollTop === undefined
      ? this.getRememberedContentScroll(targetKey, 0)
      : Math.max(0, Number(options.scrollTop) || 0);
    this.setDataWithContentScroll(patch, targetScrollTop, afterPatch);
  },

  setDataWithContentScroll(patch, scrollTop, afterPatch) {
    const targetScrollTop = Math.max(0, Number(scrollTop) || 0);
    const navigationToken = (Number(this.contentNavigationToken) || 0) + 1;
    this.contentNavigationToken = navigationToken;
    this.contentScrollRestoring = true;
    this.contentScrollOffset = targetScrollTop;
    this.setData({
      ...patch,
      contentScrollTop: targetScrollTop + 1
    }, () => {
      if (navigationToken !== this.contentNavigationToken) return;
      const restoreScroll = () => {
        if (navigationToken !== this.contentNavigationToken) return;
        this.setData({
          contentScrollTop: targetScrollTop
        }, () => {
          if (navigationToken === this.contentNavigationToken) {
            this.contentScrollRestoring = false;
          }
        });
      };
      if (wx.nextTick) {
        wx.nextTick(restoreScroll);
      } else {
        setTimeout(restoreScroll, 0);
      }
    });
    // setData updates this.data synchronously. Derive the destination state now so
    // the view never paints an intermediate frame with the previous page's title/data.
    if (afterPatch) afterPatch();
  },

  buildEdgeBackPreview(kind, title, subtitle = "", items = [], options = {}) {
    return {
      kind,
      title: String(title || "上一页"),
      subtitle: String(subtitle || ""),
      hasBack: Boolean(options.hasBack),
      showTabs: Boolean(options.showTabs),
      real: Boolean(options.real),
      tab: String(options.tab || "brew"),
      segmented: Boolean(options.segmented),
      segmentLeft: String(options.segmentLeft || ""),
      segmentRight: String(options.segmentRight || ""),
      scrollTop: Math.max(0, Number(options.scrollTop) || 0),
      flavorView: String(options.flavorView || "overview"),
      flavorActiveGroup: options.flavorActiveGroup || null,
      brewStep: Math.max(0, Number(options.brewStep) || 0),
      items: (Array.isArray(items) ? items : []).slice(0, 7).map((item, index) => ({
        id: String(item && item.id || `edge-preview-${index}`),
        title: String(item && item.title || ""),
        meta: String(item && item.meta || ""),
        badge: String(item && item.badge || "•"),
        trailing: String(item && item.trailing || ""),
        style: String(item && item.style || "")
      }))
    };
  },

  getEdgeBackDashboardPreview(allowResumeBrew = true) {
    const shouldResumeBrew = allowResumeBrew
      && (this.data.brewFlowActive || this.data.resumeBrewFlowOnHome);
    if (shouldResumeBrew) {
      return this.getEdgeBackBrewPreview();
    }
    return this.buildEdgeBackPreview(
      "dashboard",
      "Pour Notes",
      "记录每一次萃取",
      [],
      {
        showTabs: true,
        real: true,
        tab: "brew",
        scrollTop: this.getRememberedContentScroll("brew:home:dashboard", 0)
      }
    );
  },

  getEdgeBackBrewPreview() {
    return this.buildEdgeBackPreview(
      "brew",
      "准备冲煮",
      "冲煮概览",
      [],
      {
        hasBack: true,
        real: true,
        tab: "brew",
        brewStep: 1,
        scrollTop: this.getRememberedContentScroll("brew:flow:1", 0)
      }
    );
  },

  getEdgeBackStatsPreview() {
    return this.buildEdgeBackPreview(
      "stats",
      "总计",
      "冲煮数据",
      [],
      {
        hasBack: true,
        real: true,
        tab: "brew",
        scrollTop: this.getRememberedContentScroll("stats", 0)
      }
    );
  },

  getEdgeBackBeanListPreview() {
    const items = (this.data.displayBeanCards || []).map((bean) => ({
      id: bean.id,
      title: bean.primaryName || bean.name || "未命名豆子",
      meta: [bean.process, bean.roasterText].filter(Boolean).join(" · "),
      badge: `${Number(bean.remainingWeight) || 0}g`,
      trailing: bean.restingText || ""
    }));
    return this.buildEdgeBackPreview(
      "beans",
      "豆仓",
      "在库 / 空袋",
      items,
      {
        showTabs: true,
        real: true,
        tab: "beans",
        scrollTop: this.getRememberedContentScroll("beans:list:", 0),
        segmented: true,
        segmentLeft: "在库",
        segmentRight: "空袋"
      }
    );
  },

  getEdgeBackRoasterCatalogPreview() {
    const items = (this.data.displayRoasters || []).map((roaster) => ({
      id: roaster.name,
      title: roaster.name || "烘焙商",
      meta: "查看在售咖啡豆",
      badge: roaster.logo || String(roaster.name || "豆").slice(0, 1),
      trailing: "›"
    }));
    return this.buildEdgeBackPreview(
      "roasters",
      "寻豆指南",
      "烘焙商 / 豆子",
      items,
      {
        showTabs: true,
        real: true,
        tab: "roasters",
        scrollTop: this.getRememberedContentScroll("roasters:catalog", 0)
      }
    );
  },

  getEdgeBackRoasterBeansPreview() {
    const items = (this.data.displayRoasterBeans || []).map((bean) => ({
      id: bean.id,
      title: bean.name || "咖啡豆",
      meta: [bean.variety, bean.process].filter(Boolean).join(" · "),
      badge: String(bean.name || "豆").slice(0, 1),
      trailing: "›"
    }));
    return this.buildEdgeBackPreview(
      "roasterBeans",
      this.data.selectedRoasterName || "豆子",
      "烘焙商豆单",
      items,
      {
        hasBack: true,
        real: true,
        tab: "roasters",
        scrollTop: this.roasterBeansReturnScrollTop
      }
    );
  },

  getEdgeBackRecipeListPreview() {
    const items = (this.data.displayRecipes || []).map((recipe) => ({
      id: recipe.id,
      title: recipe.nameText || recipe.name || "未命名方案",
      meta: [recipe.dripperText, recipe.totalTimeText].filter(Boolean).join(" · "),
      badge: recipe.dose ? `${recipe.dose}g` : "方案",
      trailing: recipe.temperatureText ? `${recipe.temperatureText}°` : ""
    }));
    return this.buildEdgeBackPreview(
      "recipes",
      this.data.recipeQuickImportMode ? "选择方案" : "方案库",
      this.data.recipeLibraryMode === "preset" ? "预设方案" : "自建方案",
      items,
      {
        hasBack: true,
        real: true,
        tab: "brew",
        scrollTop: this.getRememberedContentScroll(
          `recipes:${this.data.recipeQuickImportMode ? "quick" : "library"}:list:${this.data.recipeLibraryMode === "preset" ? "preset" : "custom"}`,
          0
        ),
        segmented: true,
        segmentLeft: "自建方案",
        segmentRight: "预设方案"
      }
    );
  },

  getEdgeBackLogListPreview() {
    const items = (this.data.displayLogs || []).map((log) => ({
      id: log.id,
      title: log.productNameText || "冲煮记录",
      meta: [log.roasterText, log.shortDateText].filter(Boolean).join(" · "),
      badge: log.rating ? `${log.rating}★` : "记录",
      trailing: log.recordCardMetrics && log.recordCardMetrics[0]
        ? log.recordCardMetrics[0].value
        : ""
    }));
    return this.buildEdgeBackPreview(
      "logs",
      "冲煮记录",
      this.data.logDateFilterText || "全部日期",
      items,
      {
        hasBack: true,
        real: true,
        tab: "brew",
        scrollTop: this.getRememberedContentScroll("brew:logs:list", 0)
      }
    );
  },

  getEdgeBackFlavorPreview(targetView = this.data.flavorView) {
    let source = this.data.flavorCategories || [];
    let title = "风味";
    let subtitle = "SCA Flavor Wheel";
    if (targetView === "category" && this.data.flavorActiveCategory) {
      source = this.data.flavorActiveCategory.groups || [];
      title = this.data.flavorActiveCategory.name || "风味分类";
      subtitle = this.data.flavorActiveCategory.english || "";
    }
    const items = source.map((item, index) => ({
      id: item.id || item.english || `flavor-${index}`,
      title: item.name || item.english || "风味",
      meta: item.english || "",
      badge: "",
      style: item.cardStyle
        || (item.softColor ? `background:${item.softColor};` : "")
    }));
    return this.buildEdgeBackPreview(
      "flavor",
      title,
      subtitle,
      items,
      {
        hasBack: targetView !== "overview",
        real: true,
        tab: "brew",
        flavorView: targetView,
        flavorActiveGroup: targetView === "group" ? this.data.flavorActiveGroup : null,
        scrollTop: this.getRememberedContentScroll(
          this.getContentScrollKey({
            ...this.data,
            activeTab: "flavor",
            flavorView: targetView,
            flavorActiveGroup: targetView === "group" ? this.data.flavorActiveGroup : null
          }),
          0
        )
      }
    );
  },

  getEdgeBackPreviewForRecipesSource() {
    const target = this.data.recipesReturnTarget || { activeTab: "mine" };
    if (target.activeTab === "brew") {
      if (target.homeView === "logs" && target.brewHomeVisible !== false) {
        return this.getEdgeBackLogListPreview();
      }
      if (target.brewHomeVisible === false) {
        return this.getEdgeBackBrewPreview();
      }
      return this.getEdgeBackDashboardPreview();
    }
    if (target.activeTab === "beans") return this.getEdgeBackBeanListPreview();
    if (target.activeTab === "roasters") {
      if (target.beansView === "roasterBeanDetail") {
        return this.buildEdgeBackPreview(
          "roasterDetail",
          target.selectedRoasterBeanName || "豆子详情",
          target.selectedRoasterName || "",
          [],
          { hasBack: true, real: true, tab: "roasters" }
        );
      }
      if (target.beansView === "roasterBeans") return this.getEdgeBackRoasterBeansPreview();
      return this.getEdgeBackRoasterCatalogPreview();
    }
    if (target.activeTab === "stats") {
      return this.getEdgeBackStatsPreview();
    }
    return this.buildEdgeBackPreview(
      "mine",
      "个人资料",
      "Pour Notes",
      [],
      {
        showTabs: true,
        real: true,
        tab: "mine",
        scrollTop: this.getRememberedContentScroll("mine:profile", 0)
      }
    );
  },

  getEdgeBackContext() {
    if (
      this.data.showDataManager
      || this.data.showPrivacyAgreement
      || this.data.dataExportBusy
      || this.data.dataImportBusy
      || this.data.parameterKeyboardHeight > 0
    ) return null;

    if (this.data.flavorAddOpen) {
      return {
        action: "cancel-flavor-add",
        preview: this.getEdgeBackFlavorPreview(this.data.flavorView)
      };
    }
    if (this.data.flavorActiveFlavor) {
      return {
        action: "close-flavor-detail",
        preview: this.getEdgeBackFlavorPreview(this.data.flavorView)
      };
    }

    if (this.data.activeTab === "brew") {
      if (this.data.brewHomeVisible) {
        if (this.data.homeView !== "logs") return null;
        return this.data.selectedLogId
          ? { action: "close-log-detail", preview: this.getEdgeBackLogListPreview() }
          : { action: "return-home", preview: this.getEdgeBackDashboardPreview() };
      }
      let preview = this.getEdgeBackBrewPreview();
      if (this.data.brewStep === 1 || this.data.brewStep === 4) {
        preview = this.getEdgeBackDashboardPreview(false);
      }
      return { action: "brew-back", preview };
    }

    if (this.data.activeTab === "stats") {
      return { action: "return-home", preview: this.getEdgeBackDashboardPreview() };
    }

    if (this.data.activeTab === "recipes") {
      return this.data.recipesView === "list"
        ? { action: "recipes-source", preview: this.getEdgeBackPreviewForRecipesSource() }
        : { action: "recipe-back", preview: this.getEdgeBackRecipeListPreview() };
    }

    if (this.data.activeTab === "flavor") {
      if (this.data.flavorView === "group") {
        return { action: "flavor-back", preview: this.getEdgeBackFlavorPreview("category") };
      }
      if (this.data.flavorView === "category") {
        return { action: "flavor-back", preview: this.getEdgeBackFlavorPreview("overview") };
      }
      return { action: "return-home", preview: this.getEdgeBackDashboardPreview() };
    }

    if (["beans", "roasters"].includes(this.data.activeTab)) {
      if (this.data.beansView === "list") return null;
      let preview = this.data.activeTab === "beans"
        ? this.getEdgeBackBeanListPreview()
        : this.getEdgeBackRoasterCatalogPreview();
      if (this.data.beansView === "roasterBeanDetail") {
        preview = this.getEdgeBackRoasterBeansPreview();
      } else if (
        this.data.beansView === "add"
        && this.data.beanAddReturnMode === "roasterDetail"
      ) {
        preview = this.buildEdgeBackPreview(
          "roasterDetail",
          this.data.selectedRoasterBeanName || "豆子详情",
          this.data.selectedRoasterName || "",
          [],
          { hasBack: true, real: true, tab: "roasters" }
        );
      }
      return { action: "beans-back", preview };
    }

    if (this.data.activeTab === "mine" && this.data.mineView === "buyingGuide") {
      return {
        action: "mine-back",
        preview: this.buildEdgeBackPreview(
          "mine",
          "个人资料",
          "Pour Notes",
          [],
          {
            showTabs: true,
            real: true,
            tab: "mine",
            scrollTop: this.getRememberedContentScroll("mine:profile", 0)
          }
        )
      };
    }
    return null;
  },

  getEdgeBackViewportWidth() {
    try {
      const windowInfo = wx.getWindowInfo
        ? wx.getWindowInfo()
        : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {});
      return Math.max(1, Number(windowInfo.windowWidth) || 375);
    } catch (error) {
      return 375;
    }
  },

  getEdgeBackVisualPatch(offset, width, duration = 0) {
    const safeWidth = Math.max(1, Number(width) || 375);
    const safeOffset = Math.max(0, Math.min(safeWidth, Number(offset) || 0));
    const progress = safeOffset / safeWidth;
    const previousOffset = -Math.round(safeWidth * 0.16 * (1 - progress));
    const shadeOpacity = Math.max(0, 0.16 * (1 - progress));
    const transition = duration > 0
      ? `transition:transform ${duration}ms cubic-bezier(.22,.72,.2,1);`
      : "transition:none;";
    return {
      edgeBackPageStyle: `transform:translate3d(${Math.round(safeOffset)}px,0,0);${transition}`,
      edgeBackPreviewStyle: `transform:translate3d(${previousOffset}px,0,0);${transition}`,
      edgeBackShadeStyle: `opacity:${shadeOpacity.toFixed(3)};${duration > 0 ? `transition:opacity ${duration}ms ease;` : "transition:none;"}`
    };
  },

  onPageEdgeTouchStart(event) {
    if (this.edgeBackCompleting || this.data.edgeBackActive) return;
    const touch = event.touches && event.touches[0];
    if (!touch || (event.touches && event.touches.length > 1)) return;
    const width = this.getEdgeBackViewportWidth();
    // Keep the JS hit area aligned with the 72rpx WXML guard. The guard catches
    // the host's pull-down gesture before WeChat can move the mini-program card.
    const edgeWidth = Math.min(42, Math.max(30, width * (72 / 750)));
    if (touch.clientX > edgeWidth) return;
    const context = this.getEdgeBackContext();
    if (!context) return;
    const now = Date.now();
    this.edgeBackGesture = {
      startX: touch.clientX,
      startY: touch.clientY,
      width,
      context,
      direction: "",
      lastOffset: -1,
      lastSampleX: touch.clientX,
      lastSampleTime: now,
      startTime: now,
      startContentScrollY: this.data.contentScrollY !== false
    };
    this.edgeBackOwnsTouch = false;
  },

  onPageEdgeTouchMove(event) {
    const touch = event.touches && event.touches[0];
    const gesture = this.edgeBackGesture;
    if (!touch || !gesture || this.edgeBackCompleting) return;
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const distanceX = Math.abs(deltaX);
    const distanceY = Math.abs(deltaY);
    if (!gesture.direction) {
      if (distanceX < 7 && distanceY < 7) return;
      // On a protected nested page, bias a positive edge gesture toward back.
      // A slightly downward finger path must not be handed to WeChat's host card.
      if (
        deltaX > 0
        && distanceX >= 7
        && distanceX >= distanceY * 0.45
      ) {
        gesture.direction = "horizontal";
        this.edgeBackOwnsTouch = true;
        this.beanTouchGesture = null;
        this.logTouchGesture = null;
        this.recipeTouchGesture = null;
      } else if (deltaX <= 0 || (distanceY >= 14 && distanceY > distanceX * 2.2)) {
        gesture.direction = "vertical";
        return;
      } else {
        return;
      }
    }
    if (gesture.direction !== "horizontal") return;
    const offset = Math.max(0, Math.min(gesture.width, deltaX));
    const roundedOffset = Math.round(offset);
    if (gesture.lastOffset === roundedOffset) return;
    gesture.lastOffset = roundedOffset;
    gesture.lastSampleX = touch.clientX;
    gesture.lastSampleTime = Date.now();
    const patch = this.getEdgeBackVisualPatch(offset, gesture.width);
    if (!this.data.edgeBackActive) {
      Object.assign(patch, {
        edgeBackActive: true,
        edgeBackPreview: gesture.context.preview,
        beanSwipeMovingId: "",
        beanSwipeStyle: "",
        beanSwipeTapLocked: false,
        logSwipeMovingId: "",
        logSwipeStyle: "",
        logSwipeTapLocked: false,
        recipeSwipeMovingId: "",
        recipeSwipeStyle: "",
        recipeSwipeTapLocked: false,
        contentScrollY: false
      });
    }
    this.setData(patch);
  },

  onPageEdgeTouchEnd(event) {
    this.finishPageEdgeGesture(event, false);
  },

  onPageEdgeTouchCancel(event) {
    this.finishPageEdgeGesture(event, true);
  },

  finishPageEdgeGesture(event, cancelled) {
    const gesture = this.edgeBackGesture;
    const ownedTouch = this.edgeBackOwnsTouch;
    this.edgeBackGesture = null;
    if (!gesture || !ownedTouch || gesture.direction !== "horizontal") return;
    const touch = (event.changedTouches && event.changedTouches[0]) || null;
    const endX = touch ? touch.clientX : gesture.startX + Math.max(0, gesture.lastOffset);
    const offset = Math.max(0, Math.min(gesture.width, endX - gesture.startX));
    const now = Date.now();
    const recentElapsed = Math.max(1, now - gesture.lastSampleTime);
    const recentVelocity = (endX - gesture.lastSampleX) / recentElapsed;
    const totalVelocity = offset / Math.max(1, now - gesture.startTime);
    const shouldComplete = !cancelled && (
      offset >= gesture.width * 0.33
      || (offset >= 44 && Math.max(recentVelocity, totalVelocity) >= 0.52)
    );
    this.edgeBackCompleting = true;
    if (this.edgeBackAnimationTimer) clearTimeout(this.edgeBackAnimationTimer);
    if (shouldComplete) {
      const duration = 210;
      this.setData({
        ...this.getEdgeBackVisualPatch(gesture.width, gesture.width, duration)
      });
      this.edgeBackAnimationTimer = setTimeout(() => {
        this.edgeBackAnimationTimer = null;
        this.performEdgeBackAction(gesture.context.action);
        this.edgeBackCompleting = false;
        this.setData({
          edgeBackActive: false,
          edgeBackPageStyle: "",
          edgeBackPreviewStyle: "",
          edgeBackShadeStyle: ""
        }, () => this.refreshDerived());
      }, duration);
    } else {
      const duration = 180;
      this.setData({
        ...this.getEdgeBackVisualPatch(0, gesture.width, duration)
      });
      this.edgeBackAnimationTimer = setTimeout(() => {
        this.edgeBackAnimationTimer = null;
        this.edgeBackCompleting = false;
        this.setData({
          edgeBackActive: false,
          edgeBackPageStyle: "",
          edgeBackPreviewStyle: "",
          edgeBackShadeStyle: "",
          contentScrollY: gesture.startContentScrollY
        });
      }, duration);
    }
    setTimeout(() => {
      this.edgeBackOwnsTouch = false;
    }, 0);
  },

  performEdgeBackAction(action) {
    switch (action) {
      case "cancel-flavor-add":
        this.cancelFlavorAdd();
        break;
      case "close-flavor-detail":
        this.closeFlavorDetail();
        break;
      case "close-log-detail":
        this.closeBrewLogDetail();
        break;
      case "return-home":
        this.returnHome();
        break;
      case "brew-back":
        this.handleBrewBack();
        break;
      case "recipes-source":
        this.returnRecipesSource();
        break;
      case "recipe-back":
        this.handleRecipeBack();
        break;
      case "flavor-back":
        this.flavorGoBack();
        break;
      case "beans-back":
        this.handleBeansBack();
        break;
      case "mine-back":
        this.closeBeanBuyingGuide();
        break;
      default:
        break;
    }
  },

  getBottomTabKey(state = this.data) {
    return ["stats", "recipes", "flavor"].includes(state.activeTab) ? "brew" : (state.activeTab || "brew");
  },

  clonePageStateValue(value) {
    if (!value || typeof value !== "object") return value;
    return JSON.parse(JSON.stringify(value));
  },

  rememberBottomTabPageState(tabKey = this.getBottomTabKey()) {
    if (!this.tabPageStates) this.tabPageStates = Object.create(null);
    const fieldsByTab = {
      brew: [
        "activeTab", "homeView", "brewHomeVisible", "brewFlowActive",
        "resumeBrewFlowOnHome", "brewStep", "selectedBeanId", "selectedDripper", "brewForm",
        "quickBeanForm", "beanMode", "overviewBeanPickerOpen",
        "dripperDeleteMode", "showCustomDripperForm", "customDripperName",
        "timerElapsed", "timerRunning", "timerFinished", "timerCountdown", "recipesView",
        "recipeLibraryMode", "recipeQuickImportMode", "brewRecipeSourceId", "brewRecipeSourceName",
        "recipesReturnTarget", "selectedRecipeId", "editingRecipeId", "recipeForm",
        "selectedLogId", "selectedLogEditMode", "selectedLogEditForm",
        "statsRange", "flavorView", "flavorQuery", "flavorSearchResults",
        "flavorActiveCategory", "flavorActiveGroup", "flavorActiveFlavor",
        "flavorAddOpen", "flavorAddForm", "flavorAddGroups", "flavorAddStyle", "flavorAddCanSave"
      ],
      beans: [
        "activeTab", "beansView", "beanLibraryMode", "beanShelfMode", "beanStockMode",
        "editingBeanId", "beanAddReturnMode", "beanForm", "expandedBeanId",
        "selectedRoasterName", "selectedRoasterBeanId", "selectedRoasterBeanName"
      ],
      roasters: [
        "activeTab", "beansView", "beanLibraryMode", "beanShelfMode", "editingBeanId",
        "beanAddReturnMode", "beanForm", "expandedBeanId", "selectedRoasterName",
        "selectedRoasterBeanId", "selectedRoasterBeanName"
      ],
      mine: ["activeTab", "mineView"]
    };
    const fields = fieldsByTab[tabKey] || ["activeTab"];
    this.tabPageStates[tabKey] = fields.reduce((snapshot, field) => {
      snapshot[field] = this.clonePageStateValue(this.data[field]);
      return snapshot;
    }, {});
  },

  getBottomTabPageState(tabKey) {
    if (!this.tabPageStates) this.tabPageStates = Object.create(null);
    const saved = this.tabPageStates[tabKey];
    if (saved) {
      return Object.keys(saved).reduce((snapshot, field) => {
        snapshot[field] = this.clonePageStateValue(saved[field]);
        return snapshot;
      }, {});
    }
    if (tabKey === "beans") {
      return {
        activeTab: "beans",
        beansView: "list",
        beanLibraryMode: "stock",
        beanShelfMode: this.data.beanStockMode === "empty" ? "empty" : "active",
        editingBeanId: "",
        beanAddReturnMode: "",
        expandedBeanId: "",
        selectedRoasterName: "",
        selectedRoasterBeanId: "",
        selectedRoasterBeanName: ""
      };
    }
    if (tabKey === "roasters") {
      return {
        activeTab: "roasters",
        beansView: "list",
        beanLibraryMode: "roaster",
        beanShelfMode: "roaster",
        editingBeanId: "",
        beanAddReturnMode: "",
        expandedBeanId: "",
        selectedRoasterName: "",
        selectedRoasterBeanId: "",
        selectedRoasterBeanName: ""
      };
    }
    if (tabKey === "mine") return { activeTab: "mine", mineView: "profile" };
    return {
      activeTab: "brew",
      homeView: "dashboard",
      brewHomeVisible: true,
      brewFlowActive: false,
      resumeBrewFlowOnHome: false,
      selectedLogId: "",
      selectedLogEditMode: false
    };
  },

  switchTab(event) {
    const targetTab = event.currentTarget.dataset.tab;
    const currentTab = this.getBottomTabKey();
    if (targetTab === currentTab) return;
    if (currentTab === "brew" && this.data.activeTab === "brew" && this.data.brewStep === 2) {
      this.discardParameterEditDraft();
      this.setData({ brewStep: 1 });
    }
    this.rememberCurrentContentScroll();
    this.rememberBottomTabPageState(currentTab);
    if (currentTab === "brew" && this.data.selectedLogEditMode && this.tabPageStates.brew) {
      this.tabPageStates.brew.selectedLogId = "";
      this.tabPageStates.brew.selectedLogEditMode = false;
      this.tabPageStates.brew.selectedLogEditForm = {};
    }
    if (currentTab === "brew" && this.data.editingRecipeId && this.tabPageStates.brew) {
      this.tabPageStates.brew.recipesView = "list";
      this.tabPageStates.brew.editingRecipeId = "";
      this.tabPageStates.brew.selectedRecipeId = "";
      this.tabPageStates.brew.recipeForm = freshRecipeForm();
    }
    if (
      ["beans", "roasters"].includes(currentTab)
      && this.data.editingBeanId
      && this.tabPageStates[currentTab]
    ) {
      this.tabPageStates[currentTab].beansView = "list";
      this.tabPageStates[currentTab].editingBeanId = "";
      this.tabPageStates[currentTab].beanAddReturnMode = "";
      this.tabPageStates[currentTab].beanForm = freshBeanForm();
    }
    const patch = {
      ...this.getBottomTabPageState(targetTab),
      activeBeanActionId: "",
      beanSwipeMovingId: "",
      beanSwipeStyle: "",
      activeLogActionId: "",
      logSwipeMovingId: "",
      logSwipeStyle: "",
      activeRecipeActionId: "",
      recipeSwipeMovingId: "",
      recipeSwipeStyle: ""
    };
    const targetKey = this.getContentScrollKey({ ...this.data, ...patch });
    const rememberedTargetScrollTop = this.getRememberedContentScroll(targetKey, 0);
    this.navigateWithContentScroll(
      patch,
      { rememberCurrent: false, scrollTop: rememberedTargetScrollTop },
      () => {
        this.refreshDerived();
        if (targetTab === "roasters") this.loadRoasterCatalog();
      }
    );
  },

  returnHome() {
    const shouldResumeBrewFlow = this.data.brewFlowActive || this.data.resumeBrewFlowOnHome;
    const today = new Date();
    this.navigateWithContentScroll({
      activeTab: "brew",
      homeView: "dashboard",
      brewHomeVisible: shouldResumeBrewFlow ? false : true,
      resumeBrewFlowOnHome: false,
      selectedLogId: "",
      selectedLogEditMode: false,
      selectedLogEditForm: {},
      logDateFilter: "",
      logCalendarOpen: false,
      statsCalendarOpen: false,
      logCalendarYear: today.getFullYear(),
      logCalendarMonth: today.getMonth() + 1,
      activeLogActionId: "",
      logSwipeMovingId: "",
      logSwipeStyle: "",
      logSwipeTapLocked: false
    }, {}, () => this.refreshDerived());
  },

  openHomeLogs() {
    const shouldResumeBrewFlow = this.data.brewFlowActive || this.data.brewHomeVisible === false;
    this.navigateWithContentScroll({
      activeTab: "brew",
      homeView: "logs",
      brewHomeVisible: true,
      resumeBrewFlowOnHome: shouldResumeBrewFlow,
      selectedLogId: "",
      selectedLogEditMode: false,
      selectedLogEditForm: {},
      logRenderLimit: LOG_LIST_INITIAL_RENDER_COUNT,
      expandedLogId: "",
      activeLogActionId: "",
      logSwipeMovingId: "",
      logSwipeStyle: "",
      logSwipeTapLocked: false
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  toggleLogCalendar() {
    this.setData({ logCalendarOpen: !this.data.logCalendarOpen });
  },

  changeLogCalendarMonth(event) {
    const delta = Number(event.currentTarget.dataset.delta) || 0;
    const current = normalizeLogCalendarView(
      this.data.logCalendarYear,
      this.data.logCalendarMonth,
      this.data.logDateFilter
    );
    const next = new Date(current.year, current.month - 1 + delta, 1);
    this.setData({
      logCalendarOpen: true,
      logCalendarYear: next.getFullYear(),
      logCalendarMonth: next.getMonth() + 1
    }, () => this.refreshDerived());
  },

  selectLogCalendarDate(event) {
    const logDateFilter = normalizeLogDateFilter(event.currentTarget.dataset.date);
    if (!logDateFilter) return;
    const [year, month] = logDateFilter.split("-").map(Number);
    this.setData({
      logDateFilter,
      logRenderLimit: LOG_LIST_INITIAL_RENDER_COUNT,
      expandedLogId: "",
      logCalendarOpen: true,
      logCalendarYear: year,
      logCalendarMonth: month,
      activeLogActionId: "",
      logSwipeMovingId: "",
      logSwipeStyle: "",
      logSwipeTapLocked: false
    }, () => this.refreshDerived());
  },

  clearLogDateFilter() {
    if (!this.data.logDateFilter) return;
    this.setData({
      logDateFilter: "",
      logRenderLimit: LOG_LIST_INITIAL_RENDER_COUNT,
      expandedLogId: "",
      activeLogActionId: "",
      logSwipeMovingId: "",
      logSwipeStyle: "",
      logSwipeTapLocked: false
    }, () => this.refreshDerived());
  },

  openStatsPage() {
    const shouldResumeBrewFlow = this.data.brewFlowActive || this.data.brewHomeVisible === false;
    this.navigateWithContentScroll({
      activeTab: "stats",
      homeView: "dashboard",
      resumeBrewFlowOnHome: shouldResumeBrewFlow,
      selectedLogId: "",
      selectedLogEditMode: false,
      selectedLogEditForm: {},
      statsRange: "day",
      statsAnchorDate: "",
      statsCalendarOpen: false,
      statsCalendarYear: new Date().getFullYear(),
      statsCalendarMonth: new Date().getMonth() + 1
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  openRecipesPage() {
    const recipesReturnTarget = this.data.activeTab === "recipes"
      ? (this.data.recipesReturnTarget || { activeTab: "mine" })
      : {
        activeTab: this.data.activeTab,
        homeView: this.data.homeView,
        brewHomeVisible: this.data.brewHomeVisible,
        beansView: this.data.beansView,
        beanLibraryMode: this.data.beanLibraryMode,
        beanShelfMode: this.data.beanShelfMode,
        selectedRoasterName: this.data.selectedRoasterName,
        selectedRoasterBeanId: this.data.selectedRoasterBeanId,
        selectedRoasterBeanName: this.data.selectedRoasterBeanName
      };
    if (!this.contentScrollPositions) this.contentScrollPositions = Object.create(null);
    this.contentScrollPositions["recipes:list:custom"] = 0;
    this.contentScrollPositions["recipes:list:preset"] = 0;
    this.navigateWithContentScroll({
      activeTab: "recipes",
      recipesReturnTarget,
      recipesView: "list",
      recipeLibraryMode: "custom",
      recipeQuickImportMode: false,
      expandedRecipeId: "",
      editingRecipeId: "",
      selectedRecipeId: "",
      activeRecipeActionId: "",
      recipeSwipeMovingId: "",
      recipeSwipeStyle: "",
      recipeSwipeTapLocked: false
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  returnRecipesSource() {
    const target = this.data.recipesReturnTarget || { activeTab: "mine" };
    const patch = {
      recipesView: "list",
      editingRecipeId: "",
      selectedRecipeId: "",
      activeRecipeActionId: "",
      recipeSwipeMovingId: "",
      recipeSwipeStyle: "",
      recipesReturnTarget: null,
      recipeQuickImportMode: false
    };
    if (target.activeTab === "brew") {
      Object.assign(patch, {
        activeTab: "brew",
        homeView: target.homeView || "dashboard",
        brewHomeVisible: target.brewHomeVisible !== false,
        brewStep: target.brewStep === undefined ? this.data.brewStep : target.brewStep,
        selectedLogId: "",
        selectedLogEditMode: false,
        activeLogActionId: "",
        logSwipeMovingId: "",
        logSwipeStyle: ""
      });
    } else if (target.activeTab === "beans") {
      Object.assign(patch, {
        activeTab: "beans",
        beansView: target.beansView || "list",
        beanLibraryMode: target.beanLibraryMode || "stock",
        beanShelfMode: target.beanShelfMode || "active",
        selectedRoasterName: target.selectedRoasterName || "",
        selectedRoasterBeanId: target.selectedRoasterBeanId || "",
        selectedRoasterBeanName: target.selectedRoasterBeanName || ""
      });
    } else if (target.activeTab === "roasters") {
      Object.assign(patch, {
        activeTab: "roasters",
        beansView: target.beansView || "roasterBeanDetail",
        beanLibraryMode: "roaster",
        beanShelfMode: "roaster",
        selectedRoasterName: target.selectedRoasterName || "",
        selectedRoasterBeanId: target.selectedRoasterBeanId || "",
        selectedRoasterBeanName: target.selectedRoasterBeanName || ""
      });
    } else if (target.activeTab === "stats") {
      patch.activeTab = "stats";
    } else {
      patch.activeTab = "mine";
    }
    this.navigateWithContentScroll(patch, {}, () => this.refreshDerived());
  },

  openDataManager() {
    this.setData({ showDataManager: true, dataManagerView: "main" });
  },

  closeDataManager() {
    if (this.data.dataExportBusy || this.data.dataImportBusy) return;
    this.setData({ showDataManager: false, dataManagerView: "main" });
  },

  preventBubble() {},

  goBackDataManager() {
    if (this.data.dataExportBusy || this.data.dataImportBusy) return;
    this.setData({
      dataManagerView: this.data.dataManagerView === "importMode" ? "importScope" : "main"
    });
  },

  showDataExportOptions() {
    if (this.data.dataExportBusy || this.data.dataImportBusy) return;
    this.setData({ dataManagerView: "export" });
  },

  showDataImportOptions() {
    if (this.data.dataExportBusy || this.data.dataImportBusy) return;
    this.setData({ dataManagerView: "importScope", dataImportScope: "all" });
  },

  selectDataImportScope(event) {
    if (this.data.dataExportBusy || this.data.dataImportBusy) return;
    const requestedScope = String(event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.scope || "all");
    const dataImportScope = ["recipes", "beans", "logs", "all"].includes(requestedScope) ? requestedScope : "all";
    this.setData({ dataImportScope, dataManagerView: "importMode" });
  },

  showWechatClientOnlyNotice(actionText) {
    wx.showModal({
      title: "请使用手机微信",
      content: `开发者工具无法打开微信聊天。请点击工具栏“预览”扫码，或使用“真机调试”，然后在手机上${actionText}。`,
      showCancel: false,
      confirmText: "知道了",
      confirmColor: "#b88222"
    });
  },

  exportLocalData(event) {
    if (this.data.dataExportBusy) return;
    if (isWechatDevtools()) {
      this.showWechatClientOnlyNotice("将备份文件发送到微信聊天");
      return;
    }
    if (!wx.getFileSystemManager || !wx.shareFileMessage || !wx.env || !wx.env.USER_DATA_PATH) {
      this.toast("请在微信手机端导出数据");
      return;
    }
    const scope = String(event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.scope || "all");
    const scopeDefinitions = {
      recipes: { label: "自建方案", key: "recipes" },
      beans: { label: "豆仓", key: "beans" },
      logs: { label: "冲煮记录", key: "logs" },
      all: { label: "全部数据", key: "" }
    };
    const scopeDefinition = scopeDefinitions[scope] || scopeDefinitions.all;
    const state = this.buildStoredState(this.storageSnapshot);
    const exportedState = scopeDefinition.key
      ? {
          version: state.version,
          appVersion: state.appVersion,
          [scopeDefinition.key]: state[scopeDefinition.key]
        }
      : state;
    const payload = {
      format: "pour-notes-backup",
      backupVersion: 2,
      scope: scopeDefinitions[scope] ? scope : "all",
      exportedAt: new Date().toISOString(),
      data: exportedState
    };
    const now = new Date();
    const dateText = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, "0"))
      .join("-");
    const fileName = `PourNotes-${scopeDefinition.label}-${dateText}.json`;
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    const fileSystem = wx.getFileSystemManager();
    this.setData({ dataExportBusy: true });
    try {
      // shareFileMessage must run in the same synchronous user-tap call chain.
      fileSystem.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
    } catch (error) {
      console.warn("Generate local backup file failed.", error);
      this.setData({ dataExportBusy: false });
      this.toast("备份文件生成失败");
      return;
    }
    wx.shareFileMessage({
      filePath,
      fileName,
      success: () => {
        this.setData({ showDataManager: false });
        this.toast("备份文件已发送到微信聊天");
      },
      fail: (error) => {
        const errorMessage = String(error && error.errMsg || "");
        console.warn("Share backup file to WeChat chat failed.", error);
        if (!errorMessage.includes("cancel")) {
          if (errorMessage.includes("not supported")) {
            this.showWechatClientOnlyNotice("将备份文件发送到微信聊天");
          } else {
            this.toast("未能发送到微信聊天，请重试");
          }
        }
      },
      complete: () => this.setData({ dataExportBusy: false })
    });
  },

  importLocalData(event) {
    if (this.data.dataImportBusy) return;
    const importScope = ["recipes", "beans", "logs", "all"].includes(this.data.dataImportScope)
      ? this.data.dataImportScope
      : "all";
    const importMode = String(event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.mode || "replace") === "append"
      ? "append"
      : "replace";
    if (isWechatDevtools()) {
      this.showWechatClientOnlyNotice("从微信聊天选择备份文件");
      return;
    }
    if (!wx.chooseMessageFile || !wx.getFileSystemManager) {
      this.toast("请在微信手机端导入数据");
      return;
    }
    // Invoke the WeChat chat picker before any UI update so the call stays in
    // the original user-tap gesture. Filter the selected file ourselves because
    // iOS WeChat can reject uncommon extension filters before opening the picker.
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      success: (result) => {
        const file = result && result.tempFiles && result.tempFiles[0];
        const filePath = file && (file.path || file.tempFilePath);
        const fileName = String(file && file.name || "");
        if (!filePath) {
          this.setData({ dataImportBusy: false });
          this.toast("没有读取到备份文件");
          return;
        }
        if (!fileName.toLowerCase().endsWith(".json")) {
          this.setData({ dataImportBusy: false });
          this.toast("请选择 JSON 备份文件");
          return;
        }
        wx.getFileSystemManager().readFile({
          filePath,
          encoding: "utf8",
          success: ({ data }) => {
            try {
              const parsed = JSON.parse(String(data || ""));
              const saved = parsed && (parsed.data || parsed.state) || parsed;
              if (!isStoredState(saved)) throw new Error("备份格式不正确");
              const scopedData = selectImportedDataScope(saved, importScope);
              this.confirmImportedData(scopedData, importMode, importScope);
            } catch (error) {
              this.toast((error && error.message) || "备份文件无法读取");
            } finally {
              this.setData({ dataImportBusy: false });
            }
          },
          fail: () => {
            this.setData({ dataImportBusy: false });
            this.toast("备份文件读取失败");
          }
        });
      },
      fail: (error) => {
        this.setData({ dataImportBusy: false });
        const errorMessage = String(error && error.errMsg || "");
        console.warn("Choose backup file from WeChat chat failed.", error);
        if (!errorMessage.includes("cancel")) {
          if (errorMessage.includes("privacy agreement")) {
            wx.showModal({
              title: "需要补充隐私声明",
              content: "请在微信公众平台的“用户隐私保护指引”中新增“选中的文件”，用途填写：用于从微信聊天选择 Pour Notes JSON 备份并恢复本机数据。保存并生效后即可使用。",
              showCancel: false,
              confirmText: "知道了",
              confirmColor: "#b88222"
            });
          } else if (errorMessage.includes("not supported")) {
            this.showWechatClientOnlyNotice("从微信聊天选择备份文件");
          } else {
            wx.showModal({
              title: "无法打开微信聊天文件",
              content: errorMessage || "微信客户端未能打开聊天文件选择器，请重试。",
              showCancel: false,
              confirmText: "知道了",
              confirmColor: "#b88222"
            });
          }
        }
      }
    });
    this.setData({ dataImportBusy: true });
  },

  confirmImportedData(saved, importMode = "replace", importScope = "all") {
    const beanCount = getStoredCollection(saved, "beans").length;
    const recipeCount = getStoredCollection(saved, "recipes").length;
    const logCount = getStoredCollection(saved, "logs").length;
    const isAppend = importMode === "append";
    const scopeLabels = { recipes: "自建方案", beans: "豆仓", logs: "冲煮记录", all: "全部数据" };
    const scopeLabel = scopeLabels[importScope] || scopeLabels.all;
    const actionText = isAppend
      ? "将保留本机现有数据，并把备份内容作为新记录追加。"
      : "将覆盖备份中包含的数据类别；备份未包含的类别保持不变。";
    wx.showModal({
      title: isAppend ? "追加导入" : "覆盖导入",
      content: `本次导入：${scopeLabel}。备份包含 ${beanCount} 包豆子、${recipeCount} 个方案和 ${logCount} 条冲煮记录。${actionText}当前昵称和头像保持不变。是否继续？`,
      confirmText: isAppend ? "追加" : "覆盖",
      confirmColor: "#b88222",
      success: (result) => {
        if (result.confirm) this.applyImportedData(saved, importMode);
      }
    });
  },

  applyImportedData(saved, importMode = "replace") {
    const current = this.buildStoredState(this.storageSnapshot);
    const currentBeans = this.data.beans.map(normalizeBean);
    const currentRecipes = this.data.recipes.map(normalizeRecipe).filter((recipe) => recipe.sourceType !== "roaster");
    const currentLogs = this.data.logs.map(normalizeLog);
    const hasBeans = Object.prototype.hasOwnProperty.call(saved, "beans");
    const hasRecipes = Object.prototype.hasOwnProperty.call(saved, "recipes");
    const hasLogs = Object.prototype.hasOwnProperty.call(saved, "logs");
    const importedBeans = getStoredCollection(saved, "beans").map(normalizeBean);
    const importedRecipes = getStoredCollection(saved, "recipes")
      .map(normalizeRecipe)
      .filter((recipe) => recipe.sourceType !== "roaster");
    const importedLogs = getStoredCollection(saved, "logs").map(normalizeLog);
    let beans = hasBeans ? importedBeans : currentBeans;
    let recipes = hasRecipes ? importedRecipes : currentRecipes;
    let logs = hasLogs ? importedLogs : currentLogs;
    if (importMode === "append") {
      const beanMerge = appendImportedItems(currentBeans, hasBeans ? importedBeans : [], "bean");
      beans = beanMerge.items;
      recipes = appendImportedItems(currentRecipes, hasRecipes ? importedRecipes : [], "recipe").items;
      const remappedLogs = (hasLogs ? importedLogs : []).map((log) => ({
        ...log,
        beanId: beanMerge.idMap[log.beanId] || log.beanId
      }));
      logs = appendImportedItems(currentLogs, remappedLogs, "log").items;
    }
    const currentProfile = normalizeProfile({
      nickname: this.data.profileNickname,
      avatarUrl: this.data.profileAvatarUrl
    });
    const importedDrippers = Array.isArray(saved.drippers) ? saved.drippers : [];
    const drippers = importMode === "append"
      ? mergeUnique(this.data.drippers, importedDrippers)
      : (importedDrippers.length ? mergeUnique(DEFAULT_DRIPPERS, importedDrippers) : this.data.drippers);
    const preferredBeanId = importMode === "append" || !hasBeans ? this.data.selectedBeanId : saved.selectedBeanId;
    const selectedBeanId = beans.some((bean) => bean.id === preferredBeanId) ? preferredBeanId : "";
    const preferredDripper = importMode === "append" ? this.data.selectedDripper : saved.selectedDripper;
    const selectedDripper = drippers.includes(preferredDripper)
      ? preferredDripper
      : (drippers.includes(this.data.selectedDripper) ? this.data.selectedDripper : drippers[0]);
    try {
      wx.setStorageSync(STORAGE_BACKUP_KEY, current);
    } catch (error) {
      console.warn("Current data backup before import failed.", error);
    }
    this.storageWriteEnabled = true;
    this.storageSnapshot = {
      ...current,
      ...saved,
      profile: currentProfile
    };
    this.storageNeedsVersionBackup = false;
    this.setData({
      drippers,
      beans,
      recipes,
      logs,
      selectedBeanId,
      selectedDripper,
      showDataManager: false,
      dataManagerView: "main"
    }, () => {
      this.persist();
      this.refreshDerived({ skipCollectionNormalize: true, skipCollectionPatch: true });
      this.toast(importMode === "append" ? "数据追加成功" : "数据导入成功");
    });
  },

  clearLocalData() {
    wx.showModal({
      title: "清除本机数据",
      content: "清除后，本机豆子、方案和冲煮记录将无法恢复，但不会影响云端内容缓存。建议先通过“数据管理”导出备份。确定继续吗？",
      confirmText: "清空",
      confirmColor: "#9f3f30",
      success: (result) => {
        if (!result.confirm) return;
        wx.removeStorageSync(STORAGE_KEY);
        wx.removeStorageSync(STORAGE_BACKUP_KEY);
        this.storageWriteEnabled = true;
        this.storageSnapshot = {};
        this.storageNeedsVersionBackup = false;
        this.bootstrap();
        this.toast("本机数据已清除");
      }
    });
  },

  openDataCleanupOptions() {
    wx.showActionSheet({
      itemList: ["清除缓存", "清除冲煮记录"],
      itemColor: "#c23b2d",
      success: (result) => {
        if (result.tapIndex === 0) {
          this.clearRoasterGuideCache();
        } else if (result.tapIndex === 1) {
          this.clearLocalData();
        }
      }
    });
  },

  clearRoasterGuideCache() {
    wx.showModal({
      title: "清除云端内容缓存",
      content: "将清除寻豆指南豆单、咖啡图片、烘焙商 Logo 和滤杯图片缓存，不会删除本机豆子、方案或冲煮记录。下次打开对应页面时会重新加载。确定继续吗？",
      confirmText: "清除",
      confirmColor: "#9f3f30",
      success: (result) => {
        if (!result.confirm) return;
        const imageCacheEntries = this.roasterImageCache || {};
        if (wx.getFileSystemManager) {
          const fileSystem = wx.getFileSystemManager();
          Object.keys(imageCacheEntries).forEach((id) => {
            const filePath = imageCacheEntries[id] && imageCacheEntries[id].path;
            if (filePath && !String(filePath).startsWith("cloud://") && fileSystem.removeSavedFile) {
              fileSystem.removeSavedFile({ filePath });
            }
          });
        }
        this.roasterImageCacheGeneration = (Number(this.roasterImageCacheGeneration) || 0) + 1;
        this.roasterCatalogCacheGeneration = (Number(this.roasterCatalogCacheGeneration) || 0) + 1;
        if (this.roasterImageCacheFlushTimer) {
          clearTimeout(this.roasterImageCacheFlushTimer);
          this.roasterImageCacheFlushTimer = null;
        }
        this.roasterImageDownloadQueue = [];
        this.roasterImageDownloadActive = 0;
        this.roasterImageCacheInFlight = Object.create(null);
        this.failedRoasterLogos = Object.create(null);
        wx.removeStorageSync(ROASTER_CATALOG_CACHE_KEY);
        wx.removeStorageSync(ROASTER_IMAGE_CACHE_KEY);
        this.roasterImageCache = Object.create(null);
        applyRoasterBeanImageCache(this.roasterImageCache);
        resetCloudRoasterBeans();
        this.roasterCatalogHasCache = false;
        this.roasterCatalogLastRefreshAt = 0;
        this.setData({
          roasterCatalogStatus: "local",
          buyingGuideAvatarImage: "",
          buyingGuideBackgroundImage: ""
        }, () => this.refreshDerived());
        this.toast("云端内容缓存已清除");
      }
    });
  },

  setStatsBreakdown(event) {
    const key = event.currentTarget.dataset.key;
    if (!["region", "variety", "process", "roaster"].includes(key)) return;
    this.setData({ statsBreakdownKey: key });
  },

  setStatsRange(event) {
    const range = event.currentTarget.dataset.range;
    if (!["day", "week", "month", "year"].includes(range)) return;
    const today = new Date();
    this.setData({
      statsRange: range,
      statsAnchorDate: "",
      statsCalendarOpen: false,
      statsCalendarYear: today.getFullYear(),
      statsCalendarMonth: today.getMonth() + 1
    }, () => this.refreshDerived());
  },

  selectStatsTrendPeriod(event) {
    const anchorTimestamp = Number(event.currentTarget.dataset.anchor);
    if (!Number.isFinite(anchorTimestamp) || anchorTimestamp <= 0) return;
    const anchorDate = new Date(anchorTimestamp);
    this.setData({
      statsAnchorDate: anchorDate.toISOString(),
      statsCalendarOpen: false,
      statsCalendarYear: anchorDate.getFullYear(),
      statsCalendarMonth: anchorDate.getMonth() + 1
    }, () => this.refreshDerived());
  },

  toggleStatsCalendar() {
    const statsCalendarOpen = !this.data.statsCalendarOpen;
    if (!statsCalendarOpen) {
      this.setData({ statsCalendarOpen: false });
      return;
    }
    const anchorDate = parseStatsDate(this.data.statsAnchorDate) || new Date();
    this.setData({
      statsCalendarOpen: true,
      statsCalendarYear: anchorDate.getFullYear(),
      statsCalendarMonth: anchorDate.getMonth() + 1
    }, () => this.refreshDerived());
  },

  changeStatsCalendarMonth(event) {
    const delta = Number(event.currentTarget.dataset.delta) || 0;
    const current = normalizeLogCalendarView(
      this.data.statsCalendarYear,
      this.data.statsCalendarMonth,
      getLogDateKey(parseStatsDate(this.data.statsAnchorDate) || new Date())
    );
    if (this.data.statsRange === "week") {
      this.setData({
        statsCalendarOpen: true,
        statsCalendarYear: current.year + delta
      }, () => this.refreshDerived());
      return;
    }
    if (this.data.statsRange === "month" || this.data.statsRange === "year") {
      this.setData({
        statsCalendarOpen: true,
        statsCalendarYear: current.year + (delta * 10)
      }, () => this.refreshDerived());
      return;
    }
    const next = new Date(current.year, current.month - 1 + delta, 1);
    this.setData({
      statsCalendarOpen: true,
      statsCalendarYear: next.getFullYear(),
      statsCalendarMonth: next.getMonth() + 1
    }, () => this.refreshDerived());
  },

  selectStatsCalendarMonth(event) {
    const year = Number(this.data.statsCalendarYear);
    const month = Number(event.currentTarget.dataset.month);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return;
    const anchorDate = new Date(year, month - 1, 1, 12);
    this.setData({
      statsAnchorDate: anchorDate.toISOString(),
      statsCalendarOpen: false,
      statsCalendarYear: year,
      statsCalendarMonth: month
    }, () => this.refreshDerived());
  },

  selectStatsCalendarYear(event) {
    const year = Number(event.currentTarget.dataset.year);
    if (!Number.isInteger(year)) return;
    const currentAnchor = parseStatsDate(this.data.statsAnchorDate) || new Date();
    const month = this.data.statsRange === "month" ? currentAnchor.getMonth() : 0;
    const anchorDate = new Date(year, month, 1, 12);
    this.setData({
      statsAnchorDate: anchorDate.toISOString(),
      statsCalendarOpen: false,
      statsCalendarYear: year,
      statsCalendarMonth: month + 1
    }, () => this.refreshDerived());
  },

  selectStatsCalendarDate(event) {
    const dateKey = normalizeLogDateFilter(event.currentTarget.dataset.date);
    if (!dateKey) return;
    const [year, month, day] = dateKey.split("-").map(Number);
    const anchorDate = new Date(year, month - 1, day, 12);
    this.setData({
      statsAnchorDate: anchorDate.toISOString(),
      statsCalendarOpen: false,
      statsCalendarYear: year,
      statsCalendarMonth: month
    }, () => this.refreshDerived());
  },

  setBeanStockMode(event) {
    const mode = event.currentTarget.dataset.mode;
    if (!["active", "empty"].includes(mode)) return;
    this.setData({
      beanStockMode: mode,
      expandedBeanId: "",
      activeBeanActionId: "",
      beanSwipeMovingId: "",
      beanSwipeStyle: ""
    });
    this.refreshDerived();
  },

  setRecipeLibraryMode(event) {
    const mode = event.currentTarget.dataset.mode;
    if (!["custom", "preset"].includes(mode) || mode === this.data.recipeLibraryMode) return;
    this.navigateWithContentScroll({
      recipeLibraryMode: mode,
      expandedRecipeId: "",
      activeRecipeActionId: "",
      recipeSwipeMovingId: "",
      recipeSwipeStyle: ""
    }, {}, () => this.refreshDerived());
  },

  onBeanTouchStart(event) {
    if (this.edgeBackGesture || this.edgeBackOwnsTouch) return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    const id = event.currentTarget.dataset.id || "";
    if (!id) return;
    this.beanTouchGesture = {
      id,
      startX: touch.clientX,
      startY: touch.clientY,
      startOpen: this.data.activeBeanActionId === id,
      actionWidth: this.getBeanActionWidth(id),
      direction: "",
      lastOffset: null
    };
  },

  onBeanTouchMove(event) {
    if (this.edgeBackOwnsTouch) return;
    const touch = event.touches && event.touches[0];
    const id = event.currentTarget.dataset.id || "";
    const gesture = this.beanTouchGesture;
    if (!touch || !id || !gesture || gesture.id !== id) return;
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const distanceX = Math.abs(deltaX);
    const distanceY = Math.abs(deltaY);
    if (!gesture.direction) {
      if (distanceX < 8 && distanceY < 8) return;
      if (distanceY >= distanceX) {
        gesture.direction = "vertical";
        return;
      }
      if (distanceX < distanceY * 1.35) return;
      gesture.direction = "horizontal";
    }
    // Let a gesture that turns downward resume the parent scroll-view, including
    // when this row was already open before the user started dragging.
    if (gesture.direction === "horizontal" && distanceY > 16 && distanceY > distanceX * 1.25) {
      gesture.direction = "vertical";
      gesture.lastOffset = null;
      if (this.data.beanSwipeMovingId === id) {
        this.setData({
          beanSwipeMovingId: "",
          beanSwipeStyle: "",
          beanSwipeTapLocked: false
        });
      }
      return;
    }
    if (gesture.direction !== "horizontal") return;
    const actionWidth = gesture.actionWidth;
    const startOffset = gesture.startOpen ? -actionWidth : 0;
    const offset = Math.min(0, Math.max(-actionWidth, startOffset + pxToRpx(deltaX)));
    const roundedOffset = round(offset);
    if (gesture.lastOffset === roundedOffset) return;
    gesture.lastOffset = roundedOffset;
    this.setData({
      activeBeanActionId: gesture.startOpen ? id : "",
      beanSwipeMovingId: id,
      beanSwipeTapLocked: true,
      beanSwipeStyle: `transform:translateX(${roundedOffset}rpx);transition:none;will-change:transform;`
    });
  },

  onBeanTouchEnd(event) {
    if (this.edgeBackOwnsTouch) {
      this.beanTouchGesture = null;
      this.setData({
        beanSwipeMovingId: "",
        beanSwipeStyle: "",
        beanSwipeTapLocked: false
      });
      return;
    }
    const touch = (event.changedTouches && event.changedTouches[0]) || null;
    const id = event.currentTarget.dataset.id || "";
    const gesture = this.beanTouchGesture;
    this.beanTouchGesture = null;
    if (!touch || !id || !gesture || gesture.id !== id) {
      this.setData({
        beanSwipeMovingId: "",
        beanSwipeStyle: "",
        beanSwipeTapLocked: false
      });
      return;
    }
    if (gesture.direction !== "horizontal") {
      if (this.data.beanSwipeMovingId === id || this.data.beanSwipeTapLocked) {
        this.setData({
          beanSwipeMovingId: "",
          beanSwipeStyle: "",
          beanSwipeTapLocked: false
        });
      }
      return;
    }
    const deltaX = touch.clientX - gesture.startX;
    const actionWidth = gesture.actionWidth;
    const startOffset = gesture.startOpen ? -actionWidth : 0;
    const offset = Math.min(0, Math.max(-actionWidth, startOffset + pxToRpx(deltaX)));
    const shouldOpen = gesture.startOpen
      ? offset <= -(actionWidth - BEAN_SWIPE_TRIGGER)
      : offset <= -BEAN_SWIPE_TRIGGER;
    this.setData({
      activeBeanActionId: shouldOpen ? id : "",
      beanSwipeMovingId: "",
      beanSwipeStyle: "",
      beanSwipeTapLocked: true
    });
    setTimeout(() => {
      if (this.data.beanSwipeTapLocked) this.setData({ beanSwipeTapLocked: false });
    }, 120);
  },

  getBeanActionWidth(id) {
    const bean = this.data.displayBeanCards.find((item) => item.id === id)
      || this.data.beans.find((item) => item.id === id);
    return bean && (bean.isEmpty || (Number(bean.remainingWeight) || 0) <= 0)
      ? BEAN_ACTION_WIDTH_EMPTY
      : BEAN_ACTION_WIDTH_ACTIVE;
  },

  openBrewFlow(event) {
    const requestedBeanId = String(
      event && event.currentTarget && event.currentTarget.dataset
        ? event.currentTarget.dataset.id || ""
        : ""
    );
    const selectedBeanId = requestedBeanId && this.data.beans.some((bean) => (
      bean.id === requestedBeanId && (Number(bean.remainingWeight) || 0) > 0
    ))
      ? requestedBeanId
      : "";
    if (requestedBeanId && !selectedBeanId) {
      this.toast("这包豆子已空袋，无法开始冲煮");
      return;
    }
    if (selectedBeanId && this.getBottomTabKey() === "beans") {
      this.rememberBottomTabPageState("beans");
    }
    this.stopTimer();
    this.navigateWithContentScroll({
      activeTab: "brew",
      brewHomeVisible: false,
      brewFlowActive: true,
      resumeBrewFlowOnHome: false,
      brewStep: 1,
      selectedBeanId,
      selectedDripper: "",
      brewForm: freshBrewForm(),
      brewRecipeSourceId: "",
      brewRecipeSourceName: "",
      quickBeanForm: freshBeanForm(),
      beanMode: "existing",
      overviewBeanPickerOpen: false,
      dripperDeleteMode: false,
      showCustomDripperForm: false,
      selectedLogId: "",
      activeLogActionId: "",
      logSwipeMovingId: "",
      logSwipeStyle: "",
      timerElapsed: 0,
      timerRunning: false,
      timerFinished: false,
      timerCountdown: 0
    }, { scrollTop: 0 }, () => this.refreshDerived());
    if (selectedBeanId) this.persist();
  },

  tapLogWalletCard(event) {
    const id = event.currentTarget.dataset.id || "";
    if (id === this.data.logWalletOpenId || this.data.logSwipeTapLocked || this.data.activeLogActionId) {
      this.openBrewLogDetail(event);
      return;
    }
    this.openWalletCard("log", id, { expandedLogId: id });
  },

  toggleRecipeDetailMore() {
    this.setData({ recipeDetailMoreOpen: !this.data.recipeDetailMoreOpen });
  },

  toggleLogDetailMore() {
    this.setData({ logDetailMoreOpen: !this.data.logDetailMoreOpen });
  },

  openBrewLogDetail(event) {
    if (this.data.logSwipeTapLocked) {
      this.setData({ logSwipeTapLocked: false });
      return;
    }
    if (this.data.activeLogActionId) {
      this.setData({
        activeLogActionId: "",
        logSwipeMovingId: "",
        logSwipeStyle: ""
      });
      return;
    }
    const id = event.currentTarget.dataset.id || "";
    const log = this.data.logs.find((item) => item.id === id);
    const bean = log ? this.data.beans.find((item) => item.id === log.beanId) : null;
    this.navigateWithContentScroll({
      selectedLogId: id,
      logDetailMoreOpen: false,
      selectedLogEditMode: false,
      selectedLogEditForm: buildLogEditForm(log, bean)
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  editBrewLog(event) {
    const id = event.currentTarget.dataset.id || "";
    const log = this.data.logs.find((item) => item.id === id);
    const bean = log ? this.data.beans.find((item) => item.id === log.beanId) : null;
    if (!log) return;
    this.navigateWithContentScroll({
      selectedLogId: id,
      selectedLogEditMode: true,
      selectedLogEditForm: buildLogEditForm(log, bean),
      activeLogActionId: "",
      logSwipeMovingId: "",
      logSwipeStyle: ""
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  onLogTouchStart(event) {
    if (this.edgeBackGesture || this.edgeBackOwnsTouch) return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    const id = event.currentTarget.dataset.id || "";
    if (!id) return;
    this.logTouchGesture = {
      id,
      startX: touch.clientX,
      startY: touch.clientY,
      startOpen: this.data.activeLogActionId === id,
      direction: "",
      lastOffset: null
    };
  },

  onLogTouchMove(event) {
    if (this.edgeBackOwnsTouch) return;
    const touch = event.touches && event.touches[0];
    const id = event.currentTarget.dataset.id || "";
    const gesture = this.logTouchGesture;
    if (!touch || !id || !gesture || gesture.id !== id) return;
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const distanceX = Math.abs(deltaX);
    const distanceY = Math.abs(deltaY);
    if (!gesture.direction) {
      if (distanceX < 8 && distanceY < 8) return;
      if (distanceY >= distanceX) {
        gesture.direction = "vertical";
        return;
      }
      if (distanceX < distanceY * 1.35) return;
      gesture.direction = "horizontal";
    }
    // A diagonal touch can begin horizontally and then turn into an intentional
    // vertical scroll. Stop pushing style updates across the bridge in that case.
    if (gesture.direction === "horizontal" && distanceY > 16 && distanceY > distanceX * 1.25) {
      gesture.direction = "vertical";
      gesture.lastOffset = null;
      if (this.data.logSwipeMovingId === id) {
        this.setData({
          logSwipeMovingId: "",
          logSwipeStyle: "",
          logSwipeTapLocked: false
        });
      }
      return;
    }
    if (gesture.direction !== "horizontal") return;
    const startOffset = gesture.startOpen ? -LOG_ACTION_WIDTH : 0;
    const offset = Math.min(0, Math.max(-LOG_ACTION_WIDTH, startOffset + pxToRpx(deltaX)));
    const roundedOffset = round(offset);
    if (gesture.lastOffset === roundedOffset) return;
    gesture.lastOffset = roundedOffset;
    this.setData({
      activeLogActionId: gesture.startOpen ? id : "",
      logSwipeMovingId: id,
      logSwipeTapLocked: true,
      logSwipeStyle: `transform:translateX(${roundedOffset}rpx);transition:none;will-change:transform;`
    });
  },

  onLogTouchEnd(event) {
    if (this.edgeBackOwnsTouch) {
      this.logTouchGesture = null;
      this.setData({
        logSwipeMovingId: "",
        logSwipeStyle: "",
        logSwipeTapLocked: false
      });
      return;
    }
    const touch = (event.changedTouches && event.changedTouches[0]) || null;
    const id = event.currentTarget.dataset.id || "";
    const gesture = this.logTouchGesture;
    this.logTouchGesture = null;
    if (!touch || !id || !gesture || gesture.id !== id) {
      this.setData({
        logSwipeMovingId: "",
        logSwipeStyle: "",
        logSwipeTapLocked: false
      });
      return;
    }
    if (gesture.direction !== "horizontal") {
      if (this.data.logSwipeMovingId === id || this.data.logSwipeTapLocked) {
        this.setData({
          logSwipeMovingId: "",
          logSwipeStyle: "",
          logSwipeTapLocked: false
        });
      }
      return;
    }
    const deltaX = touch.clientX - gesture.startX;
    const startOffset = gesture.startOpen ? -LOG_ACTION_WIDTH : 0;
    const offset = Math.min(0, Math.max(-LOG_ACTION_WIDTH, startOffset + pxToRpx(deltaX)));
    const shouldOpen = gesture.startOpen
      ? offset <= -(LOG_ACTION_WIDTH - LOG_SWIPE_TRIGGER)
      : offset <= -LOG_SWIPE_TRIGGER;
    this.setData({
      activeLogActionId: shouldOpen ? id : "",
      logSwipeMovingId: "",
      logSwipeStyle: "",
      logSwipeTapLocked: true
    });
    setTimeout(() => {
      if (this.data.logSwipeTapLocked) this.setData({ logSwipeTapLocked: false });
    }, 120);
  },

  closeBrewLogDetail() {
    this.navigateWithContentScroll({
      selectedLogId: "",
      selectedLogEditMode: false,
      selectedLogEditForm: {}
    }, {}, () => this.refreshDerived());
  },

  onLogEditInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`selectedLogEditForm.${field}`]: event.detail.value });
  },

  saveLogEdit() {
    const committed = this.commitLogEditForm(false);
    if (committed === false) return;
    this.navigateWithContentScroll({
      selectedLogId: "",
      selectedLogEditMode: false
    }, {}, () => {
      this.refreshDerived();
      this.toast("记录已修改");
    });
  },

  commitLogEditForm(refresh = true) {
    if (!this.data.selectedLogEditMode || !this.data.selectedLogId) return true;
    const form = this.data.selectedLogEditForm || {};
    const logs = this.data.logs.map((log) => {
      if (log.id !== this.data.selectedLogId) return log;
      return normalizeLog({
        ...log,
        beanName: form.beanName,
        country: form.country,
        origin: form.origin,
        process: form.process,
        roaster: form.roaster,
        roastDate: form.roastDate,
        dripper: form.dripper,
        grinder: form.grinder,
        grindSize: form.grindSize,
        grind: [form.grinder, form.grindSize].filter(Boolean).join(" "),
        dose: form.dose,
        water: form.water,
        temperature: form.temperature,
        waterQuality: form.waterQuality,
        filterPaper: form.filterPaper,
        sieve: form.sieve,
        screenSize: form.screenSize,
        tds: form.tds,
        extractionRate: form.extractionRate,
        rating: form.rating,
        tasting: normalizeFlavorScores(form.flavorScores, 0),
        notes: form.notes
      });
    });
    this.setData({
      logs,
      selectedLogEditMode: false
    });
    this.persist();
    if (refresh) this.refreshDerived();
    return true;
  },

  goBrewStep(event) {
    const step = Number(event.currentTarget.dataset.step);
    if (step === 2) return;
    this.setBrewStep(step);
  },

  setBrewStep(step) {
    const next = Math.max(0, Math.min(4, step));
    if (this.data.brewStep !== 2 && next === 2) {
      this.parameterEditSnapshot = this.clonePageStateValue(this.data.brewForm);
    }
    if (this.data.brewStep === 3 && next !== 3) {
      this.stopTimer();
      this.setData({ timerCountdown: 0, timerRunning: false });
    }
    const patch = {
      brewHomeVisible: false,
      brewFlowActive: true,
      brewStep: next,
      parameterKeyboardHeight: 0,
      parameterKeyboardInset: 0
    };
    if (this.data.brewStep === 2 && next !== 2 && this.parameterEditSnapshot) {
      patch.brewForm = this.clonePageStateValue(this.parameterEditSnapshot);
      this.parameterEditSnapshot = null;
    }
    if (next !== 0) {
      patch.dripperDeleteMode = false;
    }
    if (next !== 1) patch.overviewBeanPickerOpen = false;
    const navigationOptions = this.data.brewStep !== 2 && next === 2
      ? { scrollTop: 0 }
      : {};
    this.navigateWithContentScroll(patch, navigationOptions, () => this.refreshDerived());
  },

  discardParameterEditDraft() {
    if (!this.parameterEditSnapshot) return false;
    const brewForm = this.clonePageStateValue(this.parameterEditSnapshot);
    this.parameterEditSnapshot = null;
    this.setData({
      brewForm,
      parameterKeyboardHeight: 0,
      parameterKeyboardInset: 0
    });
    return true;
  },

  saveParameterAdjustments() {
    const brewForm = normalizeBrewDraftForm(this.data.brewForm);
    this.parameterEditSnapshot = null;
    this.navigateWithContentScroll({
      brewForm,
      brewStep: 1,
      parameterKeyboardHeight: 0,
      parameterKeyboardInset: 0
    }, {}, () => {
      this.persist();
      this.refreshDerived();
      this.toast("参数修改已保存");
    });
  },

  handleBrewBack() {
    if (this.data.overviewBeanPickerOpen) {
      this.navigateWithContentScroll(
        { overviewBeanPickerOpen: false, beanMode: "existing" },
        {},
        () => this.refreshDerived()
      );
      return;
    }
    if (this.data.brewStep === 0) {
      this.setData({
        dripperDeleteMode: false,
        showCustomDripperForm: false
      });
      this.setBrewStep(1);
      return;
    }
    if (this.data.brewStep === 1) {
      this.stopTimer();
      this.navigateWithContentScroll({
        brewHomeVisible: true,
        brewFlowActive: false,
        resumeBrewFlowOnHome: false,
        homeView: "dashboard",
        brewStep: 1,
        dripperDeleteMode: false,
        showCustomDripperForm: false,
        selectedBeanId: "",
        selectedDripper: "",
        brewForm: freshBrewForm(),
        brewRecipeSourceId: "",
        brewRecipeSourceName: "",
        quickBeanForm: freshBeanForm(),
        beanMode: "existing",
        overviewBeanPickerOpen: false,
        timerElapsed: 0,
        timerRunning: false,
        timerFinished: false,
        timerCountdown: 0
      }, {}, () => this.refreshDerived());
      this.persist();
      return;
    }
    if (this.data.brewStep === 3) {
      this.setBrewStep(1);
      return;
    }
    if (this.data.brewStep === 4) {
      this.resetBrewForm();
      return;
    }
    this.setBrewStep(this.data.brewStep - 1);
  },

  resetBrewForm() {
    this.stopTimer();
    this.navigateWithContentScroll({
      brewForm: freshBrewForm(),
      brewRecipeSourceId: "",
      brewRecipeSourceName: "",
      quickBeanForm: freshBeanForm(),
      beanMode: "existing",
      brewHomeVisible: true,
      brewFlowActive: false,
      resumeBrewFlowOnHome: false,
      homeView: "dashboard",
      brewStep: 0,
      selectedLogId: "",
      timerElapsed: 0,
      timerRunning: false,
      timerFinished: false,
      timerCountdown: 0,
      overviewBeanPickerOpen: false
    }, {}, () => this.refreshDerived());
    this.toast("已重置冲煮表单");
  },

  setBeanMode(event) {
    this.setData({ beanMode: event.currentTarget.dataset.mode });
  },

  // Tapping a card opens it; tapping the open card uses that bean, like the recipe library.
  tapPickerWalletCard(event) {
    const id = event.currentTarget.dataset.id || "";
    if (id === this.data.pickerWalletOpenId) {
      this.selectBeanForBrew(event);
      return;
    }
    this.openWalletCard("picker", id, { expandedPickerBeanId: id });
  },

  selectBeanForBrew(event) {
    this.navigateWithContentScroll({
      selectedBeanId: event.currentTarget.dataset.id,
      overviewBeanPickerOpen: false
    }, {}, () => this.refreshDerived());
    this.persist();
    if (this.data.brewStep === 0) this.setBrewStep(1);
  },

  returnToDripperSelection() {
    this.setBrewStep(0);
  },

  openBeanPickerPage() {
    this.navigateWithContentScroll(
      {
        overviewBeanPickerOpen: true,
        beanMode: "existing",
        expandedPickerBeanId: ""
      },
      { scrollTop: 0 },
      () => this.refreshDerived()
    );
  },

  openParameterAdjust() {
    this.setBrewStep(2);
  },

  openRecipeQuickImport() {
    const recipeLibraryMode = this.data.brewRecipeSourceId && isPresetRecipeId(this.data.brewRecipeSourceId)
      ? "preset"
      : "custom";
    if (!this.contentScrollPositions) this.contentScrollPositions = Object.create(null);
    this.contentScrollPositions[`recipes:quick:list:${recipeLibraryMode}`] = 0;
    this.navigateWithContentScroll({
      activeTab: "recipes",
      recipesReturnTarget: {
        activeTab: "brew",
        homeView: this.data.homeView,
        brewHomeVisible: false,
        brewStep: 1
      },
      recipesView: "list",
      recipeLibraryMode,
      recipeQuickImportMode: true,
      expandedRecipeId: "",
      editingRecipeId: "",
      selectedRecipeId: "",
      activeRecipeActionId: "",
      recipeSwipeMovingId: "",
      recipeSwipeStyle: "",
      recipeSwipeTapLocked: false,
      parameterKeyboardHeight: 0,
      parameterKeyboardInset: 0
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  clearRecipeQuickImport() {
    if (!this.data.brewRecipeSourceId) return;
    this.stopTimer();
    this.setData({
      brewRecipeSourceId: "",
      brewRecipeSourceName: "",
      brewForm: freshBrewForm(),
      timerElapsed: 0,
      timerRunning: false,
      timerFinished: false,
      timerCountdown: 0
    }, () => {
      this.persist();
      this.refreshDerived();
      this.toast("已清除方案，参数已恢复默认");
    });
  },

  openCustomDripperForm() {
    this.setData({
      showCustomDripperForm: true,
      customDripperName: "",
      dripperDeleteMode: false
    });
  },

  cancelCustomDripperForm() {
    this.setData({
      showCustomDripperForm: false,
      customDripperName: ""
    });
    this.toast("已取消新增");
  },

  onCustomDripperInput(event) {
    this.setData({ customDripperName: event.detail.value });
  },

  saveCustomDripper() {
    const name = this.data.customDripperName.trim();
    if (!name) {
      this.toast("请输入滤杯名称");
      return;
    }
    const drippers = mergeUnique(this.data.drippers, [name]);
    this.setData({
      drippers,
      selectedDripper: name,
      showCustomDripperForm: false,
      customDripperName: "",
      dripperDeleteMode: false
    });
    this.persist();
    this.refreshDerived();
    this.toast("已保存自定义滤杯，请选择滤杯");
  },

  startDripperDeleteMode() {
    const hasCustomDripper = this.data.drippers.some((name) => !DEFAULT_DRIPPERS.includes(name));
    if (!hasCustomDripper) {
      this.setData({ dripperDeleteMode: false });
      this.toast("暂无可删除的自定义滤杯");
      return;
    }
    this.setData({
      dripperDeleteMode: true,
      showCustomDripperForm: false,
      customDripperName: ""
    });
    this.toast("点击滤杯上的减号删除");
  },

  cancelDripperDeleteMode() {
    this.setData({ dripperDeleteMode: false });
    this.toast("已取消删除");
  },

  toggleDripperDeleteMode() {
    if (this.data.dripperDeleteMode) {
      this.cancelDripperDeleteMode();
      return;
    }
    this.startDripperDeleteMode();
  },

  deleteDripper(event) {
    const name = event.currentTarget.dataset.name;
    if (DEFAULT_DRIPPERS.includes(name)) {
      this.toast("预设滤杯不能删除");
      return;
    }
    const drippers = this.data.drippers.filter((dripper) => dripper !== name);
    const nextDrippers = drippers.length ? drippers : DEFAULT_DRIPPERS;
    this.setData({
      drippers: nextDrippers,
      selectedDripper: this.data.selectedDripper === name ? nextDrippers[0] : this.data.selectedDripper,
      dripperDeleteMode: false
    });
    this.persist();
    this.refreshDerived();
  },

  selectDripper(event) {
    if (this.data.dripperDeleteMode) return;
    this.setData({
      selectedDripper: event.currentTarget.dataset.name,
      overviewBeanPickerOpen: false
    });
    this.persist();
    this.refreshDerived();
    this.setBrewStep(1);
  },

  onDoseInput(event) {
    const dose = event.detail.value;
    const ratio = Number(this.data.brewForm.ratio) || 0;
    const water = round((Number(dose) || 0) * ratio);
    const waterText = String(water);
    this.setData({
      "brewForm.dose": dose,
      "brewForm.water": waterText,
      "brewForm.stages": alignFinalStageWater(this.data.brewForm.stages, waterText),
      ratioDisplay: formatRatioDisplay(dose, water, ratio),
      ratioPickerIndex: Math.max(0, RATIO_VALUES.indexOf(ratio))
    });
  },

  onWaterInput(event) {
    const water = event.detail.value;
    const exactRatio = getExactRatio(this.data.brewForm.dose, water);
    const patch = { "brewForm.water": water };
    if (exactRatio !== null) patch["brewForm.ratio"] = exactRatio;
    const ratio = exactRatio !== null ? exactRatio : this.data.brewForm.ratio;
    patch.ratioDisplay = formatRatioDisplay(this.data.brewForm.dose, water, ratio);
    patch.ratioPickerIndex = Math.max(0, RATIO_VALUES.indexOf(Number(ratio)));
    patch["brewForm.stages"] = alignFinalStageWater(this.data.brewForm.stages, water);
    this.setData(patch);
  },

  onBrewInput(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.detail.value;
    const patch = { [`brewForm.${field}`]: value };
    if (field === "temperature") {
      const previousTemperature = String(this.data.brewForm.temperature || "");
      patch["brewForm.stages"] = decorateStages(this.data.brewForm.stages).map((stage) => {
        const stageTemperature = String(stage.temperature || "");
        return {
          ...stage,
          temperature: !stageTemperature || stageTemperature === previousTemperature
            ? value
            : stageTemperature
        };
      });
    }
    if (field === "water") {
      patch["brewForm.stages"] = alignFinalStageWater(this.data.brewForm.stages, value);
    }
    if (field === "totalTime") {
      const totalSeconds = parseTimeToSeconds(value);
      if (totalSeconds) patch["brewForm.stages"] = scaleStagesToTotal(this.data.brewForm.stages, totalSeconds);
    }
    this.setData(patch);
  },

  // − / + on the parameter page: dose moves in 0.5g, temperature in 1°C, both
  // routed through the normal input handlers so water and stages stay in sync.
  stepBrewParam(event) {
    const { field } = event.currentTarget.dataset;
    const delta = Number(event.currentTarget.dataset.delta) || 0;
    const current = Number(this.data.brewForm[field]) || 0;
    if (field === "dose") {
      const dose = Math.max(0, Math.round((current + delta) * 10) / 10);
      this.onDoseInput({ detail: { value: String(dose) } });
      return;
    }
    if (field === "temperature") {
      const temperature = Math.max(0, Math.min(100, Math.round(current + delta)));
      this.onBrewInput({ currentTarget: { dataset: { field } }, detail: { value: String(temperature) } });
    }
  },

  applyRecentGrind(event) {
    const preset = (this.data.recentGrindPresets || [])[Number(event.currentTarget.dataset.index)];
    if (!preset) return;
    this.setData({
      "brewForm.grinder": preset.grinder,
      "brewForm.grind": preset.grind
    });
  },

  toggleParamMore() {
    this.setData({ paramMoreOpen: !this.data.paramMoreOpen });
  },

  setBrewSieve(event) {
    const value = event.currentTarget.dataset.value;
    this.setData({ "brewForm.sieve": this.data.brewForm.sieve === value ? "" : value });
  },

  // Steps are deleted by swiping the card left, like the other lists.
  onStageTouchStart(event) {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    this.stageTouch = { index: Number(event.currentTarget.dataset.index), x: touch.clientX, y: touch.clientY };
  },

  onStageTouchEnd(event) {
    const start = this.stageTouch;
    this.stageTouch = null;
    const touch = event.changedTouches && event.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const next = dx < 0 ? start.index : -1;
    if (next !== this.data.stageActionIndex) this.setData({ stageActionIndex: next });
  },

  // Same − / + steps as the brew parameter page, for the recipe editor.
  stepRecipeParam(event) {
    const { field } = event.currentTarget.dataset;
    const delta = Number(event.currentTarget.dataset.delta) || 0;
    const current = Number(this.data.recipeForm[field]) || 0;
    if (field === "dose") {
      const dose = Math.max(0, Math.round((current + delta) * 10) / 10);
      this.onRecipeDoseInput({ currentTarget: { dataset: { scope: "recipeForm" } }, detail: { value: String(dose) } });
      return;
    }
    if (field === "temperature") {
      const temperature = Math.max(0, Math.min(100, Math.round(current + delta)));
      this.onRecipeFormInput({ currentTarget: { dataset: { field } }, detail: { value: String(temperature) } });
    }
  },

  toggleRecipeFormMore() {
    this.setData({ recipeFormMoreOpen: !this.data.recipeFormMoreOpen });
  },

  deleteRecipeStageFromSwipe(event) {
    this.setData({ stageActionIndex: -1 });
    this.deleteRecipeStage(event);
  },

  deleteStageFromSwipe(event) {
    this.setData({ stageActionIndex: -1 });
    this.deleteStage(event);
  },

  onRatioPickerChange(event) {
    const index = Number(event.detail.value) || 0;
    this.setRatioValueByIndex(index);
  },

  setRatioValueByIndex(index) {
    this.applyRatioValue(RATIO_VALUES[index] || 15);
  },

  applyRatioValue(ratio) {
    const dose = Number(this.data.brewForm.dose) || 0;
    this.setData({
      "brewForm.ratio": ratio,
      "brewForm.water": String(round(dose * ratio))
    });
    this.syncFinalStageWaterFromTotal();
    this.refreshDerived();
  },

  onParameterKeyboardHeightChange(event) {
    const height = Math.max(0, Math.round(Number(event.detail && event.detail.height) || 0));
    this.parameterKeyboardReportedHeight = height;
    if (height > 0) {
      this.scheduleParameterInputReveal(140);
      return;
    }

    if (this.parameterInputRevealTimer) {
      clearTimeout(this.parameterInputRevealTimer);
      this.parameterInputRevealTimer = null;
    }
    this.parameterFocusedInputId = "";
    if (this.data.parameterKeyboardHeight || this.data.parameterKeyboardInset) {
      this.setData({
        parameterKeyboardHeight: 0,
        parameterKeyboardInset: 0
      });
    }
  },

  onParameterInputFocus(event) {
    if (this.parameterInputBlurTimer) {
      clearTimeout(this.parameterInputBlurTimer);
      this.parameterInputBlurTimer = null;
    }
    const inputId = String(event.currentTarget.id || "");
    const cursorPosition = String(event.detail && event.detail.value !== undefined ? event.detail.value : "").length;
    this.parameterFocusedInputId = inputId;
    if (cursorPosition !== this.data.parameterInputCursor) {
      this.setData({ parameterInputCursor: cursorPosition });
    }
    if (!inputId) return;

    if (this.data.parameterKeyboardHeight > 0 || this.parameterKeyboardReportedHeight > 0) {
      this.scheduleParameterInputReveal(60);
      return;
    }

    try {
      const windowInfo = wx.getWindowInfo
        ? wx.getWindowInfo()
        : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {});
      this.parameterViewportBottom = Math.max(
        Number(this.parameterViewportBottom) || 0,
        Number(windowInfo.windowHeight) || 0
      );
    } catch (error) {
      // Keep the pre-keyboard viewport captured during onLoad as the fallback.
    }
  },

  onParameterInputBlur() {
    if (this.parameterInputBlurTimer) clearTimeout(this.parameterInputBlurTimer);
    this.parameterInputBlurTimer = setTimeout(() => {
      this.parameterInputBlurTimer = null;
      this.parameterFocusedInputId = "";
      if (this.data.parameterInputCursor !== -1) this.setData({ parameterInputCursor: -1 });
    }, 120);
  },

  scheduleParameterInputReveal(delay = 100) {
    if (this.parameterInputRevealTimer) clearTimeout(this.parameterInputRevealTimer);
    const schedule = () => {
      this.parameterInputRevealTimer = setTimeout(() => {
        this.parameterInputRevealTimer = null;
        this.settleParameterKeyboardLayout();
      }, delay);
    };
    if (wx.nextTick) {
      wx.nextTick(schedule);
    } else {
      schedule();
    }
  },

  settleParameterKeyboardLayout() {
    const inputId = this.parameterFocusedInputId;
    const keyboardHeight = Math.max(0, Number(this.parameterKeyboardReportedHeight) || 0);
    if (!inputId || keyboardHeight <= 0) return;

    const query = wx.createSelectorQuery().in(this);
    query.select(".content").boundingClientRect();
    query.exec((rects) => {
      if (this.parameterFocusedInputId !== inputId || !Array.isArray(rects)) return;
      const contentRect = rects[0];
      if (!contentRect) return;

      const contentBottom = Number(contentRect.bottom) || 0;
      const viewportBottom = Math.max(
        Number(this.parameterViewportBottom) || 0,
        contentBottom
      );
      this.parameterViewportBottom = viewportBottom;
      const keyboardTop = viewportBottom - keyboardHeight;
      const keyboardInset = Math.max(
        0,
        Math.min(keyboardHeight, Math.round(contentBottom - keyboardTop))
      );
      const patch = {};
      if (this.data.parameterKeyboardHeight !== keyboardHeight) {
        patch.parameterKeyboardHeight = keyboardHeight;
      }
      if (this.data.parameterKeyboardInset !== keyboardInset) {
        patch.parameterKeyboardInset = keyboardInset;
      }
      const reveal = () => this.revealFocusedParameterInput();
      if (Object.keys(patch).length) {
        this.setData(patch, () => {
          if (wx.nextTick) wx.nextTick(reveal);
          else setTimeout(reveal, 0);
        });
      } else {
        reveal();
      }
    });
  },

  revealFocusedParameterInput() {
    const inputId = this.parameterFocusedInputId;
    const keyboardHeight = Math.max(
      0,
      Number(this.parameterKeyboardReportedHeight) || Number(this.data.parameterKeyboardHeight) || 0
    );
    if (!inputId || keyboardHeight <= 0) return;

    let stageRowSelector = "";
    let stageMatch = inputId.match(/^parameter-stage-(?:water|temperature|duration|name)-(\d+)$/);
    if (stageMatch) {
      stageRowSelector = `#stage-editor-row-${stageMatch[1]}`;
    } else {
      stageMatch = inputId.match(/^recipe-stage-(?:water|temperature|duration|name)-(\d+)$/);
      if (stageMatch) stageRowSelector = `#recipe-stage-editor-row-${stageMatch[1]}`;
    }

    const query = wx.createSelectorQuery().in(this);
    query.select(".content").boundingClientRect();
    query.select(`#${inputId}`).boundingClientRect();
    if (stageRowSelector) query.select(stageRowSelector).boundingClientRect();
    query.exec((rects) => {
      if (this.parameterFocusedInputId !== inputId || !Array.isArray(rects)) return;
      const contentRect = rects[0];
      const inputRect = rects[1];
      if (!contentRect || !inputRect) return;
      const revealRect = stageRowSelector && rects[2] ? rects[2] : inputRect;

      const viewportBottom = Math.max(
        Number(this.parameterViewportBottom) || 0,
        Number(contentRect.bottom) || 0
      );
      const revealGap = 16;
      const visibleTop = Number(contentRect.top) + revealGap;
      const visibleBottom = Math.min(Number(contentRect.bottom), viewportBottom - keyboardHeight) - revealGap;
      if (visibleBottom <= visibleTop) return;

      let scrollDelta = 0;
      if (Number(revealRect.top) < visibleTop) {
        scrollDelta = Number(revealRect.top) - visibleTop;
      } else if (Number(revealRect.bottom) > visibleBottom) {
        scrollDelta = Number(revealRect.bottom) - visibleBottom;
      }
      if (Math.abs(scrollDelta) < 1) return;

      const targetScrollTop = Math.max(0, (Number(this.contentScrollOffset) || 0) + scrollDelta);
      this.setDataWithContentScroll({}, targetScrollTop);
    });
  },

  onStageEditorBlur() {
    if (this.stageEditorBlurTimer) clearTimeout(this.stageEditorBlurTimer);
    this.stageEditorBlurTimer = setTimeout(() => {
      this.stageEditorBlurTimer = null;
      this.setData({ contentScrollIntoView: "" });
    }, 120);
  },

  onStageInput(event) {
    const index = Number(event.currentTarget.dataset.index);
    const field = event.currentTarget.dataset.field;
    const stages = this.data.brewForm.stages;
    if (!stages[index]) return;
    if (field === "cumulativeWater") {
      const water = event.detail.value;
      const patch = { [`brewForm.stages[${index}].cumulativeWater`]: water };
      if (index === stages.length - 1) {
        const exactRatio = getExactRatio(this.data.brewForm.dose, water);
        const ratio = exactRatio !== null ? exactRatio : this.data.brewForm.ratio;
        patch["brewForm.water"] = water;
        patch.ratioDisplay = formatRatioDisplay(this.data.brewForm.dose, water, ratio);
        patch.ratioPickerIndex = Math.max(0, RATIO_VALUES.indexOf(Number(ratio)));
        if (exactRatio !== null) patch["brewForm.ratio"] = exactRatio;
      }
      this.setData(patch);
      return;
    } else if (field === "duration" || field === "name") {
      return event.detail.value;
    }
    this.setData({ [`brewForm.stages[${index}].${field}`]: event.detail.value });
  },

  onStageDurationBlur(event) {
    const index = Number(event.currentTarget.dataset.index);
    const stages = this.data.brewForm.stages.map((stage) => ({ ...stage }));
    if (!stages[index]) return;
    stages[index].duration = Math.max(1, Math.round(Number(event.detail.value) || 1));
    this.setData({
      "brewForm.stages": decorateStages(stages)
    });
    this.onParameterInputBlur();
    this.onStageEditorBlur();
    this.updateTotalTimeFromStages();
  },

  onStageNameBlur(event) {
    const index = Number(event.currentTarget.dataset.index);
    const stages = this.data.brewForm.stages.map((stage) => ({ ...stage }));
    if (!stages[index]) return;
    stages[index].name = String(event.detail.value || "").trim() || "未命名步骤";
    this.setData({
      "brewForm.stages": decorateStages(stages)
    });
    this.onParameterInputBlur();
    this.onStageEditorBlur();
  },

  adjustStageDuration(event) {
    const index = Number(event.currentTarget.dataset.index);
    const delta = Number(event.currentTarget.dataset.delta) || 0;
    const stages = this.data.brewForm.stages.map((stage) => ({ ...stage }));
    if (!stages[index]) return;
    stages[index].duration = Math.max(1, (Number(stages[index].duration) || 1) + delta);
    this.setData({ "brewForm.stages": decorateStages(stages) });
    this.updateTotalTimeFromStages();
  },

  deleteStage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const stages = this.data.brewForm.stages.filter((_, stageIndex) => stageIndex !== index);
    this.setData({ "brewForm.stages": alignFinalStageWater(stages, this.data.brewForm.water) });
    this.updateTotalTimeFromStages();
  },

  addStage() {
    const stages = [
      ...this.data.brewForm.stages,
      {
        id: newId("stage"),
        name: "新的步骤",
        duration: 20,
        cumulativeWater: Number(this.data.brewForm.water) || 0,
        temperature: String(this.data.brewForm.temperature || "")
      }
    ];
    this.setData({ "brewForm.stages": alignFinalStageWater(stages, this.data.brewForm.water) });
    this.updateTotalTimeFromStages();
  },

  updateTotalTimeFromStages() {
    const seconds = sum(this.data.brewForm.stages.map((stage) => stage.duration));
    this.setData({ "brewForm.totalTime": formatTime(seconds) });
    this.refreshDerived();
  },

  syncFinalStageWaterFromTotal() {
    this.setData({ "brewForm.stages": alignFinalStageWater(this.data.brewForm.stages, this.data.brewForm.water) });
  },

  startTimerStep() {
    if (!this.data.selectedDripper) {
      this.toast("请先选择滤杯");
      this.setBrewStep(0);
      return;
    }
    if (!this.data.selectedBeanId) {
      this.toast("请先选择咖啡豆");
      this.navigateWithContentScroll(
        { brewStep: 1, overviewBeanPickerOpen: true, beanMode: "existing" },
        { scrollTop: 0 },
        () => this.refreshDerived()
      );
      return;
    }
    this.resetTimer(false);
    this.setBrewStep(3);
    this.startTimerCountdown();
  },

  toggleTimer() {
    if (this.data.timerFinished) {
      this.setBrewStep(4);
      return;
    }
    if (this.data.timerCountdown > 0) {
      this.stopTimer();
      this.setData({ timerCountdown: 0 });
      return;
    }
    if (this.data.timerRunning) {
      this.stopTimer();
      this.setData({ timerRunning: false });
      return;
    }
    this.beginTimer();
  },

  beginTimer() {
    this.stopTimer();
    this.setData({ timerRunning: true });
    this.timer = setInterval(() => {
      const total = getTimerTotal(this.data.brewForm.stages, this.data.brewForm.totalTime);
      const next = Math.min(total, this.data.timerElapsed + 1);
      const stages = decorateStages(this.data.brewForm.stages);
      const currentInfo = getTimerInfo(this.data.timerElapsed, stages, this.data.brewForm.water);
      const nextInfo = getTimerInfo(next, stages, this.data.brewForm.water);
      if (next >= total) {
        this.playFinishSound();
      } else if (nextInfo.timerStageIndex > currentInfo.timerStageIndex) {
        this.playDing();
      }
      this.setData({
        timerElapsed: next,
        timerFinished: next >= total,
        timerRunning: next >= total ? false : true
      });
      if (next >= total) this.stopTimer();
      this.refreshDerived();
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.timerCountdownTimer) {
      clearInterval(this.timerCountdownTimer);
      this.timerCountdownTimer = null;
    }
  },

  resetTimer(shouldRefresh = true) {
    this.stopTimer();
    this.setData({
      timerElapsed: 0,
      timerRunning: false,
      timerFinished: false,
      timerCountdown: 0
    });
    if (shouldRefresh) this.refreshDerived();
  },

  startTimerCountdown() {
    this.stopTimer();
    this.playDing();
    this.setData({
      timerCountdown: 3,
      timerRunning: false,
      timerFinished: false
    });
    this.timerCountdownTimer = setInterval(() => {
      const next = Math.max(0, this.data.timerCountdown - 1);
      if (next > 0) {
        this.playDing();
        this.setData({ timerCountdown: next });
        return;
      }
      this.stopTimer();
      this.setData({ timerCountdown: 0 });
      this.beginTimer();
    }, 1000);
  },

  skipTimerStage() {
    const stages = decorateStages(this.data.brewForm.stages);
    const currentElapsed = this.data.timerElapsed;
    const wasRunning = this.data.timerRunning;
    const info = getTimerInfo(this.data.timerElapsed, stages, this.data.brewForm.water);
    const total = getTimerTotal(stages, this.data.brewForm.totalTime);
    const nextStage = stages[info.timerStageIndex + 1];
    const nextElapsed = nextStage ? nextStage.start : currentElapsed;
    const finishedByUser = !nextStage;
    this.setData({
      timerElapsed: nextElapsed,
      timerFinished: finishedByUser || nextElapsed >= total,
      timerRunning: wasRunning && !finishedByUser && nextElapsed < total
    });
    if (!wasRunning || finishedByUser || nextElapsed >= total) this.stopTimer();
    if (finishedByUser || nextElapsed >= total) {
      this.playFinishSound();
    } else if (nextElapsed > currentElapsed) {
      this.playDing();
    }
    this.refreshDerived();
  },

  skipPreviousTimerStage() {
    const stages = decorateStages(this.data.brewForm.stages);
    const info = getTimerInfo(this.data.timerElapsed, stages, this.data.brewForm.water);
    const previousStage = stages[Math.max(0, info.timerStageIndex - 1)];
    this.setData({
      timerElapsed: previousStage ? previousStage.start : 0,
      timerFinished: false,
      timerRunning: false
    });
    this.stopTimer();
    this.refreshDerived();
  },

  ensureAudio(cacheKey, fileName, base64Audio) {
    if (this[cacheKey]) return this[cacheKey];
    if (!wx.createInnerAudioContext || !wx.getFileSystemManager || !wx.env || !wx.env.USER_DATA_PATH) return null;
    try {
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      const fileSystem = wx.getFileSystemManager();
      let fileExists = false;
      if (fileSystem.accessSync) {
        try {
          fileSystem.accessSync(filePath);
          fileExists = true;
        } catch (error) {
          fileExists = false;
        }
      }
      if (!fileExists) fileSystem.writeFileSync(filePath, base64Audio, "base64");
      const audio = wx.createInnerAudioContext();
      audio.src = filePath;
      audio.obeyMuteSwitch = false;
      audio.volume = 1;
      if (audio.onEnded) {
        audio.onEnded(() => {
          try {
            audio.seek(0);
          } catch (error) {
            // Older base library versions can reset ended audio on the next play.
          }
        });
      }
      this[cacheKey] = audio;
      return audio;
    } catch (error) {
      return null;
    }
  },

  playAudio(audio) {
    if (audio) {
      try {
        if (audio.paused === false) {
          audio.stop();
          audio.seek(0);
        }
        audio.play();
        return;
      } catch (error) {
        // Fall through to vibration if audio playback is unavailable.
      }
    }
    if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
  },

  playDing() {
    const audioAssets = getAudioAssets();
    this.playAudio(this.ensureAudio("dingAudio", DING_AUDIO_FILE, audioAssets.DING_AUDIO_BASE64_SHORT));
  },

  playFinishSound() {
    const audioAssets = getAudioAssets();
    this.playAudio(this.ensureAudio("finishAudio", FINISH_AUDIO_FILE, audioAssets.FINISH_AUDIO_BASE64));
  },

  destroyDingAudio() {
    ["dingAudio", "finishAudio"].forEach((key) => {
      if (!this[key]) return;
      try {
        this[key].destroy();
      } catch (error) {
        // Ignore cleanup errors from older base library versions.
      }
      this[key] = null;
    });
  },

  getFlavorRadarScores(target) {
    if (target === "log") {
      const source = this.data.selectedLogEditMode
        ? this.data.selectedLogEditForm && this.data.selectedLogEditForm.flavorScores
        : this.data.selectedLogDetail && this.data.selectedLogDetail.flavorScores;
      return normalizeFlavorScores(source, 0);
    }
    return normalizeFlavorScores(this.data.brewForm && this.data.brewForm.flavorScores, 0);
  },

  updateFlavorRadarFromTouch(event, lockAxis = false) {
    const target = event.currentTarget.dataset.target === "log" ? "log" : "brew";
    if (target === "log" && !this.data.selectedLogEditMode) return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    const applyTouch = (rect) => {
      if (!rect) return;
      const x = Number(touch.clientX) - rect.left;
      const y = Number(touch.clientY) - rect.top;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const geometry = getFlavorRadarGeometry(rect.width, rect.height);
      const dx = x - geometry.centerX;
      const dy = y - geometry.centerY;
      if (!this.flavorRadarActiveAxes) this.flavorRadarActiveAxes = {};
      let axisIndex = this.flavorRadarActiveAxes[target];
      if (lockAxis || axisIndex === undefined || axisIndex === null) {
        let bestProjection = -Infinity;
        axisIndex = 0;
        geometry.axes.forEach((axis, index) => {
          const projection = dx * axis.unitX + dy * axis.unitY;
          if (projection > bestProjection) {
            bestProjection = projection;
            axisIndex = index;
          }
        });
        this.flavorRadarActiveAxes[target] = axisIndex;
      }
      const axis = geometry.axes[axisIndex];
      const projection = dx * axis.unitX + dy * axis.unitY;
      const value = normalizeFlavorScore((projection / geometry.radius) * 10, 0);
      const dataPath = target === "log"
        ? `selectedLogEditForm.flavorScores.${axis.key}`
        : `brewForm.flavorScores.${axis.key}`;
      const scores = {
        ...this.getFlavorRadarScores(target),
        [axis.key]: value
      };
      this.setData({
        [dataPath]: value,
        [target === "log" ? "logFlavorRadar" : "brewFlavorRadar"]: buildFlavorRadarView(scores)
      });
    };
    const cachedRect = this.flavorRadarRects && this.flavorRadarRects[target];
    if (cachedRect && !lockAxis) {
      applyTouch(cachedRect);
      return;
    }
    const selector = target === "log" ? "#log-flavor-radar-plot" : "#brew-flavor-radar-plot";
    wx.createSelectorQuery()
      .select(selector)
      .boundingClientRect((rect) => {
        if (!this.flavorRadarRects) this.flavorRadarRects = {};
        this.flavorRadarRects[target] = rect;
        applyTouch(rect);
      })
      .exec();
  },

  onFlavorRadarTouchStart(event) {
    this.updateFlavorRadarFromTouch(event, true);
  },

  onFlavorRadarTouchMove(event) {
    this.updateFlavorRadarFromTouch(event, false);
  },

  onFlavorRadarTouchEnd(event) {
    const target = event.currentTarget.dataset.target === "log" ? "log" : "brew";
    if (this.flavorRadarActiveAxes) delete this.flavorRadarActiveAxes[target];
  },

  onFlavorScoreInput(event) {
    const target = event.currentTarget.dataset.target === "log" ? "log" : "brew";
    const key = event.currentTarget.dataset.key;
    if (!FLAVOR_SCORE_AXES.some((axis) => axis.key === key)) return;
    const raw = String(event.detail.value || "");
    const numeric = Number(raw);
    const value = raw !== "" && Number.isFinite(numeric) && numeric > 10
      ? "10"
      : (raw !== "" && Number.isFinite(numeric) && numeric < 0 ? "0" : raw);
    const dataPath = target === "log"
      ? `selectedLogEditForm.flavorScores.${key}`
      : `brewForm.flavorScores.${key}`;
    const scores = {
      ...this.getFlavorRadarScores(target),
      [key]: value
    };
    this.setData({
      [dataPath]: value,
      [target === "log" ? "logFlavorRadar" : "brewFlavorRadar"]: buildFlavorRadarView(scores)
    });
  },

  onFlavorScoreBlur(event) {
    const target = event.currentTarget.dataset.target === "log" ? "log" : "brew";
    const key = event.currentTarget.dataset.key;
    if (!FLAVOR_SCORE_AXES.some((axis) => axis.key === key)) return;
    const value = normalizeFlavorScore(event.detail.value, 0);
    const dataPath = target === "log"
      ? `selectedLogEditForm.flavorScores.${key}`
      : `brewForm.flavorScores.${key}`;
    const scores = {
      ...this.getFlavorRadarScores(target),
      [key]: value
    };
    this.setData({
      [dataPath]: value,
      [target === "log" ? "logFlavorRadar" : "brewFlavorRadar"]: buildFlavorRadarView(scores)
    });
  },

  onRatingSelect(event) {
    const rating = normalizeRating(event.currentTarget.dataset.value);
    this.setData({
      "brewForm.rating": rating,
      brewRatingStarWidths: getRatingStarWidths(rating)
    });
  },

  onRatingInput(event) {
    const raw = String(event.detail.value || "");
    const numeric = Number(raw);
    const value = raw !== "" && Number.isFinite(numeric) && numeric > 5
      ? "5"
      : (raw !== "" && Number.isFinite(numeric) && numeric < 0 ? "0" : raw);
    this.setData({
      "brewForm.rating": value,
      brewRatingStarWidths: getRatingStarWidths(value)
    });
  },

  onRatingBlur(event) {
    const rating = normalizeRating(event.detail.value);
    this.setData({
      "brewForm.rating": rating,
      brewRatingStarWidths: getRatingStarWidths(rating)
    });
  },

  onLogRatingSelect(event) {
    const rating = normalizeRating(event.currentTarget.dataset.value);
    this.setData({
      "selectedLogEditForm.rating": rating,
      selectedLogEditRatingStarWidths: getRatingStarWidths(rating)
    });
  },

  onLogRatingInput(event) {
    const raw = String(event.detail.value || "");
    const numeric = Number(raw);
    const value = raw !== "" && Number.isFinite(numeric) && numeric > 5
      ? "5"
      : (raw !== "" && Number.isFinite(numeric) && numeric < 0 ? "0" : raw);
    this.setData({
      "selectedLogEditForm.rating": value,
      selectedLogEditRatingStarWidths: getRatingStarWidths(value)
    });
  },

  onLogRatingBlur(event) {
    const rating = normalizeRating(event.detail.value);
    this.setData({
      "selectedLogEditForm.rating": rating,
      selectedLogEditRatingStarWidths: getRatingStarWidths(rating)
    });
  },

  saveBrewLog() {
    let newBean = null;
    if (this.data.beanMode === "new") {
      newBean = this.buildBeanFromForm(this.data.quickBeanForm);
      if (!newBean) return;
    }

    const bean = newBean || this.data.beans.find((item) => item.id === this.data.selectedBeanId);
    if (!bean) {
      this.toast("请先选择咖啡豆");
      return;
    }
    const dose = Number(this.data.brewForm.dose);
    if (!dose || dose <= 0) {
      this.toast("粉量必须大于 0");
      return;
    }
    if ((Number(bean.remainingWeight) || 0) < dose) {
      this.toast("这包豆子的库存不足");
      return;
    }
    const ratio = Number(this.data.brewForm.ratio) || 0;
    const brewTotalSeconds = this.data.timerElapsed || parseTimeToSeconds(this.data.brewForm.totalTime) || 120;
    const flavorScores = normalizeFlavorScores(this.data.brewForm.flavorScores, 0);
    const log = normalizeLog({
      id: newId("log"),
      beanId: bean.id,
      beanName: bean.name,
      country: bean.country || "",
      origin: bean.origin || "",
      roaster: bean.roaster || "",
      process: bean.process || "",
      variety: bean.variety || "",
      roastDate: bean.roastDate || "",
      dripper: this.data.selectedDripper,
      dose,
      ratio,
      water: Number(this.data.brewForm.water) || round(dose * ratio),
      temperature: this.data.brewForm.temperature,
      waterQuality: this.data.brewForm.waterQuality,
      filterPaper: this.data.brewForm.filterPaper,
      grinder: this.data.brewForm.grinder,
      grindSize: this.data.brewForm.grind,
      sieve: String(this.data.brewForm.sieve || "").trim(),
      screenSize: String(this.data.brewForm.screenSize || "").trim(),
      totalTime: formatTime(brewTotalSeconds),
      stages: buildLogStages(this.data.brewForm.stages, brewTotalSeconds),
      tds: String(this.data.brewForm.tds || "").trim(),
      extractionRate: String(this.data.brewForm.extractionRate || "").trim(),
      rating: normalizeRating(this.data.brewForm.rating),
      tasting: flavorScores,
      notes: this.data.brewForm.notes.trim(),
      createdAt: new Date().toISOString()
    });

    const sourceBeans = newBean ? [newBean, ...this.data.beans] : this.data.beans;
    const beans = sourceBeans.map((item) => {
      if (item.id !== bean.id) return item;
      const remainingWeight = Math.max(0, round((Number(item.remainingWeight) || 0) - dose));
      return normalizeBean({
        ...item,
        remainingWeight,
        emptiedAt: remainingWeight <= 0 ? item.emptiedAt || log.createdAt : ""
      });
    });
    const updatedBean = beans.find((item) => item.id === bean.id);
    const beanIsEmpty = updatedBean ? (Number(updatedBean.remainingWeight) || 0) <= 0 : false;
    const nextSelectedBeanId = beanIsEmpty ? "" : bean.id;

    this.stopTimer();
    this.setData({
      beans,
      logs: [log, ...this.data.logs],
      brewForm: freshBrewForm(),
      brewRecipeSourceId: "",
      brewRecipeSourceName: "",
      quickBeanForm: freshBeanForm(),
      beanMode: "existing",
      beanStockMode: beanIsEmpty ? "empty" : this.data.beanStockMode,
      brewStep: 0,
      brewHomeVisible: true,
      brewFlowActive: false,
      resumeBrewFlowOnHome: false,
      homeView: "logs",
      activeTab: "brew",
      expandedLogId: "",
      selectedBeanId: nextSelectedBeanId,
      selectedLogId: "",
      timerElapsed: 0,
      timerRunning: false,
      timerFinished: false,
      timerCountdown: 0,
      overviewBeanPickerOpen: false
    });
    this.persist();
    this.refreshDerived();
    this.toast("冲煮记录已保存，库存已扣除");
  },

  onQuickBeanInput(event) {
    this.setData({ [`quickBeanForm.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  onQuickRoastChange(event) {
    this.setData({ "quickBeanForm.roastLevel": ROAST_LEVELS[Number(event.detail.value)] });
  },

  saveQuickBeanAndContinue() {
    const bean = this.buildBeanFromForm(this.data.quickBeanForm);
    if (!bean) return;
    this.setData({
      beans: [bean, ...this.data.beans],
      selectedBeanId: bean.id,
      quickBeanForm: freshBeanForm(),
      beanStockMode: "active",
      beanMode: "existing",
      overviewBeanPickerOpen: false
    });
    this.persist();
    this.refreshDerived();
    this.setBrewStep(1);
    this.toast("豆子已加入，可以继续准备冲煮");
  },

  buildBeanFromForm(form) {
    const weight = parseWeightValue(form.initialWeight);
    if (!String(form.name || "").trim()) {
      this.toast("请填写商品名称");
      return null;
    }
    if (!weight || weight <= 0) {
      this.toast("请填写重量");
      return null;
    }
    return normalizeBean({
      id: newId("bean"),
      name: form.name.trim(),
      roaster: String(form.roaster || "").trim(),
      country: String(form.country || "").trim(),
      origin: String(form.origin || "").trim(),
      variety: String(form.variety || "").trim(),
      process: String(form.process || "").trim(),
      flavorDescription: String(form.flavorDescription || "").trim(),
      roastLevel: String(form.roastLevel || "").trim(),
      initialWeight: weight,
      remainingWeight: weight,
      roastDate: String(form.roastDate || getTodayDateString()).trim(),
      createdAt: new Date().toISOString()
    });
  },

  startAddBean() {
    this.navigateWithContentScroll({
      beansView: "add",
      editingBeanId: "",
      beanAddReturnMode: "",
      beanForm: freshBeanForm(),
      beanOcrBusy: false,
      expandedBeanId: "",
      activeBeanActionId: "",
      beanSwipeMovingId: "",
      beanSwipeStyle: ""
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  startAddBeanFromRoasterDetail() {
    const detail = this.data.selectedRoasterBeanDetail;
    if (!detail) return;
    this.navigateWithContentScroll({
      beansView: "add",
      editingBeanId: "",
      beanAddReturnMode: "roasterDetail",
      beanForm: beanFormFromRoasterBean(detail, this.data.selectedRoasterName),
      expandedBeanId: "",
      activeBeanActionId: "",
      beanSwipeMovingId: "",
      beanSwipeStyle: ""
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  setBeansListView() {
    this.navigateWithContentScroll({
      beansView: "list",
      beanLibraryMode: "stock",
      editingBeanId: "",
      beanAddReturnMode: "",
      beanForm: freshBeanForm(),
      expandedBeanId: "",
      activeBeanActionId: "",
      beanSwipeMovingId: "",
      beanSwipeStyle: ""
    }, {}, () => this.refreshDerived());
  },

  handleBeansBack() {
    if (this.data.beansView === "add" && this.data.beanAddReturnMode === "roasterDetail") {
      this.navigateWithContentScroll({
        beansView: "roasterBeanDetail",
        beanLibraryMode: "roaster",
        beanShelfMode: "roaster",
        editingBeanId: "",
        beanAddReturnMode: "",
        beanForm: freshBeanForm(),
        expandedBeanId: "",
        activeBeanActionId: "",
        beanSwipeMovingId: "",
        beanSwipeStyle: ""
      }, {}, () => this.refreshDerived());
      return;
    }
    if (
      this.data.beansView === "roasterBeanDetail"
      && this.data.selectedRoasterName
    ) {
      this.setDataWithContentScroll({
        beansView: "roasterBeans",
        beanLibraryMode: "roaster",
        selectedRoasterBeanId: "",
        selectedRoasterBeanName: "",
        beansTitle: this.data.selectedRoasterName
      }, this.roasterBeansReturnScrollTop);
      return;
    }
    if (this.data.beansView === "roasterBeans") {
      this.setDataWithContentScroll({
        beansView: "list",
        beanLibraryMode: "roaster",
        selectedRoasterName: "",
        selectedRoasterBeanId: "",
        selectedRoasterBeanName: "",
        selectedRoasterBeanDetail: null,
        displayRoasterBeans: [],
        roasterBeanSearchQuery: "",
        roasterBeanFilters: freshRoasterBeanFilters(),
        roasterBeanFilterGroups: [],
        roasterBeanActiveFilterCount: 0,
        roasterBeanSearchFilterOpen: false,
        beansTitle: "豆仓"
      }, this.roasterCatalogReturnScrollTop);
      return;
    }
    this.setBeansListView();
  },

  toggleBeanDetail(event) {
    const id = event.currentTarget.dataset.id;
    if (this.data.beanSwipeTapLocked) {
      this.setData({ beanSwipeTapLocked: false });
      return;
    }
    if (this.data.activeBeanActionId) {
      this.setData({
        activeBeanActionId: "",
        beanSwipeMovingId: "",
        beanSwipeStyle: ""
      });
      return;
    }
    const cards = this.data.displayBeanCards || [];
    // Like the recipe library: tapping the open card acts on it (start a brew),
    // tapping any other card opens it.
    const openCard = id === this.data.beanWalletOpenId ? cards.find((card) => card.id === id) : null;
    if (openCard && !openCard.isEmpty) {
      this.openBrewFlow(event);
      return;
    }
    const expandedBeanId = this.data.expandedBeanId === id ? "" : id;
    this.openWalletCard("bean", expandedBeanId || (cards.length ? cards[cards.length - 1].id : ""), {
      expandedBeanId
    });
  },

  // The page header is already sticky; the switch / filter bar under it sticks
  // just below, so it needs the header's rendered height.
  measureWalletStickyTop() {
    wx.createSelectorQuery().in(this)
      .selectAll("#page-content .panel-header, #page-content .bean-catalog-header").boundingClientRect()
      .exec(([headers] = []) => {
        const header = (headers || []).filter((rect) => rect && rect.height > 0).pop();
        const height = header ? Math.round(header.height) : 0;
        if (height !== this.data.walletStickyTop) this.setData({ walletStickyTop: height });
      });
  },

  // Only the open-card id changes (no full refreshDerived). The page scroll position is
  // deliberately left alone: setting scroll-top right after a tap, while iOS may still be
  // tracking the touch or momentum, intermittently freezes touch scrolling on device.
  openWalletCard(kind, openId, patch) {
    this.setData({
      ...patch,
      [`${kind}WalletOpenId`]: openId
    });
  },

  editBean(event) {
    const bean = this.data.beans.find((item) => item.id === event.currentTarget.dataset.id);
    if (!bean) return;
    this.navigateWithContentScroll({
      beansView: "add",
      editingBeanId: bean.id,
      beanAddReturnMode: "",
      activeBeanActionId: "",
      beanSwipeMovingId: "",
      beanSwipeStyle: "",
      beanForm: {
        name: bean.name || "",
        roaster: bean.roaster || "",
        country: bean.country || "",
        origin: bean.origin || "",
        variety: bean.variety || "",
        process: bean.process || "",
        flavorDescription: bean.flavorDescription || "",
        roastLevel: bean.roastLevel || "",
        initialWeight: String(bean.initialWeight || ""),
        roastDate: bean.roastDate || ""
      }
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  onBeanFormInput(event) {
    this.setData({ [`beanForm.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  onBeanRoastChange(event) {
    this.setData({ "beanForm.roastLevel": ROAST_LEVELS[Number(event.detail.value)] });
  },

  scanBeanLabel() {
    if (this.data.beanOcrBusy) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["camera", "album"],
      sizeType: ["compressed"],
      success: (result) => {
        const media = result && result.tempFiles && result.tempFiles[0];
        const path = media && (media.tempFilePath || media.path);
        if (!path) {
          this.handleBeanLabelOcrError("无法读取照片，请重试");
          return;
        }
        this.recognizeBeanLabel(path);
      },
      fail: (error) => {
        const message = String(error && error.errMsg || "");
        if (/cancel/i.test(message)) return;
        this.handleBeanLabelOcrError("无法读取照片，请重试");
      }
    });
  },

  async recognizeBeanLabel(path) {
    this.setData({ beanOcrBusy: true });
    wx.showLoading({
      title: "识别中...",
      mask: true
    });
    try {
      const lines = await recognizeBeanLabelPhoto(path);
      wx.hideLoading();
      this.applyBeanLabelOcr(lines);
    } catch (error) {
      wx.hideLoading();
      this.handleBeanLabelOcrError(getErrorMessage(error));
    }
  },

  applyBeanLabelOcr(lines) {
    try {
      const parsed = parseBeanOcrLines(lines);
      if (!parsed.rawLines.length) throw new Error("没有识别到清晰文字，请靠近标签重新拍摄");
      const nextForm = { ...this.data.beanForm };
      Object.keys(parsed.fields).forEach((field) => {
        const value = parsed.fields[field];
        if (!value) return;
        const current = String(nextForm[field] || "").trim();
        if (!current || field === "roastDate") nextForm[field] = value;
      });
      const filledCount = parsed.filledFields.length;
      this.setData({
        beanForm: nextForm,
        beanOcrBusy: false
      });
      this.toast(filledCount ? "识别完成，请检查内容" : "已识别文字，请手动确认");
    } catch (error) {
      this.handleBeanLabelOcrError(error && error.message);
    }
  },

  handleBeanLabelOcrError(errorMessage) {
    const message = String(errorMessage || "识别失败，请重新拍摄");
    this.setData({ beanOcrBusy: false });
    wx.showModal({
      title: "PaddleOCR 未完成",
      content: message.length > 110 ? `${message.slice(0, 110)}…` : message,
      showCancel: false,
      confirmText: "知道了"
    });
  },

  saveBean() {
    const form = this.data.beanForm;
    const weight = parseWeightValue(form.initialWeight);
    if (!String(form.name || "").trim()) {
      this.toast("请填写商品名称");
      return;
    }
    if (!weight || weight <= 0) {
      this.toast("请填写重量");
      return;
    }
    if (this.data.editingBeanId) {
      let updatedBean = null;
      let previousBean = null;
      const beans = this.data.beans.map((bean) => {
        if (bean.id !== this.data.editingBeanId) return bean;
        previousBean = normalizeBean(bean);
        const consumed = Math.max(0, (Number(bean.initialWeight) || 0) - (Number(bean.remainingWeight) || 0));
        const remainingWeight = Math.max(0, round(weight - consumed));
        updatedBean = normalizeBean({
          ...bean,
          name: form.name.trim(),
          roaster: String(form.roaster || "").trim(),
          country: String(form.country || "").trim(),
          origin: String(form.origin || "").trim(),
          variety: String(form.variety || "").trim(),
          process: String(form.process || "").trim(),
          flavorDescription: String(form.flavorDescription || "").trim(),
          roastLevel: String(form.roastLevel || "").trim(),
          initialWeight: weight,
          remainingWeight,
          emptiedAt: remainingWeight <= 0 ? bean.emptiedAt || new Date().toISOString() : "",
          roastDate: String(form.roastDate || "").trim()
        });
        return updatedBean;
      });
      this.navigateWithContentScroll({
        beans,
        logs: updatedBean ? syncLogsWithBean(this.data.logs, updatedBean, previousBean) : this.data.logs,
        activeTab: "beans",
        beansView: "list",
        beanLibraryMode: "stock",
        beanStockMode: updatedBean && (Number(updatedBean.remainingWeight) || 0) <= 0 ? "empty" : "active",
        beanShelfMode: updatedBean && (Number(updatedBean.remainingWeight) || 0) <= 0 ? "empty" : "active",
        editingBeanId: "",
        beanAddReturnMode: "",
        beanForm: freshBeanForm(),
        activeBeanActionId: "",
        beanSwipeMovingId: "",
        beanSwipeStyle: ""
      });
      this.toast("豆子信息已更新");
    } else {
      const bean = this.buildBeanFromForm(form);
      if (!bean) return;
      this.navigateWithContentScroll({
        beans: [bean, ...this.data.beans],
        selectedBeanId: bean.id,
        activeTab: "beans",
        beansView: "list",
        beanLibraryMode: "stock",
        beanStockMode: "active",
        beanShelfMode: "active",
        beanAddReturnMode: "",
        beanForm: freshBeanForm(),
        activeBeanActionId: "",
        beanSwipeMovingId: "",
        beanSwipeStyle: ""
      });
      this.toast("已加入豆仓");
    }
    this.persist();
    this.refreshDerived();
  },

  deleteBean(event) {
    const id = event.currentTarget.dataset.id;
    const bean = this.data.beans.find((item) => item.id === id);
    wx.showModal({
      title: "移除豆子",
      content: `确定移除 ${(bean && bean.name) || "这包豆子"} 吗？只会从豆仓移除，已有冲煮记录和总计数据会保留。`,
      confirmColor: "#9f3f30",
      success: (result) => {
        if (!result.confirm) return;
        const logs = bean ? syncLogsWithBean(this.data.logs, bean) : this.data.logs;
        const beans = this.data.beans.filter((item) => item.id !== id);
        const fallbackBean = beans.find((item) => (Number(item.remainingWeight) || 0) > 0) || null;
        this.setData({
          beans,
          logs,
          selectedBeanId: this.data.selectedBeanId === id ? (fallbackBean ? fallbackBean.id : "") : this.data.selectedBeanId,
          activeBeanActionId: "",
          beanSwipeMovingId: "",
          beanSwipeStyle: ""
        });
        this.persist();
        this.refreshDerived();
        this.toast("豆子已移除");
      }
    });
  },

  clearBeanToEmptyBag(event) {
    const id = event.currentTarget.dataset.id;
    const bean = this.data.beans.find((item) => item.id === id);
    if (!bean) return;
    if ((Number(bean.remainingWeight) || 0) <= 0) {
      this.setData({
        activeBeanActionId: "",
        beanSwipeMovingId: "",
        beanSwipeStyle: ""
      });
      this.toast("这包豆子已经是空袋");
      return;
    }
    wx.showModal({
      title: "清袋",
      content: `确定将 ${(bean && bean.name) || "这包豆子"} 清袋吗？余量会归零，并移入空袋。`,
      confirmColor: "#9f3f30",
      success: (result) => {
        if (!result.confirm) return;
        const emptiedAt = new Date().toISOString();
        const beans = this.data.beans.map((item) => {
          if (item.id !== id) return item;
          return normalizeBean({
            ...item,
            remainingWeight: 0,
            emptiedAt
          });
        });
        const fallbackBean = beans.find((item) => (Number(item.remainingWeight) || 0) > 0) || null;
        this.setData({
          beans,
          selectedBeanId: this.data.selectedBeanId === id ? (fallbackBean ? fallbackBean.id : "") : this.data.selectedBeanId,
          expandedBeanId: "",
          activeBeanActionId: "",
          beanSwipeMovingId: "",
          beanSwipeStyle: ""
        });
        this.persist();
        this.refreshDerived();
        this.toast("已清袋，移入空袋");
      }
    });
  },

  getLibraryRecipeById(id) {
    const customRecipe = this.data.recipes.find((item) => item.id === id && item.sourceType !== "roaster");
    if (customRecipe) return customRecipe;
    const presetRecipe = getPresetRecipes().find((item) => item.id === id);
    return presetRecipe ? normalizeRecipe(presetRecipe) : null;
  },

  isPresetRecipeId(id) {
    return isPresetRecipeId(id);
  },

  startAddRecipe() {
    this.navigateWithContentScroll({
      recipesView: "add",
      editingRecipeId: "",
      selectedRecipeId: "",
      recipeForm: freshRecipeForm(),
      parameterKeyboardHeight: 0,
      parameterKeyboardInset: 0,
      activeRecipeActionId: "",
      recipeSwipeMovingId: "",
      recipeSwipeStyle: ""
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  handleRecipeBack() {
    this.setRecipesListView();
  },

  setRecipesListView() {
    this.navigateWithContentScroll({
      recipesView: "list",
      editingRecipeId: "",
      selectedRecipeId: "",
      recipeForm: freshRecipeForm(),
      parameterKeyboardHeight: 0,
      parameterKeyboardInset: 0,
      activeRecipeActionId: "",
      recipeSwipeMovingId: "",
      recipeSwipeStyle: ""
    }, {}, () => this.refreshDerived());
  },

  handleRoasterLogoError(event) {
    const name = String(event && event.currentTarget && event.currentTarget.dataset.name || "");
    if (!name) return;
    if (!this.failedRoasterLogos) this.failedRoasterLogos = Object.create(null);
    this.failedRoasterLogos[name] = true;
    if (this.data.activeTab === "roasters") this.refreshDerived();
  },

  openRoasterBeans(event) {
    this.rememberCurrentContentScroll();
    this.roasterCatalogReturnScrollTop = Math.max(0, Number(this.contentScrollOffset) || 0);
    const selectedRoasterName = event.currentTarget.dataset.name;
    const roasterBeans = getRoasterBeans(selectedRoasterName);
    const roasterBeanFilters = freshRoasterBeanFilters();
    this.setDataWithContentScroll({
      beansView: "roasterBeans",
      beanLibraryMode: "roaster",
      selectedRoasterName,
      selectedRoasterBeanId: "",
      selectedRoasterBeanName: "",
      selectedRoasterBeanDetail: null,
      roasterBeanSearchQuery: "",
      roasterBeanFilters,
      roasterBeanFilterGroups: buildRoasterBeanFilterGroups(roasterBeans, roasterBeanFilters),
      roasterBeanActiveFilterCount: 0,
      roasterBeanSearchFilterOpen: false,
      displayRoasterBeans: roasterBeans,
      beansTitle: selectedRoasterName || "寻豆指南"
    }, 0, () => this.queueRoasterGuideImages(roasterBeans, true));
  },

  onRoasterBeanSearchInput(event) {
    const roasterBeanSearchQuery = String(event && event.detail && event.detail.value || "");
    this.setData({
      roasterBeanSearchQuery,
      roasterBeanSearchFilterOpen: false,
      displayRoasterBeans: filterRoasterBeans(
        getRoasterBeans(this.data.selectedRoasterName),
        roasterBeanSearchQuery,
        this.data.roasterBeanFilters
      )
    });
  },

  toggleRoasterBeanSearchFilter() {
    this.setData({
      roasterBeanSearchFilterOpen: !this.data.roasterBeanSearchFilterOpen
    });
  },

  toggleRoasterBeanFilterOption(event) {
    const field = String(event && event.currentTarget && event.currentTarget.dataset.field || "");
    const value = String(event && event.currentTarget && event.currentTarget.dataset.value || "");
    if (!ROASTER_BEAN_FILTER_FIELDS.some((definition) => definition.key === field) || !value) return;
    const roasterBeans = getRoasterBeans(this.data.selectedRoasterName);
    const currentFilters = normalizeRoasterBeanFilters(roasterBeans, this.data.roasterBeanFilters);
    const currentValues = currentFilters[field];
    const roasterBeanFilters = {
      ...currentFilters,
      [field]: currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value]
    };
    this.setData({
      roasterBeanFilters,
      roasterBeanFilterGroups: buildRoasterBeanFilterGroups(roasterBeans, roasterBeanFilters),
      roasterBeanActiveFilterCount: countRoasterBeanFilters(roasterBeanFilters),
      displayRoasterBeans: filterRoasterBeans(
        roasterBeans,
        this.data.roasterBeanSearchQuery,
        roasterBeanFilters
      )
    });
  },

  clearRoasterBeanFilters() {
    const roasterBeans = getRoasterBeans(this.data.selectedRoasterName);
    const roasterBeanFilters = freshRoasterBeanFilters();
    this.setData({
      roasterBeanFilters,
      roasterBeanFilterGroups: buildRoasterBeanFilterGroups(roasterBeans, roasterBeanFilters),
      roasterBeanActiveFilterCount: 0,
      displayRoasterBeans: filterRoasterBeans(
        roasterBeans,
        this.data.roasterBeanSearchQuery,
        roasterBeanFilters
      )
    });
  },

  closeRoasterBeanSearchFilter() {
    this.setData({ roasterBeanSearchFilterOpen: false });
  },

  clearRoasterBeanSearch() {
    const roasterBeans = getRoasterBeans(this.data.selectedRoasterName);
    this.setData({
      roasterBeanSearchQuery: "",
      displayRoasterBeans: filterRoasterBeans(
        roasterBeans,
        "",
        this.data.roasterBeanFilters
      )
    });
  },

  openRoasterBeanDetail(event) {
    if (this.data.beansView !== "roasterBeans" || this.contentScrollRestoring) return;
    const id = event.currentTarget.dataset.id;
    const bean = this.data.displayRoasterBeans.find((item) => item.id === id);
    if (!bean) return;
    this.rememberCurrentContentScroll();
    this.roasterBeansReturnScrollTop = Math.max(0, Number(this.contentScrollOffset) || 0);
    this.setDataWithContentScroll({
      beansView: "roasterBeanDetail",
      beanLibraryMode: "roaster",
      selectedRoasterBeanId: bean.id,
      selectedRoasterBeanName: bean.name,
      selectedRoasterBeanDetail: buildRoasterBeanDetailView(bean),
      beansTitle: bean.name || "豆子详情"
    }, 0, () => this.queueRoasterGuideImages([bean], true));
  },

  tapRecipeWalletCard(event) {
    const id = event.currentTarget.dataset.id || "";
    if (id === this.data.recipeWalletOpenId || this.data.recipeSwipeTapLocked || this.data.activeRecipeActionId) {
      this.openRecipeDetail(event);
      return;
    }
    this.openWalletCard("recipe", id, { expandedRecipeId: id });
  },

  openRecipeDetail(event) {
    if (this.data.recipeQuickImportMode) {
      const recipe = this.getLibraryRecipeById(event.currentTarget.dataset.id);
      if (!recipe) return;
      this.applyRecipeDataToBrew(recipe, { quickImport: true });
      return;
    }
    if (this.data.recipeSwipeTapLocked) {
      this.setData({ recipeSwipeTapLocked: false });
      return;
    }
    if (this.data.activeRecipeActionId) {
      this.setData({
        activeRecipeActionId: "",
        recipeSwipeMovingId: "",
        recipeSwipeStyle: ""
      });
      return;
    }
    const id = event.currentTarget.dataset.id;
    const recipe = this.getLibraryRecipeById(id);
    if (!recipe) return;
    this.navigateWithContentScroll({
      recipesView: "detail",
      recipeDetailMoreOpen: false,
      selectedRecipeId: recipe.id,
      editingRecipeId: "",
      activeRecipeActionId: "",
      recipeSwipeMovingId: "",
      recipeSwipeStyle: ""
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  editRecipe(event) {
    this.openRecipeEditorById(event.currentTarget.dataset.id);
  },

  openRecipeEditorById(id) {
    const recipe = this.data.recipes.find((item) => item.id === id);
    if (!recipe) return;
    this.navigateWithContentScroll({
      recipesView: "add",
      editingRecipeId: recipe.id,
      selectedRecipeId: "",
      recipeForm: recipeFormFromRecipe(recipe),
      parameterKeyboardHeight: 0,
      parameterKeyboardInset: 0,
      activeRecipeActionId: "",
      recipeSwipeMovingId: "",
      recipeSwipeStyle: ""
    }, { scrollTop: 0 }, () => this.refreshDerived());
  },

  onRecipeTouchStart(event) {
    if (this.data.recipeQuickImportMode || this.edgeBackGesture || this.edgeBackOwnsTouch) return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    const id = event.currentTarget.dataset.id || "";
    if (this.isPresetRecipeId(id)) return;
    const startOpen = this.data.activeRecipeActionId === id;
    this.recipeTouchGesture = {
      id,
      startX: touch.clientX,
      startY: touch.clientY,
      startOpen,
      direction: "",
      lastOffset: null
    };
  },

  onRecipeTouchMove(event) {
    if (this.data.recipeQuickImportMode || this.edgeBackOwnsTouch) return;
    const touch = event.touches && event.touches[0];
    const id = event.currentTarget.dataset.id || "";
    const gesture = this.recipeTouchGesture;
    if (!touch || !id || !gesture || gesture.id !== id) return;
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const distanceX = Math.abs(deltaX);
    const distanceY = Math.abs(deltaY);
    if (!gesture.direction) {
      if (distanceX < 8 && distanceY < 8) return;
      if (distanceY >= distanceX) {
        gesture.direction = "vertical";
        return;
      }
      if (distanceX < distanceY * 1.35) return;
      gesture.direction = "horizontal";
    }
    if (gesture.direction === "horizontal" && distanceY > 16 && distanceY > distanceX * 1.25) {
      gesture.direction = "vertical";
      gesture.lastOffset = null;
      if (this.data.recipeSwipeMovingId === id) {
        this.setData({
          recipeSwipeMovingId: "",
          recipeSwipeStyle: "",
          recipeSwipeTapLocked: false
        });
      }
      return;
    }
    if (gesture.direction !== "horizontal") return;
    const startOffset = gesture.startOpen ? -RECIPE_ACTION_WIDTH : 0;
    const offset = Math.min(0, Math.max(-RECIPE_ACTION_WIDTH, startOffset + pxToRpx(deltaX)));
    const roundedOffset = round(offset);
    if (gesture.lastOffset === roundedOffset) return;
    gesture.lastOffset = roundedOffset;
    this.setData({
      activeRecipeActionId: gesture.startOpen ? id : "",
      recipeSwipeMovingId: id,
      recipeSwipeTapLocked: true,
      recipeSwipeStyle: `transform:translateX(${roundedOffset}rpx);transition:none;will-change:transform;`
    });
  },

  onRecipeTouchEnd(event) {
    if (this.edgeBackOwnsTouch) {
      this.recipeTouchGesture = null;
      this.setData({
        recipeSwipeMovingId: "",
        recipeSwipeStyle: "",
        recipeSwipeTapLocked: false
      });
      return;
    }
    if (this.data.recipeQuickImportMode) {
      this.setData({
        activeRecipeActionId: "",
        recipeSwipeMovingId: "",
        recipeSwipeStyle: "",
        recipeSwipeTapLocked: false
      });
      return;
    }
    const touch = (event.changedTouches && event.changedTouches[0]) || null;
    const id = event.currentTarget.dataset.id || "";
    const gesture = this.recipeTouchGesture;
    this.recipeTouchGesture = null;
    if (!touch || !id || !gesture || gesture.id !== id) {
      this.setData({
        recipeSwipeMovingId: "",
        recipeSwipeStyle: "",
        recipeSwipeTapLocked: false
      });
      return;
    }
    if (gesture.direction !== "horizontal") {
      if (this.data.recipeSwipeMovingId === id || this.data.recipeSwipeTapLocked) {
        this.setData({
          recipeSwipeMovingId: "",
          recipeSwipeStyle: "",
          recipeSwipeTapLocked: false
        });
      }
      return;
    }
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const startOffset = gesture.startOpen ? -RECIPE_ACTION_WIDTH : 0;
    const offset = Math.min(0, Math.max(-RECIPE_ACTION_WIDTH, startOffset + pxToRpx(deltaX)));
    const shouldOpen = gesture.startOpen
      ? offset <= -(RECIPE_ACTION_WIDTH - RECIPE_SWIPE_TRIGGER)
      : offset <= -RECIPE_SWIPE_TRIGGER;
    const movedHorizontally = Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY);
    this.setData({
      activeRecipeActionId: shouldOpen ? id : "",
      recipeSwipeMovingId: "",
      recipeSwipeStyle: "",
      recipeSwipeTapLocked: movedHorizontally
    });
    if (movedHorizontally) {
      setTimeout(() => {
        if (this.data.recipeSwipeTapLocked) this.setData({ recipeSwipeTapLocked: false });
      }, 120);
    }
  },

  onRecipeFormInput(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.detail.value;
    const patch = { [`recipeForm.${field}`]: value };
    if (field === "temperature") {
      const previousTemperature = String(this.data.recipeForm.temperature || "");
      patch["recipeForm.stages"] = decorateStages(this.data.recipeForm.stages).map((stage) => {
        const stageTemperature = String(stage.temperature || "");
        return {
          ...stage,
          temperature: !stageTemperature || stageTemperature === previousTemperature
            ? value
            : stageTemperature
        };
      });
    }
    if (field === "totalTime") {
      const totalSeconds = parseTimeToSeconds(value);
      if (totalSeconds) patch["recipeForm.stages"] = scaleStagesToTotal(this.data.recipeForm.stages, totalSeconds);
    }
    this.setData(patch);
  },

  onRecipeDoseInput(event) {
    const scope = event.currentTarget.dataset.scope || "recipeForm";
    const dose = event.detail.value;
    const water = round((Number(dose) || 0) * (Number(this.data[scope].ratio) || 0));
    const waterText = water ? String(water) : "";
    this.setData({
      [`${scope}.dose`]: dose,
      [`${scope}.water`]: waterText,
      [`${scope}.stages`]: alignFinalStageWater(this.data[scope].stages, waterText),
      ...(scope === "recipeForm" ? {
        recipeFormRatioDisplay: formatRecipeRatioDisplay(dose, water, this.data[scope].ratio),
        recipeFormRatioPickerIndex: Math.max(0, RATIO_VALUES.indexOf(Number(this.data[scope].ratio)))
      } : {})
    });
  },

  onRecipeWaterInput(event) {
    const scope = event.currentTarget.dataset.scope || "recipeForm";
    const water = event.detail.value;
    const exactRatio = getExactRatio(this.data[scope].dose, water);
    const patch = { [`${scope}.water`]: water };
    if (exactRatio !== null) patch[`${scope}.ratio`] = exactRatio;
    const ratio = exactRatio !== null ? exactRatio : this.data[scope].ratio;
    if (scope === "recipeForm") {
      patch.recipeFormRatioDisplay = formatRecipeRatioDisplay(this.data[scope].dose, water, ratio);
      patch.recipeFormRatioPickerIndex = Math.max(0, RATIO_VALUES.indexOf(Number(ratio)));
    }
    patch[`${scope}.stages`] = alignFinalStageWater(this.data[scope].stages, water);
    this.setData(patch);
  },

  onRecipeRatioPickerChange(event) {
    const scope = event.currentTarget.dataset.scope || "recipeForm";
    const index = Number(event.detail.value) || 0;
    const ratio = RATIO_VALUES[index] || 15;
    const dose = Number(this.data[scope].dose) || 0;
    this.setData({
      [`${scope}.ratio`]: ratio,
      [`${scope}.water`]: dose ? String(round(dose * ratio)) : ""
    });
    this.syncRecipeFinalStageWater(scope);
    this.refreshDerived();
  },

  onRecipeStageInput(event) {
    const scope = event.currentTarget.dataset.scope || "recipeForm";
    const index = Number(event.currentTarget.dataset.index);
    const field = event.currentTarget.dataset.field;
    const stages = this.data[scope].stages;
    if (!stages[index]) return;
    if (field === "cumulativeWater") {
      const water = event.detail.value;
      const patch = { [`${scope}.stages[${index}].cumulativeWater`]: water };
      if (index === stages.length - 1) {
        const exactRatio = getExactRatio(this.data[scope].dose, water);
        const ratio = exactRatio !== null ? exactRatio : this.data[scope].ratio;
        patch[`${scope}.water`] = water;
        if (scope === "recipeForm") {
          patch.recipeFormRatioDisplay = formatRecipeRatioDisplay(this.data[scope].dose, water, ratio);
          patch.recipeFormRatioPickerIndex = Math.max(0, RATIO_VALUES.indexOf(Number(ratio)));
        }
        if (exactRatio !== null) patch[`${scope}.ratio`] = exactRatio;
      }
      this.setData(patch);
      return;
    } else if (field === "duration" || field === "name") {
      return event.detail.value;
    }
    this.setData({ [`${scope}.stages[${index}].${field}`]: event.detail.value });
  },

  onRecipeStageDurationBlur(event) {
    const scope = event.currentTarget.dataset.scope || "recipeForm";
    const index = Number(event.currentTarget.dataset.index);
    const stages = this.data[scope].stages.map((stage) => ({ ...stage }));
    if (!stages[index]) return;
    stages[index].duration = Math.max(1, Math.round(Number(event.detail.value) || 1));
    this.setData({ [`${scope}.stages`]: decorateStages(stages) });
    this.onParameterInputBlur();
    this.updateRecipeTotalTimeFromStages(scope);
  },

  onRecipeStageNameBlur(event) {
    const scope = event.currentTarget.dataset.scope || "recipeForm";
    const index = Number(event.currentTarget.dataset.index);
    const stages = this.data[scope].stages.map((stage) => ({ ...stage }));
    if (!stages[index]) return;
    stages[index].name = String(event.detail.value || "").trim() || "未命名步骤";
    this.setData({ [`${scope}.stages`]: decorateStages(stages) });
    this.onParameterInputBlur();
  },

  adjustRecipeStageDuration(event) {
    const scope = event.currentTarget.dataset.scope || "recipeForm";
    const index = Number(event.currentTarget.dataset.index);
    const delta = Number(event.currentTarget.dataset.delta) || 0;
    const stages = this.data[scope].stages.map((stage) => ({ ...stage }));
    if (!stages[index]) return;
    stages[index].duration = Math.max(1, (Number(stages[index].duration) || 1) + delta);
    this.setData({ [`${scope}.stages`]: decorateStages(stages) });
    this.updateRecipeTotalTimeFromStages(scope);
  },

  deleteRecipeStage(event) {
    const scope = event.currentTarget.dataset.scope || "recipeForm";
    const index = Number(event.currentTarget.dataset.index);
    const stages = this.data[scope].stages.filter((_, stageIndex) => stageIndex !== index);
    this.setData({ [`${scope}.stages`]: alignFinalStageWater(stages, this.data[scope].water) });
    this.updateRecipeTotalTimeFromStages(scope);
  },

  addRecipeStage(event) {
    const scope = event.currentTarget.dataset.scope || "recipeForm";
    const stages = [
      ...this.data[scope].stages,
      {
        id: newId("recipe-stage"),
        name: "新的步骤",
        duration: 20,
        cumulativeWater: Number(this.data[scope].water) || 0,
        temperature: String(this.data[scope].temperature || "")
      }
    ];
    this.setData({ [`${scope}.stages`]: alignFinalStageWater(stages, this.data[scope].water) });
    this.updateRecipeTotalTimeFromStages(scope);
  },

  updateRecipeTotalTimeFromStages(scope) {
    const seconds = sum(this.data[scope].stages.map((stage) => stage.duration));
    this.setData({ [`${scope}.totalTime`]: formatTime(seconds) });
    this.refreshDerived();
  },

  syncRecipeFinalStageWater(scope) {
    this.setData({ [`${scope}.stages`]: alignFinalStageWater(this.data[scope].stages, this.data[scope].water) });
  },

  saveRecipe() {
    const editingRecipe = this.data.recipes.find((item) => item.id === this.data.editingRecipeId);
    const recipe = this.buildRecipeFromForm(
      this.data.recipeForm,
      editingRecipe ? editingRecipe.id : newId("recipe"),
      editingRecipe ? editingRecipe.sourceType : "custom"
    );
    if (!recipe) return;
    const nextRecipe = editingRecipe
      ? { ...recipe, createdAt: editingRecipe.createdAt || recipe.createdAt }
      : recipe;
    this.navigateWithContentScroll({
      recipes: editingRecipe
        ? this.data.recipes.map((item) => item.id === editingRecipe.id ? nextRecipe : item)
        : [nextRecipe, ...this.data.recipes],
      editingRecipeId: "",
      selectedRecipeId: "",
      recipeForm: freshRecipeForm(),
      recipesView: "list",
      parameterKeyboardHeight: 0,
      parameterKeyboardInset: 0
    }, {}, () => {
      this.persist();
      this.refreshDerived();
      this.toast(editingRecipe ? "方案已修改" : "方案已添加");
    });
  },

  buildRecipeFromForm(form, id = newId("recipe"), sourceType = "custom") {
    if (!String(form.name || "").trim()) {
      this.toast("请输入方案名称");
      return null;
    }
    if (!String(form.dripper || "").trim()) {
      this.toast("请输入滤杯");
      return null;
    }
    const water = Number(form.water) || round((Number(form.dose) || 15) * (Number(form.ratio) || 15));
    const stages = alignFinalStageWater(Array.isArray(form.stages) ? form.stages : defaultStagesForWater(water), water);
    const totalTime = String(form.totalTime || formatTime(sum(stages.map((stage) => stage.duration)))).trim();
    return normalizeRecipe({
      id,
      name: form.name.trim(),
      sourceType,
      roasterName: String(form.roasterName || "").trim(),
      dripper: String(form.dripper || "").trim(),
      dose: Number(form.dose) || 15,
      water,
      ratio: Number(form.ratio) || 15,
      temperature: form.temperature === "" ? "" : Number(form.temperature) || "",
      waterQuality: String(form.waterQuality || "").trim(),
      filterPaper: String(form.filterPaper || "").trim(),
      grinder: String(form.grinder || "").trim(),
      grind: String(form.grind || "").trim(),
      totalTime,
      stages,
      target: String(form.target || "").trim(),
      createdAt: new Date().toISOString()
    });
  },

  applyRoasterRecipe() {
    const detail = this.data.selectedRoasterBeanDetail;
    const recipe = detail && detail.roasterRecipe;
    if (!recipe) return;
    this.applyRecipeDataToBrew(recipe);
  },

  applySelectedRecipe() {
    const recipe = this.getLibraryRecipeById(this.data.selectedRecipeId);
    if (!recipe) return;
    this.applyRecipeDataToBrew(recipe);
  },

  applyRecipeDataToBrew(recipe, options = {}) {
    const quickImport = Boolean(options.quickImport);
    const dose = Number(recipe.dose) || 15;
    const ratio = Number(recipe.ratio) || 15;
    const dripper = String(recipe.dripper || this.data.selectedDripper || DEFAULT_DRIPPERS[0]).trim();
    const brewForm = normalizeBrewDraftForm({
      ...this.data.brewForm,
      dose: String(dose),
      ratio,
      water: String(recipe.water || round(dose * ratio)),
      temperature: recipe.temperature === "" ? "92" : String(recipe.temperature),
      waterQuality: recipe.waterQuality || "",
      filterPaper: recipe.filterPaper || "",
      grinder: recipe.grinder || "",
      grind: recipe.grind || "",
      totalTime: recipe.totalTime || this.data.brewForm.totalTime,
      stages: decorateStages(recipe.stages).map((stage) => ({
        ...stage,
        name: removeDefaultStagePrefix(stage.name)
      }))
    });
    this.stopTimer();
    const patch = {
      activeTab: "brew",
      homeView: "dashboard",
      brewHomeVisible: false,
      brewFlowActive: true,
      resumeBrewFlowOnHome: false,
      brewStep: 1,
      recipesView: "list",
      recipesReturnTarget: null,
      recipeQuickImportMode: false,
      selectedRecipeId: "",
      brewRecipeSourceId: String(recipe.id || ""),
      brewRecipeSourceName: String(recipe.nameText || recipe.name || "已选方案"),
      selectedDripper: dripper,
      timerElapsed: 0,
      timerRunning: false,
      timerFinished: false,
      timerCountdown: 0,
      overviewBeanPickerOpen: false,
      brewForm
    };
    if (!quickImport) patch.selectedBeanId = "";
    const finalize = () => {
      if (!Array.isArray(recipe.stages) || !recipe.stages.length) this.syncFinalStageWaterFromTotal();
      this.persist();
      this.refreshDerived();
      this.toast(quickImport ? "方案参数已导入，可继续调整" : "已套用方案参数");
    };
    if (quickImport) {
      this.navigateWithContentScroll(patch, { scrollTop: 0 }, finalize);
    } else {
      this.setData(patch, finalize);
    }
  },

  deleteRecipe(event) {
    const id = event.currentTarget.dataset.id;
    if (this.isPresetRecipeId(id)) return;
    const recipe = this.data.recipes.find((item) => item.id === id);
    wx.showModal({
      title: "删除方案",
      content: `确定删除 ${(recipe && recipe.name) || "这个方案"} 吗？`,
      confirmColor: "#9f3f30",
      success: (result) => {
        if (!result.confirm) return;
        this.setData({
          recipes: this.data.recipes.filter((item) => item.id !== id),
          activeRecipeActionId: "",
          recipeSwipeMovingId: "",
          recipeSwipeStyle: ""
        });
        this.persist();
        this.refreshDerived();
        this.toast("方案已删除");
      }
    });
  },

  deleteLog(event) {
    const id = event.currentTarget.dataset.id;
    const log = this.data.logs.find((item) => item.id === id);
    wx.showModal({
      title: "删除记录",
      content: `确定删除 ${(log && log.beanName) || "这条冲煮记录"} 吗？删除后统计和库存会同步更新。`,
      confirmColor: "#9f3f30",
      success: (result) => {
        if (!result.confirm) return;
        const beans = this.data.beans.map((bean) => {
          if (bean.id !== (log && log.beanId)) return bean;
          const remainingWeight = Math.min(Number(bean.initialWeight) || 0, round((Number(bean.remainingWeight) || 0) + (Number(log.dose) || 0)));
          return normalizeBean({
            ...bean,
            remainingWeight,
            emptiedAt: remainingWeight > 0 ? "" : bean.emptiedAt
          });
        });
        this.setData({
          beans,
          logs: this.data.logs.filter((item) => item.id !== id),
          selectedLogId: this.data.selectedLogId === id ? "" : this.data.selectedLogId,
          selectedLogEditMode: this.data.selectedLogId === id ? false : this.data.selectedLogEditMode,
          activeLogActionId: "",
          logSwipeMovingId: "",
          logSwipeStyle: ""
        });
        this.persist();
        this.refreshDerived();
        this.toast("冲煮记录已删除，统计已更新");
      }
    });
  },

  toast(title) {
    wx.showToast({ title, icon: "none" });
  }
});

function readStorageEntry(key) {
  try {
    const value = wx.getStorageSync(key);
    return {
      value,
      exists: value !== undefined && value !== null && value !== "",
      failed: false
    };
  } catch (error) {
    return { value: null, exists: false, failed: true };
  }
}

function normalizeProfile(value) {
  const profile = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    nickname: String(profile.nickname || "").trim().slice(0, 24),
    avatarUrl: String(profile.avatarUrl || "/assets/icons/profile-user.png")
  };
}

function loadStoredState() {
  const primary = readStorageEntry(STORAGE_KEY);
  if (primary.exists && isStoredState(primary.value)) {
    return {
      state: primary.value,
      found: true,
      canPersist: true,
      recoveredFromBackup: false
    };
  }

  const backup = readStorageEntry(STORAGE_BACKUP_KEY);
  if (backup.exists && isStoredState(backup.value)) {
    return {
      state: backup.value,
      found: true,
      canPersist: true,
      recoveredFromBackup: true
    };
  }

  const storageIsEmpty = !primary.exists && !backup.exists && !primary.failed && !backup.failed;
  return {
    state: {},
    found: false,
    canPersist: storageIsEmpty,
    recoveredFromBackup: false
  };
}

function isStoredState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const collectionKeys = ["beans", "recipes", "logs"];
  const hasStoredCollection = collectionKeys.some((key) => isStoredCollection(value[key]));
  if (!hasStoredCollection) return false;
  return collectionKeys.every((key) => (
    !Object.prototype.hasOwnProperty.call(value, key) || isStoredCollection(value[key])
  ));
}

function selectImportedDataScope(saved, scope) {
  const scopeKeys = { recipes: "recipes", beans: "beans", logs: "logs" };
  const key = scopeKeys[scope];
  if (!key) return saved;
  if (!isStoredCollection(saved[key])) {
    const labels = { recipes: "自建方案", beans: "豆仓", logs: "冲煮记录" };
    throw new Error(`所选备份不包含${labels[scope] || "对应"}数据`);
  }
  const scopedData = {
    version: saved.version,
    appVersion: saved.appVersion,
    [key]: saved[key]
  };
  if (key === "beans" && saved.selectedBeanId) scopedData.selectedBeanId = saved.selectedBeanId;
  return scopedData;
}

function appendImportedItems(currentItems, importedItems, idPrefix) {
  const items = Array.isArray(currentItems) ? currentItems.slice() : [];
  const usedIds = new Set(items.map((item) => String(item && item.id || "")).filter(Boolean));
  const idMap = Object.create(null);
  (Array.isArray(importedItems) ? importedItems : []).forEach((item) => {
    const originalId = String(item && item.id || "");
    let nextId = originalId || newId(idPrefix);
    while (usedIds.has(nextId)) nextId = newId(idPrefix);
    usedIds.add(nextId);
    if (originalId && !Object.prototype.hasOwnProperty.call(idMap, originalId)) {
      idMap[originalId] = nextId;
    }
    items.push(nextId === originalId ? item : { ...item, id: nextId });
  });
  return { items, idMap };
}

function isStoredCollection(value) {
  return Array.isArray(value) && value.every((item) => (
    item && typeof item === "object" && !Array.isArray(item)
  ));
}

function getStoredCollection(state, key) {
  if (!state || typeof state !== "object") return [];
  return isStoredCollection(state[key]) ? state[key] : [];
}

function getRuntimeVersion() {
  try {
    const accountInfo = wx.getAccountInfoSync ? wx.getAccountInfoSync() : null;
    const miniProgram = accountInfo && accountInfo.miniProgram;
    return String((miniProgram && miniProgram.version) || "").trim();
  } catch (error) {
    return "";
  }
}

function normalizeBean(bean) {
  const initialWeight = round(parseWeightValue(bean.initialWeight) || 0);
  const rawRemainingWeight = bean.remainingWeight;
  const remainingWeight = rawRemainingWeight === undefined || rawRemainingWeight === null || rawRemainingWeight === ""
    ? initialWeight
    : round(parseWeightValue(rawRemainingWeight) || 0);
  return {
    id: bean.id || newId("bean"),
    name: String(bean.name || ""),
    roaster: String(bean.roaster || ""),
    country: String(bean.country || ""),
    origin: String(bean.origin || ""),
    variety: String(bean.variety || ""),
    process: String(bean.process || ""),
    flavorDescription: String(bean.flavorDescription || ""),
    roastLevel: String(bean.roastLevel || ""),
    initialWeight,
    remainingWeight,
    roastDate: String(bean.roastDate || ""),
    emptiedAt: String(bean.emptiedAt || ""),
    createdAt: bean.createdAt || new Date().toISOString()
  };
}

function buildRoasterRecipe(bean) {
  const source = bean && bean.roasterBrewRecipe;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  return normalizeRecipe({
    ...source,
    id: source.id || `${bean.id}-roaster-recipe`,
    name: source.name || `${bean.name || "烘焙商"}方案`,
    sourceType: "roaster",
    roasterName: bean.roaster || ""
  });
}

function normalizeRecipe(recipe) {
  const dose = round(Number(recipe.dose) || 15);
  const ratio = round(Number(recipe.ratio) || 15);
  const water = round(Number(recipe.water) || dose * ratio);
  const stages = alignFinalStageWater(normalizeStageTemplate(recipe.stages, water), water);
  const usesDefaultStages = !Array.isArray(recipe.stages) || !recipe.stages.length;
  return {
    id: recipe.id || newId("recipe"),
    name: String(recipe.name || ""),
    sourceType: recipe.sourceType || "custom",
    roasterName: String(recipe.roasterName || ""),
    dripper: String(recipe.dripper || "Hario V60"),
    dose,
    water,
    ice: round(Number(recipe.ice) || 0),
    ratio,
    temperature: recipe.temperature === "" || recipe.temperature === null || recipe.temperature === undefined ? "" : round(Number(recipe.temperature) || 0),
    grinder: String(recipe.grinder || ""),
    grind: String(recipe.grind || ""),
    waterQuality: String(recipe.waterQuality || ""),
    filterPaper: String(recipe.filterPaper || ""),
    totalTime: usesDefaultStages ? formatTime(sum(stages.map((stage) => stage.duration))) : String(recipe.totalTime || ""),
    stages,
    target: String(recipe.target || ""),
    createdAt: recipe.createdAt || new Date().toISOString()
  };
}

function normalizeLog(log) {
  return {
    id: log.id || newId("log"),
    beanId: log.beanId || "",
    beanName: String(log.beanName || ""),
    country: String(log.country || ""),
    origin: String(log.origin || ""),
    roaster: String(log.roaster || ""),
    process: String(log.process || ""),
    variety: String(log.variety || ""),
    roastDate: String(log.roastDate || ""),
    dripper: String(log.dripper || ""),
    dose: round(Number(log.dose) || 0),
    ratio: round(Number(log.ratio) || 0),
    water: round(Number(log.water) || 0),
    temperature: log.temperature === "" || log.temperature === null || log.temperature === undefined ? "" : round(Number(log.temperature) || 0),
    waterQuality: String(log.waterQuality || ""),
    filterPaper: String(log.filterPaper || ""),
    grinder: String(log.grinder || ""),
    grindSize: String(log.grindSize || ""),
    sieve: String(log.sieve || ""),
    screenSize: String(log.screenSize || ""),
    totalTime: String(log.totalTime || ""),
    stages: Array.isArray(log.stages) ? log.stages : [],
    tds: String(log.tds || ""),
    extractionRate: String(log.extractionRate || ""),
    rating: normalizeRating(log.rating),
    tasting: normalizeFlavorScores(log.tasting, 0),
    notes: String(log.notes || ""),
    createdAt: log.createdAt || new Date().toISOString()
  };
}

function syncLogsWithBean(logs, bean, previousBean = null) {
  const normalizedBean = normalizeBean(bean);
  const normalizedPreviousBean = previousBean ? normalizeBean(previousBean) : null;
  return (Array.isArray(logs) ? logs : []).map((log) => {
    const normalizedLog = normalizeLog(log);
    const linkedById = normalizedLog.beanId === normalizedBean.id;
    const linkedBySnapshot = !linkedById
      && normalizedPreviousBean
      && isLogLinkedToBeanSnapshot(normalizedLog, normalizedPreviousBean);
    if (!linkedById && !linkedBySnapshot) return log;
    return normalizeLog({
      ...normalizedLog,
      beanId: normalizedBean.id,
      beanName: normalizedBean.name,
      country: normalizedBean.country,
      origin: normalizedBean.origin,
      roaster: normalizedBean.roaster,
      process: normalizedBean.process,
      variety: normalizedBean.variety,
      roastDate: normalizedBean.roastDate
    });
  });
}

function isLogLinkedToBeanSnapshot(log, bean) {
  const normalizedLog = normalizeLog(log);
  const normalizedBean = normalizeBean(bean);
  if (normalizedLog.beanId) return normalizedLog.beanId === normalizedBean.id;
  const nameMatches = sameFilledText(normalizedLog.beanName, normalizedBean.name);
  if (!nameMatches) return false;
  return [
    sameFilledText(normalizedLog.country, normalizedBean.country),
    sameFilledText(normalizedLog.origin, normalizedBean.origin),
    sameFilledText(normalizedLog.roaster, normalizedBean.roaster),
    sameFilledText(normalizedLog.process, normalizedBean.process),
    sameFilledText(normalizedLog.variety, normalizedBean.variety),
    sameFilledText(normalizedLog.roastDate, normalizedBean.roastDate)
  ].some(Boolean);
}

function sameFilledText(first, second) {
  const left = String(first || "").trim();
  const right = String(second || "").trim();
  return Boolean(left && right && left === right);
}

function decorateBean(bean) {
  const roastDate = formatRoastDate(bean.roastDate);
  const roastDetailDate = formatFullRoastDate(bean.roastDate);
  const restingDays = getRestingDays(bean.roastDate);
  const primaryName = bean.name || bean.origin || "未命名豆子";
  const nameMetaParts = [bean.variety]
    .map((part) => String(part || "").trim().replace(/\s*、\s*/g, "、"))
    .filter(Boolean);
  const nameParts = [primaryName, bean.process, bean.variety]
    .map((part) => String(part || "").trim().replace(/\s*、\s*/g, "、"))
    .filter(Boolean);
  const nameAndVariety = nameParts.join(" ") || "未命名豆子";
  const initialWeight = Number(bean.initialWeight) || 0;
  const remainingWeight = Math.max(0, Number(bean.remainingWeight) || 0);
  const stockPercent = initialWeight ? Math.max(0, Math.min(100, round((remainingWeight / initialWeight) * 100))) : 0;
  const isEmpty = remainingWeight <= 0;
  const swipeActionWidth = isEmpty ? BEAN_ACTION_WIDTH_EMPTY : BEAN_ACTION_WIDTH_ACTIVE;
  const emptiedDate = formatBeanShortDate(bean.emptiedAt);
  return {
    ...bean,
    primaryName,
    nameMetaParts,
    nameParts,
    nameAndVariety,
    isEmpty,
    swipeActionWidth,
    swipeOpenStyle: `transform:translateX(-${swipeActionWidth}rpx);`,
    stockPercent,
    stockRingStyle: `background: radial-gradient(circle, #fffdf8 0 52%, transparent 53%), conic-gradient(#c79633 ${stockPercent}%, #eadcbf 0);`,
    artSeed: bean.id || primaryName,
    cardArtStyle: buildBeanCardArtStyle(bean.id || primaryName),
    placeText: joinBeanCardParts([bean.country, bean.origin]),
    specText: joinBeanCardParts([bean.variety, bean.process, bean.roastLevel]),
    flavorNotesText: joinBeanCardParts(String(bean.flavorDescription || "").split(/[,，、;；/|·]+/)),
    roasterText: bean.roaster || "未填写",
    roastDateText: roastDate ? `烘焙日期 ${roastDate}` : "未填写烘焙日期",
    restingText: isEmpty ? `空袋日 ${emptiedDate || "未记录"}` : (restingDays === null ? "" : `放置 ${restingDays} 天`),
    countryText: bean.country || "未填写",
    originText: bean.origin || "未填写",
    varietyText: bean.variety || "未填写",
    processText: bean.process || "未填写",
    flavorText: bean.flavorDescription || "未填写",
    roastLevelText: bean.roastLevel || "未填写",
    roastDetailText: roastDetailDate ? `${roastDetailDate}烘` : "未填写"
  };
}

// Eight clearly different hue families (each with its own tinted base), so stacked
// cards are easy to tell apart at a glance.
const BEAN_CARD_ART_PALETTES = [
  { base: ["#fbf1ef", "#f4e2df"], blobs: ["rgba(232, 156, 150, 0.78)", "rgba(244, 196, 182, 0.7)", "rgba(220, 172, 200, 0.55)"] },
  { base: ["#fcf3e8", "#f6e4d0"], blobs: ["rgba(240, 172, 118, 0.78)", "rgba(250, 212, 166, 0.7)", "rgba(228, 156, 136, 0.5)"] },
  { base: ["#fbf5e4", "#f3e7c8"], blobs: ["rgba(226, 184, 100, 0.82)", "rgba(242, 216, 146, 0.7)", "rgba(208, 168, 116, 0.5)"] },
  { base: ["#f1f5ec", "#e2eada"], blobs: ["rgba(160, 196, 148, 0.78)", "rgba(208, 222, 176, 0.7)", "rgba(140, 186, 164, 0.5)"] },
  { base: ["#edf5f4", "#dcebe9"], blobs: ["rgba(132, 194, 190, 0.75)", "rgba(186, 222, 214, 0.7)", "rgba(160, 192, 222, 0.5)"] },
  { base: ["#eff3f9", "#dde5f2"], blobs: ["rgba(148, 180, 226, 0.78)", "rgba(198, 214, 238, 0.7)", "rgba(176, 164, 222, 0.5)"] },
  { base: ["#f4f0f9", "#e7dff2"], blobs: ["rgba(184, 160, 226, 0.78)", "rgba(222, 204, 238, 0.7)", "rgba(236, 184, 208, 0.5)"] },
  { base: ["#f5efe9", "#e8ddd2"], blobs: ["rgba(182, 140, 116, 0.72)", "rgba(220, 192, 170, 0.7)", "rgba(166, 134, 146, 0.5)"] }
];

function hashBeanCardSeed(seed) {
  const text = String(seed || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getBeanCardPaletteIndex(seed) {
  return hashBeanCardSeed(seed) % BEAN_CARD_ART_PALETTES.length;
}

function buildBeanCardArtStyle(seed, paletteIndex = getBeanCardPaletteIndex(seed)) {
  const hash = hashBeanCardSeed(seed);
  const palette = BEAN_CARD_ART_PALETTES[paletteIndex % BEAN_CARD_ART_PALETTES.length];
  const [first, second, third] = palette.blobs;
  const pick = (shift, min, span) => min + ((hash >>> shift) % span);
  return [
    `background-color:${palette.base[0]};`,
    "background-image:",
    `linear-gradient(${pick(3, 100, 40)}deg, transparent 42%, rgba(255, 255, 255, 0.55) 49%, transparent 56%),`,
    `radial-gradient(ellipse at ${pick(5, 72, 28)}% ${pick(8, 0, 40)}%, ${first} 0, transparent 58%),`,
    `radial-gradient(ellipse at ${pick(11, 60, 40)}% ${pick(14, 60, 40)}%, ${second} 0, transparent 55%),`,
    `radial-gradient(ellipse at ${pick(17, 40, 40)}% ${pick(20, 90, 20)}%, ${third} 0, transparent 50%),`,
    `linear-gradient(160deg, ${palette.base[0]} 0%, ${palette.base[1]} 100%);`
  ].join("");
}

// For stacked lists: keep each item's own colour, but never let two neighbouring
// cards share a palette, so the stack doesn't blur together.
function withDistinctCardArt(items) {
  let previous = -1;
  return (Array.isArray(items) ? items : []).map((item) => {
    let paletteIndex = getBeanCardPaletteIndex(item.artSeed);
    if (paletteIndex === previous) paletteIndex = (paletteIndex + 1) % BEAN_CARD_ART_PALETTES.length;
    previous = paletteIndex;
    return { ...item, cardArtStyle: buildBeanCardArtStyle(item.artSeed, paletteIndex) };
  });
}

function joinBeanCardParts(parts) {
  return (Array.isArray(parts) ? parts : [])
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" · ");
}

function decorateRecipe(recipe) {
  const stages = decorateStages(recipe.stages, recipe.temperature);
  const stepsText = stages.map((stage, index) => `${index + 1}. ${stage.rangeText} ${stage.name}`).join(" / ");
  const totalSeconds = sum(stages.map((stage) => stage.duration)) || parseTimeToSeconds(recipe.totalTime) || 1;
  const timeline = buildRecipeTimeline(recipe, stages, totalSeconds);
  const grinder = String(recipe.grinder || "").trim();
  const grind = String(recipe.grind || "").trim();
  const totalTimeText = recipe.totalTime || formatTime(totalSeconds);
  return {
    ...recipe,
    nameText: recipe.name || "未命名方案",
    roasterText: recipe.roasterName || "/",
    dripperText: recipe.dripper || "/",
    water: Math.round(Number(recipe.water) || (Number(recipe.dose) || 0) * (Number(recipe.ratio) || 0)),
    ice: Math.round(Number(recipe.ice) || 0),
    temperatureText: recipe.temperature === "" ? "-" : recipe.temperature,
    temperatureDisplay: recipe.temperature === "" ? "-" : `${recipe.temperature}°C`,
    grindText: [grinder, grind].filter(Boolean).join(" / ") || "/",
    grinderText: grinder || "/",
    grindSizeText: grind || "/",
    waterQualityText: recipe.waterQuality || "/",
    filterPaperText: recipe.filterPaper || "/",
    totalTimeText,
    ratioText: `1:${formatWater(recipe.ratio)}`,
    targetText: recipe.target || "",
    stepsText: stepsText || "/",
    timelinePoints: timeline.points,
    timelineSegments: timeline.segments,
    ...buildRecipeDetailView(recipe, stages, { grinder, grind, totalTimeText })
  };
}

// Same layout as the brew detail: four key numbers, a short equipment list, rarer
// fields behind "更多参数", and step cards under a proportional time bar.
function buildRecipeDetailView(recipe, stages, { grinder, grind, totalTimeText }) {
  const dose = Number(recipe.dose) || 0;
  const water = Math.round(Number(recipe.water) || dose * (Number(recipe.ratio) || 0));
  const ice = Math.round(Number(recipe.ice) || 0);
  const temperature = recipe.temperature === "" || recipe.temperature === undefined ? "" : `${recipe.temperature}°C`;
  return {
    detailKeyStats: [
      {
        label: "粉水比",
        value: recipe.ratio ? `1 : ${formatWater(recipe.ratio)}` : "-",
        sub: dose && water ? `${formatWater(dose)}g → ${formatWater(water)}g${ice ? ` + 冰 ${ice}g` : ""}` : ""
      },
      { label: "水温", value: temperature || "-", sub: "" },
      { label: "冲煮时间", value: totalTimeText || "-", sub: "" },
      { label: "研磨度", value: shortGrindText(grind) || "-", sub: grinder }
    ],
    detailListRows: [
      { label: "滤杯", value: recipe.dripper || "" },
      { label: "滤纸", value: recipe.filterPaper || "" },
      { label: "磨豆机", value: grinder },
      { label: "冰块", value: ice ? `${ice}g` : "" }
    ].filter((row) => String(row.value || "").trim()),
    detailMoreRows: [
      { label: "水质", value: recipe.waterQuality || "" },
      { label: "研磨度说明", value: grind !== shortGrindText(grind) ? grind : "" }
    ].filter((row) => row.label !== "研磨度说明" || row.value).map((row) => ({
      ...row,
      value: String(row.value || "").trim() || "未填写",
      isEmpty: !String(row.value || "").trim()
    })),
    detailMoreFilledCount: [recipe.waterQuality].filter((value) => String(value || "").trim()).length,
    detailStages: stages.map((stage, index) => ({
      ...stage,
      index: index + 1,
      spanSeconds: Math.max(1, Number(stage.duration) || 1),
      spanText: `${Number(stage.duration) || 0}s`,
      waterText: stage.cumulativeWater ? `${formatWater(stage.cumulativeWater)}g` : ""
    }))
  };
}

function buildRecipeTimeline(recipe, stages, totalSeconds) {
  const recipeId = recipe.id || "recipe";
  const sourcePoints = [
    { id: `${recipeId}-timeline-start`, water: 0, time: 0 },
    ...stages.map((stage, index) => ({
      id: `${recipeId}-timeline-${index}`,
      water: Number(stage.cumulativeWater) || 0,
      time: Math.max(0, Math.round(Number(stage.end) || 0))
    }))
  ];
  return buildWaterTimeline(recipeId, sourcePoints, totalSeconds);
}

function buildWaterTimeline(idPrefix, sourcePoints, totalSeconds) {
  const safeTotalSeconds = Math.max(1, Math.round(Number(totalSeconds) || 1));
  const rawPoints = sourcePoints.map((point) => {
    const safeTime = Math.max(0, Math.round(Number(point.time) || 0));
    const water = Number(point.water) || 0;
    const x = Math.min(WATER_TIMELINE_WIDTH, Math.max(0, round((safeTime / safeTotalSeconds) * WATER_TIMELINE_WIDTH)));
    return { point, safeTime, water, x };
  });
  const waterValues = rawPoints.map((item) => item.water);
  const minWater = waterValues.length ? Math.min(0, ...waterValues) : 0;
  const maxWater = waterValues.length ? Math.max(...waterValues) : 0;
  const waterSpan = maxWater - minWater;
  const visibleTimeIndexes = new Set();
  if (rawPoints.length) {
    const lastIndex = rawPoints.length - 1;
    visibleTimeIndexes.add(lastIndex);
    let lastVisibleX = rawPoints[lastIndex].x;
    for (let index = lastIndex - 1; index > 0; index -= 1) {
      if (Math.abs(lastVisibleX - rawPoints[index].x) >= 72) {
        visibleTimeIndexes.add(index);
        lastVisibleX = rawPoints[index].x;
      }
    }
    visibleTimeIndexes.add(0);
  }
  const waterLabelPositions = [];
  const points = rawPoints.map((item, index) => {
    const { point, safeTime, x } = item;
    const y = waterSpan > 0
      ? round(((item.water - minWater) / waterSpan) * WATER_TIMELINE_HEIGHT)
      : 0;
    let waterLane = 0;
    while (
      waterLane < 3
      && waterLabelPositions.some((position) => (
        Math.abs(x - position.x) < 72
        && Math.abs((y + waterLane * 30) - position.y) < 30
      ))
    ) {
      waterLane += 1;
    }
    const waterLabelY = y + waterLane * 30;
    waterLabelPositions.push({ x, y: waterLabelY });
    const showTimeLabel = visibleTimeIndexes.has(index);
    const edgeClass = x <= 48 ? "align-start" : x >= WATER_TIMELINE_WIDTH - 96 ? "align-end" : "";
    return {
      id: point.id || `${idPrefix}-point-${index}`,
      waterText: `${formatWater(point.water)}g`,
      timeText: showTimeLabel ? `${safeTime}s` : "",
      edgeClass,
      style: `left:${x}rpx;bottom:${y}rpx;`,
      guideStyle: showTimeLabel ? `left:${x}rpx;height:${y}rpx;` : "display:none;",
      timeLabelStyle: `left:${x}rpx;bottom:-34rpx;`,
      waterLabelStyle: `left:${x}rpx;bottom:${waterLabelY}rpx;`,
      x,
      y
    };
  });
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index];
    const dx = point.x - previous.x;
    const dy = point.y - previous.y;
    const length = Math.sqrt((dx * dx) + (dy * dy));
    const angle = length ? Math.atan2(dy, dx) * 180 / Math.PI : 0;
    return {
      id: `${idPrefix}-timeline-segment-${index}`,
      style: `left:${previous.x}rpx;bottom:${previous.y}rpx;width:${round(length)}rpx;transform:rotate(${-round(angle)}deg);`
    };
  });
  return { points, segments };
}

function decorateLog(log, bean = null) {
  const beanName = (bean && bean.name) || log.beanName || "";
  const country = (bean && bean.country) || log.country || "";
  const origin = (bean && bean.origin) || log.origin || "";
  const process = (bean && bean.process) || log.process || "";
  const variety = (bean && bean.variety) || log.variety || "";
  const roaster = (bean && bean.roaster) || log.roaster || "";
  const roastDate = (bean && bean.roastDate) || log.roastDate || "";
  const dripper = log.dripper || "";
  const grinder = log.grinder || "";
  const grindSize = log.grindSize || "";
  const nameLine = [beanName, process, variety].filter(Boolean).join(" · ");
  const roastDateText = formatRoastDate(roastDate);
  const detailRoastDateText = formatFullRoastDate(roastDate) || roastDateText;
  const sourceText = [
    roaster ? `烘焙商：${roaster}` : "",
    roastDateText ? `烘焙日期 ${roastDateText}` : ""
  ].filter(Boolean).join("      ");
  const waterStages = decorateLogWaterStages(log);
  const waterTimeline = buildLogWaterTimeline(log, waterStages);
  const totalSeconds = parseTimeToSeconds(log.totalTime);
  const ratioText = formatRatioDisplay(log.dose, log.water, log.ratio);
  const flavorScores = normalizeFlavorScores(log.tasting, 0);
  const rating = normalizeRating(log.rating);
  const beanInfoRows = [
    { label: "商品名称", value: beanName },
    { label: "国家", value: country },
    { label: "庄园 / 处理站", value: origin },
    { label: "处理法", value: process },
    { label: "烘焙商", value: roaster },
    { label: "烘焙日期", value: detailRoastDateText }
  ].map((row) => ({
    ...row,
    value: String(row.value || "").trim() || "/"
  }));
  const brewInfoRows = [
    { label: "滤杯", value: dripper },
    { label: "磨豆机", value: grinder },
    { label: "研磨度", value: grindSize },
    { label: "水质", value: log.waterQuality || "" },
    { label: "滤纸", value: log.filterPaper || "" },
    { label: "粉量", value: log.dose ? `${formatWater(log.dose)}g` : "" },
    { label: "注水量", value: log.water ? `${formatWater(log.water)}g` : "" },
    { label: "水温", value: log.temperature === "" ? "" : `${log.temperature}°C` },
    { label: "是否筛粉", value: log.sieve || "" },
    { label: "筛子目数", value: log.screenSize || "" }
  ].map((row) => ({
    ...row,
    value: String(row.value || "").trim() || "/"
  }));
  return {
    ...log,
    nameLine,
    productNameText: beanName || "未命名商品",
    beanNameText: beanName || "未命名豆子",
    varietyText: variety,
    processText: process,
    roasterText: roaster,
    roastDateText,
    dripperText: dripper,
    shortDateText: formatShortDisplayDate(log.createdAt),
    recordCardMetrics: [
      { label: "温度", value: log.temperature === "" ? "-" : `${formatWater(log.temperature)}°C` },
      { label: "时间", value: totalSeconds ? `${totalSeconds}s` : "-" },
      { label: "粉量", value: log.dose ? `${formatWater(log.dose)}g` : "-" },
      { label: "比例", value: ratioText === "/" ? "-" : ratioText },
      { label: "研磨度", value: grindSize || "-" }
    ],
    sourceText,
    beanInfoRows,
    brewInfoRows,
    waterStages,
    waterTimelinePoints: waterTimeline.points,
    waterTimelineSegments: waterTimeline.segments,
    extractionRows: [
      { label: "浓度比 TDS", value: log.tds || "/" },
      { label: "萃取率", value: log.extractionRate || "/" }
    ],
    rating,
    ratingStarWidths: getRatingStarWidths(rating),
    flavorScores,
    flavorScoreItems: FLAVOR_SCORE_AXES.map((axis) => ({
      ...axis,
      value: flavorScores[axis.key]
    })),
    totalTimeText: log.totalTime || "",
    notesDetailText: log.notes || "暂无结果评价",
    detailHeroArtStyle: buildBeanCardArtStyle(log.beanId || beanName || log.id),
    detailPourTotalText: log.totalTime
      || (waterStages.length ? formatTime(waterStages[waterStages.length - 1].timelineTime || 0) : "-"),
    detailHeroSubtitle: joinBeanCardParts([roaster, [country, origin].filter(Boolean).join(" "), process]),
    detailKeyStats: [
      {
        label: "粉水比",
        value: ratioText === "/" ? "-" : ratioText.replace(":", " : "),
        sub: log.dose && log.water ? `${formatWater(log.dose)}g → ${formatWater(log.water)}g` : ""
      },
      { label: "水温", value: log.temperature === "" ? "-" : `${formatWater(log.temperature)}°C`, sub: "" },
      { label: "总时间", value: totalSeconds ? formatTime(totalSeconds) : (log.totalTime || "-"), sub: "" },
      { label: "研磨度", value: shortGrindText(grindSize) || "-", sub: grinder }
    ],
    detailListRows: [
      { label: "滤杯", value: dripper },
      { label: "滤纸", value: log.filterPaper || "" },
      { label: "磨豆机", value: grinder },
      { label: "品种", value: variety },
      { label: "烘焙日期", value: detailRoastDateText }
    ].filter((row) => String(row.value || "").trim()),
    // Less common fields sit behind a "更多参数" toggle instead of showing "/" by default.
    detailMoreRows: [
      { label: "水质", value: log.waterQuality || "" },
      { label: "是否筛粉", value: log.sieve || "" },
      { label: "筛子目数", value: log.screenSize || "" },
      { label: "研磨度说明", value: grindSize !== shortGrindText(grindSize) ? grindSize : "" }
    ].filter((row) => row.label !== "研磨度说明" || row.value).map((row) => ({
      ...row,
      value: String(row.value || "").trim() || "未填写",
      isEmpty: !String(row.value || "").trim()
    })),
    detailMoreFilledCount: [log.waterQuality, log.sieve, log.screenSize].filter((value) => String(value || "").trim()).length,
    temperatureText: log.temperature === "" ? "-" : log.temperature,
    dateText: formatDisplayDate(log.createdAt)
  };
}

// "中度（Ditting KR804 Lab 8.0-9.5；C40 MK4 25-28）" -> "中度": the bracketed grinder notes
// are reference ranges, too long for cards and key stats.
function shortGrindText(value) {
  const text = String(value || "").trim();
  const head = text.split(/[（(]/)[0].trim();
  return head || text;
}

// The three most recent distinct grinder + grind setting pairs, newest first.
function buildRecentGrindPresets(logs) {
  const seen = new Set();
  const presets = [];
  for (const log of Array.isArray(logs) ? logs : []) {
    const grinder = String((log && log.grinder) || "").trim();
    const grind = String((log && log.grindSize) || "").trim();
    if (!grinder && !grind) continue;
    const key = `${grinder}|${grind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    presets.push({
      key,
      grinder,
      grind,
      label: [grinder, shortGrindText(grind)].filter(Boolean).join(" · ")
    });
    if (presets.length === 3) break;
  }
  return presets;
}

function decorateLogCard(log, bean = null) {
  const beanName = (bean && bean.name) || log.beanName || "";
  const roaster = (bean && bean.roaster) || log.roaster || "";
  const grindSize = log.grindSize || "";
  const totalSeconds = parseTimeToSeconds(log.totalTime);
  const ratioText = formatRatioDisplay(log.dose, log.water, log.ratio);
  const rating = normalizeRating(log.rating);
  return {
    id: log.id,
    productNameText: beanName || "未命名商品",
    roasterText: roaster,
    shortDateText: formatShortDisplayDate(log.createdAt),
    recordCardMetrics: [
      { label: "温度", value: log.temperature === "" ? "-" : `${formatWater(log.temperature)}°C` },
      { label: "时间", value: totalSeconds ? `${totalSeconds}s` : "-" },
      { label: "粉量", value: log.dose ? `${formatWater(log.dose)}g` : "-" },
      { label: "比例", value: ratioText === "/" ? "-" : ratioText },
      { label: "研磨度", value: shortGrindText(grindSize) || "-" }
    ],
    rating,
    ratingStarWidths: getRatingStarWidths(rating),
    artSeed: log.beanId || beanName || log.id,
    cardArtStyle: buildBeanCardArtStyle(log.beanId || beanName || log.id),
    subtitleText: joinBeanCardParts([roaster, formatShortDisplayDate(log.createdAt)]),
    notesText: String(log.notes || "").trim()
  };
}

function decorateLogWaterStages(log) {
  const stages = Array.isArray(log.stages) ? log.stages : [];
  if (!stages.length) return [];
  const actualTotal = parseTimeToSeconds(log.totalTime) || 0;
  const prepared = stages.map((stage, index) => {
    const name = String(stage.name || "");
    return {
      id: `${log.id || "log"}-water-${index}`,
      index: index + 1,
      name,
      instructionText: getStageInstructionText(name),
      water: round(Number(stage.cumulativeWater !== undefined && stage.cumulativeWater !== null ? stage.cumulativeWater : stage.water) || 0),
      temperature: stage.temperature === "" || stage.temperature === null || stage.temperature === undefined
        ? log.temperature
        : stage.temperature,
      duration: Math.max(0, Math.round(Number(stage.duration) || parseDuration(stage.time) || parseTimeToSeconds(stage.time) || 0)),
      endTime: Math.max(0, Math.round(Number(stage.endTime) || parseTimeToSeconds(stage.endTimeText) || 0))
    };
  });
  const rawTotal = sum(prepared.map((stage) => stage.duration));
  const fallbackDuration = !rawTotal && actualTotal && prepared.length
    ? actualTotal / prepared.length
    : 0;
  const maxWater = Math.max(1, ...prepared.map((stage) => stage.water));
  let elapsed = 0;
  return prepared.map((stage, index) => {
    const startTime = Math.round(elapsed);
    elapsed += stage.duration || fallbackDuration;
    const isLastStage = index === prepared.length - 1;
    const plannedEndTime = stage.endTime || Math.round(elapsed);
    const endTime = isLastStage && actualTotal ? actualTotal : plannedEndTime;
    const height = 18 + Math.round((stage.water / maxWater) * 60);
    return {
      ...stage,
      waterText: stage.water ? `${formatWater(stage.water)}g` : "",
      timeText: endTime ? formatTime(endTime) : "",
      rangeText: `${formatTime(startTime)}-${formatTime(endTime)}`,
      startText: formatTime(startTime),
      endText: formatTime(endTime),
      spanSeconds: Math.max(1, endTime - startTime),
      spanText: `${Math.max(0, endTime - startTime)}s`,
      temperatureText: stage.temperature === "" || stage.temperature === null || stage.temperature === undefined
        ? "-"
        : `${stage.temperature}°C`,
      timelineTime: endTime,
      style: `height:${height}rpx;`
    };
  });
}

function buildLogWaterTimeline(log, waterStages) {
  const logId = log.id || "log";
  const points = [
    { id: `${logId}-water-timeline-start`, water: 0, time: 0 },
    ...waterStages.map((stage, index) => ({
      id: `${logId}-water-timeline-${index}`,
      water: stage.water,
      time: stage.timelineTime || parseTimeToSeconds(stage.timeText) || 0
    }))
  ];
  const totalSeconds = parseTimeToSeconds(log.totalTime)
    || Math.max(1, ...points.map((point) => Number(point.time) || 0));
  return buildWaterTimeline(`${logId}-water`, points, totalSeconds);
}

function buildStatsOverview(logs, range, beansById = {}, anchorDateValue = "") {
  const safeRange = ["day", "week", "month", "year"].includes(range) ? range : "day";
  const referenceDate = parseStatsDate(anchorDateValue) || new Date();
  const period = getStatsPeriod(safeRange, referenceDate);
  const allPreparedLogs = (Array.isArray(logs) ? logs : [])
    .map((log) => {
      const normalized = normalizeLog(log);
      const bean = beansById[normalized.beanId] || null;
      return {
        log: {
          ...normalized,
          country: (bean && bean.country) || normalized.country || "",
          origin: (bean && bean.origin) || normalized.origin || "",
          roaster: (bean && bean.roaster) || normalized.roaster || "",
          process: (bean && bean.process) || normalized.process || "",
          variety: (bean && bean.variety) || normalized.variety || ""
        },
        date: parseStatsDate(normalized.createdAt)
      };
    })
    .filter((item) => item.date);
  const preparedLogs = allPreparedLogs.filter((item) => item.date >= period.start && item.date < period.end);
  const scopedLogs = preparedLogs.map((item) => item.log);
  const totalGrams = round(sum(scopedLogs.map((log) => log.dose)));
  const brewCount = scopedLogs.length;
  const averageDose = brewCount ? round(totalGrams / brewCount) : 0;
  const showTrendChart = true;
  const trendPeriod = getStatsTrendPeriod(safeRange, period);
  const trendBars = buildStatsTrendBars(allPreparedLogs, safeRange, trendPeriod, period.reference);
  const currentPeriod = getStatsPeriod(safeRange);
  const isCurrentPeriod = period.start.getTime() === currentPeriod.start.getTime()
    && period.end.getTime() === currentPeriod.end.getTime();
  const currentRangeNames = { day: "今日", week: "本周", month: "本月", year: "本年" };
  const selectedRangeNames = { day: "当日", week: "该周", month: "该月", year: "该年" };
  const regionBreakdown = buildStatsCategoryBars(scopedLogs, getStatsRegionLabel);
  const varietyBreakdown = buildStatsCategoryBars(scopedLogs, getStatsVarietyLabel);
  const processBreakdown = buildStatsCategoryBars(scopedLogs, getStatsProcessLabel);
  const roasterBreakdown = buildStatsCategoryBars(scopedLogs, getStatsRoasterLabel);
  const previousPeriod = getStatsPeriod(safeRange, addDays(period.start, -1));
  const previousGrams = round(sum(allPreparedLogs
    .filter((item) => item.date >= previousPeriod.start && item.date < previousPeriod.end)
    .map((item) => item.log.dose)));
  const gramsDelta = round(totalGrams - previousGrams);
  const previousNames = { day: "前一天", week: "上周", month: "上月", year: "去年" };
  const ratedLogs = scopedLogs.map((log) => normalizeRating(log.rating)).filter((rating) => rating > 0);
  const averageRating = ratedLogs.length ? Math.round((sum(ratedLogs) / ratedLogs.length) * 10) / 10 : 0;
  const topBean = buildStatsCategoryBars(scopedLogs, (log) => String(log.beanName || "").trim())[0];
  const summaryWho = isCurrentPeriod
    ? currentRangeNames[safeRange]
    : formatStatsBreakdownPeriodText(period, safeRange);
  const summaryText = brewCount
    ? `${summaryWho}你冲了 ${brewCount} 次，用掉 ${formatWater(totalGrams)}g${topBean && topBean.label !== "未填写" ? `，喝得最多的是 ${topBean.label}` : ""}。`
    : `${summaryWho}还没有冲煮记录。`;
  return {
    range: safeRange,
    rangeName: (isCurrentPeriod ? currentRangeNames : selectedRangeNames)[safeRange],
    periodText: formatStatsPeriodText(period, safeRange),
    breakdownPeriodText: formatStatsBreakdownPeriodText(period, safeRange),
    totalGrams,
    totalGramsText: `${formatWater(totalGrams)}g`,
    brewCount,
    brewCountText: `${brewCount} 次`,
    averageDoseText: brewCount ? `${formatWater(averageDose)}g/次` : "-",
    showTrendChart,
    hasTrendData: trendBars.some((bar) => bar.grams > 0),
    trendTitle: getStatsTrendTitle(safeRange),
    trendPeriodText: getStatsTrendPeriodText(safeRange, trendPeriod, allPreparedLogs),
    trendBars,
    deltaText: gramsDelta
      ? `比${previousNames[safeRange]} ${gramsDelta > 0 ? "+" : "−"}${formatWater(Math.abs(gramsDelta))}g`
      : `与${previousNames[safeRange]}持平`,
    deltaTone: gramsDelta > 0 ? "is-up" : (gramsDelta < 0 ? "is-down" : ""),
    averageRatingText: averageRating ? String(averageRating) : "-",
    summaryText,
    breakdowns: {
      region: regionBreakdown,
      variety: varietyBreakdown,
      process: processBreakdown,
      roaster: roasterBreakdown
    },
    regionBreakdown,
    regionPieStyle: buildStatsPieStyle(regionBreakdown),
    varietyBreakdown,
    varietyPieStyle: buildStatsPieStyle(varietyBreakdown),
    processBreakdown,
    processPieStyle: buildStatsPieStyle(processBreakdown),
    roasterBreakdown,
    roasterPieStyle: buildStatsPieStyle(roasterBreakdown),
    isEmpty: brewCount === 0
  };
}

function getStatsPeriod(range, referenceValue = new Date()) {
  const today = startOfDay(parseStatsDate(referenceValue) || new Date());
  if (range === "day") {
    return {
      reference: today,
      start: today,
      end: addDays(today, 1)
    };
  }
  if (range === "year") {
    return {
      reference: today,
      start: new Date(today.getFullYear(), 0, 1),
      end: new Date(today.getFullYear() + 1, 0, 1)
    };
  }
  if (range === "month") {
    return {
      reference: today,
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 1)
    };
  }
  const day = today.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const start = addDays(today, -mondayOffset);
  return {
    reference: today,
    start,
    end: addDays(start, 7)
  };
}

function getStatsTrendPeriod(range, selectedPeriod) {
  const reference = startOfDay(
    selectedPeriod && selectedPeriod.reference instanceof Date
      ? selectedPeriod.reference
      : (selectedPeriod && selectedPeriod.start) || new Date()
  );
  if (range === "day") {
    const day = reference.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const start = addDays(reference, -mondayOffset);
    return {
      reference,
      start,
      end: addDays(start, 7)
    };
  }
  if (range === "week") {
    return {
      reference,
      start: new Date(reference.getFullYear(), reference.getMonth(), 1),
      end: new Date(reference.getFullYear(), reference.getMonth() + 1, 1)
    };
  }
  if (range === "month") {
    return {
      reference,
      start: new Date(reference.getFullYear(), 0, 1),
      end: new Date(reference.getFullYear() + 1, 0, 1)
    };
  }
  return selectedPeriod;
}

function buildStatsTrendBars(preparedLogs, range, period, activeDateValue = null) {
  const buckets = getStatsTrendBuckets(range, period, preparedLogs);
  const activeDate = parseStatsDate(activeDateValue)
    || parseStatsDate(period && period.reference)
    || (period && period.start)
    || new Date();
  const bucketTotals = buckets.map((bucket) => {
    const grams = round(sum(preparedLogs
      .filter((item) => item.date >= bucket.start && item.date < bucket.end)
      .map((item) => item.log.dose)));
    return { ...bucket, grams };
  });
  const maxGrams = Math.max(1, ...bucketTotals.map((bucket) => bucket.grams));
  return bucketTotals.map((bucket) => {
    const height = bucket.grams ? 26 + Math.round((bucket.grams / maxGrams) * 112) : 8;
    return {
      id: bucket.id,
      label: bucket.label,
      subLabel: bucket.subLabel,
      grams: bucket.grams,
      valueText: bucket.grams ? `${formatWater(bucket.grams)}g` : "",
      anchorTimestamp: Math.round((bucket.start.getTime() + bucket.end.getTime()) / 2),
      isActive: activeDate >= bucket.start && activeDate < bucket.end,
      style: `height:${height}rpx;`
    };
  });
}

function getStatsTrendBuckets(range, period, preparedLogs = []) {
  if (range === "day") {
    const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];
    return weekLabels.map((label, index) => {
      const start = addDays(period.start, index);
      return {
        id: `day-${index}`,
        label,
        subLabel: formatMonthDay(start),
        start,
        end: addDays(start, 1)
      };
    });
  }
  if (range === "week") {
    const firstDay = period.start;
    const mondayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const firstWeekStart = addDays(firstDay, -mondayOffset);
    const buckets = [];
    let start = firstWeekStart;
    while (start < period.end) {
      const end = addDays(start, 7);
      buckets.push({
        id: `week-${getLogDateKey(start)}`,
        label: `第${buckets.length + 1}周`,
        subLabel: `${formatMonthDay(start)}-${formatMonthDay(addDays(end, -1))}`,
        start,
        end
      });
      start = end;
    }
    return buckets;
  }
  if (range === "year") {
    const years = getStatsTrendYears(preparedLogs, period.start.getFullYear());
    return years.map((year) => ({
      id: `year-${year}`,
      label: `${year}`,
      subLabel: "年",
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1)
    }));
  }
  if (range === "month") {
    return Array.from({ length: 12 }, (_, index) => {
      const year = period.start.getFullYear();
      const start = new Date(year, index, 1);
      return {
        id: `month-${index}`,
        label: `${index + 1}月`,
        subLabel: "",
        start,
        end: new Date(year, index + 1, 1)
      };
    });
  }
  return [];
}

function getStatsTrendYears(preparedLogs, fallbackYear) {
  const years = [...new Set([
    fallbackYear,
    ...(Array.isArray(preparedLogs) ? preparedLogs : [])
    .map((item) => item.date)
    .filter(Boolean)
    .map((date) => date.getFullYear())
  ])].filter(Number.isFinite).sort((a, b) => a - b);
  return years.length ? years : [new Date().getFullYear()];
}

function buildStatsCategoryBars(logs, getLabel) {
  const grouped = (Array.isArray(logs) ? logs : []).reduce((result, log) => {
    const label = getLabel(log) || "未填写";
    if (!result[label]) result[label] = { label, grams: 0, count: 0 };
    result[label].grams = round(result[label].grams + (Number(log.dose) || 0));
    result[label].count += 1;
    return result;
  }, {});
  const sorted = Object.values(grouped).sort((a, b) => b.grams - a.grams || a.label.localeCompare(b.label));
  const visible = sorted;
  const total = Math.max(1, sum(visible.map((item) => item.grams)));
  const maxGrams = Math.max(1, ...visible.map((item) => item.grams));
  return visible.map((item, index) => {
    const width = item.grams ? Math.max(8, Math.round((item.grams / maxGrams) * 100)) : 0;
    const color = STATS_PIE_COLORS[index % STATS_PIE_COLORS.length];
    return {
      id: `${index}-${item.label}`,
      label: item.label,
      grams: item.grams,
      gramsText: `${formatWater(item.grams)}g`,
      percentText: `${Math.round((item.grams / total) * 100)}%`,
      countText: `${item.count} 次`,
      color,
      colorStyle: `background:${color};`,
      style: `width:${width}%;`,
      barStyle: `width:${width}%;background:${index === 0 ? "#b88222" : "#e2c48a"};`
    };
  });
}

function buildStatsPieStyle(items) {
  const source = Array.isArray(items) ? items.filter((item) => Number(item.grams) > 0) : [];
  const total = sum(source.map((item) => item.grams));
  if (!source.length || !total) return "background:#eee5d7;";
  let cursor = 0;
  const segments = source.map((item, index) => {
    const start = cursor;
    cursor = index === source.length - 1
      ? 100
      : round(cursor + ((Number(item.grams) || 0) / total) * 100);
    return `${item.color || STATS_PIE_COLORS[index % STATS_PIE_COLORS.length]} ${start}% ${cursor}%`;
  });
  return `background:conic-gradient(from -90deg, ${segments.join(",")});`;
}

function getStatsRegionLabel(log) {
  return String(log.country || log.origin || "").trim();
}

function getStatsProcessLabel(log) {
  return String(log.process || "").trim();
}

function getStatsVarietyLabel(log) {
  return String(log.variety || "").trim();
}

function getStatsRoasterLabel(log) {
  return String(log.roaster || "").trim();
}

function parseStatsDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatStatsPeriodText(period, range) {
  if (range === "year") return `${period.start.getFullYear()}年`;
  if (range === "month") return `${period.start.getFullYear()}/${period.start.getMonth() + 1}`;
  if (range === "day") return formatShortDate(period.start);
  return `${formatShortDate(period.start)}-${formatMonthDay(addDays(period.end, -1))}`;
}

function formatStatsBreakdownPeriodText(period, range) {
  if (range === "day") return `${period.start.getMonth() + 1}月${period.start.getDate()}日`;
  if (range === "year") return `${period.start.getFullYear()}年`;
  if (range === "month") return `${period.start.getFullYear()}年${period.start.getMonth() + 1}月`;
  return `${formatMonthDay(period.start)}-${formatMonthDay(addDays(period.end, -1))}`;
}

function getStatsTrendPeriodText(range, period, preparedLogs) {
  if (range === "year") {
    return `${period.start.getFullYear()}年`;
  }
  if (range === "month") return `${period.start.getFullYear()}年`;
  if (range === "week") return `${period.start.getFullYear()}/${period.start.getMonth() + 1}`;
  return `${formatShortDate(period.start)}-${formatMonthDay(addDays(period.end, -1))}`;
}

function getStatsTrendTitle(range) {
  if (range === "year") return "年消耗趋势";
  if (range === "month") return "月消耗趋势";
  if (range === "week") return "周消耗趋势";
  return "日消耗趋势";
}

function formatShortDate(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildLogEditForm(log, bean = null) {
  if (!log) {
    return {
      beanName: "",
      country: "",
      origin: "",
      process: "",
      roaster: "",
      roastDate: "",
      dripper: "",
      grinder: "",
      grindSize: "",
      dose: "",
      water: "",
      temperature: "",
      waterQuality: "",
      filterPaper: "",
      sieve: "",
      screenSize: "",
      tds: "",
      extractionRate: "",
      rating: 0,
      flavorScores: normalizeFlavorScores({}, 0),
      notes: ""
    };
  }
  const normalized = normalizeLog(log);
  return {
    beanName: (bean && bean.name) || normalized.beanName || "",
    country: (bean && bean.country) || normalized.country || "",
    origin: (bean && bean.origin) || normalized.origin || "",
    process: (bean && bean.process) || normalized.process || "",
    roaster: (bean && bean.roaster) || normalized.roaster || "",
    roastDate: (bean && bean.roastDate) || normalized.roastDate || "",
    dripper: normalized.dripper || "",
    grinder: normalized.grinder || "",
    grindSize: normalized.grindSize || "",
    dose: normalized.dose ? formatWater(normalized.dose) : "",
    water: normalized.water ? formatWater(normalized.water) : "",
    temperature: normalized.temperature === "" ? "" : String(normalized.temperature),
    waterQuality: normalized.waterQuality || "",
    filterPaper: normalized.filterPaper || "",
    sieve: normalized.sieve || "",
    screenSize: normalized.screenSize || "",
    tds: normalized.tds || "",
    extractionRate: normalized.extractionRate || "",
    rating: normalized.rating || 0,
    flavorScores: normalizeFlavorScores(normalized.tasting, 0),
    notes: normalized.notes || ""
  };
}

function getParameterSummary(form) {
  const dose = Number(form.dose) || 0;
  const water = Number(form.water) || 0;
  const temperature = String(form.temperature || "").trim();
  const grinder = [form.grinder, form.grind].map((value) => String(value || "").trim()).filter(Boolean).join(" / ");
  return {
    coffee: dose ? `${formatWater(dose)}g` : "-",
    water: water ? `${formatWater(water)}g` : "-",
    waterLabel: temperature ? `注水量（${temperature}°C）` : "注水量",
    grinder: grinder || "未设置",
    brewTime: String(form.totalTime || "").trim() || "-"
  };
}

function decorateStages(stages, fallbackTemperature = "") {
  let elapsed = 0;
  const sourceStages = normalizeStageTemplate(stages);
  return sourceStages.map((stage, index) => {
    const duration = Math.max(1, Math.round(Number(stage.duration) || parseDuration(stage.time) || 20));
    const start = elapsed;
    const end = elapsed + duration;
    const name = String(stage.name || "未命名步骤");
    const temperature = stage.temperature === "" || stage.temperature === null || stage.temperature === undefined
      ? fallbackTemperature
      : stage.temperature;
    elapsed = end;
    return {
      id: stage.id || `stage-${index}-${start}`,
      name,
      nameCursor: name.length,
      instructionText: getStageInstructionText(name),
      duration,
      cumulativeWater: round(Number(stage.cumulativeWater !== undefined && stage.cumulativeWater !== null ? stage.cumulativeWater : stage.water) || 0),
      temperature: temperature === "" || temperature === null || temperature === undefined ? "" : String(temperature),
      temperatureDisplay: temperature === "" || temperature === null || temperature === undefined ? "-" : `${temperature}°C`,
      start,
      end,
      startText: formatTime(start),
      endText: formatTime(end),
      rangeText: `${formatTime(start)}-${formatTime(end)}`
    };
  });
}

function getStageInstructionText(nameValue) {
  const name = String(nameValue || "未命名步骤");
  const separatorIndex = name.indexOf("：");
  const instruction = separatorIndex >= 0 ? name.slice(separatorIndex + 1).trim() : name;
  return instruction || name;
}

function removeDefaultStagePrefix(nameValue) {
  return String(nameValue || "未命名步骤").replace(/^(闷蒸|注水)\s*[：:]\s*/, "");
}

function alignFinalStageWater(stages, waterValue) {
  const water = round(Number(waterValue) || 0);
  const sourceStages = Array.isArray(stages) && stages.length ? stages : defaultStagesForWater(water);
  const nextStages = decorateStages(sourceStages).map((stage) => ({ ...stage }));
  if (nextStages.length) nextStages[nextStages.length - 1].cumulativeWater = water;
  return decorateStages(nextStages);
}

function normalizeStageTemplate(stages, fallbackWater) {
  if (!Array.isArray(stages) || !stages.length) return defaultStagesForWater(fallbackWater);
  return stages;
}

function scaleStagesToTotal(stages, totalSeconds) {
  const source = decorateStages(stages);
  if (!source.length) return decorateStages(defaultStagesForWater());
  const safeTotal = Math.max(source.length, Math.round(Number(totalSeconds) || source.length));
  let diff = safeTotal - sum(source.map((stage) => stage.duration));
  const adjusted = source.map((stage) => ({ ...stage }));
  for (let index = adjusted.length - 1; index >= 0 && diff !== 0; index -= 1) {
    const current = Math.max(1, Number(adjusted[index].duration) || 1);
    if (diff > 0) {
      adjusted[index].duration = current + diff;
      diff = 0;
    } else {
      const decrease = Math.min(current - 1, Math.abs(diff));
      adjusted[index].duration = current - decrease;
      diff += decrease;
    }
  }
  return decorateStages(adjusted);
}

function decorateDrippers(drippers, imageCache = {}) {
  const cache = imageCache && typeof imageCache === "object" ? imageCache : {};
  return drippers.map((name) => {
    const imageCloudSource = dripperImage(name);
    const imageCacheKey = imageCloudSource ? `dripper:${name}` : "";
    const cachedImage = imageCacheKey ? cache[imageCacheKey] : null;
    const image = cachedImage
      && cachedImage.source === imageCloudSource
      && cachedImage.path
      ? cachedImage.path
      : "";
    return {
      name,
      isPreset: DEFAULT_DRIPPERS.includes(name),
      isCustom: !DEFAULT_DRIPPERS.includes(name),
      displayName: formatDripperDisplayName(name),
      iconType: dripperIconType(name),
      image,
      imageDisplaySize: dripperImageDisplaySize(name),
      imageCacheKey,
      imageCloudSource,
      initial: image ? "" : dripperInitial(name)
    };
  });
}

function dripperImageDisplaySize(dripper) {
  const key = String(dripper || "").toLowerCase();
  if (key.includes("orea")) return 96;
  if (
    key.includes("kono")
    || key.includes("meimon")
    || key.includes("origami")
    || key.includes("lili")
    || key.includes("solo")
  ) return 92;
  if (
    key.includes("aero")
    || key.includes("april")
    || (key.includes("hario") && key.includes("v60") && !key.includes("switch"))
    || (key.includes("kalita") && !key.includes("102"))
    || key.includes("timemore")
    || key.includes("b75")
    || key.includes("山文")
    || key.includes("shanwen")
  ) return 86;
  if (
    key.includes("chemex")
    || key.includes("neo")
    || key.includes("v30")
    || key.includes("switch")
  ) return 82;
  return 78;
}

function dripperInitial(dripper) {
  const name = String(dripper || "").trim();
  if (!name) return "";
  const first = name.charAt(0);
  return /[a-z]/i.test(first) ? first.toUpperCase() : first;
}

function formatDripperDisplayName(dripper) {
  return String(dripper || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => {
      if (!/[a-z]/i.test(part)) return part;
      if (/^[a-z]*\d+[a-z]*$/i.test(part)) return part.toUpperCase();
      if (part.length <= 3 && part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function dripperImage(dripper) {
  const key = String(dripper).toLowerCase();
  let filename = "";
  if (key.includes("aero")) {
    filename = "dripper-aeropress.png";
  } else if (key.includes("chemex")) {
    filename = "dripper-chemex.png";
  } else if (key.includes("hario") && key.includes("v60") && key.includes("switch")) {
    filename = "dripper-hario-v60-switch.png";
  } else if (key.includes("hario") && key.includes("v60")) {
    filename = "dripper-hario-v60.png";
  } else if (key.includes("hario") && key.includes("neo")) {
    filename = "dripper-hario-neo.png";
  } else if (key.includes("hario") && key.includes("v30")) {
    filename = "dripper-hario-v30.png";
  } else if (key.includes("origami")) {
    filename = "dripper-origami.png";
  } else if (key.includes("kalita") && key.includes("102")) {
    filename = "dripper-kalita-102.png";
  } else if (key.includes("kalita")) {
    filename = "dripper-kalita-wave.png";
  } else if (key.includes("orea") && key.includes("v4")) {
    filename = "dripper-orea-v4.png";
  } else if (key.includes("april")) {
    filename = "dripper-april-brewer.png";
  } else if (key.includes("kono") || key.includes("meimon")) {
    filename = "dripper-kono-meimon.png";
  } else if (key.includes("solo")) {
    filename = "dripper-solo.png";
  } else if (key.includes("山文") || key.includes("shanwen")) {
    filename = "dripper-shanwen-62.png";
  } else if (key.includes("lili")) {
    filename = "dripper-lili.png";
  } else if (key.includes("timemore") || key.includes("b75")) {
    filename = "dripper-timemore-b75.png";
  }
  return filename ? getRoasterGuideCloudPath(`/assets/drippers/${filename}`) : "";
}

function dripperIconType(dripper) {
  const key = String(dripper).toLowerCase();
  if (key.includes("aero")) return "press";
  if (key.includes("chemex")) return "chemex";
  if (key.includes("origami")) return "origami";
  if (key.includes("flower")) return "flower";
  if (key.includes("kono")) return "handled";
  if (key.includes("mugen")) return "spiral";
  if (key.includes("switch") || key.includes("clever")) return "immersion";
  if (key.includes("orea") || key.includes("april")) return "bowl";
  if (key.includes("kalita") || key.includes("b75") || key.includes("stagg")) return "flat";
  return "cone";
}

function getTimerInfo(elapsed, stages, fallbackWater) {
  const safeStages = decorateStages(stages);
  const total = getTimerTotal(safeStages);
  const safeElapsed = Math.min(total, Math.max(0, Math.round(Number(elapsed) || 0)));
  let index = safeStages.findIndex((stage) => safeElapsed >= stage.start && safeElapsed < stage.end);
  if (index === -1) index = Math.max(0, safeStages.length - 1);
  const stage = safeStages[index] || safeStages[0];
  const stageElapsed = stage ? Math.min(stage.duration, Math.max(0, safeElapsed - stage.start)) : 0;
  const timerStageProgress = stage ? Math.min(100, Math.max(0, round((stageElapsed / stage.duration) * 100))) : 0;
  return {
    timerDisplay: formatTime(safeElapsed),
    timerStageIndex: index,
    timerStageName: (stage && stage.name) || "准备冲煮",
    timerStageRange: stage ? `${formatTime(stage.start)}-${formatTime(stage.end)}` : "0:00-0:00",
    timerStageProgress,
    timerWater: formatWater((stage && stage.cumulativeWater) || fallbackWater || 0)
  };
}

function getTimerTotal(stages, fallbackTime) {
  const total = sum((Array.isArray(stages) ? stages : []).map((stage) => stage.duration));
  return total || parseTimeToSeconds(fallbackTime) || 1;
}

function formatRatioDisplay(doseValue, waterValue, ratioValue) {
  const dose = Number(doseValue) || 0;
  const water = Number(waterValue) || 0;
  const exactRatio = getExactRatio(dose, water);
  if (exactRatio !== null) return `1:${formatWater(exactRatio)}`;
  const ratio = Number(ratioValue) || 0;
  const expectedWater = Math.round(dose * ratio);
  if (dose && water && water === expectedWater) return `1:${formatWater(ratio)}`;
  return "/";
}

function formatRecipeRatioDisplay(doseValue, waterValue, ratioValue) {
  const display = formatRatioDisplay(doseValue, waterValue, ratioValue);
  return display === "/" ? "" : display;
}

function getExactRatio(doseValue, waterValue) {
  const dose = Number(doseValue) || 0;
  const water = Number(waterValue) || 0;
  if (!dose || !water) return null;
  const ratio = water / dose;
  const rounded = Math.round(ratio);
  return Math.abs(ratio - rounded) < 0.0001 ? rounded : null;
}

function parseTimeToSeconds(value) {
  if (typeof value === "number") return Math.max(0, Math.round(value));
  const match = String(value || "").trim().match(/^(\d+):([0-5]?\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseDuration(value) {
  const text = String(value || "");
  const minuteMatch = text.match(/(\d+)分(?:(\d+)秒)?/);
  if (minuteMatch) return Number(minuteMatch[1]) * 60 + (Number(minuteMatch[2]) || 0);
  const secondMatch = text.match(/(\d+)秒/);
  return secondMatch ? Number(secondMatch[1]) : 0;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  if (minutes && remainder) return `${minutes}分${remainder}秒`;
  if (minutes) return `${minutes}分`;
  return `${remainder}秒`;
}

function parseBeanDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const match = text.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day, date };
}

function formatBeanDateParts(parts, withYear = true) {
  if (!parts) return "";
  const dateText = `${parts.month}.${parts.day}`;
  return withYear ? `${parts.year}.${dateText}` : dateText;
}

function formatRoastDate(value) {
  if (!value) return "";
  const parsedDate = parseBeanDate(value);
  if (!parsedDate) return String(value).trim();
  return formatBeanDateParts(parsedDate);
}

function formatBeanShortDate(value) {
  if (!value) return "";
  const parsedDate = parseBeanDate(value);
  if (parsedDate) return formatBeanDateParts(parsedDate, false);
  const text = String(value).trim();
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function formatFullRoastDate(value) {
  if (!value) return "";
  const parsedDate = parseBeanDate(value);
  if (!parsedDate) return String(value).trim();
  return formatBeanDateParts(parsedDate);
}

function getTodayDateString() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  return `${today.getFullYear()}.${month}.${day}`;
}

function getRestingDays(value) {
  const parsedDate = parseBeanDate(value);
  if (!parsedDate) return null;
  const roastDate = parsedDate.date;
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((todayDate - roastDate) / 86400000));
}

function formatDisplayDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function getLogDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function normalizeLogDateFilter(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return "";
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function formatLogDateFilterText(value) {
  const normalized = normalizeLogDateFilter(value);
  if (!normalized) return "全部日期";
  const [year, month, day] = normalized.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function normalizeLogCalendarView(yearValue, monthValue, selectedDate = "") {
  const selected = normalizeLogDateFilter(selectedDate);
  const selectedParts = selected ? selected.split("-").map(Number) : [];
  const today = new Date();
  const year = Number(yearValue) || selectedParts[0] || today.getFullYear();
  const month = Number(monthValue) || selectedParts[1] || (today.getMonth() + 1);
  const normalized = new Date(year, month - 1, 1);
  return {
    year: normalized.getFullYear(),
    month: normalized.getMonth() + 1
  };
}

function formatLogCalendarMonth(yearValue, monthValue) {
  const view = normalizeLogCalendarView(yearValue, monthValue);
  return `${view.year}年${view.month}月`;
}

function buildLogCalendarDays(yearValue, monthValue, selectedDate = "", logs = []) {
  const view = normalizeLogCalendarView(yearValue, monthValue, selectedDate);
  const firstDay = new Date(view.year, view.month - 1, 1);
  const calendarStart = new Date(view.year, view.month - 1, 1 - firstDay.getDay());
  const selected = normalizeLogDateFilter(selectedDate);
  const todayKey = getLogDateKey(new Date());
  const recordCounts = (Array.isArray(logs) ? logs : []).reduce((counts, log) => {
    const dateKey = getLogDateKey(log && log.createdAt);
    if (dateKey) counts[dateKey] = (counts[dateKey] || 0) + 1;
    return counts;
  }, {});
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      calendarStart.getFullYear(),
      calendarStart.getMonth(),
      calendarStart.getDate() + index
    );
    const dateKey = getLogDateKey(date);
    const recordCount = recordCounts[dateKey] || 0;
    return {
      dateKey,
      day: date.getDate(),
      isCurrentMonth: date.getFullYear() === view.year && date.getMonth() + 1 === view.month,
      isSelected: dateKey === selected,
      isToday: dateKey === todayKey,
      hasRecords: recordCount > 0,
      recordCount
    };
  });
}

function buildStatsCalendarDays(yearValue, monthValue, range, anchorDateValue, logs = []) {
  const anchorDate = parseStatsDate(anchorDateValue) || new Date();
  const selectedDate = getLogDateKey(anchorDate);
  const selectedPeriod = getStatsPeriod(range, anchorDate);
  const trendPeriod = getStatsTrendPeriod(range, selectedPeriod);
  return buildLogCalendarDays(yearValue, monthValue, selectedDate, logs).map((item) => {
    const [year, month, day] = item.dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12);
    return {
      ...item,
      isInTrendRange: date >= trendPeriod.start && date < trendPeriod.end
    };
  });
}

function buildStatsCalendarMonths(yearValue, anchorDateValue, logs = []) {
  const today = new Date();
  const year = Number(yearValue) || today.getFullYear();
  const anchorDate = parseStatsDate(anchorDateValue) || today;
  const recordCounts = (Array.isArray(logs) ? logs : []).reduce((counts, log) => {
    const date = parseStatsDate(log && log.createdAt);
    if (!date || date.getFullYear() !== year) return counts;
    const month = date.getMonth() + 1;
    counts[month] = (counts[month] || 0) + 1;
    return counts;
  }, {});
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      month,
      label: `${month}月`,
      isSelected: anchorDate.getFullYear() === year && anchorDate.getMonth() + 1 === month,
      isCurrent: today.getFullYear() === year && today.getMonth() + 1 === month,
      hasRecords: Boolean(recordCounts[month]),
      recordCount: recordCounts[month] || 0
    };
  });
}

function getStatsCalendarYearPage(yearValue) {
  const year = Number(yearValue) || new Date().getFullYear();
  const start = Math.floor(year / 10) * 10;
  return { start, end: start + 9 };
}

function formatStatsCalendarYearPage(yearValue) {
  const page = getStatsCalendarYearPage(yearValue);
  return `${page.start}-${page.end}年`;
}

function buildStatsCalendarYears(yearValue, anchorDateValue, logs = []) {
  const page = getStatsCalendarYearPage(yearValue);
  const today = new Date();
  const anchorDate = parseStatsDate(anchorDateValue) || today;
  const recordCounts = (Array.isArray(logs) ? logs : []).reduce((counts, log) => {
    const date = parseStatsDate(log && log.createdAt);
    if (!date || date.getFullYear() < page.start || date.getFullYear() > page.end) return counts;
    const year = date.getFullYear();
    counts[year] = (counts[year] || 0) + 1;
    return counts;
  }, {});
  return Array.from({ length: 10 }, (_, index) => {
    const year = page.start + index;
    return {
      year,
      label: `${year}`,
      isSelected: anchorDate.getFullYear() === year,
      isCurrent: today.getFullYear() === year,
      hasRecords: Boolean(recordCounts[year]),
      recordCount: recordCounts[year] || 0
    };
  });
}

function formatShortDisplayDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

function formatWater(value) {
  const rounded = round(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function pxToRpx(px) {
  if (!cachedWindowWidth && typeof wx !== "undefined") {
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      cachedWindowWidth = Number(info && info.windowWidth) || 0;
    } catch (error) {
      cachedWindowWidth = 0;
    }
  }
  return (Number(px) || 0) * 750 / (cachedWindowWidth || 375);
}

function parseWeightValue(value) {
  const normalized = String(value === undefined || value === null ? "" : value)
    .trim()
    .replace(/\s+/g, "");
  const match = normalized.match(/^(\d+(?:\.\d*)?|\.\d+)(?:克|g|ｇ)?$/i);
  if (!match) return NaN;
  return round(Number(match[1]));
}

function round(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function mergeUnique(primary, secondary) {
  return [...new Set([...(primary || []), ...(secondary || [])].filter(Boolean))];
}

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}





