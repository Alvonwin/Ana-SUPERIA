/**
 * Ana Search Tools
 * Fast file pattern matching + content search
 * Architecture: fast-glob + streaming readline
 */

const fg = require('fast-glob');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const readline = require('readline');
const Security = require('../middleware/security.cjs');
const config = require('../config/tools-config.cjs');

// Configuration fast-glob optimale
const DEFAULT_GLOB_OPTIONS = {
  // Performance
  concurrency: 16,
  deep: 10,

  // Sécurité
  ignore: [
    '**/node_modules/**',
    '**/.git/**',
    '**/.vscode/**',
    '**/.env',
    '**/secrets.json',
    '**/credentials.json',
    '**/*.{exe,dll,bin,so,dylib}'
  ],

  // Comportement
  onlyFiles: true,
  dot: false,
  absolute: true,
  throwErrorOnBrokenSymbolicLinks: false,
  suppressErrors: false
};

// Configuration content search
const DEFAULT_CONTENT_SEARCH_OPTIONS = {
  maxFileSize: 10 * 1024 * 1024,  // 10 MB
  maxResults: 500,
  timeout: 30000,                 // 30 secondes
  caseSensitive: false,
  wholeWord: false,
  includeContext: true,
  contextLines: 2
};

// Extensions de fichiers texte searchables
const SEARCHABLE_EXTENSIONS = [
  '.txt', '.md', '.json', '.js', '.cjs', '.mjs',
  '.ts', '.tsx', '.jsx', '.html', '.css', '.scss',
  '.xml', '.yaml', '.yml', '.log', '.sh', '.bat',
  '.py', '.rb', '.go', '.rs', '.c', '.cpp', '.h'
];

