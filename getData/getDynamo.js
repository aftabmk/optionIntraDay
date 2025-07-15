require("dotenv").config();

const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");

const ddb = new AWS.DynamoDB({ region: "ap-south-1" });
const { unmarshall } = AWS.DynamoDB.Converter;
const { splitInChunks } = require("./utils");

// Read CLI input
let input = process.argv;
// Usage: node getData/getDynamo 250715
const currDateChunks = splitInChunks(input[2]);
const prevDateChunks = currDateChunks; // same for both

// Create date range: 09:10 AM to 03:40 PM IST (in UTC)
const START_TIME = new Date(
  `20${prevDateChunks[0]}-${prevDateChunks[1]}-${prevDateChunks[2]}T09:10:00.000Z`
);
const END_TIME = new Date(
  `20${currDateChunks[0]}-${currDateChunks[1]}-${currDateChunks[2]}T15:40:00.000Z`
);

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

    const strikes = {}; // will hold strike -> { ce: [], pe: [] }
    let lastAvailableTime = null;

    const cleanItems = allItems.map((item) => unmarshall(item));

    for (const item of cleanItems) {
      if (!item.timestamp || !item.strike) continue;

      const itemTime = new Date(item.timestamp);

      // Skip items not within time range
      if (itemTime < START_TIME || itemTime > END_TIME) {
        continue;
      }

      const strikeKey = String(item.strike);
      if (!strikes[strikeKey]) {
        strikes[strikeKey] = { ce: [], pe: [] };
      }

      const { timestamp: time, underlyingValue, call, put } = item;
      lastAvailableTime = time;

      if (call) {
        strikes[strikeKey].ce.push({
          time,
          strike: item.strike,
          underlyingValue,
          changeinOpenInterest: call.changeInOi,
          totalTradedVolume: call.volume,
          impliedVolatility: call.iv,
          lastPrice: call.ltp,
          change: call.change,
        });
      }

      if (put) {
        strikes[strikeKey].pe.push({
          time,
          strike: item.strike,
          underlyingValue,
          changeinOpenInterest: put.changeInOi,
          totalTradedVolume: put.volume,
          impliedVolatility: put.iv,
          lastPrice: put.ltp,
          change: put.change,
        });
      }
    }

    // Sort each strike's ce and pe by time
    for (const key of Object.keys(strikes)) {
      strikes[key].ce.sort((a, b) => new Date(a.time) - new Date(b.time));
      strikes[key].pe.sort((a, b) => new Date(a.time) - new Date(b.time));
    }

    // Prepare final combined data
    const combinedData = {
      date: `20${currDateChunks[0]}-${currDateChunks[1]}-${currDateChunks[2]}`,
      strikes,
    };

    // Ensure `data` directory exists
    const dataDir = path.join(__dirname, "../data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const fileName = `${currDateChunks[0]}${currDateChunks[1]}${currDateChunks[2]}.json`;
    const filePath = path.join(dataDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(combinedData, null, 2));

    // Log summary
    console.log(
      `⏱️ Time Range: ${START_TIME.toISOString()} to ${END_TIME.toISOString()}`
    );
    console.log("✅ Last available time:", lastAvailableTime || "None");
    console.log(`💾 Saved successfully at: data/${fileName}`);
  } catch (err) {
    console.error("❌ Error fetching or saving data:", err);
  }
})();
