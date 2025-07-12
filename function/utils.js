// utils.js
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearSession(page) {
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (err) {
        console.warn("⚠️ localStorage/sessionStorage not accessible:", err.message);
      }
    });
  } catch (err) {
    console.warn("⚠️ Failed to clear browser storage:", err.message);
  }

  try {
    const cookies = await page.cookies();
    if (cookies.length > 0) {
      await page.deleteCookie(...cookies);
    }
  } catch (err) {
    console.warn("⚠️ Could not clear cookies:", err.message);
  }
}


async function waitForSelectorWithRetries(
  page,
  selector,
  maxRetries = 3,
  timeout = 15000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.waitForSelector(selector, { timeout });
      console.log(`Selector ${selector} found on attempt ${attempt}`);
      return true;
    } catch (error) {
      console.warn(
        `Attempt ${attempt} failed for ${selector}: ${error.message}`
      );
      if (attempt === maxRetries)
        throw new Error(
          `Failed to find ${selector} after ${maxRetries} retries`
        );
      await delay(2000);
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

module.exports = {
  delay,
  clearSession,
  waitForSelectorWithRetries,
  isWithinTimeRange,
  getNextRunTime,
};
