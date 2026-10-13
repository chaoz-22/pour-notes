const assert = require("assert");
const { parseBeanOcrLines } = require("../data/bean-ocr-parser");

const catalogResult = parseBeanOcrLines([
  "ETHIOPIA",
  "Elto Coffee",
  "74110",
  "Classic Washed",
  "oma Lot 1"
]);
assert.equal(catalogResult.fields.roaster, "OMA");
assert.match(catalogResult.fields.name, /Elto Coffee/i);
assert.equal(catalogResult.fields.variety, "74110");
assert.match(catalogResult.fields.process, /水洗/);
assert.ok(catalogResult.catalogMatch);

const genericResult = parseBeanOcrLines([
  "ROASTED BY SEY",
  "LAS MARGARITAS",
  "Country: Colombia",
  "Variety: Pink Bourbon",
  "Process: Anaerobic Natural",
  "Tasting Notes: Strawberry, rose, cacao",
  "Net Weight 250g",
  "Roasted on 2026-07-10"
]);
assert.equal(genericResult.fields.roaster, "Sey");
assert.equal(genericResult.fields.name, "LAS MARGARITAS");
assert.equal(genericResult.fields.country, "哥伦比亚");
assert.equal(genericResult.fields.variety, "粉红波旁");
assert.equal(genericResult.fields.process, "厌氧日晒");
assert.equal(genericResult.fields.flavorDescription, "Strawberry, rose, cacao");
assert.equal(genericResult.fields.initialWeight, "250");
assert.equal(genericResult.fields.roastDate, "2026.7.10");

const hadessaResult = parseBeanOcrLines([
  "ONE HALF",
  "Ethiopia Hadessa",
  "ANAEROBIC NATURAL",
  "heirloom",
  "200g"
]);
assert.ok(hadessaResult.catalogMatch);
assert.equal(hadessaResult.fields.name, "Hadessa Anaerobic Natural");
assert.equal(hadessaResult.fields.roaster, "One Half");
assert.equal(hadessaResult.fields.country, "埃塞俄比亚");
assert.equal(hadessaResult.fields.origin, "Sidama");
assert.equal(hadessaResult.fields.variety, "埃塞俄比亚原生种");
assert.equal(hadessaResult.fields.process, "厌氧日晒");
assert.equal(hadessaResult.fields.initialWeight, "200");

const losRodriguezResult = parseBeanOcrLines([
  "ONE HALF",
  "Bolivia Los Rodriguez",
  "WASHED",
  "geisha",
  "100g"
]);
assert.ok(losRodriguezResult.catalogMatch);
assert.equal(losRodriguezResult.fields.name, "Los Rodriguez Geisha Washed");
assert.equal(losRodriguezResult.fields.roaster, "One Half");
assert.equal(losRodriguezResult.fields.country, "玻利维亚");
assert.equal(losRodriguezResult.fields.origin, "Caranavi, La Paz");
assert.equal(losRodriguezResult.fields.variety, "瑰夏");
assert.equal(losRodriguezResult.fields.process, "水洗");
assert.equal(losRodriguezResult.fields.initialWeight, "100");

const abu4175Result = parseBeanOcrLines([
  "ONE HALF",
  "Panama Abu #4175",
  "WASHED",
  "geisha",
  "100g"
]);
assert.ok(abu4175Result.catalogMatch);
assert.equal(abu4175Result.fields.name, "Abu #4175 Geisha Washed");
assert.equal(abu4175Result.fields.roaster, "One Half");
assert.equal(abu4175Result.fields.country, "巴拿马");
assert.equal(abu4175Result.fields.origin, "Chiriquí");
assert.equal(abu4175Result.fields.variety, "瑰夏");
assert.equal(abu4175Result.fields.process, "水洗");
assert.equal(abu4175Result.fields.initialWeight, "100");

