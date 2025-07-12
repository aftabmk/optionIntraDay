const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");
const { convertCsvBufferToJson } = require("./csvToJson");
const { delay, clearSession, waitForSelectorWithRetries } = require("./utils");

require("dotenv").config();

async function scrapeOptionChain() {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath:
      (await chromium.executablePath) || "/usr/bin/chromium-browser",
    headless: chromium.headless,
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

    page.on("console", (msg) => {
      console.log(`[BROWSER LOG]: ${msg.text()}`);
    });

    try {
      await page.waitForFunction(
        () => {
          const table = document.querySelector(
            "#optionChainTable-indices tbody"
          );
          console.log("Checking table rows...");
          return table && table.rows && table.rows.length > 1;
        },
        { timeout: 40000 }
      );

      console.log("✅ Table loaded with rows.");
    } catch (err) {
      console.error("❌ waitForFunction timed out:", err);
      await page.screenshot({ path: "debug_table_timeout.png" });
    }

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

      const valueMatch = valueText.match(/([\d,]+\.\d+)/);
      const numericValue = valueMatch
        ? parseFloat(valueMatch[1].replace(/,/g, ""))
        : null;

      const timeMatch = rawTimeText.match(/\b(\d{2}:\d{2})/);
      const timeStr = timeMatch ? timeMatch[1] : null;

      const dateMatch = rawTimeText.match(/(\d{1,2}-[A-Za-z]{3}-\d{4})/);
      const dateStr = dateMatch ? dateMatch[1] : null;

      let awsTimestamp = null;
      if (dateStr && timeStr) {
        const combined = `${dateStr} ${timeStr}`;
        const parsedDate = new Date(combined + " UTC");
        awsTimestamp = parsedDate.toISOString();
      }

      return {
        dataUrl: el?.getAttribute("href") || "",
        underlyingValue: numericValue,
        timestamp: awsTimestamp,
      };
    });

    if (!dataUrl.startsWith("data:application/csv;base64,")) {
      throw new Error("❌ Invalid CSV data URL.");
    }

    const base64 = dataUrl.split(",")[1];
    const csvBuffer = Buffer.from(base64, "base64");

    const parsedData = convertCsvBufferToJson(csvBuffer);
    if (!parsedData.length)
      throw new Error("❌ CSV content returned empty data.");

    return { timestamp, underlyingValue, data: parsedData };
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeOptionChain };
