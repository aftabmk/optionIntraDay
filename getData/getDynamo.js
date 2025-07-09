require("dotenv").config();

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB({ region: "ap-south-1" });
const { unmarshall } = AWS.DynamoDB.Converter;

const TARGET_STRIKE = 25000;
const START_TIME = "2025-07-09T09:30:00.000Z";   // 0930
const END_TIME   = "2025-07-09T15:30:00.000Z";    // 1530

ddb.scan({ TableName: "optionIntraDay" }, (err, data) => {
  if (err) {
    console.error("❌ Scan error:", err);
  } else {
    const ceResults = [];
    const peResults = [];
    let lastAvailableTime = null;

    // 🔄 Convert all items using unmarshall
    const cleanItems = data.Items.map(item => unmarshall(item));

    for (const item of cleanItems) {
      if (item.strike !== TARGET_STRIKE) continue;

      if (!item.timestamp) continue;
      const timeStr = item.timestamp.replace(":", "");
      const timeNum = parseInt(timeStr, 10);
      if (timeNum < START_TIME || timeNum > END_TIME) continue;

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
    console.log(`⏱️ Time Range: ${START_TIME} to ${END_TIME}`);
    console.log("✅ Last available time:", lastAvailableTime);

    console.log("\n📘 CE Results:");
    console.table(ceResults);

    console.log("\n📙 PE Results:");
    console.table(peResults);
  }
});
