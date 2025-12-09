const fs = require('fs');
const path = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(path, 'utf8');

// Change from DEEPSEEK to PHI3 for memory questions
content = content.replace(
  /return \{ model: LLMS\.DEEPSEEK, reason: 'Question de m.moire d.tect.e' \}/g,
  "return { model: LLMS.PHI3, reason: 'Question de memoire' }"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Changed memory questions routing from DEEPSEEK to PHI3');
