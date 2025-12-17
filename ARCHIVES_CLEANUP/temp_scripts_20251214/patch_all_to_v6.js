// Patch TOUS les fichiers pour utiliser ana-superia-v6
const fs = require('fs');

const files = [
  'E:/ANA/server/intelligence/ana-consciousness.cjs',
  'E:/ANA/server/ana-core.cjs',
  'E:/ANA/server/core/llm-orchestrator.cjs',
  'E:/ANA/server/intelligence/semantic-router.cjs'
];

let totalChanges = 0;

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Remplacer toutes les versions par v6
    content = content.replace(/ana-superia-v[0-9]+/g, 'ana-superia-v6');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      const changes = (original.match(/ana-superia-v[0-9]+/g) || []).length;
      console.log(`✓ ${file.split('/').pop()}: ${changes} remplacements`);
      totalChanges += changes;
    } else {
      console.log(`- ${file.split('/').pop()}: pas de changement`);
    }
  } catch (err) {
    console.log(`✗ ${file}: ${err.message}`);
  }
});

console.log(`\nTotal: ${totalChanges} remplacements effectués`);
console.log('Redémarre Ana pour appliquer!');