const esmeralda2nbResult = parseBeanOcrLines([
  "ONE HALF",
  "Hacienda La Esmeralda 2NB",
  "NATURAL",
  "geisha",
  "100g"
]);
assert.ok(esmeralda2nbResult.catalogMatch);
assert.equal(esmeralda2nbResult.fields.name, "Hacienda La Esmeralda Guabo 2NB Geisha Natural");
assert.equal(esmeralda2nbResult.fields.roaster, "One Half");
assert.equal(esmeralda2nbResult.fields.country, "巴拿马");
assert.equal(esmeralda2nbResult.fields.origin, "Chiriquí");
assert.equal(esmeralda2nbResult.fields.variety, "瑰夏");
assert.equal(esmeralda2nbResult.fields.process, "日晒");
assert.equal(esmeralda2nbResult.fields.initialWeight, "100");

const noFalseRoaster = parseBeanOcrLines(["Floral aroma", "Kenya", "Washed"]);
assert.notEqual(noFalseRoaster.fields.roaster, "OMA");

const noisyAloResult = parseBeanOcrLines([
  "command",
  "option",
  "regonsidana.bensa",
  "Ethiopia",
  "AloSkyProject",
  "varietal.74158",
  "lnfinity",
  "produesrtainitutndasse",
  "DARKROOM",
  "proces.dtinlfootwashal",
  "WASHED",
  "aittude.245omasl",
  "74158",
  "HiavonCuninoupne.misnauBiape",
  "peachyangylang",
  "06FEB2026"
]);
assert.ok(noisyAloResult.catalogMatch);
assert.equal(noisyAloResult.fields.name, "Alo Sky Project Infinity");
assert.equal(noisyAloResult.fields.roaster, "One Half");
assert.equal(noisyAloResult.fields.country, "埃塞俄比亚");
assert.equal(noisyAloResult.fields.origin, "Sidama, Bensa");
assert.equal(noisyAloResult.fields.variety, "74158");
assert.equal(noisyAloResult.fields.process, "暗室水洗");
assert.equal(noisyAloResult.fields.roastDate, "2026.2.6");

const mixedChineseEnglishResult = parseBeanOcrLines([
  "Standout",
  "HLE Buenos Arires地块巴拿马翡翠庄园",
  "日晒 瑰夏",
  "Flavor Notes:",
  "樱花、草莓、芒果、洛神花",
  "24/04/2026Roasted",
  "15g"
]);
assert.ok(mixedChineseEnglishResult.catalogMatch);
assert.equal(mixedChineseEnglishResult.fields.name, "Hacienda La Esmeralda — Buenos Aires");
assert.equal(mixedChineseEnglishResult.fields.roaster, "Standout");
assert.equal(mixedChineseEnglishResult.fields.country, "巴拿马");
assert.equal(mixedChineseEnglishResult.fields.origin, "翡翠庄园");
assert.equal(mixedChineseEnglishResult.fields.variety, "瑰夏");
assert.equal(mixedChineseEnglishResult.fields.process, "日晒");
assert.equal(mixedChineseEnglishResult.fields.flavorDescription, "樱花、草莓、芒果、洛神花");
assert.equal(mixedChineseEnglishResult.fields.roastLevel, "");
assert.equal(mixedChineseEnglishResult.fields.initialWeight, "15");
assert.equal(mixedChineseEnglishResult.fields.roastDate, "2026.4.24");

const noDateAsFlavor = parseBeanOcrLines([
  "Standout",
  "Flavor Notes:",
  "24/04/2026Roasted",
  "15g"
]);
assert.equal(noDateAsFlavor.fields.flavorDescription, "");
assert.equal(noDateAsFlavor.fields.roastDate, "2026.4.24");

const swevenChororaResult = parseBeanOcrLines([
  "sweven coffee",
  "CHORORA",
  "Sozoranga, Ecuador",
  "Carbonic Maceration Honey",
  "Sidra",
  "Clementine, mango, chrysanthemum",
  "200g"
]);
assert.ok(swevenChororaResult.catalogMatch);
assert.equal(swevenChororaResult.fields.name, "Chorora — Sidra");
assert.equal(swevenChororaResult.fields.roaster, "Sweven");
assert.equal(swevenChororaResult.fields.country, "厄瓜多尔");
assert.equal(swevenChororaResult.fields.origin, "Sozoranga, Loja");
assert.equal(swevenChororaResult.fields.variety, "Sidra");
assert.equal(swevenChororaResult.fields.process, "二氧化碳浸渍蜜处理");
assert.equal(swevenChororaResult.fields.initialWeight, "200");

