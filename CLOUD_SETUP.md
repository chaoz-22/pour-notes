# Pour Notes CloudBase 配置

环境 ID：`pour-notes-d8gg2pilacb585b96`

## 1. 上传寻豆指南图片

在 CloudBase「云存储」中按烘焙商创建子目录并上传图片，云端路径必须与本地保持一致：

- 本地 `assets/bean-thumbnails-jpg/<烘焙商目录>/*` → `roaster-guide/assets/bean-thumbnails-jpg/<烘焙商目录>/*`

当前使用的烘焙商目录为：

`aery`、`april`、`apollons-gold`、`blendin`、`coffee-collective`、`dak`、`friedhats`、`goodlife`、`hatch`、`lab-19`、`leaves`、`leuchtfeuer`、`oma`、`ona`、`one-half`、`peoplepossession`、`prodigal`、`sey`、`special-guests`、`standout`、`sweven`、`swerl`、`tanat`、`tim-wendelboe`。其中 `april`、`goodlife`、`hatch`、`peoplepossession` 当前没有豆单图片，云端如需保留空目录，应在控制台手动创建。

图片和数据库已迁移到分目录结构，`cloud-data/roaster_guide_beans.json` 与小程序内置豆单均使用新路径。旧的平铺图片建议至少保留一个发布周期，兼容仍缓存旧豆单的客户端；确认线上版本已稳定刷新新路径后再删除。

烘焙商 Logo 上传至 `roaster-guide/assets/roasters/`，文件名与本地 `assets/roasters/` 保持一致。小程序运行时使用 `cloud://pour-notes-d8gg2pilacb585b96.706f-pour-notes-d8gg2pilacb585b96-1445298998/roaster-guide/...` 读取豆子图片和烘焙商 Logo；`project.config.json` 会将这两个已迁移到云端的本地图片目录排除出代码包。Logo 加载失败时，界面会显示对应的文字缩写。

滤杯图片上传至 `roaster-guide/assets/drippers/`，16 个文件名必须与本地 `assets/drippers/` 完全一致。`project.config.json` 已将本地 `assets/drippers/` 排除出代码包，避免重复占用包体积。

烘焙商 Logo、豆子图片、滤杯图片和购豆指南图片共用云端内容图片缓存。首次进入对应页面时，客户端以最多 3 个并发任务下载并保存到微信本地持久文件目录，完成后再使用本地路径显示，避免云图先加载、缓存逻辑再重复下载。缓存写入和页面刷新会合并处理；下载或落盘失败时才回退到直接显示 `cloud://` 图片。

豆单数据首次读取成功后会缓存在手机本地。以后进入烘焙商页面时优先显示本地图片，同时后台刷新豆单数据。同一次运行中最多每 5 分钟请求一次豆单，避免每次点击都等待网络。云端图片地址发生变化或用户在“我的”页面执行“清除云端内容缓存”后，相关图片会重新下载。

## 2. 创建寻豆指南集合

在「文档型数据库」中新建集合：

`roaster_guide_beans`

将 `cloud-data/roaster_guide_beans.json` 导入该集合。文件采用 JSON Lines 格式，每一行是一款豆子的完整文档，当前包含 176 款豆子。首次导入选择 `Insert`；以后用重新生成的文件批量更新时选择 `Upsert`，系统会根据 `_id` 更新已有记录。建议将集合安全规则设为仅管理员可读写；小程序通过 `roasterCatalog` 云函数公开读取，不要求用户登录。

以后可直接在云开发控制台管理：

- 新增：创建一条文档，`_id` 和 `id` 使用唯一英文标识，并填写 `name`、`roaster` 等字段。
- 修改：直接编辑对应文档，重新进入“寻豆指南”即可刷新。
- 删除：删除对应文档；也可以把 `enabled` 改成 `false` 暂时隐藏。
- 图片：`image` 填写 `/assets/bean-thumbnails-jpg/<烘焙商目录>/文件名.jpg`，客户端会自动转换成完整云存储地址；也可以直接填写完整 `cloud://` 文件 ID。

若修改了本地初始豆单，可运行 `scripts/export-roaster-catalog.js` 重新生成导入文件。

## 3. 部署云函数

在微信开发者工具中找到 `cloudfunctions/roasterCatalog`，选择「上传并部署：云端安装依赖」。

## 4. 部署 PaddleOCR 云托管

拍照识别使用容器型云托管，不使用普通云函数。完整代码和操作说明位于 `cloudrun/paddleocr` 与 `PADDLE_OCR_SETUP.md`。

关键配置：服务名 `paddleocr`、监听端口 `8080`、初次建议 `2 核 CPU / 4GB 内存`。小程序通过 `wx.cloud.callContainer` 调用，照片临时上传到云存储 `ocr-temp/` 并在请求结束后删除。

## 5. 本机数据管理

豆仓、个人方案、冲煮记录、昵称和头像只保存在当前设备，不使用手机号登录或个人数据云同步。“我的”页面提供“数据管理”：

- 导出数据：生成 JSON 备份，并通过微信发送到用户选择的聊天。
- 导入数据：从微信聊天记录选择 JSON 备份，确认后替换当前本机数据。

清除本机缓存前应先导出备份。

## 6. 验收

1. 打开“寻豆指南”，抽查烘焙商 Logo、云端豆单缩略图和详情信息；在数据库中修改一款豆子后重新进入页面，确认内容更新。
2. 新建冲煮记录，进入滤杯选择页，确认 16 张滤杯图片均能正常加载。
3. 在“我的”点击“数据管理”，导出 JSON 文件并发送到一个聊天。
4. 新增一条测试记录，再从聊天记录导入刚才的备份，确认数据恢复到导出时状态。
5. 在“我的”点击头像，测试微信头像、相册和拍照；输入昵称后重新进入，确认资料仍保存在本机。
6. 按照 `PADDLE_OCR_SETUP.md` 部署云托管后，真机拍摄豆袋标签，确认识别字段自动填写且 `ocr-temp/` 不残留临时照片。
