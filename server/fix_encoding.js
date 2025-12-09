const fs = require('fs');
const path = 'E:/ANA/server/ana-core.cjs';

// Read as buffer to handle encoding issues
let content = fs.readFileSync(path, 'utf8');

// Fix the corrupted path
content = content.replace(/E:\\\\M.moire Claude/g, 'E:\\\\Mémoire Claude');
content = content.replace(/E:\\M.moire Claude/g, 'E:\\Mémoire Claude');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed encoding for MEMORY_PATH');
