# GUIDE: Comment Ajouter un Outil à Ana

**Date**: 10 Décembre 2025
**Auteur**: Claude (pour Alain)

---

## RÉSUMÉ: 5 ÉTAPES OBLIGATOIRES

Pour qu'un outil fonctionne dans Ana, il faut le définir à **5 endroits**:

| # | Fichier | Section | Obligatoire |
|---|---------|---------|-------------|
| 1 | `tool-agent.cjs` | TOOL_DEFINITIONS | OUI |
| 2 | `tool-agent.cjs` | TOOL_IMPLEMENTATIONS | OUI |
| 3 | `tool-agent.cjs` | systemPrompt V1 - Règles | OUI |
| 4 | `tool-agent.cjs` | systemPrompt V1 - Exemples | RECOMMANDÉ |
| 5 | `ana-core.cjs` | toolsKeywords | OUI |

**IMPORTANT**: Les étapes 3-4 doivent être faites pour DEUX prompts (V1 et V2) dans tool-agent.cjs!

---

## ÉTAPE 1: Définition de l'outil (TOOL_DEFINITIONS)

**Fichier**: `E:/ANA/server/agents/tool-agent.cjs`
**Localisation**: Chercher `const TOOL_DEFINITIONS = [`

### Format:
```javascript
{
  type: 'function',
  function: {
    name: 'nom_de_loutil',           // snake_case, pas de caractères spéciaux
    description: 'Description claire de ce que fait l\'outil',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',            // string, number, boolean, array, object
          description: 'Description du paramètre'
        },
        param2: {
          type: 'number',
          description: 'Autre paramètre'
        }
      },
      required: ['param1']           // Liste des paramètres obligatoires
    }
  }
}
```

### Exemple concret (get_cpu_usage):
```javascript
{
  type: 'function',
  function: {
    name: 'get_cpu_usage',
    description: 'Retourne l\'utilisation actuelle du CPU en pourcentage',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}
```

---

## ÉTAPE 2: Implémentation de l'outil (TOOL_IMPLEMENTATIONS)

**Fichier**: `E:/ANA/server/agents/tool-agent.cjs`
**Localisation**: Chercher `const TOOL_IMPLEMENTATIONS = {`

