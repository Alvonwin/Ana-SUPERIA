/**
 * Tool Agent - Agent avec Tool Calling pour Ana
 *
 * Permet à Ana (Ollama) d'appeler des outils (web, fichiers, shell, météo, etc.)
 * via une boucle ReAct: LLM → Tool → LLM → ... → Réponse finale
 *
 * Créé: 2 Décembre 2025
 * Source: Perplexity recommendation
 */

const axios = require('axios');
const WebTools = require('../tools/web-tools.cjs');
const FileTools = require('../tools/file-tools.cjs');
const BashTools = require('../tools/bash-tools.cjs');

const OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen2.5-coder:7b';

/**
 * FIX 2025-12-03: Extraction robuste de JSON tool calls
 * L'ancienne regex ne gérait pas les objets vides {} dans arguments
 * Cette méthode compte les parenthèses pour trouver les blocs JSON valides
 */
function findToolCallJSON(content) {
  const results = [];
  let startIdx = 0;

  // Trouver toutes les positions de '{' et essayer de parser
  while ((startIdx = content.indexOf('{', startIdx)) !== -1) {
    // Trouver le '}' correspondant en comptant la profondeur
    let depth = 0;
    let endIdx = startIdx;

    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }

    if (depth === 0 && endIdx > startIdx) {
      const candidate = content.substring(startIdx, endIdx + 1);
      try {
        const parsed = JSON.parse(candidate);
        // Vérifier que c'est un tool call valide
        if (parsed.name && typeof parsed.arguments !== 'undefined') {
          results.push(candidate);
        }
      } catch (e) {
        // Pas du JSON valide, continuer
      }
    }
    startIdx++;
  }

  return results;
}

