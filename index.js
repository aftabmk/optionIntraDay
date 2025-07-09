const { delay } = require("./function/utils");
const { storeInDynamoDB } = require("./function/dynamodb");

let scrapeOptionChain;

if (process.env.AWS_EXECUTION_ENV) {
  // AWS Lambda environment
  scrapeOptionChain = require("./function/scraper_aws").scrapeOptionChain;
} else {
  // Local development
  scrapeOptionChain = require("./function/scraper").scrapeOptionChain;
}

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

// For Lambda entry point
module.exports = { fetch };

// Also call immediately if running standalone (e.g. local dev or Docker)
if (require.main === module) {
  fetch();
}