### Format:
```javascript
async nom_de_loutil(args) {
  console.log(`🔧 [ToolAgent] nom_de_loutil appelé avec:`, args);
  try {
    // Ton code ici
    const result = /* ... */;
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Exemple concret (get_cpu_usage):
```javascript
async get_cpu_usage(args) {
  console.log(`💻 [ToolAgent] get_cpu_usage`);
  try {
    const os = require('os');
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const usage = 100 - (totalIdle / totalTick * 100);
    return {
      success: true,
      usage: usage.toFixed(1) + '%',
      cores: cpus.length,
      model: cpus[0].model
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## ÉTAPE 3: Règles dans le systemPrompt

**Fichier**: `E:/ANA/server/agents/tool-agent.cjs`
**Localisation**: Chercher `OUTILS SYSTÈME` ou `RÈGLES D'UTILISATION`

### ATTENTION: Il y a DEUX prompts!
- **V1**: Fonction `runToolAgent()` (~ligne 7023)
- **V2**: Fonction `runToolAgentV2()` (~ligne 7370)

**Tu DOIS ajouter la règle aux DEUX endroits!**

### Format:
```
- Mot-clé/description → nom_de_loutil
```

### Exemple:
```
- CPU/processeur → get_cpu_usage
- RAM/mémoire utilisée → get_memory_usage
```

### Astuce: Utiliser replace_all
Pour modifier les deux prompts en une seule commande avec Claude:
```
Edit avec replace_all=true sur le texte commun aux deux prompts
```

---

## ÉTAPE 4: Exemples JSON dans le systemPrompt

**Fichier**: `E:/ANA/server/agents/tool-agent.cjs`
**Localisation**: Chercher `EXEMPLES` ou `Ta reponse:`

### Format:
```
User: "question type de l'utilisateur" ou "variante"
Ta reponse: {"name": "nom_de_loutil", "arguments": {...}}
```

### Exemple:
```
User: "quel est l'usage du CPU" ou "utilisation processeur"
Ta reponse: {"name": "get_cpu_usage", "arguments": {}}
```

**IMPORTANT**: Ajouter aux DEUX prompts (V1 et V2)!

---

## ÉTAPE 5: Keywords de routing

**Fichier**: `E:/ANA/server/ana-core.cjs`
**Localisation**: Chercher `toolsKeywords = [`

### Pourquoi c'est nécessaire:
Sans keyword, la question de l'utilisateur est routée vers `FRENCH` (conversation) au lieu de `tools` (exécution).

### Format:
Ajouter les mots-clés qui déclencheront le routing vers tools:
```javascript
'cpu', 'processeur', 'ram', 'mémoire utilisée', ...
```

### Exemple pour get_cpu_usage:
```javascript
'cpu', 'processeur', 'utilisation cpu', 'usage cpu'
```

---

## VÉRIFICATION

### 1. Syntaxe JavaScript
```bash
node --check E:/ANA/server/agents/tool-agent.cjs
node --check E:/ANA/server/ana-core.cjs
```
(Aucune sortie = OK)

### 2. Compter les outils
```bash
grep -c "name: '" E:/ANA/server/agents/tool-agent.cjs
```

### 3. Script de vérification complet
```bash
node E:/ANA/temp/check_tools.js
```

---

## APRÈS MODIFICATION

**OBLIGATOIRE**: Redémarrer Ana pour charger les changements!

```bash
# Arrêter Ana (Ctrl+C dans le terminal)
# Relancer Ana
node E:/ANA/server/ana-core.cjs
# ou utiliser le raccourci bureau
```

---

## EXEMPLE COMPLET: Ajouter `get_battery_status`

### Étape 1 - Définition (tool-agent.cjs, dans TOOL_DEFINITIONS):
```javascript
{
  type: 'function',
  function: {
    name: 'get_battery_status',
    description: 'Retourne le niveau de batterie et l\'état de charge',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}
```

### Étape 2 - Implémentation (tool-agent.cjs, dans TOOL_IMPLEMENTATIONS):
```javascript
async get_battery_status(args) {
  console.log(`🔋 [ToolAgent] get_battery_status`);
  try {
    const { execSync } = require('child_process');
    // Windows: WMIC
    const output = execSync('WMIC PATH Win32_Battery Get EstimatedChargeRemaining,BatteryStatus /FORMAT:LIST', { encoding: 'utf8' });
    return { success: true, data: output.trim() };
  } catch (error) {
    return { success: false, error: 'Pas de batterie détectée ou erreur: ' + error.message };
  }
}
```

### Étape 3 - Règle (tool-agent.cjs, DEUX fois):
```
- Batterie/charge → get_battery_status
```

### Étape 4 - Exemple (tool-agent.cjs, DEUX fois):
```
User: "niveau de batterie" ou "état de la batterie"
Ta reponse: {"name": "get_battery_status", "arguments": {}}
```

### Étape 5 - Keyword (ana-core.cjs):
```javascript
'batterie', 'battery', 'charge', 'niveau batterie'
```

### Vérification:
```bash
node --check E:/ANA/server/agents/tool-agent.cjs
node --check E:/ANA/server/ana-core.cjs
```

### Redémarrer Ana et tester:
```
"Ana, quel est le niveau de batterie?"
```

---

## DÉPANNAGE

### "Je n'ai pas d'outil qui s'appelle X"
- Vérifier étape 1 (définition existe?)
- Vérifier étape 3 (règle dans prompt?)
- Redémarrer Ana

### "[insérer le résultat ici]" ou simulation
- Le routing ne fonctionne pas → vérifier étape 5 (keywords)
- L'exemple manque → vérifier étape 4
- Redémarrer Ana

### Erreur de syntaxe
- Vérifier les virgules entre les objets dans TOOL_DEFINITIONS
- Vérifier les accolades dans TOOL_IMPLEMENTATIONS
- Lancer `node --check` pour trouver l'erreur

### L'outil existe mais n'est pas appelé
- Le LLM ne comprend pas quand l'utiliser → ajouter plus d'exemples (étape 4)
- Ajouter des variantes dans les keywords (étape 5)

---

## FICHIERS CLÉS

| Fichier | Chemin | Rôle |
|---------|--------|------|
| tool-agent.cjs | E:/ANA/server/agents/ | Définitions + Implémentations + Prompts |
| ana-core.cjs | E:/ANA/server/ | Routing (keywords) |
| check_tools.js | E:/ANA/temp/ | Script de vérification |

---

## RÉSUMÉ VISUEL

```
Message utilisateur: "Quel est l'usage du CPU?"
         │
         ▼
┌─────────────────────────────────────────┐
│ ana-core.cjs: classifyTask()            │
│ Cherche 'cpu' dans toolsKeywords        │◄── ÉTAPE 5
│ → Route vers 'tools'                    │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ tool-agent.cjs: runToolAgentV2()        │
│ SystemPrompt contient:                  │
│   - Liste outils (TOOL_DEFINITIONS)     │◄── ÉTAPE 1
│   - Règles (CPU → get_cpu_usage)        │◄── ÉTAPE 3
│   - Exemples JSON                       │◄── ÉTAPE 4
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ LLM (qwen3:8b) retourne:                │
│ {"name": "get_cpu_usage", "arguments":{}│
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ tool-agent.cjs: TOOL_IMPLEMENTATIONS    │
│ Exécute get_cpu_usage()                 │◄── ÉTAPE 2
│ → Retourne {success: true, usage: "15%"}│
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Ana reformule en français québécois     │
│ → "Ton CPU est à 15% d'utilisation!"    │
└─────────────────────────────────────────┘
```

---

*Guide créé le 10 décembre 2025 après debug intensif des 181 outils d'Ana*
