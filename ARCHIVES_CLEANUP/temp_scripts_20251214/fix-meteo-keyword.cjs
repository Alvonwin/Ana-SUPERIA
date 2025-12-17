const fs = require('fs');

const f = 'E:/ANA/server/ana-core.cjs';
let c = fs.readFileSync(f, 'utf8');

// Add better météo keywords
const oldKeywords = "'meteo', 'météo', 'temps qu', 'température'";
const newKeywords = "'meteo', 'météo', 'temps qu', 'température', 'la météo', 'prévisions', 'weather', 'climat'";

if (c.includes(newKeywords)) {
  console.log('ALREADY PATCHED');
  process.exit(0);
}

if (!c.includes(oldKeywords)) {
  console.log('ERROR: Pattern not found');
  process.exit(1);
}

c = c.replace(oldKeywords, newKeywords);
fs.writeFileSync(f, c, 'utf8');
console.log('MÉTÉO KEYWORDS EXTENDED');