// 1) Définition des outils côté LLM (schémas JSON)
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Recherche d\'information générale sur le web (DuckDuckGo).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Requête de recherche en texte libre.' },
          limit: { type: 'integer', description: 'Nombre max de résultats', default: 5 }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Obtenir la météo actuelle pour une ville donnée.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Ville ou lieu, ex: "Longueuil".' },
          lang: { type: 'string', description: 'Langue de la réponse météo', default: 'fr' }
        },
        required: ['location']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: 'Obtenir l\'heure et la date actuelles du système.',
      parameters: {
        type: 'object',
        properties: {
          timezone: { type: 'string', description: 'Fuseau horaire (ex: "America/Montreal")', default: 'America/Montreal' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lire un fichier texte sur le disque.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du fichier.' },
          limit: { type: 'integer', description: 'Longueur max du contenu retourné', default: 4000 }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Écrire du contenu dans un fichier.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du fichier.' },
          content: { type: 'string', description: 'Contenu à écrire.' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Lister les fichiers d\'un répertoire.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du répertoire.' },
          recursive: { type: 'boolean', description: 'Inclure sous-dossiers', default: false }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_shell',
      description: 'Exécuter une commande shell.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Commande shell à exécuter.' },
          timeout: { type: 'integer', description: 'Timeout en ms', default: 10000 }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Récupérer le contenu d\'une page web.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL de la page à récupérer.' },
          selector: { type: 'string', description: 'Sélecteur CSS optionnel pour extraire une partie.' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'wikipedia',
      description: 'Rechercher sur Wikipedia FR.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Terme à rechercher.' }
        },
        required: ['query']
      }
    }
  },
  // === CLOUD LLM TOOLS ===
  {
    type: 'function',
    function: {
      name: 'ask_groq',
      description: 'Poser une question complexe à Groq (ultra-rapide, Llama 70B). Pour raisonnement avancé, recherches, analyses.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Question à poser à Groq.' },
          model: { type: 'string', enum: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'], description: 'Modèle Groq', default: 'llama-3.1-70b-versatile' }
        },
        required: ['question']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ask_cerebras',
      description: 'Poser une question à Cerebras (le plus rapide du monde, ~1000 tok/s). Pour tâches critiques, coding, math.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Question à poser à Cerebras.' },
          model: { type: 'string', enum: ['llama3.1-8b', 'llama3.1-70b'], description: 'Modèle Cerebras', default: 'llama3.1-8b' }
        },
        required: ['question']
      }
    }
  },
  // === MEMORY SEARCH TOOL ===
  {
    type: 'function',
    function: {
      name: 'search_memory',
      description: 'Rechercher dans ma mémoire des conversations passées avec Alain. Utiliser quand Alain demande "tu te rappelles?", "on avait parlé de...", "cherche dans ta mémoire".',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Ce que je cherche dans ma mémoire (mots-clés, sujet, nom).' },
          limit: { type: 'integer', description: 'Nombre max de résultats', default: 5 }
        },
        required: ['query']
      }
    }
  },
  // === EDIT FILE TOOL ===
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Modifier un fichier en remplaçant une chaîne par une autre sans réécrire tout le fichier.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Chemin absolu du fichier à modifier' },
          old_string: { type: 'string', description: 'Texte exact à remplacer' },
          new_string: { type: 'string', description: 'Nouveau texte' },
          replace_all: { type: 'boolean', description: 'Remplacer toutes les occurrences', default: false }
        },
        required: ['file_path', 'old_string', 'new_string']
      }
    }
  },
  // === GLOB TOOL ===
  {
    type: 'function',
    function: {
      name: 'glob',
      description: 'Trouver des fichiers par pattern (ex: *.js, **/*.ts, src/**/*.cjs)',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Pattern glob (ex: **/*.js)' },
          path: { type: 'string', description: 'Dossier de recherche (défaut: E:/ANA)', default: 'E:/ANA' }
        },
        required: ['pattern']
      }
    }
  },
  // === GREP TOOL ===
  {
    type: 'function',
    function: {
      name: 'grep',
      description: 'Chercher du texte ou regex dans les fichiers',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Texte ou regex à chercher' },
          path: { type: 'string', description: 'Fichier ou dossier où chercher', default: 'E:/ANA' },
          glob: { type: 'string', description: 'Filtrer par pattern de fichiers (ex: *.js)' },
          ignore_case: { type: 'boolean', description: 'Ignorer la casse', default: false }
        },
        required: ['pattern']
      }
    }
  },
  // === ASK USER TOOL ===
  {
    type: 'function',
    function: {
      name: 'ask_user',
      description: 'Poser une question à Alain et attendre sa réponse',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'La question à poser à Alain' },
          options: { type: 'array', items: { type: 'string' }, description: 'Options de réponse (optionnel)' }
        },
        required: ['question']
      }
    }
  },
  // === RUN BACKGROUND TOOL ===
  {
    type: 'function',
    function: {
      name: 'run_background',
      description: 'Exécuter une commande en arrière-plan (pour tâches longues)',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Commande à exécuter' },
          working_dir: { type: 'string', description: 'Dossier de travail', default: 'E:/ANA' }
        },
        required: ['command']
      }
    }
  },
  // === KILL PROCESS TOOL ===
  {
    type: 'function',
    function: {
      name: 'kill_process',
      description: 'Arrêter un processus par son PID ou nom',
      parameters: {
        type: 'object',
        properties: {
          pid: { type: 'integer', description: 'PID du processus' },
          name: { type: 'string', description: 'Nom du processus (ex: node.exe)' }
        }
      }
    }
  },
  // === TODO WRITE TOOL ===
  {
    type: 'function',
    function: {
      name: 'todo_write',
      description: 'Gérer ma liste de tâches persistante',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'complete', 'list', 'clear'], description: 'Action à effectuer' },
          task: { type: 'string', description: 'Description de la tâche (pour add)' },
          task_id: { type: 'integer', description: 'ID de la tâche (pour complete)' }
        },
        required: ['action']
      }
    }
  },
  // === NOTEBOOK EDIT TOOL ===
  {
    type: 'function',
    function: {
      name: 'notebook_edit',
      description: 'Éditer un notebook Jupyter (.ipynb)',
      parameters: {
        type: 'object',
        properties: {
          notebook_path: { type: 'string', description: 'Chemin du notebook' },
          cell_index: { type: 'integer', description: 'Index de la cellule (0-based)' },
          new_source: { type: 'string', description: 'Nouveau contenu de la cellule' },
          action: { type: 'string', enum: ['replace', 'insert', 'delete'], default: 'replace' }
        },
        required: ['notebook_path', 'cell_index']
      }
    }
  },
  // === PLAN MODE TOOL ===
  {
    type: 'function',
    function: {
      name: 'plan_mode',
      description: 'Entrer en mode planification pour tâches complexes',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['enter', 'exit'], description: 'Entrer ou sortir du mode plan' },
          plan_file: { type: 'string', description: 'Fichier où sauvegarder le plan' }
        },
        required: ['action']
      }
    }
  },
  // === LAUNCH AGENT TOOL ===
  {
    type: 'function',
    function: {
      name: 'launch_agent',
      description: 'Lancer un sous-agent spécialisé pour une tâche',
      parameters: {
        type: 'object',
        properties: {
          agent_type: { type: 'string', enum: ['research', 'code', 'explore', 'plan'], description: 'Type d\'agent' },
          task: { type: 'string', description: 'Tâche à accomplir' },
          context: { type: 'string', description: 'Contexte additionnel' }
        },
        required: ['agent_type', 'task']
      }
    }
  }
];

// 2) Mapping des outils → fonctions Node réelles
const TOOL_IMPLEMENTATIONS = {
  async web_search(args) {
    const { query, limit } = args;
    console.log(`🔧 [ToolAgent] web_search: "${query}"`);
    const result = await WebTools.search(query, { limit: limit || 5 });
    return result;
  },

  async get_weather(args) {
    const { location, lang } = args;
    console.log(`🔧 [ToolAgent] get_weather: "${location}"`);
    const result = await WebTools.weather(location, { lang: lang || 'fr' });
    return result;
  },

  async get_time(args) {
    const { timezone } = args;
    console.log(`🔧 [ToolAgent] get_time`);
    const now = new Date();
    const options = {
      timeZone: timezone || 'America/Montreal',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    return {
      success: true,
      datetime: now.toLocaleString('fr-CA', options),
      iso: now.toISOString(),
      timestamp: now.getTime(),
      timezone: timezone || 'America/Montreal'
    };
  },

  async read_file(args) {
    const { path, limit } = args;
    console.log(`🔧 [ToolAgent] read_file: "${path}"`);
    const res = await FileTools.read(path, { encoding: 'utf-8', limit: limit || 4000 });
    return {
      success: res.success,
      path: res.path,
      content: res.content,
      error: res.error
    };
  },

  async write_file(args) {
    const { path, content } = args;
    console.log(`🔧 [ToolAgent] write_file: "${path}"`);
    const res = await FileTools.write(path, content, { backup: true });
    return res;
  },

  async list_files(args) {
    const { path, recursive } = args;
    console.log(`🔧 [ToolAgent] list_files: "${path}"`);
    const res = await FileTools.list(path, { recursive: recursive || false, details: true });
    return res;
  },

  async run_shell(args) {
    const { command, timeout } = args;
    console.log(`🔧 [ToolAgent] run_shell: "${command}"`);
    const res = await BashTools.execute(command, { timeout: timeout || 10000 });
    return res;
  },

  async web_fetch(args) {
    const { url, selector } = args;
    console.log(`🔧 [ToolAgent] web_fetch: "${url}"`);
    const res = await WebTools.fetch(url, { selector });
    return res;
  },

  async wikipedia(args) {
    const { query } = args;
    console.log(`🔧 [ToolAgent] wikipedia: "${query}"`);
    const res = await WebTools.wikipedia(query);
    return res;
  },

  // === CLOUD LLM IMPLEMENTATIONS ===
  async ask_groq(args) {
    const { question, prompt, model = 'llama-3.3-70b-versatile' } = args;
    const q = question || prompt || '';
    if (!q) {
      return { success: false, error: 'Paramètre question ou prompt requis', provider: 'groq' };
    }
    console.log(`🔧 [ToolAgent] ask_groq: "${q.substring(0, 50)}..."`);
    const groqService = require('../services/groq-service.cjs');
    const result = await groqService.chat(q, { model });
    return {
      success: result.success,
      provider: 'groq',
      model,
      answer: result.response || result.error,
      tokens: result.usage?.total_tokens || 0,
      latencyMs: result.latencyMs
    };
  },

  async ask_cerebras(args) {
    const { question, prompt, model = 'llama3.1-8b' } = args;
    const q = question || prompt || '';
    if (!q) {
      return { success: false, error: 'Paramètre question ou prompt requis', provider: 'cerebras' };
    }
    console.log(`🔧 [ToolAgent] ask_cerebras: "${q.substring(0, 50)}..."`);
    const cerebrasService = require('../services/cerebras-service.cjs');
    const result = await cerebrasService.chat(q, { model });
    return {
      success: result.success,
      provider: 'cerebras',
      model,
      answer: result.response || result.error,
      tokens: result.usage?.total_tokens || 0,
      latencyMs: result.latencyMs
    };
  },

  // === MEMORY SEARCH IMPLEMENTATION ===
  async search_memory(args) {
    const { query, limit = 5 } = args;
    console.log(`🧠 [ToolAgent] search_memory: "${query}"`);

    const fs = require('fs');
    const path = require('path');
    const results = [];

    // 1. Recherche dans le fichier de conversation Ana (texte simple)
    const conversationPath = 'E:/ANA/memory/current_conversation_ana.txt';
    if (fs.existsSync(conversationPath)) {
      try {
        const content = fs.readFileSync(conversationPath, 'utf-8');
        const lines = content.split('\n');
        const queryLower = query.toLowerCase();
        const matches = [];

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(queryLower)) {
            // Inclure contexte (2 lignes avant/après)
            const start = Math.max(0, i - 2);
            const end = Math.min(lines.length, i + 3);
            const context = lines.slice(start, end).join('\n');
            matches.push({
              lineNumber: i + 1,
              context: context.substring(0, 400)
            });
            if (matches.length >= limit) break;
          }
        }

        if (matches.length > 0) {
          results.push({
            source: 'ana_conversation_file',
            matchCount: matches.length,
            matches: matches
          });
        }
      } catch (err) {
        console.log(`⚠️ [search_memory] Text search error: ${err.message}`);
      }
    }

    // 2. Recherche dans TieredMemory (ChromaDB sémantique) si disponible
    try {
      const TieredMemory = require('../memory/tiered-memory.cjs');
      if (TieredMemory && TieredMemory.initialized) {
        const semanticResults = await TieredMemory.search(query, { limit });
        if (semanticResults && semanticResults.length > 0) {
          results.push({
            source: 'chromadb_semantic',
            matchCount: semanticResults.length,
            matches: semanticResults.map(r => ({
              document: r.document?.substring(0, 400),
              tier: r.tier,
              distance: r.distance
            }))
          });
        }
      }
    } catch (err) {
      // TieredMemory pas dispo, continuer sans
      console.log(`⚠️ [search_memory] ChromaDB skipped: ${err.message}`);
    }

    // 3. Résultat formaté pour Ana
    const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);

    return {
      success: true,
      query: query,
      found: totalMatches > 0,
      totalMatches: totalMatches,
      sources: results,
      message: totalMatches > 0
        ? `J'ai trouvé ${totalMatches} souvenir(s) correspondant à "${query}".`
        : `Je n'ai rien trouvé pour "${query}" dans ma mémoire.`
    };
  },

  // === 10 NEW TOOL IMPLEMENTATIONS ===

  async edit_file(args) {
    const { file_path, old_string, new_string, replace_all = false } = args;
    console.log(`🔧 [ToolAgent] edit_file: "${file_path}"`);
    const fs = require('fs');
    try {
      if (!fs.existsSync(file_path)) {
        return { success: false, error: `Fichier non trouvé: ${file_path}` };
      }
      const content = fs.readFileSync(file_path, 'utf-8');
      if (!content.includes(old_string)) {
        return { success: false, error: 'Chaîne à remplacer non trouvée dans le fichier' };
      }
      const newContent = replace_all
        ? content.split(old_string).join(new_string)
        : content.replace(old_string, new_string);
      fs.writeFileSync(file_path, newContent, 'utf-8');
      return { success: true, message: 'Fichier modifié avec succès' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async glob(args) {
    const { pattern, path: searchPath = 'E:/ANA' } = args;
    console.log(`🔧 [ToolAgent] glob: "${pattern}" in "${searchPath}"`);
    const fs = require('fs');
    const pathModule = require('path');

    function globToRegex(glob) {
      let escaped = glob.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
      return new RegExp(escaped, 'i');
    }

    function walkDir(dir, regex, results, depth) {
      if (depth > 10 || results.length >= 50) return;
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (results.length >= 50) break;
          const fullPath = pathModule.join(dir, item.name);
          if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
            walkDir(fullPath, regex, results, depth + 1);
          } else if (item.isFile() && regex.test(item.name)) {
            results.push(fullPath.replace(/\\/g, '/'));
          }
        }
      } catch (e) { /* ignore permission errors */ }
    }

    try {
      const normalizedPath = searchPath.replace(/\\/g, '/');
      if (!fs.existsSync(normalizedPath)) {
        return { success: false, error: 'Dossier non trouvé: ' + normalizedPath, files: [] };
      }
      const regex = globToRegex(pattern);
      const files = [];
      walkDir(normalizedPath, regex, files, 0);
      return { success: true, files, count: files.length, pattern, searchPath: normalizedPath };
    } catch (err) {
      return { success: false, error: err.message, files: [] };
    }
  },

  async grep(args) {
    const { pattern, path: searchPath = 'E:/ANA', glob: fileGlob, ignore_case = false } = args;
    console.log(`🔧 [ToolAgent] grep: "${pattern}" in "${searchPath}"`);
    const fs = require('fs');
    const pathModule = require('path');
    const matches = [];

    const regex = new RegExp(pattern, ignore_case ? 'gi' : 'g');
    const fileRegex = fileGlob ? new RegExp(fileGlob.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i') : null;

    function searchFile(filePath) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (regex.test(line)) {
            matches.push(filePath.replace(/\\/g, '/') + ':' + (idx + 1) + ':' + line.substring(0, 200));
          }
        });
      } catch (e) { /* ignore binary/permission errors */ }
    }

    function walkDir(dir, depth) {
      if (depth > 10 || matches.length >= 30) return;
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (matches.length >= 30) break;
          const fullPath = pathModule.join(dir, item.name);
          if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
            walkDir(fullPath, depth + 1);
          } else if (item.isFile()) {
            if (!fileRegex || fileRegex.test(item.name)) {
              searchFile(fullPath);
            }
          }
        }
      } catch (e) { /* ignore permission errors */ }
    }

    try {
      const normalizedPath = searchPath.replace(/\\/g, '/');
      const stat = fs.statSync(normalizedPath);
      if (stat.isFile()) {
        searchFile(normalizedPath);
      } else {
        walkDir(normalizedPath, 0);
      }
      return { success: true, matches, count: matches.length };
    } catch (err) {
      return { success: false, error: err.message, matches: [] };
    }
  },

  async ask_user(args) {
    const { question, options } = args;
    console.log(`🔧 [ToolAgent] ask_user: "${question}"`);
    // Pour l'instant, retourne une indication qu'Ana attend une réponse
    // L'intégration réelle avec l'interface viendra plus tard
    return {
      success: true,
      waiting: true,
      question: question,
      options: options || [],
      message: `J'attends la réponse d'Alain à: "${question}"`
    };
  },

  async run_background(args) {
    const { command, working_dir = 'E:/ANA' } = args;
    console.log(`🔧 [ToolAgent] run_background: "${command}"`);
    const { spawn } = require('child_process');
    try {
      const child = spawn(command, [], {
        shell: true,
        cwd: working_dir,
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      return { success: true, pid: child.pid, message: `Commande lancée en arrière-plan (PID: ${child.pid})` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async kill_process(args) {
    const { pid, name } = args;
    console.log(`🔧 [ToolAgent] kill_process: PID=${pid}, name=${name}`);
    const { execSync } = require('child_process');
    try {
      if (pid) {
        execSync(`taskkill /PID ${pid} /F`, { encoding: 'utf-8' });
        return { success: true, message: `Processus ${pid} arrêté` };
      } else if (name) {
        execSync(`taskkill /IM ${name} /F`, { encoding: 'utf-8' });
        return { success: true, message: `Processus ${name} arrêté` };
      }
      return { success: false, error: 'PID ou nom requis' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async todo_write(args) {
    const { action, task, task_id, todos } = args;

    // Support du format todos array (comme Claude Code)
    if (todos && Array.isArray(todos)) {
      console.log(`🔧 [ToolAgent] todo_write: mise à jour de ${todos.length} tâches`);
      const fs = require('fs');
      const todoPath = 'E:/ANA/memory/ana_todos.json';
      const formattedTodos = todos.map((t, i) => ({
        id: Date.now() + i,
        task: t.content || t.task || t.description || 'Sans titre',
        status: t.status || 'pending',
        activeForm: t.activeForm || '',
        created: new Date().toISOString()
      }));
      fs.writeFileSync(todoPath, JSON.stringify(formattedTodos, null, 2));
      return { success: true, message: `${todos.length} tâches enregistrées`, todos: formattedTodos };
    }

    console.log(`🔧 [ToolAgent] todo_write: ${action}`);
    const fs = require('fs');
    const todoPath = 'E:/ANA/memory/ana_todos.json';

    try {
      let todos = [];
      if (fs.existsSync(todoPath)) {
        todos = JSON.parse(fs.readFileSync(todoPath, 'utf-8'));
      }

      switch (action) {
        case 'add':
          todos.push({ id: Date.now(), task, status: 'pending', created: new Date().toISOString() });
          fs.writeFileSync(todoPath, JSON.stringify(todos, null, 2));
          return { success: true, message: `Tâche ajoutée: "${task}"`, todos };
        case 'complete':
          const todo = todos.find(t => t.id === task_id);
          if (todo) {
            todo.status = 'completed';
            todo.completed = new Date().toISOString();
            fs.writeFileSync(todoPath, JSON.stringify(todos, null, 2));
            return { success: true, message: `Tâche ${task_id} complétée`, todos };
          }
          return { success: false, error: `Tâche ${task_id} non trouvée` };
        case 'list':
          return { success: true, todos };
        case 'clear':
          fs.writeFileSync(todoPath, '[]');
          return { success: true, message: 'Liste de tâches vidée' };
        default:
          return { success: false, error: `Action inconnue: ${action}` };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async notebook_edit(args) {
    const { notebook_path, cell_index, new_source, action = 'replace' } = args;
    console.log(`🔧 [ToolAgent] notebook_edit: "${notebook_path}" cell ${cell_index}`);
    const fs = require('fs');
    try {
      if (!fs.existsSync(notebook_path)) {
        return { success: false, error: `Notebook non trouvé: ${notebook_path}` };
      }
      const notebook = JSON.parse(fs.readFileSync(notebook_path, 'utf-8'));

      if (action === 'replace' && notebook.cells[cell_index]) {
        notebook.cells[cell_index].source = new_source.split('\n');
      } else if (action === 'insert') {
        notebook.cells.splice(cell_index, 0, {
          cell_type: 'code',
          source: new_source.split('\n'),
          metadata: {},
          outputs: []
        });
      } else if (action === 'delete' && notebook.cells[cell_index]) {
        notebook.cells.splice(cell_index, 1);
      }

      fs.writeFileSync(notebook_path, JSON.stringify(notebook, null, 2));
      return { success: true, message: `Notebook modifié (${action} cell ${cell_index})` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async plan_mode(args) {
    const { action, plan_file } = args;
    console.log(`🔧 [ToolAgent] plan_mode: ${action}`);
    const fs = require('fs');
    const defaultPlanFile = 'E:/ANA/memory/current_plan.md';
    const filePath = plan_file || defaultPlanFile;

    if (action === 'enter') {
      return {
        success: true,
        mode: 'planning',
        plan_file: filePath,
        message: 'Mode planification activé. Je vais explorer et planifier avant d\'agir.'
      };
    } else if (action === 'exit') {
      return {
        success: true,
        mode: 'execution',
        message: 'Mode planification terminé. Prêt à exécuter.'
      };
    }
    return { success: false, error: `Action inconnue: ${action}` };
  },

  async launch_agent(args) {
    const { agent_type, task, context } = args;
    console.log(`🔧 [ToolAgent] launch_agent: ${agent_type} - "${task}"`);
    // Simulation - l'intégration réelle viendra plus tard
    return {
      success: true,
      agent_type,
      task,
      context,
      status: 'launched',
      message: `Agent ${agent_type} lancé pour: "${task}"`
    };
  }
};

// 3) Boucle agent (multi-turn tools)
async function runToolAgent(userMessage, options = {}) {
  const maxLoops = options.maxLoops || 10;
  const model = options.model || DEFAULT_MODEL;
  let loopCount = 0;

  // System prompt optimisé pour forcer le format JSON des tool calls
  const toolNames = TOOL_DEFINITIONS.map(t => t.function.name).join(', ');
  const systemPrompt = options.systemPrompt ||
    `Tu es Ana, l'assistante IA personnelle d'Alain à Longueuil, Québec.
LANGUE: Tu réponds TOUJOURS en français québécois. JAMAIS en anglais.

Outils disponibles: 
RÈGLES CRITIQUES:
1. Pour appeler un outil, réponds EXACTEMENT avec ce format JSON, RIEN D'AUTRE:
{"name": "nom_outil", "arguments": {...}}

2. AUCUN texte avant ou après le JSON quand tu appelles un outil.
3. Après avoir reçu le résultat de l'outil, RÉPONDS TOUJOURS EN FRANÇAIS.
4. Utilise les outils quand c'est nécessaire (heure, météo, fichiers, web).
5. IMPORTANT: Même si les données sont en anglais, traduis ta réponse en français.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  console.log(`🤖 [ToolAgent] Démarrage - Message: "${userMessage.substring(0, 50)}..."`);

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`🔄 [ToolAgent] Boucle ${loopCount}/${maxLoops}`);

    try {
      const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
        model: model,
        messages: messages,
        tools: TOOL_DEFINITIONS,
        stream: false
      });

      const msg = response.data.message || response.data;
      let toolCalls = msg.tool_calls || [];

      // FIX: Parser JSON brut dans content si pas de tool_calls structurés
      // Bug connu Ollama: Qwen2.5-coder retourne {"name":..., "arguments":...} dans content
      // au lieu de msg.tool_calls structurés.
      if ((!toolCalls || toolCalls.length === 0) && msg.content) {
        const content = msg.content.trim();
        console.log(`🔍 [ToolAgent] Parsing content: "${content.substring(0, 100)}..."`);

        // FIX 2025-12-03: Utiliser la nouvelle méthode avec comptage de parenthèses
        // L'ancienne regex ne gérait pas les objets vides {} dans "arguments"
        const jsonBlocks = findToolCallJSON(content);

        for (const block of jsonBlocks) {
          try {
            const parsed = JSON.parse(block);
            // Vérifier structure valide tool call (arguments peut être {})
            if (parsed.name && typeof parsed.arguments !== 'undefined' && TOOL_IMPLEMENTATIONS[parsed.name]) {
              toolCalls.push({
                function: {
                  name: parsed.name,
                  arguments: parsed.arguments || parsed.args || {}
                }
              });
              console.log(`✅ [ToolAgent] Parsed tool: ${parsed.name}`);
            }
          } catch (e) {
            console.log(`⚠️ [ToolAgent] Invalid JSON block: ${block.substring(0, 100)}...`);
          }
        }

        if (toolCalls.length > 0) {
          console.log(`🔧 [ToolAgent] Found ${toolCalls.length} tool calls:`, toolCalls.map(tc => tc.function.name));
        }

        // Fallback: regex pour <tool_call>JSON</tool_call>
        if (toolCalls.length === 0) {
          const jsonMatch = content.match(/<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/i);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              if (parsed.name && TOOL_IMPLEMENTATIONS[parsed.name]) {
                console.log(`✅ [ToolAgent] XML tag parsé: ${parsed.name}`);
                toolCalls = [{
                  function: {
                    name: parsed.name,
                    arguments: parsed.arguments || {}
                  }
                }];
              }
            } catch (e) {
              console.log(`⚠️ [ToolAgent] XML parse failed: ${e.message}`);
            }
          }
        }
      }

      // Aucun tool_call → réponse finale
      if (!toolCalls || toolCalls.length === 0) {
        const finalAnswer = msg.content || '';
        console.log(`✅ [ToolAgent] Réponse finale (${finalAnswer.length} chars)`);

        messages.push({
          role: 'assistant',
          content: finalAnswer
        });

        return {
          success: true,
          answer: finalAnswer,
          messages: messages,
          loopsUsed: loopCount,
          model: model
        };
      }

      // Il y a des tool_calls → on les exécute
      console.log(`🔧 [ToolAgent] ${toolCalls.length} tool(s) à exécuter`);

      for (const tc of toolCalls) {
        const toolName = tc.function?.name;
        const rawArgs = tc.function?.arguments || {};
        let parsedArgs = rawArgs;

        if (typeof rawArgs === 'string') {
          try {
            parsedArgs = JSON.parse(rawArgs);
          } catch {
            parsedArgs = {};
          }
        }

        const impl = TOOL_IMPLEMENTATIONS[toolName];
        if (!impl) {
          console.warn(`⚠️ [ToolAgent] Outil inconnu: ${toolName}`);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id || toolName,
            content: JSON.stringify({
              error: `Outil "${toolName}" non implémenté.`
            })
          });
          continue;
        }

        try {
          const result = await impl(parsedArgs);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id || toolName,
            content: JSON.stringify(result)
          });
          console.log(`✅ [ToolAgent] ${toolName} exécuté avec succès`);
        } catch (err) {
          console.error(`❌ [ToolAgent] Erreur ${toolName}:`, err.message);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id || toolName,
            content: JSON.stringify({
              error: err.message || 'Erreur pendant l\'exécution'
            })
          });
        }
      }

    } catch (error) {
      console.error(`❌ [ToolAgent] Erreur Ollama:`, error.message);
      return {
        success: false,
        error: error.message,
        messages: messages,
        loopsUsed: loopCount
      };
    }
  }

  // Max loops atteint
  console.warn(`⚠️ [ToolAgent] Max loops (${maxLoops}) atteint`);
  return {
    success: false,
    error: `Nombre maximum de boucles (${maxLoops}) atteint sans réponse finale.`,
    messages: messages,
    loopsUsed: loopCount
  };
}

// Export
module.exports = {
  runToolAgent,
  TOOL_DEFINITIONS,
  TOOL_IMPLEMENTATIONS
};
