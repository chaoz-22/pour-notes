# Pour Notes

手冲咖啡记录微信小程序：冲煮计时与记录、豆仓、寻豆指南、SCA 风味轮、拍照识别豆袋。

- 小程序 AppID：`wx1f76c922f2a6c522`
- CloudBase 环境：`pour-notes-d8gg2pilacb585b96`
- 当前版本：见 `package.json`

用微信开发者工具直接打开仓库根目录即可编译，不需要构建 npm。

## 按维护内容分类

| 分类 | 路径 | 什么时候改 |
| --- | --- | --- |
| 小程序界面 | `pages/index/`、`templates/`、`app.js`、`app.json`、`app.wxss` | 改页面、交互、样式。所有功能都在 `pages/index` 单页内 |
| 内置数据 | `data/roasters.js`、`data/roaster-beans.js`、`data/preset-recipes.js`、`data/sca-flavors.js`、`data/audio-assets.js` | 增删烘焙商、豆单、预设方案、风味词 |
| 界面图标 | `assets/icons/` | 随代码包发布的图标与分享封面 |
| 云端内容图片 | `assets/roasters/`、`assets/bean-thumbnails-jpg/`、`assets/drippers/`、`assets/buying-guide/` | 不进代码包，需手动上传到云存储 `roaster-guide/`，路径与本地一致 |
| 云端豆单 | `cloudfunctions/roasterCatalog/`、`cloud-data/`、`scripts/export-roaster-catalog.js` | 改豆单读取逻辑，或重新生成数据库导入文件 |
| 拍照识别（云端 OCR） | `cloudrun/paddleocr/`、`data/bean-ocr-cloud.js`、`data/bean-ocr-parser.js`、`scripts/test-bean-ocr-parser.js`、`scripts/paddleocr-smoke-test.py` | 改识别服务或字段解析规则 |
| 端侧 OCR（已停用） | `ocr/`、`scripts/strip-miniprogram-sourcemaps.sh` | 旧的 Paddle.js 方案，仅留档，不参与打包 |
| 工程配置 | `project.config.json`、`data/cloud-config.js`、`sitemap.json`、`package.json` | 改打包排除规则、云环境 ID、服务名 |
| 文档 | `CLOUD_SETUP.md`、`PADDLE_OCR_SETUP.md` | 云端部署与验收步骤 |

## 常用操作

修改内置豆单后重新生成数据库导入文件：

```bash
node scripts/export-roaster-catalog.js
```

验证豆袋字段解析规则：

```bash
node scripts/test-bean-ocr-parser.js
```

云存储、数据库、云函数的配置见 [CLOUD_SETUP.md](CLOUD_SETUP.md)，PaddleOCR 云托管的部署见 [PADDLE_OCR_SETUP.md](PADDLE_OCR_SETUP.md)。

## 未纳入仓库的内容

- `node_modules/`：只服务于已停用的端侧 OCR。`package.json` 没有声明这些依赖，重装需手动安装 `@paddle-js-models/ocr@4.1.1`、`@paddlejs/paddlejs-core@2.2.0`、`@paddlejs/paddlejs-backend-webgl@1.2.9`、`js-clipper@1.0.1`、`number-precision@1.6.0`、`d3-polygon@3.0.1`。
- `project.private.config.json`：微信开发者工具的个人本地设置。
- `paddleocr-cloudbase-v*.zip`：`cloudrun/paddleocr` 的部署包，最新一版与该目录内容一致。
