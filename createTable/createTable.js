const AWS = require("aws-sdk");

// ✅ Use correct AWS region for Mumbai
const dynamodb = new AWS.DynamoDB({
  region: "ap-south-1", // 🔧 corrected region
});

const params = {
  TableName: "optionIntraDay",
  KeySchema: [
    { AttributeName: "timestamp", KeyType: "HASH" }, // Partition key
    { AttributeName: "strike", KeyType: "RANGE" },   // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "timestamp", AttributeType: "S" },
    { AttributeName: "strike", AttributeType: "N" },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};

dynamodb.createTable(params, (err, data) => {
  if (err) {
    console.error("❌ Unable to create table. Error:", JSON.stringify(err, null, 2));
  } else {
    console.log("✅ Table created successfully:", data.TableDescription.TableName);
  }
});
