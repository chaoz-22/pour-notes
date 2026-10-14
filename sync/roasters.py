"""各烘焙商官网的抓取配置。

大多数是 Shopify 店铺，公开了 /products.json；platform 不填就是 Shopify。
另外支持 WooCommerce 店铺（platform: "woocommerce"）和 Hatch 的自建网站
（platform: "hatch"）。新增一家只需要在 ROASTERS 里加一项，字段含义见各段第一项的注释。

只收手冲（Filter）豆，全能烘焙（Omni）也算；意式烘焙在 shopify.py 里统一排除。
"""

# 所有店铺通用：标题命中即视为不是单品咖啡豆（订阅、礼品卡、套装、挂耳、胶囊等）
COMMON_EXCLUDE_TITLE = (
    r"subscription|abonnement|gift\s*card|gutschein|lahjakortti|bundle|sampler"
    r"|sample pack|taster pack|drip bag|instant coffee|capsule|advent|wholesale"
)

ROASTERS = [
    {
        "name": "Sey",  # 与数据库 roaster 字段一致
        "slug": "sey",  # 豆子 id 的前缀，也是云存储里的图片目录名
        "host": "seycoffee.com",
        "types": ["Coffees"],  # 允许的 product_type；不填则不限
        # 还可以用：collection（只读某个系列）/ require_tags / exclude_tags
        # / exclude_title（正则）/ group_by_size / skip_bulk（跳过只卖 500g 以上的大包装）
        # / image_dir（图片目录和 slug 不一样时填）
    },
    {
        "name": "Prodigal",
        "slug": "prodigal",
        "host": "getprodigal.com",
        "types": ["Roasted Coffee"],
        "exclude_tags": ["giftcard", "b2bonly", "espresso"],
    },
    {
        "name": "Tim Wendelboe",
        "slug": "tim-wendelboe",
        "host": "www.timwendelboe.no",
        "collection": "filter-coffee",
        "exclude_tags": ["Subscription"],
        "exclude_title": r"fizz",
    },
    {
        "name": "Coffee Collective",
        "slug": "coffee-collective",
        "host": "coffeecollective.dk",
        # 全店接口里混有官网上打不开的商品（批发等），只有这个系列才是官网实际在卖的
        "collection": "our-coffees",
        "require_tags": ["filter", "coffee"],
        "exclude_tags": ["equipment", "subscription", "bundle", "christmas"],
        "group_by_size": True,  # 同一款豆按 250g / 1kg / 4kg 拆成了多个商品，需要合并
    },
    {
        "name": "Standout",
        "slug": "standout",
        "host": "www.standoutcoffee.com",
        "types": ["Roasted Coffee"],
    },
    {
        "name": "Sweven",
        "slug": "sweven",
        "host": "swevencoffee.co.uk",
        "types": ["coffee"],
    },
    {
        "name": "Apollon's Gold",
        "slug": "apollons-gold",
        "host": "shop.apollons-gold.com",
        "types": ["Roasted Coffee"],
    },
    {
        "name": "Blendin",
        "slug": "blendin",
        "host": "blendincoffeeclub.com",
        "types": ["Coffee"],
    },
    {
        "name": "Ona",
        "slug": "ona",
        "host": "onacoffee.com.au",
        "types": ["Coffee"],
        "require_tags": ["Coffee Type.Filter"],
        "exclude_tags": ["Capsule", "pods", "Drip bags", "Instant Coffee", "subscription"],
    },
    {
        "name": "Leuchtfeuer",
        "slug": "leuchtfeuer",
        "host": "leuchtfeuer.coffee",
        "types": ["Filterkaffee"],
    },
    {
        "name": "GoodLife",
        "slug": "goodlife",
        "host": "goodlifecoffee.fi",
        "types": ["Suodatinkahvi", "Kofeiinitonkahvi"],  # 滤泡、低因滤泡
    },
    {
        "name": "OMA",
        "slug": "oma",
        "host": "omacoffeeroaster.com",
        "exclude_tags": ["grinder", "OPTION-O", "espresso"],
        "exclude_title": r"sharing session",
        "skip_bulk": True,  # 同一款豆另有一个 500g/1kg 的商品，只留小包装那个
    },
    {
        "name": "Specialguests",
        "slug": "specialguests",
        "image_dir": "special-guests",
        "host": "specialguestscoffee.com",
        "types": ["Coffee"],
    },
    {
        "name": "Lab 19",
        "slug": "lab-19",
        "host": "lab19coffee.com",
        "types": ["Coffee"],
    },
    {
        "name": "Tanat",
        "slug": "tanat",
        "platform": "woocommerce",
        "host": "tanat.coffee",
        "categories": ["Filtre"],  # 商品属于其中任一分类才收；意式豆在 Espresso 分类里
        "exclude_title": r"calendrier|coffret",
    },
    {
        "name": "Dak",
        "slug": "dak",
        "platform": "woocommerce",
        "host": "www.dakcoffeeroasters.com",
        "categories": ["Filter"],
        "exclude_title": r"steeped",
    },
    {
        "name": "Peoplepossession",
        "slug": "peoplepossession",
        "platform": "woocommerce",
        "host": "peoplepossession.com",
        "categories": ["Coffee"],
        "exclude_title": r"\bbags\b|reusable lid",
    },
    {
        "name": "Hatch",
        "slug": "hatch",
        "platform": "hatch",
        "categories": ["Seasonal", "Premium & Peak"],  # Foundation 系列的日常拼配不收
    },
]
