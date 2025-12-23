/**
 * ANA CODE AGENT
 * Agent de coding autonome utilisant le tool-calling natif Ollama
 *
 * Architecture: LLM (DeepSeek) → tool_calls → Execute → Result → Loop
 *
 * Date: 28 Novembre 2025
 * Version: 1.0.0
 */

const axios = require('axios');
const FileTools = require('../tools/file-tools.cjs');
const BashTools = require('../tools/bash-tools.cjs');
const SearchTools = require('../tools/search-tools.cjs');
const GitTools = require('../tools/git-tools.cjs');
const WebTools = require('../tools/web-tools.cjs');

// V2 Core Modules - Added 2025-12-07
const {
  createLoopController,
  selfCorrection,
  createTransactionManager,
  createPlanManager
} = require('../core/index.cjs');

// Configuration
const CONFIG = {
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5:latest',  // Supporte le tool-calling natif Ollama,
  maxIterations: 10,
  timeout: 120000,
  // Permissions par lecteur
  permissions: {
    'C:': 'ask',      // Demander permission
    'D:': 'allow',    // Toutes permissions
    'E:': 'allow'     // Toutes permissions
  }
};

// ============================================================
// DÉFINITION DES 13 OUTILS
// ============================================================

const CODING_TOOLS = [
  // ==================== FILE TOOLS ====================
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lire le contenu d\'un fichier. Utiliser pour examiner le code existant avant modification.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du fichier (ex: E:/ANA/server/app.js)' },
          offset: { type: 'number', description: 'Ligne de début (optionnel, défaut: 0)' },
          limit: { type: 'number', description: 'Nombre de lignes à lire (optionnel, défaut: 2000)' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Créer ou remplacer un fichier entier. Un backup est créé automatiquement. Utiliser edit_file pour des modifications partielles.',
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
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Modifier un fichier avec une opération search-replace. Plus sûr que write_file pour des modifications partielles.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du fichier' },
          old_string: { type: 'string', description: 'Texte exact à remplacer (doit être unique dans le fichier)' },
          new_string: { type: 'string', description: 'Nouveau texte' }
        },
        required: ['path', 'old_string', 'new_string']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'Lister le contenu d\'un dossier (fichiers et sous-dossiers).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du dossier' },
          show_hidden: { type: 'boolean', description: 'Afficher fichiers cachés (défaut: false)' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'file_stat',
      description: 'Obtenir les informations sur un fichier (taille, date de modification, type).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin absolu du fichier' }
        },
        required: ['path']
      }
    }
  },

  // ==================== SEARCH TOOLS ====================
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Chercher des fichiers par pattern glob. Ex: **/*.js pour tous les JS, src/**/*.tsx pour les TSX dans src.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Pattern glob (ex: **/*.js, src/**/*.cjs)' },
          base_path: { type: 'string', description: 'Dossier de base pour la recherche' }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_content',
      description: 'Chercher un texte dans le contenu des fichiers (comme grep). Retourne les fichiers contenant le texte.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texte ou regex à chercher' },
          base_path: { type: 'string', description: 'Dossier de base pour la recherche' }
        },
        required: ['query']
      }
    }
  },

  // ==================== BASH TOOLS ====================
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Exécuter une commande shell (npm, node, git, etc.). Timeout de 120 secondes.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Commande à exécuter (ex: npm install, node app.js)' },
          cwd: { type: 'string', description: 'Dossier de travail (optionnel)' }
        },
        required: ['command']
      }
    }
  },

  // ==================== GIT TOOLS ====================
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Voir l\'état Git du repository (fichiers modifiés, staged, untracked).',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin du repository Git' }
        },
        required: ['repo_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Voir les différences Git (modifications non committées).',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin du repository Git' },
          file: { type: 'string', description: 'Fichier spécifique (optionnel, sinon tous)' }
        },
        required: ['repo_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_add',
      description: 'Ajouter des fichiers au staging Git.',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin du repository Git' },
          files: { type: 'string', description: 'Fichiers à ajouter (ex: "." pour tout, ou "file1.js file2.js")' }
        },
        required: ['repo_path', 'files']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_commit',
      description: 'Créer un commit Git avec les fichiers staged.',
      parameters: {
        type: 'object',
        properties: {
          repo_path: { type: 'string', description: 'Chemin du repository Git' },
          message: { type: 'string', description: 'Message du commit' }
        },
        required: ['repo_path', 'message']
      }
    }
  },

  // ==================== WEB TOOLS ====================
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Rechercher sur internet via DuckDuckGo. Utile pour trouver documentation, solutions, exemples.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Requête de recherche' }
        },
        required: ['query']
      }
    }
  }
];

