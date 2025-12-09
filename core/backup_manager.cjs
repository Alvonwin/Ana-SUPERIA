#!/usr/bin/env node

/**
 * 🔒 ANA BACKUP MANAGER
 *
 * Gère les backups automatiques avant toute modification
 * Permet rollback en cas d'erreur
 *
 * Règle Ana: Backup First (10/10)
 */

const fs = require('fs');
const path = require('path');

class BackupManager {
  constructor() {
    this.backupRoot = 'E:/ANA/backups';
    this.backupIndex = path.join(this.backupRoot, 'backup_index.jsonl');

    // Ensure backup directories exist
    this.ensureBackupDirs();
  }

  ensureBackupDirs() {
    const dirs = [
      this.backupRoot,
      path.join(this.backupRoot, 'core'),
      path.join(this.backupRoot, 'workflows'),
      path.join(this.backupRoot, 'consciousness'),
      path.join(this.backupRoot, 'automation_hub')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Create backup before modifying a file
   * @param {string} filePath - Original file path
   * @param {string} reason - Why this backup is being created
   * @returns {Object} Backup info
   */
  backup(filePath, reason = 'Manual backup') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const category = this.categorizeFile(filePath);

    const backupFileName = `${fileName}.backup_${timestamp}`;
    const backupPath = path.join(this.backupRoot, category, backupFileName);

    // Copy file to backup
    fs.copyFileSync(filePath, backupPath);

    // Log backup
    const backupEntry = {
      timestamp: new Date().toISOString(),
      original_path: filePath,
      backup_path: backupPath,
      reason,
      file_size: fs.statSync(backupPath).size,
      backup_id: `${category}_${timestamp}`
    };

    fs.appendFileSync(this.backupIndex, JSON.stringify(backupEntry) + '\n', 'utf-8');

    console.log(`✅ Backup créé: ${backupPath}`);
    console.log(`   Raison: ${reason}`);
    console.log(`   Taille: ${(backupEntry.file_size / 1024).toFixed(2)} KB\n`);

    return backupEntry;
  }

  /**
   * Restore a file from backup
   * @param {string} backupPath - Path to backup file
   * @param {string} targetPath - Where to restore (optional, uses original path)
   */
  restore(backupPath, targetPath = null) {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupPath}`);
    }

    // Find original path from index
    if (!targetPath) {
      const backups = this.listBackups();
      const backupInfo = backups.find(b => b.backup_path === backupPath);
      if (backupInfo) {
        targetPath = backupInfo.original_path;
      } else {
        throw new Error('Cannot determine original path. Specify targetPath.');
      }
    }

    // Backup current file before restoring
    if (fs.existsSync(targetPath)) {
      this.backup(targetPath, 'Pre-restore backup');
    }

    // Restore
    fs.copyFileSync(backupPath, targetPath);

    console.log(`✅ Restauré: ${backupPath} → ${targetPath}\n`);
  }

  /**
   * List all backups
   * @param {string} category - Filter by category (optional)
   * @returns {Array} List of backup entries
   */
  listBackups(category = null) {
    if (!fs.existsSync(this.backupIndex)) {
      return [];
    }

    const lines = fs.readFileSync(this.backupIndex, 'utf-8').split('\n').filter(l => l.trim());
    const backups = lines.map(l => JSON.parse(l));

    if (category) {
      return backups.filter(b => b.backup_path.includes(`/${category}/`));
    }

    return backups;
  }

  /**
   * Show recent backups
   * @param {number} count - Number of backups to show
   */
  showRecent(count = 10) {
    const backups = this.listBackups();
    const recent = backups.slice(-count).reverse();

    console.log(`📋 Derniers ${count} backups:\n`);
    recent.forEach((backup, i) => {
      console.log(`${i + 1}. ${backup.backup_id}`);
      console.log(`   Fichier: ${path.basename(backup.original_path)}`);
      console.log(`   Raison: ${backup.reason}`);
      console.log(`   Date: ${new Date(backup.timestamp).toLocaleString()}`);
      console.log(`   Backup: ${backup.backup_path}\n`);
    });
  }

  /**
   * Categorize file by path
   */
  categorizeFile(filePath) {
    if (filePath.includes('/core/')) return 'core';
    if (filePath.includes('/workflows/') || filePath.includes('/automation_hub/')) return 'workflows';
    if (filePath.includes('/consciousness/')) return 'consciousness';
    return 'core'; // Default
  }

  /**
   * Clean old backups (keep last N per file)
   * @param {number} keepCount - Number of backups to keep per file
   */
  cleanOldBackups(keepCount = 5) {
    const backups = this.listBackups();
    const byFile = {};

    // Group by original file
    backups.forEach(backup => {
      const fileName = path.basename(backup.original_path);
      if (!byFile[fileName]) {
        byFile[fileName] = [];
      }
      byFile[fileName].push(backup);
    });

    let deletedCount = 0;

    // Keep only recent backups for each file
    Object.keys(byFile).forEach(fileName => {
      const fileBackups = byFile[fileName].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Delete old backups
      fileBackups.slice(keepCount).forEach(backup => {
        if (fs.existsSync(backup.backup_path)) {
          fs.unlinkSync(backup.backup_path);
          deletedCount++;
          console.log(`🗑️  Supprimé: ${backup.backup_id}`);
        }
      });
    });

    console.log(`\n✅ Nettoyage terminé: ${deletedCount} anciens backups supprimés\n`);
  }
}

// CLI Usage
if (require.main === module) {
  const manager = new BackupManager();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'backup':
      if (args.length < 2) {
        console.error('Usage: backup_manager.cjs backup <file_path> [reason]');
        process.exit(1);
      }
      manager.backup(args[1], args[2] || 'Manual backup');
      break;

    case 'restore':
      if (args.length < 2) {
        console.error('Usage: backup_manager.cjs restore <backup_path> [target_path]');
        process.exit(1);
      }
      manager.restore(args[1], args[2]);
      break;

    case 'list':
      manager.showRecent(args[1] ? parseInt(args[1]) : 10);
      break;

    case 'clean':
      manager.cleanOldBackups(args[1] ? parseInt(args[1]) : 5);
      break;

    default:
      console.log(`
🔒 Ana Backup Manager

Usage:
  node backup_manager.cjs backup <file_path> [reason]
  node backup_manager.cjs restore <backup_path> [target_path]
  node backup_manager.cjs list [count]
  node backup_manager.cjs clean [keep_count]

Examples:
  node backup_manager.cjs backup E:/ANA/core/ana_core.cjs "Before update"
  node backup_manager.cjs list 20
  node backup_manager.cjs clean 5
      `);
  }
}

module.exports = BackupManager;
