const {
  CLOUD_ENV_ID,
  OCR_CLOUDRUN_SERVICE,
  OCR_TEMP_CLOUD_ROOT
} = require("./cloud-config");

function uploadPhoto(path, cloudPath) {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath: path,
      success: (result) => resolve(result && result.fileID),
      fail: reject
    });
  });
}

function getTemporaryUrl(fileID) {
  return new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: (result) => {
        const file = result && result.fileList && result.fileList[0];
        if (!file || Number(file.status) !== 0 || !file.tempFileURL) {
          reject(new Error(file && file.errMsg || "无法生成照片临时地址"));
          return;
        }
        resolve(file.tempFileURL);
      },
      fail: reject
    });
  });
}

function callOcrService(imageUrl) {
  return new Promise((resolve, reject) => {
    wx.cloud.callContainer({
      config: { env: CLOUD_ENV_ID },
      path: "/v1/ocr",
      method: "POST",
      header: {
        "X-WX-SERVICE": OCR_CLOUDRUN_SERVICE,
        "content-type": "application/json"
      },
      data: { imageUrl },
      timeout: 120000,
      success: resolve,
      fail: reject
    });
  });
}

function isRequestTimeout(error) {
  const message = getErrorMessage(error);
  return Number(error && error.errCode) === 102002
    || /(?:102002|请求超时|request\s*timeout)/i.test(message);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function callOcrServiceWithColdStartRetry(imageUrl) {
  const maximumAttempts = 3;
  let lastError = null;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await callOcrService(imageUrl);
    } catch (error) {
      lastError = error;
      if (!isRequestTimeout(error) || attempt === maximumAttempts) throw error;
      console.warn("[bean-ocr] cloud service timed out while starting; retrying", {
        attempt,
        maximumAttempts
      });
      await wait(attempt * 800);
    }
  }
  throw lastError;
}

function deleteTemporaryPhoto(fileID) {
  if (!fileID) return Promise.resolve();
  return new Promise((resolve) => {
    wx.cloud.deleteFile({
      fileList: [fileID],
      complete: resolve
    });
  });
}

function parseContainerData(response) {
  let data = response && response.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (error) {
      throw new Error("识别服务返回了无法解析的数据");
    }
  }
  const statusCode = Number(response && response.statusCode) || 0;
  if (statusCode < 200 || statusCode >= 300) {
    const detail = data && (data.detail || data.message);
    throw new Error(detail || `识别服务请求失败（${statusCode || "未知状态"}）`);
  }
  if (!data || data.ok !== true || !Array.isArray(data.lines)) {
    throw new Error(data && (data.detail || data.message) || "识别服务返回异常");
  }
  return data;
}

function getErrorMessage(error) {
  if (!error) return "识别失败，请重新拍摄";
  if (typeof error === "string") return error;
  const data = error.data && typeof error.data === "object" ? error.data : null;
  const candidates = [
    error.message,
    error.errMsg,
    error.detail,
    data && data.detail,
    data && data.message
  ];
  for (let index = 0; index < candidates.length; index += 1) {
    const value = String(candidates[index] || "").trim();
    if (value) return value;
  }
  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") return serialized;
  } catch (serializationError) {
    // Use the generic message below when the error cannot be serialized.
  }
  return "识别失败，请重新拍摄";
}

function createCloudPath(path) {
  const extensionMatch = String(path || "").match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "jpg";
  const safeExtension = /^(jpe?g|png|webp)$/.test(extension) ? extension : "jpg";
  const nonce = Math.random().toString(36).slice(2, 10);
  return `${OCR_TEMP_CLOUD_ROOT}/${Date.now()}-${nonce}.${safeExtension}`;
}

function ensureCloudAvailable() {
  if (
    !wx.cloud
    || typeof wx.cloud.uploadFile !== "function"
    || typeof wx.cloud.getTempFileURL !== "function"
    || typeof wx.cloud.callContainer !== "function"
  ) {
    throw new Error("当前微信版本不支持云端识别，请升级微信后重试");
  }
}

async function recognizeBeanLabelPhoto(path) {
  let stage = "prepare-cloud";
  let fileID = "";
  try {
    ensureCloudAvailable();
    stage = "upload-image";
    fileID = await uploadPhoto(path, createCloudPath(path));
    if (!fileID) throw new Error("照片上传失败，请检查云存储配置");
    stage = "create-temp-url";
    const imageUrl = await getTemporaryUrl(fileID);
    stage = "call-container";
    const response = await callOcrServiceWithColdStartRetry(imageUrl);
    const result = parseContainerData(response);
    if (!result.lines.length) throw new Error("没有识别到清晰文字，请靠近标签重新拍摄");
    return result.lines;
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[bean-ocr] cloud recognize failed", {
      stage,
      message,
      errMsg: error && error.errMsg,
      statusCode: error && error.statusCode,
      data: error && error.data,
      raw: error
    });
    throw new Error(message);
  } finally {
    await deleteTemporaryPhoto(fileID);
  }
}

module.exports = {
  getErrorMessage,
  recognizeBeanLabelPhoto
};
