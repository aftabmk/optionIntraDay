const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function clearSession(page) {
  const client = await page.target().createCDPSession();
  await client.send("Network.clearBrowserCookies");
  await client.send("Network.clearBrowserCache");

  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  console.log("🧽 Cleared session data");
}

async function waitForSelectorWithRetries(page, selector, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.waitForSelector(selector, { visible: true, timeout: 10000 });
      return;
    } catch {
      console.warn(`⚠️ Attempt ${attempt} failed to find ${selector}`);
      if (attempt === maxRetries)
        throw new Error(`❌ Failed to load selector: ${selector}`);
      await delay(3000);
    }
  }
}

// below function used in cron
function isWithinTimeRange() {
  const now = new Date();
  const hhmm = now.getHours() * 100 + now.getMinutes();
  return hhmm >= 915 && hhmm <= 1535;
}


function getNextRunTime() {
  const now = new Date();
  const next = new Date(now);

  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil((minutes + 1) / 5) * 5;

  if (roundedMinutes >= 60) {
    next.setHours(now.getHours() + 1);
    next.setMinutes(0);
  } else {
    next.setMinutes(roundedMinutes);
  }

  next.setSeconds(0);
  next.setMilliseconds(0);

  return next.toLocaleTimeString();
}

module.exports = { delay, clearSession, waitForSelectorWithRetries, isWithinTimeRange , getNextRunTime };
