const CLOUD_ENV_ID = "pour-notes-d8gg2pilacb585b96";
const CLOUD_STORAGE_ID = "pour-notes-d8gg2pilacb585b96.706f-pour-notes-d8gg2pilacb585b96-1445298998";
const ROASTER_GUIDE_CLOUD_ROOT = `cloud://${CLOUD_STORAGE_ID}/roaster-guide`;
const OCR_CLOUDRUN_SERVICE = "paddleocr";
const OCR_TEMP_CLOUD_ROOT = "ocr-temp";

function getRoasterGuideCloudPath(localPath) {
  const path = String(localPath || "");
  if (
    path.startsWith("/assets/bean-thumbnails-jpg/")
    || path.startsWith("/assets/roasters/")
    || path.startsWith("/assets/drippers/")
  ) {
    return `${ROASTER_GUIDE_CLOUD_ROOT}${path}`;
  }
  return path;
}

module.exports = {
  CLOUD_ENV_ID,
  CLOUD_STORAGE_ID,
  ROASTER_GUIDE_CLOUD_ROOT,
  OCR_CLOUDRUN_SERVICE,
  OCR_TEMP_CLOUD_ROOT,
  getRoasterGuideCloudPath
};
