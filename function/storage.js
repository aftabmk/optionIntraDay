const fs = require("fs");
const path = require("path");

function saveJsonToFile(finalOutput, timestamp) {
  const safeTime = timestamp.replace(":", "");
  const outputDir = path.resolve(__dirname, "../dailyOption");
  const filename = `option_chain_${safeTime}.json`;
  const filePath = path.join(outputDir, filename);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(finalOutput, null, 2), "utf-8");

  console.log(`✅ JSON saved: ${filePath}`);
}

module.exports = { saveJsonToFile };
