/**
 * Ana File Tools
 * Read, Write, List, Edit, Delete, Copy, Move files
 */

const fs = require('fs').promises;
const path = require('path');
const Security = require('../middleware/security.cjs');

class FileTools {
  /**
   * Lire un fichier
   * @param {string} filePath - Path absolu du fichier
   * @param {object} options - { encoding, offset, limit }
   * @returns {object} { success, content, lines, size }
   */
  static async read(filePath, options = {}) {
    const {
      encoding = 'utf8',
      offset = 0,
      limit = 2000
    } = options;

    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(filePath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const resolved = validation.path;

      // Vérifier taille
      const sizeCheck = await Security.checkFileSize(resolved);
      if (!sizeCheck.allowed) {
        throw new Error(sizeCheck.reason);
      }

      // Lire fichier
      let content = await fs.readFile(resolved, encoding);

      // Appliquer offset/limit si demandé
      if (offset > 0 || limit < Infinity) {
        const lines = content.split('\n');
        const selectedLines = lines.slice(offset, offset + limit);
        content = selectedLines.join('\n');
      }

      // Compter lignes
      const totalLines = content.split('\n').length;

      return {
        success: true,
        path: resolved,
        content: content,
        lines: totalLines,
        size: sizeCheck.size,
        encoding: encoding
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'READ_ERROR',
          message: error.message,
          path: filePath
        }
      };
    }
  }

  /**
   * Écrire (créer/écraser) un fichier
   * @param {string} filePath - Path absolu
   * @param {string} content - Contenu
   * @param {object} options - { createDirectories, backup }
   * @returns {object} { success, bytesWritten, backupPath }
   */
  static async write(filePath, content, options = {}) {
    const {
      createDirectories = true,
      backup = true
    } = options;

    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(filePath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const resolved = validation.path;

      // Créer backup si fichier existe
      let backupResult = { created: false };
      if (backup) {
        backupResult = await Security.createBackup(resolved);
      }

      // Créer dossiers parents si nécessaire
      if (createDirectories) {
        const dir = path.dirname(resolved);
        await fs.mkdir(dir, { recursive: true });
      }

      // Écrire fichier
      await fs.writeFile(resolved, content, 'utf8');

      // Obtenir taille écrite
      const stats = await fs.stat(resolved);

      return {
        success: true,
        path: resolved,
        bytesWritten: stats.size,
        backupPath: backupResult.backupPath || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'WRITE_ERROR',
          message: error.message,
          path: filePath
        }
      };
    }
  }

  /**
   * Lister contenu d'un dossier
   * @param {string} dirPath - Path du dossier
   * @param {object} options - { recursive, showHidden, details }
   * @returns {object} { success, entries, count }
   */
  static async list(dirPath, options = {}) {
    const {
      recursive = false,
      showHidden = false,
      details = true
    } = options;

    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(dirPath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const resolved = validation.path;

      // Lire dossier
      const entries = await fs.readdir(resolved, { withFileTypes: true });

      // Filtrer hidden si nécessaire
      const filtered = showHidden
        ? entries
        : entries.filter(e => !e.name.startsWith('.'));

      // Construire liste avec détails
      const result = [];
      for (const entry of filtered) {
        const entryPath = path.join(resolved, entry.name);

        if (details) {
          try {
            const stats = await fs.stat(entryPath);
            result.push({
              name: entry.name,
              path: entryPath,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime
            });
          } catch (e) {
            // Ignorer erreurs stats individuels
            result.push({
              name: entry.name,
              path: entryPath,
              type: entry.isDirectory() ? 'directory' : 'file'
            });
          }
        } else {
          result.push({
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file'
          });
        }
      }

      return {
        success: true,
        path: resolved,
        entries: result,
        count: result.length
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'LIST_ERROR',
          message: error.message,
          path: dirPath
        }
      };
    }
  }

  /**
   * Obtenir stats d'un fichier
   * @param {string} filePath - Path du fichier
   * @returns {object} { success, stats }
   */
  static async stat(filePath) {
    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(filePath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const resolved = validation.path;
      const stats = await fs.stat(resolved);

      return {
        success: true,
        path: resolved,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'STAT_ERROR',
          message: error.message,
          path: filePath
        }
      };
    }
  }

  /**
   * Éditer un fichier (search-replace)
   * @param {string} filePath - Path du fichier
   * @param {array} operations - [{ search, replace, all }]
   * @param {object} options - { backup }
   * @returns {object} { success, operationsApplied, backupPath }
   */
  static async edit(filePath, operations, options = {}) {
    const { backup = true } = options;

    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(filePath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const resolved = validation.path;

      // Créer backup
      let backupResult = { created: false };
      if (backup) {
        backupResult = await Security.createBackup(resolved);
      }

      // Lire fichier
      let content = await fs.readFile(resolved, 'utf8');
      let operationsApplied = 0;

      // Appliquer opérations
      for (const op of operations) {
        const { search, replace, all = false } = op;

        if (all) {
          // Remplacer toutes occurrences
          const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          const newContent = content.replace(regex, replace);
          if (newContent !== content) {
            content = newContent;
            operationsApplied++;
          }
        } else {
          // Remplacer première occurrence
          if (content.includes(search)) {
            content = content.replace(search, replace);
            operationsApplied++;
          }
        }
      }

      // Écrire fichier modifié
      await fs.writeFile(resolved, content, 'utf8');

      return {
        success: true,
        path: resolved,
        operationsApplied: operationsApplied,
        backupPath: backupResult.backupPath || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'EDIT_ERROR',
          message: error.message,
          path: filePath
        }
      };
    }
  }

  /**
   * Supprimer fichier ou dossier
   * @param {string} targetPath - Path à supprimer
   * @param {object} options - { recursive, backup }
   * @returns {object} { success, deleted, backupPath }
   */
  static async delete(targetPath, options = {}) {
    const { recursive = false, backup = true } = options;

    try {
      // Validation sécurité
      const validation = Security.isPathAllowed(targetPath);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      const resolved = validation.path;

      // Créer backup si fichier
      let backupResult = { created: false };
      if (backup) {
        const stats = await fs.stat(resolved);
        if (stats.isFile()) {
          backupResult = await Security.createBackup(resolved);
        }
      }

      // Supprimer
      await fs.rm(resolved, { recursive: recursive, force: true });

      return {
        success: true,
        deleted: resolved,
        backupPath: backupResult.backupPath || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'DELETE_ERROR',
          message: error.message,
          path: targetPath
        }
      };
    }
  }
}

module.exports = FileTools;
