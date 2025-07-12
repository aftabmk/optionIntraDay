const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");
const { convertCsvBufferToJson } = require("./csvToJson");
const { delay, clearSession, waitForSelectorWithRetries } = require("./utils");

require("dotenv").config();

async function scrapeOptionChain() {
  console.log("🚀 Starting scrape...");
  console.log("🚀 Preparing to launch Chromium...");

  const execPath = await chromium.executablePath;
  if (!execPath) {
    throw new Error("❌ Chromium executable path not found.");
  }

  console.log("🔧 Chromium exec path:", execPath);
  console.log("🧪 Launching browser...");

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: execPath,
    headless: chromium.headless,
    defaultViewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
    timeout: 30000,
  });

  console.log("✅ Browser launched.");
  const page = await browser.newPage();

  await clearSession(page);
  console.log("✅ Session cleared.");

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114 Safari/537.36"
  );

  try {
    const startTime = Date.now();

    console.log("🌐 Navigating to MAIN_URL...");
    await page.goto(process.env.MAIN_URL, { waitUntil: "networkidle2", timeout: 20000 });
    console.log("✅ MAIN_URL loaded in", Date.now() - startTime, "ms");

    console.log("📄 Navigating to SUB_URL...");
    await page.goto(process.env.SUB_URL, { waitUntil: "networkidle2", timeout: 20000 });
    console.log("✅ SUB_URL loaded in", Date.now() - startTime, "ms");

    console.log("⏳ Waiting for .row.my-2...");
    await page.waitForSelector(".row.my-2", { timeout: 10000 });
    console.log("✅ Found .row.my-2");

    console.log("🖱️ Clicking #equity_underlyingVal...");
    const clicked = await page.evaluate(() => {
      const el = document.querySelector("#equity_underlyingVal");
      if (el) {
        el.click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      console.warn("❌ Click failed: #equity_underlyingVal not found or not clickable.");
      return null;
    }

    console.log("⏳ Waiting for option chain table...");
    await page.waitForFunction(() => {
      const table = document.querySelector("#optionChainTable-indices tbody");
      return table && table.rows.length > 1;
    }, { timeout: 15000 });
    console.log("✅ Option chain table is visible.");

    console.log("🔍 Waiting for download button...");
    await waitForSelectorWithRetries(page, "#downloadOCTable");
    console.log("✅ Found download button.");

    console.log("🖱️ Clicking download button...");
    await page.click("#downloadOCTable");
    await delay(2000);

    console.log("📦 Extracting metadata and base64 CSV...");
    const result = await page.evaluate(() => {
      try {
        const el = document.querySelector("#downloadOCTable");
        const valueText = document.querySelector("#equity_underlyingVal")?.textContent || "";
        const rawTimeText = document.querySelector("#equity_timeStamp span:last-child")?.textContent || "";

        const valueMatch = valueText.match(/([\d,]+\.\d+)/);
        const numericValue = valueMatch ? parseFloat(valueMatch[1].replace(/,/g, "")) : null;

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
      } catch (err) {
        console.error("❌ Error extracting CSV metadata:", err.message);
        return {};
      }
    });

    console.log("📦 Metadata extracted:", result);

    const { dataUrl, underlyingValue, timestamp } = result;

    if (!dataUrl || !dataUrl.startsWith("data:application/csv;base64,")) {
      throw new Error("❌ Invalid CSV data URL.");
    }

    console.log("🧮 Decoding CSV...");
    const base64 = dataUrl.split(",")[1];
    const csvBuffer = Buffer.from(base64, "base64");

    console.log("🔄 Converting CSV to JSON...");
    const parsedData = convertCsvBufferToJson(csvBuffer);
    if (!parsedData.length) {
      throw new Error("❌ CSV content returned empty data.");
    }

    console.log("✅ Data scraping complete.");
    return { timestamp, underlyingValue, data: parsedData };

  } catch (err) {
    console.error("❌ Scrape failed:", err.message);
    await page.screenshot({ path: "/tmp/scrape_error.png" });
    throw err;
  } finally {
    await browser.close();
    console.log("🔚 Browser closed.");
  }
}

module.exports = { scrapeOptionChain };
