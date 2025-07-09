const { delay } = require("./function/utils");
const { storeInDynamoDB } = require("./function/dynamodb");

let scrapeOptionChain;

if (process.env.AWS_EXECUTION_ENV) {
  // On AWS Lambda or other AWS environment
  scrapeOptionChain = require("./function/scraper_aws").scrapeOptionChain;
} else {
  // Local environment
  scrapeOptionChain = require("./function/scraper").scrapeOptionChain;
}

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
// module.exports = {fetch}; // for cron or testing
