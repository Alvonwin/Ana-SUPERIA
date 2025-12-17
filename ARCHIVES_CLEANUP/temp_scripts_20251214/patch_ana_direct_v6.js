// Patch ana-direct.cjs pour utiliser ana-superia-v6
const fs = require('fs');
const path = 'E:/ANA/server/intelligence/ana-direct.cjs';

let content = fs.readFileSync(path, 'utf8');

// Remplacer ana-superia-v4 par ana-superia-v6 partout
content = content.replace(/ana-superia-v4/g, 'ana-superia-v6');
content = content.replace(/Ana-superia-v5/g, 'Ana-superia-v6 (DeepSeek R1 8B)');

fs.writeFileSync(path, content, 'utf8');
console.log('Patch appliqué! ana-direct.cjs utilise maintenant ana-superia-v6');
