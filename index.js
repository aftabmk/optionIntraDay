const { delay } = require("./function/utils");
const { storeInDynamoDB } = require("./function/dynamodb");
const { scrapeOptionChain } = require("./function/scraper");

// Lambda-compatible handler function
exports.handler = async (event) => {
  let attempts = 2;

  while (attempts--) {
    try {
      console.log("🚀 Starting scrape...");
      const finalOutput = await scrapeOptionChain();

      if (!finalOutput) {
        throw new Error("scrapeOptionChain returned null (no data)");
      }

      console.log("✅ Scrape successful. Storing to DynamoDB...");
      await storeInDynamoDB(finalOutput);

      console.log("📦 Stored successfully.");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Success", data: finalOutput }),
      };
    } catch (err) {
      console.error(`🚨 Error: ${err.message}`);

      if (attempts === 0) {
        console.error("❌ All retries failed");
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Scraping failed", detail: err.message }),
        };
      }

      console.log("🔁 Retrying in 5 seconds...");
      await delay(5000);
    }
  }
};
