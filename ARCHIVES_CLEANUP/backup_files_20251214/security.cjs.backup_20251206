/**
 * Ana Security Middleware
 * Validation paths, commandes, rate limiting
 */

const path = require('path');
const fs = require('fs').promises;
const config = require('../config/tools-config.cjs');

class SecurityMiddleware {
  /**
   * Normalise et résout path absolu
   */
  static resolvePath(inputPath) {
    // Résoudre path absolu
    const resolved = path.resolve(inputPath);
    // Normaliser (enlever .., ., etc.)
    return path.normalize(resolved);
  }

  /**
   * Vérifie si path est dans whitelist
   * FIX SECURITY: Protection renforcée contre path traversal
   */
  static isPathAllowed(inputPath) {
    // FIX: Détecter null bytes (bypass classique)
    if (inputPath.includes('\x00') || inputPath.includes('\0')) {
      return {
        allowed: false,
        reason: 'SECURITY: Null byte détecté dans path',
        path: inputPath
      };
    }

    // FIX: Détecter UNC paths Windows (\\server\share)
    if (inputPath.startsWith('\\\\') || inputPath.startsWith('//')) {
      return {
        allowed: false,
        reason: 'SECURITY: UNC path interdit',
        path: inputPath
      };
    }

    // FIX: Détecter Windows Alternate Data Streams (file.txt:hidden)
    // Le caractère : après la lettre de lecteur est ok (C:\)
    const pathWithoutDrive = inputPath.replace(/^[A-Za-z]:/, '');
    if (pathWithoutDrive.includes(':')) {
      return {
        allowed: false,
        reason: 'SECURITY: Alternate Data Stream interdit',
        path: inputPath
      };
    }

    // FIX: Détecter encodages URL dans path
    if (/%[0-9a-f]{2}/i.test(inputPath)) {
      return {
        allowed: false,
        reason: 'SECURITY: Encodage URL détecté dans path',
        path: inputPath
      };
    }

    const resolved = this.resolvePath(inputPath);

    // FIX: Double-vérification après normalisation
    // S'assurer que le path normalisé ne contient pas de traversal résiduel
    if (resolved.includes('..')) {
      return {
        allowed: false,
        reason: 'SECURITY: Path traversal détecté après normalisation',
        path: resolved
      };
    }

    // Vérifier si dans un allowed root
    const inAllowedRoot = config.ALLOWED_ROOTS.some(root => {
      const normalizedRoot = path.normalize(root);
      return resolved.toLowerCase().startsWith(normalizedRoot.toLowerCase());
    });

    if (!inAllowedRoot) {
      return {
        allowed: false,
        reason: `Path hors whitelist: ${resolved}`,
        path: resolved
      };
    }

    // Vérifier forbidden paths (patterns)
    for (const forbidden of config.FORBIDDEN_PATHS) {
      // Pattern matching simple
      if (forbidden.includes('**')) {
        const pattern = forbidden.replace(/\*\*/g, '.*');
        const regex = new RegExp(pattern, 'i'); // Case insensitive
        if (regex.test(resolved)) {
          return {
            allowed: false,
            reason: `Path interdit (pattern): ${forbidden}`,
            path: resolved
          };
        }
      } else if (resolved.toLowerCase().includes(forbidden.toLowerCase())) {
        return {
          allowed: false,
          reason: `Path interdit: ${forbidden}`,
          path: resolved
        };
      }
    }

    // Vérifier extension
    const ext = path.extname(resolved).toLowerCase();
    if (ext && config.FORBIDDEN_EXTENSIONS.includes(ext)) {
      return {
        allowed: false,
        reason: `Extension interdite: ${ext}`,
        path: resolved
      };
    }

    return {
      allowed: true,
      path: resolved
    };
  }

