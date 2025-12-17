const fs = require('fs');

const files = [
  'E:/ANA/server/agents/tool-agent.cjs',
  'E:/ANA/server/intelligence/ana-consciousness.cjs',
  'E:/ANA/server/intelligence/ana-direct.cjs'
];

let totalChanges = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Remplacer v5 par v4
  content = content.replace(/ana-superia-v5/g, 'ana-superia-v4');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    const changes = (originalContent.match(/ana-superia-v5/g) || []).length;
    console.log(`OK: ${filePath.split('/').pop()} - ${changes} remplacement(s)`);
    totalChanges += changes;
  } else {
    console.log(`SKIP: ${filePath.split('/').pop()} - deja v4`);
  }
}

console.log(`DONE: ${totalChanges} changements total - Ana utilise maintenant v4`);
