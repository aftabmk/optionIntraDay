const { delay } = require("./function/utils");
const { storeInDynamoDB } = require("./function/dynamodb");
const { scrapeOptionChain } = require("./function/scraper");

async function fetch() {
  let attempts = 3;

  while (attempts--) {
    try {
      console.log("🚀 Starting scrape...");
      const finalOutput = await scrapeOptionChain();
      console.log("✅ Scrape successful. Storing to DynamoDB...");
      await storeInDynamoDB(finalOutput);
      console.log("📦 Stored successfully.");
      break;
    } catch (err) {
      console.error(`🚨 Error: ${err.message}`);
      if (attempts === 0) {
        console.error("❌ All retries failed. Exiting.");
        process.exit(1);
      }
      console.log("🔁 Retrying in 5 seconds...");
      await delay(5000);
    }
  }
}
// Also call immediately if running standalone (e.g. local dev or Docker)
fetch();
