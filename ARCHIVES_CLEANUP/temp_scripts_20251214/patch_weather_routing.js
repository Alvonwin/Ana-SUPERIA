const fs = require('fs');

const filePath = 'E:/ANA/server/intelligence/semantic-router.cjs';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `    const toolsKeywords = [
      'heure', 'quelle heure', 'meteo', 'météo', 'temps qu', 'température',`;

const newCode = `    const toolsKeywords = [
      'heure', 'quelle heure', 'meteo', 'météo', 'temps qu', 'temps fait', 'température', 'weather',`;

if (content.includes("'temps fait'")) {
  console.log('SKIP: Weather routing already patched');
} else if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Weather routing patched!');
} else {
  console.log('ERROR: Old code not found');
}
