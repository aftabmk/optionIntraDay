const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { convertCsvBufferToJson } = require("./csvToJson");
const { delay, clearSession, waitForSelectorWithRetries } = require("./utils");

require('dotenv').config();
puppeteer.use(StealthPlugin());

async function scrapeOptionChain() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1366, height: 768 },
  });

  const page = await browser.newPage();
  await clearSession(page);

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114 Safari/537.36"
  );

  try {
    console.log("🌐 Opening NSE homepage...");
    await page.goto(process.env.MAIN_URL, {
      waitUntil: "networkidle2",
      timeout: 0,
    });

    console.log("📄 Navigating to Option Chain...");
    await page.goto(process.env.SUB_URL, {
      waitUntil: "networkidle2",
      timeout: 0,
    });

    await page.waitForFunction(() => {
      const table = document.querySelector("#optionChainTable-indices tbody");
      return table && table.rows.length > 1;
    }, { timeout: 20000 });

    await waitForSelectorWithRetries(page, "#downloadOCTable");
    console.log("🖱️ Clicking download...");
    await page.click("#downloadOCTable");
    await delay(2000);

    const { dataUrl, underlyingValue, timestamp } = await page.evaluate(() => {
      const el = document.querySelector("#downloadOCTable");
      const valueText =
        document.querySelector("#equity_underlyingVal")?.textContent || "";
      const rawTimeText =
        document.querySelector("#equity_timeStamp span:last-child")
          ?.textContent || "";

      // Extract numeric value
      const valueMatch = valueText.match(/([\d,]+\.\d+)/);
      const numericValue = valueMatch
        ? parseFloat(valueMatch[1].replace(/,/g, ""))
        : null;

      // Extract time
      const timeMatch = rawTimeText.match(/\b(\d{2}:\d{2})/);
      const timeStr = timeMatch ? timeMatch[1] : null;

      // Extract date (e.g., "27-Jun-2025")
      const dateMatch = rawTimeText.match(/(\d{1,2}-[A-Za-z]{3}-\d{4})/);
      const dateStr = dateMatch ? dateMatch[1] : null;

      // Combine to ISO timestamp
      let awsTimestamp = null;
      if (dateStr && timeStr) {
        const combined = `${dateStr} ${timeStr}`; // e.g. "27-Jun-2025 09:15"
        const parsedDate = new Date(combined + " UTC"); // UTC recommended
        awsTimestamp = parsedDate.toISOString(); // "2025-06-27T09:15:00.000Z"
      }

      return {
        dataUrl: el?.getAttribute("href") || "",
        underlyingValue: numericValue,
        timestamp: awsTimestamp, // full AWS timestamp
      };
    });

    if (!dataUrl.startsWith("data:application/csv;base64,")) {
      throw new Error("❌ Invalid CSV data URL.");
    }

    const base64 = dataUrl.split(",")[1];
    const csvBuffer = Buffer.from(base64, "base64");

    const parsedData = convertCsvBufferToJson(csvBuffer);
    if (!parsedData.length) throw new Error("❌ CSV content returned empty data.");

    return { timestamp, underlyingValue, data: parsedData };
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeOptionChain };
