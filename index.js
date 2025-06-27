const { delay } = require("./function/utils");
const { storeInDynamoDB } = require("./function/dynamodb");
const { scrapeOptionChain } = require("./function/scraper");

async function fetch() {
  let attempts = 3;

  while (attempts--) {
    try {
      const finalOutput = await scrapeOptionChain();
      await storeInDynamoDB(finalOutput);
      break;
    } 
    catch (err) {
      console.error(`🚨 Error: ${err.message}`);
      if (attempts === 0) process.exit(1);
      console.log("🔁 Retrying in 5 seconds...");
      await delay(5000);
    }
  }
}

fetch();
// module.exports = {fetch}; // for cron
