/**
 * Tool Orchestrator - Script d'orchestration robuste
 * Gestion d'erreurs, logs, et exécution séquentielle/parallèle
 *
 * Créé: 10 Décembre 2025
 */

const fs = require('fs');
const path = require('path');

// Import du tool-agent
let toolAgent;
try {
  toolAgent = require('../agents/tool-agent.cjs');
} catch (e) {
  console.error('Erreur import tool-agent:', e.message);
}

const LOG_PATH = path.join(__dirname, '..', 'logs', 'orchestrator.log');

/**
 * Logger avec timestamps
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}`;
  console.log(logLine);

  try {
    fs.appendFileSync(LOG_PATH, logLine + '\n');
  } catch (e) {
    // Silently fail
  }
}

/**
 * Exécuter un outil avec gestion d'erreurs
 * @param {string} toolName - Nom de l'outil
 * @param {Object} args - Arguments
 * @param {Object} options - Options (timeout, retries)
 */
async function executeTool(toolName, args = {}, options = {}) {
  const { timeout = 30000, retries = 1 } = options;

  log(`Exécution: ${toolName} avec args: ${JSON.stringify(args)}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout après ${timeout}ms`)), timeout);
      });

      const executePromise = toolAgent.TOOL_IMPLEMENTATIONS[toolName](args);

      const result = await Promise.race([executePromise, timeoutPromise]);

      log(`Succès: ${toolName} (tentative ${attempt})`);
      return { success: true, result, tool: toolName };

    } catch (error) {
      log(`Erreur: ${toolName} - ${error.message} (tentative ${attempt}/${retries})`, 'ERROR');

      if (attempt === retries) {
        return { success: false, error: error.message, tool: toolName };
      }

      // Attendre avant retry
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

/**
 * Exécuter une séquence d'outils
 * @param {Array} steps - [{tool: 'name', args: {}}]
 * @param {Object} options - Options globales
 */
async function executeSequence(steps, options = {}) {
  const { stopOnError = true } = options;
  const results = [];

  log(`Démarrage séquence: ${steps.length} étapes`);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    log(`Étape ${i + 1}/${steps.length}: ${step.tool}`);

    const result = await executeTool(step.tool, step.args, step.options);
    results.push(result);

    if (!result.success && stopOnError) {
      log(`Arrêt séquence sur erreur à l'étape ${i + 1}`, 'ERROR');
      break;
    }
  }

  const succeeded = results.filter(r => r.success).length;
  log(`Séquence terminée: ${succeeded}/${steps.length} réussies`);

  return {
    success: succeeded === steps.length,
    results,
    stats: { total: steps.length, succeeded, failed: steps.length - succeeded }
  };
}

/**
 * Exécuter des outils en parallèle
 * @param {Array} tasks - [{tool: 'name', args: {}}]
 */
async function executeParallel(tasks) {
  log(`Exécution parallèle: ${tasks.length} tâches`);

  const promises = tasks.map(task =>
    executeTool(task.tool, task.args, task.options)
  );

  const results = await Promise.allSettled(promises);

  return results.map((r, i) => ({
    tool: tasks[i].tool,
    success: r.status === 'fulfilled' && r.value.success,
    result: r.status === 'fulfilled' ? r.value : { error: r.reason?.message }
  }));
}

/**
 * Workflows prédéfinis
 */
const WORKFLOWS = {
  // Debug React/Firebase
  debugReact: async (errorContext) => {
    return executeSequence([
      { tool: 'search_codebase', args: { project_path: 'E:/ANA', query: errorContext } },
      { tool: 'ask_groq', args: { question: `Comment résoudre cette erreur: ${errorContext}` } }
    ]);
  },

  // Git flow complet
  gitFlow: async (message) => {
    return executeSequence([
      { tool: 'git_status', args: { repo_path: process.cwd() } },
      { tool: 'git_commit', args: { repo_path: process.cwd(), message } }
    ]);
  },

  // Recherche complète
  fullSearch: async (query, projectPath) => {
    return executeParallel([
      { tool: 'search_codebase', args: { project_path: projectPath, query } },
      { tool: 'web_search', args: { query } },
      { tool: 'search_memory', args: { query } }
    ]);
  },

  // Info système Longueuil
  systemInfo: async () => {
    return executeParallel([
      { tool: 'get_time', args: {} },
      { tool: 'get_weather', args: { location: 'Longueuil, Québec' } }
    ]);
  }
};

/**
 * Vérifier la cohérence des outils
 */
function checkToolsHealth() {
  const tools = toolAgent.TOOL_DEFINITIONS || [];
  const implementations = Object.keys(toolAgent.TOOL_IMPLEMENTATIONS || {});

  const defined = tools.map(t => t.function.name);
  const missing = defined.filter(t => !implementations.includes(t));
  const extra = implementations.filter(t => !defined.includes(t));

  return {
    total: defined.length,
    implemented: implementations.length,
    missing,
    extra,
    healthy: missing.length === 0
  };
}

/**
 * Liste des outils disponibles
 */
function listTools() {
  const tools = toolAgent.TOOL_DEFINITIONS || [];
  return tools.map(t => ({
    name: t.function.name,
    description: t.function.description
  }));
}

module.exports = {
  executeTool,
  executeSequence,
  executeParallel,
  WORKFLOWS,
  checkToolsHealth,
  listTools,
  log
};
