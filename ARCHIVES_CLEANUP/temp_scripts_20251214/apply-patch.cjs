const fs = require("fs");
const f = "E:/ANA/server/intelligence/semantic-router.cjs";
let c = fs.readFileSync(f, "utf8");

if (c.includes("PRIORITY: Check for TOOLS")) {
  console.log("ALREADY PATCHED");
  process.exit(0);
}

// Find the insertion point: after context_override block, before messageEmbedding
const marker = "method: 'context_override'\n      };\n    }\n    const messageEmbedding";
const replacement = `method: 'context_override'
      };
    }

    // PRIORITY: Check for TOOLS keywords BEFORE semantic routing
    const msgLower = message.toLowerCase();
    const toolsKeywords = [
      'heure', 'quelle heure', 'meteo', 'météo', 'temps qu', 'température',
      'fichier', 'lis le', 'lire', 'ouvre', 'crée', 'créer', 'liste les', 'lister', 'quels fichiers', 'trouve', 'trouver',
      'execute', 'exécute', 'commande', 'shell', 'dir ', 'ls ',
      'cherche', 'recherche', 'récupère', 'recupere', 'contenu de', 'web',
      'wikipedia', 'groq', 'cerebras', 'demande à', 'demande a',
      'agent', 'mémoire', 'memoire', 'rappelles', 'souviens', 'rappelle',
      'modifie', 'modifier', 'glob', 'grep', 'pose-moi', 'processus', 'pid', 'tâche', 'tache', 'notebook', 'planification',
      'arrête le', 'lance ', 'ajoute une tâche', 'en arrière-plan'
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

    const messageEmbedding`;

if (!c.includes(marker)) {
  console.log("Marker not found");
  process.exit(1);
}

c = c.replace(marker, replacement);
fs.writeFileSync(f, c, "utf8");
console.log("PATCH APPLIED SUCCESSFULLY");

