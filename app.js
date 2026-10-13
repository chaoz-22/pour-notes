const { CLOUD_ENV_ID } = require("./data/cloud-config");

App({
  onLaunch() {
    if (!wx.cloud) return;
    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: false
    });
  }
});