const swevenLaLucumaResult = parseBeanOcrLines([
  "sweven coffee",
  "LA LUCUMA",
  "Cajamarca, Peru",
  "Dry Anaerobic Washed",
  "Geisha Inca SL9",
  "Nectarine, white grape, magnolia",
  "200g"
]);
assert.ok(swevenLaLucumaResult.catalogMatch);
assert.equal(swevenLaLucumaResult.fields.name, "La Lucuma — Geisha Inca (SL9)");
assert.equal(swevenLaLucumaResult.fields.roaster, "Sweven");
assert.equal(swevenLaLucumaResult.fields.country, "秘鲁");
assert.equal(swevenLaLucumaResult.fields.origin, "El Limón, Chirinos, San Ignacio, Cajamarca");
assert.equal(swevenLaLucumaResult.fields.variety, "SL9");
assert.equal(swevenLaLucumaResult.fields.process, "干式厌氧水洗");
assert.equal(swevenLaLucumaResult.fields.initialWeight, "200");

const swevenLongMilesResult = parseBeanOcrLines([
  "sweven coffee",
  "LONG MILES",
  "Giku, Burundi",
  "Washed Red Bourbon",
  "Marmalade, sencha, toffee apple",
  "200g"
]);
assert.ok(swevenLongMilesResult.catalogMatch);
assert.equal(swevenLongMilesResult.fields.name, "Long Miles — Red Bourbon");
assert.equal(swevenLongMilesResult.fields.roaster, "Sweven");
assert.equal(swevenLongMilesResult.fields.country, "布隆迪");
assert.equal(swevenLongMilesResult.fields.origin, "Giku Hill, Butanyerera Province");
assert.equal(swevenLongMilesResult.fields.variety, "红波旁");
assert.equal(swevenLongMilesResult.fields.process, "水洗");
assert.equal(swevenLongMilesResult.fields.initialWeight, "200");

const swevenLaShapaResult = parseBeanOcrLines([
  "sweven coffee",
  "LA SHAPA",
  "Cajamarca, Peru",
  "Anaerobic Washed Typica",
  "Whitecurrant, red plum, lime blossom",
  "200g"
]);
assert.ok(swevenLaShapaResult.catalogMatch);
assert.equal(swevenLaShapaResult.fields.name, "La Shapa — Typica");
assert.equal(swevenLaShapaResult.fields.roaster, "Sweven");
assert.equal(swevenLaShapaResult.fields.country, "秘鲁");
assert.equal(swevenLaShapaResult.fields.origin, "La Unión, Sallique, Jaén, Cajamarca");
assert.equal(swevenLaShapaResult.fields.variety, "铁皮卡");
assert.equal(swevenLaShapaResult.fields.process, "厌氧水洗");
assert.equal(swevenLaShapaResult.fields.initialWeight, "200");

const swerlBekeleGemedaResult = parseBeanOcrLines([
  "Swerl",
  "Mr. Bekele Gemeda",
  "Yirgacheffe, Ethiopia",
  "Washed Ethiopian Heirloom",
  "Ripe apricots, iced tea, sweet lemon",
  "250g"
]);
assert.ok(swerlBekeleGemedaResult.catalogMatch);
assert.equal(swerlBekeleGemedaResult.fields.name, "Mr. Bekele Gemeda");
assert.equal(swerlBekeleGemedaResult.fields.roaster, "Swerl");
assert.equal(swerlBekeleGemedaResult.fields.country, "埃塞俄比亚");
assert.equal(swerlBekeleGemedaResult.fields.origin, "Worka, Gedeb, Yirgacheffe");
assert.equal(swerlBekeleGemedaResult.fields.variety, "埃塞俄比亚原生种");
assert.equal(swerlBekeleGemedaResult.fields.process, "水洗");
assert.equal(swerlBekeleGemedaResult.fields.initialWeight, "250");

