const fs = require("fs");
const path = require("path");
const { getBundledRoasterBeans } = require("../data/roaster-beans");

const outputPath = path.resolve(__dirname, "../cloud-data/roaster_guide_beans.json");
const beans = getBundledRoasterBeans().map((bean) => ({
  ...bean,
  _id: String(bean.id),
  enabled: bean.enabled !== false
}));

fs.writeFileSync(outputPath, beans.map((bean) => JSON.stringify(bean)).join("\n") + "\n");
console.log(`Exported ${beans.length} beans to ${outputPath}`);
