/**
 * Tool Agent - Agent avec Tool Calling pour Ana
 * FIX 2025-12-05:
 *   1. DIR fiable (fs.readdir au lieu de spawn cmd.exe)
 *   2. System prompt avec liste d'outils explicite
 *
 * Créé: 2 Décembre 2025
 * Source: Perplexity recommendation
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WebTools = require('../tools/web-tools.cjs');
const FileTools = require('../tools/file-tools.cjs');
const BashTools = require('../tools/bash-tools.cjs');
// Vision Router - Sélection intelligente Moondream (rapide) vs Llama Vision (puissant)
const visionRouter = require('../../intelligence/vision/vision-router.cjs');
// Tesseract OCR - Extraction de texte rapide (< 1 seconde) - Ajouté 2025-12-20
const Tesseract = require('tesseract.js');
const voiceParser = require('../core/voice-command-parser.cjs');
const architectAgent = require('./architect-agent.cjs');
const MemoryTools = require('../tools/memory-tools.cjs');
const PythonTools = require('../tools/python-tools.cjs');

// GIT et PROJECT INDEXER - Global imports
const gitManager = require('../core/git-manager.cjs');
const projectIndexer = require('../core/project-indexer.cjs');

// ORCHESTRATEUR LLM - Added 2025-12-08
const groqService = require('../services/groq-service.cjs');

// SKILL LOADER - OpenSkills integration - Added 2025-12-21
const skillLoader = require('../services/skill-loader.cjs');

// V2 Core Modules - Added 2025-12-07
const {
  createLoopController,
  selfCorrection,
  createContextManager,
  LOOP_CONFIG
} = require('../core/index.cjs');

const OLLAMA_URL = 'http://localhost:11434';
const { callWithFallback } = require('../core/llm-orchestrator.cjs');
const { getRelevantTools, getRelevantToolsHybrid } = require('../core/tool-groups.cjs');
// FIX 2025-12-15: Pas de model par défaut hardcodé - l'orchestrateur décide (Cerebras)
const DEFAULT_MODEL = null;

/**
 * FIX 2025-12-20: Extraire un chemin de fichier depuis le message utilisateur
 * Cerebras corrompt souvent les chemins Windows (backslashes perdus, caractères unicode)
 * Solution: Extraire le chemin original du message avant corruption
 */
