// utils.js
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearSession(page) {
  // Your existing clearSession implementation
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.deleteCookie(...(await page.cookies()));
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

async function simulateHumanBehavior(page) {
  try {
    // Simulate random scrolling
    await page.evaluate(() => {
      const randomScroll = Math.random() * 100 + 100; // Scroll 100-200 pixels
      window.scrollBy(0, randomScroll);
    });

    // Simulate random mouse movement
    await page.mouse.move(
      Math.random() * 500, // X-coordinate (0-500 pixels)
      Math.random() * 500, // Y-coordinate (0-500 pixels)
      { steps: 10 } // Smooth movement with 10 steps
    );

    // Add a random delay to mimic human pauses
    await delay(Math.random() * 1000 + 500); // 500-1500ms delay

    console.log("🖱️ Simulated human behavior (scroll and mouse movement)");
  } catch (error) {
    console.error("❌ Error in simulateHumanBehavior:", error);
    throw error;
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
  simulateHumanBehavior,
  isWithinTimeRange,
  getNextRunTime,
};
