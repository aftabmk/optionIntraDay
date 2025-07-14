require("dotenv").config();

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB({ region: "ap-south-1" });
const { unmarshall } = AWS.DynamoDB.Converter;
const { splitInChunks } = require("./utils");

// Read CLI input
let input = process.argv;
// Usage: node getData/getDynamo 25000 250711
const TARGET_STRIKE = parseInt(input[2] || 25000, 10);
const prevDateChunks = splitInChunks(input[3]);
const currDateChunks = splitInChunks(input[3]);

// Create date range
const START_TIME = new Date(`20${prevDateChunks[0]}-${prevDateChunks[1]}-${prevDateChunks[2]}T09:10:00.000Z`);
const END_TIME = new Date(`20${currDateChunks[0]}-${currDateChunks[1]}-${currDateChunks[2]}T15:40:00.000Z`);

// Recursive scan to fetch all items
async function fullScan(params = {}, items = []) {
  const data = await ddb.scan(params).promise();
  items.push(...data.Items);
  if (data.LastEvaluatedKey) {
    params.ExclusiveStartKey = data.LastEvaluatedKey;
    return fullScan(params, items);
  }
  return items;
}

// Main logic
(async () => {
  try {
    const allItems = await fullScan({ TableName: "optionIntraDay" });

    const ceResults = [];
    const peResults = [];
    let lastAvailableTime = null;

    const cleanItems = allItems.map(item => unmarshall(item));

    for (const item of cleanItems) {
      if (!item.timestamp) continue;

      const itemTime = new Date(item.timestamp);

      // Skip items not within time range
      if (itemTime < START_TIME || itemTime > END_TIME) {
        continue;
      }

      if (parseInt(item.strike, 10) !== TARGET_STRIKE) continue;

      const { timestamp: time, underlyingValue, strike, call, put } = item;
      lastAvailableTime = time;

      if (call && call.volume !== null) {
        ceResults.push({
          time,
          strike,
          underlyingValue,
          changeinOpenInterest: call.changeInOi,
          totalTradedVolume: call.volume,
          impliedVolatility: call.iv,
          lastPrice: call.ltp
        });
      }

      if (put && put.volume !== null) {
        peResults.push({
          time,
          strike,
          underlyingValue,
          changeinOpenInterest: put.changeInOi,
          totalTradedVolume: put.volume,
          impliedVolatility: put.iv,
          lastPrice: put.ltp
        });
      }
    }

    // Sort results
    ceResults.sort((a, b) => new Date(a.time) - new Date(b.time));
    peResults.sort((a, b) => new Date(a.time) - new Date(b.time));

    // Output
    console.log(`\n✅ Strike Price: ${TARGET_STRIKE}`);
    console.log(`⏱️ Time Range: ${START_TIME.toISOString()} to ${END_TIME.toISOString()}`);
    console.log("✅ Last available time:", lastAvailableTime || "None");

    console.log("\n📘 CE Results:");
    console.table(ceResults);

    console.log("\n📙 PE Results:");
    console.table(peResults);

  } catch (err) {
    console.error("❌ Error fetching data:", err);
  }
})();
