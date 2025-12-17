/**
 * Voice Command Parser - Phase 3.1 ANA CODE
 *
 * Parse les commandes vocales pour les transformer en actions ToolAgent
 *
 * Créé: 9 Décembre 2025
 */

/**
 * Patterns de commandes vocales et leurs mappings vers les tools
 */
const VOICE_COMMANDS = [
  // === GIT COMMANDS ===
  {
    patterns: [/git status/i, /statut git/i, /état du repo/i],
    tool: 'git_status',
    extractArgs: () => ({ repo_path: process.cwd() })
  },
  {
    patterns: [/git commit (.+)/i, /commit (.+)/i, /commite (.+)/i],
    tool: 'git_commit',
    extractArgs: (match) => ({
      repo_path: process.cwd(),
      message: match[1]
    })
  },
  {
    patterns: [/git log/i, /historique git/i, /derniers commits/i],
    tool: 'git_log',
    extractArgs: () => ({ repo_path: process.cwd(), limit: 10 })
  },
  {
    patterns: [/liste les branches/i, /git branches/i, /branches git/i],
    tool: 'git_branch',
    extractArgs: () => ({ repo_path: process.cwd(), action: 'list' })
  },

  // === FILE COMMANDS ===
  {
    patterns: [/lis le fichier (.+)/i, /ouvre (.+)/i, /affiche (.+)/i],
    tool: 'read_file',
    extractArgs: (match) => ({ path: match[1].trim() })
  },
  {
    patterns: [/liste les fichiers(?: dans (.+))?/i, /ls(?: (.+))?/i],
    tool: 'list_files',
    extractArgs: (match) => ({ path: match[1] || '.' })
  },
  {
    patterns: [/cherche (.+) dans (.+)/i, /grep (.+) dans (.+)/i],
    tool: 'grep',
    extractArgs: (match) => ({ pattern: match[1], path: match[2] })
  },

  // === CODING COMMANDS ===
  {
    patterns: [/crée une fonction (.+)/i, /nouvelle fonction (.+)/i],
    tool: 'execute_code',
    extractArgs: (match) => ({
      code: `// Fonction: ${match[1]}\nfunction ${match[1].replace(/\s+/g, '_')}() {\n  // TODO: Implémenter\n}`,
      language: 'javascript'
    })
  },
  {
    patterns: [/exécute ce code (.+)/i, /run (.+)/i],
    tool: 'execute_code',
    extractArgs: (match) => ({ code: match[1] })
  },
  {
    patterns: [/cherche dans le code (.+)/i, /search codebase (.+)/i],
    tool: 'search_codebase',
    extractArgs: (match) => ({
      project_path: process.cwd(),
      query: match[1]
    })
  },
  {
    patterns: [/structure du projet/i, /arbre du projet/i],
    tool: 'get_project_structure',
    extractArgs: () => ({ project_path: process.cwd() })
  },

  // === WEB COMMANDS ===
  {
    patterns: [/cherche sur le web (.+)/i, /recherche (.+)/i, /google (.+)/i],
    tool: 'web_search',
    extractArgs: (match) => ({ query: match[1] })
  },
  {
    patterns: [/quelle heure/i, /heure actuelle/i, /l'heure/i],
    tool: 'get_time',
    extractArgs: () => ({})
  },
  {
    patterns: [/météo(?: à| pour)? (.+)/i, /quel temps à (.+)/i],
    tool: 'get_weather',
    extractArgs: (match) => ({ location: match[1] })
  },

  // === MEMORY COMMANDS ===
  {
    patterns: [/tu te rappelles (.+)/i, /souviens-toi (.+)/i, /cherche en mémoire (.+)/i],
    tool: 'search_memory',
    extractArgs: (match) => ({ query: match[1] })
  },
  {
    patterns: [/note (?:que )?(.+)/i, /retiens (?:que )?(.+)/i, /sauvegarde en mémoire (.+)/i],
    tool: 'save_memory',
    extractArgs: (match) => ({ content: match[1], type: 'note' })
  },

  // === VISION COMMANDS ===
  {
    patterns: [/analyse cette image/i, /décris cette image/i, /qu'est-ce que c'est/i],
    tool: 'describe_image',
    extractArgs: () => ({ prompt: 'Décris cette image en détail.' })
  },
  {
    patterns: [/debug ce screenshot/i, /analyse cette erreur/i, /quelle est cette erreur/i],
    tool: 'debug_screenshot',
    extractArgs: () => ({ context: 'Erreur de développement' })
  },

  // === TODO COMMANDS ===
  {
    patterns: [/ajoute une tâche (.+)/i, /nouvelle tâche (.+)/i, /todo (.+)/i],
    tool: 'todo_write',
    extractArgs: (match) => ({
      action: 'add',
      task: match[1]
    })
  },
  {
    patterns: [/liste les tâches/i, /affiche les todos/i, /mes tâches/i],
    tool: 'todo_write',
    extractArgs: () => ({ action: 'list' })
  },

  // === SHELL COMMANDS ===
  {
    patterns: [/lance la commande (.+)/i, /exécute (.+)/i, /shell (.+)/i],
    tool: 'run_shell',
    extractArgs: (match) => ({ command: match[1] })
  },
  {
    patterns: [/npm install/i, /installe les dépendances/i],
    tool: 'run_shell',
    extractArgs: () => ({ command: 'npm install' })
  },
  {
    patterns: [/npm run (.+)/i, /lance (.+)/i],
    tool: 'run_shell',
    extractArgs: (match) => ({ command: `npm run ${match[1]}` })
  }
];

/**
 * Parse une transcription vocale et retourne l'action à exécuter
 * @param {string} transcript - Texte transcrit depuis la voix
 * @returns {Object} - { matched: boolean, tool: string, args: object, originalText: string }
 */
function parseVoiceCommand(transcript) {
  const normalizedText = transcript.toLowerCase().trim();

  for (const command of VOICE_COMMANDS) {
    for (const pattern of command.patterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        return {
          matched: true,
          tool: command.tool,
          args: command.extractArgs(match),
          originalText: transcript,
          pattern: pattern.toString()
        };
      }
    }
  }

  // Pas de commande reconnue - retourner pour traitement naturel
  return {
    matched: false,
    tool: null,
    args: null,
    originalText: transcript,
    suggestion: 'Commande non reconnue. Traitement en langage naturel.'
  };
}

/**
 * Liste toutes les commandes disponibles
 */
function getAvailableCommands() {
  return VOICE_COMMANDS.map(cmd => ({
    tool: cmd.tool,
    patterns: cmd.patterns.map(p => p.toString().replace(/\/i$/, '').replace(/^\^?\//, ''))
  }));
}

/**
 * Ajouter une commande personnalisée
 */
function addCustomCommand(patterns, tool, extractArgs) {
  VOICE_COMMANDS.push({
    patterns: patterns.map(p => new RegExp(p, 'i')),
    tool,
    extractArgs
  });
}

module.exports = {
  parseVoiceCommand,
  getAvailableCommands,
  addCustomCommand,
  VOICE_COMMANDS
};
