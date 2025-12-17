const fs = require('fs');

// Fichiers à modifier
const files = [
  'E:/ANA/server/ana-core.cjs',
  'E:/ANA/server/intelligence/semantic-router.cjs'
];

for (const filePath of files) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ Fichier non trouvé: ${filePath}`);
    continue;
  }

  // Backup
  const backup = filePath + '.backup_identity_' + Date.now();
  fs.copyFileSync(filePath, backup);
  console.log(`Backup: ${backup}`);

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Remplacer ana-french-tutoiement par ana-superia-v2
  content = content.replace(/ana-french-tutoiement/g, 'ana-superia-v2');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${filePath} - modèle mis à jour vers ana-superia-v2`);
  } else {
    console.log(`⚠ ${filePath} - aucun changement`);
  }
}

console.log('\n✓ Modèle ana-superia-v2 configuré dans tous les fichiers');