const swerlAbRueraResult = parseBeanOcrLines([
  "Swerl",
  "AB Ruera",
  "Kiambu, Kenya",
  "Washed Batian, SL28, SL34, Ruiru 11",
  "Black tea, red currant, hibiscus",
  "250g"
]);
assert.ok(swerlAbRueraResult.catalogMatch);
assert.equal(swerlAbRueraResult.fields.name, "AB Ruera");
assert.equal(swerlAbRueraResult.fields.roaster, "Swerl");
assert.equal(swerlAbRueraResult.fields.country, "肯尼亚");
assert.equal(swerlAbRueraResult.fields.origin, "Ruiru, Kiambu");
assert.equal(swerlAbRueraResult.fields.variety, "SL28");
assert.equal(swerlAbRueraResult.fields.process, "水洗");
assert.equal(swerlAbRueraResult.fields.initialWeight, "250");

const swerlGuarirobaGeishaResult = parseBeanOcrLines([
  "Swerl",
  "Guariroba Geisha",
  "Campo das Vertentes, Brazil",
  "Inoculated Anaerobic Pulp Natural Geisha",
  "Lemongrass, jasmine, black tea, Sichuan pepper",
  "100g"
]);
assert.ok(swerlGuarirobaGeishaResult.catalogMatch);
assert.equal(swerlGuarirobaGeishaResult.fields.name, "Guariroba Geisha");
assert.equal(swerlGuarirobaGeishaResult.fields.roaster, "Swerl");
assert.equal(swerlGuarirobaGeishaResult.fields.country, "巴西");
assert.equal(swerlGuarirobaGeishaResult.fields.origin, "Campo das Vertentes, Minas Gerais");
assert.equal(swerlGuarirobaGeishaResult.fields.variety, "瑰夏");
assert.equal(swerlGuarirobaGeishaResult.fields.process, "接种酵母厌氧果肉日晒");
assert.equal(swerlGuarirobaGeishaResult.fields.initialWeight, "100");

const swerlLasLajasResult = parseBeanOcrLines([
  "Swerl",
  "Las Lajas",
  "Sabanilla de Alajuela, Costa Rica",
  "Black Diamond Natural San Isidro 39",
  "Milk chocolate, dried sweet prunes, syrupy",
  "200g"
]);
assert.ok(swerlLasLajasResult.catalogMatch);
assert.equal(swerlLasLajasResult.fields.name, "Las Lajas");
assert.equal(swerlLasLajasResult.fields.roaster, "Swerl");
assert.equal(swerlLasLajasResult.fields.country, "哥斯达黎加");
assert.equal(swerlLasLajasResult.fields.origin, "Sabanilla de Alajuela, Central Valley");
assert.equal(swerlLasLajasResult.fields.variety, "San Isidro 39");
assert.equal(swerlLasLajasResult.fields.process, "黑钻日晒");
assert.equal(swerlLasLajasResult.fields.initialWeight, "200");

const swerlStivenHoyosResult = parseBeanOcrLines([
  "Swerl",
  "Stiven Hoyos",
  "San Agustin, Huila, Colombia",
  "Washed Pink Bourbon",
  "Floral, red cordial, fresh berries, green apple, sparkling",
  "250g"
]);
assert.ok(swerlStivenHoyosResult.catalogMatch);
assert.equal(swerlStivenHoyosResult.fields.name, "Stiven Hoyos");
assert.equal(swerlStivenHoyosResult.fields.roaster, "Swerl");
assert.equal(swerlStivenHoyosResult.fields.country, "哥伦比亚");
assert.equal(swerlStivenHoyosResult.fields.origin, "San Agustín, Huila");
assert.equal(swerlStivenHoyosResult.fields.variety, "粉红波旁");
assert.equal(swerlStivenHoyosResult.fields.process, "水洗");
assert.equal(swerlStivenHoyosResult.fields.initialWeight, "250");

console.log("bean OCR parser tests passed");
