const fs = require('fs');
const path = 'E:/ANA/server/ana-core.cjs';

let content = fs.readFileSync(path, 'utf8');

// Add or update TOUCH_RELOAD comment
const touchLine = '// TOUCH_RELOAD: ' + Date.now();
if (content.includes('// TOUCH_RELOAD:')) {
  content = content.replace(/\/\/ TOUCH_RELOAD:.*/, touchLine);
} else {
  content = touchLine + '\n' + content;
}

fs.writeFileSync(path, content);
console.log('Touched ana-core.cjs to force nodemon reload');
