/**
 * Ana Git Tools
 * Git operations avec simple-git
 * Architecture: simple-git v3 + sécurité whitelist
 */

const simpleGit = require('simple-git');
const path = require('path');
const Security = require('../middleware/security.cjs');

// Configuration par défaut
const DEFAULT_CONFIG = {
  author: 'Ana AI Assistant',
  email: 'ana@local.ai',
  timeout: {
    block: 30000  // 30 secondes timeout
  }
};

class GitTools {
  /**
   * Obtenir status Git du repository
   * @param {string} repoPath - Chemin du repo
   * @returns {Promise<object>} Status Git
   */
  static async status(repoPath) {
    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(repoPath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const git = simpleGit({
        baseDir: repoPath,
        timeout: DEFAULT_CONFIG.timeout
      });

      const status = await git.status();

      return {
        success: true,
        branch: status.current,
        isClean: status.isClean(),
        ahead: status.ahead,
        behind: status.behind,
        tracking: status.tracking,
        files: {
          staged: status.staged,
          created: status.created,
          deleted: status.deleted,
          modified: status.modified,
          renamed: status.renamed,
          conflicted: status.conflicted,
          untracked: status.files.filter(f => f.working_dir === '?')
        },
        totalChanges: status.staged.length + status.modified.length + status.created.length
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GIT_STATUS_ERROR',
          message: error.message,
          repoPath: repoPath
        }
      };
    }
  }

  /**
   * Obtenir diff Git
   * @param {string} repoPath - Chemin du repo
   * @param {object} options - { file, staged }
   * @returns {Promise<object>} Diff Git
   */
  static async diff(repoPath, options = {}) {
    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(repoPath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const { file = null, staged = false } = options;

      const git = simpleGit({
        baseDir: repoPath,
        timeout: DEFAULT_CONFIG.timeout
      });

      let diffResult;

      if (staged) {
        diffResult = await git.diff(['--cached', file].filter(Boolean));
      } else {
        diffResult = await git.diff([file].filter(Boolean));
      }

      // Parser le diff en sections
      const sections = this._parseDiff(diffResult);

      return {
        success: true,
        raw: diffResult,
        sections: sections,
        totalChanges: sections.reduce((sum, s) => sum + s.additions + s.deletions, 0),
        file: file || 'all',
        staged: staged
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GIT_DIFF_ERROR',
          message: error.message,
          repoPath: repoPath
        }
      };
    }
  }

  /**
   * Ajouter fichiers au staging
   * @param {string} repoPath - Chemin du repo
   * @param {string[]|string} files - Fichiers à ajouter (ou '.' pour tout)
   * @returns {Promise<object>} Résultat add
   */
  static async add(repoPath, files) {
    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(repoPath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const git = simpleGit({
        baseDir: repoPath,
        timeout: DEFAULT_CONFIG.timeout
      });

      // Convertir en array si string
      const filesList = Array.isArray(files) ? files : [files];

      await git.add(filesList);

      return {
        success: true,
        filesAdded: filesList,
        count: filesList.length,
        message: filesList[0] === '.' ? 'All changes staged' : `${filesList.length} file(s) staged`
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GIT_ADD_ERROR',
          message: error.message,
          repoPath: repoPath
        }
      };
    }
  }

  /**
   * Créer un commit
   * @param {string} repoPath - Chemin du repo
   * @param {string} message - Message du commit
   * @param {object} options - { author, email }
   * @returns {Promise<object>} Résultat commit
   */
  static async commit(repoPath, message, options = {}) {
    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(repoPath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      // Valider message
      if (!message || message.trim().length === 0) {
        throw new Error('Commit message cannot be empty');
      }

      if (message.length > 500) {
        throw new Error('Commit message too long (max 500 chars)');
      }

      const {
        author = DEFAULT_CONFIG.author,
        email = DEFAULT_CONFIG.email
      } = options;

      const git = simpleGit({
        baseDir: repoPath,
        timeout: DEFAULT_CONFIG.timeout
      });

      // Effectuer le commit avec author
      const result = await git.commit(message, {
        '--author': `${author} <${email}>`
      });

      return {
        success: true,
        hash: result.commit,
        shortHash: result.commit?.substring(0, 7),
        branch: result.branch,
        author: author,
        email: email,
        message: message,
        summary: result.summary,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GIT_COMMIT_ERROR',
          message: error.message,
          repoPath: repoPath
        }
      };
    }
  }

  /**
   * Obtenir l'historique Git (log)
   * @param {string} repoPath - Chemin du repo
   * @param {object} options - { maxCount, file }
   * @returns {Promise<object>} Log Git
   */
  static async log(repoPath, options = {}) {
    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(repoPath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const { maxCount = 10, file = null } = options;

      const git = simpleGit({
        baseDir: repoPath,
        timeout: DEFAULT_CONFIG.timeout
      });

      const logOptions = {
        maxCount: maxCount
      };

      if (file) {
        logOptions.file = file;
      }

      const log = await git.log(logOptions);

      return {
        success: true,
        commits: log.all.map(commit => ({
          hash: commit.hash,
          shortHash: commit.hash?.substring(0, 7),
          author: commit.author_name,
          email: commit.author_email,
          date: commit.date,
          message: commit.message,
          refs: commit.refs,
          body: commit.body
        })),
        total: log.total,
        latest: log.latest
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GIT_LOG_ERROR',
          message: error.message,
          repoPath: repoPath
        }
      };
    }
  }

  /**
   * Reset des fichiers staged
   * @param {string} repoPath - Chemin du repo
   * @param {string[]|string} files - Fichiers à reset (ou null pour tout)
   * @returns {Promise<object>} Résultat reset
   */
  static async reset(repoPath, files = null) {
    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(repoPath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const git = simpleGit({
        baseDir: repoPath,
        timeout: DEFAULT_CONFIG.timeout
      });

      if (files) {
        const filesList = Array.isArray(files) ? files : [files];
        await git.reset(filesList);
        return {
          success: true,
          message: `${filesList.length} file(s) unstaged`,
          files: filesList
        };
      } else {
        await git.reset(['HEAD']);
        return {
          success: true,
          message: 'All files unstaged'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GIT_RESET_ERROR',
          message: error.message,
          repoPath: repoPath
        }
      };
    }
  }

  /**
   * Vérifier si le chemin est un repository Git
   * @param {string} repoPath - Chemin à vérifier
   * @returns {Promise<object>} Résultat validation
   */
  static async isRepo(repoPath) {
    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(repoPath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const git = simpleGit({
        baseDir: repoPath,
        timeout: DEFAULT_CONFIG.timeout
      });

      await git.status();

      return {
        success: true,
        isRepo: true,
        path: repoPath
      };

    } catch (error) {
      return {
        success: true,
        isRepo: false,
        path: repoPath,
        reason: error.message
      };
    }
  }

  /**
   * Parser diff en sections
   * @private
   */
  static _parseDiff(diffString) {
    if (!diffString || diffString.trim().length === 0) {
      return [];
    }

    const sections = [];
    let currentSection = null;

    const lines = diffString.split('\n');

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        const files = line.match(/a\/(.*) b\/(.*)/);
        currentSection = {
          file: files ? files[2] : 'unknown',
          additions: 0,
          deletions: 0,
          lines: []
        };
      } else if (currentSection) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          currentSection.additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          currentSection.deletions++;
        }
        currentSection.lines.push(line);
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }
}

module.exports = GitTools;
