# PLAN COMPLET: ANA CODE AGENT
**Date**: 28 Novembre 2025
**Statut**: En attente de validation

---

## 1. RÉSUMÉ DE LA RECHERCHE

### Sources Officielles Consultées
- [Ollama Structured Outputs](https://ollama.com/blog/structured-outputs) - Format JSON schema
- [Ollama Tool Calling](https://ollama.com/blog/streaming-tool) - Function calling
- [Red Hat: Tool Use with Node.js](https://developers.redhat.com/blog/2024/09/10/quick-look-tool-usefunction-calling-nodejs-and-ollama)
- [LlamaIndex ReAct Agent](https://datavizandai.github.io/2024/10/18/ollama-agent.html)

### Ce que j'ai appris

**Ollama supporte nativement le Tool Calling** (depuis v0.5):
- Définir les outils en JSON avec `type: 'function'`
- Réponse contient `response.message.tool_calls` si le LLM veut utiliser un outil
- Boucle récursive: appeler l'outil → retourner résultat → re-envoyer au LLM

---

## 2. ARCHITECTURE PROPOSÉE

### 2.1 Pattern: Tool Calling Natif Ollama

```
┌─────────────────────────────────────────────────────────────────┐
│                        ANA CODE AGENT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  UTILISATEUR → "Corrige le bug dans app.js"                     │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. ENVOI AU LLM (DeepSeek) avec liste des OUTILS         │   │
│  │    - read_file, write_file, edit_file                    │   │
│  │    - search_files, search_content                        │   │
│  │    - run_command, git_status, git_diff                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 2. LLM RÉPOND avec tool_calls:                           │   │
│  │    { tool: "read_file", args: { path: "app.js" } }       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 3. EXÉCUTER L'OUTIL (FileTools.read)                     │   │
│  │    → Retourne le contenu du fichier                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 4. RENVOYER LE RÉSULTAT AU LLM                           │   │
│  │    messages.push({ role: 'tool', content: résultat })    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 5. BOUCLE jusqu'à ce que LLM réponde sans tool_calls     │   │
│  │    → Réponse finale à l'utilisateur                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Définition des Outils (JSON)

```javascript
const CODING_TOOLS = [
  // Lecture de fichier
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lire le contenu d\'un fichier. Utiliser pour examiner le code existant.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du fichier' },
          offset: { type: 'number', description: 'Ligne de début (optionnel)' },
          limit: { type: 'number', description: 'Nombre de lignes (optionnel)' }
        },
        required: ['path']
      }
    }
  },

  // Écriture de fichier
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Créer ou remplacer un fichier entier. Crée un backup automatique.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du fichier' },
          content: { type: 'string', description: 'Contenu complet du fichier' }
        },
        required: ['path', 'content']
      }
    }
  },

  // Édition de fichier (search-replace)
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Modifier un fichier avec des opérations search-replace. Plus sûr que write_file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du fichier' },
          old_string: { type: 'string', description: 'Texte à remplacer' },
          new_string: { type: 'string', description: 'Nouveau texte' }
        },
        required: ['path', 'old_string', 'new_string']
      }
    }
  },

  // Recherche de fichiers
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Chercher des fichiers par pattern glob (ex: **/*.js)',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Pattern glob' },
          base_path: { type: 'string', description: 'Dossier de base' }
        },
        required: ['pattern']
      }
    }
  },

  // Recherche dans le contenu
  {
    type: 'function',
    function: {
      name: 'search_content',
      description: 'Chercher un texte dans les fichiers (comme grep)',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texte à chercher' },
          base_path: { type: 'string', description: 'Dossier de base' }
        },
        required: ['query']
      }
    }
  },

  // Exécuter une commande
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Exécuter une commande shell (npm, node, etc.)',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Commande à exécuter' },
          cwd: { type: 'string', description: 'Dossier de travail' }
        },
        required: ['command']
      }
    }
  },

  // Git status
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Voir l\'état Git du repository',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin du repo' }
        },
        required: ['repo_path']
      }
    }
  },

  // Git diff
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Voir les différences Git',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin du repo' },
          file: { type: 'string', description: 'Fichier spécifique (optionnel)' }
        },
        required: ['repo_path']
      }
    }
  }
];
```

### 2.3 Boucle d'Exécution (handleResponse)

```javascript
/**
 * Boucle principale de l'agent
 * Inspirée de: Red Hat Developer Blog
 */
async function handleToolCalls(messages, response, maxIterations = 10) {
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    // Ajouter la réponse du LLM aux messages
    messages.push(response.message);

    // Si pas de tool_calls, on a terminé
    if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
      return {
        success: true,
        response: response.message.content,
        iterations: iterations
      };
    }

    // Exécuter chaque outil demandé
    for (const toolCall of response.message.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = toolCall.function.arguments;

      console.log(`🔧 [CodingAgent] Outil: ${toolName}`, toolArgs);

      // Exécuter l'outil
      const toolResult = await executeToolCall(toolName, toolArgs);

      // Ajouter le résultat aux messages
      messages.push({
        role: 'tool',
        content: JSON.stringify(toolResult),
        tool_call_id: toolCall.id
      });
    }

    // Renvoyer au LLM avec les résultats des outils
    response = await ollama.chat({
      model: 'deepseek-coder-v2:16b-lite-instruct-q4_K_M',
      messages: messages,
      tools: CODING_TOOLS
    });
  }

  return {
    success: false,
    error: 'Max iterations reached',
    iterations: iterations
  };
}