// ============================================================
// MAPPING OUTILS → FONCTIONS
// ============================================================

const TOOL_EXECUTORS = {
  // File Tools
  read_file: async (args) => {
    return await FileTools.read(args.path, {
      offset: args.offset || 0,
      limit: args.limit || 2000
    });
  },

  write_file: async (args) => {
    console.log(`[CodingAgent] write_file: "${args.path}", type: ${typeof args.content}, len: ${args.content?.length || 0}`);
    // FIX 2025-12-23: Detecter content vide/undefined (truncation)
    if (args.content === undefined || args.content === null || args.content === '') {
      console.error(`[CodingAgent] write_file ECHEC: content vide!`);
      return { success: false, error: 'Contenu manquant - generation tronquee' };
    }
    return await FileTools.write(args.path, args.content, { backup: true });
  },

  edit_file: async (args) => {
    return await FileTools.edit(args.path, [
      { search: args.old_string, replace: args.new_string }
    ], { backup: true });
  },

  list_directory: async (args) => {
    return await FileTools.list(args.path, {
      showHidden: args.show_hidden || false,
      details: true
    });
  },

  file_stat: async (args) => {
    return await FileTools.stat(args.path);
  },

  // Search Tools
  search_files: async (args) => {
    return await SearchTools.glob(args.pattern, {
      basePath: args.base_path || process.cwd()
    });
  },

  search_content: async (args) => {
    return await SearchTools.combined(args.query, {
      basePath: args.base_path || process.cwd()
    });
  },

  // Bash Tools
  run_command: async (args) => {
    return await BashTools.execute(args.command, {
      cwd: args.cwd,
      timeout: CONFIG.timeout
    });
  },

  // Git Tools
  git_status: async (args) => {
    return await GitTools.status(args.repo_path);
  },

  git_diff: async (args) => {
    return await GitTools.diff(args.repo_path, { file: args.file });
  },

  git_add: async (args) => {
    const files = args.files.split(' ').filter(f => f.trim());
    return await GitTools.add(args.repo_path, files);
  },

  git_commit: async (args) => {
    return await GitTools.commit(args.repo_path, args.message);
  },

  // Web Tools
  web_search: async (args) => {
    return await WebTools.search(args.query);
  }
};

// ============================================================
// CLASSE PRINCIPALE
// ============================================================

class CodingAgent {
  constructor(options = {}) {
    this.ollamaUrl = options.ollamaUrl || CONFIG.ollamaUrl;
    this.model = options.model || CONFIG.model;
    this.maxIterations = options.maxIterations || CONFIG.maxIterations;
    this.dryRun = options.dryRun || false;

    // Historique des actions
    this.actionLog = [];
  }

