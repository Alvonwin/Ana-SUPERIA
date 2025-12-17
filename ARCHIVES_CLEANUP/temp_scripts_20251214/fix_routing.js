const fs = require('fs');
const path = 'E:/ANA/server/ana-core.cjs';

// Backup
const backup = path + '.backup_' + Date.now();
fs.copyFileSync(path, backup);
console.log('Backup:', backup);

let content = fs.readFileSync(path, 'utf8');

const oldKeywords = `    // TOOLS tasks - PRIORITY routing to ToolAgent
    const toolsKeywords = [
      'heure', 'quelle heure', 'meteo', 'météo', 'temps qu', 'température', 'la météo', 'prévisions', 'weather', 'climat',
      'fichier', 'lis le', 'lire', 'ouvre', 'crée', 'cree', 'créer', 'liste les', 'lister', 'quels fichiers', 'trouve', 'trouver',
      'execute', 'exécute', 'commande', 'shell', 'dir ', 'ls ',
      'cherche sur', 'recherche sur', 'récupère', 'recupere', 'contenu de', 'web',
      'wikipedia', 'groq', 'cerebras', 'demande à', 'demande a',
      'agent', 'lance un agent',
      'modifie', 'modifier', 'glob', 'grep', 'pose-moi', 'processus', 'pid', 'tâche', 'tache', 'notebook', 'planification',
      'arrête le', 'ajoute une tâche', 'en arrière-plan'
    ];`;

const newKeywords = `    // TOOLS tasks - PRIORITY routing to ToolAgent (EXPANDED 2025-12-08)
    const toolsKeywords = [
      // Time & Weather
      'heure', 'quelle heure', 'meteo', 'météo', 'temps qu', 'température', 'la météo', 'prévisions', 'weather', 'climat',
      // Files - EXPANDED for edit/write/read
      'fichier', 'lis le', 'lire', 'ouvre', 'crée', 'cree', 'créer', 'liste les', 'lister', 'quels fichiers', 'trouve', 'trouver',
      'écris', 'écrire', 'write_file', 'read_file', 'edit_file', 'package.json', '.txt', '.js', '.cjs', 'E:/', 'E:\\\\',
      // Shell
      'execute', 'exécute', 'commande', 'shell', 'dir ', 'ls ', 'run_shell',
      // Web & News
      'cherche sur', 'recherche sur', 'récupère', 'recupere', 'contenu de', 'web', 'nouvelles', 'actualités', 'news du jour',
      // APIs externes
      'wikipedia', 'groq', 'cerebras', 'demande à', 'demande a', 'youtube', 'vidéo youtube',
      // Advanced tools
      'agent', 'lance un agent', 'recherche approfondie', 'research',
      'modifie', 'modifier', 'glob', 'grep', 'pose-moi', 'processus', 'pid', 'tâche', 'tache', 'notebook', 'planification',
      'arrête le', 'ajoute une tâche', 'en arrière-plan',
      // Nouveaux outils parité
      'convertis', 'conversion', 'miles', 'kilomètres', 'génère une image', 'générer', 'execute ce code', 'print('
    ];`;

if (content.includes(oldKeywords)) {
  content = content.replace(oldKeywords, newKeywords);
  fs.writeFileSync(path, content, 'utf8');
  console.log('SUCCESS: Routing keywords expanded');
} else {
  console.log('Pattern not found - checking if already updated...');
  if (content.includes('EXPANDED 2025-12-08')) {
    console.log('Already updated!');
  } else {
    console.log('Manual update needed - pattern changed');
  }
}