class SearchTools {
  /**
   * Chercher fichiers par pattern glob
   * @param {string} pattern - Pattern glob (ex: *.js, star-star-slash-*.tsx)
   * @param {object} options - { basePath, limit, extensions }
   * @returns {object} { success, results, count, truncated }
   */
  static async glob(pattern, options = {}) {
    const {
      basePath = process.cwd(),
      limit = 1000,
      extensions = null
    } = options;

    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(basePath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      // Normaliser pattern
      let finalPattern = pattern;

      // Si extensions spécifiées, construire pattern
      if (extensions && extensions.length > 0) {
        const extList = extensions.map(e =>
          e.startsWith('.') ? e.slice(1) : e
        ).join(',');
        finalPattern = `**/*.{${extList}}`;
      }

      // Exécuter fast-glob
      const results = await fg(finalPattern, {
        ...DEFAULT_GLOB_OPTIONS,
        cwd: basePath,
        absolute: true
      });

      // Limiter résultats
      const limited = results.slice(0, limit);

      // Enrichir avec métadonnées
      const enriched = await Promise.all(
        limited.map(async (filePath) => {
          try {
            const stats = await fs.stat(filePath);
            return {
              path: filePath,
              name: path.basename(filePath),
              extension: path.extname(filePath),
              size: stats.size,
              modified: stats.mtime
            };
          } catch (err) {
            return {
              path: filePath,
              name: path.basename(filePath),
              error: err.message
            };
          }
        })
      );

      return {
        success: true,
        pattern: pattern,
        basePath: basePath,
        found: results.length,
        returned: enriched.length,
        truncated: results.length > limit,
        results: enriched
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GLOB_ERROR',
          message: error.message,
          pattern: pattern
        }
      };
    }
  }

  /**
   * Chercher du contenu dans un fichier (streaming)
   * @param {string} filePath - Chemin fichier
   * @param {string} pattern - Pattern recherche
   * @param {object} options - Options recherche
   * @returns {Promise<object>} Résultats recherche
   */
  static async searchFileContent(filePath, pattern, options = {}) {
    const opts = { ...DEFAULT_CONTENT_SEARCH_OPTIONS, ...options };

    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(filePath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      // Vérifier taille fichier
      const stats = await fs.stat(filePath);
      if (stats.size > opts.maxFileSize) {
        return {
          success: false,
          reason: `File too large: ${this.formatSize(stats.size)} > ${this.formatSize(opts.maxFileSize)}`
        };
      }

      // Vérifier extension
      const ext = path.extname(filePath).toLowerCase();
      if (!SEARCHABLE_EXTENSIONS.includes(ext)) {
        return {
          success: false,
          reason: `Unsupported extension: ${ext}`
        };
      }

      // Recherche avec streaming
      return await this._searchStream(filePath, pattern, opts);

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error.message,
          filePath: filePath
        }
      };
    }
  }

  /**
   * Recherche streaming dans fichier
   * @private
   */
  static _searchStream(filePath, pattern, options) {
    return new Promise((resolve, reject) => {
      const results = [];
      const timeoutHandle = setTimeout(() => {
        reject(new Error('Search timeout exceeded'));
      }, options.timeout);

      try {
        // Créer regex
        const regex = this._createRegex(pattern, options);

        const rl = readline.createInterface({
          input: fsSync.createReadStream(filePath, { encoding: 'utf-8' }),
          crlfDelay: Infinity
        });

        let lineNumber = 0;
        const allLines = [];

        rl.on('line', (line) => {
          lineNumber++;
          allLines.push({ number: lineNumber, text: line });

          if (regex.test(line)) {
            const match = line.match(regex);
            const matchIndex = line.search(regex);

            let context = null;
            if (options.includeContext && allLines.length > 0) {
              const startIdx = Math.max(0, lineNumber - options.contextLines - 1);
              context = {
                before: allLines.slice(startIdx, lineNumber - 1),
                after: [] // Rempli en post-processing
              };
            }

            results.push({
              lineNumber,
              text: line,
              matchIndex,
              matchLength: match[0].length,
              context
            });

            if (results.length >= options.maxResults) {
              rl.close();
            }
          }
        });

        rl.on('close', () => {
          clearTimeout(timeoutHandle);

          // Post-processing: ajouter contexte "after"
          if (options.includeContext) {
            results.forEach(result => {
              if (result.context) {
                const startIdx = result.lineNumber;
                const endIdx = Math.min(allLines.length, startIdx + options.contextLines);
                result.context.after = allLines.slice(startIdx, endIdx);
              }
            });
          }

          resolve({
            success: true,
            filePath,
            pattern: pattern.toString(),
            results,
            totalMatches: results.length,
            truncated: results.length >= options.maxResults
          });
        });

        rl.on('error', (err) => {
          clearTimeout(timeoutHandle);
          reject(err);
        });

      } catch (err) {
        clearTimeout(timeoutHandle);
        reject(err);
      }
    });
  }

  /**
   * Chercher dans plusieurs fichiers
   * @param {string[]} files - Liste fichiers
   * @param {string} pattern - Pattern recherche
   * @param {object} options - Options
   * @returns {Promise<object>} Résultats globaux
   */
  static async searchContent(files, pattern, options = {}) {
    const opts = { ...DEFAULT_CONTENT_SEARCH_OPTIONS, ...options };
    const results = {};
    let totalMatches = 0;

    // Concurrence limitée
    const CONCURRENT = 5;

    for (let i = 0; i < files.length; i += CONCURRENT) {
      const batch = files.slice(i, i + CONCURRENT);

      const batchResults = await Promise.all(
        batch.map(file =>
          this.searchFileContent(file, pattern, opts)
            .catch(err => ({
              filePath: file,
              error: err.message
            }))
        )
      );

      for (const result of batchResults) {
        if (result.error) {
          results[result.filePath] = { error: result.error };
        } else {
          results[result.filePath] = result;
          totalMatches += (result.results?.length || 0);
        }
      }

      // Stop si trop de résultats
      if (totalMatches >= opts.maxResults * 2) break;
    }

    return {
      success: true,
      pattern,
      totalFiles: files.length,
      filesSearched: Object.keys(results).length,
      filesWithMatches: Object.keys(results).filter(
        f => !results[f].error && results[f].results?.length > 0
      ).length,
      results,
      totalMatches
    };
  }

  /**
   * Recherche combinée: fichiers + contenu
   * @param {string} query - Requête recherche
   * @param {object} options - { basePath, limit }
   * @returns {Promise<object>} Résultats combinés
   */
  static async combined(query, options = {}) {
    const {
      basePath = process.cwd(),
      limit = 100
    } = options;

    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(basePath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      // 1. Chercher fichiers par nom
      const filesByName = await fg(`**/*${query}*`, {
        ...DEFAULT_GLOB_OPTIONS,
        cwd: basePath,
        absolute: true
      });

      // 2. Trouver fichiers texte pour content search
      const textFiles = await fg('**/*', {
        ...DEFAULT_GLOB_OPTIONS,
        cwd: basePath,
        absolute: true
      });

      const searchableFiles = textFiles
        .filter(f => {
          const ext = path.extname(f).toLowerCase();
          return SEARCHABLE_EXTENSIONS.includes(ext);
        })
        .slice(0, 50); // Max 50 fichiers

      // 3. Chercher dans contenu
      const contentResults = await this.searchContent(
        searchableFiles,
        query,
        { maxResults: 200, includeContext: false }
      );

      return {
        success: true,
        query,
        basePath,
        filesByName: filesByName.slice(0, limit).map(f => ({
          path: f,
          name: path.basename(f)
        })),
        filesByNameCount: filesByName.length,
        filesWithContent: contentResults.filesWithMatches,
        totalMatches: contentResults.totalMatches,
        contentResults: contentResults.results
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMBINED_SEARCH_ERROR',
          message: error.message,
          query: query
        }
      };
    }
  }

  /**
   * Créer regex avec options
   * @private
   */
  static _createRegex(pattern, options) {
    let flags = 'g';
    if (!options.caseSensitive) flags += 'i';

    let regexPattern = pattern;

    // Whole word
    if (options.wholeWord) {
      regexPattern = `\\b${pattern}\\b`;
    }

    try {
      return new RegExp(regexPattern, flags);
    } catch (err) {
      throw new Error(`Invalid regex pattern: ${err.message}`);
    }
  }

  /**
   * Formater taille fichier
   * @private
   */
  static formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

module.exports = SearchTools;
