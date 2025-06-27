const parse = require('csv-parse/sync').parse;

/**
 * Convert a CSV Buffer to JSON format of option chain
 */
function convertCsvBufferToJson(csvBuffer) {
  const csvText = csvBuffer.toString('utf-8');
  const records = parse(csvText, {
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  const dataRows = records.slice(2);
  const result = [];

  const parseNum = (val) => {
    if (!val || val === '-' || val.trim() === '') return null;
    return parseFloat(val.replace(/,/g, ''));
  };

  for (const row of dataRows) {
    if (row.length < 22 || row.includes('STRIKE') || row.includes('OI')) continue;

    const strike = parseNum(row[11]);

    const call = {
      oi: parseNum(row[1]),
      changeInOi: parseNum(row[2]),
      volume: parseNum(row[3]),
      iv: parseNum(row[4]),
      ltp: parseNum(row[5]),
      change: parseNum(row[6]),
      bidQty: parseNum(row[7]),
      bid: parseNum(row[8]),
      ask: parseNum(row[9]),
      askQty: parseNum(row[10]),
    };

    const put = {
      bidQty: parseNum(row[12]),
      bid: parseNum(row[13]),
      ask: parseNum(row[14]),
      askQty: parseNum(row[15]),
      change: parseNum(row[16]),
      ltp: parseNum(row[17]),
      iv: parseNum(row[18]),
      volume: parseNum(row[19]),
      changeInOi: parseNum(row[20]),
      oi: parseNum(row[21]),
    };

    result.push({ strike, call, put });
  }

  return result;
}

module.exports = { convertCsvBufferToJson };
