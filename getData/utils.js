function splitInChunks(input) {
  const str = input.toString().padStart(6, '0');
  return [str.slice(0, 2), str.slice(2, 4), str.slice(4, 6)];
}

function formatTime(isoString) {
  const date = new Date(isoString);

  // Use UTC time directly
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';

  hours = hours % 12 || 12; // Convert 0 to 12

  return `${hours}:${minutes.toString().padStart(2, '0')}${ampm}`;
}

module.exports = { splitInChunks, formatTime};
