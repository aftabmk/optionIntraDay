const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
const chromium = require("chrome-aws-lambda");
const { convertCsvBufferToJson } = require("./csvToJson");
const { simulateHumanBehavior , clearSession, waitForSelectorWithRetries } = require("./utils");

require("dotenv").config();

async function scrapeOptionChain() {
  const browser = await puppeteer.launch({
    args: [...chromium.args, "--disable-web-security"], // Optional: disable CORS for testing
    executablePath: await chromium.executablePath || "/usr/bin/chromium-browser",
    headless: chromium.headless,
    defaultViewport: { width: 1366, height: 768 },
  });

  const page = await browser.newPage();
  await clearSession(page);

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  await page.setDefaultTimeout(20000);

  try {
    console.log("🌐 Opening NSE homepage...");
    await page.goto(process.env.MAIN_URL, { waitUntil: "networkidle2", timeout: 0 });

    console.log("📄 Navigating to Option Chain...");
    await Promise.all([
      page.goto(process.env.SUB_URL, { waitUntil: "networkidle2", timeout: 0 }),
      page.waitForSelector(".row.my-2", { timeout: 15000 }),
    ]);

    console.log("🖱️ Simulating human behavior...");
    await simulateHumanBehavior(page);

    const clickable = await page.$("#equity_underlyingVal");
    if (!clickable) {
      console.warn("⚠️ #equity_underlyingVal not found. Taking screenshot...");
      await page.screenshot({ path: "debug_screenshot.png", fullPage: true });
      return null;
    }

    await clickable.click();
    console.log("✅ Clicked #equity_underlyingVal to load table.");

    await waitForSelectorWithRetries(page, "#optionChainTable-indices tbody tr:nth-child(2)", 3, 15000);
    console.log("✅ Option chain table loaded.");

    const rowCount = await page.evaluate(() => {
      return document.querySelectorAll("#optionChainTable-indices tbody tr").length;
    });
    if (rowCount < 2) {
      throw new Error("Table loaded but contains insufficient data.");
    }

    await waitForSelectorWithRetries(page, "#downloadOCTable");

    console.log("🖱️ Clicking download button...");
    await page.click("#downloadOCTable");
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#downloadOCTable");
        return el && el.getAttribute("href")?.startsWith("data:application/csv;base64,");
      },
      { timeout: 10000 }
    );

    const { dataUrl, underlyingValue, timestamp } = await page.evaluate(() => {
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
    });

    if (!dataUrl.startsWith("data:application/csv;base64,")) {
      console.warn("⚠️ Invalid CSV data URL. Attempting to scrape table directly...");
      const tableData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("#optionChainTable-indices tbody tr"));
        return rows.map(row => {
          const cells = Array.from(row.querySelectorAll("td"));
          return cells.map(cell => cell.textContent.trim());
        });
      });
      if (tableData.length) {
        console.log("✅ Scraped table data directly:", tableData);
        return { timestamp, underlyingValue, data: tableData };
      }
      throw new Error("❌ Invalid CSV data URL and table scraping failed.");
    }

    const base64 = dataUrl.split(",")[1];
    const csvBuffer = Buffer.from(base64, "base64");
    const parsedData = convertCsvBufferToJson(csvBuffer);

    if (!parsedData.length) {
      throw new Error("❌ CSV content returned empty data.");
    }

    return { timestamp, underlyingValue, data: parsedData };
  } catch (error) {
    console.error("❌ Error during scraping:", error);
    await page.screenshot({ path: "error_screenshot.png", fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeOptionChain };