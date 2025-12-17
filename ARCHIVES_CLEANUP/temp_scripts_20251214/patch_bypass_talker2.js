const fs = require('fs');

const filePath = 'E:/ANA/server/intelligence/ana-consciousness.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Modifier le seuil de 50 à 10 caractères
const oldPattern = `if (expertResult && typeof expertResult === 'string' && expertResult.length > 50) {`;
const newPattern = `if (expertResult && typeof expertResult === 'string' && expertResult.length > 10) {`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Bypass threshold reduced to 10 chars');
} else if (content.includes('expertResult.length > 10')) {
  console.log('SKIP: Already patched');
} else {
  console.log('ERROR: Pattern not found');
}
