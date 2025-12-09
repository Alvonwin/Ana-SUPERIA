/**
 * TRANSACTION MANAGER - Opérations Atomiques Multi-Fichiers
 *
 * Fonctionnalités:
 * 1. Backup automatique avant modification
 * 2. Commit/Rollback transactionnel
 * 3. Support multi-fichiers atomique
 * 4. Historique des transactions
 *
 * Date: 7 Décembre 2025
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Dossiers de stockage
const BACKUP_DIR = path.join('E:', 'ANA', 'backups', 'transactions');
const TX_LOG_DIR = path.join('E:', 'ANA', 'logs', 'transactions');

// États de transaction
const TX_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMMITTED: 'committed',
  ROLLED_BACK: 'rolled_back',
  FAILED: 'failed'
};

// Types d'opérations
const OP_TYPE = {
  CREATE: 'create',
  MODIFY: 'modify',
  DELETE: 'delete',
  RENAME: 'rename'
};

class TransactionManager {
  constructor(options = {}) {
    this.backupDir = options.backupDir || BACKUP_DIR;
    this.logDir = options.logDir || TX_LOG_DIR;
    this.maxBackupAge = options.maxBackupAge || 7 * 24 * 60 * 60 * 1000; // 7 jours

    // Transactions actives
    this.activeTransactions = new Map();

    // Stats
    this.stats = {
      transactionsCreated: 0,
      transactionsCommitted: 0,
      transactionsRolledBack: 0,
      operationsExecuted: 0,
      filesBackedUp: 0
    };

    // Initialiser les dossiers
    this._ensureDirectories();
  }

  /**
   * Commencer une nouvelle transaction
   * @param {object} options - Options
   * @param {string} options.description - Description de la transaction
   * @param {boolean} options.autoRollbackOnError - Rollback auto si erreur
   * @returns {string} ID de la transaction
   */
  beginTransaction(options = {}) {
    const txId = this._generateTxId();

    const transaction = {
      id: txId,
      status: TX_STATUS.PENDING,
      description: options.description || '',
      autoRollbackOnError: options.autoRollbackOnError !== false,
      operations: [],
      backups: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.activeTransactions.set(txId, transaction);
    this.stats.transactionsCreated++;

    console.log(`[TransactionManager] Transaction started: ${txId}`);

    return txId;
  }

  /**
   * Ajouter une opération à la transaction
   * @param {string} txId - ID de la transaction
   * @param {object} operation - Opération à ajouter
   * @param {string} operation.type - Type (create, modify, delete, rename)
   * @param {string} operation.path - Chemin du fichier
   * @param {string} operation.content - Contenu (pour create/modify)
   * @param {string} operation.newPath - Nouveau chemin (pour rename)
   */
  addOperation(txId, operation) {
    const tx = this.activeTransactions.get(txId);
    if (!tx) {
      return { success: false, error: 'Transaction not found' };
    }

    if (tx.status !== TX_STATUS.PENDING) {
      return { success: false, error: 'Transaction is not pending' };
    }

    // Valider l'opération
    const validation = this._validateOperation(operation);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Créer backup si le fichier existe
    if (operation.type !== OP_TYPE.CREATE) {
      const backupResult = this._createBackup(txId, operation.path);
      if (backupResult.success) {
        tx.backups.push(backupResult.backup);
      }
    }

    // Ajouter l'opération
    tx.operations.push({
      ...operation,
      id: tx.operations.length + 1,
      status: 'pending',
      addedAt: new Date().toISOString()
    });

    tx.updatedAt = new Date().toISOString();

    return { success: true, operationId: tx.operations.length };
  }

  /**
   * Valider une transaction (preview sans exécuter)
   * @param {string} txId - ID de la transaction
   * @returns {object} Résultat de validation
   */
  validateTransaction(txId) {
    const tx = this.activeTransactions.get(txId);
    if (!tx) {
      return { valid: false, error: 'Transaction not found' };
    }

    const issues = [];

    for (const op of tx.operations) {
      // Vérifier que les fichiers sources existent pour modify/delete
      if (op.type === OP_TYPE.MODIFY || op.type === OP_TYPE.DELETE) {
        if (!fs.existsSync(op.path)) {
          issues.push(`File not found: ${op.path}`);
        }
      }

      // Vérifier que le fichier n'existe pas pour create
      if (op.type === OP_TYPE.CREATE && fs.existsSync(op.path)) {
        issues.push(`File already exists: ${op.path}`);
      }

      // Vérifier les permissions d'écriture
      const dir = path.dirname(op.path);
      try {
        fs.accessSync(dir, fs.constants.W_OK);
      } catch (err) {
        issues.push(`No write permission: ${dir}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      operationsCount: tx.operations.length
    };
  }

  /**
   * Exécuter et committer la transaction
   * @param {string} txId - ID de la transaction
   * @returns {object} Résultat
   */
  commit(txId) {
    const tx = this.activeTransactions.get(txId);
    if (!tx) {
      return { success: false, error: 'Transaction not found' };
    }

    if (tx.status !== TX_STATUS.PENDING) {
      return { success: false, error: `Transaction status is ${tx.status}, expected pending` };
    }

    tx.status = TX_STATUS.IN_PROGRESS;
    tx.updatedAt = new Date().toISOString();

    console.log(`[TransactionManager] Committing transaction ${txId} with ${tx.operations.length} operations`);

    const results = [];
    let success = true;

    try {
      for (const op of tx.operations) {
        const result = this._executeOperation(op);
        results.push(result);
        op.status = result.success ? 'completed' : 'failed';
        op.result = result;

        if (!result.success) {
          success = false;
          if (tx.autoRollbackOnError) {
            console.log(`[TransactionManager] Operation failed, rolling back...`);
            this.rollback(txId);
            return {
              success: false,
              error: `Operation failed: ${result.error}`,
              rolledBack: true,
              results
            };
          }
        }

        this.stats.operationsExecuted++;
      }

      tx.status = success ? TX_STATUS.COMMITTED : TX_STATUS.FAILED;
      tx.committedAt = new Date().toISOString();
      tx.updatedAt = new Date().toISOString();

      // Sauvegarder le log de transaction
      this._saveTransactionLog(tx);

      if (success) {
        this.stats.transactionsCommitted++;
      }

      // Nettoyer la transaction active
      this.activeTransactions.delete(txId);

      return {
        success,
        txId,
        results,
        operationsCount: tx.operations.length
      };

    } catch (err) {
      tx.status = TX_STATUS.FAILED;
      tx.error = err.message;

      if (tx.autoRollbackOnError) {
        this.rollback(txId);
        return {
          success: false,
          error: err.message,
          rolledBack: true
        };
      }

      return {
        success: false,
        error: err.message,
        rolledBack: false
      };
    }
  }

  /**
   * Annuler une transaction et restaurer les fichiers
   * @param {string} txId - ID de la transaction
   * @returns {object} Résultat
   */
  rollback(txId) {
    const tx = this.activeTransactions.get(txId);
    if (!tx) {
      // Essayer de charger depuis les logs
      const savedTx = this._loadTransactionLog(txId);
      if (!savedTx) {
        return { success: false, error: 'Transaction not found' };
      }
      return this._rollbackFromLog(savedTx);
    }

    console.log(`[TransactionManager] Rolling back transaction ${txId}`);

    const restored = [];
    const failed = [];

    // Restaurer les backups en ordre inverse
    for (const backup of tx.backups.reverse()) {
      try {
        if (fs.existsSync(backup.backupPath)) {
          // Restaurer le fichier original
          const content = fs.readFileSync(backup.backupPath, 'utf-8');
          fs.writeFileSync(backup.originalPath, content);
          restored.push(backup.originalPath);
        }
      } catch (err) {
        failed.push({ path: backup.originalPath, error: err.message });
      }
    }

    // Supprimer les fichiers créés
    for (const op of tx.operations) {
      if (op.type === OP_TYPE.CREATE && op.status === 'completed') {
        try {
          if (fs.existsSync(op.path)) {
            fs.unlinkSync(op.path);
            restored.push(`Deleted: ${op.path}`);
          }
        } catch (err) {
          failed.push({ path: op.path, error: err.message });
        }
      }
    }

    tx.status = TX_STATUS.ROLLED_BACK;
    tx.rolledBackAt = new Date().toISOString();
    tx.updatedAt = new Date().toISOString();

    this._saveTransactionLog(tx);
    this.activeTransactions.delete(txId);
    this.stats.transactionsRolledBack++;

    return {
      success: failed.length === 0,
      restored,
      failed,
      txId
    };
  }

  /**
   * Obtenir le statut d'une transaction
   * @param {string} txId - ID de la transaction
   */
  getStatus(txId) {
    const tx = this.activeTransactions.get(txId);
    if (tx) {
      return {
        found: true,
        active: true,
        ...tx
      };
    }

    const savedTx = this._loadTransactionLog(txId);
    if (savedTx) {
      return {
        found: true,
        active: false,
        ...savedTx
      };
    }

    return { found: false };
  }

  /**
   * Lister les transactions récentes
   */
  listTransactions() {
    const active = Array.from(this.activeTransactions.values());

    let saved = [];
    try {
      const files = fs.readdirSync(this.logDir);
      saved = files
        .filter(f => f.endsWith('.json'))
        .slice(-20) // 20 dernières
        .map(f => {
          try {
            return JSON.parse(fs.readFileSync(path.join(this.logDir, f), 'utf-8'));
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
    } catch (err) {
      // Dossier n'existe pas encore
    }

    return {
      active: active.map(t => ({
        id: t.id,
        status: t.status,
        operationsCount: t.operations.length,
        createdAt: t.createdAt
      })),
      recent: saved.map(t => ({
        id: t.id,
        status: t.status,
        operationsCount: t.operations?.length || 0,
        createdAt: t.createdAt
      }))
    };
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      activeTransactionsCount: this.activeTransactions.size
    };
  }

  /**
   * Nettoyer les vieux backups
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    try {
      const files = fs.readdirSync(this.backupDir);
      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stat = fs.statSync(filePath);

        if (now - stat.mtimeMs > this.maxBackupAge) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
    } catch (err) {
      // Ignore
    }

    return { cleaned };
  }

  // ============= MÉTHODES PRIVÉES =============

  /**
   * Générer un ID de transaction unique
   * @private
   */
  _generateTxId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `tx_${timestamp}_${random}`;
  }

  /**
   * S'assurer que les dossiers existent
   * @private
   */
  _ensureDirectories() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Valider une opération
   * @private
   */
  _validateOperation(op) {
    if (!op.type || !Object.values(OP_TYPE).includes(op.type)) {
      return { valid: false, error: 'Invalid operation type' };
    }

    if (!op.path) {
      return { valid: false, error: 'Path is required' };
    }

    if ((op.type === OP_TYPE.CREATE || op.type === OP_TYPE.MODIFY) && op.content === undefined) {
      return { valid: false, error: 'Content is required for create/modify' };
    }

    if (op.type === OP_TYPE.RENAME && !op.newPath) {
      return { valid: false, error: 'newPath is required for rename' };
    }

    return { valid: true };
  }

  /**
   * Créer un backup d'un fichier
   * @private
   */
  _createBackup(txId, filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const filename = path.basename(filePath);
      const backupName = `${txId}_${Date.now()}_${filename}`;
      const backupPath = path.join(this.backupDir, backupName);

      fs.writeFileSync(backupPath, content);
      this.stats.filesBackedUp++;

      return {
        success: true,
        backup: {
          originalPath: filePath,
          backupPath,
          createdAt: new Date().toISOString(),
          size: content.length
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Exécuter une opération
   * @private
   */
  _executeOperation(op) {
    try {
      switch (op.type) {
        case OP_TYPE.CREATE:
          // S'assurer que le dossier existe
          const dir = path.dirname(op.path);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(op.path, op.content);
          return { success: true, type: 'created', path: op.path };

        case OP_TYPE.MODIFY:
          fs.writeFileSync(op.path, op.content);
          return { success: true, type: 'modified', path: op.path };

        case OP_TYPE.DELETE:
          if (fs.existsSync(op.path)) {
            fs.unlinkSync(op.path);
          }
          return { success: true, type: 'deleted', path: op.path };

        case OP_TYPE.RENAME:
          fs.renameSync(op.path, op.newPath);
          return { success: true, type: 'renamed', from: op.path, to: op.newPath };

        default:
          return { success: false, error: 'Unknown operation type' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sauvegarder le log de transaction
   * @private
   */
  _saveTransactionLog(tx) {
    const logPath = path.join(this.logDir, `${tx.id}.json`);
    fs.writeFileSync(logPath, JSON.stringify(tx, null, 2));
  }

  /**
   * Charger un log de transaction
   * @private
   */
  _loadTransactionLog(txId) {
    const logPath = path.join(this.logDir, `${txId}.json`);
    try {
      if (fs.existsSync(logPath)) {
        return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      }
    } catch (err) {
      // Ignore
    }
    return null;
  }

  /**
   * Rollback depuis un log sauvegardé
   * @private
   */
  _rollbackFromLog(tx) {
    console.log(`[TransactionManager] Rolling back from log: ${tx.id}`);

    const restored = [];
    const failed = [];

    for (const backup of (tx.backups || []).reverse()) {
      try {
        if (fs.existsSync(backup.backupPath)) {
          const content = fs.readFileSync(backup.backupPath, 'utf-8');
          fs.writeFileSync(backup.originalPath, content);
          restored.push(backup.originalPath);
        }
      } catch (err) {
        failed.push({ path: backup.originalPath, error: err.message });
      }
    }

    return {
      success: failed.length === 0,
      restored,
      failed,
      txId: tx.id,
      fromLog: true
    };
  }
}

// ============= MÉTHODES SUPPLÉMENTAIRES POUR API TESTS =============

/**
 * Obtenir une transaction par ID
 * @param {string} txId - ID de la transaction
 * @returns {object|null} Transaction
 */
TransactionManager.prototype.getTransaction = function(txId) {
  return this.activeTransactions.get(txId) || null;
};

/**
 * Vérifier si une transaction a des opérations en attente
 * @param {string} txId - ID de la transaction
 * @returns {boolean}
 */
TransactionManager.prototype.hasPendingOperations = function(txId) {
  const tx = this.activeTransactions.get(txId);
  if (!tx) return false;
  return tx.operations.length > 0;
};

/**
 * Obtenir le nombre d'opérations
 * @param {string} txId - ID de la transaction
 * @returns {number}
 */
TransactionManager.prototype.getOperationCount = function(txId) {
  const tx = this.activeTransactions.get(txId);
  if (!tx) return 0;
  return tx.operations.length;
};

/**
 * Annuler une transaction (sans rollback des fichiers)
 * @param {string} txId - ID de la transaction
 */
TransactionManager.prototype.cancelTransaction = function(txId) {
  const tx = this.activeTransactions.get(txId);
  if (!tx) return;

  tx.status = TX_STATUS.ROLLED_BACK;
  tx.cancelledAt = new Date().toISOString();
  this.activeTransactions.delete(txId);
};

/**
 * Obtenir un résumé de la transaction
 * @param {string} txId - ID de la transaction
 * @returns {object|null} Résumé
 */
TransactionManager.prototype.getSummary = function(txId) {
  const tx = this.activeTransactions.get(txId);
  if (!tx) return null;

  return {
    id: tx.id,
    description: tx.description,
    status: tx.status,
    operationCount: tx.operations.length,
    createdAt: tx.createdAt,
    operations: tx.operations.map(op => ({
      type: op.type,
      path: op.path,
      status: op.status
    }))
  };
};

/**
 * Lister les transactions en attente
 * @returns {Array} Transactions pending
 */
TransactionManager.prototype.listPendingTransactions = function() {
  const pending = [];
  for (const tx of this.activeTransactions.values()) {
    if (tx.status === TX_STATUS.PENDING) {
      pending.push(tx);
    }
  }
  return pending;
};

/**
 * Obtenir l'âge d'une transaction en ms
 * @param {string} txId - ID de la transaction
 * @returns {number} Âge en ms
 */
TransactionManager.prototype.getTransactionAge = function(txId) {
  const tx = this.activeTransactions.get(txId);
  if (!tx) return 0;

  return Date.now() - new Date(tx.createdAt).getTime();
};

/**
 * Nettoyer les transactions plus vieilles que maxAge
 * @param {number} maxAge - Âge max en ms (0 = tout)
 */
TransactionManager.prototype.cleanup = function(maxAge = this.maxBackupAge) {
  const now = Date.now();
  const toDelete = [];

  for (const [txId, tx] of this.activeTransactions.entries()) {
    const age = now - new Date(tx.createdAt).getTime();
    if (maxAge === 0 || age > maxAge) {
      toDelete.push(txId);
    }
  }

  for (const txId of toDelete) {
    this.activeTransactions.delete(txId);
  }

  return { cleaned: toDelete.length };
};

// ============= FACTORY =============

function createTransactionManager(options = {}) {
  return new TransactionManager(options);
}

// ============= SINGLETON =============

const transactionManagerInstance = new TransactionManager();

// ============= EXPORTS =============

module.exports = {
  TransactionManager,
  createTransactionManager,
  transactionManager: transactionManagerInstance,
  TX_STATUS,
  OP_TYPE
};
