const fs = require('fs');

const f = 'E:/ANA/server/ana-core.cjs';
let c = fs.readFileSync(f, 'utf8');

if (c.includes('TOOLS tasks - PRIORITY routing')) {
  console.log('ALREADY PATCHED');
  process.exit(0);
}

// Find and replace the classifyTask method
const oldPattern = /classifyTask\(message, context = \{\}\) \{\s*\n\s*const msgLower = message\.toLowerCase\(\);\s*\n\s*\/\/ Vision tasks/;

if (!oldPattern.test(c)) {
  console.log('ERROR: Pattern not found');
  process.exit(1);
}

const toolsCode = `classifyTask(message, context = {}) {
    const msgLower = message.toLowerCase();

    // TOOLS tasks - PRIORITY routing to ToolAgent
    const toolsKeywords = [
      'heure', 'quelle heure', 'meteo', 'météo', 'temps qu', 'température',
      'fichier', 'lis le', 'lire', 'ouvre', 'crée', 'cree', 'créer', 'liste les', 'lister', 'quels fichiers', 'trouve', 'trouver',
      'execute', 'exécute', 'commande', 'shell', 'dir ', 'ls ',
      'cherche sur', 'recherche sur', 'récupère', 'recupere', 'contenu de', 'web',
      'wikipedia', 'groq', 'cerebras', 'demande à', 'demande a',
      'agent', 'lance un agent',
      'modifie', 'modifier', 'glob', 'grep', 'pose-moi', 'processus', 'pid', 'tâche', 'tache', 'notebook', 'planification',
      'arrête le', 'ajoute une tâche', 'en arrière-plan'
    ];
    if (toolsKeywords.some(kw => msgLower.includes(kw))) {
      return { model: 'tools', reason: 'Tâche nécessitant un outil', method: 'tools' };
    }

    // Vision tasks`;

c = c.replace(oldPattern, toolsCode);
fs.writeFileSync(f, c, 'utf8');
console.log('PATCH APPLIED TO ana-core.cjs');