/**
 * Exécuter un appel d'outil
 */
async function executeToolCall(toolName, args) {
  const toolMap = {
    'read_file': async (a) => FileTools.read(a.path, { offset: a.offset, limit: a.limit }),
    'write_file': async (a) => FileTools.write(a.path, a.content),
    'edit_file': async (a) => FileTools.edit(a.path, [{ search: a.old_string, replace: a.new_string }]),
    'search_files': async (a) => SearchTools.glob(a.pattern, { basePath: a.base_path }),
    'search_content': async (a) => SearchTools.combined(a.query, { basePath: a.base_path }),
    'run_command': async (a) => BashTools.execute(a.command, { cwd: a.cwd }),
    'git_status': async (a) => GitTools.status(a.repo_path),
    'git_diff': async (a) => GitTools.diff(a.repo_path, { file: a.file })
  };

  const executor = toolMap[toolName];
  if (!executor) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  try {
    return await executor(args);
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## 3. FICHIERS À CRÉER/MODIFIER

### 3.1 Nouveau Fichier: `E:/ANA/server/agents/coding-agent.cjs`

**Contenu**: ~200 lignes
- Classe `CodingAgent`
- Définition des outils (CODING_TOOLS)
- Méthode `run(task, context)`
- Boucle `handleToolCalls()`
- Fonction `executeToolCall()`

### 3.2 Modification: `E:/ANA/server/ana-core.cjs`

**Ajouts** (~30 lignes):
```javascript
// Importer l'agent
const CodingAgent = require('./agents/coding-agent.cjs');

// Endpoint API
app.post('/api/agent/code/run', async (req, res) => {
  const { task, context } = req.body;
  const result = await CodingAgent.run(task, context);
  res.json(result);
});

// WebSocket event
socket.on('agent:code:run', async (data, callback) => {
  const result = await CodingAgent.run(data.task, data.context);
  callback(result);
});
```

### 3.3 Modification: `E:/ANA/ana-interface/src/pages/CodingPage.jsx`

**Ajouts** (~50 lignes):
- Bouton "Demander à Ana Code"
- Affichage des étapes en cours
- Affichage du résultat

---

## 4. SÉCURITÉ

### Mesures Existantes (déjà en place)
- ✅ `Security.isPathAllowed()` - Whitelist de chemins
- ✅ `Security.isCommandAllowed()` - Whitelist de commandes
- ✅ `Security.createBackup()` - Backup avant modification
- ✅ Timeout sur les commandes (120s max)

### Mesures Additionnelles à Implémenter
- ⚠️ Max 10 itérations par requête
- ⚠️ Confirmation utilisateur avant write/edit (optionnel)
- ⚠️ Log de toutes les actions

---

## 5. PLAN D'IMPLÉMENTATION ÉTAPE PAR ÉTAPE

### Étape 1: Créer coding-agent.cjs (ISOLÉ)
- Créer le fichier dans `E:/ANA/server/agents/`
- Ne touche à aucun fichier existant
- Peut être testé indépendamment

### Étape 2: Test Isolé
- Créer un script de test `test-coding-agent.cjs`
- Tester avec une tâche simple (lire un fichier)
- Vérifier que ça fonctionne avant intégration

### Étape 3: Intégrer dans ana-core.cjs
- Ajouter require + endpoints
- Modification minimale et ciblée

### Étape 4: Améliorer CodingPage.jsx
- Ajouter UI pour l'agent
- Bouton + affichage résultats

---

## 6. RISQUES ET MITIGATIONS

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Boucle infinie | Moyenne | Max 10 itérations |
| Modification destructive | Faible | Backup auto + whitelist |
| Timeout LLM | Moyenne | Timeout 120s + message erreur |
| Syntaxe cassée | Faible | Validation JSON avant exécution |

---

## 7. VALIDATION REQUISE

Avant d'implémenter, je demande validation sur:

1. **Architecture**: Le pattern tool-calling natif Ollama est-il acceptable?
2. **Outils**: La liste des 8 outils est-elle suffisante?
3. **Sécurité**: Les mesures sont-elles suffisantes?
4. **Ordre**: Commencer par coding-agent.cjs isolé?

---

## 8. QUESTIONS OUVERTES

1. Faut-il demander confirmation avant chaque modification de fichier?
2. Faut-il limiter à certains dossiers (ex: E:/ANA seulement)?
3. Faut-il un mode "dry-run" qui montre ce qui serait fait sans exécuter?

---

**En attente de ta validation, Alain.**

*Document généré le 28 Novembre 2025*
