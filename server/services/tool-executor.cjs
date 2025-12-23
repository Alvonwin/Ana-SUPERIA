/**
 * Ana Tool Executor
 * Route les appels d'outils depuis le LLM vers les implémentations
 *
 * Architecture: LLM → ToolExecutor → FileTools/BashTools/SearchTools/GitTools
 */

const FileTools = require('../tools/file-tools.cjs');
const BashTools = require('../tools/bash-tools.cjs');
const SearchTools = require('../tools/search-tools.cjs');
const GitTools = require('../tools/git-tools.cjs');
const WebTools = require('../tools/web-tools.cjs');

class ToolExecutor {
  constructor() {
    // Mapping des noms d'outils vers méthodes
    this.toolMap = {
      // File operations
      read_file: this.executeReadFile.bind(this),
      write_file: this.executeWriteFile.bind(this),
      edit_file: this.executeEditFile.bind(this),
      list_directory: this.executeListDirectory.bind(this),

      // Search operations
      glob_files: this.executeGlobFiles.bind(this),
      search_content: this.executeSearchContent.bind(this),

      // Bash operations
      execute_command: this.executeCommand.bind(this),

      // Git operations
      git_status: this.executeGitStatus.bind(this),
      git_diff: this.executeGitDiff.bind(this),

      // Web operations
      web_search: this.executeWebSearch.bind(this),
      web_fetch: this.executeWebFetch.bind(this),
      wikipedia_search: this.executeWikipediaSearch.bind(this),
      npm_search: this.executeNpmSearch.bind(this),
      github_search: this.executeGithubSearch.bind(this)
    };

    // Statistiques d'exécution
    this.stats = {
      totalCalls: 0,
      successCalls: 0,
      errorCalls: 0,
      callsByTool: {}
    };
  }

  /**
   * Exécute un appel d'outil depuis le LLM
   * @param {object} toolCall - { tool: "nom_outil", params: {...} }
   * @returns {Promise<object>} Résultat ou erreur
   */
  async execute(toolCall) {
    this.stats.totalCalls++;

    try {
      // Validation de base
      if (!toolCall || !toolCall.tool) {
        throw new Error('Format de toolCall invalide: propriété "tool" manquante');
      }

      const toolName = toolCall.tool;
      const params = toolCall.params || {};

      // Statistiques
      this.stats.callsByTool[toolName] = (this.stats.callsByTool[toolName] || 0) + 1;

      // Trouver l'exécuteur
      const executor = this.toolMap[toolName];
      if (!executor) {
        throw new Error(`Outil inconnu: "${toolName}". Outils disponibles: ${Object.keys(this.toolMap).join(', ')}`);
      }

      console.log(`🔧 Exécution outil: ${toolName}`, params);

      // Exécuter l'outil
      const result = await executor(params);

      this.stats.successCalls++;

      return {
        success: true,
        tool: toolName,
        result: result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.stats.errorCalls++;

      console.error(`❌ Erreur outil ${toolCall.tool}:`, error.message);

      return {
        success: false,
        tool: toolCall.tool || 'unknown',
        error: {
          message: error.message,
          code: error.code || 'TOOL_EXECUTION_ERROR'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ============================================================
  // FILE TOOLS EXECUTORS
  // ============================================================

  async executeReadFile(params) {
    const { file_path, limit } = params;

    if (!file_path) {
      throw new Error('Paramètre requis manquant: file_path');
    }

    return await FileTools.read(file_path, { limit });
  }

  async executeWriteFile(params) {
    const { file_path, content } = params;

    if (!file_path || content === undefined) {
      throw new Error('Paramètres requis manquants: file_path, content');
    }

    // FIX 2025-12-23: Detecter content vide (truncation LLM)
    if (content === null || content === '') {
      console.error(`[ToolExecutor] writeFile ECHEC: content vide!`);
      return { success: false, error: 'Contenu manquant - generation tronquee' };
    }

    return await FileTools.write(file_path, content);
  }

  async executeEditFile(params) {
    const { file_path, old_string, new_string } = params;

    if (!file_path || !old_string || new_string === undefined) {
      throw new Error('Paramètres requis manquants: file_path, old_string, new_string');
    }

    return await FileTools.edit(file_path, old_string, new_string);
  }

  async executeListDirectory(params) {
    const { dir_path } = params;

    if (!dir_path) {
      throw new Error('Paramètre requis manquant: dir_path');
    }

    return await FileTools.list(dir_path);
  }

  // ============================================================
  // SEARCH TOOLS EXECUTORS
  // ============================================================

  async executeGlobFiles(params) {
    const { pattern, basePath, limit } = params;

    if (!pattern) {
      throw new Error('Paramètre requis manquant: pattern');
    }

    return await SearchTools.glob(pattern, { basePath, limit });
  }

  async executeSearchContent(params) {
    const { pattern, files, caseSensitive, limit } = params;

    if (!pattern || !files || !Array.isArray(files)) {
      throw new Error('Paramètres requis manquants ou invalides: pattern (string), files (array)');
    }

    return await SearchTools.searchContent(files, pattern, {
      caseSensitive: caseSensitive || false,
      maxResults: limit || 50
    });
  }

  // ============================================================
  // BASH TOOLS EXECUTORS
  // ============================================================

  async executeCommand(params) {
    const { command, cwd, timeout } = params;

    if (!command) {
      throw new Error('Paramètre requis manquant: command');
    }

    return await BashTools.execute(command, { cwd, timeout });
  }

  // ============================================================
  // GIT TOOLS EXECUTORS
  // ============================================================

  async executeGitStatus(params) {
    const { repoPath } = params;

    if (!repoPath) {
      throw new Error('Paramètre requis manquant: repoPath');
    }

    return await GitTools.status(repoPath);
  }

  async executeGitDiff(params) {
    const { repoPath, file, staged } = params;

    if (!repoPath) {
      throw new Error('Paramètre requis manquant: repoPath');
    }

    return await GitTools.diff(repoPath, { file, staged });
  }

  // ============================================================
  // WEB TOOLS EXECUTORS
  // ============================================================

  async executeWebSearch(params) {
    const { query, limit } = params;

    if (!query) {
      throw new Error('Paramètre requis manquant: query');
    }

    return await WebTools.search(query, { limit });
  }

  async executeWebFetch(params) {
    const { url, extractText, extractLinks, maxLength } = params;

    if (!url) {
      throw new Error('Paramètre requis manquant: url');
    }

    return await WebTools.fetch(url, { extractText, extractLinks, maxLength });
  }

  async executeWikipediaSearch(params) {
    const { query, limit } = params;

    if (!query) {
      throw new Error('Paramètre requis manquant: query');
    }

    return await WebTools.wikipedia(query, { limit });
  }

  async executeNpmSearch(params) {
    const { query, limit } = params;

    if (!query) {
      throw new Error('Paramètre requis manquant: query');
    }

    return await WebTools.npmSearch(query, { limit });
  }

  async executeGithubSearch(params) {
    const { query, sort, limit } = params;

    if (!query) {
      throw new Error('Paramètre requis manquant: query');
    }

    return await WebTools.githubSearch(query, { sort, limit });
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Retourne les statistiques d'utilisation
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalCalls > 0
        ? (this.stats.successCalls / this.stats.totalCalls * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset les statistiques
   */
  resetStats() {
    this.stats = {
      totalCalls: 0,
      successCalls: 0,
      errorCalls: 0,
      callsByTool: {}
    };
  }
}

module.exports = ToolExecutor;
