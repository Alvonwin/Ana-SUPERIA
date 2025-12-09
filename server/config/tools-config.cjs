/**
 * Ana Tools Configuration
 * Security settings pour autonomous tools
 */

const path = require('path');

module.exports = {
  // Paths autorisés (whitelist) - PC d'Alain complet
  ALLOWED_ROOTS: [
    'C:\\',
    'D:\\',
    'E:\\'
  ],

  // Paths interdits (blacklist - même dans allowed roots)
  FORBIDDEN_PATHS: [
    // Aucune restriction - Alain veut accès total pour les audits
  ],

  // Extensions interdites
  FORBIDDEN_EXTENSIONS: [
    // Aucune restriction - accès total pour audits
  ],

  // Commandes bash - FULL UNLOCKED
  DANGEROUS_COMMANDS: [],

  // Commandes bash - TOUTES AUTORISÉES
  ALLOWED_COMMANDS: ['*'],

  // Limites
  MAX_FILE_SIZE: 100 * 1024 * 1024,  // 100MB
  MAX_BASH_TIMEOUT: 120000,           // 2 minutes
  MAX_BACKUP_COUNT: 10,               // Par fichier

  // Rate limiting
  RATE_LIMIT: {
    windowMs: 60 * 1000,  // 1 minute
    max: 100              // 100 requêtes/minute
  },

  // Backup settings
  BACKUP_DIR: 'E:\\ANA\\backups',
  BACKUP_ENABLED: true
};
