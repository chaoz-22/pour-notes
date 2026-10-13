const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const beans = db.collection("roaster_guide_beans");
const PAGE_SIZE = 100;
const MAX_BEANS = 2000;

async function listBeans() {
  const result = [];
  for (let offset = 0; offset < MAX_BEANS; offset += PAGE_SIZE) {
    const page = await beans.skip(offset).limit(PAGE_SIZE).get();
    const items = Array.isArray(page.data) ? page.data : [];
    result.push(...items);
    if (items.length < PAGE_SIZE) break;
  }
  return result
    .filter((bean) => bean && bean.enabled !== false)
    .map((bean) => {
      const { _openid, ...safeBean } = bean;
      return {
        ...safeBean,
        id: String(bean.id || bean._id || "")
      };
    });
}

exports.main = async (event = {}) => {
  const action = String(event.action || "list");
  if (action !== "list") return { ok: false, message: "不支持的操作" };

  try {
    return {
      ok: true,
      beans: await listBeans()
    };
  } catch (error) {
    return {
      ok: false,
      message: error && error.message ? error.message : "云端豆单读取失败"
    };
  }
};
