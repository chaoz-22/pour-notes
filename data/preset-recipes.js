const PRESET_RECIPES = [
  {
    id: "coffee-collective-official-kalita-155",
    name: "Coffee Collective官方建议冲煮方案",
    sourceType: "preset",
    roasterName: "Coffee Collective",
    dripper: "Kalita 155",
    dose: 16,
    water: 250,
    ratio: 15.6,
    temperature: 92,
    filterPaper: "Kalita Wave 155",
    grinder: "Ditting KR804 Lab / C40 MK4",
    grind: "中度（Ditting KR804 Lab 8.0-9.5；C40 MK4 25-28）",
    totalTime: "2:45",
    target: "Coffee Collective官方建议冲煮方案。粉水比16g咖啡粉配250g水，风格偏浓郁醇厚；水温可按需在92-95°C之间调整。器具建议使用Kalita 155（小号）与Kalita Wave 155滤纸，总萃取时间控制在2:45以内。",
    stages: [
      {
        name: "1st pour：0:00-0:10注入30g水，均匀润湿粉层",
        duration: 10,
        cumulativeWater: 30,
        temperature: 92
      },
      {
        name: "闷蒸：0:10-0:30静置20秒，可依据气泡状态增减闷蒸时间",
        duration: 20,
        cumulativeWater: 30,
        temperature: 92
      },
      {
        name: "2nd pour：0:30-1:45注入至250g，约3ml/s，并在1:45前完成注水",
        duration: 75,
        cumulativeWater: 250,
        temperature: 92
      },
      {
        name: "等待滴滤：停止注水后等待滤杯滴滤完成，总萃取控制在2:45以内",
        duration: 60,
        cumulativeWater: 250,
        temperature: 92
      }
    ]
  },
  {
    id: "one-half-official-flat-bottom",
    name: "One Half平底滤杯官方建议方案",
    sourceType: "preset",
    roasterName: "One Half",
    dripper: "平底滤杯",
    dose: 15,
    water: 240,
    ratio: 16,
    temperature: 92,
    waterQuality: "Aquacode 50ppm",
    grinder: "C40",
    grind: "28 clicks",
    totalTime: "2:30",
    target: "One Half平底滤杯官方建议方案。水温92°C，C40 28格，Aquacode 50ppm。官方步骤以粉水倍率标注：1:4、1:6快速绕圈，1:12、1:16慢速绕圈，并在2:30内完成萃取。图中未给固定粉量，本预设按15g咖啡粉换算为总注水240g。",
    stages: [
      {
        name: "快速绕圈注水至1:4，按15g粉换算为60g水",
        duration: 20,
        cumulativeWater: 60,
        temperature: 92
      },
      {
        name: "快速绕圈注水至1:6，按15g粉换算为90g水",
        duration: 20,
        cumulativeWater: 90,
        temperature: 92
      },
      {
        name: "慢速绕圈注水至1:12，按15g粉换算为180g水",
        duration: 40,
        cumulativeWater: 180,
        temperature: 92
      },
      {
        name: "慢速绕圈注水至1:16，按15g粉换算为240g水",
        duration: 40,
        cumulativeWater: 240,
        temperature: 92
      },
      {
        name: "停止注水，等待滴滤完成，总萃取控制在2:30内",
        duration: 30,
        cumulativeWater: 240,
        temperature: 92
      }
    ]
  },
  {
    id: "one-half-official-conical",
    name: "One Half锥形滤杯官方建议方案",
    sourceType: "preset",
    roasterName: "One Half",
    dripper: "锥形滤杯",
    dose: 15,
    water: 225,
    ratio: 15,
    temperature: 92,
    waterQuality: "Aquacode 50ppm",
    grinder: "C40",
    grind: "26 clicks",
    totalTime: "2:00",
    target: "One Half锥形滤杯官方建议方案。水温92°C，C40 26格，Aquacode 50ppm。官方步骤以粉水倍率标注：1:3快速绕圈、1:10慢速绕圈、1:15中心注水，并在2:00内完成萃取。图中未给固定粉量，本预设按15g咖啡粉换算为总注水225g。",
    stages: [
      {
        name: "快速绕圈注水至1:3，按15g粉换算为45g水",
        duration: 25,
        cumulativeWater: 45,
        temperature: 92
      },
      {
        name: "慢速绕圈注水至1:10，按15g粉换算为150g水",
        duration: 40,
        cumulativeWater: 150,
        temperature: 92
      },
      {
        name: "中心注水至1:15，按15g粉换算为225g水",
        duration: 35,
        cumulativeWater: 225,
        temperature: 92
      },
      {
        name: "停止注水，等待滴滤完成，总萃取控制在2:00内",
        duration: 20,
        cumulativeWater: 225,
        temperature: 92
      }
    ]
  },
  {
    id: "tetsu-kasuya-4-6-complete",
    name: "粕谷哲 46冲煮法",
    sourceType: "preset",
    dripper: "Hario V60",
    dose: 20,
    water: 300,
    ratio: 15,
    temperature: 92,
    filterPaper: "V60 滤纸",
    grinder: "EK43",
    grind: "14（中粗研磨）",
    totalTime: "3:45",
    target: "2016年世界咖啡冲煮大赛冠军粕谷哲独创的46冲煮法，将总水量按40%和60%分为前后两阶段，前段调酸甜，后段调浓度。适用烘焙度：中烘。准备时用92°C热水冲洗滤纸并充分预热V60滤杯和分享壶；研磨20g咖啡豆，倒入后轻拍铺平粉面。",
    stages: [
      {
        name: "闷蒸：快速绕圈注入60ml水，5秒内完成，确保所有咖啡粉湿润，静置45秒",
        duration: 45,
        cumulativeWater: 60,
        temperature: 92
      },
      {
        name: "注水：注入第二个60ml，完成前40%水量（120ml），决定酸甜平衡",
        duration: 45,
        cumulativeWater: 120,
        temperature: 92
      },
      {
        name: "注水：注入第三个60ml，开始后60%水量，调整浓度",
        duration: 45,
        cumulativeWater: 180,
        temperature: 92
      },
      {
        name: "注水：注入第四个60ml，保持轻柔绕大圈",
        duration: 45,
        cumulativeWater: 240,
        temperature: 92
      },
      {
        name: "注水：注入第五个60ml，完成总注水300ml，大水流轻扰粉层",
        duration: 45,
        cumulativeWater: 300,
        temperature: 92
      }
    ]
  },
  {
    id: "peng-jinyang-2025-wbrc-champion",
    name: "彭近洋2025WBrC冠军方案",
    sourceType: "preset",
    dripper: "Solo Dripper",
    dose: 15,
    water: 210,
    ratio: 14,
    temperature: 96,
    waterQuality: "TDS 40ppm（天然矿泉水）",
    grinder: "FM",
    grind: "11",
    totalTime: "1:45",
    target: "2025年世界咖啡冲煮大赛冠军彭近洋方案，主题是“咖啡中的温度”。使用Solo滤杯，以三个批次、三个温度烘焙度拼配和分段温控为核心，强调热源管理。适用烘焙度：中浅烘。准备时倒出80g水预热滤杯和滤纸，实际预热水温为85°C，预热对风味影响极大；注水前先放出少量热水加热壶嘴，避免壶嘴吸热降温；倒入15g咖啡粉，采用三种烘焙温度（185°C/187°C/189°C）各5g拼配。",
    stages: [
      {
        name: "闷蒸：慢速画圈注入30g水，确保所有咖啡粉充分湿润",
        duration: 30,
        cumulativeWater: 30,
        temperature: 96
      },
      {
        name: "注水：画圈注入90g水，保持相对较高的萃取水温，提升咖啡甜感",
        duration: 40,
        cumulativeWater: 120,
        temperature: 96
      },
      {
        name: "注水：使用Melodrip匀水器注入90g水，以低温和较少湍流减少涩味与苦味",
        duration: 35,
        cumulativeWater: 210,
        temperature: 80
      }
    ]
  },
  {
    id: "nas-jaafar-2026-wbrc-champion",
    name: "Nas Jaafar 2026WBrC冠军方案",
    sourceType: "preset",
    dripper: "UFO V3 + Hario Switch",
    dose: 15,
    water: 200,
    ratio: 13.3,
    temperature: 92,
    waterQuality: "50ppm钙镁平衡水",
    filterPaper: "木浆 + 莱赛尔纤维",
    grinder: "Lagom 01",
    grind: "7，3档转速",
    totalTime: "2:10",
    target: "2026年世界咖啡冲煮大赛冠军Nas Jaafar方案。采用UFO V3搭配Hario Switch底座，80°角形成更宽、更浅的粉床，降低中心阻力并保证水流均匀；木浆与莱赛尔纤维滤纸带来更快流速和更稳定出水；使用STORM布粉针整理粉床，使粉床阻力均匀。前段打开阀门滴滤58秒，以低阻力萃取红色花香与明亮柠檬酸质；后段关闭阀门浸泡，发展甘蔗甜、顺滑口感与杏桃风味。",
    stages: [
      {
        name: "滴滤注水：打开Switch阀门，绕圈注入100g水，萃取红色花香与柠檬酸质",
        duration: 58,
        cumulativeWater: 100,
        temperature: 92
      },
      {
        name: "关闭Switch阀门，切换至浸泡模式；绕圈注入100g水，发展甘蔗甜、顺滑口感与杏桃风味",
        duration: 62,
        cumulativeWater: 200,
        temperature: 92
      },
      {
        name: "打开Switch阀门，等待滴滤并于02:10结束冲煮",
        duration: 10,
        cumulativeWater: 200,
        temperature: 92
      }
    ]
  },
  {
    id: "wang-ce-2017-wbrc-champion",
    name: "王策 2017WBrC冠军方案",
    sourceType: "preset",
    dripper: "Hario V60",
    dose: 15,
    water: 250,
    ratio: 16.7,
    temperature: 92,
    waterQuality: "TDS 70ppm，pH 6.8（过滤水 + 镁离子）",
    filterPaper: "V60-02滤纸（预先浸湿后放凉）",
    grinder: "EK43 / C40",
    grind: "7.5 / 12（细研磨）",
    totalTime: "2:00",
    target: "2017WBrC冠军王策方案。比赛豆为巴拿马Gesha，低温发酵后日晒。水温设定93°C，实际约92°C；目标咖啡液220ml，咖啡液浓度1.42%。第二段开始后，将液面保持在滤杯中腰线。Hario V60滤杯温度更稳定，能凸显由热到冷的酸度并增加风味复杂度；预先浸湿后放凉的滤纸与冷陶瓷滤杯可增强咖啡香气；中心注水可避免不必要的扰流。",
    stages: [
      {
        name: "绕圈注入50g水，闷蒸30秒",
        duration: 30,
        cumulativeWater: 50,
        temperature: 92
      },
      {
        name: "绕圈注水后转为中心注水70g，保持液面在滤杯中腰线",
        duration: 20,
        cumulativeWater: 120,
        temperature: 92
      },
      {
        name: "中心注水60g，减少不必要的扰流",
        duration: 20,
        cumulativeWater: 180,
        temperature: 92
      },
      {
        name: "中心注水70g，于01:30停止注水",
        duration: 20,
        cumulativeWater: 250,
        temperature: 92
      },
      {
        name: "停止注水，等待滴滤完成",
        duration: 30,
        cumulativeWater: 250,
        temperature: 92
      }
    ]
  },
  {
    id: "du-jianing-2019-wbrc-champion",
    name: "杜嘉宁 2019WBrC冠军方案",
    sourceType: "preset",
    dripper: "Origami",
    dose: 16,
    water: 240,
    ratio: 15,
    temperature: 94,
    waterQuality: "TDS 80ppm（4ppm钙离子 + 15ppm镁离子）",
    filterPaper: "蛋糕滤纸",
    grinder: "C40",
    grind: "40（粗研磨）+ 27（细研磨）",
    totalTime: "1:40",
    target: "2019WBrC冠军杜嘉宁方案。比赛豆为巴拿马Gesha，日晒、极浅烘。先以C40 40粗研磨，再以C40 27细研磨并移除银皮；使用接粉器倒粉，再用布粉针整理粉床。目标咖啡液190g。双重研磨使粉径更均匀、风味更干净；蛋糕滤纸令粉床更薄、萃取更均匀；Origami滤杯底部孔洞大、纹路深、流速快，可获得更干净的风味层次；接粉器使咖啡粉均匀分布于滤杯中心，布粉针令粉床更蓬松并均匀浸湿，带出更多酸质与甜感；第二段低速注水避免稀释甜度和水果香气，第三段提速注水避免过度萃取。",
    stages: [
      {
        name: "绕圈注入60g水，流速6g/s，注水10秒，闷蒸10秒",
        duration: 20,
        cumulativeWater: 60,
        temperature: 94
      },
      {
        name: "绕圈注入80g水，流速4g/s，注水20秒，等待20秒",
        duration: 40,
        cumulativeWater: 140,
        temperature: 94
      },
      {
        name: "绕圈注入50g水，流速5g/s，注水10秒，等待10秒",
        duration: 20,
        cumulativeWater: 190,
        temperature: 94
      },
      {
        name: "中心注入50g水，流速5g/s，注水10秒，等待滴滤10秒",
        duration: 20,
        cumulativeWater: 240,
        temperature: 94
      }
    ]
  },
  {
    id: "xu-shiyuan-2022-wbrc-champion",
    name: "徐诗媛 2022WBrC冠军方案",
    sourceType: "preset",
    dripper: "Orea",
    dose: 14,
    water: 200,
    ratio: 14.3,
    temperature: 95,
    waterQuality: "70°C水TDS 75ppm；95°C水TDS 90ppm",
    filterPaper: "蛋糕滤纸",
    grind: "1000微米75% + 800微米25%",
    totalTime: "2:00",
    target: "2022WBrC冠军徐诗媛方案。比赛豆为哥伦比亚Gesha，CO2浸渍日晒；使用聚碳酸酯材质的Orea平底滤杯，目标咖啡液155g。1000微米部分的不规则咖啡粉可减缓闷蒸过程，提升柔和细腻的柑橘类酸质；800微米咖啡粉表面更光滑，可增加令人愉悦的热带水果甜感。第一段低温令复杂香气与苹果酸共同带来明亮酸质；后续高温、高TDS水可更有效地萃取1000微米咖啡粉中的可溶物，同时萃取800微米咖啡粉中的有机酸和糖，带来丰富口感并提升余韵甜感。滤杯导热性较低，可保持整体萃取温度，使粉床温度从35°C快速提升至70°C。",
    stages: [
      {
        name: "以70°C细水流绕圈注入50g水，闷蒸30秒",
        duration: 30,
        cumulativeWater: 50,
        temperature: 70
      },
      {
        name: "以95°C细水流绕圈注入50g水，等待30秒",
        duration: 30,
        cumulativeWater: 100,
        temperature: 95
      },
      {
        name: "以95°C大水流中心注入50g水，等待30秒",
        duration: 30,
        cumulativeWater: 150,
        temperature: 95
      },
      {
        name: "以95°C大水流中心注入50g水，等待30秒",
        duration: 30,
        cumulativeWater: 200,
        temperature: 95
      }
    ]
  },
  {
    id: "matt-winton-2021-wbrc-champion",
    name: "Matt Winton 2021WBrC冠军方案",
    sourceType: "preset",
    dripper: "Hario V60",
    dose: 20,
    water: 300,
    ratio: 15,
    temperature: 93,
    waterQuality: "等量钙镁离子",
    grind: "粗研磨",
    totalTime: "2:40",
    target: "2021WBrC冠军Matt Winton方案。比赛豆由哥伦比亚Eugenioides日晒60%与厄瓜多尔Catucai水洗40%拼配。采用先中心、后绕圈的注水方式。Hario V60可最大化风味清晰度；1:15冲煮比例能在咖啡冷却后呈现糖浆般的口感结构；该用水方案可带出活跃酸质；分段萃取温度能令高温阶段呈现果汁般的质感。",
    stages: [
      {
        name: "以93°C先中心后绕圈注入50g水，闷蒸40秒",
        duration: 40,
        cumulativeWater: 50,
        temperature: 93
      },
      {
        name: "以93°C先中心后绕圈注入70g水，等待30秒",
        duration: 30,
        cumulativeWater: 120,
        temperature: 93
      },
      {
        name: "以93°C先中心后绕圈注入60g水，等待30秒",
        duration: 30,
        cumulativeWater: 180,
        temperature: 93
      },
      {
        name: "降至88°C，先中心后绕圈注入60g水，等待30秒",
        duration: 30,
        cumulativeWater: 240,
        temperature: 88
      },
      {
        name: "以88°C先中心后绕圈注入60g水，完成冲煮",
        duration: 30,
        cumulativeWater: 300,
        temperature: 88
      }
    ]
  },
  {
    id: "james-hoffmann-v60-classic",
    name: "James Hoffmann V60经典",
    sourceType: "preset",
    dripper: "Hario V60",
    dose: 15,
    water: 250,
    ratio: 16.7,
    temperature: 95,
    filterPaper: "V60滤纸",
    totalTime: "2:35",
    target: "James Hoffmann标志性V60方案，强调旋涡排气与低扰流注水，适合所有烘焙度，新手友好。准备时冲洗滤纸并预热V60。2022年视频至今仍是YouTube手冲最高观看量。",
    stages: [
      {
        name: "注入30g水，轻柔旋涡摇晃5秒，使咖啡粉均匀湿润并排气",
        duration: 30,
        cumulativeWater: 30,
        temperature: 95
      },
      {
        name: "00:30慢速绕圈一次性注水至250g，于01:15完成注水，保持低扰流",
        duration: 75,
        cumulativeWater: 250,
        temperature: 95
      },
      {
        name: "01:45轻轻旋涡摇晃，等待滴滤完成",
        duration: 50,
        cumulativeWater: 250,
        temperature: 95
      }
    ]
  },
  {
    id: "scott-rao-updated-v60",
    name: "Scott Rao 更新版 V60",
    sourceType: "preset",
    dripper: "Hario V60",
    dose: 22,
    water: 352,
    ratio: 16,
    temperature: 95,
    filterPaper: "V60滤纸",
    grind: "细研磨",
    totalTime: "2:00",
    target: "Scott Rao 2023年更新版V60方案。采用大粉量（22g）、细研磨与高注水扰流，强调充分萃取，杯中表现力求饱满。准备时冲洗V60滤纸并在粉床中心挖坑。",
    stages: [
      {
        name: "绕圈注入45g水，确保所有咖啡粉充分接触",
        duration: 45,
        cumulativeWater: 45,
        temperature: 95
      },
      {
        name: "00:45注水至200g，保持适度扰流",
        duration: 50,
        cumulativeWater: 200,
        temperature: 95
      },
      {
        name: "01:35注水至352g，最后20g轻柔注水",
        duration: 25,
        cumulativeWater: 352,
        temperature: 95
      }
    ]
  },
  {
    id: "carlos-medina-2023-wbrc-champion",
    name: "Carlos Medina 2023WBrC冠军方案",
    sourceType: "preset",
    dripper: "Origami",
    dose: 15.5,
    water: 250,
    ratio: 16.1,
    temperature: 91,
    waterQuality: "TDS 65ppm（纯净水 + 等比例钙镁离子）",
    filterPaper: "锥形滤纸",
    grinder: "ZP6",
    grind: "中粗研磨",
    totalTime: "2:40",
    target: "2023WBrC冠军Carlos Medina方案。比赛豆为哥伦比亚Sidra日晒。每段先从中心注水，水覆盖粉床后改为绕圈注水。该研磨度令咖啡在高温、中温和低温时均有清晰风味与更好的风味架构；锥形滤纸令粉床深度随位置变化，形成不同萃取状态，从而获得更多风味层次与更好的酸质强度，Origami材质亦能保证温度稳定；该用水方案令咖啡口感圆润、酸甜平衡。",
    stages: [
      {
        name: "从中心注水至水覆盖粉床后绕圈注入50g水，闷蒸30秒",
        duration: 30,
        cumulativeWater: 50,
        temperature: 91
      },
      {
        name: "从中心注水至水覆盖粉床后绕圈注入50g水，等待30秒",
        duration: 30,
        cumulativeWater: 100,
        temperature: 91
      },
      {
        name: "从中心注水至水覆盖粉床后绕圈注入50g水，等待30秒",
        duration: 30,
        cumulativeWater: 150,
        temperature: 91
      },
      {
        name: "从中心注水至水覆盖粉床后绕圈注入50g水，等待30秒",
        duration: 30,
        cumulativeWater: 200,
        temperature: 91
      },
      {
        name: "从中心注水至水覆盖粉床后绕圈注入最后50g水，等待滴滤完成",
        duration: 40,
        cumulativeWater: 250,
        temperature: 91
      }
    ]
  },
  {
    id: "martin-wolfl-2024-wbrc-champion",
    name: "Martin Wölfl 2024WBrC冠军方案",
    sourceType: "preset",
    dripper: "Orea",
    dose: 17,
    water: 270,
    ratio: 15.9,
    temperature: 93,
    waterQuality: "Apax Lab配方水，TDS 115ppm",
    filterPaper: "Sibarist Fast",
    grinder: "Comandante",
    grind: "20（约630微米）",
    totalTime: "2:25",
    target: "2024WBrC冠军Martin Wölfl方案。比赛豆为巴拿马Finca Maya双重发酵日晒Gesha，由Lost Origin Coffee Lab处理：先以葡萄酒酵母发酵，呈现精致的橙色与红色水果风味，再以乳酸菌带来苹果酸质；发酵四天后在干燥室静置33天，以稳定含水率并获得更甜、更干净的热带水果与红色水果风味。使用Nucleus LINK热风式样品烘豆机烘焙。以布粉针均匀分布咖啡粉，并使用Melodrip Lift将水流分散为均匀水珠，提高萃取一致性、减少苦杂味；Orea的73°窄口结构适合细研磨，Fast滤纸可减少旁路并加快萃取。",
    stages: [
      {
        name: "使用Melodrip以稳定小水流注入60g水，确保粉层完全湿润",
        duration: 40,
        cumulativeWater: 60,
        temperature: 93
      },
      {
        name: "00:40使用Melodrip注入60g水",
        duration: 40,
        cumulativeWater: 120,
        temperature: 93
      },
      {
        name: "01:20使用Melodrip注入50g水",
        duration: 40,
        cumulativeWater: 170,
        temperature: 93
      },
      {
        name: "02:00使用Melodrip注入100g水，等待滴滤完成",
        duration: 25,
        cumulativeWater: 270,
        temperature: 93
      }
    ]
  },
  {
    id: "captain-george-no-difference",
    name: "乔治队长 无差别冲煮法",
    sourceType: "preset",
    dripper: "平底滤杯",
    dose: 18,
    water: 234,
    ratio: 13,
    temperature: 92,
    filterPaper: "蛋糕滤纸",
    grinder: "C40",
    grind: "26–28（中粗研磨）",
    totalTime: "2:10",
    target: "彭近洋（Captain George）独创的无差别冲煮法，采用平底滤杯与蛋糕滤纸。前两段固定为粉量的2.5倍和5.5倍，尾段X值可按咖啡调整为4、5或6；本预设采用X=5，对应尾段90g、总水量234g和1:13粉水比。前两段绕圈注水，尾段使用75°C低温中心定点注水，以降低后段苦杂味。",
    stages: [
      {
        name: "第一段绕圈注入45g水并闷蒸",
        duration: 30,
        cumulativeWater: 45,
        temperature: 92
      },
      {
        name: "第二段绕圈注入99g水",
        duration: 30,
        cumulativeWater: 144,
        temperature: 92
      },
      {
        name: "第三段以75°C中心定点注入90g水（X=5），40秒完成注水并等待滴滤30秒",
        duration: 70,
        cumulativeWater: 234,
        temperature: 75
      }
    ]
  },
  {
    id: "captain-george-375-iced",
    name: "乔治队长 375冰冲法",
    sourceType: "preset",
    roasterName: "Captain George",
    dripper: "锥形滤杯",
    dose: 15,
    water: 150,
    ice: 100,
    ratio: 10,
    temperature: 92,
    grind: "杯测研磨度",
    totalTime: "2:00",
    target: "Captain George 375冰冲法（沉浸式版）。以15g咖啡粉为例，三段注水量依次为30g、70g、50g，取3、7、5命名。先在分享壶中放入100g冰块，再以92°C热水完成150g注水，通过热萃取保留完整风味层次，并利用冰块快速降温，将融冰后的浓度控制在适合冰饮的区间。调整建议：风味偏淡可适当减少冰量；酸质过于突出可调细研磨或延长总萃取时间；苦涩或杂味较重可调粗研磨或将水温降至90°C。不同产区、处理法的咖啡豆适配浓度不同，可将此参数作为稳定起点再进行微调。",
    stages: [
      {
        name: "闷蒸：先在分享壶中放入100g冰块；绕圈注入30g水，闷蒸至00:30",
        duration: 30,
        cumulativeWater: 30,
        temperature: 92
      },
      {
        name: "注水：00:30开始绕圈注入70g水，累计至100g",
        duration: 50,
        cumulativeWater: 100,
        temperature: 92
      },
      {
        name: "注水：01:20开始绕圈注入50g水，累计至150g，完成后等待滴滤",
        duration: 40,
        cumulativeWater: 150,
        temperature: 92
      }
    ]
  },
  {
    id: "kono-drip-method",
    name: "Kono滴滤法",
    sourceType: "preset",
    dripper: "Kono Meimon",
    dose: 25,
    water: 280,
    ratio: 11.2,
    temperature: 85,
    filterPaper: "干滤纸（不预湿）",
    grind: "超粗",
    totalTime: "4:30",
    target: "传统日式滴滤法，采用滴水式闷蒸，呈现醇厚、顺滑的口感。准备KONO滤杯和干滤纸，不要预湿；预热手冲壶并保持水温85°C；加入25g超粗研磨咖啡粉并轻轻整平。目标咖啡液250ml，标称粉液比1:10。",
    stages: [
      {
        name: "滴水式注入50g水，让水滴连续落在咖啡表面；闷蒸90秒后静置30秒",
        duration: 120,
        cumulativeWater: 50,
        temperature: 85
      },
      {
        name: "使用小水流注水至125g，保持硬币大小的注水区域",
        duration: 60,
        cumulativeWater: 125,
        temperature: 85
      },
      {
        name: "使用大水流注水至280g，扩大绕圈范围以产生泡沫",
        duration: 60,
        cumulativeWater: 280,
        temperature: 85
      },
      {
        name: "等待泡沫完全过滤后移走滤杯",
        duration: 30,
        cumulativeWater: 280,
        temperature: 85
      }
    ]
  }
];

module.exports = { PRESET_RECIPES };