  /**
   * Vérifie si commande est autorisée
   * FIX SECURITY: Détection améliorée injection shell
   */
  static isCommandAllowed(command) {
    const cmdLower = command.toLowerCase().trim();

    // FIX: Détecter caractères d'injection shell AVANT tout
    const shellMetaChars = /[;&|`$(){}[\]<>\\!]|&&|\|\|/;
    if (shellMetaChars.test(command)) {
      return {
        allowed: false,
        reason: 'SECURITY: Caractères shell dangereux détectés (;, &, |, `, $, etc.)'
      };
    }

    // FIX: Détecter tentatives d'encodage/obfuscation
    const obfuscationPatterns = [
      /\$\([^)]*\)/,           // $(command)
      /`[^`]*`/,               // `command`
      /\${[^}]*}/,             // ${var}
      /\\x[0-9a-f]{2}/i,       // \x00 hex encoding
      /\\[0-7]{3}/,            // \000 octal encoding
      /%[0-9a-f]{2}/i,         // %00 URL encoding
      /\r|\n/,                 // newlines (command injection)
    ];

    for (const pattern of obfuscationPatterns) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: 'SECURITY: Pattern d\'obfuscation détecté'
        };
      }
    }

    // Check dangerous commands (normalize spaces)
    const normalizedCmd = cmdLower.replace(/\s+/g, ' ');
    for (const dangerous of config.DANGEROUS_COMMANDS) {
      const normalizedDangerous = dangerous.toLowerCase().replace(/\s+/g, ' ');
      if (normalizedCmd.includes(normalizedDangerous)) {
        return {
          allowed: false,
          reason: `Commande dangereuse: ${dangerous}`
        };
      }
    }

    // Extract base command (premier mot)
    const baseCmd = cmdLower.split(/\s+/)[0];

    // FULL UNLOCKED: Si '*' dans whitelist, tout est permis
    if (config.ALLOWED_COMMANDS.includes('*')) {
      return { allowed: true };
    }

    // Check if base command in whitelist
    const isAllowed = config.ALLOWED_COMMANDS.some(allowed =>
      baseCmd === allowed || baseCmd.startsWith(allowed + '.exe')
    );

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Commande non autorisée: ${baseCmd}`
      };
    }

    return { allowed: true };
  }

  /**
   * Vérifie taille fichier
   */
  static async checkFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > config.MAX_FILE_SIZE) {
        return {
          allowed: false,
          reason: `Fichier trop grand: ${(stats.size / 1024 / 1024).toFixed(2)}MB > ${config.MAX_FILE_SIZE / 1024 / 1024}MB`,
          size: stats.size
        };
      }
      return { allowed: true, size: stats.size };
    } catch (error) {
      // Fichier n'existe pas encore (write operation)
      return { allowed: true, size: 0 };
    }
  }

  /**
   * Créer backup d'un fichier
   */
  static async createBackup(filePath) {
    if (!config.BACKUP_ENABLED) {
      return { created: false, reason: 'Backups disabled' };
    }

    try {
      // Vérifier si fichier existe
      await fs.access(filePath);

      // Générer nom backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').slice(0, -5);
      const backupPath = `${filePath}.backup_${timestamp}`;

      // Copier fichier
      await fs.copyFile(filePath, backupPath);

      // Cleanup old backups (garder seulement MAX_BACKUP_COUNT)
      await this.cleanupOldBackups(filePath);

      return {
        created: true,
        backupPath: backupPath
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Fichier n'existe pas, pas de backup nécessaire
        return { created: false, reason: 'File does not exist' };
      }
      throw error;
    }
  }

  /**
   * Nettoyer vieux backups
   */
  static async cleanupOldBackups(originalPath) {
    try {
      const dir = path.dirname(originalPath);
      const basename = path.basename(originalPath);

      // Lister tous fichiers du dossier
      const files = await fs.readdir(dir);

      // Filtrer backups de ce fichier
      const backups = files.filter(f =>
        f.startsWith(basename + '.backup_')
      ).map(f => ({
        name: f,
        path: path.join(dir, f)
      }));

      // Si trop de backups, supprimer les plus vieux
      if (backups.length > config.MAX_BACKUP_COUNT) {
        // Trier par nom (timestamp dans nom)
        backups.sort((a, b) => a.name.localeCompare(b.name));

        // Supprimer les plus vieux
        const toDelete = backups.slice(0, backups.length - config.MAX_BACKUP_COUNT);
        for (const backup of toDelete) {
          await fs.unlink(backup.path);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
      console.error('Backup cleanup error:', error.message);
    }
  }

  /**
   * Middleware Express pour valider path dans request body
   */
  static validatePathMiddleware(req, res, next) {
    const { path: requestPath } = req.body;

    if (!requestPath) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PATH',
          message: 'Path parameter required'
        }
      });
    }

    const validation = SecurityMiddleware.isPathAllowed(requestPath);

    if (!validation.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_PATH',
          message: validation.reason,
          path: validation.path
        }
      });
    }

    // Ajouter resolved path au request
    req.resolvedPath = validation.path;
    next();
  }

  /**
   * Middleware Express pour valider commande bash
   */
  static validateCommandMiddleware(req, res, next) {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_COMMAND',
          message: 'Command parameter required'
        }
      });
    }

    const validation = SecurityMiddleware.isCommandAllowed(command);

    if (!validation.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_COMMAND',
          message: validation.reason
        }
      });
    }

    next();
  }
}

module.exports = SecurityMiddleware;
