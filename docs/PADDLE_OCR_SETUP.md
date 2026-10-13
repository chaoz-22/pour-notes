# PaddleOCR 云端拍照录豆配置

本项目在“豆仓 → 添加豆子”中将豆袋照片临时上传到 CloudBase 云存储，再通过 CloudBase 云托管中的 PaddleOCR 服务识别文字。识别请求结束后，小程序会调用 `wx.cloud.deleteFile` 删除临时照片。

识别服务默认使用 `PP-OCRv5_mobile_det` 与 `PP-OCRv5_mobile_rec`，优先降低 CPU 推理延迟，并可处理同一标签内混排的简体中文、繁体中文和英文。客户端会优先采用标签上明确识别出的处理法、风味、日期和重量，并仅用内置豆单补全或纠正缺失的名称等信息。若实测更重视极限准确率，可将云托管环境变量 `OCR_RECOGNITION_MODEL` 改为 `PP-OCRv5_server_rec` 后重新部署。

原来的 Paddle.js、第三方插件、手机 WebGL 和 WASM 运行链路已经停用，不需要添加 Paddle.js 插件、构建 npm 或配置百度模型下载域名。

## 一、部署 CloudBase 云托管服务

项目已经准备好完整容器目录：

`cloudrun/paddleocr`

其中包含 `Dockerfile`、Python API 和固定版本依赖。请在环境 `pour-notes-d8gg2pilacb585b96` 中操作：

1. 进入 CloudBase 控制台 →「云托管」→「新建服务」。
2. 服务名称必须填写：`paddleocr`。
3. 选择容器型云托管，通过本地代码/代码包部署。
4. 上传目录选择 `cloudrun/paddleocr`，确保 `Dockerfile` 位于上传目录根部。
5. Dockerfile 名称填写 `Dockerfile`，监听端口填写 `8080`。
6. 初次验证建议规格使用 `2 核 CPU / 4GB 内存`，最大实例数 `1`。
7. 测试阶段最小实例数可设为 `0`；正式版若不希望首次请求冷启动，可改为 `1`。
8. 开启 `100%` 流量。只供小程序使用时关闭公网访问，保留 `callContainer` 访问。
9. 部署完成后打开服务日志，确认容器成功监听 `0.0.0.0:8080`。

Docker 构建时会从 Paddle 官方 BOS 下载 `PP-OCRv5_mobile_det` 和 `PP-OCRv5_mobile_rec`，并打包进镜像。容器启动时会在接收 OCR 请求前预加载本地模型；构建和启动时间可能较长，但首个业务请求不再承担模型初始化。

## 二、CloudBase 环境检查

1. 确认小程序 AppID `wx1f76c922f2a6c522` 已关联环境 `pour-notes-d8gg2pilacb585b96`。
2. 确认云存储安全规则允许当前小程序用户上传并删除 `ocr-temp/` 下自己创建的文件。若目前只有 `roaster-guide/` 公开内容，可在合并现有规则后参考下面的规则；不要覆盖项目中其他目录已有的权限：

   ```json
   {
     "read": "/^roaster-guide\\//.test(resource.path) || (/^ocr-temp\\//.test(resource.path) && (resource.openid == auth.openid || resource.openid == auth.uid))",
     "write": "/^ocr-temp\\//.test(resource.path) && (resource.openid == auth.openid || resource.openid == auth.uid)"
   }
   ```

   规则修改后通常需要等待数分钟生效。
3. 云托管服务名必须与 `data/cloud-config.js` 中的 `OCR_CLOUDRUN_SERVICE` 一致，默认都是 `paddleocr`。
4. 不需要在微信小程序后台新增 `request` 合法域名；客户端通过 `wx.cloud.callContainer` 调用。

如果服务返回“图片地址不属于允许的云存储域名”，从云托管日志中找到临时图片 URL 的主机名，并把对应域名后缀加入云托管环境变量：

`OCR_ALLOWED_IMAGE_HOST_SUFFIXES`

默认值：

`.tcb.qcloud.la,.tcb.qcloud.com,.cloudstatic.cn,.myqcloud.com`

多个后缀使用英文逗号分隔。

## 三、微信公众平台隐私配置

拍照识别现在会上传用户主动选择的照片。请在微信公众平台「用户隐私保护指引」中确认包含以下用途：

- 摄像头：用于拍摄咖啡豆包装标签并识别文字。
- 选中的照片或视频：用于选择咖啡豆包装标签照片并识别文字。

小程序内的隐私协议和识别页面已经同步说明：照片仅用于本次识别，请求结束后自动删除，不用于模型训练。

## 四、验收步骤

1. 在云托管服务详情中访问健康检查路径 `/health`，应返回 `ok: true`。
2. 使用微信开发者工具编译项目，确认基础库使用 `latest`。
3. 使用真机打开“豆仓 → 添加豆子 → 拍照识别豆袋”。
4. 拍摄或选择一张清晰豆袋正面照片。
5. 确认页面依次显示“正在安全上传临时照片”和“正在调用 PaddleOCR 识别”。
6. 确认识别完成后自动填写字段，并人工检查内容。
7. 在 CloudBase 云存储检查 `ocr-temp/`，成功请求不应残留对应临时照片。
8. 在云托管日志检查 `POST /v1/ocr` 的状态；正常为 `200`。

## 五、常见错误

- `Your server is Forbidden For CallContainer`：检查小程序与环境关联、服务是否开启流量，以及 CloudBase CLI/控制台创建的版本是否允许 `callContainer`。
- `404`：服务名不是 `paddleocr`，或接口路径/版本流量配置错误。
- `无法读取云存储中的照片`：临时 URL 已失效或云存储读取权限不正确。
- `图片地址不属于允许的云存储域名`：按“CloudBase 环境检查”补充允许的域名后缀。
- `PaddleOCR 识别失败`：查看云托管日志中的 `PaddleOCR inference failed` 及其后续堆栈。本服务默认关闭 oneDNN/MKLDNN，以避开 PaddlePaddle 3.3.x 在 Linux CPU 容器中的兼容性问题；低于 4GB 时还应提高内存规格。
- 首次识别很慢：最小实例数为 `0` 时会发生冷启动，正式环境可设为 `1`。

## 六、本地验证

字段解析规则：

```bash
node scripts/test-bean-ocr-parser.js
```

如果本机安装了 Docker，可在 `cloudrun/paddleocr` 中构建并启动：

```bash
docker build -t pour-notes-paddleocr .
docker run --rm -p 8080:8080 pour-notes-paddleocr
curl http://127.0.0.1:8080/health
```

PaddleOCR 和 PaddlePaddle 使用 Apache-2.0 许可证。CloudBase 云托管、云存储与流量会按所选套餐产生资源用量。
