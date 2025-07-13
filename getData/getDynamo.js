require("dotenv").config();

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB({ region: "ap-south-1" });
const { unmarshall } = AWS.DynamoDB.Converter;
const { splitInChunks } = require("./utils");

// 
let input = process.argv;
// node getData/getDynamo 25000 250701 250711
// Dates
const prevDateChunks = splitInChunks(input[3]);
const currDateChunks = splitInChunks(input[4]);

const TARGET_STRIKE = parseInt(input[2] || 25000, 10);

// Create ISO date strings
const START_TIME = new Date(`20${prevDateChunks[0]}-${prevDateChunks[1]}-${prevDateChunks[2]}T09:30:00.000Z`);
const END_TIME   = new Date(`20${currDateChunks[0]}-${currDateChunks[1]}-${currDateChunks[2]}T15:30:00.000Z`);

ddb.scan({ TableName: "optionIntraDay" }, (err, data) => {
  if (err) {
    console.error("❌ Scan error:", err);
  } else {
    const ceResults = [];
    const peResults = [];
    let lastAvailableTime = null;

    const cleanItems = data.Items.map(item => unmarshall(item));

    for (const item of cleanItems) {
      if (parseInt(item.strike, 10) !== TARGET_STRIKE) continue;
      if (!item.timestamp) continue;

      const itemTime = new Date(item.timestamp);
      if (itemTime < START_TIME || itemTime > END_TIME) continue;

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
          lastPrice: call.ltp,
          "coi/vol": call.volume
            ? Math.round(Math.abs((75 * call.changeInOi) / call.volume) * 100) / 100
            : null,
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
          lastPrice: put.ltp,
          "coi/vol": put.volume
            ? Math.round(Math.abs((75 * put.changeInOi) / put.volume) * 100) / 100
            : null,
        });
      }
    }

    // ✅ Output
    console.log(`✅ Strike Price: ${TARGET_STRIKE}`);
    console.log(`⏱️ Time Range: ${START_TIME.toISOString()} to ${END_TIME.toISOString()}`);
    console.log("✅ Last available time:", lastAvailableTime || "None");

    console.log("\n📘 CE Results:");
    console.table(ceResults);

    console.log("\n📙 PE Results:");
    console.table(peResults);
  }
});
