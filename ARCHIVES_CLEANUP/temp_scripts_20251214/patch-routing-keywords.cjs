const fs = require('fs');
const path = 'E:/ANA/server/ana-core.cjs';

// Backup first
const backupPath = path + '.backup_routing_' + Date.now();
fs.copyFileSync(path, backupPath);
console.log(`✓ Backup créé: ${backupPath}`);

let content = fs.readFileSync(path, 'utf8');

// Ancienne ligne 373-374 (advanced tools et arrière-plan)
const oldLine = `      'modifie', 'modifier', 'glob', 'grep', 'pose-moi', 'processus', 'pid', 'tâche', 'tache', 'notebook', 'planification',
      'arrête le', 'ajoute une tâche', 'en arrière-plan',`;

// Nouvelle ligne avec plus de keywords pour todo et background
const newLine = `      'modifie', 'modifier', 'glob', 'grep', 'pose-moi', 'processus', 'pid', 'tâche', 'tache', 'notebook', 'planification',
      'arrête le', 'ajoute une tâche', 'en arrière-plan', 'background', 'arrière plan', 'todo', 'to-do', 'liste de tâches', 'rappel',
      'lance en fond', 'exécute en fond', 'processus background', 'kill', 'tue le processus', 'stoppe',`;

if (content.includes(oldLine)) {
  content = content.replace(oldLine, newLine);
  fs.writeFileSync(path, content);
  console.log('✓ Keywords routing ajoutés pour todo et background');
} else {
  console.log('⚠ Pattern non trouvé');
  // Essayons de trouver le pattern approximatif
  if (content.includes("'arrête le', 'ajoute une tâche'")) {
    console.log('ℹ Pattern partiel trouvé');
  }
}
