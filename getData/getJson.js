const fs = require('fs');
const path = require('path');

function extractStrikePriceData(startHHMM, endHHMM, strikePrice) {
    const ceResults = [];
    const peResults = [];

    let lastAvailableTime = null;

    let prevCE = 0,  prevPE = 0;

    const start = parseInt(startHHMM, 10);
    const end = parseInt(endHHMM, 10);

    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m++) {
            const hh = String(h).padStart(2, '0');
            const mm = String(m).padStart(2, '0');
            const hhmm = parseInt(hh + mm, 10);

            if (hhmm < start || hhmm > end) continue;

            const filename = `option_chain_${hh}${mm}.json`;
            const filepath = path.resolve(__dirname, '../dailyOption', filename);

            if (!fs.existsSync(filepath)) continue;

            try {
                const rawData = fs.readFileSync(filepath, 'utf8');
                const jsonData = JSON.parse(rawData);
                const entries = jsonData.data || [];

                lastAvailableTime = jsonData.timestamp || `${hh}:${mm}`;
                const underlyingValue = jsonData.underlyingValue;

                const entry = entries.find(e => e.strike === strikePrice);
                if (!entry) continue;

                // --- CE Block ---
                if (entry.call && entry.call.volume !== null) {
                    const deltaOI = prevCE ? entry.call.changeInOi - prevCE.changeInOi : entry.call.changeInOi;
                    const deltaVol = prevCE ? entry.call.volume - prevCE.volume : entry.call.volume;
                    const ratio = deltaVol !== 0
                        ? Math.round(Math.abs((75 * deltaOI) / deltaVol) * 100) / 100
                        : null;

                    ceResults.push({
                        time: lastAvailableTime,
                        underlyingValue,
                        "changeinOpenInterest(chg)": deltaOI.toLocaleString("en-IN"),
                        totalTradedVolume: deltaVol.toLocaleString("en-IN"),
                        impliedVolatility: entry.call.iv,
                        lastPrice: entry.call.ltp,
                        "coi/vol": ratio
                    });

                    prevCE = {
                        changeInOi: entry.call.changeInOi,
                        volume: entry.call.volume
                    };
                }

                // --- PE Block ---
                if (entry.put && entry.put.volume !== null) {
                    const deltaOI = prevPE ? entry.put.changeInOi - prevPE.changeInOi : entry.put.changeInOi;
                    const deltaVol = prevPE ? entry.put.volume - prevPE.volume : entry.put.volume;
                    const ratio = deltaVol !== 0
                        ? Math.round(Math.abs((75 * deltaOI) / deltaVol) * 100) / 100
                        : null;

                    peResults.push({
                        time: lastAvailableTime,
                        underlyingValue,
                        "changeinOpenInterest(chg)": deltaOI.toLocaleString("en-IN"),
                        totalTradedVolume: deltaVol.toLocaleString("en-IN"),
                        impliedVolatility: entry.put.iv,
                        lastPrice: entry.put.ltp,
                        "coi/vol": ratio
                    });

                    prevPE = {
                        changeInOi: entry.put.changeInOi,
                        volume: entry.put.volume
                    };
                }

            } catch (err) {
                console.error(`❌ Error reading ${filename}:`, err.message);
            }
        }
    }

    return {
        strikePrice,
        lastAvailableTime,
        ceResults,
        peResults
    };
}


// ✅ Example usage:
const { ceResults, peResults, lastAvailableTime, strikePrice } = extractStrikePriceData('0930', '1530', 25550);

console.log("✅ Strike Price:", strikePrice);
console.log("✅ Last available time:", lastAvailableTime);
console.log("\n📘 CE Results:");
console.table(ceResults);
console.log("\n📙 PE Results:");
console.table(peResults);