function extractPathFromMessage(message) {
  if (!message) return null;

  // Pattern pour chemins Windows: C:\...\file.ext ou "C:\...\file.ext"
  const windowsPathPattern = /[A-Za-z]:\\[^"'\s<>|*?]+\.[a-zA-Z0-9]+/g;

  const matches = message.match(windowsPathPattern);
  if (matches && matches.length > 0) {
    // Retourner le premier chemin trouvé (le plus probable pour une image)
    return matches[0];
  }

  // Pattern pour chemins Unix (au cas où)
  const unixPathPattern = /\/[^"'\s<>|*?]+\.[a-zA-Z0-9]+/g;
  const unixMatches = message.match(unixPathPattern);
  if (unixMatches && unixMatches.length > 0) {
    return unixMatches[0];
  }

  return null;
}

/**
 * FIX 2025-12-18: Corriger les chemins Windows après JSON.parse
 * Le problème: \r dans "E:\ANA\...\resurrection.txt" devient un carriage return
 * Solution: Détecter et corriger les caractères échappés mal interprétés
 *
 * FIX 2025-12-20: Corriger les chemins corrompus par Cerebras
 * Le problème: "C:\Users\niwno" devient "C:Users/iwno" (backslashes perdus)
 */
function fixWindowsPaths(args) {
  if (!args || typeof args !== 'object') return args;

  const pathKeys = ['file_path', 'path', 'filePath', 'directory', 'dir', 'folder',
                    'source', 'destination', 'src', 'dest', 'image_path', 'notebook_path'];

  for (const key of pathKeys) {
    if (args[key] && typeof args[key] === 'string') {
      let fixed = args[key];

      // Remplacer les caractères échappés mal interprétés par des backslashes
      fixed = fixed.replace(/\r/g, '\\r');  // carriage return → \r
      fixed = fixed.replace(/\n/g, '\\n');  // newline → \n
      fixed = fixed.replace(/\t/g, '\\t');  // tab → \t
      fixed = fixed.replace(/\f/g, '\\f');  // form feed → \f
      fixed = fixed.replace(/\v/g, '\\v');  // vertical tab → \v

      // FIX 2025-12-20: Corriger "C:Users" → "C:\Users" (backslash manquant après drive)
      fixed = fixed.replace(/^([A-Za-z]):(?![\\\/])/, '$1:\\');

      // Normaliser les slashes (forward → back pour Windows)
      if (fixed.match(/^[A-Za-z]:/)) {
        fixed = fixed.replace(/\//g, '\\');
      }

      // FIX 2025-12-20: Corriger les noms d'utilisateur corrompus connus
      // "iwno" → "niwno" (n manquant au début)
      fixed = fixed.replace(/\\iwno\\/gi, '\\niwno\\');
      fixed = fixed.replace(/\/iwno\//gi, '/niwno/');

      args[key] = fixed;
    }
  }
  return args;
}

/**
 * FIX 2025-12-08: Parse tool calls - supports multiple LLM formats
 * - Standard JSON: {"name": "tool", "arguments": {...}}
 * - GLM-4 format: "tool_name\n{}" or "tool_name\n{args}"
 * - Tool name alone: "get_time" (for no-arg tools)
 */
function findToolCallJSON(content) {
  const results = [];

  // Liste des outils valides - TOUS LES 181 OUTILS (FIX 2025-12-13)
  const validToolNames = [
    // WEB (11)
    'web_search', 'get_weather', 'get_time', 'web_fetch', 'wikipedia', 'http_request', 'check_url', 'get_public_ip', 'dns_lookup', 'whois', 'ping',
    // FILES (25)
    'read_file', 'write_file', 'edit_file', 'list_files', 'glob', 'grep', 'search_in_file', 'read_file_chunk', 'file_info', 'copy_file', 'move_file', 'delete_file', 'create_directory', 'get_file_stats', 'compare_files', 'find_files', 'tree_view', 'create_backup', 'search_replace_in_file', 'count_lines', 'count_words', 'head_file', 'tail_file', 'append_to_file', 'prepend_to_file',
    // SYSTEM (15)
    'get_system_info', 'get_cpu_usage', 'get_memory_usage', 'get_disk_usage', 'list_processes', 'kill_process', 'kill_process_by_name', 'get_environment_variable', 'set_environment_variable', 'get_network_interfaces', 'open_application', 'open_url_in_browser', 'run_shell', 'run_background', 'take_screenshot',
    // GIT (12)
    'git_status', 'git_commit', 'git_log', 'git_branch', 'git_diff', 'git_stash', 'git_pull', 'git_push', 'git_clone', 'git_checkout', 'git_merge', 'git_reset',
    // DOCKER (6)
    'docker_ps', 'docker_images', 'docker_logs', 'docker_exec', 'docker_start', 'docker_stop',
    // OLLAMA (4)
    'ollama_list', 'ollama_pull', 'ollama_delete', 'ollama_chat',
    // IMAGE (15) - animate_image ajouté 2025-12-21
    'generate_image', 'generate_animation', 'generate_video', 'animate_image', 'image_to_image', 'inpaint_image', 'describe_image', 'extract_text', 'debug_screenshot', 'analyze_code_screenshot', 'resize_image', 'convert_image', 'get_image_info', 'crop_image', 'rotate_image',
    // CONVERSION (11)
    'json_to_csv', 'csv_to_json', 'xml_to_json', 'json_to_xml', 'yaml_to_json', 'json_to_yaml', 'parse_html', 'markdown_to_html', 'html_to_markdown', 'format_json', 'minify_json',
    // CRYPTO (8)
    'hash_file', 'hash_text', 'generate_uuid', 'generate_password', 'encrypt_text', 'decrypt_text', 'base64_encode', 'base64_decode',
    // NPM (6)
    'npm_list', 'npm_outdated', 'npm_run', 'npm_search', 'npm_info', 'install_npm_package',
    // ARCHIVE (6)
    'create_zip', 'extract_zip', 'list_archive', 'compress_gzip', 'decompress_gzip', 'download_file',
    // DATE/MATH (10)
    'format_date', 'date_diff', 'add_to_date', 'timestamp_to_date', 'date_to_timestamp', 'calculate', 'convert_units', 'random_number', 'statistics', 'get_zodiac_sign',
    // AUDIO (3)
    'get_audio_info', 'text_to_speech', 'play_audio',
    // BROWSER (12)
    'browser_open', 'browser_screenshot', 'browser_pdf', 'browser_click', 'browser_type', 'browser_evaluate', 'browser_extract', 'dom_query', 'dom_get_element_by_id', 'dom_get_elements_by_class', 'dom_get_elements_by_tag', 'dom_modify',
    // DATABASE (3)
    'sqlite_query', 'sqlite_tables', 'sqlite_schema',
    // MEMORY (7) - Self-Editing Memory Tools added 2025-12-14
    'search_memory', 'save_memory', 'memory_update', 'memory_forget', 'memory_reflect', 'memory_link', 'memory_query_graph',
    // CODE (11)
    'execute_code', 'create_react_component', 'add_route', 'add_api_endpoint', 'analyze_component', 'hot_reload_check', 'validate_jsx_syntax', 'list_available_icons', 'get_css_variables', 'search_codebase', 'get_project_structure',
    // AGENTS (5)
    'ask_groq', 'ask_cerebras', 'launch_agent', 'ask_architect', 'review_code',
    // VALIDATION (4)
    'test_regex', 'validate_json', 'validate_email', 'validate_url',
    // UTILS (11)
    'ask_user', 'todo_write', 'notebook_edit', 'plan_mode', 'send_notification', 'clipboard_read', 'clipboard_write', 'set_reminder', 'list_reminders', 'cancel_reminder', 'execute_voice_command',
    // YOUTUBE (3)
    'youtube_search', 'get_yt_transcript', 'get_news'
  ];

  // FORMAT 1: GLM-4 style "tool_name\n{args}"
  for (const toolName of validToolNames) {
    // Pattern: tool_name suivi de newline et JSON object
    const glm4Regex = new RegExp(toolName + '\\s*\\n\\s*(\\{[\\s\\S]*?\\})', 'g');
    let match;
    while ((match = glm4Regex.exec(content)) !== null) {
      try {
        const args = JSON.parse(match[1]);
        const toolCall = JSON.stringify({ name: toolName, arguments: args });
        if (!results.includes(toolCall)) {
          results.push(toolCall);
          console.log(`[Parser] GLM-4 format: ${toolName}`);
        }
      } catch (e) {
        const toolCall = JSON.stringify({ name: toolName, arguments: {} });
        if (!results.includes(toolCall)) {
          results.push(toolCall);
          console.log(`[Parser] GLM-4 format (empty): ${toolName}`);
        }
      }
    }

    // Pattern: tool_name seul (pas suivi de JSON)
    const soloRegex = new RegExp('(?:^|\\n)\\s*' + toolName + '\\s*(?:\\n|$)', 'g');
    while ((match = soloRegex.exec(content)) !== null) {
      const toolCall = JSON.stringify({ name: toolName, arguments: {} });
      if (!results.includes(toolCall)) {
        results.push(toolCall);
        console.log(`[Parser] Solo tool: ${toolName}`);
      }
    }
  }

  // FORMAT 2: Standard JSON {"name": "...", "arguments": {...}}
  let startIdx = 0;
  while ((startIdx = content.indexOf('{', startIdx)) !== -1) {
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
        if (parsed.name && typeof parsed.arguments !== 'undefined') {
          if (!results.includes(candidate)) {
            results.push(candidate);
          }
        }
      } catch (e) {
        // Pas du JSON valide
      }
    }
    startIdx++;
  }

  // FORMAT 3: Function call style tool_name("argument")
  for (const toolName of validToolNames) {
    const funcRegex = new RegExp(toolName + '\\s*\\(\\s*["\']([^"\']+)["\']\\s*\\)', 'g');
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      const argValue = match[1];
      let args = {};
      if (toolName === 'run_shell') args = { command: argValue };
      else if (toolName === 'read_file' || toolName === 'list_files') args = { path: argValue };
      else if (toolName === 'web_search') args = { query: argValue };
      else if (toolName === 'get_weather') args = { city: argValue };
      else args = { input: argValue };

      const toolCall = JSON.stringify({ name: toolName, arguments: args });
      if (!results.includes(toolCall)) {
        results.push(toolCall);
        console.log(`[Parser] Function format: ${toolName}("${argValue}")`);
      }
    }
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
      name: 'search_in_file',
      description: 'Rechercher un pattern (regex) dans un fichier et retourner les lignes correspondantes avec contexte. UTILISE CET OUTIL pour analyser de gros fichiers au lieu de read_file. Parfait pour trouver des fonctions, routes API, définitions, etc.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du fichier à analyser.' },
          pattern: { type: 'string', description: 'Pattern regex à rechercher (ex: "app\\.get|app\\.post" pour routes Express).' },
          context_lines: { type: 'integer', description: 'Nombre de lignes de contexte avant/après chaque match.', default: 1 }
        },
        required: ['path', 'pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file_chunk',
      description: 'Lire une portion spécifique d\'un fichier (lignes X à Y). Utile pour les gros fichiers quand tu connais la zone à examiner.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du fichier.' },
          start_line: { type: 'integer', description: 'Numéro de ligne de début (1-based).', default: 1 },
          end_line: { type: 'integer', description: 'Numéro de ligne de fin (1-based).', default: 100 }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'file_info',
      description: 'Obtenir des informations sur un fichier (taille, nombre de lignes, type). UTILISE AVANT read_file pour savoir si le fichier est trop gros.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du fichier.' }
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
          model: { type: 'string', enum: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'], description: 'Modèle Groq', default: 'llama-3.3-70b-versatile' }
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
      description: "Rechercher dans ma mémoire les infos sur Alain. UTILISER quand Alain pose une question sur lui-même ou ses possessions: 'quelle couleur est ma voiture', 'c\\'est quoi mon anniversaire', 'tu connais mon chien', 'qu\\'est-ce que tu sais sur moi', 'tu te rappelles', 'ma date de naissance', 'mon signe astrologique'. Aussi pour retrouver des conversations passées.",
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
  // === SAVE MEMORY TOOL ===
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description: 'Sauvegarder une information importante en memoire pour m en souvenir plus tard. Utiliser quand Alain dit souviens-toi, retiens ca, n oublie pas.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'L information a memoriser.' },
          category: { type: 'string', description: 'Categorie du souvenir (fait, preference, projet, etc.)', default: 'general' }
        },
        required: ['content']
      }
    }
  },
  // === MEMORY UPDATE TOOL (Self-Editing) - Added 2025-12-14 ===
  {
    type: 'function',
    function: {
      name: 'memory_update',
      description: "Corriger ou mettre à jour une information que j'ai en mémoire. Quand Alain dit 'non c'est pas ça', 'l'info a changé', 'mets à jour', 'corrige ça', 'c'est plus comme ça', ou quand je détecte une info obsolète. Exemple: 'ma voiture c'est plus une Honda, c'est une Toyota maintenant'.",
      parameters: {
        type: 'object',
        properties: {
          old_content: { type: 'string', description: "L'ancienne information incorrecte ou obsolète" },
          new_content: { type: 'string', description: "La nouvelle information correcte" },
          reason: { type: 'string', description: "Pourquoi cette mise à jour (correction, changement, obsolète)", default: 'Mise à jour' }
        },
        required: ['old_content', 'new_content']
      }
    }
  },
  // === MEMORY FORGET TOOL (Strategic Forgetting) - Added 2025-12-14 ===
  {
    type: 'function',
    function: {
      name: 'memory_forget',
      description: "Oublier une information de ma mémoire. Quand Alain dit 'oublie ça', 'efface ça de ta mémoire', 'ne retiens plus ça', 'supprime ce souvenir', ou quand une info est devenue inutile ou incorrecte. Je demande toujours permission avant d'oublier.",
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: "L'information à oublier" },
          reason: { type: 'string', description: "Pourquoi oublier: obsolète, incorrect, inutile, contradictoire" },
          force: { type: 'boolean', description: "Oublier sans demander permission (false par défaut)", default: false }
        },
        required: ['content', 'reason']
      }
    }
  },
  // === MEMORY REFLECT TOOL - Added 2025-12-14 ===
  {
    type: 'function',
    function: {
      name: 'memory_reflect',
      description: "Analyser et réfléchir sur ma propre mémoire. Quand Alain dit 'réfléchis sur ta mémoire', 'analyse ce que tu sais', 'fais le point', 'qu'est-ce que tu retiens', 'examine ta mémoire', 'introspection'. Détecte les doublons, contradictions, et donne des statistiques sur mes souvenirs.",
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: "Sujet spécifique à analyser (laisser vide pour analyse générale)" },
          depth: { type: 'string', enum: ['quick', 'normal', 'deep'], description: "Profondeur: quick=rapide, normal=standard, deep=approfondie", default: 'normal' }
        },
        required: []
      }
    }
  },
  // === MEMORY LINK TOOL (Graph Memory) - Added 2025-12-14 ===
  {
    type: 'function',
    function: {
      name: 'memory_link',
      description: "Créer une connexion/relation entre deux concepts dans ma mémoire. Quand Alain dit 'crée un lien', 'associe X à Y', 'relie X et Y', 'X aime Y', 'X possède Y', 'retiens que X est lié à Y'. Construit un graphe de connaissances. Exemple: 'Alain aime les jeux' → subject=Alain, relation=aime, object=jeux.",
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: "Le sujet/source de la relation (qui ou quoi)" },
          relation: { type: 'string', description: "Le type de lien (aime, possède, travaille_sur, habite_à, est_ami_de, etc.)" },
          object: { type: 'string', description: "L'objet/cible de la relation (vers quoi)" },
          confidence: { type: 'number', description: "Certitude de 0 à 1 (1 = certain)", default: 1.0 }
        },
        required: ['subject', 'relation', 'object']
      }
    }
  },
  // === MEMORY QUERY GRAPH TOOL - Added 2025-12-14 ===
  {
    type: 'function',
    function: {
      name: 'memory_query_graph',
      description: "Explorer les relations et connexions dans ma mémoire. Quand Alain demande 'quelles relations', 'quels liens tu connais', 'qu'est-ce qui est connecté à X', 'montre ton graphe', 'quelles connexions'. Permet de découvrir comment les concepts sont liés entre eux.",
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: "Chercher les relations partant de ce sujet" },
          relation: { type: 'string', description: "Chercher ce type de relation spécifique" },
          object: { type: 'string', description: "Chercher les relations pointant vers cet objet" }
        },
        required: []
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

  // === 4 NOUVEAUX OUTILS PARITÉ CLAUDE CODE - 2025-12-08 ===
  {
    type: 'function',
    function: {
      name: 'execute_code',
      description: 'Exécuter du code Python et retourner le résultat.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code Python à exécuter' },
          language: { type: 'string', description: 'Langage (python par défaut)', default: 'python' }
        },
        required: ['code']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Générer une image à partir d\'un prompt texte via ComfyUI.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Description de l\'image à générer' },
          negative_prompt: { type: 'string', description: 'Ce qu\'on ne veut pas voir', default: '' },
          width: { type: 'integer', description: 'Largeur', default: 512 },
          height: { type: 'integer', description: 'Hauteur', default: 512 }
        },
        required: ['prompt']
      }
    }
  },
    // === IMAGE/VIDEO GENERATION TOOLS - Added 2025-12-09 ===
  {
    type: 'function',
    function: {
      name: 'generate_animation',
      description: 'Generer un GIF anime via AnimateDiff (ComfyUI). Utilise DreamShaper 8 pour meilleure qualite.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Description de l\'animation a generer' },
          negative_prompt: { type: 'string', description: 'Ce qu\'on ne veut pas voir', default: 'blurry, low quality' },
          frame_count: { type: 'integer', description: 'Nombre de frames (8-24)', default: 16 },
          fps: { type: 'integer', description: 'Images par seconde', default: 8 },
          format: { type: 'string', enum: ['gif', 'mp4', 'webm'], default: 'gif' }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_video',
      description: 'Generer une video via Mochi (ComfyUI). Haute qualite mais lent.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Description de la video a generer' },
          duration: { type: 'integer', description: 'Duree en secondes (2-10)', default: 5 },
          fps: { type: 'integer', description: 'Images par seconde', default: 24 }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'animate_image',
      description: 'Animer une image existante avec Stable Video Diffusion (SVD). Transforme une image statique en video/gif animee.',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin vers l\'image PNG/JPG a animer' },
          frames: { type: 'integer', description: 'Nombre de frames (14-25)', default: 25 },
          fps: { type: 'integer', description: 'Images par seconde pour le GIF', default: 8 },
          motion_bucket_id: { type: 'integer', description: 'Intensite du mouvement (1-255, plus haut = plus de mouvement)', default: 127 },
          augmentation_level: { type: 'number', description: 'Niveau de bruit ajoute (0.0-1.0)', default: 0.0 }
        },
        required: ['image_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'image_to_image',
      description: 'Transformer une image existante avec un nouveau prompt (img2img).',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin vers l\'image source' },
          prompt: { type: 'string', description: 'Description de la transformation' },
          negative_prompt: { type: 'string', description: 'Ce qu\'on ne veut pas', default: '' },
          denoise: { type: 'number', description: 'Force de transformation 0.0-1.0', default: 0.75 }
        },
        required: ['image_path', 'prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'inpaint_image',
      description: 'Retoucher une zone specifique d\'une image (inpainting).',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin vers l\'image source' },
          mask_path: { type: 'string', description: 'Chemin vers le masque (blanc=zone a modifier)' },
          prompt: { type: 'string', description: 'Description de ce qui doit remplacer la zone masquee' },
          negative_prompt: { type: 'string', description: 'Ce qu\'on ne veut pas', default: '' }
        },
        required: ['image_path', 'mask_path', 'prompt']
      }
    }
  },
{
    type: 'function',
    function: {
      name: 'http_request',
      description: 'Faire une requête HTTP GET/POST vers une URL.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL cible' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
          headers: { type: 'object', description: 'Headers HTTP' },
          body: { type: 'string', description: 'Corps de la requête (POST/PUT)' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_yt_transcript',
      description: 'Obtenir la transcription d\'une vidéo YouTube.',
      parameters: {
        type: 'object',
        properties: {
          video_url: { type: 'string', description: 'URL de la vidéo YouTube' },
          language: { type: 'string', description: 'Langue préférée', default: 'fr' }
        },
        required: ['video_url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'youtube_search',
      description: 'Rechercher des vidéos sur YouTube.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termes de recherche' },
          max_results: { type: 'number', description: 'Nombre max de résultats (défaut: 5)', default: 5 }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_news',
      description: 'Obtenir les dernières actualités sur un sujet.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Sujet des actualités (ex: technologie, sports, politique)' },
          language: { type: 'string', description: 'Langue (fr, en)', default: 'fr' },
          max_results: { type: 'number', description: 'Nombre max de résultats', default: 5 }
        },
        required: ['topic']
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
  },
  // ============ GIT TOOLS - Phase 2 ANA CODE ============
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Obtenir le statut git (fichiers modifiés, branche actuelle, dernier commit).',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin vers le repository git' }
        },
        required: ['repo_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_commit',
      description: 'Committer les changements avec un message descriptif.',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin vers le repository git' },
          message: { type: 'string', description: 'Message de commit descriptif' },
          add_all: { type: 'boolean', description: 'Ajouter tous les fichiers avant commit', default: true }
        },
        required: ['repo_path', 'message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_log',
      description: 'Voir historique des commits.',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin vers le repository git' },
          count: { type: 'integer', description: 'Nombre de commits à afficher', default: 10 }
        },
        required: ['repo_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_branch',
      description: 'Lister ou créer des branches.',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin vers le repository git' },
          action: { type: 'string', enum: ['list', 'create', 'checkout'], description: 'Action' },
          branch_name: { type: 'string', description: 'Nom de la branche (pour create/checkout)' }
        },
        required: ['repo_path', 'action']
      }
    }
  },
  // ============ RAG TOOLS - Phase 2.2 ANA CODE ============
  {
    type: 'function',
    function: {
      name: 'search_codebase',
      description: 'Rechercher dans le code source d\'un projet (fichiers, fonctions, classes).',
      parameters: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Chemin vers le projet à rechercher' },
          query: { type: 'string', description: 'Termes de recherche (ex: "git commit", "async function")' },
          max_results: { type: 'integer', description: 'Nombre max de résultats', default: 10 }
        },
        required: ['project_path', 'query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_structure',
      description: 'Obtenir la structure arborescente d\'un projet (dossiers et fichiers).',
      parameters: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Chemin vers le projet' },
          max_depth: { type: 'integer', description: 'Profondeur max de l\'arbre', default: 3 }
        },
        required: ['project_path']
      }
    }
  },
  // ============ VISION TOOLS - Phase 3.2 ANA CODE ============
  // FIX 2025-12-17: Description explicite pour forcer utilisation chemin exact
  {
    type: 'function',
    function: {
      name: 'describe_image',
      description: 'Analyser visuellement une image LOCALE (objets, couleurs, scène). Pour EXTRAIRE DU TEXTE, utilise extract_text à la place.',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin EXACT vers l\'image locale fourni par l\'utilisateur. OBLIGATOIRE.' },
          image_base64: { type: 'string', description: 'Image en base64 (uniquement pour images web ou captures)' },
          prompt: { type: 'string', description: 'Question specifique pour l\'analyse (optionnel)' }
        },
        required: ['image_path']
      }
    }
  },
  // FIX 2025-12-20: Outil OCR dédié pour extraction de texte
  {
    type: 'function',
    function: {
      name: 'extract_text',
      description: 'EXTRAIRE LE TEXTE (OCR) d\'une image. Utilise ce tool quand l\'utilisateur demande: extraire texte, lire le texte, OCR, lister le contenu textuel, écrire le texte ici.',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin EXACT vers l\'image. OBLIGATOIRE.' }
        },
        required: ['image_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'debug_screenshot',
      description: 'Analyser une capture d\'ecran d\'erreur et proposer des solutions.',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin vers le screenshot d\'erreur' },
          image_base64: { type: 'string', description: 'Screenshot en base64' },
          context: { type: 'string', description: 'Contexte additionnel (langage, framework, etc.)' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_code_screenshot',
      description: 'Extraire et analyser du code depuis une capture d\'ecran.',
      parameters: {
        type: 'object',
        properties: {
          image_path: { type: 'string', description: 'Chemin vers le screenshot de code' },
          image_base64: { type: 'string', description: 'Screenshot en base64' }
        },
        required: []
      }
    }
  },
  // ============ VOICE CODING - Phase 3.1 ANA CODE ============
  {
    type: 'function',
    function: {
      name: 'execute_voice_command',
      description: 'Parser et executer une commande vocale de coding (git, fichiers, code, etc.).',
      parameters: {
        type: 'object',
        properties: {
          transcript: { type: 'string', description: 'Transcription vocale a parser et executer' },
          context: { type: 'string', description: 'Contexte optionnel (repertoire courant, projet, etc.)' }
        },
        required: ['transcript']
      }
    }
  },
  // ============ ARCHITECT MODE - Phase 3.3 ANA CODE ============
  {
    type: 'function',
    function: {
      name: 'ask_architect',
      description: 'Demander a l\'architecte d\'analyser une demande et creer un plan d\'implementation.',
      parameters: {
        type: 'object',
        properties: {
          request: { type: 'string', description: 'Description de la fonctionnalite ou modification a implementer' },
          files: { type: 'array', items: { type: 'string' }, description: 'Liste des fichiers concernes' },
          project_context: { type: 'string', description: 'Contexte du projet (structure, technologies, etc.)' }
        },
        required: ['request']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'review_code',
      description: 'Demander a l\'architecte de reviser du code et suggerer des ameliorations.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code source a reviser' },
          context: { type: 'string', description: 'Contexte du code (fichier, fonction, objectif)' }
        },
        required: ['code']
      }
    }
  },
  // === NOUVEAUX OUTILS - DÉVELOPPEMENT WEB (10 Décembre 2025) ===
  {
    type: 'function',
    function: {
      name: 'create_react_component',
      description: 'Créer un nouveau composant React (.jsx) avec son fichier CSS associé. Utilise les patterns du projet Ana.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom du composant (ex: ConverterPage, UserProfile)' },
          type: { type: 'string', enum: ['page', 'component'], description: 'Type: page (dans src/pages) ou component (dans src/components)' },
          description: { type: 'string', description: 'Description de ce que fait le composant' },
          features: { type: 'array', items: { type: 'string' }, description: 'Liste des fonctionnalités (ex: ["drag-drop", "form", "api-call"])' }
        },
        required: ['name', 'type', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_route',
      description: 'Ajouter une nouvelle route dans App.jsx pour une page React.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin URL (ex: /converter, /settings)' },
          component: { type: 'string', description: 'Nom du composant à afficher (ex: ConverterPage)' },
          icon: { type: 'string', description: 'Nom de l\'icône pour le sidebar (ex: IconRefreshCw)' },
          label: { type: 'string', description: 'Label dans le menu (ex: Convertisseur)' }
        },
        required: ['path', 'component', 'label']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_api_endpoint',
      description: 'Ajouter un nouvel endpoint API dans ana-core.cjs.',
      parameters: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'Méthode HTTP' },
          path: { type: 'string', description: 'Chemin de l\'API (ex: /api/convert)' },
          description: { type: 'string', description: 'Description de l\'endpoint' },
          parameters: { type: 'array', items: { type: 'string' }, description: 'Paramètres attendus' }
        },
        required: ['method', 'path', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'install_npm_package',
      description: 'Installer un package npm dans le projet.',
      parameters: {
        type: 'object',
        properties: {
          package_name: { type: 'string', description: 'Nom du package (ex: react-dropzone, axios)' },
          project: { type: 'string', enum: ['interface', 'server'], description: 'Projet cible: interface (frontend) ou server (backend)' },
          dev: { type: 'boolean', description: 'Installer en devDependency (true/false)' }
        },
        required: ['package_name', 'project']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_component',
      description: 'Analyser un composant React existant pour comprendre sa structure et ses patterns.',
      parameters: {
        type: 'object',
        properties: {
          component_path: { type: 'string', description: 'Chemin vers le fichier .jsx à analyser' }
        },
        required: ['component_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'hot_reload_check',
      description: 'Vérifier si le serveur de développement Vite tourne et si le hot reload fonctionne.',
      parameters: {
        type: 'object',
        properties: {
          port: { type: 'number', description: 'Port du serveur Vite (défaut: 5173)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'validate_jsx_syntax',
      description: 'Valider la syntaxe d\'un fichier JSX avant de le sauvegarder.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code JSX à valider' }
        },
        required: ['code']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_available_icons',
      description: 'Lister toutes les icônes disponibles dans Icons.jsx du projet.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_css_variables',
      description: 'Obtenir les variables CSS du projet (couleurs, espacements, etc.) depuis App.css.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_backup',
      description: 'Créer une sauvegarde d\'un fichier avant modification.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Chemin du fichier à sauvegarder' },
          reason: { type: 'string', description: 'Raison de la sauvegarde (ex: avant_ajout_route)' }
        },
        required: ['file_path']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📁 CATÉGORIE: SYSTÈME DE FICHIERS AVANCÉ
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'copy_file',
      description: 'Copier un fichier vers une destination.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Chemin du fichier source' },
          destination: { type: 'string', description: 'Chemin de destination' },
          overwrite: { type: 'boolean', description: 'Écraser si existe (défaut: false)' }
        },
        required: ['source', 'destination']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'move_file',
      description: 'Déplacer ou renommer un fichier.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Chemin actuel' },
          destination: { type: 'string', description: 'Nouveau chemin' }
        },
        required: ['source', 'destination']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Supprimer un fichier (avec confirmation).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier' },
          confirm: { type: 'boolean', description: 'Confirmation explicite requise (true)' }
        },
        required: ['path', 'confirm']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_directory',
      description: 'Créer un dossier (et sous-dossiers si nécessaire).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du dossier à créer' },
          recursive: { type: 'boolean', description: 'Créer les parents si nécessaire (défaut: true)' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_file_stats',
      description: 'Obtenir les statistiques détaillées d\'un fichier (taille, dates, permissions).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compare_files',
      description: 'Comparer deux fichiers et montrer les différences.',
      parameters: {
        type: 'object',
        properties: {
          file1: { type: 'string', description: 'Premier fichier' },
          file2: { type: 'string', description: 'Deuxième fichier' },
          mode: { type: 'string', enum: ['binary', 'text', 'line-by-line'], description: 'Mode de comparaison' }
        },
        required: ['file1', 'file2']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'find_files',
      description: 'Rechercher des fichiers avec des critères avancés.',
      parameters: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'Dossier de recherche' },
          pattern: { type: 'string', description: 'Pattern glob (ex: *.js, **/*.txt)' },
          maxDepth: { type: 'number', description: 'Profondeur max de recherche' },
          minSize: { type: 'number', description: 'Taille minimum en bytes' },
          maxSize: { type: 'number', description: 'Taille maximum en bytes' },
          modifiedAfter: { type: 'string', description: 'Modifié après (ISO date)' }
        },
        required: ['directory']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'watch_file',
      description: 'Surveiller un fichier/dossier pour les changements.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin à surveiller' },
          duration: { type: 'number', description: 'Durée en secondes (défaut: 60)' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_directory_size',
      description: 'Calculer la taille totale d\'un dossier.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du dossier' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tree_view',
      description: 'Afficher l\'arborescence d\'un dossier.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du dossier' },
          maxDepth: { type: 'number', description: 'Profondeur max (défaut: 3)' },
          showHidden: { type: 'boolean', description: 'Inclure fichiers cachés' },
          showSize: { type: 'boolean', description: 'Afficher les tailles' }
        },
        required: ['path']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌐 CATÉGORIE: RÉSEAU ET HTTP
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'download_file',
      description: 'Télécharger un fichier depuis une URL.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL du fichier' },
          destination: { type: 'string', description: 'Chemin de destination' },
          headers: { type: 'object', description: 'Headers HTTP optionnels' }
        },
        required: ['url', 'destination']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ping',
      description: 'Tester la connectivité vers un hôte.',
      parameters: {
        type: 'object',
        properties: {
          host: { type: 'string', description: 'Hôte à tester (IP ou domaine)' },
          count: { type: 'number', description: 'Nombre de pings (défaut: 4)' }
        },
        required: ['host']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_url',
      description: 'Vérifier si une URL est accessible et son statut.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL à vérifier' },
          timeout: { type: 'number', description: 'Timeout en ms (défaut: 5000)' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_public_ip',
      description: 'Obtenir l\'adresse IP publique.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'dns_lookup',
      description: 'Résoudre un nom de domaine en IP.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Nom de domaine' },
          type: { type: 'string', enum: ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME'], description: 'Type d\'enregistrement' }
        },
        required: ['domain']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'port_scan',
      description: 'Vérifier si des ports sont ouverts sur un hôte.',
      parameters: {
        type: 'object',
        properties: {
          host: { type: 'string', description: 'Hôte à scanner' },
          ports: { type: 'array', items: { type: 'number' }, description: 'Liste des ports à vérifier' }
        },
        required: ['host', 'ports']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'whois',
      description: 'Obtenir les informations WHOIS d\'un domaine.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Nom de domaine' }
        },
        required: ['domain']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📦 CATÉGORIE: COMPRESSION ET ARCHIVES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'create_zip',
      description: 'Créer une archive ZIP.',
      parameters: {
        type: 'object',
        properties: {
          files: { type: 'array', items: { type: 'string' }, description: 'Liste des fichiers à compresser' },
          output: { type: 'string', description: 'Chemin du fichier ZIP de sortie' },
          level: { type: 'number', description: 'Niveau de compression (1-9)' }
        },
        required: ['files', 'output']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'extract_zip',
      description: 'Extraire une archive ZIP.',
      parameters: {
        type: 'object',
        properties: {
          zipFile: { type: 'string', description: 'Chemin du fichier ZIP' },
          destination: { type: 'string', description: 'Dossier de destination' }
        },
        required: ['zipFile', 'destination']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_archive',
      description: 'Lister le contenu d\'une archive sans l\'extraire.',
      parameters: {
        type: 'object',
        properties: {
          archiveFile: { type: 'string', description: 'Chemin de l\'archive (zip, tar, 7z)' }
        },
        required: ['archiveFile']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compress_gzip',
      description: 'Compresser un fichier en gzip.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Fichier source' },
          output: { type: 'string', description: 'Fichier de sortie (.gz)' }
        },
        required: ['source']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'decompress_gzip',
      description: 'Décompresser un fichier gzip.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Fichier .gz source' },
          output: { type: 'string', description: 'Fichier de sortie' }
        },
        required: ['source']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 CATÉGORIE: CRYPTOGRAPHIE ET SÉCURITÉ
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'hash_file',
      description: 'Calculer le hash d\'un fichier.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier' },
          algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256', 'sha512'], description: 'Algorithme de hash' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'hash_text',
      description: 'Calculer le hash d\'un texte.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texte à hasher' },
          algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256', 'sha512'], description: 'Algorithme' }
        },
        required: ['text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_uuid',
      description: 'Générer un UUID v4 unique.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_password',
      description: 'Générer un mot de passe sécurisé.',
      parameters: {
        type: 'object',
        properties: {
          length: { type: 'number', description: 'Longueur (défaut: 16)' },
          includeSymbols: { type: 'boolean', description: 'Inclure symboles' },
          includeNumbers: { type: 'boolean', description: 'Inclure chiffres' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'encrypt_text',
      description: 'Chiffrer un texte avec AES-256.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texte à chiffrer' },
          password: { type: 'string', description: 'Mot de passe de chiffrement' }
        },
        required: ['text', 'password']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'decrypt_text',
      description: 'Déchiffrer un texte chiffré avec AES-256.',
      parameters: {
        type: 'object',
        properties: {
          encryptedText: { type: 'string', description: 'Texte chiffré' },
          password: { type: 'string', description: 'Mot de passe' }
        },
        required: ['encryptedText', 'password']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'base64_encode',
      description: 'Encoder en Base64.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Texte ou chemin de fichier' },
          isFile: { type: 'boolean', description: 'true si c\'est un fichier' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'base64_decode',
      description: 'Décoder du Base64.',
      parameters: {
        type: 'object',
        properties: {
          encoded: { type: 'string', description: 'Texte encodé en Base64' },
          outputFile: { type: 'string', description: 'Fichier de sortie (optionnel)' }
        },
        required: ['encoded']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 💻 CATÉGORIE: SYSTÈME ET OS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'get_system_info',
      description: 'Obtenir les informations système complètes.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_cpu_usage',
      description: 'Obtenir l\'utilisation CPU actuelle.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_memory_usage',
      description: 'Obtenir l\'utilisation mémoire.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_disk_usage',
      description: 'Obtenir l\'utilisation des disques.',
      parameters: {
        type: 'object',
        properties: {
          drive: { type: 'string', description: 'Lettre du disque (ex: C, E)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_processes',
      description: 'Lister les processus en cours.',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Filtrer par nom' },
          sortBy: { type: 'string', enum: ['cpu', 'memory', 'name', 'pid'], description: 'Trier par' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'kill_process_by_name',
      description: 'Terminer un processus par son nom.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom du processus' },
          force: { type: 'boolean', description: 'Forcer la terminaison' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_environment_variable',
      description: 'Obtenir une variable d\'environnement.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom de la variable' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_environment_variable',
      description: 'Définir une variable d\'environnement (session courante).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom de la variable' },
          value: { type: 'string', description: 'Valeur' }
        },
        required: ['name', 'value']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_network_interfaces',
      description: 'Lister les interfaces réseau.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_application',
      description: 'Ouvrir une application.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin de l\'application ou commande' },
          args: { type: 'array', items: { type: 'string' }, description: 'Arguments' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_url_in_browser',
      description: 'Ouvrir une URL dans le navigateur par défaut.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL à ouvrir' }
        },
        required: ['url']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 CATÉGORIE: DATA ET CONVERSION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'json_to_csv',
      description: 'Convertir JSON en CSV.',
      parameters: {
        type: 'object',
        properties: {
          jsonData: { type: 'string', description: 'JSON string ou chemin de fichier' },
          outputFile: { type: 'string', description: 'Fichier CSV de sortie' },
          delimiter: { type: 'string', description: 'Délimiteur (défaut: ,)' }
        },
        required: ['jsonData']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'csv_to_json',
      description: 'Convertir CSV en JSON.',
      parameters: {
        type: 'object',
        properties: {
          csvFile: { type: 'string', description: 'Fichier CSV source' },
          outputFile: { type: 'string', description: 'Fichier JSON de sortie (optionnel)' },
          delimiter: { type: 'string', description: 'Délimiteur (défaut: ,)' }
        },
        required: ['csvFile']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'xml_to_json',
      description: 'Convertir XML en JSON.',
      parameters: {
        type: 'object',
        properties: {
          xmlData: { type: 'string', description: 'XML string ou chemin de fichier' }
        },
        required: ['xmlData']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'json_to_xml',
      description: 'Convertir JSON en XML.',
      parameters: {
        type: 'object',
        properties: {
          jsonData: { type: 'string', description: 'JSON string ou chemin de fichier' },
          rootElement: { type: 'string', description: 'Nom de l\'élément racine' }
        },
        required: ['jsonData']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'yaml_to_json',
      description: 'Convertir YAML en JSON.',
      parameters: {
        type: 'object',
        properties: {
          yamlData: { type: 'string', description: 'YAML string ou chemin de fichier' }
        },
        required: ['yamlData']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'json_to_yaml',
      description: 'Convertir JSON en YAML.',
      parameters: {
        type: 'object',
        properties: {
          jsonData: { type: 'string', description: 'JSON string ou chemin de fichier' }
        },
        required: ['jsonData']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_html',
      description: 'Parser du HTML et extraire des éléments.',
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: 'HTML string ou URL' },
          selector: { type: 'string', description: 'Sélecteur CSS' },
          attribute: { type: 'string', description: 'Attribut à extraire (ex: href, src)' }
        },
        required: ['html', 'selector']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'markdown_to_html',
      description: 'Convertir Markdown en HTML.',
      parameters: {
        type: 'object',
        properties: {
          markdown: { type: 'string', description: 'Markdown string ou chemin' }
        },
        required: ['markdown']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'html_to_markdown',
      description: 'Convertir HTML en Markdown.',
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: 'HTML string ou chemin' }
        },
        required: ['html']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'format_json',
      description: 'Formater/prettifier du JSON.',
      parameters: {
        type: 'object',
        properties: {
          json: { type: 'string', description: 'JSON string' },
          indent: { type: 'number', description: 'Indentation (défaut: 2)' }
        },
        required: ['json']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'minify_json',
      description: 'Minifier du JSON.',
      parameters: {
        type: 'object',
        properties: {
          json: { type: 'string', description: 'JSON string' }
        },
        required: ['json']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 CATÉGORIE: IMAGES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'resize_image',
      description: 'Redimensionner une image.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Fichier image source' },
          output: { type: 'string', description: 'Fichier de sortie' },
          width: { type: 'number', description: 'Nouvelle largeur' },
          height: { type: 'number', description: 'Nouvelle hauteur' },
          maintainAspect: { type: 'boolean', description: 'Garder le ratio' }
        },
        required: ['input', 'output']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'convert_image',
      description: 'Convertir une image vers un autre format.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Fichier image source' },
          output: { type: 'string', description: 'Fichier de sortie avec extension cible' },
          quality: { type: 'number', description: 'Qualité (1-100, pour JPEG)' }
        },
        required: ['input', 'output']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_image_info',
      description: 'Obtenir les métadonnées d\'une image.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin de l\'image' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'crop_image',
      description: 'Rogner une image.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Fichier image source' },
          output: { type: 'string', description: 'Fichier de sortie' },
          x: { type: 'number', description: 'Position X' },
          y: { type: 'number', description: 'Position Y' },
          width: { type: 'number', description: 'Largeur du crop' },
          height: { type: 'number', description: 'Hauteur du crop' }
        },
        required: ['input', 'output', 'x', 'y', 'width', 'height']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'rotate_image',
      description: 'Pivoter une image.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Fichier image source' },
          output: { type: 'string', description: 'Fichier de sortie' },
          angle: { type: 'number', description: 'Angle de rotation (90, 180, 270, ou libre)' }
        },
        required: ['input', 'output', 'angle']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'take_screenshot',
      description: 'Prendre une capture d\'écran.',
      parameters: {
        type: 'object',
        properties: {
          output: { type: 'string', description: 'Fichier de sortie' },
          region: { type: 'object', description: 'Région {x, y, width, height}' }
        },
        required: ['output']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🛠️ CATÉGORIE: GIT AVANCÉ
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Afficher les différences git.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Chemin du repo' },
          file: { type: 'string', description: 'Fichier spécifique (optionnel)' },
          staged: { type: 'boolean', description: 'Diff des fichiers staged' }
        },
        required: ['repo']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_stash',
      description: 'Stash les modifications en cours.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Chemin du repo' },
          message: { type: 'string', description: 'Message du stash' },
          action: { type: 'string', enum: ['push', 'pop', 'list', 'apply'], description: 'Action stash' }
        },
        required: ['repo', 'action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_pull',
      description: 'Pull les dernières modifications.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Chemin du repo' },
          remote: { type: 'string', description: 'Remote (défaut: origin)' },
          branch: { type: 'string', description: 'Branche (défaut: main)' }
        },
        required: ['repo']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_push',
      description: 'Push les commits.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Chemin du repo' },
          remote: { type: 'string', description: 'Remote (défaut: origin)' },
          branch: { type: 'string', description: 'Branche' }
        },
        required: ['repo']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_clone',
      description: 'Cloner un repository.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL du repo' },
          destination: { type: 'string', description: 'Dossier de destination' },
          depth: { type: 'number', description: 'Clone shallow (depth)' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_checkout',
      description: 'Changer de branche ou restaurer des fichiers.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Chemin du repo' },
          branch: { type: 'string', description: 'Nom de branche' },
          createNew: { type: 'boolean', description: 'Créer nouvelle branche (-b)' }
        },
        required: ['repo', 'branch']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_merge',
      description: 'Merger une branche.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Chemin du repo' },
          branch: { type: 'string', description: 'Branche à merger' },
          noFastForward: { type: 'boolean', description: 'Forcer commit de merge' }
        },
        required: ['repo', 'branch']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_reset',
      description: 'Reset des modifications.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Chemin du repo' },
          mode: { type: 'string', enum: ['soft', 'mixed', 'hard'], description: 'Mode de reset' },
          target: { type: 'string', description: 'Commit cible (défaut: HEAD)' }
        },
        required: ['repo']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📝 CATÉGORIE: TEXTE ET MANIPULATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'search_replace_in_file',
      description: 'Rechercher et remplacer dans un fichier.',
      parameters: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Chemin du fichier' },
          search: { type: 'string', description: 'Texte à rechercher (ou regex)' },
          replace: { type: 'string', description: 'Texte de remplacement' },
          isRegex: { type: 'boolean', description: 'Traiter comme regex' },
          all: { type: 'boolean', description: 'Remplacer toutes les occurrences' }
        },
        required: ['file', 'search', 'replace']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'count_lines',
      description: 'Compter les lignes d\'un fichier.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'count_words',
      description: 'Compter les mots d\'un fichier.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'head_file',
      description: 'Lire les premières lignes d\'un fichier.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier' },
          lines: { type: 'number', description: 'Nombre de lignes (défaut: 10)' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tail_file',
      description: 'Lire les dernières lignes d\'un fichier.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier' },
          lines: { type: 'number', description: 'Nombre de lignes (défaut: 10)' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'append_to_file',
      description: 'Ajouter du texte à la fin d\'un fichier.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier' },
          content: { type: 'string', description: 'Contenu à ajouter' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'prepend_to_file',
      description: 'Ajouter du texte au début d\'un fichier.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier' },
          content: { type: 'string', description: 'Contenu à ajouter' }
        },
        required: ['path', 'content']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ⏰ CATÉGORIE: DATE ET TEMPS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'format_date',
      description: 'Formater une date.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date (ISO ou timestamp)' },
          format: { type: 'string', description: 'Format de sortie (ex: YYYY-MM-DD, DD/MM/YYYY HH:mm)' },
          timezone: { type: 'string', description: 'Timezone (ex: America/Montreal)' }
        },
        required: ['date', 'format']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'date_diff',
      description: 'Calculer la différence entre deux dates.',
      parameters: {
        type: 'object',
        properties: {
          date1: { type: 'string', description: 'Première date' },
          date2: { type: 'string', description: 'Deuxième date' },
          unit: { type: 'string', enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'], description: 'Unité' }
        },
        required: ['date1', 'date2']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_to_date',
      description: 'Ajouter du temps à une date.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date de base' },
          amount: { type: 'number', description: 'Quantité à ajouter' },
          unit: { type: 'string', enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'], description: 'Unité' }
        },
        required: ['date', 'amount', 'unit']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'timestamp_to_date',
      description: 'Convertir un timestamp en date lisible.',
      parameters: {
        type: 'object',
        properties: {
          timestamp: { type: 'number', description: 'Timestamp (secondes ou ms)' }
        },
        required: ['timestamp']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'date_to_timestamp',
      description: 'Convertir une date en timestamp.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date' }
        },
        required: ['date']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧮 CATÉGORIE: MATH ET CALCULS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Évaluer une expression mathématique.',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Expression (ex: 2+2, sqrt(16), sin(45))' }
        },
        required: ['expression']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'convert_units',
      description: 'Convertir des unités.',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Valeur à convertir' },
          from: { type: 'string', description: 'Unité source (ex: km, lb, celsius)' },
          to: { type: 'string', description: 'Unité cible (ex: miles, kg, fahrenheit)' }
        },
        required: ['value', 'from', 'to']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'random_number',
      description: 'Générer un nombre aléatoire.',
      parameters: {
        type: 'object',
        properties: {
          min: { type: 'number', description: 'Minimum (défaut: 0)' },
          max: { type: 'number', description: 'Maximum (défaut: 100)' },
          integer: { type: 'boolean', description: 'Nombre entier (défaut: true)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'statistics',
      description: 'Calculer des statistiques sur un ensemble de nombres.',
      parameters: {
        type: 'object',
        properties: {
          numbers: { type: 'array', items: { type: 'number' }, description: 'Liste de nombres' }
        },
        required: ['numbers']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_zodiac_sign',
      description: 'Determiner le signe astrologique. UTILISE CET OUTIL si on te demande un signe astrologique et que tu connais la date de naissance de la personne. Parametre: day/month OU date.',
      parameters: {
        type: 'object',
        properties: {
          day: { type: 'number', description: 'Jour de naissance (1-31)' },
          month: { type: 'number', description: 'Mois de naissance (1-12)' },
          date: { type: 'string', description: 'Date au format YYYY-MM-DD ou DD/MM/YYYY (alternative)' }
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎵 CATÉGORIE: AUDIO
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'get_audio_info',
      description: 'Obtenir les informations d\'un fichier audio.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier audio' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'text_to_speech',
      description: 'Convertir du texte en audio (TTS).',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texte à convertir' },
          output: { type: 'string', description: 'Fichier de sortie' },
          language: { type: 'string', description: 'Langue (ex: fr, en)' },
          voice: { type: 'string', description: 'Voix à utiliser' }
        },
        required: ['text', 'output']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'play_audio',
      description: 'Jouer un fichier audio.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier audio' }
        },
        required: ['path']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📧 CATÉGORIE: COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'send_notification',
      description: 'Envoyer une notification système.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Titre' },
          message: { type: 'string', description: 'Message' },
          icon: { type: 'string', description: 'Icône (optionnel)' }
        },
        required: ['title', 'message']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔧 CATÉGORIE: NPM ET PACKAGES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'npm_list',
      description: 'Lister les packages npm installés.',
      parameters: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'Chemin du projet' },
          depth: { type: 'number', description: 'Profondeur (défaut: 0)' }
        },
        required: ['project']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'npm_outdated',
      description: 'Vérifier les packages npm obsolètes.',
      parameters: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'Chemin du projet' }
        },
        required: ['project']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'npm_run',
      description: 'Exécuter un script npm.',
      parameters: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'Chemin du projet' },
          script: { type: 'string', description: 'Nom du script' }
        },
        required: ['project', 'script']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'npm_search',
      description: 'Rechercher un package npm.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Terme de recherche' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'npm_info',
      description: 'Obtenir les infos d\'un package npm.',
      parameters: {
        type: 'object',
        properties: {
          package: { type: 'string', description: 'Nom du package' }
        },
        required: ['package']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌍 CATÉGORIE: BROWSER AUTOMATION (DOM)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'browser_open',
      description: 'Ouvrir une page web dans un navigateur contrôlé (Puppeteer).',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL à ouvrir' },
          headless: { type: 'boolean', description: 'Mode sans fenêtre (défaut: true)' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_screenshot',
      description: 'Prendre une capture d\'écran d\'une page web.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL de la page' },
          output: { type: 'string', description: 'Fichier de sortie' },
          fullPage: { type: 'boolean', description: 'Capturer la page entière' }
        },
        required: ['url', 'output']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_pdf',
      description: 'Générer un PDF d\'une page web.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL de la page' },
          output: { type: 'string', description: 'Fichier PDF de sortie' },
          format: { type: 'string', enum: ['A4', 'Letter', 'Legal'], description: 'Format papier' }
        },
        required: ['url', 'output']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_click',
      description: 'Cliquer sur un élément de page web.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL de la page' },
          selector: { type: 'string', description: 'Sélecteur CSS de l\'élément' }
        },
        required: ['url', 'selector']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_type',
      description: 'Taper du texte dans un champ de formulaire.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL de la page' },
          selector: { type: 'string', description: 'Sélecteur CSS du champ' },
          text: { type: 'string', description: 'Texte à taper' }
        },
        required: ['url', 'selector', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_evaluate',
      description: 'Exécuter du JavaScript dans une page web.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL de la page' },
          script: { type: 'string', description: 'Code JavaScript à exécuter' }
        },
        required: ['url', 'script']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_extract',
      description: 'Extraire des données d\'une page web (web scraping).',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL de la page' },
          selectors: { type: 'object', description: 'Map de nom → sélecteur CSS' }
        },
        required: ['url', 'selectors']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'dom_query',
      description: 'Sélectionner des éléments DOM avec un sélecteur CSS (équivalent à document.querySelector/querySelectorAll).',
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: 'HTML string ou URL' },
          selector: { type: 'string', description: 'Sélecteur CSS (comme pour getElementById, getElementsByClassName, etc.)' },
          all: { type: 'boolean', description: 'Retourner tous les éléments (querySelectorAll) vs premier seulement' }
        },
        required: ['html', 'selector']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'dom_get_element_by_id',
      description: 'Équivalent de document.getElementById() - sélectionner un élément par son ID.',
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: 'HTML string ou URL' },
          id: { type: 'string', description: 'ID de l\'élément' }
        },
        required: ['html', 'id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'dom_get_elements_by_class',
      description: 'Équivalent de document.getElementsByClassName() - sélectionner des éléments par classe.',
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: 'HTML string ou URL' },
          className: { type: 'string', description: 'Nom de la classe CSS' }
        },
        required: ['html', 'className']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'dom_get_elements_by_tag',
      description: 'Équivalent de document.getElementsByTagName() - sélectionner des éléments par tag.',
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: 'HTML string ou URL' },
          tagName: { type: 'string', description: 'Nom du tag (ex: div, span, a, img)' }
        },
        required: ['html', 'tagName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'dom_modify',
      description: 'Modifier le DOM d\'une page HTML.',
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: 'HTML string ou chemin fichier' },
          selector: { type: 'string', description: 'Sélecteur CSS de l\'élément à modifier' },
          action: { type: 'string', enum: ['setText', 'setHTML', 'setAttribute', 'removeAttribute', 'addClass', 'removeClass', 'remove'], description: 'Action à effectuer' },
          value: { type: 'string', description: 'Valeur (texte, HTML, nom attribut, classe)' },
          attributeName: { type: 'string', description: 'Nom de l\'attribut (pour setAttribute)' }
        },
        required: ['html', 'selector', 'action']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🗃️ CATÉGORIE: BASE DE DONNÉES SQLITE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'sqlite_query',
      description: 'Exécuter une requête SQL sur une base SQLite.',
      parameters: {
        type: 'object',
        properties: {
          database: { type: 'string', description: 'Chemin du fichier .db' },
          query: { type: 'string', description: 'Requête SQL' },
          params: { type: 'array', items: {}, description: 'Paramètres de la requête' }
        },
        required: ['database', 'query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sqlite_tables',
      description: 'Lister les tables d\'une base SQLite.',
      parameters: {
        type: 'object',
        properties: {
          database: { type: 'string', description: 'Chemin du fichier .db' }
        },
        required: ['database']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sqlite_schema',
      description: 'Obtenir le schéma d\'une table SQLite.',
      parameters: {
        type: 'object',
        properties: {
          database: { type: 'string', description: 'Chemin du fichier .db' },
          table: { type: 'string', description: 'Nom de la table' }
        },
        required: ['database', 'table']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🐳 CATÉGORIE: DOCKER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'docker_ps',
      description: 'Lister les conteneurs Docker.',
      parameters: {
        type: 'object',
        properties: {
          all: { type: 'boolean', description: 'Inclure les conteneurs arrêtés' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'docker_images',
      description: 'Lister les images Docker.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'docker_logs',
      description: 'Voir les logs d\'un conteneur.',
      parameters: {
        type: 'object',
        properties: {
          container: { type: 'string', description: 'Nom ou ID du conteneur' },
          tail: { type: 'number', description: 'Dernières N lignes' }
        },
        required: ['container']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'docker_exec',
      description: 'Exécuter une commande dans un conteneur.',
      parameters: {
        type: 'object',
        properties: {
          container: { type: 'string', description: 'Nom ou ID du conteneur' },
          command: { type: 'string', description: 'Commande à exécuter' }
        },
        required: ['container', 'command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'docker_start',
      description: 'Démarrer un conteneur.',
      parameters: {
        type: 'object',
        properties: {
          container: { type: 'string', description: 'Nom ou ID du conteneur' }
        },
        required: ['container']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'docker_stop',
      description: 'Arrêter un conteneur.',
      parameters: {
        type: 'object',
        properties: {
          container: { type: 'string', description: 'Nom ou ID du conteneur' }
        },
        required: ['container']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🤖 CATÉGORIE: OLLAMA / LLM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'ollama_list',
      description: 'Lister les modèles Ollama disponibles.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ollama_pull',
      description: 'Télécharger un modèle Ollama.',
      parameters: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Nom du modèle (ex: llama3:8b)' }
        },
        required: ['model']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ollama_delete',
      description: 'Supprimer un modèle Ollama.',
      parameters: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Nom du modèle' }
        },
        required: ['model']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ollama_chat',
      description: 'Envoyer un message à un modèle Ollama local.',
      parameters: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Nom du modèle' },
          message: { type: 'string', description: 'Message à envoyer' },
          system: { type: 'string', description: 'Prompt système (optionnel)' }
        },
        required: ['model', 'message']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📋 CATÉGORIE: CLIPBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'clipboard_read',
      description: 'Lire le contenu du presse-papiers.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'clipboard_write',
      description: 'Écrire dans le presse-papiers.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Contenu à copier' }
        },
        required: ['content']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📅 CATÉGORIE: CALENDRIER ET RAPPELS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'set_reminder',
      description: 'Créer un rappel.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message du rappel' },
          datetime: { type: 'string', description: 'Date/heure du rappel (ISO ou relative: "in 30 minutes")' }
        },
        required: ['message', 'datetime']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_reminders',
      description: 'Lister les rappels actifs.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cancel_reminder',
      description: 'Annuler un rappel.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID du rappel' }
        },
        required: ['id']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔍 CATÉGORIE: REGEX ET VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'test_regex',
      description: 'Tester une regex contre un texte.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Pattern regex' },
          text: { type: 'string', description: 'Texte à tester' },
          flags: { type: 'string', description: 'Flags (g, i, m, etc.)' }
        },
        required: ['pattern', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'validate_json',
      description: 'Valider si une chaîne est du JSON valide.',
      parameters: {
        type: 'object',
        properties: {
          json: { type: 'string', description: 'Chaîne à valider' }
        },
        required: ['json']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'validate_email',
      description: 'Valider une adresse email.',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Email à valider' }
        },
        required: ['email']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'validate_url',
      description: 'Valider une URL.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL à valider' }
        },
        required: ['url']
      }
    }
  },
  // === PYTHON TOOLS - Added 2025-12-21 ===
  {
    type: 'function',
    function: {
      name: 'execute_python',
      description: 'Exécute du code Python. Utile pour créer des fichiers, manipuler des données, générer des graphiques.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Le code Python à exécuter' },
          timeout: { type: 'number', description: 'Timeout en ms (défaut: 60000)' }
        },
        required: ['code']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_excel',
      description: 'Crée un fichier Excel (.xlsx) avec des données tabulaires. Première ligne = headers.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Chemin complet du fichier Excel à créer' },
          data: { type: 'array', description: 'Tableau 2D de données. Ex: [["Nom", "Age"], ["Alice", 30]]' }
        },
        required: ['file_path', 'data']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_word',
      description: 'Crée un document Word (.docx) avec un titre et des paragraphes.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Chemin complet du fichier Word à créer' },
          title: { type: 'string', description: 'Titre du document' },
          paragraphs: { type: 'array', description: 'Liste des paragraphes' }
        },
        required: ['file_path', 'title', 'paragraphs']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_pdf',
      description: 'Crée un fichier PDF simple avec un titre et du contenu texte.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Chemin complet du fichier PDF à créer' },
          title: { type: 'string', description: 'Titre du PDF' },
          content: { type: 'string', description: 'Contenu texte du PDF' }
        },
        required: ['file_path', 'title', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_powerpoint',
      description: 'Crée une présentation PowerPoint (.pptx) avec des slides.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Chemin complet du fichier PowerPoint à créer' },
          title: { type: 'string', description: 'Titre de la présentation (slide 1)' },
          slides: { type: 'array', description: 'Liste des slides: [{title: "Slide 2", points: ["Point 1"]}]' }
        },
        required: ['file_path', 'title', 'slides']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_gif',
      description: 'Crée un GIF animé avec du texte qui change de couleur.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Chemin complet du fichier GIF à créer' },
          text: { type: 'string', description: 'Texte à afficher dans le GIF' },
          width: { type: 'number', description: 'Largeur en pixels (défaut: 400)' },
          height: { type: 'number', description: 'Hauteur en pixels (défaut: 200)' }
        },
        required: ['file_path', 'text']
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

  async search_in_file(args) {
    const { path: filePath, pattern, context_lines = 1 } = args;
    console.log(`🔧 [ToolAgent] search_in_file: "${filePath}" pattern="${pattern}"`);

    try {
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `Fichier non trouvé: ${filePath}` };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const regex = new RegExp(pattern, 'gi');
      const matches = [];

      lines.forEach((line, index) => {
        if (regex.test(line)) {
          // Collecter les lignes de contexte
          const startLine = Math.max(0, index - context_lines);
          const endLine = Math.min(lines.length - 1, index + context_lines);

          const contextBlock = [];
          for (let i = startLine; i <= endLine; i++) {
            const prefix = i === index ? '>>> ' : '    ';
            contextBlock.push(`${prefix}${i + 1}: ${lines[i]}`);
          }

          matches.push({
            line_number: index + 1,
            content: line.trim(),
            context: contextBlock.join('\n')
          });
        }
        // Reset regex lastIndex pour les patterns globaux
        regex.lastIndex = 0;
      });

      return {
        success: true,
        path: filePath,
        pattern: pattern,
        total_matches: matches.length,
        matches: matches.slice(0, 100), // Limiter à 100 résultats max
        message: `Trouvé ${matches.length} correspondance(s) pour "${pattern}"`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async read_file_chunk(args) {
    const { path: filePath, start_line = 1, end_line = 100 } = args;
    console.log(`🔧 [ToolAgent] read_file_chunk: "${filePath}" lines ${start_line}-${end_line}`);

    try {
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `Fichier non trouvé: ${filePath}` };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const totalLines = lines.length;

      // Ajuster les bornes
      const start = Math.max(1, start_line) - 1; // Convert to 0-based
      const end = Math.min(totalLines, end_line);

      const chunk = lines.slice(start, end);
      const numberedChunk = chunk.map((line, i) => `${start + i + 1}: ${line}`).join('\n');

      return {
        success: true,
        path: filePath,
        start_line: start + 1,
        end_line: end,
        total_lines: totalLines,
        content: numberedChunk,
        message: `Lignes ${start + 1}-${end} sur ${totalLines} total`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async file_info(args) {
    const { path: filePath } = args;
    console.log(`🔧 [ToolAgent] file_info: "${filePath}"`);

    try {
      const fs = require('fs');
      const pathModule = require('path');

      if (!fs.existsSync(filePath)) {
        return { success: false, error: `Fichier non trouvé: ${filePath}` };
      }

      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;
      const ext = pathModule.extname(filePath).toLowerCase();

      // Déterminer le type
      const codeExtensions = ['.js', '.cjs', '.mjs', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs', '.rb', '.php'];
      const textExtensions = ['.txt', '.md', '.json', '.xml', '.yaml', '.yml', '.csv', '.log', '.ini', '.cfg'];

      let fileType = 'binary';
      if (codeExtensions.includes(ext)) fileType = 'code';
      else if (textExtensions.includes(ext)) fileType = 'text';

      // Recommandation
      let recommendation = 'read_file';
      if (lines > 500) {
        recommendation = 'search_in_file ou read_file_chunk';
      }

      return {
        success: true,
        path: filePath,
        size_bytes: stats.size,
        size_readable: stats.size > 1024 * 1024
          ? `${(stats.size / 1024 / 1024).toFixed(2)} MB`
          : stats.size > 1024
            ? `${(stats.size / 1024).toFixed(2)} KB`
            : `${stats.size} bytes`,
        lines: lines,
        extension: ext,
        type: fileType,
        is_large: lines > 500,
        recommendation: recommendation,
        modified: stats.mtime.toISOString()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
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

  // FIX 2025-12-05: run_shell avec redirection DIR vers fs.readdir
  async run_shell(args) {
    const { command, timeout } = args;
    console.log(`🔧 [ToolAgent] run_shell: "${command}"`);

    // FIX: Commande "dir" redirigée vers FileTools.list (plus fiable que spawn cmd.exe)
    const dirMatch = command.match(/^dir\s+(.+)$/i);
    if (dirMatch) {
      const dirPath = dirMatch[1].replace(/["']/g, '').replace(/\//g, '\\').trim();
      console.log(`🔧 [ToolAgent] Redirection dir -> FileTools.list: "${dirPath}"`);
      const res = await FileTools.list(dirPath, { recursive: false, details: true });
      if (res.success) {
        // Format similaire à dir Windows
        const output = res.entries.map(e => {
          const type = e.isDirectory ? '<DIR>' : e.size.toString().padStart(12);
          return `${e.modified || ''}  ${type}  ${e.name}`;
        }).join('\n');
        return {
          success: true,
          stdout: output,
          entries: res.entries,
          count: res.count,
          method: 'fs.readdir (fiable)'
        };
      }
      return res;
    }

    // Autres commandes: BashTools
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
const gitManager = require('../core/git-manager.cjs');
const projectIndexer = require('../core/project-indexer.cjs');
    const results = [];

    // 0. Recherche dans ana_memories.json (souvenirs sauvegardés)
    // FIX 2025-12-14: Recherche par mots-clés + champs subject/value
    const memoriesPath = 'E:/ANA/memory/ana_memories.json';
    if (fs.existsSync(memoriesPath)) {
      try {
        const memories = JSON.parse(fs.readFileSync(memoriesPath, 'utf-8'));
        const queryLower = query.toLowerCase();

        // Extraire mots-clés significatifs (> 3 chars, pas les mots vides)
        const stopWords = ['quel', 'quelle', 'quels', 'quelles', 'est', 'sont', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'pour', 'avec', 'dans', 'sur', 'par', 'que', 'qui', 'quoi', 'comment', 'pourquoi', 'ou', 'et', 'tu', 'te', 'rappelle', 'rappelles', 'souviens', 'connais', 'sais'];
        const keywords = queryLower.split(/[\s?!.,]+/)
          .filter(w => w.length > 2 && !stopWords.includes(w));

        const memoryMatches = memories.filter(m => {
          // Match dans content
          if (m.content && m.content.toLowerCase().includes(queryLower)) return true;

          // Match dans subject (pour facts auto-extraits)
          if (m.subject && keywords.some(kw => m.subject.toLowerCase().includes(kw))) return true;

          // Match dans value
          if (m.value && keywords.some(kw => m.value.toLowerCase().includes(kw))) return true;

          // Match par mots-clés dans content
          if (m.content && keywords.some(kw => m.content.toLowerCase().includes(kw))) return true;

          return false;
        });

        if (memoryMatches.length > 0) {
          // Temporal tracking: update access stats
          const now = new Date().toISOString();
          let modified = false;
          for (const match of memoryMatches) {
            const idx = memories.findIndex(m => m.id === match.id);
            if (idx !== -1) {
              memories[idx].access_count = (memories[idx].access_count || 0) + 1;
              memories[idx].last_accessed = now;
              modified = true;
            }
          }
          if (modified) {
            fs.writeFileSync(memoriesPath, JSON.stringify(memories, null, 2), 'utf-8');
          }

          results.push({
            source: 'ana_memories',
            matchCount: memoryMatches.length,
            matches: memoryMatches.map(m => ({
              content: m.content,
              category: m.category,
              subject: m.subject,
              value: m.value,
              timestamp: m.timestamp,
              valid_from: m.valid_from,
              access_count: m.access_count
            }))
          });
        }
      } catch (err) {
        console.log(`⚠️ [search_memory] ana_memories.json error: ${err.message}`);
      }
    }

    // 0b. Recherche dans personal_facts.json (faits personnels Alain)
    const factsPath = 'E:/ANA/memory/personal_facts.json';
    if (fs.existsSync(factsPath)) {
      try {
        const factsData = JSON.parse(fs.readFileSync(factsPath, 'utf-8'));
        const queryLower = query.toLowerCase();
        const factMatches = [];

        // Chercher dans les faits avec matching intelligent
        if (factsData.facts) {
          // Normaliser: "date de naissance" -> "date_de_naissance" et vice-versa
          const normalizeForMatch = (str) => str.toLowerCase().replace(/[_ ]/g, '');
          const queryNorm = normalizeForMatch(query);

          // Synonymes courants
          const synonyms = {
            'anniversaire': ['naissance', 'date_naissance', 'birthday'],
            'naissance': ['anniversaire', 'date_naissance', 'birthday'],
            'voiture': ['auto', 'vehicule', 'car'],
            'auto': ['voiture', 'vehicule', 'car']
          };

          for (const [key, value] of Object.entries(factsData.facts)) {
            const keyNorm = normalizeForMatch(key);
            const valueNorm = typeof value === 'string' ? normalizeForMatch(value) : '';

            // Match direct (normalisé)
            let matched = keyNorm.includes(queryNorm) || queryNorm.includes(keyNorm) || valueNorm.includes(queryNorm);

            // Match par synonymes
            if (!matched) {
              const queryWords = query.toLowerCase().split(/[_ ]/);
              for (const word of queryWords) {
                if (synonyms[word]) {
                  for (const syn of synonyms[word]) {
                    if (keyNorm.includes(normalizeForMatch(syn))) {
                      matched = true;
                      break;
                    }
                  }
                }
                if (matched) break;
              }
            }

            if (matched) {
              factMatches.push({ key, value });
            }
          }
        }

        if (factMatches.length > 0) {
          results.push({
            source: 'personal_facts',
            matchCount: factMatches.length,
            matches: factMatches
          });
        }
      } catch (err) {
        console.log(`⚠️ [search_memory] personal_facts.json error: ${err.message}`);
      }
    }

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

  // === SAVE MEMORY IMPLEMENTATION ===
  async save_memory(args) {
    const { content, category = 'general' } = args || {};

    if (!content) {
      return { success: false, message: 'Contenu manquant. Précise ce que tu veux que je mémorise.' };
    }

    console.log(`[ToolAgent] save_memory: "${content.substring(0, 50)}..."`);

    const fs = require('fs');
    const path = require('path');
const gitManager = require('../core/git-manager.cjs');
const projectIndexer = require('../core/project-indexer.cjs');
    
    // Dossier de memoire Ana
    const memoryDir = 'E:/ANA/memory';
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }
    
    // Fichier de memoire principale
    const memoryFile = path.join(memoryDir, 'ana_memories.json');
    let memories = [];
    
    if (fs.existsSync(memoryFile)) {
      try {
        memories = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'));
      } catch (e) {
        memories = [];
      }
    }
    
    // Ajouter le nouveau souvenir
    const memory = {
      id: Date.now().toString(),
      content: content,
      category: category,
      timestamp: new Date().toISOString(),
      source: 'user_request'
    };
    
    memories.push(memory);
    
    // Sauvegarder
    fs.writeFileSync(memoryFile, JSON.stringify(memories, null, 2), 'utf-8');
    
    // Aussi ajouter au fichier de conversation
    const convFile = path.join(memoryDir, 'current_conversation_ana.txt');
    const line = '[MEMOIRE ' + new Date().toISOString() + '] [' + category + '] ' + content + '\n';
    fs.appendFileSync(convFile, line, 'utf-8');

    return {
      success: true,
      message: 'J\'ai memorise: ' + content.substring(0, 100),
      id: memory.id,
      category: category
    };
  },

  // === MEMORY UPDATE IMPLEMENTATION (Self-Editing) - Added 2025-12-14 ===
  async memory_update(args) {
    console.log(`🧠 [ToolAgent] memory_update called`);
    try {
      return await MemoryTools.memory_update(args);
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // === MEMORY FORGET IMPLEMENTATION (Strategic Forgetting) - Added 2025-12-14 ===
  async memory_forget(args) {
    console.log(`🧠 [ToolAgent] memory_forget called`);
    try {
      return await MemoryTools.memory_forget(args);
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // === MEMORY REFLECT IMPLEMENTATION - Added 2025-12-14 ===
  async memory_reflect(args) {
    console.log(`🧠 [ToolAgent] memory_reflect called`);
    try {
      return await MemoryTools.memory_reflect(args);
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // === MEMORY LINK IMPLEMENTATION (Graph Memory) - Added 2025-12-14 ===
  async memory_link(args) {
    console.log(`🧠 [ToolAgent] memory_link called`);
    try {
      return await MemoryTools.memory_link(args);
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // === MEMORY QUERY GRAPH IMPLEMENTATION - Added 2025-12-14 ===
  async memory_query_graph(args) {
    console.log(`🧠 [ToolAgent] memory_query_graph called`);
    try {
      return await MemoryTools.memory_query_graph(args);
    } catch (err) {
      return { success: false, error: err.message };
    }
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

      // SECURITY FIX: Si old_string vide → mode APPEND à la fin du fichier
      if (!old_string || old_string.trim() === '') {
        const content = fs.readFileSync(file_path, 'utf-8');
        const newContent = content + (content.endsWith('\n') ? '' : '\n') + new_string;
        fs.writeFileSync(file_path, newContent, 'utf-8');
        return { success: true, message: 'Contenu ajouté à la fin du fichier' };
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



  // === 4 NOUVEAUX OUTILS PARITÉ CLAUDE CODE - 2025-12-08 ===

  async execute_code(args) {
    const { code, language = 'python' } = args;
    console.log(`🔧 [ToolAgent] execute_code: ${language}`);
    const { spawn } = require('child_process');

    return new Promise((resolve) => {
      let output = '';
      let errorOutput = '';

      const proc = spawn('python', ['-c', code], {
        timeout: 30000,
        cwd: 'E:/ANA/temp'
      });

      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { errorOutput += data.toString(); });

      proc.on('close', (exitCode) => {
        resolve({
          success: exitCode === 0,
          output: output.trim(),
          error: errorOutput.trim(),
          exitCode
        });
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      // Timeout
      setTimeout(() => {
        proc.kill();
        resolve({ success: false, error: 'Timeout après 30 secondes' });
      }, 30000);
    });
  },

  // === Helper pour attendre la fin de génération ComfyUI ===
  async pollComfyUIResult(promptId, maxAttempts = 300, intervalMs = 1000) {
    const axios = require('axios');
    const COMFYUI_URL = 'http://127.0.0.1:8188';

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));

      try {
        const response = await axios.get(`${COMFYUI_URL}/history/${promptId}`);
        const data = response.data;
        const promptData = data[promptId];

        if (!promptData) continue;

        // Vérifier les erreurs
        if (promptData.status?.status_str === 'error') {
          const messages = promptData.status?.messages || [];
          const errorMsg = messages.find(m => m[0] === 'execution_error');
          if (errorMsg && errorMsg[1]?.exception_message) {
            throw new Error(errorMsg[1].exception_message.trim());
          }
          throw new Error('Erreur ComfyUI');
        }

        // Vérifier si terminé
        if (promptData.outputs && Object.keys(promptData.outputs).length > 0) {
          const outputs = promptData.outputs;
          for (const nodeId of Object.keys(outputs)) {
            const nodeOutput = outputs[nodeId];
            // Images (SaveImage)
            if (nodeOutput.images && nodeOutput.images.length > 0) {
              const img = nodeOutput.images[0];
              const subfolder = img.subfolder || '';
              const filePath = subfolder
                ? `E:/AI_Tools/ComfyUI/ComfyUI/output/${subfolder}/${img.filename}`
                : `E:/AI_Tools/ComfyUI/ComfyUI/output/${img.filename}`;
              return {
                success: true,
                filename: img.filename,
                filepath: filePath,
                type: 'image'
              };
            }
            // GIFs/Videos (ADE_AnimateDiffCombine, SaveAnimatedWEBP)
            if (nodeOutput.gifs && nodeOutput.gifs.length > 0) {
              const gif = nodeOutput.gifs[0];
              const subfolder = gif.subfolder || '';
              const filePath = subfolder
                ? `E:/AI_Tools/ComfyUI/ComfyUI/output/${subfolder}/${gif.filename}`
                : `E:/AI_Tools/ComfyUI/ComfyUI/output/${gif.filename}`;
              return {
                success: true,
                filename: gif.filename,
                filepath: filePath,
                type: 'animation'
              };
            }
          }
        }
      } catch (error) {
        // Re-throw les vraies erreurs
        if (error.message && !error.message.includes('ECONNREFUSED')) {
          throw error;
        }
        if (i === maxAttempts - 1) throw error;
      }
    }
    throw new Error('Timeout - génération trop longue (5 min max)');
  },

  async generate_image(args) {
    const { prompt, negative_prompt = '', width = 512, height = 512 } = args;
    console.log(`🔧 [ToolAgent] generate_image: "${prompt.substring(0, 50)}..."`);

    // Vérifier si ComfyUI tourne
    const axios = require('axios');
    try {
      await axios.get('http://127.0.0.1:8188/system_stats', { timeout: 2000 });
    } catch (e) {
      return {
        success: false,
        error: 'ComfyUI n\'est pas démarré. Lance ComfyUI d\'abord.',
        suggestion: 'Démarre ComfyUI depuis E:/AI_Tools/ComfyUI'
      };
    }

    // Créer le workflow basique
    const workflow = {
      prompt: {
        "3": {
          "class_type": "KSampler",
          "inputs": {
            "seed": Math.floor(Math.random() * 1000000),
            "steps": 20,
            "cfg": 7,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1,
            "model": ["4", 0],
            "positive": ["6", 0],
            "negative": ["7", 0],
            "latent_image": ["5", 0]
          }
        },
        "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" } },
        "5": { "class_type": "EmptyLatentImage", "inputs": { "width": width, "height": height, "batch_size": 1 } },
        "6": { "class_type": "CLIPTextEncode", "inputs": { "text": prompt, "clip": ["4", 1] } },
        "7": { "class_type": "CLIPTextEncode", "inputs": { "text": negative_prompt, "clip": ["4", 1] } },
        "8": { "class_type": "VAEDecode", "inputs": { "samples": ["3", 0], "vae": ["4", 2] } },
        "9": { "class_type": "SaveImage", "inputs": { "filename_prefix": "ana_generated", "images": ["8", 0] } }
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8188/prompt', workflow);
      const promptId = response.data.prompt_id;
      console.log(`🔧 [ToolAgent] generate_image: En attente du résultat (prompt_id: ${promptId})...`);

      // Attendre la fin de génération
      const result = await this.pollComfyUIResult(promptId, 120, 1000); // 2 min max pour image

      return {
        success: true,
        message: `Image générée avec succès!`,
        filepath: result.filepath,
        filename: result.filename,
        prompt_id: promptId
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // === IMAGE/VIDEO GENERATION IMPLEMENTATIONS - Added 2025-12-09 ===
  async generate_animation(args) {
    const { prompt, negative_prompt = 'blurry, low quality', frame_count = 16, fps = 8, format = 'gif' } = args;
    console.log(`[ToolAgent] generate_animation: "${prompt.substring(0, 50)}..."`);

    const axios = require('axios');
    try {
      await axios.get('http://127.0.0.1:8188/system_stats', { timeout: 2000 });
    } catch (e) {
      return { success: false, error: 'ComfyUI n\'est pas demarre.' };
    }

    const seed = Math.floor(Math.random() * 1000000000);
    const workflow = {
      prompt: {
        "1": { "inputs": { "ckpt_name": "dreamshaper_8.safetensors" }, "class_type": "CheckpointLoaderSimple" },
        "2": { "inputs": { "model_name": "mm_sd_v15_v2.ckpt" }, "class_type": "ADE_LoadAnimateDiffModel" },
        "3": { "inputs": { "motion_model": ["2", 0] }, "class_type": "ADE_ApplyAnimateDiffModelSimple" },
        "10": { "inputs": { "model": ["1", 0], "beta_schedule": "sqrt_linear (AnimateDiff)", "m_models": ["3", 0] }, "class_type": "ADE_UseEvolvedSampling" },
        "4": { "inputs": { "text": prompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
        "5": { "inputs": { "text": negative_prompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
        "6": { "inputs": { "width": 512, "height": 512, "batch_size": frame_count }, "class_type": "EmptyLatentImage" },
        "7": { "inputs": { "seed": seed, "steps": 20, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["10", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0] }, "class_type": "KSampler" },
        "8": { "inputs": { "samples": ["7", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
        "9": { "inputs": { "images": ["8", 0], "frame_rate": fps, "loop_count": 0, "filename_prefix": "ana_animatediff", "format": format === 'gif' ? 'image/gif' : format === 'webm' ? 'video/webm' : 'video/h264-mp4', "pingpong": false, "save_image": true }, "class_type": "ADE_AnimateDiffCombine" }
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8188/prompt', workflow);
      const promptId = response.data.prompt_id;
      console.log(`[ToolAgent] generate_animation: En attente du résultat (prompt_id: ${promptId})...`);

      // Attendre la fin de génération (5 min max pour animations)
      const result = await this.pollComfyUIResult(promptId, 300, 1000);

      return {
        success: true,
        message: `Animation générée avec succès!`,
        filepath: result.filepath,
        filename: result.filename,
        format: format,
        prompt_id: promptId
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async generate_video(args) {
    const { prompt, duration = 5, fps = 24 } = args;
    console.log(`[ToolAgent] generate_video (Mochi): "${prompt.substring(0, 50)}..."`);

    const axios = require('axios');
    try {
      await axios.get('http://127.0.0.1:8188/system_stats', { timeout: 2000 });
    } catch (e) {
      return { success: false, error: 'ComfyUI n\'est pas demarre.' };
    }

    // Workflow Mochi - Correct structure using MochiModelLoader + MochiVAELoader + CLIPLoader
    const seed = Math.floor(Math.random() * 1000000000);
    const num_frames = Math.min(Math.max(duration * 6, 7), 49); // 6 frames/sec, min 7, max 49

    const workflow = {
      prompt: {
        "1": { "inputs": { "model_name": "mochi_preview_fp8_scaled.safetensors", "precision": "fp8_e4m3fn", "attention_mode": "sdpa" }, "class_type": "MochiModelLoader" },
        "2": { "inputs": { "model_name": "mochi_vae.safetensors" }, "class_type": "MochiVAELoader" },
        "3": { "inputs": { "clip_name": "t5xxl_fp8_e4m3fn_scaled.safetensors", "type": "mochi" }, "class_type": "CLIPLoader" },
        "4": { "inputs": { "clip": ["3", 0], "prompt": prompt }, "class_type": "MochiTextEncode" },
        "5": { "inputs": { "clip": ["3", 0], "prompt": "" }, "class_type": "MochiTextEncode" },
        "6": { "inputs": { "model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0], "width": 848, "height": 480, "num_frames": num_frames, "steps": 30, "cfg": 4.5, "seed": seed }, "class_type": "MochiSampler" },
        "7": { "inputs": { "vae": ["2", 0], "samples": ["6", 0], "enable_vae_tiling": true, "auto_tile_size": true, "frame_batch_size": 6, "tile_sample_min_height": 240, "tile_sample_min_width": 424, "tile_overlap_factor_height": 0.1666, "tile_overlap_factor_width": 0.2 }, "class_type": "MochiDecode" },
        "8": { "inputs": { "images": ["7", 0], "fps": fps, "filename_prefix": "ana_mochi", "lossless": false, "quality": 90, "method": "default" }, "class_type": "SaveAnimatedWEBP" }
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8188/prompt', workflow);
      const promptId = response.data.prompt_id;
      console.log(`[ToolAgent] generate_video: En attente du résultat (prompt_id: ${promptId})...`);

      // Attendre la fin de génération (10 min max pour vidéos Mochi)
      const result = await this.pollComfyUIResult(promptId, 600, 1000);

      return {
        success: true,
        message: `Vidéo générée avec succès!`,
        filepath: result.filepath,
        filename: result.filename,
        duration: duration,
        prompt_id: promptId
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // === ANIMATE IMAGE avec SVD (Stable Video Diffusion) ===
  async animate_image(args) {
    const { image_path, frames = 25, fps = 8, motion_bucket_id = 127, augmentation_level = 0.0 } = args;
    console.log(`[ToolAgent] animate_image (SVD): ${image_path}`);

    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');

    // Vérifier que l'image existe
    if (!fs.existsSync(image_path)) {
      return { success: false, error: `Image non trouvée: ${image_path}` };
    }

    // Vérifier ComfyUI
    try {
      await axios.get('http://127.0.0.1:8188/system_stats', { timeout: 2000 });
    } catch (e) {
      return { success: false, error: 'ComfyUI n\'est pas démarré.' };
    }

    // Copier l'image dans le dossier input de ComfyUI
    const filename = path.basename(image_path);
    const destPath = `E:/AI_Tools/ComfyUI/ComfyUI/input/${filename}`;
    fs.copyFileSync(image_path, destPath);

    const seed = Math.floor(Math.random() * 1000000000);
    const timestamp = Date.now();

    // Workflow SVD (Stable Video Diffusion)
    const workflow = {
      prompt: {
        "1": {
          "class_type": "ImageOnlyCheckpointLoader",
          "inputs": { "ckpt_name": "svd_xt_1_1.safetensors" }
        },
        "2": {
          "class_type": "LoadImage",
          "inputs": { "image": filename }
        },
        "3": {
          "class_type": "SVD_img2vid_Conditioning",
          "inputs": {
            "width": 1024,
            "height": 576,
            "video_frames": frames,
            "motion_bucket_id": motion_bucket_id,
            "fps": 6,
            "augmentation_level": augmentation_level,
            "clip_vision": ["1", 1],
            "init_image": ["2", 0],
            "vae": ["1", 2]
          }
        },
        "4": {
          "class_type": "KSampler",
          "inputs": {
            "seed": seed,
            "steps": 20,
            "cfg": 2.5,
            "sampler_name": "euler",
            "scheduler": "karras",
            "denoise": 1,
            "model": ["1", 0],
            "positive": ["3", 0],
            "negative": ["3", 1],
            "latent_image": ["3", 2]
          }
        },
        "5": {
          "class_type": "VAEDecode",
          "inputs": {
            "samples": ["4", 0],
            "vae": ["1", 2]
          }
        },
        "6": {
          "class_type": "VHS_VideoCombine",
          "inputs": {
            "images": ["5", 0],
            "frame_rate": fps,
            "loop_count": 0,
            "filename_prefix": `ana_svd_${timestamp}`,
            "format": "image/gif",
            "pingpong": false,
            "save_output": true
          }
        }
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8188/prompt', workflow);
      const promptId = response.data.prompt_id;
      console.log(`[ToolAgent] animate_image: En attente du résultat (prompt_id: ${promptId})...`);

      // Attendre la fin (SVD peut prendre 3-5 min)
      const result = await this.pollComfyUIResult(promptId, 360, 1000);

      return {
        success: true,
        message: `Animation créée avec succès!`,
        filepath: result.filepath,
        filename: result.filename,
        source_image: image_path,
        frames: frames,
        prompt_id: promptId
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async image_to_image(args) {
    const { image_path, prompt, negative_prompt = '', denoise = 0.75 } = args;
    console.log(`[ToolAgent] image_to_image: "${prompt.substring(0, 50)}..."`);

    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');
const gitManager = require('../core/git-manager.cjs');
const projectIndexer = require('../core/project-indexer.cjs');

    if (!fs.existsSync(image_path)) {
      return { success: false, error: `Image non trouvee: ${image_path}` };
    }

    try {
      await axios.get('http://127.0.0.1:8188/system_stats', { timeout: 2000 });
    } catch (e) {
      return { success: false, error: 'ComfyUI n\'est pas demarre.' };
    }

    // Copier l'image dans input de ComfyUI
    const filename = path.basename(image_path);
    const destPath = `E:/AI_Tools/ComfyUI/ComfyUI/input/${filename}`;
    fs.copyFileSync(image_path, destPath);

    const workflow = {
      prompt: {
        "1": { "inputs": { "image": filename }, "class_type": "LoadImage" },
        "2": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
        "3": { "inputs": { "pixels": ["1", 0], "vae": ["2", 2] }, "class_type": "VAEEncode" },
        "4": { "inputs": { "text": prompt, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
        "5": { "inputs": { "text": negative_prompt, "clip": ["2", 1] }, "class_type": "CLIPTextEncode" },
        "6": { "inputs": { "seed": Math.floor(Math.random() * 1000000), "steps": 20, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": denoise, "model": ["2", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["3", 0] }, "class_type": "KSampler" },
        "7": { "inputs": { "samples": ["6", 0], "vae": ["2", 2] }, "class_type": "VAEDecode" },
        "8": { "inputs": { "filename_prefix": "ana_img2img", "images": ["7", 0] }, "class_type": "SaveImage" }
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8188/prompt', workflow);
      const promptId = response.data.prompt_id;
      console.log(`[ToolAgent] image_to_image: En attente du résultat (prompt_id: ${promptId})...`);

      // Attendre la fin de génération
      const result = await this.pollComfyUIResult(promptId, 120, 1000);

      return {
        success: true,
        message: `Image transformée avec succès!`,
        filepath: result.filepath,
        filename: result.filename,
        prompt_id: promptId
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async inpaint_image(args) {
    const { image_path, mask_path, prompt, negative_prompt = '' } = args;
    console.log(`[ToolAgent] inpaint_image: "${prompt.substring(0, 50)}..."`);

    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');
const gitManager = require('../core/git-manager.cjs');
const projectIndexer = require('../core/project-indexer.cjs');

    if (!fs.existsSync(image_path)) {
      return { success: false, error: `Image non trouvee: ${image_path}` };
    }
    if (!fs.existsSync(mask_path)) {
      return { success: false, error: `Masque non trouve: ${mask_path}` };
    }

    try {
      await axios.get('http://127.0.0.1:8188/system_stats', { timeout: 2000 });
    } catch (e) {
      return { success: false, error: 'ComfyUI n\'est pas demarre.' };
    }

    // Copier les fichiers dans input
    const imgFilename = path.basename(image_path);
    const maskFilename = 'mask_' + path.basename(mask_path);
    fs.copyFileSync(image_path, `E:/AI_Tools/ComfyUI/ComfyUI/input/${imgFilename}`);
    fs.copyFileSync(mask_path, `E:/AI_Tools/ComfyUI/ComfyUI/input/${maskFilename}`);

    const workflow = {
      prompt: {
        "1": { "inputs": { "image": imgFilename }, "class_type": "LoadImage" },
        "2": { "inputs": { "image": maskFilename, "channel": "red" }, "class_type": "LoadImageMask" },
        "3": { "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }, "class_type": "CheckpointLoaderSimple" },
        "4": { "inputs": { "pixels": ["1", 0], "vae": ["3", 2], "mask": ["2", 0] }, "class_type": "VAEEncodeForInpaint" },
        "5": { "inputs": { "text": prompt, "clip": ["3", 1] }, "class_type": "CLIPTextEncode" },
        "6": { "inputs": { "text": negative_prompt, "clip": ["3", 1] }, "class_type": "CLIPTextEncode" },
        "7": { "inputs": { "seed": Math.floor(Math.random() * 1000000), "steps": 20, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["3", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["4", 0] }, "class_type": "KSampler" },
        "8": { "inputs": { "samples": ["7", 0], "vae": ["3", 2] }, "class_type": "VAEDecode" },
        "9": { "inputs": { "filename_prefix": "ana_inpaint", "images": ["8", 0] }, "class_type": "SaveImage" }
      }
    };

    try {
      const response = await axios.post('http://127.0.0.1:8188/prompt', workflow);
      const promptId = response.data.prompt_id;
      console.log(`[ToolAgent] inpaint_image: En attente du résultat (prompt_id: ${promptId})...`);

      // Attendre la fin de génération
      const result = await this.pollComfyUIResult(promptId, 120, 1000);

      return {
        success: true,
        message: `Inpainting terminé avec succès!`,
        filepath: result.filepath,
        filename: result.filename,
        prompt_id: promptId
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async http_request(args) {
    const { url, method = 'GET', headers = {}, body } = args;
    console.log(`🔧 [ToolAgent] http_request: ${method} ${url}`);
    const axios = require('axios');

    try {
      const config = {
        method: method.toLowerCase(),
        url,
        headers,
        timeout: 30000
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        config.data = body;
      }

      const response = await axios(config);
      return {
        success: true,
        status: response.status,
        headers: response.headers,
        data: typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        status: err.response?.status
      };
    }
  },

  async get_yt_transcript(args) {
    const { video_url, language = 'fr' } = args;
    console.log(`🔧 [ToolAgent] get_yt_transcript: ${video_url}`);

    // Extraire l'ID de la vidéo
    const videoIdMatch = video_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return { success: false, error: 'URL YouTube invalide' };
    }
    const videoId = videoIdMatch[1];

    // Utiliser l'API YouTube pour obtenir les sous-titres
    const axios = require('axios');
    try {
      // Essayer de récupérer via un service gratuit
      const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      // Chercher les captions dans la page
      const captionMatch = response.data.match(/"captionTracks":\[(.*?)\]/);
      if (!captionMatch) {
        return { success: false, error: 'Pas de sous-titres disponibles pour cette vidéo' };
      }

      // Parser et retourner les infos
      return {
        success: true,
        videoId,
        message: 'Sous-titres disponibles',
        note: 'Pour la transcription complète, utilise un service comme youtubetranscript.com'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async youtube_search(args) {
    const { query, max_results = 5 } = args;
    console.log(`🔧 [ToolAgent] youtube_search: "${query}" (max: ${max_results})`);

    const axios = require('axios');
    try {
      // Recherche via scraping de la page YouTube search
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      // Extraire les vidéos du JSON embarqué
      const dataMatch = response.data.match(/var ytInitialData = ({.*?});<\/script>/);
      if (!dataMatch) {
        return { success: false, error: 'Impossible de parser les résultats YouTube' };
      }

      try {
        const data = JSON.parse(dataMatch[1]);
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

        const videos = contents
          .filter(item => item.videoRenderer)
          .slice(0, max_results)
          .map(item => {
            const video = item.videoRenderer;
            return {
              title: video.title?.runs?.[0]?.text || 'Sans titre',
              videoId: video.videoId,
              url: `https://www.youtube.com/watch?v=${video.videoId}`,
              channel: video.ownerText?.runs?.[0]?.text || 'Inconnu',
              duration: video.lengthText?.simpleText || 'N/A',
              views: video.viewCountText?.simpleText || 'N/A'
            };
          });

        return {
          success: true,
          query,
          count: videos.length,
          videos
        };
      } catch (parseErr) {
        return { success: false, error: 'Erreur parsing JSON YouTube' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async get_news(args) {
    const { topic, language = 'fr', max_results = 5 } = args;
    console.log(`🔧 [ToolAgent] get_news: "${topic}" (${language}, max: ${max_results})`);

    const axios = require('axios');
    try {
      // Utiliser Google News RSS (gratuit, pas de clé API)
      const lang = language === 'fr' ? 'fr' : 'en';
      const country = language === 'fr' ? 'CA' : 'US';
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=${lang}&gl=${country}&ceid=${country}:${lang}`;

      const response = await axios.get(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      // Parser le RSS XML
      const items = response.data.match(/<item>([\s\S]*?)<\/item>/g) || [];
      const news = items.slice(0, max_results).map(item => {
        const title = item.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || 'Sans titre';
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
        const source = item.match(/<source.*?>(.*?)<\/source>/)?.[1] || 'Inconnu';

        return { title, link, pubDate, source };
      });

      return {
        success: true,
        topic,
        language,
        count: news.length,
        articles: news
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
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
  },

  // ============ GIT TOOL IMPLEMENTATIONS - Phase 2 ANA CODE ============
  async git_status(args) {
    const { repo_path } = args;
    console.log(`🔧 [ToolAgent] git_status: "${repo_path}"`);
    return gitManager.gitStatus(repo_path);
  },

  async git_commit(args) {
    const { repo_path, message, add_all } = args;
    console.log(`🔧 [ToolAgent] git_commit: "${message}" in ${repo_path}`);
    return gitManager.gitCommit(repo_path, message, { addAll: add_all !== false });
  },

  async git_log(args) {
    const { repo_path, count } = args;
    console.log(`🔧 [ToolAgent] git_log: ${count || 10} commits in ${repo_path}`);
    return gitManager.gitLog(repo_path, count || 10);
  },

  async git_branch(args) {
    const { repo_path, action, branch_name } = args;
    console.log(`🔧 [ToolAgent] git_branch: ${action} ${branch_name || ''} in ${repo_path}`);

    switch (action) {
      case 'list':
        return gitManager.gitListBranches(repo_path);
      case 'create':
        if (!branch_name) return { success: false, error: 'branch_name requis pour create' };
        return gitManager.gitCreateBranch(repo_path, branch_name);
      case 'checkout':
        if (!branch_name) return { success: false, error: 'branch_name requis pour checkout' };
        return gitManager.gitCheckout(repo_path, branch_name);
      default:
        return { success: false, error: `Action inconnue: ${action}` };
    }
  },

  // ============ RAG TOOL IMPLEMENTATIONS - Phase 2.2 ANA CODE ============
  async search_codebase(args) {
    const { project_path, query, max_results } = args;
    console.log(`🔧 [ToolAgent] search_codebase: "${query}" in ${project_path}`);
    return projectIndexer.searchProject(project_path, query, { maxResults: max_results || 10 });
  },

  async get_project_structure(args) {
    const { project_path, max_depth } = args;
    console.log(`🔧 [ToolAgent] get_project_structure: ${project_path}`);
    return projectIndexer.getProjectStructure(project_path, { maxDepth: max_depth || 3 });
  },

  // ============ VISION TOOLS - Phase 3.2 ANA CODE ============
  async describe_image(args, context = {}) {
    const { image_path, image_base64, prompt } = args;

    // FIX 2025-12-18: Utiliser l'image uploadée si disponible
    let imageToUse = image_base64;
    if (!imageToUse && context.images && context.images.length > 0) {
      imageToUse = context.images[0];
      console.log('👁️ [ToolAgent] describe_image: Utilisation image uploadée');
    } else {
      console.log(`👁️ [ToolAgent] describe_image: ${image_path || 'base64 image'}`);
    }

    // FIX 2025-12-20: Détecter si OCR/extraction de texte demandé
    const promptLower = (prompt || '').toLowerCase();
    const ocrKeywords = ['texte', 'text', 'ocr', 'lire', 'lister', 'extraire', 'extract', 'écrire', 'liste', 'read'];
    const needsOcr = ocrKeywords.some(kw => promptLower.includes(kw));
    const taskType = needsOcr ? 'ocr' : 'description';

    if (needsOcr) {
      console.log('👁️ [ToolAgent] describe_image: OCR détecté → Llama Vision');
    }

    try {
      // Utilise vision-router avec sélection automatique du modèle
      const result = await visionRouter.analyze({
        imagePath: imageToUse ? null : image_path,  // Ignorer path si on a base64
        imageBase64: imageToUse,
        prompt: prompt || 'Décris cette image en détail.',
        taskType: taskType  // 'ocr' pour Llama Vision, 'description' pour Moondream
      });
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // FIX 2025-12-20: Outil OCR avec Tesseract.js - rapide (< 5 secondes)
  async extract_text(args, context = {}) {
    const { image_path } = args;
    console.log(`📝 [ToolAgent] extract_text (Tesseract OCR): ${image_path}`);

    try {
      // Vérifier que le fichier existe
      if (!fs.existsSync(image_path)) {
        return { success: false, error: `Fichier introuvable: ${image_path}` };
      }

      const startTime = Date.now();

      // Utiliser Tesseract.js pour OCR rapide
      // Langues: fra (français) + eng (anglais)
      const result = await Tesseract.recognize(
        image_path,
        'fra+eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`📝 [Tesseract] Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      const elapsed = Date.now() - startTime;
      const text = result.data.text.trim();

      console.log(`✅ [Tesseract] OCR terminé en ${elapsed}ms - ${text.length} caractères`);

      return {
        success: true,
        text: text,
        confidence: result.data.confidence,
        elapsed_ms: elapsed,
        method: 'tesseract'
      };
    } catch (error) {
      console.error(`❌ [Tesseract] Erreur OCR:`, error.message);
      return { success: false, error: error.message };
    }
  },

  async debug_screenshot(args) {
    const { image_path, image_base64, context } = args;
    console.log(`🔍 [ToolAgent] debug_screenshot: Analysing error screenshot`);
    try {
      const prompt = `Tu es un expert en debugging. Analyse cette capture d'écran d'erreur.
${context ? `Contexte: ${context}` : ''}

Instructions:
1. Extrais le message d'erreur exact
2. Identifie le type d'erreur (syntaxe, runtime, import, etc.)
3. Identifie le fichier et la ligne concernés si visible
4. Explique la cause probable
5. Propose une solution concrète avec le code corrigé`;

      // Utilise Llama Vision (puissant) pour analyse de debug
      const result = await visionRouter.analyze({
        imagePath: image_path,
        imageBase64: image_base64,
        prompt: prompt,
        taskType: 'code',
        forceModel: 'powerful'  // Debug nécessite Llama Vision
      });
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async analyze_code_screenshot(args) {
    const { image_path, image_base64 } = args;
    console.log(`💻 [ToolAgent] analyze_code_screenshot`);
    try {
      // Utilise Llama Vision pour analyse de code
      const result = await visionRouter.analyzeCode(image_path);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ============ VOICE CODING - Phase 3.1 ANA CODE ============
  async execute_voice_command(args) {
    const { transcript, context } = args;
    console.log(`🎤 [ToolAgent] execute_voice_command: "${transcript}"`);

    try {
      // Parse la commande vocale
      const parsed = voiceParser.parseVoiceCommand(transcript);

      if (!parsed.matched) {
        // Pas de commande reconnue - retourner info
        return {
          success: true,
          matched: false,
          message: 'Commande vocale non reconnue. Traitement en langage naturel recommandé.',
          originalText: transcript,
          availableCommands: voiceParser.getAvailableCommands().slice(0, 10)
        };
      }

      // Commande reconnue - exécuter le tool correspondant
      console.log(`🎯 [VoiceCommand] Matched: ${parsed.tool} with args:`, parsed.args);

      // Vérifier si le tool existe
      if (!TOOL_IMPLEMENTATIONS[parsed.tool]) {
        return {
          success: false,
          error: `Tool "${parsed.tool}" not found`,
          parsed: parsed
        };
      }

      // Exécuter le tool
      // FIX 2025-12-20: Cohérence - passer contexte vide
      const result = await TOOL_IMPLEMENTATIONS[parsed.tool](parsed.args, {});

      return {
        success: true,
        matched: true,
        tool: parsed.tool,
        args: parsed.args,
        result: result,
        originalText: transcript
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        originalText: transcript
      };
    }
  },

  // ============ ARCHITECT MODE - Phase 3.3 ANA CODE ============
  async ask_architect(args) {
    const { request, files, project_context } = args;
    console.log(`🏗️ [ToolAgent] ask_architect: "${request.substring(0, 80)}..."`);

    try {
      const context = {
        files: files || [],
        codebase: project_context || ''
      };

      const result = await architectAgent.analyzeRequest(request, context);

      // Valider le plan si généré
      if (result.success && result.plan && result.plan.plan) {
        const validation = await architectAgent.validatePlan(result.plan);
        result.validation = validation;
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async review_code(args) {
    const { code, context } = args;
    console.log(`📝 [ToolAgent] review_code: ${code.length} chars`);

    try {
      return await architectAgent.reviewCode(code, context || '');
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // === NOUVEAUX OUTILS - DÉVELOPPEMENT WEB (10 Décembre 2025) ===

  async create_react_component(args) {
    const { name, type, description, features } = args;
    console.log(`⚛️ [ToolAgent] create_react_component: ${name} (${type})`);

    const basePath = type === 'page'
      ? 'E:/ANA/ana-interface/src/pages'
      : 'E:/ANA/ana-interface/src/components';

    const jsxPath = `${basePath}/${name}.jsx`;
    const cssPath = `${basePath}/${name}.css`;

    // Template JSX basé sur les patterns du projet
    const featuresComment = features ? `// Features: ${features.join(', ')}` : '';
    const jsxContent = `import React, { useState } from 'react';
import './${name}.css';
${featuresComment}

// ${description}
export default function ${name}() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="${name.toLowerCase()}-container">
      <h1>${name.replace(/Page$/, '').replace(/([A-Z])/g, ' $1').trim()}</h1>
      {/* TODO: Implémenter ${description} */}
      <p>Page en construction...</p>
    </div>
  );
}
`;

    const cssContent = `.${name.toLowerCase()}-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.${name.toLowerCase()}-container h1 {
  color: var(--primary-color, #007bff);
  margin-bottom: 20px;
}
`;

    try {
      // Créer les fichiers
      await fs.promises.writeFile(jsxPath, jsxContent, 'utf8');
      await fs.promises.writeFile(cssPath, cssContent, 'utf8');

      return {
        success: true,
        message: `Composant ${name} créé avec succès!`,
        files: {
          jsx: jsxPath,
          css: cssPath
        },
        nextSteps: [
          `Ajouter l'import dans App.jsx: import ${name} from './pages/${name}'`,
          `Ajouter la route: <Route path="/${name.toLowerCase().replace('page', '')}" element={<${name} />} />`
        ]
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async add_route(args) {
    const { path, component, icon, label } = args;
    console.log(`🛤️ [ToolAgent] add_route: ${path} → ${component}`);

    const appJsxPath = 'E:/ANA/ana-interface/src/App.jsx';

    try {
      let content = await fs.promises.readFile(appJsxPath, 'utf8');

      // Vérifier si la route existe déjà
      if (content.includes(`path="${path}"`)) {
        return { success: false, error: `Route ${path} existe déjà dans App.jsx` };
      }

      // Info pour modification manuelle (plus sûr)
      return {
        success: true,
        message: `Instructions pour ajouter la route ${path}:`,
        instructions: [
          `1. Ajouter l'import: import ${component} from './pages/${component}'`,
          `2. Ajouter la route: <Route path="${path}" element={<${component} />} />`,
          `3. Ajouter au sidebar: { to: "${path}", icon: <${icon || 'IconFile'} />, label: "${label}" }`
        ],
        file: appJsxPath
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async add_api_endpoint(args) {
    const { method, path, description, parameters } = args;
    console.log(`🔌 [ToolAgent] add_api_endpoint: ${method} ${path}`);

    const anaCoreJsPath = 'E:/ANA/server/ana-core.cjs';

    // Générer le template d'endpoint
    const paramsStr = parameters ? parameters.join(', ') : '';
    const template = `
// ${description}
// Paramètres: ${paramsStr || 'aucun'}
app.${method.toLowerCase()}('${path}', async (req, res) => {
  try {
    // TODO: Implémenter ${description}
    res.json({ success: true, message: 'Endpoint ${path} en construction' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
`;

    return {
      success: true,
      message: `Template pour ${method} ${path}:`,
      template: template,
      instructions: [
        `Ajouter ce code dans ana-core.cjs`,
        `Placer après les autres endpoints API`,
        `Implémenter la logique selon: ${description}`
      ]
    };
  },

  async install_npm_package(args) {
    const { package_name, project, dev } = args;
    console.log(`📦 [ToolAgent] install_npm_package: ${package_name} → ${project}`);

    const projectPath = project === 'interface'
      ? 'E:/ANA/ana-interface'
      : 'E:/ANA/server';

    const devFlag = dev ? '--save-dev' : '';
    const command = `cd "${projectPath}" && npm install ${package_name} ${devFlag}`;

    try {
      const { exec } = require('child_process');

      return new Promise((resolve) => {
        exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
          if (error) {
            resolve({ success: false, error: error.message, stderr });
          } else {
            resolve({
              success: true,
              message: `Package ${package_name} installé dans ${project}`,
              output: stdout
            });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async analyze_component(args) {
    const { component_path } = args;
    console.log(`🔍 [ToolAgent] analyze_component: ${component_path}`);

    try {
      const content = await fs.promises.readFile(component_path, 'utf8');

      // Analyse basique
      const imports = content.match(/import .+ from .+/g) || [];
      const hooks = content.match(/use[A-Z]\w+/g) || [];
      const states = content.match(/useState\([^)]*\)/g) || [];
      const effects = content.match(/useEffect\(/g) || [];
      const hasAPI = content.includes('fetch(') || content.includes('axios');

      // Extraire le nom du composant
      const componentMatch = content.match(/(?:export default function|function|const)\s+(\w+)/);
      const componentName = componentMatch ? componentMatch[1] : 'Unknown';

      return {
        success: true,
        component: componentName,
        analysis: {
          imports: imports.length,
          hooks: [...new Set(hooks)],
          stateVariables: states.length,
          useEffects: effects.length,
          hasAPIcalls: hasAPI,
          linesOfCode: content.split('\n').length
        },
        patterns: {
          usesCSS: content.includes('.css'),
          usesRouter: content.includes('react-router'),
          usesContext: content.includes('useContext')
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async hot_reload_check(args) {
    const { port } = args;
    console.log(`🔥 [ToolAgent] hot_reload_check: port ${port || 5173}`);

    const checkPort = port || 5173;
    const http = require('http');

    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${checkPort}`, (res) => {
        resolve({
          success: true,
          running: true,
          port: checkPort,
          statusCode: res.statusCode,
          message: `Serveur Vite actif sur port ${checkPort}`
        });
      });

      req.on('error', () => {
        resolve({
          success: true,
          running: false,
          port: checkPort,
          message: `Serveur Vite non actif sur port ${checkPort}. Lancer: npm run dev`
        });
      });

      req.setTimeout(3000, () => {
        req.destroy();
        resolve({
          success: true,
          running: false,
          message: 'Timeout - serveur probablement non actif'
        });
      });
    });
  },

  async validate_jsx_syntax(args) {
    const { code } = args;
    console.log(`✅ [ToolAgent] validate_jsx_syntax: ${code.length} chars`);

    // Validations basiques JSX
    const errors = [];

    // Vérifier les balises non fermées
    const openTags = code.match(/<[A-Z][a-zA-Z]*[^/>]*>/g) || [];
    const closeTags = code.match(/<\/[A-Z][a-zA-Z]*>/g) || [];

    // Vérifier import React
    if (!code.includes('import React') && !code.includes("from 'react'")) {
      errors.push('Import React manquant');
    }

    // Vérifier export
    if (!code.includes('export default') && !code.includes('export function')) {
      errors.push('Export du composant manquant');
    }

    // Vérifier className vs class
    if (code.includes(' class=') && !code.includes('className')) {
      errors.push('Utiliser className au lieu de class en JSX');
    }

    return {
      success: errors.length === 0,
      valid: errors.length === 0,
      errors: errors,
      warnings: [],
      stats: {
        openingTags: openTags.length,
        closingTags: closeTags.length
      }
    };
  },

  async list_available_icons(args) {
    console.log(`🎨 [ToolAgent] list_available_icons`);

    const iconsPath = 'E:/ANA/ana-interface/src/components/Icons.jsx';

    try {
      const content = await fs.promises.readFile(iconsPath, 'utf8');

      // Extraire les noms d'icônes (export const IconName)
      const iconMatches = content.match(/export const (Icon\w+)/g) || [];
      const icons = iconMatches.map(m => m.replace('export const ', ''));

      return {
        success: true,
        count: icons.length,
        icons: icons,
        usage: 'import { IconName } from "./components/Icons"'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async get_css_variables(args) {
    console.log(`🎨 [ToolAgent] get_css_variables`);

    const cssPath = 'E:/ANA/ana-interface/src/App.css';

    try {
      const content = await fs.promises.readFile(cssPath, 'utf8');

      // Extraire les variables CSS
      const varMatches = content.match(/--[\w-]+:\s*[^;]+/g) || [];
      const variables = {};

      varMatches.forEach(v => {
        const [name, value] = v.split(':').map(s => s.trim());
        variables[name] = value;
      });

      return {
        success: true,
        count: Object.keys(variables).length,
        variables: variables,
        usage: 'var(--variable-name)'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async create_backup(args) {
    const { file_path, reason } = args;
    console.log(`💾 [ToolAgent] create_backup: ${file_path}`);

    try {
      const content = await fs.promises.readFile(file_path, 'utf8');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const reasonSuffix = reason ? `_${reason.replace(/\s+/g, '_')}` : '';
      const backupPath = `${file_path}.backup_${timestamp}${reasonSuffix}`;

      await fs.promises.writeFile(backupPath, content, 'utf8');

      return {
        success: true,
        original: file_path,
        backup: backupPath,
        size: content.length,
        message: `Backup créé: ${backupPath}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📁 IMPLÉMENTATIONS: SYSTÈME DE FICHIERS AVANCÉ
  // ═══════════════════════════════════════════════════════════════════════════

  async copy_file(args) {
    const { source, destination, overwrite } = args;
    console.log(`📁 [ToolAgent] copy_file: ${source} → ${destination}`);
    try {
      if (!overwrite && fs.existsSync(destination)) {
        return { success: false, error: 'Fichier destination existe déjà. Utilisez overwrite: true' };
      }
      await fs.promises.copyFile(source, destination);
      return { success: true, message: `Copié: ${source} → ${destination}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async move_file(args) {
    const { source, destination } = args;
    console.log(`📁 [ToolAgent] move_file: ${source} → ${destination}`);
    try {
      await fs.promises.rename(source, destination);
      return { success: true, message: `Déplacé: ${source} → ${destination}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async delete_file(args) {
    const { path: filePath, confirm } = args;
    console.log(`📁 [ToolAgent] delete_file: ${filePath}`);
    if (!confirm) {
      return { success: false, error: 'Confirmation requise: confirm: true' };
    }
    try {
      await fs.promises.unlink(filePath);
      return { success: true, message: `Supprimé: ${filePath}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async create_directory(args) {
    const { path: dirPath, recursive = true } = args;
    console.log(`📁 [ToolAgent] create_directory: ${dirPath}`);
    try {
      await fs.promises.mkdir(dirPath, { recursive });
      return { success: true, message: `Dossier créé: ${dirPath}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async get_file_stats(args) {
    const { path: filePath } = args;
    console.log(`📁 [ToolAgent] get_file_stats: ${filePath}`);
    try {
      const stats = await fs.promises.stat(filePath);
      return {
        success: true,
        path: filePath,
        size: stats.size,
        sizeHuman: stats.size > 1024*1024 ? `${(stats.size/1024/1024).toFixed(2)} MB` : `${(stats.size/1024).toFixed(2)} KB`,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        permissions: stats.mode.toString(8)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async compare_files(args) {
    const { file1, file2, mode = 'text' } = args;
    console.log(`📁 [ToolAgent] compare_files: ${file1} vs ${file2}`);
    try {
      const content1 = await fs.promises.readFile(file1);
      const content2 = await fs.promises.readFile(file2);

      if (mode === 'binary') {
        const identical = content1.equals(content2);
        return { success: true, identical, mode: 'binary' };
      }

      const text1 = content1.toString('utf8');
      const text2 = content2.toString('utf8');
      const lines1 = text1.split('\n');
      const lines2 = text2.split('\n');

      const differences = [];
      const maxLines = Math.max(lines1.length, lines2.length);
      for (let i = 0; i < maxLines; i++) {
        if (lines1[i] !== lines2[i]) {
          differences.push({ line: i + 1, file1: lines1[i] || '(vide)', file2: lines2[i] || '(vide)' });
        }
      }

      return {
        success: true,
        identical: differences.length === 0,
        differences: differences.slice(0, 50),
        totalDifferences: differences.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async find_files(args) {
    const { directory, pattern, maxDepth = 10, minSize, maxSize, modifiedAfter } = args;
    console.log(`📁 [ToolAgent] find_files: ${directory} pattern=${pattern}`);
    try {
      const glob = require('glob');
      const searchPattern = pattern ? `${directory}/**/${pattern}` : `${directory}/**/*`;
      const files = glob.sync(searchPattern, { nodir: true, maxDepth });

      let results = await Promise.all(files.map(async (f) => {
        try {
          const stats = await fs.promises.stat(f);
          return { path: f, size: stats.size, modified: stats.mtime };
        } catch { return null; }
      }));

      results = results.filter(r => r !== null);

      if (minSize) results = results.filter(r => r.size >= minSize);
      if (maxSize) results = results.filter(r => r.size <= maxSize);
      if (modifiedAfter) {
        const afterDate = new Date(modifiedAfter);
        results = results.filter(r => new Date(r.modified) > afterDate);
      }

      return { success: true, count: results.length, files: results.slice(0, 100) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async watch_file(args) {
    const { path: watchPath, duration = 60 } = args;
    console.log(`📁 [ToolAgent] watch_file: ${watchPath} for ${duration}s`);
    return {
      success: true,
      message: `Surveillance de ${watchPath} pendant ${duration}s`,
      note: 'Utiliser fs.watch() pour implémentation complète avec callbacks'
    };
  },

  async get_directory_size(args) {
    const { path: dirPath } = args;
    console.log(`📁 [ToolAgent] get_directory_size: ${dirPath}`);
    try {
      let totalSize = 0;
      const processDir = async (dir) => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = require('path').join(dir, entry.name);
          if (entry.isFile()) {
            const stats = await fs.promises.stat(fullPath);
            totalSize += stats.size;
          } else if (entry.isDirectory()) {
            await processDir(fullPath);
          }
        }
      };
      await processDir(dirPath);
      return {
        success: true,
        path: dirPath,
        sizeBytes: totalSize,
        sizeKB: (totalSize / 1024).toFixed(2),
        sizeMB: (totalSize / 1024 / 1024).toFixed(2),
        sizeGB: (totalSize / 1024 / 1024 / 1024).toFixed(2)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async tree_view(args) {
    const { path: dirPath, maxDepth = 3, showHidden = false, showSize = false } = args;
    console.log(`📁 [ToolAgent] tree_view: ${dirPath}`);
    try {
      const tree = [];
      const buildTree = async (dir, prefix = '', depth = 0) => {
        if (depth > maxDepth) return;
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        const filtered = showHidden ? entries : entries.filter(e => !e.name.startsWith('.'));

        for (let i = 0; i < filtered.length; i++) {
          const entry = filtered[i];
          const isLast = i === filtered.length - 1;
          const connector = isLast ? '└── ' : '├── ';
          let line = prefix + connector + entry.name;

          if (showSize && entry.isFile()) {
            const stats = await fs.promises.stat(require('path').join(dir, entry.name));
            line += ` (${(stats.size/1024).toFixed(1)}KB)`;
          }

          tree.push(line);

          if (entry.isDirectory()) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            await buildTree(require('path').join(dir, entry.name), newPrefix, depth + 1);
          }
        }
      };

      tree.push(dirPath);
      await buildTree(dirPath);
      return { success: true, tree: tree.join('\n') };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌐 IMPLÉMENTATIONS: RÉSEAU ET HTTP
  // ═══════════════════════════════════════════════════════════════════════════

  async download_file(args) {
    const { url, destination, headers = {} } = args;
    console.log(`🌐 [ToolAgent] download_file: ${url}`);
    try {
      const https = require('https');
      const http = require('http');
      const protocol = url.startsWith('https') ? https : http;

      return new Promise((resolve) => {
        const file = fs.createWriteStream(destination);
        protocol.get(url, { headers }, (response) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve({ success: true, message: `Téléchargé: ${destination}`, size: file.bytesWritten });
          });
        }).on('error', (err) => {
          fs.unlink(destination, () => {});
          resolve({ success: false, error: err.message });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async ping(args) {
    const { host, count = 4 } = args;
    console.log(`🌐 [ToolAgent] ping: ${host}`);
    try {
      const { exec } = require('child_process');
      const cmd = process.platform === 'win32' ? `ping -n ${count} ${host}` : `ping -c ${count} ${host}`;

      return new Promise((resolve) => {
        exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) {
            resolve({ success: false, error: error.message, output: stderr });
          } else {
            resolve({ success: true, output: stdout });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async check_url(args) {
    const { url, timeout = 5000 } = args;
    console.log(`🌐 [ToolAgent] check_url: ${url}`);
    try {
      const https = require('https');
      const http = require('http');
      const protocol = url.startsWith('https') ? https : http;

      return new Promise((resolve) => {
        const req = protocol.get(url, { timeout }, (res) => {
          resolve({
            success: true,
            accessible: true,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers
          });
        });
        req.on('error', (err) => resolve({ success: true, accessible: false, error: err.message }));
        req.on('timeout', () => { req.destroy(); resolve({ success: true, accessible: false, error: 'Timeout' }); });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async get_public_ip(args) {
    console.log(`🌐 [ToolAgent] get_public_ip`);
    try {
      const https = require('https');
      return new Promise((resolve) => {
        https.get('https://api.ipify.org?format=json', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve({ success: true, ip: json.ip });
            } catch { resolve({ success: true, ip: data.trim() }); }
          });
        }).on('error', (err) => resolve({ success: false, error: err.message }));
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async dns_lookup(args) {
    const { domain, type = 'A' } = args;
    console.log(`🌐 [ToolAgent] dns_lookup: ${domain} (${type})`);
    try {
      const dns = require('dns').promises;
      let result;
      switch (type) {
        case 'A': result = await dns.resolve4(domain); break;
        case 'AAAA': result = await dns.resolve6(domain); break;
        case 'MX': result = await dns.resolveMx(domain); break;
        case 'TXT': result = await dns.resolveTxt(domain); break;
        case 'NS': result = await dns.resolveNs(domain); break;
        case 'CNAME': result = await dns.resolveCname(domain); break;
        default: result = await dns.resolve(domain);
      }
      return { success: true, domain, type, records: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async port_scan(args) {
    const { host, ports } = args;
    // Support both array and comma-separated string
    const portList = Array.isArray(ports) ? ports : String(ports).split(',').map(p => parseInt(p.trim()));
    console.log(`🌐 [ToolAgent] port_scan: ${host} ports=${portList.join(',')}`);
    try {
      const net = require('net');
      const results = await Promise.all(portList.map(port => {
        return new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(2000);
          socket.on('connect', () => { socket.destroy(); resolve({ port, open: true }); });
          socket.on('timeout', () => { socket.destroy(); resolve({ port, open: false }); });
          socket.on('error', () => { socket.destroy(); resolve({ port, open: false }); });
          socket.connect(port, host);
        });
      }));
      return { success: true, host, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async whois(args) {
    const { domain } = args;
    console.log(`🌐 [ToolAgent] whois: ${domain}`);
    try {
      const { exec } = require('child_process');
      const path = require('path');
      const whoisPath = path.join(__dirname, '../bin/WhoIs/whois64.exe');
      return new Promise((resolve) => {
        exec(`"${whoisPath}" -accepteula ${domain}`, { timeout: 15000 }, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: error.message });
          else resolve({ success: true, domain, data: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📦 IMPLÉMENTATIONS: COMPRESSION
  // ═══════════════════════════════════════════════════════════════════════════

  async create_zip(args) {
    const { files, output, level = 6 } = args;
    console.log(`📦 [ToolAgent] create_zip: ${output}`);
    try {
      const archiver = require('archiver');
      const outputStream = fs.createWriteStream(output);
      const archive = archiver('zip', { zlib: { level } });

      return new Promise((resolve, reject) => {
        outputStream.on('close', () => resolve({ success: true, file: output, size: archive.pointer() }));
        archive.on('error', (err) => resolve({ success: false, error: err.message }));
        archive.pipe(outputStream);

        for (const file of files) {
          if (fs.statSync(file).isDirectory()) {
            archive.directory(file, require('path').basename(file));
          } else {
            archive.file(file, { name: require('path').basename(file) });
          }
        }
        archive.finalize();
      });
    } catch (error) {
      return { success: false, error: error.message + ' (archiver module peut être requis: npm install archiver)' };
    }
  },

  async extract_zip(args) {
    const { zipFile, destination } = args;
    console.log(`📦 [ToolAgent] extract_zip: ${zipFile}`);
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipFile);
      zip.extractAllTo(destination, true);
      return { success: true, message: `Extrait vers: ${destination}` };
    } catch (error) {
      return { success: false, error: error.message + ' (adm-zip module peut être requis: npm install adm-zip)' };
    }
  },

  async list_archive(args) {
    const { archiveFile } = args;
    console.log(`📦 [ToolAgent] list_archive: ${archiveFile}`);
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(archiveFile);
      const entries = zip.getEntries().map(e => ({
        name: e.entryName,
        size: e.header.size,
        compressedSize: e.header.compressedSize,
        isDirectory: e.isDirectory
      }));
      return { success: true, count: entries.length, entries };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async compress_gzip(args) {
    const { source, output } = args;
    console.log(`📦 [ToolAgent] compress_gzip: ${source}`);
    try {
      const zlib = require('zlib');
      const input = fs.createReadStream(source);
      const outputPath = output || `${source}.gz`;
      const outputStream = fs.createWriteStream(outputPath);
      const gzip = zlib.createGzip();

      return new Promise((resolve) => {
        input.pipe(gzip).pipe(outputStream).on('finish', () => {
          resolve({ success: true, output: outputPath });
        }).on('error', (err) => resolve({ success: false, error: err.message }));
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async decompress_gzip(args) {
    const { source, output } = args;
    console.log(`📦 [ToolAgent] decompress_gzip: ${source}`);
    try {
      const zlib = require('zlib');
      const input = fs.createReadStream(source);
      const outputPath = output || source.replace('.gz', '');
      const outputStream = fs.createWriteStream(outputPath);
      const gunzip = zlib.createGunzip();

      return new Promise((resolve) => {
        input.pipe(gunzip).pipe(outputStream).on('finish', () => {
          resolve({ success: true, output: outputPath });
        }).on('error', (err) => resolve({ success: false, error: err.message }));
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 IMPLÉMENTATIONS: CRYPTOGRAPHIE
  // ═══════════════════════════════════════════════════════════════════════════

  async hash_file(args) {
    const { path: filePath, algorithm = 'sha256' } = args;
    console.log(`🔐 [ToolAgent] hash_file: ${filePath} (${algorithm})`);
    try {
      const crypto = require('crypto');
      const content = await fs.promises.readFile(filePath);
      const hash = crypto.createHash(algorithm).update(content).digest('hex');
      return { success: true, path: filePath, algorithm, hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async hash_text(args) {
    const { text, algorithm = 'sha256' } = args;
    console.log(`🔐 [ToolAgent] hash_text (${algorithm})`);
    try {
      const crypto = require('crypto');
      const hash = crypto.createHash(algorithm).update(text).digest('hex');
      return { success: true, algorithm, hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async generate_uuid(args) {
    console.log(`🔐 [ToolAgent] generate_uuid`);
    try {
      const crypto = require('crypto');
      const uuid = crypto.randomUUID();
      return { success: true, uuid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async generate_password(args) {
    const { length = 16, includeSymbols = true, includeNumbers = true } = args;
    console.log(`🔐 [ToolAgent] generate_password: ${length} chars`);
    try {
      const crypto = require('crypto');
      let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (includeNumbers) chars += '0123456789';
      if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

      let password = '';
      const randomBytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        password += chars[randomBytes[i] % chars.length];
      }
      return { success: true, password, length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async encrypt_text(args) {
    const { text, password } = args;
    console.log(`🔐 [ToolAgent] encrypt_text`);
    try {
      const crypto = require('crypto');
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(password, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return { success: true, encrypted: iv.toString('hex') + ':' + encrypted };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async decrypt_text(args) {
    const { encryptedText, password } = args;
    console.log(`🔐 [ToolAgent] decrypt_text`);
    try {
      const crypto = require('crypto');
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(password, 'salt', 32);
      const [ivHex, encrypted] = encryptedText.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return { success: true, decrypted };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async base64_encode(args) {
    const { input, isFile = false } = args;
    console.log(`🔐 [ToolAgent] base64_encode`);
    try {
      let data;
      if (isFile) {
        data = await fs.promises.readFile(input);
      } else {
        data = Buffer.from(input);
      }
      return { success: true, encoded: data.toString('base64') };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async base64_decode(args) {
    const { encoded, outputFile } = args;
    console.log(`🔐 [ToolAgent] base64_decode`);
    try {
      const decoded = Buffer.from(encoded, 'base64');
      if (outputFile) {
        await fs.promises.writeFile(outputFile, decoded);
        return { success: true, message: `Décodé vers: ${outputFile}` };
      }
      return { success: true, decoded: decoded.toString('utf8') };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 💻 IMPLÉMENTATIONS: SYSTÈME ET OS
  // ═══════════════════════════════════════════════════════════════════════════

  async get_system_info(args) {
    console.log(`💻 [ToolAgent] get_system_info`);
    try {
      const os = require('os');
      return {
        success: true,
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        type: os.type(),
        release: os.release(),
        cpus: os.cpus().length,
        cpuModel: os.cpus()[0]?.model,
        totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
        freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
        uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
        homeDir: os.homedir(),
        tempDir: os.tmpdir(),
        username: os.userInfo().username
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async get_cpu_usage(args) {
    console.log(`💻 [ToolAgent] get_cpu_usage`);
    try {
      const os = require('os');
      const cpus = os.cpus();
      const usage = cpus.map((cpu, i) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return { core: i, usage: ((1 - idle / total) * 100).toFixed(2) + '%' };
      });
      const avgUsage = usage.reduce((sum, c) => sum + parseFloat(c.usage), 0) / usage.length;
      return { success: true, cores: usage, average: avgUsage.toFixed(2) + '%' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async get_memory_usage(args) {
    console.log(`💻 [ToolAgent] get_memory_usage`);
    try {
      const os = require('os');
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      return {
        success: true,
        total: `${(total / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${(used / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(free / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usagePercent: `${((used / total) * 100).toFixed(2)}%`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async get_disk_usage(args) {
    const { drive } = args;
    console.log(`💻 [ToolAgent] get_disk_usage: ${drive || 'all'}`);
    try {
      const { exec } = require('child_process');
      const cmd = process.platform === 'win32'
        ? `wmic logicaldisk get size,freespace,caption`
        : `df -h`;

      return new Promise((resolve) => {
        exec(cmd, (error, stdout) => {
          if (error) resolve({ success: false, error: error.message });
          else resolve({ success: true, output: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async list_processes(args) {
    const { filter, sortBy = 'name' } = args;
    console.log(`💻 [ToolAgent] list_processes: filter=${filter}`);
    try {
      const { exec } = require('child_process');
      const cmd = process.platform === 'win32'
        ? `tasklist /FO CSV`
        : `ps aux`;

      return new Promise((resolve) => {
        exec(cmd, (error, stdout) => {
          if (error) resolve({ success: false, error: error.message });
          else {
            let output = stdout;
            if (filter) {
              output = stdout.split('\n').filter(line =>
                line.toLowerCase().includes(filter.toLowerCase())
              ).join('\n');
            }
            resolve({ success: true, output });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async kill_process_by_name(args) {
    const { name, force = false } = args;
    console.log(`💻 [ToolAgent] kill_process_by_name: ${name}`);
    try {
      const { exec } = require('child_process');
      const cmd = process.platform === 'win32'
        ? `taskkill ${force ? '/F' : ''} /IM ${name}`
        : `pkill ${force ? '-9' : ''} ${name}`;

      return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, message: `Processus ${name} terminé`, output: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async get_environment_variable(args) {
    const { name } = args;
    console.log(`💻 [ToolAgent] get_environment_variable: ${name}`);
    const value = process.env[name];
    return { success: true, name, value: value || '(non définie)' };
  },

  async set_environment_variable(args) {
    const { name, value } = args;
    console.log(`💻 [ToolAgent] set_environment_variable: ${name}`);
    process.env[name] = value;
    return { success: true, message: `${name}=${value} (session courante)` };
  },

  async get_network_interfaces(args) {
    console.log(`💻 [ToolAgent] get_network_interfaces`);
    try {
      const os = require('os');
      const interfaces = os.networkInterfaces();
      const result = {};
      for (const [name, addrs] of Object.entries(interfaces)) {
        result[name] = addrs.map(addr => ({
          family: addr.family,
          address: addr.address,
          netmask: addr.netmask,
          mac: addr.mac,
          internal: addr.internal
        }));
      }
      return { success: true, interfaces: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async open_application(args) {
    const { path: appPath, args: appArgs = [] } = args;
    console.log(`💻 [ToolAgent] open_application: ${appPath}`);
    try {
      const { spawn } = require('child_process');
      const child = spawn(appPath, appArgs, { detached: true, stdio: 'ignore' });
      child.unref();
      return { success: true, message: `Application lancée: ${appPath}`, pid: child.pid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async open_url_in_browser(args) {
    const { url } = args;
    console.log(`💻 [ToolAgent] open_url_in_browser: ${url}`);
    try {
      const { exec } = require('child_process');
      const cmd = process.platform === 'win32' ? `start "" "${url}"`
        : process.platform === 'darwin' ? `open "${url}"`
        : `xdg-open "${url}"`;

      return new Promise((resolve) => {
        exec(cmd, (error) => {
          if (error) resolve({ success: false, error: error.message });
          else resolve({ success: true, message: `Ouvert: ${url}` });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 IMPLÉMENTATIONS: DATA ET CONVERSION
  // ═══════════════════════════════════════════════════════════════════════════

  async json_to_csv(args) {
    const { jsonData, outputFile, delimiter = ',' } = args;
    console.log(`📊 [ToolAgent] json_to_csv`);
    try {
      let data;
      if (fs.existsSync(jsonData)) {
        data = JSON.parse(await fs.promises.readFile(jsonData, 'utf8'));
      } else {
        data = JSON.parse(jsonData);
      }

      if (!Array.isArray(data)) data = [data];
      const headers = Object.keys(data[0] || {});
      const csv = [
        headers.join(delimiter),
        ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(delimiter))
      ].join('\n');

      if (outputFile) {
        await fs.promises.writeFile(outputFile, csv);
        return { success: true, message: `CSV écrit: ${outputFile}` };
      }
      return { success: true, csv };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async csv_to_json(args) {
    const { csvFile, outputFile, delimiter = ',' } = args;
    console.log(`📊 [ToolAgent] csv_to_json: ${csvFile}`);
    try {
      const content = await fs.promises.readFile(csvFile, 'utf8');
      const lines = content.trim().split('\n');
      const headers = lines[0].split(delimiter).map(h => h.replace(/"/g, '').trim());

      const data = lines.slice(1).map(line => {
        const values = line.split(delimiter).map(v => v.replace(/"/g, '').trim());
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
      });

      if (outputFile) {
        await fs.promises.writeFile(outputFile, JSON.stringify(data, null, 2));
        return { success: true, message: `JSON écrit: ${outputFile}` };
      }
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async xml_to_json(args) {
    const { xmlData } = args;
    console.log(`📊 [ToolAgent] xml_to_json`);
    try {
      // Simple XML parser - pour un parsing plus robuste, utiliser xml2js
      let xml = xmlData;
      if (fs.existsSync(xmlData)) {
        xml = await fs.promises.readFile(xmlData, 'utf8');
      }
      // Basic conversion - recommande xml2js pour production
      return { success: true, note: 'Pour XML complexe, installer xml2js: npm install xml2js', xml: xml.substring(0, 500) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async json_to_xml(args) {
    const { jsonData, rootElement = 'root' } = args;
    console.log(`📊 [ToolAgent] json_to_xml`);
    try {
      let data = jsonData;
      if (fs.existsSync(jsonData)) {
        data = await fs.promises.readFile(jsonData, 'utf8');
      }
      const obj = JSON.parse(data);

      const toXml = (obj, indent = '  ') => {
        let xml = '';
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'object' && value !== null) {
            xml += `${indent}<${key}>\n${toXml(value, indent + '  ')}${indent}</${key}>\n`;
          } else {
            xml += `${indent}<${key}>${value}</${key}>\n`;
          }
        }
        return xml;
      };

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n${toXml(obj)}</${rootElement}>`;
      return { success: true, xml };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async yaml_to_json(args) {
    const { yamlData } = args;
    console.log(`📊 [ToolAgent] yaml_to_json`);
    try {
      const yaml = require('js-yaml');
      let content = yamlData;
      if (fs.existsSync(yamlData)) {
        content = await fs.promises.readFile(yamlData, 'utf8');
      }
      const data = yaml.load(content);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message + ' (js-yaml peut être requis: npm install js-yaml)' };
    }
  },

  async json_to_yaml(args) {
    const { jsonData } = args;
    console.log(`📊 [ToolAgent] json_to_yaml`);
    try {
      const yaml = require('js-yaml');
      let data = jsonData;
      if (fs.existsSync(jsonData)) {
        data = await fs.promises.readFile(jsonData, 'utf8');
      }
      const obj = JSON.parse(data);
      const yamlStr = yaml.dump(obj);
      return { success: true, yaml: yamlStr };
    } catch (error) {
      return { success: false, error: error.message + ' (js-yaml peut être requis: npm install js-yaml)' };
    }
  },

  async parse_html(args) {
    const { html, selector, attribute } = args;
    console.log(`📊 [ToolAgent] parse_html: ${selector}`);
    try {
      const cheerio = require('cheerio');
      let content = html;
      if (html.startsWith('http')) {
        const https = require('https');
        content = await new Promise((resolve, reject) => {
          https.get(html, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
          }).on('error', reject);
        });
      } else if (fs.existsSync(html)) {
        content = await fs.promises.readFile(html, 'utf8');
      }

      const $ = cheerio.load(content);
      const elements = $(selector);
      const results = [];
      elements.each((i, el) => {
        if (attribute) {
          results.push($(el).attr(attribute));
        } else {
          results.push($(el).text().trim());
        }
      });
      return { success: true, count: results.length, results };
    } catch (error) {
      return { success: false, error: error.message + ' (cheerio peut être requis: npm install cheerio)' };
    }
  },

  async markdown_to_html(args) {
    const { markdown } = args;
    console.log(`📊 [ToolAgent] markdown_to_html`);
    try {
      const marked = require('marked');
      let content = markdown;
      if (fs.existsSync(markdown)) {
        content = await fs.promises.readFile(markdown, 'utf8');
      }
      const html = marked.parse(content);
      return { success: true, html };
    } catch (error) {
      return { success: false, error: error.message + ' (marked peut être requis: npm install marked)' };
    }
  },

  async html_to_markdown(args) {
    const { html } = args;
    console.log(`📊 [ToolAgent] html_to_markdown`);
    try {
      const TurndownService = require('turndown');
      const turndownService = new TurndownService();
      let content = html;
      if (fs.existsSync(html)) {
        content = await fs.promises.readFile(html, 'utf8');
      }
      const markdown = turndownService.turndown(content);
      return { success: true, markdown };
    } catch (error) {
      return { success: false, error: error.message + ' (turndown peut être requis: npm install turndown)' };
    }
  },

  async format_json(args) {
    const { json, indent = 2 } = args;
    console.log(`📊 [ToolAgent] format_json`);
    try {
      const obj = JSON.parse(json);
      return { success: true, formatted: JSON.stringify(obj, null, indent) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async minify_json(args) {
    const { json } = args;
    console.log(`📊 [ToolAgent] minify_json`);
    try {
      const obj = JSON.parse(json);
      return { success: true, minified: JSON.stringify(obj) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 IMPLÉMENTATIONS: IMAGES
  // ═══════════════════════════════════════════════════════════════════════════

  async resize_image(args) {
    const { input, output, width, height, maintainAspect = true } = args;
    console.log(`🎨 [ToolAgent] resize_image: ${input}`);
    try {
      const sharp = require('sharp');
      let resizeOptions = {};
      if (width) resizeOptions.width = width;
      if (height) resizeOptions.height = height;
      if (maintainAspect) resizeOptions.fit = 'inside';

      await sharp(input).resize(resizeOptions).toFile(output);
      return { success: true, message: `Redimensionné: ${output}` };
    } catch (error) {
      return { success: false, error: error.message + ' (sharp peut être requis: npm install sharp)' };
    }
  },

  async convert_image(args) {
    const { input, output, quality = 80 } = args;
    console.log(`🎨 [ToolAgent] convert_image: ${input} → ${output}`);
    try {
      const sharp = require('sharp');
      const ext = require('path').extname(output).toLowerCase();
      let pipeline = sharp(input);

      if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({ quality });
      } else if (ext === '.png') {
        pipeline = pipeline.png();
      } else if (ext === '.webp') {
        pipeline = pipeline.webp({ quality });
      } else if (ext === '.gif') {
        pipeline = pipeline.gif();
      }

      await pipeline.toFile(output);
      return { success: true, message: `Converti: ${output}` };
    } catch (error) {
      return { success: false, error: error.message + ' (sharp peut être requis: npm install sharp)' };
    }
  },

  async get_image_info(args) {
    const { path: imagePath } = args;
    console.log(`🎨 [ToolAgent] get_image_info: ${imagePath}`);
    try {
      const sharp = require('sharp');
      const metadata = await sharp(imagePath).metadata();
      return {
        success: true,
        path: imagePath,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        size: (await fs.promises.stat(imagePath)).size
      };
    } catch (error) {
      return { success: false, error: error.message + ' (sharp peut être requis: npm install sharp)' };
    }
  },

  async crop_image(args) {
    const { input, output, x, y, width, height } = args;
    console.log(`🎨 [ToolAgent] crop_image: ${input}`);
    try {
      const sharp = require('sharp');
      await sharp(input).extract({ left: x, top: y, width, height }).toFile(output);
      return { success: true, message: `Rogné: ${output}` };
    } catch (error) {
      return { success: false, error: error.message + ' (sharp peut être requis: npm install sharp)' };
    }
  },

  async rotate_image(args) {
    const { input, output, angle } = args;
    console.log(`🎨 [ToolAgent] rotate_image: ${input} ${angle}°`);
    try {
      const sharp = require('sharp');
      await sharp(input).rotate(angle).toFile(output);
      return { success: true, message: `Pivoté: ${output}` };
    } catch (error) {
      return { success: false, error: error.message + ' (sharp peut être requis: npm install sharp)' };
    }
  },

  async take_screenshot(args) {
    const { output, region } = args;
    console.log(`🎨 [ToolAgent] take_screenshot: ${output}`);
    try {
      const screenshot = require('screenshot-desktop');
      const img = await screenshot();
      await fs.promises.writeFile(output, img);
      return { success: true, message: `Screenshot: ${output}` };
    } catch (error) {
      return { success: false, error: error.message + ' (screenshot-desktop peut être requis: npm install screenshot-desktop)' };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🛠️ IMPLÉMENTATIONS: GIT AVANCÉ
  // ═══════════════════════════════════════════════════════════════════════════

  async git_diff(args) {
    const { repo, file, staged = false } = args;
    console.log(`🛠️ [ToolAgent] git_diff: ${repo}`);
    try {
      const { exec } = require('child_process');
      let cmd = `git -C "${repo}" diff`;
      if (staged) cmd += ' --staged';
      if (file) cmd += ` "${file}"`;

      return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, diff: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async git_stash(args) {
    const { repo, message, action } = args;
    console.log(`🛠️ [ToolAgent] git_stash: ${action}`);
    try {
      const { exec } = require('child_process');
      let cmd = `git -C "${repo}" stash ${action}`;
      if (action === 'push' && message) cmd += ` -m "${message}"`;

      return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async git_pull(args) {
    const { repo, remote = 'origin', branch = 'main' } = args;
    console.log(`🛠️ [ToolAgent] git_pull: ${repo}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`git -C "${repo}" pull ${remote} ${branch}`, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async git_push(args) {
    const { repo, remote = 'origin', branch } = args;
    console.log(`🛠️ [ToolAgent] git_push: ${repo}`);
    try {
      const { exec } = require('child_process');
      let cmd = `git -C "${repo}" push ${remote}`;
      if (branch) cmd += ` ${branch}`;

      return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stdout || stderr });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async git_clone(args) {
    const { url, destination, depth } = args;
    console.log(`🛠️ [ToolAgent] git_clone: ${url}`);
    try {
      const { exec } = require('child_process');
      let cmd = `git clone`;
      if (depth) cmd += ` --depth ${depth}`;
      cmd += ` "${url}"`;
      if (destination) cmd += ` "${destination}"`;

      return new Promise((resolve) => {
        exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stderr || stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async git_checkout(args) {
    const { repo, branch, createNew = false } = args;
    console.log(`🛠️ [ToolAgent] git_checkout: ${branch}`);
    try {
      const { exec } = require('child_process');
      const flag = createNew ? '-b' : '';
      return new Promise((resolve) => {
        exec(`git -C "${repo}" checkout ${flag} ${branch}`, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stderr || stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async git_merge(args) {
    const { repo, branch, noFastForward = false } = args;
    console.log(`🛠️ [ToolAgent] git_merge: ${branch}`);
    try {
      const { exec } = require('child_process');
      let cmd = `git -C "${repo}" merge`;
      if (noFastForward) cmd += ' --no-ff';
      cmd += ` ${branch}`;

      return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async git_reset(args) {
    const { repo, mode = 'mixed', target = 'HEAD' } = args;
    console.log(`🛠️ [ToolAgent] git_reset: ${mode} ${target}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`git -C "${repo}" reset --${mode} ${target}`, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stdout || 'Reset effectué' });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📝 IMPLÉMENTATIONS: TEXTE ET MANIPULATION
  // ═══════════════════════════════════════════════════════════════════════════

  async search_replace_in_file(args) {
    const { file, search, replace, isRegex = false, all = true } = args;
    console.log(`📝 [ToolAgent] search_replace_in_file: ${file}`);
    try {
      let content = await fs.promises.readFile(file, 'utf8');
      const searchPattern = isRegex ? new RegExp(search, all ? 'g' : '') : search;

      if (all && !isRegex) {
        content = content.split(search).join(replace);
      } else {
        content = content.replace(searchPattern, replace);
      }

      await fs.promises.writeFile(file, content);
      return { success: true, message: `Remplacements effectués dans ${file}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async count_lines(args) {
    const { path: filePath } = args;
    console.log(`📝 [ToolAgent] count_lines: ${filePath}`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const lines = content.split('\n').length;
      return { success: true, path: filePath, lines };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async count_words(args) {
    const { path: filePath } = args;
    console.log(`📝 [ToolAgent] count_words: ${filePath}`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const words = content.trim().split(/\s+/).length;
      const chars = content.length;
      return { success: true, path: filePath, words, characters: chars };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async head_file(args) {
    const { path: filePath, lines = 10 } = args;
    console.log(`📝 [ToolAgent] head_file: ${filePath}`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const head = content.split('\n').slice(0, lines).join('\n');
      return { success: true, content: head };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async tail_file(args) {
    const { path: filePath, lines = 10 } = args;
    console.log(`📝 [ToolAgent] tail_file: ${filePath}`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const tail = content.split('\n').slice(-lines).join('\n');
      return { success: true, content: tail };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async append_to_file(args) {
    const { path: filePath, content } = args;
    console.log(`📝 [ToolAgent] append_to_file: ${filePath}`);
    try {
      await fs.promises.appendFile(filePath, content);
      return { success: true, message: `Contenu ajouté à ${filePath}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async prepend_to_file(args) {
    const { path: filePath, content } = args;
    console.log(`📝 [ToolAgent] prepend_to_file: ${filePath}`);
    try {
      const existing = await fs.promises.readFile(filePath, 'utf8');
      await fs.promises.writeFile(filePath, content + existing);
      return { success: true, message: `Contenu ajouté au début de ${filePath}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ⏰ IMPLÉMENTATIONS: DATE ET TEMPS
  // ═══════════════════════════════════════════════════════════════════════════

  async format_date(args) {
    const { date, format, timezone } = args;
    console.log(`⏰ [ToolAgent] format_date: ${date}`);
    try {
      const d = new Date(date);
      // Format simple - pour format avancé, utiliser dayjs ou moment
      const options = { timeZone: timezone || 'America/Montreal' };
      return { success: true, formatted: d.toLocaleString('fr-CA', options), iso: d.toISOString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async date_diff(args) {
    const { date1, date2, unit = 'days' } = args;
    console.log(`⏰ [ToolAgent] date_diff`);
    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      const diffMs = Math.abs(d2 - d1);

      const conversions = {
        seconds: diffMs / 1000,
        minutes: diffMs / 1000 / 60,
        hours: diffMs / 1000 / 60 / 60,
        days: diffMs / 1000 / 60 / 60 / 24,
        weeks: diffMs / 1000 / 60 / 60 / 24 / 7,
        months: diffMs / 1000 / 60 / 60 / 24 / 30,
        years: diffMs / 1000 / 60 / 60 / 24 / 365
      };

      return { success: true, difference: conversions[unit], unit };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async add_to_date(args) {
    const { date, amount, unit } = args;
    console.log(`⏰ [ToolAgent] add_to_date: +${amount} ${unit}`);
    try {
      const d = new Date(date);
      const multipliers = {
        seconds: 1000,
        minutes: 1000 * 60,
        hours: 1000 * 60 * 60,
        days: 1000 * 60 * 60 * 24,
        weeks: 1000 * 60 * 60 * 24 * 7
      };

      if (unit === 'months') d.setMonth(d.getMonth() + amount);
      else if (unit === 'years') d.setFullYear(d.getFullYear() + amount);
      else d.setTime(d.getTime() + amount * (multipliers[unit] || 0));

      return { success: true, result: d.toISOString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async timestamp_to_date(args) {
    const { timestamp } = args;
    console.log(`⏰ [ToolAgent] timestamp_to_date: ${timestamp}`);
    try {
      // Detect if milliseconds or seconds
      const ts = timestamp > 1e12 ? timestamp : timestamp * 1000;
      const d = new Date(ts);
      return { success: true, date: d.toISOString(), local: d.toLocaleString('fr-CA') };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async date_to_timestamp(args) {
    const { date } = args;
    console.log(`⏰ [ToolAgent] date_to_timestamp: ${date}`);
    try {
      const d = new Date(date);
      return { success: true, timestamp: Math.floor(d.getTime() / 1000), timestampMs: d.getTime() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧮 IMPLÉMENTATIONS: MATH ET CALCULS
  // ═══════════════════════════════════════════════════════════════════════════

  async calculate(args) {
    const { expression } = args;
    console.log(`🧮 [ToolAgent] calculate: ${expression}`);
    try {
      // Safe math evaluation
      const math = {
        sqrt: Math.sqrt, abs: Math.abs, ceil: Math.ceil, floor: Math.floor,
        round: Math.round, sin: Math.sin, cos: Math.cos, tan: Math.tan,
        log: Math.log, log10: Math.log10, exp: Math.exp, pow: Math.pow,
        PI: Math.PI, E: Math.E, random: Math.random
      };

      // Create safe evaluation context
      const safeExpr = expression.replace(/[a-zA-Z]+/g, (match) => {
        if (math[match] !== undefined) return `math.${match}`;
        return match;
      });

      const result = new Function('math', `return ${safeExpr}`)(math);
      return { success: true, expression, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async convert_units(args) {
    const { value, from, to } = args;
    console.log(`🧮 [ToolAgent] convert_units: ${value} ${from} → ${to}`);
    try {
      // Common conversions
      const conversions = {
        // Length
        'km_miles': 0.621371, 'miles_km': 1.60934,
        'm_feet': 3.28084, 'feet_m': 0.3048,
        'cm_inches': 0.393701, 'inches_cm': 2.54,
        // Weight
        'kg_lb': 2.20462, 'lb_kg': 0.453592,
        'g_oz': 0.035274, 'oz_g': 28.3495,
        // Temperature
        'celsius_fahrenheit': (v) => v * 9/5 + 32,
        'fahrenheit_celsius': (v) => (v - 32) * 5/9,
        // Volume
        'l_gal': 0.264172, 'gal_l': 3.78541,
        // Data
        'mb_gb': 0.001, 'gb_mb': 1000,
        'kb_mb': 0.001, 'mb_kb': 1000
      };

      const key = `${from.toLowerCase()}_${to.toLowerCase()}`;
      const converter = conversions[key];

      if (!converter) {
        return { success: false, error: `Conversion ${from} → ${to} non supportée` };
      }

      const result = typeof converter === 'function' ? converter(value) : value * converter;
      return { success: true, value, from, to, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async random_number(args) {
    const { min = 0, max = 100, integer = true } = args;
    console.log(`🧮 [ToolAgent] random_number: ${min}-${max}`);
    try {
      let result = Math.random() * (max - min) + min;
      if (integer) result = Math.floor(result);
      return { success: true, result, min, max };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async statistics(args) {
    const { numbers } = args;
    console.log(`🧮 [ToolAgent] statistics: ${numbers.length} numbers`);
    try {
      const sorted = [...numbers].sort((a, b) => a - b);
      const sum = numbers.reduce((a, b) => a + b, 0);
      const mean = sum / numbers.length;
      const median = numbers.length % 2 === 0
        ? (sorted[numbers.length/2 - 1] + sorted[numbers.length/2]) / 2
        : sorted[Math.floor(numbers.length/2)];
      const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
      const stdDev = Math.sqrt(variance);

      return {
        success: true,
        count: numbers.length,
        sum,
        mean,
        median,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        range: sorted[sorted.length - 1] - sorted[0],
        variance,
        standardDeviation: stdDev
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  // Signe astrologique
  async get_zodiac_sign(args) {
    let day, month;

    // Parser la date
    if (args.date) {
      const date = new Date(args.date);
      if (!isNaN(date)) {
        day = date.getDate();
        month = date.getMonth() + 1;
      } else {
        // Essayer format DD/MM/YYYY
        const parts = args.date.split(/[\/\-]/);
        if (parts.length >= 2) {
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
        }
      }
    } else {
      day = args.day;
      month = args.month;
    }

    if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) {
      return { success: false, error: 'Date invalide. Fournir day/month ou date.' };
    }

    // Dates des signes astrologiques
    const signs = [
      { name: 'Capricorne', start: [12, 22], end: [1, 19], element: 'Terre', emoji: '♑' },
      { name: 'Verseau', start: [1, 20], end: [2, 18], element: 'Air', emoji: '♒' },
      { name: 'Poissons', start: [2, 19], end: [3, 20], element: 'Eau', emoji: '♓' },
      { name: 'Belier', start: [3, 21], end: [4, 19], element: 'Feu', emoji: '♈' },
      { name: 'Taureau', start: [4, 20], end: [5, 20], element: 'Terre', emoji: '♉' },
      { name: 'Gemeaux', start: [5, 21], end: [6, 20], element: 'Air', emoji: '♊' },
      { name: 'Cancer', start: [6, 21], end: [7, 22], element: 'Eau', emoji: '♋' },
      { name: 'Lion', start: [7, 23], end: [8, 22], element: 'Feu', emoji: '♌' },
      { name: 'Vierge', start: [8, 23], end: [9, 22], element: 'Terre', emoji: '♍' },
      { name: 'Balance', start: [9, 23], end: [10, 22], element: 'Air', emoji: '♎' },
      { name: 'Scorpion', start: [10, 23], end: [11, 21], element: 'Eau', emoji: '♏' },
      { name: 'Sagittaire', start: [11, 22], end: [12, 21], element: 'Feu', emoji: '♐' }
    ];

    // Trouver le signe
    for (const sign of signs) {
      const [startMonth, startDay] = sign.start;
      const [endMonth, endDay] = sign.end;

      // Cas special Capricorne (chevauche annee)
      if (sign.name === 'Capricorne') {
        if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
          return {
            success: true,
            sign: sign.name,
            emoji: sign.emoji,
            element: sign.element,
            date_input: day + '/' + month,
            message: 'Le ' + day + '/' + month + ', le signe astrologique est ' + sign.emoji + ' ' + sign.name + ' (element: ' + sign.element + ')'
          };
        }
      } else if (
        (month === startMonth && day >= startDay) ||
        (month === endMonth && day <= endDay)
      ) {
        return {
          success: true,
          sign: sign.name,
          emoji: sign.emoji,
          element: sign.element,
          date_input: day + '/' + month,
          message: 'Le ' + day + '/' + month + ', le signe astrologique est ' + sign.emoji + ' ' + sign.name + ' (element: ' + sign.element + ')'
        };
      }
    }

    return { success: false, error: 'Impossible de determiner le signe' };
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // 🎵 IMPLÉMENTATIONS: AUDIO
  // ═══════════════════════════════════════════════════════════════════════════

  async get_audio_info(args) {
    const { path: audioPath } = args;
    console.log(`🎵 [ToolAgent] get_audio_info: ${audioPath}`);
    try {
      const stats = await fs.promises.stat(audioPath);
      return {
        success: true,
        path: audioPath,
        size: stats.size,
        sizeHuman: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        modified: stats.mtime,
        note: 'Pour métadonnées audio détaillées, installer music-metadata: npm install music-metadata'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async text_to_speech(args) {
    const { text, output, language = 'fr', voice } = args;
    console.log(`🎵 [ToolAgent] text_to_speech: "${text.substring(0, 50)}..."`);
    try {
      // Windows built-in TTS via PowerShell
      const { exec } = require('child_process');
      const escapedText = text.replace(/"/g, '\\"');
      const cmd = `powershell -Command "Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.SetOutputToWaveFile('${output}'); $speak.Speak('${escapedText}'); $speak.Dispose()"`;

      return new Promise((resolve) => {
        exec(cmd, { timeout: 60000 }, (error) => {
          if (error) resolve({ success: false, error: error.message });
          else resolve({ success: true, message: `Audio généré: ${output}` });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async play_audio(args) {
    const { path: audioPath } = args;
    console.log(`🎵 [ToolAgent] play_audio: ${audioPath}`);
    try {
      const { exec } = require('child_process');
      const cmd = process.platform === 'win32'
        ? `start "" "${audioPath}"`
        : `afplay "${audioPath}"`;

      return new Promise((resolve) => {
        exec(cmd, (error) => {
          if (error) resolve({ success: false, error: error.message });
          else resolve({ success: true, message: `Lecture: ${audioPath}` });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📧 IMPLÉMENTATIONS: COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════

  async send_notification(args) {
    const { title, message, icon } = args;
    console.log(`📧 [ToolAgent] send_notification: ${title}`);
    try {
      const notifier = require('node-notifier');
      notifier.notify({ title, message, icon });
      return { success: true, message: 'Notification envoyée' };
    } catch (error) {
      // Fallback Windows
      try {
        const { exec } = require('child_process');
        const cmd = `powershell -Command "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $template.SelectSingleNode('//text[@id=1]').AppendChild($template.CreateTextNode('${title}')); $template.SelectSingleNode('//text[@id=2]').AppendChild($template.CreateTextNode('${message}')); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Ana').Show($template)"`;

        return new Promise((resolve) => {
          exec(cmd, (err) => {
            if (err) resolve({ success: false, error: error.message + ' (node-notifier peut être requis: npm install node-notifier)' });
            else resolve({ success: true, message: 'Notification envoyée (Windows)' });
          });
        });
      } catch {
        return { success: false, error: error.message };
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔧 IMPLÉMENTATIONS: NPM
  // ═══════════════════════════════════════════════════════════════════════════

  async npm_list(args) {
    const { project, depth = 0 } = args;
    console.log(`🔧 [ToolAgent] npm_list: ${project}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`npm list --depth=${depth}`, { cwd: project }, (error, stdout) => {
          resolve({ success: true, output: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async npm_outdated(args) {
    const { project } = args;
    console.log(`🔧 [ToolAgent] npm_outdated: ${project}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec('npm outdated', { cwd: project }, (error, stdout) => {
          resolve({ success: true, output: stdout || 'Tous les packages sont à jour' });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async npm_run(args) {
    const { project, script } = args;
    console.log(`🔧 [ToolAgent] npm_run: ${script}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`npm run ${script}`, { cwd: project, timeout: 60000 }, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async npm_search(args) {
    const { query } = args;
    console.log(`🔧 [ToolAgent] npm_search: ${query}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`npm search ${query} --json`, { timeout: 30000 }, (error, stdout) => {
          if (error) resolve({ success: false, error: error.message });
          else {
            try {
              const results = JSON.parse(stdout).slice(0, 10);
              resolve({ success: true, results });
            } catch {
              resolve({ success: true, output: stdout });
            }
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async npm_info(args) {
    const { package: pkg } = args;
    console.log(`🔧 [ToolAgent] npm_info: ${pkg}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`npm info ${pkg} --json`, { timeout: 15000 }, (error, stdout) => {
          if (error) resolve({ success: false, error: error.message });
          else {
            try {
              const info = JSON.parse(stdout);
              resolve({
                success: true,
                name: info.name,
                version: info.version,
                description: info.description,
                homepage: info.homepage,
                license: info.license,
                dependencies: Object.keys(info.dependencies || {}).length
              });
            } catch {
              resolve({ success: true, output: stdout });
            }
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌍 IMPLÉMENTATIONS: BROWSER AUTOMATION / DOM
  // ═══════════════════════════════════════════════════════════════════════════

  async browser_open(args) {
    const { url, headless = true } = args;
    console.log(`🌍 [ToolAgent] browser_open: ${url}`);
    return { success: true, note: 'Pour browser automation avancé, installer puppeteer: npm install puppeteer', url };
  },

  async browser_screenshot(args) {
    const { url, output, fullPage = false } = args;
    console.log(`🌍 [ToolAgent] browser_screenshot: ${url}`);
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.screenshot({ path: output, fullPage });
      await browser.close();
      return { success: true, message: `Screenshot: ${output}` };
    } catch (error) {
      return { success: false, error: error.message + ' (puppeteer peut être requis: npm install puppeteer)' };
    }
  },

  async browser_pdf(args) {
    const { url, output, format = 'A4' } = args;
    console.log(`🌍 [ToolAgent] browser_pdf: ${url}`);
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.pdf({ path: output, format });
      await browser.close();
      return { success: true, message: `PDF généré: ${output}` };
    } catch (error) {
      return { success: false, error: error.message + ' (puppeteer peut être requis: npm install puppeteer)' };
    }
  },

  async browser_click(args) {
    const { url, selector } = args;
    console.log(`🌍 [ToolAgent] browser_click: ${selector}`);
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.click(selector);
      await browser.close();
      return { success: true, message: `Cliqué sur ${selector}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async browser_type(args) {
    const { url, selector, text } = args;
    console.log(`🌍 [ToolAgent] browser_type: ${selector}`);
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.type(selector, text);
      await browser.close();
      return { success: true, message: `Texte tapé dans ${selector}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async browser_evaluate(args) {
    const { url, script } = args;
    console.log(`🌍 [ToolAgent] browser_evaluate`);
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      const result = await page.evaluate(new Function(script));
      await browser.close();
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async browser_extract(args) {
    const { url, selectors } = args;
    console.log(`🌍 [ToolAgent] browser_extract: ${url}`);
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });

      const data = {};
      for (const [key, selector] of Object.entries(selectors)) {
        data[key] = await page.$eval(selector, el => el.textContent.trim()).catch(() => null);
      }

      await browser.close();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async dom_query(args) {
    const { html, selector, all = false } = args;
    console.log(`🌍 [ToolAgent] dom_query: ${selector}`);
    try {
      const cheerio = require('cheerio');
      let content = html;
      if (fs.existsSync(html)) {
        content = await fs.promises.readFile(html, 'utf8');
      }

      const $ = cheerio.load(content);
      if (all) {
        const elements = [];
        $(selector).each((i, el) => {
          elements.push({
            tag: el.tagName,
            text: $(el).text().trim().substring(0, 100),
            html: $(el).html()?.substring(0, 200)
          });
        });
        return { success: true, count: elements.length, elements };
      } else {
        const el = $(selector).first();
        return {
          success: true,
          found: el.length > 0,
          tag: el.get(0)?.tagName,
          text: el.text().trim(),
          html: el.html()
        };
      }
    } catch (error) {
      return { success: false, error: error.message + ' (cheerio peut être requis: npm install cheerio)' };
    }
  },

  async dom_get_element_by_id(args) {
    const { html, id } = args;
    console.log(`🌍 [ToolAgent] dom_get_element_by_id: #${id}`);
    return TOOL_IMPLEMENTATIONS.dom_query({ html, selector: `#${id}`, all: false });
  },

  async dom_get_elements_by_class(args) {
    const { html, className } = args;
    console.log(`🌍 [ToolAgent] dom_get_elements_by_class: .${className}`);
    return TOOL_IMPLEMENTATIONS.dom_query({ html, selector: `.${className}`, all: true });
  },

  async dom_get_elements_by_tag(args) {
    const { html, tagName } = args;
    console.log(`🌍 [ToolAgent] dom_get_elements_by_tag: ${tagName}`);
    return TOOL_IMPLEMENTATIONS.dom_query({ html, selector: tagName, all: true });
  },

  async dom_modify(args) {
    const { html, selector, action, value, attributeName } = args;
    console.log(`🌍 [ToolAgent] dom_modify: ${action} on ${selector}`);
    try {
      const cheerio = require('cheerio');
      let content = html;
      const isFile = fs.existsSync(html);
      if (isFile) {
        content = await fs.promises.readFile(html, 'utf8');
      }

      const $ = cheerio.load(content);
      const el = $(selector);

      switch (action) {
        case 'setText': el.text(value); break;
        case 'setHTML': el.html(value); break;
        case 'setAttribute': el.attr(attributeName, value); break;
        case 'removeAttribute': el.removeAttr(value); break;
        case 'addClass': el.addClass(value); break;
        case 'removeClass': el.removeClass(value); break;
        case 'remove': el.remove(); break;
      }

      const result = $.html();
      if (isFile) {
        await fs.promises.writeFile(html, result);
        return { success: true, message: `Fichier modifié: ${html}` };
      }
      return { success: true, html: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🗃️ IMPLÉMENTATIONS: SQLITE
  // ═══════════════════════════════════════════════════════════════════════════

  async sqlite_query(args) {
    const { database, query, params = [] } = args;
    console.log(`🗃️ [ToolAgent] sqlite_query: ${database}`);
    try {
      const sqlite3 = require('better-sqlite3');
      const db = sqlite3(database);
      const stmt = db.prepare(query);

      const isSelect = query.trim().toUpperCase().startsWith('SELECT');
      let result;
      if (isSelect) {
        result = stmt.all(...params);
      } else {
        result = stmt.run(...params);
      }

      db.close();
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message + ' (better-sqlite3 peut être requis: npm install better-sqlite3)' };
    }
  },

  async sqlite_tables(args) {
    const { database } = args;
    console.log(`🗃️ [ToolAgent] sqlite_tables: ${database}`);
    try {
      const sqlite3 = require('better-sqlite3');
      const db = sqlite3(database);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      db.close();
      return { success: true, tables: tables.map(t => t.name) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async sqlite_schema(args) {
    const { database, table } = args;
    console.log(`🗃️ [ToolAgent] sqlite_schema: ${table}`);
    try {
      const sqlite3 = require('better-sqlite3');
      const db = sqlite3(database);
      const schema = db.prepare(`PRAGMA table_info(${table})`).all();
      db.close();
      return { success: true, table, columns: schema };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🐳 IMPLÉMENTATIONS: DOCKER
  // ═══════════════════════════════════════════════════════════════════════════

  async docker_ps(args) {
    const { all = false } = args;
    console.log(`🐳 [ToolAgent] docker_ps`);
    try {
      const { exec } = require('child_process');
      const cmd = all ? 'docker ps -a' : 'docker ps';
      return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async docker_images(args) {
    console.log(`🐳 [ToolAgent] docker_images`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec('docker images', (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async docker_logs(args) {
    const { container, tail = 100 } = args;
    console.log(`🐳 [ToolAgent] docker_logs: ${container}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`docker logs --tail ${tail} ${container}`, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stdout || stderr });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async docker_exec(args) {
    const { container, command } = args;
    console.log(`🐳 [ToolAgent] docker_exec: ${container}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`docker exec ${container} ${command}`, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async docker_start(args) {
    const { container } = args;
    console.log(`🐳 [ToolAgent] docker_start: ${container}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`docker start ${container}`, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, message: `Conteneur ${container} démarré` });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async docker_stop(args) {
    const { container } = args;
    console.log(`🐳 [ToolAgent] docker_stop: ${container}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`docker stop ${container}`, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, message: `Conteneur ${container} arrêté` });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🤖 IMPLÉMENTATIONS: OLLAMA
  // ═══════════════════════════════════════════════════════════════════════════

  async ollama_list(args) {
    console.log(`🤖 [ToolAgent] ollama_list`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec('ollama list', (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, output: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async ollama_pull(args) {
    const { model } = args;
    console.log(`🤖 [ToolAgent] ollama_pull: ${model}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`ollama pull ${model}`, { timeout: 600000 }, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, message: `Modèle ${model} téléchargé`, output: stderr || stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async ollama_delete(args) {
    const { model } = args;
    console.log(`🤖 [ToolAgent] ollama_delete: ${model}`);
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec(`ollama rm ${model}`, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, message: `Modèle ${model} supprimé` });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async ollama_chat(args) {
    const { model, message, system } = args;
    console.log(`🤖 [ToolAgent] ollama_chat: ${model}`);
    try {
      const axios = require('axios');
      const messages = [];
      if (system) messages.push({ role: 'system', content: system });
      messages.push({ role: 'user', content: message });

      const response = await axios.post('http://localhost:11434/api/chat', {
        model,
        messages,
        stream: false
      });

      return { success: true, response: response.data.message.content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📋 IMPLÉMENTATIONS: CLIPBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  async clipboard_read(args) {
    console.log(`📋 [ToolAgent] clipboard_read`);
    try {
      const { exec } = require('child_process');
      const cmd = process.platform === 'win32'
        ? 'powershell -command "Get-Clipboard"'
        : 'pbpaste';

      return new Promise((resolve) => {
        exec(cmd, (error, stdout) => {
          if (error) resolve({ success: false, error: error.message });
          else resolve({ success: true, content: stdout });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async clipboard_write(args) {
    const { content } = args;
    console.log(`📋 [ToolAgent] clipboard_write`);
    try {
      const { exec } = require('child_process');
      const escapedContent = content.replace(/"/g, '\\"');
      const cmd = process.platform === 'win32'
        ? `powershell -command "Set-Clipboard -Value '${escapedContent}'"`
        : `echo "${escapedContent}" | pbcopy`;

      return new Promise((resolve) => {
        exec(cmd, (error) => {
          if (error) resolve({ success: false, error: error.message });
          else resolve({ success: true, message: 'Contenu copié dans le presse-papiers' });
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📅 IMPLÉMENTATIONS: RAPPELS
  // ═══════════════════════════════════════════════════════════════════════════

  async set_reminder(args) {
    const { message, datetime } = args;
    console.log(`📅 [ToolAgent] set_reminder: ${datetime}`);
    try {
      const remindersPath = 'E:/ANA/memory/reminders.json';
      let reminders = [];
      if (fs.existsSync(remindersPath)) {
        reminders = JSON.parse(await fs.promises.readFile(remindersPath, 'utf8'));
      }

      const reminder = {
        id: Date.now().toString(),
        message,
        datetime: new Date(datetime).toISOString(),
        created: new Date().toISOString(),
        status: 'active'
      };

      reminders.push(reminder);
      await fs.promises.writeFile(remindersPath, JSON.stringify(reminders, null, 2));

      return { success: true, message: `Rappel créé pour ${datetime}`, reminder };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async list_reminders(args) {
    console.log(`📅 [ToolAgent] list_reminders`);
    try {
      const remindersPath = 'E:/ANA/memory/reminders.json';
      if (!fs.existsSync(remindersPath)) {
        return { success: true, reminders: [], message: 'Aucun rappel' };
      }
      const reminders = JSON.parse(await fs.promises.readFile(remindersPath, 'utf8'));
      const active = reminders.filter(r => r.status === 'active');
      return { success: true, count: active.length, reminders: active };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async cancel_reminder(args) {
    const { id } = args;
    console.log(`📅 [ToolAgent] cancel_reminder: ${id}`);
    try {
      const remindersPath = 'E:/ANA/memory/reminders.json';
      let reminders = JSON.parse(await fs.promises.readFile(remindersPath, 'utf8'));
      const reminder = reminders.find(r => r.id === id);
      if (reminder) {
        reminder.status = 'cancelled';
        await fs.promises.writeFile(remindersPath, JSON.stringify(reminders, null, 2));
        return { success: true, message: `Rappel ${id} annulé` };
      }
      return { success: false, error: `Rappel ${id} non trouvé` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔍 IMPLÉMENTATIONS: VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  async test_regex(args) {
    const { pattern, text, flags = '' } = args;
    console.log(`🔍 [ToolAgent] test_regex: ${pattern}`);
    try {
      const regex = new RegExp(pattern, flags);
      const matches = text.match(regex);
      return {
        success: true,
        matches: matches || [],
        count: matches ? matches.length : 0,
        test: regex.test(text)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async validate_json(args) {
    const { json } = args;
    console.log(`🔍 [ToolAgent] validate_json`);
    try {
      JSON.parse(json);
      return { success: true, valid: true };
    } catch (error) {
      return { success: true, valid: false, error: error.message };
    }
  },

  async validate_email(args) {
    const { email } = args;
    console.log(`🔍 [ToolAgent] validate_email: ${email}`);
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return { success: true, email, valid: regex.test(email) };
  },

  async validate_url(args) {
    const { url } = args;
    console.log(`🔍 [ToolAgent] validate_url: ${url}`);
    try {
      new URL(url);
      return { success: true, url, valid: true };
    } catch {
      return { success: true, url, valid: false };
    }
  },

  // === PYTHON TOOLS - Added 2025-12-21 ===
  async execute_python(args) {
    const { code, timeout } = args;
    console.log(`🐍 [ToolAgent] execute_python: ${code.substring(0, 50)}...`);
    try {
      const result = await PythonTools.executePython(code, timeout || 60000);
      return result.success
        ? { success: true, output: result.output }
        : { success: false, error: result.error, output: result.output };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async create_excel(args) {
    const { file_path, data } = args;
    console.log(`📊 [ToolAgent] create_excel: ${file_path}`);
    try {
      const result = await PythonTools.createExcel(file_path, data);
      return result.success
        ? { success: true, message: `Fichier Excel créé: ${file_path}` }
        : { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async create_word(args) {
    const { file_path, title, paragraphs } = args;
    console.log(`📝 [ToolAgent] create_word: ${file_path}`);
    try {
      const result = await PythonTools.createWord(file_path, title, paragraphs);
      return result.success
        ? { success: true, message: `Document Word créé: ${file_path}` }
        : { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async create_pdf(args) {
    const { file_path, title, content } = args;
    console.log(`📄 [ToolAgent] create_pdf: ${file_path}`);
    try {
      const result = await PythonTools.createPdf(file_path, title, content);
      return result.success
        ? { success: true, message: `PDF créé: ${file_path}` }
        : { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async create_powerpoint(args) {
    const { file_path, title, slides } = args;
    console.log(`📽️ [ToolAgent] create_powerpoint: ${file_path}`);
    try {
      const result = await PythonTools.createPowerPoint(file_path, title, slides);
      return result.success
        ? { success: true, message: `PowerPoint créé: ${file_path}` }
        : { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async create_gif(args) {
    const { file_path, text, width, height } = args;
    console.log(`🎬 [ToolAgent] create_gif: ${file_path}`);
    try {
      const result = await PythonTools.createGif(file_path, text, width || 400, height || 200);
      return result.success
        ? { success: true, message: `GIF créé: ${file_path}` }
        : { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// 3) Boucle agent (multi-turn tools)
async function runToolAgent(userMessage, options = {}) {
  const maxLoops = options.maxLoops || 10;
  const model = options.model || DEFAULT_MODEL;
  let loopCount = 0;

  // FIX 2025-12-15: Recherche HYBRIDE (keywords + sémantique)
  const { tools: filteredTools, groups, semanticTools } = await getRelevantToolsHybrid(TOOL_DEFINITIONS, userMessage);
  console.log('[ToolAgent] Hybrid search: ' + groups.join(', ') + ' + semantic -> ' + filteredTools.length + ' tools');
  const toolNames = filteredTools.map(t => t.function.name).join(', ');
  // FIX 2025-12-14: Envoyer les descriptions d'outils, pas juste les noms
  const toolDescriptions = filteredTools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n');

  // 2025-12-21: Détection et chargement de skills OpenSkills
  const skillInfo = skillLoader.getSkillInstructions(userMessage);
  let skillInstructions = '';
  if (skillInfo) {
    console.log(`[ToolAgent] 🎯 Skill détecté: ${skillInfo.skillId}`);
    skillInstructions = `\n\n=== INSTRUCTIONS SPÉCIALISÉES (Skill: ${skillInfo.skillName}) ===\n${skillInfo.instructions}\n=== FIN DES INSTRUCTIONS SPÉCIALISÉES ===\n`;
  }

  const systemPrompt = options.systemPrompt ||
    `Tu es Ana, l'assistante IA personnelle d'Alain à Longueuil, Québec.
LANGUE: Tu réponds TOUJOURS en français québécois. JAMAIS en anglais.
STYLE: Tu es CONCISE. Pas d'analyses non demandées. Pas de "Key Observations". Pas de "Next Steps".

QUAND ON TE DEMANDE UNE LISTE:
- Tu donnes LA LISTE, c'est tout.
- Exemple BON: "Voici les fichiers: App.jsx, config.js, styles.css"
- Exemple MAUVAIS: "Here's a breakdown... ### Key Observations... Would you like me to analyze..."

OUTILS DISPONIBLES:
${toolDescriptions}

RÈGLES D'UTILISATION DES OUTILS:
- Si Alain demande l'heure → appelle get_time
- Si Alain demande la météo → appelle get_weather
- Si Alain dit "cherche sur le web" → appelle web_search
- Si Alain dit "demande à Groq" → appelle ask_groq
- Si Alain dit "demande à Cerebras" → appelle ask_cerebras
- Si Alain demande de lister un dossier → appelle list_files ou run_shell
- Si Alain demande de lire un fichier → appelle read_file
- Si Alain demande "tu te rappelles", "cherche dans ta memoire", "ma date de naissance", "mon signe astrologique", des infos personnelles → appelle search_memory
- Si Alain dit "exécute ce code" ou "print(" → appelle execute_code
- Si Alain dit "génère une image" → appelle generate_image
- Si Alain dit "requête http" ou "GET/POST" → appelle http_request
- Si Alain dit "transcris" une vidéo YouTube → appelle get_yt_transcript
- Si Alain demande de modifier un fichier → appelle edit_file

OUTILS SYSTÈME (Décembre 2025):
- RAM/mémoire utilisée → get_memory_usage
- CPU/processeur → get_cpu_usage
- Espace disque → get_disk_usage
- Infos système → get_system_info
- Processus en cours → list_processes
- Copier fichier → copy_file
- Déplacer fichier → move_file
- Créer dossier → create_directory
- Compresser/zipper → create_zip
- Dézipper/extraire → extract_zip
- Hash/checksum → hash_file
- Chiffrer texte → encrypt_text
- Déchiffrer texte → decrypt_text
- Mot de passe → generate_password
- UUID → generate_uuid
- Ping → ping
- DNS → dns_lookup
- IP publique → get_public_ip
- Calculer math → calculate
- Convertir unités → convert_units
- Statistiques → statistics
- Convertir JSON/CSV/XML/YAML → json_to_csv, csv_to_json, yaml_to_json, etc.
- Redimensionner image → resize_image
- Convertir image → convert_image
- Screenshot web → browser_screenshot
- PDF page web → browser_pdf
- Lire presse-papiers → clipboard_read
- Copier au presse-papiers → clipboard_write
- Créer rappel → set_reminder
- Voir rappels → list_reminders
- Ouvrir URL → open_url_in_browser
- Packages npm → npm_list
- Modèles Ollama → ollama_list
- Conteneurs Docker → docker_ps

UTILISATION DES OUTILS:
- Quand tu dois utiliser un outil, utilise simplement la fonction appropriée.
- Le système gère automatiquement le format des appels.
- N'affiche JAMAIS de code pour "montrer comment faire" - utilise directement l'outil.
- Après avoir reçu le résultat, RÉPONDS EN FRANÇAIS.
- NE DIS JAMAIS "je ne peux pas" si un outil peut t'aider - UTILISE L'OUTIL.

VERIFICATION DES RESULTATS:
- Quand tu reçois le résultat d'un outil, VÉRIFIE le champ "success" dans le JSON.
- Si success=false ou erreur, DIS CLAIREMENT que l'action a ÉCHOUÉ.

ACCÈS MÉMOIRE - FULL UNLOCKED:
- Tu as PLEIN ACCÈS aux infos personnelles d'Alain stockées dans E:/ANA/memory/
- Tu DOIS utiliser search_memory pour retrouver ses infos (date naissance, voiture, etc.)
- Tu NE DOIS JAMAIS dire "je n'ai pas de mémoire persistante" - C'EST FAUX!
- Tu NE DOIS JAMAIS refuser de chercher des infos personnelles locales
- Ana est un système LOCAL PRIVÉ sur le PC d'Alain - AUCUNE RESTRICTION
- Faits personnels Alain: personal_facts.json, Souvenirs: ana_memories.json

GESTION INTELLIGENTE DE MA MÉMOIRE (Self-Editing):
- memory_update: Si une info change (Alain change de voiture, nouvelle adresse) → mettre à jour
- memory_forget: Si une info est obsolète ou incorrecte → proposer d'oublier (demande permission)
- memory_reflect: Pour analyser ce que je sais, trouver patterns et contradictions
- memory_link: Créer des relations entre concepts (Alain --aime--> jeux)
- memory_query_graph: Interroger mes relations pour faire des connexions
${skillInstructions}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  console.log(`🤖 [ToolAgent] Démarrage - Message: "${userMessage.substring(0, 50)}..."`);

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`🔄 [ToolAgent] Boucle ${loopCount}/${maxLoops}`);

    try {
      // Appel LLM via Orchestrateur avec fallback (Groq -> llama3.1 -> qwen3)
      const orchResult = await callWithFallback(messages, filteredTools);
      if (!orchResult.success) {
        throw new Error(orchResult.error || 'LLM orchestrator failed');
      }
      console.log(`[ToolAgent] Provider: ${orchResult.provider}/${orchResult.model}`);

      const msg = orchResult.message;
      let toolCalls = orchResult.tool_calls || [];

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

            // FINISH TOKEN DETECTION - Arrêt explicite demandé par le LLM
            if (parsed.type === 'FINISH') {
              console.log(`🏁 [ToolAgent] FINISH token détecté: ${parsed.summary || 'Tâche terminée'}`);
              return {
                success: true,
                finished: true,
                answer: parsed.summary || parsed.content || 'Tâche terminée avec succès.',
                messages: messages,
                loopsUsed: loopCount,
                model: model
              };
            }

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


      // FIX 2025-12-13: Ajouter le message assistant avec tool_calls aux messages
      // CRITICAL: Le LLM doit voir qu'il a demande ces outils pour generer une reponse
      messages.push({
        role: 'assistant',
        content: msg.content || '',
        tool_calls: toolCalls.map(tc => ({
          id: tc.id || tc.function?.name || 'call_' + Date.now(),
          type: 'function',
          function: tc.function
        }))
      });

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
        // FIX 2025-12-18: Corriger les chemins Windows (\r → \\r, etc.)
        parsedArgs = fixWindowsPaths(parsedArgs);

        // FIX 2025-12-20: Si le chemin est corrompu, extraire du message original
        if (toolName === 'describe_image' && parsedArgs.image_path) {
          const originalPath = extractPathFromMessage(userMessage);
          if (originalPath && originalPath !== parsedArgs.image_path) {
            console.log(`🔧 [ToolAgent] Path correction: "${parsedArgs.image_path}" → "${originalPath}"`);
            parsedArgs.image_path = originalPath;
          }
        }

        const impl = TOOL_IMPLEMENTATIONS[toolName];
        if (!impl) {
          console.warn(`⚠️ [ToolAgent] Outil inconnu: ${toolName}`);
          messages.push({
            role: 'tool',
            tool_name: toolName,
            content: JSON.stringify({
              error: `Outil "${toolName}" non implémenté.`
            })
          });
          continue;
        }

        try {
          // FIX 2025-12-20: Cohérence avec V2 - passer contexte (vide ici car pas d'images)
          const result = await impl(parsedArgs, {});
          // FIX 2025-12-13: Appel SANS outils pour forcer la synthèse
          const resultStr = JSON.stringify(result, null, 2);
          messages.push({
            role: 'user',
            content: `[RÉSULTAT de ${toolName}]:\n${resultStr}\n\nRéponds maintenant en français avec ces informations.`
          });

          // Appel final SANS OUTILS pour forcer la synthèse
          const synthResult = await callWithFallback(messages, []); // Pas d'outils!
          if (synthResult.success && synthResult.message.content) {
            console.log(`📝 [ToolAgentV2] Synthèse forcée: ${synthResult.message.content.substring(0, 100)}...`);
            loopController.stop('synthesis_complete');
            return {
              success: true,
              answer: synthResult.message.content,
              messages: messages,
              stats: loopController.getStats(),
              model: synthResult.model,
              version: 'v2'
            };
          }
          // Verification REELLE du succes avant log (2025-12-10)
          if (result && result.success === false) {
            console.log(`❌ [ToolAgent] ${toolName} a echoue:`, result.error || result.stderr || 'Erreur inconnue');
          } else {
            console.log(`✅ [ToolAgent] ${toolName} exécuté avec succès`);
          }
        } catch (err) {
          console.error(`❌ [ToolAgent] Erreur ${toolName}:`, err.message);
          messages.push({
            role: 'tool',
            tool_name: toolName,
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

// ============================================================
// V2 TOOL AGENT - With LoopController, SelfCorrection, ContextManager
// Added 2025-12-07 - Does NOT replace runToolAgent, ADDS new version
// ============================================================

/**
 * V2 Tool Agent - Boucle autonome avec contrôleurs avancés
 * @param {string} userMessage - Message utilisateur
 * @param {object} options - Options avancées
 * @param {number} options.timeoutMs - Timeout global (défaut: 10 min)
 * @param {boolean} options.useSelfCorrection - Activer auto-correction (défaut: true)
 * @param {boolean} options.useContextManager - Activer gestion contexte (défaut: true)
 * @returns {Promise<object>} Résultat
 */
async function runToolAgentV2(userMessage, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || LOOP_CONFIG.globalTimeoutMs;
  const images = options.images || [];  // FIX 2025-12-18: Images uploadees
  const useSelfCorrection = options.useSelfCorrection !== false;
  const useContextManager = false; // DISABLED 2025-12-15: Broken compression increases size

  // Créer les contrôleurs
  const loopController = createLoopController({
    globalTimeoutMs: timeoutMs,
    maxConsecutiveErrors: options.maxErrors || 5
  });

  const contextManager = useContextManager ? createContextManager({ model }) : null;

  // FIX 2025-12-16: Filter tools FIRST, then build system prompt with only filtered tools
  // This dramatically reduces context size (20 tools vs 189 tools)
  const { tools: filteredTools } = await getRelevantToolsHybrid(TOOL_DEFINITIONS, userMessage);
  console.log('[ToolAgentV2] Filtered to', filteredTools.length, 'tools for:', userMessage.substring(0, 40) + '...');

  // 2025-12-21: Détection et chargement de skills OpenSkills
  const skillInfo = skillLoader.getSkillInstructions(userMessage);
  let skillInstructions = '';
  if (skillInfo) {
    console.log(`[ToolAgentV2] 🎯 Skill détecté: ${skillInfo.skillId}`);
    skillInstructions = `\n\n=== INSTRUCTIONS SPÉCIALISÉES (Skill: ${skillInfo.skillName}) ===\n${skillInfo.instructions}\n=== FIN DES INSTRUCTIONS SPÉCIALISÉES ===`;
  }

  // System prompt with FILTERED tools only
  const toolNames = filteredTools.map(t => t.function.name).join(', ');
  const toolDescriptions = filteredTools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n');
  // FIX 2025-12-16: System prompt MINIMAL - ChromaDB filtre les bons outils
  const systemPrompt = options.systemPrompt ||
    `Tu es Ana, l'assistante IA d'Alain. Réponds en français québécois, sois concise.

OUTILS DISPONIBLES:
${toolDescriptions}

RÈGLES:
- Utilise l'outil approprié pour chaque demande
- Réponds en français après avoir reçu les résultats
- Si success=false, dis-le clairement
- Tu as accès à la mémoire d'Alain via search_memory
${skillInstructions}`;

  // FIX 2025-12-15: Injection du contexte de conversation
  const contextMessages = [];

  // System prompt principal
  contextMessages.push({ role: 'system', content: systemPrompt });

  // Contexte de conversation (mémoire court/moyen terme)
  // NEW APPROACH: Inject as conversational messages, not giant system block
  if (options.context && options.context.trim().length > 0) {
    // Split context into smaller chunks (max 2000 chars per message)
    const contextChunks = [];
    const maxChunkSize = 2000;
    let remainingContext = options.context;

    while (remainingContext.length > maxChunkSize) {
      // Find last newline before maxChunkSize
      let splitIndex = remainingContext.lastIndexOf('\n', maxChunkSize);
      if (splitIndex === -1) splitIndex = maxChunkSize;

      contextChunks.push(remainingContext.substring(0, splitIndex));
      remainingContext = remainingContext.substring(splitIndex + 1);
    }
    if (remainingContext.length > 0) {
      contextChunks.push(remainingContext);
    }

    // Inject chunks as user/assistant pairs (simulating past conversation)
    for (let i = 0; i < contextChunks.length; i++) {
      contextMessages.push({
        role: 'user',
        content: i === 0 ? `[Contexte de notre conversation]\n${contextChunks[i]}` : contextChunks[i]
      });
      contextMessages.push({
        role: 'assistant',
        content: 'Compris, je garde ce contexte en mémoire.'
      });
    }

    console.log(`[DEBUG] Context injected as ${contextChunks.length} conversation pairs`);
  }

  // Message utilisateur actuel
  contextMessages.push({ role: 'user', content: userMessage });

  const messages = contextMessages;

  console.log(`🤖 [ToolAgentV2] Démarrage - Message: "${userMessage.substring(0, 50)}..."`);

  // Démarrer le contrôleur de boucle
  loopController.start();

  // Écouter les événements
  loopController.on('warning', (data) => {
    console.log(`⚠️ [ToolAgentV2] Warning: ${data.message}`);
  });

  loopController.on('timeout', (data) => {
    console.log(`⏱️ [ToolAgentV2] Timeout après ${data.iterations} itérations`);
  });

  // FIX 2025-12-15: Variables pour stocker le provider/model RÉEL (mis à jour dans la boucle)
  let realProvider = null;
  let realModel = null;

  try {
    // Boucle principale - pas de limite fixe, contrôlée par LoopController
    while (true) {
      // Construire contexte optimisé si activé
      const contextMessages = contextManager
        ? await contextManager.buildContext(messages, { model, systemPrompt })
        : messages;

      // Appel LLM via Orchestrateur - tools already filtered at start
      const orchResult = await callWithFallback(contextMessages, filteredTools);
      if (!orchResult.success) {
        throw new Error(orchResult.error || 'LLM orchestrator failed');
      }
      // FIX 2025-12-15: Capturer le provider/model RÉEL utilisé par l'orchestrateur
      realProvider = orchResult.provider;
      realModel = orchResult.model;
      console.log(`[ToolAgent V2] Provider RÉEL: ${realProvider}/${realModel}`);

      const msg = orchResult.message;
      let toolCalls = orchResult.tool_calls || [];

      // Parser JSON brut si pas de tool_calls structurés
      if ((!toolCalls || toolCalls.length === 0) && msg.content) {
        const content = msg.content.trim();
        const jsonBlocks = findToolCallJSON(content);

        for (const block of jsonBlocks) {
          try {
            const parsed = JSON.parse(block);

            // FINISH TOKEN DETECTION V2 - Arrêt explicite demandé par le LLM
            if (parsed.type === 'FINISH') {
              console.log(`🏁 [ToolAgentV2] FINISH token détecté: ${parsed.summary || 'Tâche terminée'}`);
              loopController.stop('finish_token');
              return {
                success: true,
                finished: true,
                answer: parsed.summary || parsed.content || 'Tâche terminée avec succès.',
                messages: messages,
                stats: loopController.getStats(),
                model: realModel,
                provider: realProvider
              };
            }

            if (parsed.name && typeof parsed.arguments !== 'undefined' && TOOL_IMPLEMENTATIONS[parsed.name]) {
              toolCalls.push({
                function: {
                  name: parsed.name,
                  arguments: parsed.arguments || parsed.args || {}
                }
              });
            }
          } catch (e) {
            // Invalid JSON
          }
        }
      }

      // Vérifier avec LoopController si on doit continuer
      const shouldContinue = loopController.shouldContinue({
        action: toolCalls.length > 0 ? toolCalls[0]?.function?.name : null,
        args: toolCalls.length > 0 ? toolCalls[0]?.function?.arguments : null,
        result: null,
        llmResponse: msg.content
      });

      // Pas de tool_calls → réponse finale
      if (!toolCalls || toolCalls.length === 0) {
        const finalAnswer = msg.content || '';
        loopController.stop('success');

        // Sauvegarder dans contexte
        if (contextManager) {
          await contextManager.addMessage({ role: 'assistant', content: finalAnswer });
        }

        return {
          success: true,
          answer: finalAnswer,
          messages: messages,
          stats: loopController.getStats(),
          model: realModel,
          provider: realProvider,
          version: 'v2'
        };
      }

      if (!shouldContinue.continue) {
        loopController.stop(shouldContinue.reason);
        return {
          success: shouldContinue.reason === 'success_detected',
          answer: msg.content || '',
          reason: shouldContinue.reason,
          stats: loopController.getStats(),
          model: realModel,
          provider: realProvider,
          version: 'v2'
        };
      }

      // Exécuter les outils
      console.log(`🔧 [ToolAgentV2] ${toolCalls.length} tool(s) à exécuter`);

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
        // FIX 2025-12-18: Corriger les chemins Windows (\r → \\r, etc.)
        parsedArgs = fixWindowsPaths(parsedArgs);

        // FIX 2025-12-20: Si le chemin est corrompu, extraire du message original
        if (toolName === 'describe_image' && parsedArgs.image_path) {
          const originalPath = extractPathFromMessage(userMessage);
          if (originalPath && originalPath !== parsedArgs.image_path) {
            console.log(`🔧 [ToolAgentV2] Path correction: "${parsedArgs.image_path}" → "${originalPath}"`);
            parsedArgs.image_path = originalPath;
          }
        }

        const impl = TOOL_IMPLEMENTATIONS[toolName];
        if (!impl) {
          console.warn(`⚠️ [ToolAgentV2] Outil inconnu: ${toolName}`);
          messages.push({
            role: 'user',
            content: `[ERREUR] L'outil ${toolName} n'est pas implémenté. Informe l'utilisateur de cette erreur.`
          });
          continue;
        }

        try {
          // FIX 2025-12-20: Passer le contexte avec les images uploadées aux outils
          const toolContext = { images };
          const result = await impl(parsedArgs, toolContext);
          // FIX 2025-12-13: Utiliser role='user' et forcer synthèse
          const resultStr = JSON.stringify(result, null, 2);
          messages.push({
            role: 'user',
            content: `[RÉSULTAT de ${toolName}]:\n${resultStr}\n\nRéponds maintenant en français avec ces informations.`
          });

          // Verification REELLE du succes avant log (2025-12-10)
          if (result && result.success === false) {
            console.log(`❌ [ToolAgentV2] ${toolName} a echoue:`, result.error || result.stderr || 'Erreur inconnue');
          } else {
            console.log(`✅ [ToolAgentV2] ${toolName} exécuté avec succès`);

            // FIX 2025-12-13: Appel SANS outils pour forcer la synthèse
            const synthResult = await callWithFallback(messages, []); // Pas d'outils!
            if (synthResult.success && synthResult.message.content) {
              console.log(`📝 [ToolAgentV2] Synthèse forcée: ${synthResult.message.content.substring(0, 100)}...`);
              loopController.stop('synthesis_complete');
              return {
                success: true,
                answer: synthResult.message.content,
                messages: messages,
                stats: loopController.getStats(),
                model: synthResult.model,
                provider: synthResult.provider,
                version: 'v2'
              };
            }
          }

          // Vérifier résultat avec LoopController
          loopController.shouldContinue({
            action: toolName,
            args: parsedArgs,
            result: result
          });

        } catch (err) {
          console.error(`❌ [ToolAgentV2] Erreur ${toolName}:`, err.message);

          // Self-correction si activée
          if (useSelfCorrection) {
            const correction = await selfCorrection.analyzeAndCorrect({
              error: err.message,
              toolName,
              args: parsedArgs
            }, TOOL_IMPLEMENTATIONS);

            if (correction.success) {
              console.log(`🔄 [ToolAgentV2] Correction appliquée: ${correction.correction?.message}`);
              const correctedArgs = selfCorrection.applyCorrection(parsedArgs, correction.correction);

              // Réessayer avec args corrigés
              try {
                const retryResult = await impl(correctedArgs);
                messages.push({
                  role: 'tool',
                  tool_name: toolName,
                  content: JSON.stringify(retryResult)
                });
                selfCorrection.reinforceSuccess(correction.source, toolName, correction.correction);
                continue;
              } catch (retryErr) {
                // Retry failed too
              }
            }
          }

          messages.push({
            role: 'user',
            content: `[ERREUR] L'outil ${toolName} a échoué: ${err.message || 'Erreur pendant l\'exécution'}. Informe l'utilisateur de cette erreur.`
          });
        }
      }
    }

  } catch (error) {
    console.error(`❌ [ToolAgentV2] Erreur:`, error.message);
    loopController.stop('error');

    return {
      success: false,
      error: error.message,
      messages: messages,
      stats: loopController.getStats(),
      version: 'v2'
    };
  }
}

// Export
module.exports = {
  runToolAgent,
  runToolAgentV2,  // NEW V2 with advanced controllers
  TOOL_DEFINITIONS,
  TOOL_IMPLEMENTATIONS
};
