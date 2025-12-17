const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';

// Backup
const backup = path + '.backup_git_' + Date.now();
fs.copyFileSync(path, backup);
console.log(`Backup: ${backup}`);

let content = fs.readFileSync(path, 'utf8');

// 1. Ajouter aux validToolNames
const oldToolNames = `'get_news', 'wikipedia_search', 'convert_units'`;
const newToolNames = `'get_news', 'wikipedia_search', 'convert_units',
    'git_status', 'git_diff', 'git_commit', 'git_log'`;

if (content.includes(oldToolNames)) {
  content = content.replace(oldToolNames, newToolNames);
  console.log('✓ validToolNames mis à jour');
} else {
  console.log('⚠ validToolNames pattern non trouvé');
}

// 2. Trouver où ajouter les définitions d'outils (après convert_units)
const gitToolDefinitions = `
  // === GIT TOOLS ===
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Obtenir le statut git d\\'un répertoire. Montre les fichiers modifiés, ajoutés, non suivis.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du dépôt git.', default: '.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Voir les différences dans un dépôt git. Montre ce qui a changé.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du dépôt git.', default: '.' },
          file: { type: 'string', description: 'Fichier spécifique (optionnel).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_commit',
      description: 'Créer un commit git. Ajoute tous les fichiers modifiés et commit avec le message.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du dépôt git.', default: '.' },
          message: { type: 'string', description: 'Message de commit.' }
        },
        required: ['message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_log',
      description: 'Voir l\\'historique des commits git.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du dépôt git.', default: '.' },
          limit: { type: 'integer', description: 'Nombre de commits à afficher.', default: 10 }
        }
      }
    }
  },`;

// Chercher où insérer (après le dernier outil existant, avant ];)
const insertMarker = `name: 'convert_units'`;
const insertIdx = content.indexOf(insertMarker);
if (insertIdx !== -1) {
  // Trouver la fin de cette définition d'outil
  let braceCount = 0;
  let foundStart = false;
  let endIdx = insertIdx;
  for (let i = insertIdx; i < content.length; i++) {
    if (content[i] === '{') { braceCount++; foundStart = true; }
    if (content[i] === '}') { braceCount--; }
    if (foundStart && braceCount === 0) {
      endIdx = i + 1;
      break;
    }
  }

  // Chercher la virgule et fermeture après l'outil
  const afterTool = content.substring(endIdx, endIdx + 50);
  const commaMatch = afterTool.match(/^[\\s\\n]*,/);
  if (commaMatch) {
    endIdx += commaMatch[0].length;
  }

  content = content.substring(0, endIdx) + gitToolDefinitions + content.substring(endIdx);
  console.log('✓ Définitions des outils git ajoutées');
} else {
  console.log('⚠ convert_units non trouvé, définitions non ajoutées');
}

fs.writeFileSync(path, content, 'utf8');
console.log('\\n✓ Outils git ajoutés à tool-agent.cjs');
console.log('Note: Les implémentations doivent être ajoutées séparément');
