// function/dynamodb.js
const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: "ap-south-1" });

async function storeInDynamoDB({ timestamp, underlyingValue, data }) {
  for (const entry of data) {
    const params = {
      TableName: "optionIntraDay",
      Item: {
        timestamp,
        strike: entry.strike,
        underlyingValue,
        call: entry.call,
        put: entry.put,
      },
    };

    try {
      await dynamodb.put(params).promise();
      console.log({params,message:`📤 Stored strike ${entry.strike} @ ${timestamp}`});
    } catch (err) {
      console.error("❌ DynamoDB error:", err);
    }
  }
}

module.exports = { storeInDynamoDB };
