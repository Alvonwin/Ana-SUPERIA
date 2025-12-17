const fs = require('fs');
const path = 'E:/ANA/server/ana-core.cjs';

// Backup
const backup = path + '.backup_websearch_' + Date.now();
fs.copyFileSync(path, backup);
console.log('Backup:', backup);

let content = fs.readFileSync(path, 'utf8');

// Fix: Add web_search to routing keywords
const oldLine = `      // Web & News
      'cherche sur', 'recherche sur', 'récupère', 'recupere', 'contenu de', 'web', 'nouvelles', 'actualités', 'news du jour',`;

const newLine = `      // Web & News
      'cherche sur', 'recherche sur', 'récupère', 'recupere', 'contenu de', 'web', 'nouvelles', 'actualités', 'news du jour',
      'web_search', 'recherche web', 'cherche sur le web', 'search on web',`;

if (content.includes(oldLine)) {
  content = content.replace(oldLine, newLine);
  fs.writeFileSync(path, content, 'utf8');
  console.log('✓ web_search ajouté au routing');
} else if (content.includes('web_search')) {
  console.log('⚠ web_search déjà présent dans le fichier');
} else {
  console.log('⚠ Pattern non trouvé - vérifier manuellement');
}
