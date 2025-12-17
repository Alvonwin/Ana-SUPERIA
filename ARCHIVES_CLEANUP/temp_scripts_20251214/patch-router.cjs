const fs = require('fs');

const filePath = 'E:/ANA/server/intelligence/semantic-router.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched
if (content.includes('PRIORITY CHECK: Tools keywords BEFORE semantic routing')) {
  console.log('Already patched!');
  process.exit(0);
}

const oldCode = `      return {
        model: TASK_TYPES.VISION.preferredModel,
        taskType: 'vision',
        reason: 'Image detected in context',
        confidence: 1.0,
        method: 'context_override'
      };
    }
    const messageEmbedding = await this.getEmbedding(message);`;

const newCode = `      return {
        model: TASK_TYPES.VISION.preferredModel,
        taskType: 'vision',
        reason: 'Image detected in context',
        confidence: 1.0,
        method: 'context_override'
      };
    }

    // PRIORITY CHECK: Tools keywords BEFORE semantic routing
    const msgLower = message.toLowerCase();
    const toolsKeywords = [
      'heure', 'quelle heure', 'meteo', 'météo', 'temps qu',
      'fichier', 'lis le', 'lire', 'ouvre', 'crée', 'cree', 'créer', 'liste les', 'lister', 'quels fichiers', 'trouve', 'trouver',
      'execute', 'exécute', 'commande', 'shell', 'dir ',
      'cherche sur', 'recherche', 'récupère', 'recupere', 'contenu de', 'web',
      'wikipedia', 'groq', 'cerebras', 'demande à', 'demande a',
      'agent', 'mémoire', 'memoire', 'rappelles', 'souviens',
      'modifie', 'modifier', 'glob', 'grep', 'pose-moi', 'processus', 'pid', 'tâche', 'tache', 'notebook', 'planification'
    ];
    if (toolsKeywords.some(kw => msgLower.includes(kw))) {
      this.updateStats('TOOLS');
      return {
        model: TASK_TYPES.TOOLS.preferredModel,
        taskType: 'tools',
        reason: 'Priority keyword match: tools task',
        confidence: 0.95,
        method: 'tools',
        provider: TASK_TYPES.TOOLS.provider,
        fallbackModel: TASK_TYPES.TOOLS.fallbackModel
      };
    }

    const messageEmbedding = await this.getEmbedding(message);`;

if (!content.includes(oldCode)) {
  console.log('Target code not found - file may have changed');
  process.exit(1);
}

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch applied successfully!');