  /**
   * Point d'entrée principal
   * @param {string} task - Description de la tâche
   * @param {object} context - Contexte additionnel (fichiers, dossier de travail, etc.)
   * @returns {Promise<object>} Résultat de l'exécution
   */
  async run(task, context = {}) {
    console.log(`\n🤖 [CodingAgent] Nouvelle tâche: "${task.substring(0, 100)}..."`);

    this.actionLog = [];
    const startTime = Date.now();

    // Construire le message système
    const systemPrompt = this.buildSystemPrompt(context);

    // Messages de conversation
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: task }
    ];

    try {
      // Appel initial au LLM
      let response = await this.callOllama(messages);

      // Boucle de traitement des tool_calls
      const result = await this.handleToolCalls(messages, response);

      const elapsed = Date.now() - startTime;
      console.log(`✅ [CodingAgent] Terminé en ${elapsed}ms, ${result.iterations} itération(s)`);

      return {
        success: true,
        response: result.response,
        iterations: result.iterations,
        actions: this.actionLog,
        elapsedMs: elapsed,
        dryRun: this.dryRun
      };

    } catch (error) {
      console.error(`❌ [CodingAgent] Erreur:`, error.message);

      return {
        success: false,
        error: error.message,
        actions: this.actionLog,
        elapsedMs: Date.now() - startTime
      };
    }
  }

  /**
   * Construire le prompt système
   */
  buildSystemPrompt(context) {
    let prompt = `Tu es Ana Code, un agent de développement autonome. Tu peux lire, modifier et créer des fichiers de code.

RÈGLES IMPORTANTES:
1. TOUJOURS lire un fichier AVANT de le modifier (utilise read_file)
2. Préférer edit_file à write_file pour les modifications partielles
3. Vérifier le résultat après chaque modification
4. Ne jamais supprimer de fichiers sans demander
5. Créer des backups est automatique, ne t'en soucie pas

OUTILS DISPONIBLES:
- read_file: Lire un fichier
- write_file: Créer/remplacer un fichier
- edit_file: Modifier (search-replace)
- list_directory: Lister un dossier
- file_stat: Info fichier
- search_files: Chercher fichiers par pattern
- search_content: Chercher dans le contenu
- run_command: Exécuter commande shell
- git_status, git_diff, git_add, git_commit: Opérations Git
- web_search: Recherche internet

PERMISSIONS:
- E:/ et D:/ : Toutes permissions
- C:/ : Demander confirmation avant modification

`;

    if (context.workingDirectory) {
      prompt += `\nDOSSIER DE TRAVAIL: ${context.workingDirectory}\n`;
    }

    if (context.files && context.files.length > 0) {
      prompt += `\nFICHIERS CONCERNÉS:\n${context.files.join('\n')}\n`;
    }

    if (this.dryRun) {
      prompt += `\nMODE DRY-RUN: Ne pas exécuter les modifications, seulement montrer ce qui serait fait.\n`;
    }

    return prompt;
  }

  /**
   * Appeler Ollama
   */
  async callOllama(messages) {
    const response = await axios.post(
      `${this.ollamaUrl}/api/chat`,
      {
        model: this.model,
        messages: messages,
        tools: CODING_TOOLS,
        stream: false,
        options: {
          temperature: 0.2,  // Plus déterministe pour le code
          top_p: 0.9
        }
      },
      { timeout: CONFIG.timeout }
    );

    return response.data;
  }

  /**
   * Boucle de traitement des tool_calls
   */
  async handleToolCalls(messages, response) {
    let iterations = 0;

    while (iterations < this.maxIterations) {
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

      console.log(`🔄 [CodingAgent] Itération ${iterations}/${this.maxIterations}`);

      // Exécuter chaque outil demandé
      for (const toolCall of response.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;

        console.log(`  🔧 Outil: ${toolName}`, JSON.stringify(toolArgs).substring(0, 100));

        // Vérifier permissions pour C:/
        if (this.requiresPermission(toolName, toolArgs)) {
          const permissionResult = {
            success: false,
            error: 'Permission requise pour modifier C:/ - Action non exécutée',
            requiresPermission: true
          };

          messages.push({
            role: 'tool',
            content: JSON.stringify(permissionResult)
          });

          this.actionLog.push({
            tool: toolName,
            args: toolArgs,
            result: permissionResult,
            timestamp: new Date().toISOString()
          });

          continue;
        }

        // Exécuter l'outil (ou simuler en dry-run)
        let toolResult;

        if (this.dryRun && this.isModifyingTool(toolName)) {
          toolResult = {
            success: true,
            dryRun: true,
            message: `[DRY-RUN] ${toolName} serait exécuté avec: ${JSON.stringify(toolArgs)}`
          };
        } else {
          toolResult = await this.executeTool(toolName, toolArgs);
        }

        // Logger l'action
        this.actionLog.push({
          tool: toolName,
          args: toolArgs,
          result: toolResult,
          timestamp: new Date().toISOString()
        });

        // Ajouter le résultat aux messages
        messages.push({
          role: 'tool',
          content: JSON.stringify(toolResult)
        });
      }

      // Renvoyer au LLM avec les résultats
      response = await this.callOllama(messages);
    }

    // Max iterations atteint
    return {
      success: false,
      response: 'Nombre maximum d\'itérations atteint',
      iterations: iterations
    };
  }

  /**
   * Exécuter un outil
   */
  async executeTool(toolName, args) {
    const executor = TOOL_EXECUTORS[toolName];

    if (!executor) {
      return {
        success: false,
        error: `Outil inconnu: ${toolName}`
      };
    }

    try {
      return await executor(args);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Vérifier si l'action nécessite une permission (C:/)
   */
  requiresPermission(toolName, args) {
    const modifyingTools = ['write_file', 'edit_file', 'run_command', 'git_commit'];

    if (!modifyingTools.includes(toolName)) {
      return false;
    }

    // Vérifier si le chemin est sur C:/
    const pathArg = args.path || args.repo_path || args.cwd || '';
    return pathArg.toUpperCase().startsWith('C:');
  }

  /**
   * Vérifier si l'outil modifie des fichiers
   */
  isModifyingTool(toolName) {
    return ['write_file', 'edit_file', 'run_command', 'git_add', 'git_commit'].includes(toolName);
  }

  /**
   * Obtenir le log des actions
   */
  getActionLog() {
    return this.actionLog;
  }
}

// ============================================================
// V2 CODING AGENT - With LoopController, TransactionManager
// Added 2025-12-07 - ADDS new class, does NOT replace CodingAgent
// ============================================================

class CodingAgentV2 extends CodingAgent {
  constructor(options = {}) {
    super(options);

    // V2 Controllers
    this.loopController = createLoopController({
      globalTimeoutMs: options.timeoutMs || 15 * 60 * 1000, // 15 min pour coding
      maxConsecutiveErrors: options.maxErrors || 5
    });

    this.transactionManager = createTransactionManager();
    this.planManager = options.usePlanning ? createPlanManager() : null;

    // V2 specific options
    this.useTransactions = options.useTransactions !== false;
    this.useSelfCorrection = options.useSelfCorrection !== false;
  }

  /**
   * V2 Run - avec contrôleurs avancés
   * @param {string} task - Description de la tâche
   * @param {object} context - Contexte additionnel
   * @returns {Promise<object>} Résultat
   */
  async runV2(task, context = {}) {
    console.log(`\n🤖 [CodingAgentV2] Nouvelle tâche: "${task.substring(0, 100)}..."`);

    this.actionLog = [];
    const startTime = Date.now();

    // Démarrer transaction si activé
    let txId = null;
    if (this.useTransactions) {
      txId = this.transactionManager.beginTransaction({
        description: task.substring(0, 200)
      });
      console.log(`📦 [CodingAgentV2] Transaction démarrée: ${txId}`);
    }

    // Créer un plan si activé
    if (this.planManager) {
      const planResult = await this.planManager.createPlan(task, { context: JSON.stringify(context) });
      if (planResult.success) {
        console.log(`📋 [CodingAgentV2] Plan créé: ${planResult.plan.steps.length} étapes`);
      }
    }

    // Démarrer le loop controller
    this.loopController.start();

    // Construire le message système
    const systemPrompt = this.buildSystemPrompt(context);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: task }
    ];

    try {
      // Appel initial au LLM
      let response = await this.callOllama(messages);

      // Boucle de traitement avec LoopController
      const result = await this.handleToolCallsV2(messages, response, txId);

      const elapsed = Date.now() - startTime;

      // Commit transaction si succès
      if (txId && result.success) {
        const commitResult = this.transactionManager.commit(txId);
        console.log(`✅ [CodingAgentV2] Transaction committed: ${commitResult.operationsCount} opérations`);
      }

      this.loopController.stop('success');

      console.log(`✅ [CodingAgentV2] Terminé en ${elapsed}ms`);

      return {
        success: true,
        response: result.response,
        iterations: result.iterations,
        actions: this.actionLog,
        elapsedMs: elapsed,
        stats: this.loopController.getStats(),
        transactionId: txId,
        version: 'v2'
      };

    } catch (error) {
      console.error(`❌ [CodingAgentV2] Erreur:`, error.message);

      // Rollback transaction si erreur
      if (txId) {
        const rollbackResult = this.transactionManager.rollback(txId);
        console.log(`🔄 [CodingAgentV2] Transaction rolled back: ${rollbackResult.restored?.length || 0} fichiers restaurés`);
      }

      this.loopController.stop('error');

      return {
        success: false,
        error: error.message,
        actions: this.actionLog,
        elapsedMs: Date.now() - startTime,
        stats: this.loopController.getStats(),
        rolledBack: !!txId,
        version: 'v2'
      };
    }
  }

  /**
   * Boucle de traitement V2 avec LoopController
   */
  async handleToolCallsV2(messages, response, txId = null) {
    let iterations = 0;

    while (true) {
      iterations++;

      // Vérifier avec LoopController
      const shouldContinue = this.loopController.shouldContinue({
        action: null,
        result: response,
        llmResponse: response.message?.content
      });

      if (!shouldContinue.continue) {
        return {
          success: shouldContinue.reason === 'success_detected',
          response: response.message?.content || '',
          iterations,
          reason: shouldContinue.reason
        };
      }

      // Ajouter la réponse du LLM aux messages
      messages.push(response.message);

      // Si pas de tool_calls, on a terminé
      if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
        return {
          success: true,
          response: response.message.content,
          iterations
        };
      }

      console.log(`🔄 [CodingAgentV2] Itération ${iterations}`);

      // Exécuter chaque outil demandé
      for (const toolCall of response.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;

        console.log(`  🔧 Outil: ${toolName}`, JSON.stringify(toolArgs).substring(0, 100));

        // Ajouter à la transaction si c'est une modification de fichier
        if (txId && this.isModifyingTool(toolName)) {
          this.transactionManager.addOperation(txId, {
            type: toolName === 'write_file' ? 'create' : 'modify',
            path: toolArgs.path,
            content: toolArgs.content
          });
        }

        // Exécuter l'outil
        let toolResult;
        try {
          toolResult = await this.executeTool(toolName, toolArgs);
        } catch (err) {
          // Self-correction si activée
          if (this.useSelfCorrection) {
            const correction = await selfCorrection.analyzeAndCorrect({
              error: err.message,
              toolName,
              args: toolArgs
            });

            if (correction.success) {
              console.log(`🔄 [CodingAgentV2] Correction: ${correction.correction?.message}`);
              const correctedArgs = selfCorrection.applyCorrection(toolArgs, correction.correction);

              try {
                toolResult = await this.executeTool(toolName, correctedArgs);
              } catch (retryErr) {
                toolResult = { success: false, error: retryErr.message };
              }
            } else {
              toolResult = { success: false, error: err.message };
            }
          } else {
            toolResult = { success: false, error: err.message };
          }
        }

        // Logger l'action
        this.actionLog.push({
          tool: toolName,
          args: toolArgs,
          result: toolResult,
          timestamp: new Date().toISOString()
        });

        // Ajouter le résultat aux messages
        messages.push({
          role: 'tool',
          content: JSON.stringify(toolResult)
        });
      }

      // Renvoyer au LLM avec les résultats
      response = await this.callOllama(messages);
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = CodingAgent;

// Export aussi les outils et la V2
module.exports.CODING_TOOLS = CODING_TOOLS;
module.exports.CONFIG = CONFIG;
module.exports.CodingAgentV2 = CodingAgentV2;  // NEW V2 with advanced controllers
