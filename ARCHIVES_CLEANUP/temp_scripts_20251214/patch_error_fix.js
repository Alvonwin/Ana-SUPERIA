const fs = require('fs');

const filePath = 'E:/ANA/server/core/loop-controller.cjs';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `      e.error.substring(0, 100) === errorKey`;
const newCode = `      String(e.error || '').substring(0, 100) === errorKey`;

if (content.includes(newCode)) {
  console.log('SKIP: Error fix already applied');
} else if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Error fix applied!');
} else {
  console.log('ERROR: Old code not found');
}
