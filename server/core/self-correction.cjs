/**
 * SELF-CORRECTION - Détection et Correction Automatique d'Erreurs
 *
 * Stratégies de correction intelligentes:
 * 1. Détection de patterns d'erreurs connus
 * 2. Application de stratégies de correction
 * 3. Apprentissage des corrections réussies
 * 4. Retry avec ajustements
 *
 * Date: 7 Décembre 2025
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');

// Fichier de stockage des corrections apprises
const LEARNING_FILE = path.join('E:', 'ANA', 'knowledge', 'learned_corrections.json');

// Stratégies de correction par type d'erreur
const ERROR_STRATEGIES = {
  // ============= ERREURS FICHIERS =============
  'ENOENT': {
    name: 'file_not_found',
    description: 'Fichier ou dossier non trouvé',
    strategies: [
      {
        id: 'search_then_retry',
        description: 'Rechercher le fichier correct puis réessayer',
        action: async (context, tools) => {
          const { args } = context;
          const filename = path.basename(args.path || args.file_path || '');

          if (!filename) return { success: false, reason: 'no_filename' };

          // Utiliser glob pour trouver le fichier
          if (tools.glob) {
            const result = await tools.glob({
              pattern: `**/${filename}`,
              path: 'E:/ANA'
            });

            if (result.success && result.files && result.files.length > 0) {
              return {
                success: true,
                correction: {
                  type: 'replace_path',
                  newPath: result.files[0],
                  message: `Fichier trouvé à: ${result.files[0]}`
                }
              };
            }
          }

          return { success: false, reason: 'file_not_found_anywhere' };
        }
      },
      {
        id: 'create_directory',
        description: 'Créer le dossier parent si manquant',
        action: async (context) => {
          const { args } = context;
          const filePath = args.path || args.file_path || '';
          const dirPath = path.dirname(filePath);

          try {
            fs.mkdirSync(dirPath, { recursive: true });
            return {
              success: true,
              correction: {
                type: 'directory_created',
                path: dirPath,
                message: `Dossier créé: ${dirPath}`
              }
            };
          } catch (err) {
            return { success: false, reason: err.message };
          }
        }
      }
    ]
  },

  'EEXIST': {
    name: 'file_exists',
    description: 'Fichier existe déjà',
    strategies: [
      {
        id: 'rename_with_timestamp',
        description: 'Renommer avec timestamp',
        action: async (context) => {
          const { args } = context;
          const filePath = args.path || args.file_path || '';
          const ext = path.extname(filePath);
          const base = path.basename(filePath, ext);
          const dir = path.dirname(filePath);
          const newPath = path.join(dir, `${base}_${Date.now()}${ext}`);

          return {
            success: true,
            correction: {
              type: 'replace_path',
              newPath,
              message: `Nouveau chemin: ${newPath}`
            }
          };
        }
      }
    ]
  },

  // ============= ERREURS RÉSEAU =============
  'ECONNREFUSED': {
    name: 'connection_refused',
    description: 'Connexion refusée (service non démarré)',
    strategies: [
      {
        id: 'wait_and_retry',
        description: 'Attendre et réessayer',
        action: async (context) => {
          await new Promise(r => setTimeout(r, 2000));
          return {
            success: true,
            correction: {
              type: 'retry',
              delayMs: 2000,
              message: 'Attente de 2s puis retry'
            }
          };
        }
      },
      {
        id: 'check_service',
        description: 'Vérifier si le service est lancé',
        action: async (context, tools) => {
          // Vérifier Ollama par exemple
          if (context.toolName === 'ask_groq' || context.toolName === 'ask_cerebras') {
            return {
              success: true,
              correction: {
                type: 'switch_provider',
                message: 'Essayer un autre provider LLM'
              }
            };
          }
          return { success: false, reason: 'unknown_service' };
        }
      }
    ]
  },

  'ETIMEDOUT': {
    name: 'timeout',
    description: 'Timeout de connexion',
    strategies: [
      {
        id: 'retry_longer_timeout',
        description: 'Réessayer avec timeout plus long',
        action: async (context) => {
          const currentTimeout = context.args?.timeout || 30000;
          return {
            success: true,
            correction: {
              type: 'modify_args',
              changes: { timeout: currentTimeout * 2 },
              message: `Timeout augmenté à ${currentTimeout * 2}ms`
            }
          };
        }
      }
    ]
  },

  // ============= ERREURS API =============
  'rate limit': {
    name: 'rate_limited',
    description: 'Limite de requêtes atteinte',
    strategies: [
      {
        id: 'exponential_backoff',
        description: 'Backoff exponentiel',
        action: async (context) => {
          const attempt = context.attempt || 1;
          const delay = Math.min(1000 * Math.pow(2, attempt), 60000);

          await new Promise(r => setTimeout(r, delay));

          return {
            success: true,
            correction: {
              type: 'retry',
              delayMs: delay,
              message: `Backoff: ${delay}ms (attempt ${attempt})`
            }
          };
        }
      },
      {
        id: 'switch_api',
        description: 'Utiliser un API alternatif',
        action: async (context) => {
          // Mapper vers API alternatif
          const alternatives = {
            'ask_groq': 'ask_cerebras',
            'ask_cerebras': 'ask_groq',
            'web_search': 'wikipedia'
          };

          const alt = alternatives[context.toolName];
          if (alt) {
            return {
              success: true,
              correction: {
                type: 'switch_tool',
                newTool: alt,
                message: `Switch vers ${alt}`
              }
            };
          }
          return { success: false, reason: 'no_alternative' };
        }
      }
    ]
  },

  // ============= ERREURS SYNTAXE =============
  'SyntaxError': {
    name: 'syntax_error',
    description: 'Erreur de syntaxe dans le code',
    strategies: [
      {
        id: 'validate_json',
        description: 'Valider et corriger JSON',
        action: async (context) => {
          const content = context.args?.content;
          if (!content) return { success: false, reason: 'no_content' };

          try {
            // Tenter de réparer JSON courant
            const repaired = content
              .replace(/,\s*}/g, '}')           // Trailing commas
              .replace(/,\s*]/g, ']')           // Trailing commas arrays
              .replace(/'/g, '"')               // Single quotes
              .replace(/[\x00-\x1F]/g, '');     // Control chars

            JSON.parse(repaired);

            return {
              success: true,
              correction: {
                type: 'modify_args',
                changes: { content: repaired },
                message: 'JSON réparé'
              }
            };
          } catch (e) {
            return { success: false, reason: 'json_unfixable' };
          }
        }
      }
    ]
  },

  // ============= ERREURS PERMISSIONS =============
  'EACCES': {
    name: 'permission_denied',
    description: 'Permission refusée',
    strategies: [
      {
        id: 'use_temp_directory',
        description: 'Utiliser un dossier temporaire',
        action: async (context) => {
          const tempDir = path.join('E:', 'ANA', 'temp');

          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const originalPath = context.args?.path || '';
          const filename = path.basename(originalPath);
          const newPath = path.join(tempDir, filename);

          return {
            success: true,
            correction: {
              type: 'replace_path',
              newPath,
              originalPath,
              message: `Redirected vers temp: ${newPath}`
            }
          };
        }
      }
    ]
  }
};

// Patterns regex pour détection
const ERROR_PATTERNS = [
  { pattern: /ENOENT/i, type: 'ENOENT' },
  { pattern: /EEXIST/i, type: 'EEXIST' },
  { pattern: /ECONNREFUSED/i, type: 'ECONNREFUSED' },
  { pattern: /ETIMEDOUT|timeout/i, type: 'ETIMEDOUT' },
  { pattern: /rate\s*limit/i, type: 'rate limit' },
  { pattern: /SyntaxError/i, type: 'SyntaxError' },
  { pattern: /EACCES|EPERM/i, type: 'EACCES' },
  { pattern: /ENOSPC/i, type: 'disk_full' },
  { pattern: /ENOMEM/i, type: 'out_of_memory' }
];

class SelfCorrection {
  constructor() {
    this.learnedCorrections = this._loadLearned();
    this.correctionAttempts = {}; // Track attempts par action
    this.stats = {
      correctionsAttempted: 0,
      correctionsSucceeded: 0,
      correctionsFailed: 0,
      learnedApplied: 0
    };
  }

  /**
   * Analyser une erreur et suggérer une correction
   * @param {object} context - Contexte de l'erreur
   * @param {string} context.error - Message d'erreur
   * @param {string} context.toolName - Nom de l'outil qui a échoué
   * @param {object} context.args - Arguments de l'outil
   * @param {number} context.attempt - Numéro de tentative
   * @param {object} tools - Outils disponibles pour correction
   * @returns {Promise<object>} Suggestion de correction
   */
  async analyzeAndCorrect(context, tools = {}) {
    const { error, toolName, args, attempt = 1 } = context;

    this.stats.correctionsAttempted++;

    // 1. Identifier le type d'erreur
    const errorType = this._identifyErrorType(error);

    if (!errorType) {
      return {
        success: false,
        reason: 'unknown_error_type',
        error: error
      };
    }

    // 2. Vérifier si on a une correction apprise pour ce cas précis
    const learnedCorrection = this._findLearnedCorrection(errorType, toolName, args);
    if (learnedCorrection) {
      this.stats.learnedApplied++;
      return {
        success: true,
        source: 'learned',
        correction: learnedCorrection
      };
    }

    // 3. Appliquer les stratégies définies
    const strategies = ERROR_STRATEGIES[errorType]?.strategies || [];

    for (const strategy of strategies) {
      const strategyKey = `${toolName}:${strategy.id}:${attempt}`;

      // Éviter de réappliquer la même stratégie
      if (this.correctionAttempts[strategyKey]) {
        continue;
      }

      this.correctionAttempts[strategyKey] = true;

      try {
        const result = await strategy.action(context, tools);

        if (result.success) {
          this.stats.correctionsSucceeded++;

          // Sauvegarder pour apprentissage
          this._recordSuccess(errorType, toolName, args, result.correction);

          return {
            success: true,
            source: 'strategy',
            strategy: strategy.id,
            correction: result.correction
          };
        }
      } catch (err) {
        console.warn(`[SelfCorrection] Strategy ${strategy.id} failed:`, err.message);
      }
    }

    this.stats.correctionsFailed++;

    return {
      success: false,
      reason: 'no_strategy_worked',
      errorType,
      triedStrategies: strategies.map(s => s.id)
    };
  }

  /**
   * Appliquer une correction aux arguments
   * @param {object} originalArgs - Arguments originaux
   * @param {object} correction - Correction à appliquer
   * @returns {object} Arguments corrigés
   */
  applyCorrection(originalArgs, correction) {
    const newArgs = { ...originalArgs };

    switch (correction.type) {
      case 'replace_path':
        if (newArgs.path) newArgs.path = correction.newPath;
        if (newArgs.file_path) newArgs.file_path = correction.newPath;
        break;

      case 'modify_args':
        Object.assign(newArgs, correction.changes);
        break;

      case 'retry':
        // Pas de modification, juste retry
        break;

      default:
        // Appliquer tous les champs de correction
        Object.assign(newArgs, correction);
    }

    return newArgs;
  }

  /**
   * Signaler qu'une correction a fonctionné (renforce l'apprentissage)
   * @param {string} errorType - Type d'erreur
   * @param {string} toolName - Outil concerné
   * @param {object} correction - Correction appliquée
   */
  reinforceSuccess(errorType, toolName, correction) {
    const key = `${errorType}:${toolName}`;

    if (!this.learnedCorrections[key]) {
      this.learnedCorrections[key] = [];
    }

    // Augmenter le score de cette correction
    const existing = this.learnedCorrections[key].find(
      c => c.type === correction.type
    );

    if (existing) {
      existing.successCount = (existing.successCount || 0) + 1;
      existing.lastSuccess = new Date().toISOString();
    } else {
      this.learnedCorrections[key].push({
        ...correction,
        successCount: 1,
        lastSuccess: new Date().toISOString()
      });
    }

    this._saveLearned();
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      learnedCorrectionsCount: Object.keys(this.learnedCorrections).length
    };
  }

  /**
   * Réinitialiser les tentatives (nouveau contexte)
   */
  resetAttempts() {
    this.correctionAttempts = {};
  }

  // ============= MÉTHODES PRIVÉES =============

  /**
   * Identifier le type d'erreur
   * @private
   */
  _identifyErrorType(errorText) {
    if (!errorText) return null;

    const text = typeof errorText === 'string' ? errorText : JSON.stringify(errorText);

    for (const { pattern, type } of ERROR_PATTERNS) {
      if (pattern.test(text)) {
        return type;
      }
    }

    return null;
  }

  /**
   * Trouver une correction apprise
   * @private
   */
  _findLearnedCorrection(errorType, toolName, args) {
    const key = `${errorType}:${toolName}`;
    const corrections = this.learnedCorrections[key];

    if (!corrections || corrections.length === 0) {
      return null;
    }

    // Retourner la correction avec le plus de succès
    const sorted = [...corrections].sort(
      (a, b) => (b.successCount || 0) - (a.successCount || 0)
    );

    return sorted[0];
  }

  /**
   * Enregistrer un succès pour apprentissage
   * @private
   */
  _recordSuccess(errorType, toolName, args, correction) {
    const key = `${errorType}:${toolName}`;

    if (!this.learnedCorrections[key]) {
      this.learnedCorrections[key] = [];
    }

    this.learnedCorrections[key].push({
      ...correction,
      successCount: 1,
      firstSeen: new Date().toISOString()
    });

    this._saveLearned();
  }

  /**
   * Charger les corrections apprises
   * @private
   */
  _loadLearned() {
    try {
      if (fs.existsSync(LEARNING_FILE)) {
        return JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf-8'));
      }
    } catch (err) {
      console.warn('[SelfCorrection] Could not load learned corrections:', err.message);
    }
    return {};
  }

  /**
   * Sauvegarder les corrections apprises
   * @private
   */
  _saveLearned() {
    try {
      const dir = path.dirname(LEARNING_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(LEARNING_FILE, JSON.stringify(this.learnedCorrections, null, 2));
    } catch (err) {
      console.warn('[SelfCorrection] Could not save learned corrections:', err.message);
    }
  }
}

// ============= MÉTHODES SUPPLÉMENTAIRES POUR API TESTS =============

// Propriété errorPatterns pour accès direct
Object.defineProperty(SelfCorrection.prototype, 'errorPatterns', {
  get() { return ERROR_PATTERNS; }
});

/**
 * Détecter le type d'erreur et retourner la stratégie
 * @param {Error|string} error - Erreur à analyser
 * @param {object} context - Contexte de l'erreur
 * @returns {object|null} Information de détection avec stratégie
 */
SelfCorrection.prototype.detectError = function(error, context = {}) {
  const errorText = typeof error === 'string' ? error : (error?.message || String(error));
  const errorType = this._identifyErrorType(errorText);

  if (!errorType) {
    return null;
  }

  const strategyInfo = ERROR_STRATEGIES[errorType];
  if (!strategyInfo) {
    return null;
  }

  // Mapper le type vers la stratégie principale
  const strategyMap = {
    'ENOENT': STRAT.SEARCH_THEN_RETRY,
    'EEXIST': STRAT.CREATE_MISSING,
    'ECONNREFUSED': STRAT.RETRY_WITH_DELAY,
    'ETIMEDOUT': STRAT.RETRY_WITH_DELAY,
    'rate limit': STRAT.WAIT_AND_RETRY,
    'SyntaxError': STRAT.CHANGE_APPROACH,
    'EACCES': STRAT.CHANGE_APPROACH
  };

  return {
    errorType,
    strategy: strategyMap[errorType] || STRAT.RETRY_WITH_DELAY,
    description: strategyInfo.description,
    context
  };
};

/**
 * Vérifier si on peut réessayer
 * @param {string} actionName - Nom de l'action
 * @param {string} errorKey - Clé d'erreur
 * @returns {boolean}
 */
SelfCorrection.prototype.canRetry = function(actionName, errorKey) {
  const maxRetries = this.maxRetries || 3;
  const key = `${actionName}:${errorKey}`;
  const attempts = this._attemptCounts?.[key] || 0;
  return attempts < maxRetries;
};

/**
 * Enregistrer une tentative
 * @param {string} actionName - Nom de l'action
 * @param {string} errorKey - Clé d'erreur
 * @param {boolean} success - Si la tentative a réussi
 */
SelfCorrection.prototype.recordAttempt = function(actionName, errorKey, success) {
  if (!this._attemptCounts) {
    this._attemptCounts = {};
  }
  const key = `${actionName}:${errorKey}`;
  if (success) {
    // Reset sur succès
    this._attemptCounts[key] = 0;
  } else {
    this._attemptCounts[key] = (this._attemptCounts[key] || 0) + 1;
  }
};

/**
 * Obtenir le nombre de tentatives
 * @param {string} actionName - Nom de l'action
 * @param {string} errorKey - Clé d'erreur
 * @returns {number}
 */
SelfCorrection.prototype.getAttempts = function(actionName, errorKey) {
  if (!this._attemptCounts) return 0;
  const key = `${actionName}:${errorKey}`;
  return this._attemptCounts[key] || 0;
};

/**
 * Obtenir le délai pour un retry (backoff exponentiel)
 * @param {number} attempt - Numéro de tentative
 * @returns {number} Délai en ms
 */
SelfCorrection.prototype.getDelayForRetry = function(attempt) {
  const maxDelay = this.maxDelay || 30000;
  const baseDelay = 1000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay;
};

/**
 * Obtenir une suggestion pour une erreur
 * @param {Error|string} error - Erreur
 * @param {object} context - Contexte
 * @returns {string} Suggestion
 */
SelfCorrection.prototype.getSuggestion = function(error, context = {}) {
  const detected = this.detectError(error, context);
  if (!detected) {
    return 'Erreur inconnue - vérifier manuellement';
  }

  const suggestions = {
    'ENOENT': 'Fichier non trouvé. Rechercher avec glob ou vérifier le chemin.',
    'EEXIST': 'Le fichier existe déjà. Utiliser un nom différent ou --force.',
    'ECONNREFUSED': 'Connexion refusée. Vérifier que le service est démarré.',
    'ETIMEDOUT': 'Timeout. Augmenter le délai ou vérifier la connexion.',
    'rate limit': 'Limite de requêtes atteinte. Attendre avant de réessayer.',
    'SyntaxError': 'Erreur de syntaxe. Vérifier le format du code/JSON.',
    'EACCES': 'Permission refusée. Utiliser un dossier avec accès en écriture.'
  };

  return suggestions[detected.errorType] || 'Réessayer avec une approche différente.';
};

/**
 * Réinitialiser tout
 */
SelfCorrection.prototype.reset = function() {
  this._attemptCounts = {};
  this.correctionAttempts = {};
  this.stats = {
    correctionsAttempted: 0,
    correctionsSucceeded: 0,
    correctionsFailed: 0,
    learnedApplied: 0
  };
};

// ============= CONSTANTES STRATÉGIES =============

const STRAT = {
  SEARCH_THEN_RETRY: 'search_then_retry',
  RETRY_WITH_DELAY: 'retry_with_delay',
  CHANGE_APPROACH: 'change_approach',
  CREATE_MISSING: 'create_missing',
  WAIT_AND_RETRY: 'wait_and_retry'
};

// ============= SINGLETON INSTANCE =============

const selfCorrectionInstance = new SelfCorrection();

// ============= EXPORTS =============

module.exports = {
  SelfCorrection,
  selfCorrection: selfCorrectionInstance,
  ERROR_STRATEGIES: STRAT,
  ERROR_PATTERNS,
  // Alias pour compatibilité
  STRATEGIES: ERROR_STRATEGIES
};
