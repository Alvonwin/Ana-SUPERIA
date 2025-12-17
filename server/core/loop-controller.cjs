/**
 * LOOP CONTROLLER - Boucle Autonome Sans Limite Fixe
 *
 * Remplace les maxLoops/maxIterations fixes par une logique intelligente:
 * 1. Timeout global configurable
 * 2. Détection de boucles infinies (répétitions)
 * 3. Détection de blocages (mêmes erreurs répétées)
 * 4. Détection de succès explicite
 *
 * Date: 7 Décembre 2025
 * Version: 1.0.0
 */

const EventEmitter = require('events');

// Configuration par défaut
const DEFAULT_CONFIG = {
  globalTimeoutMs: 10 * 60 * 1000,      // 10 minutes max
  warningTimeoutMs: 5 * 60 * 1000,      // Warning après 5 min
  repetitionThreshold: 3,                // Même action 3x = blocage
  errorRepetitionThreshold: 2,           // Même erreur 2x = besoin correction
  maxConsecutiveErrors: 5,               // 5 erreurs consécutives = stop
  idleTimeoutMs: 30 * 1000,              // 30s sans action = problème
  checkpointIntervalMs: 60 * 1000        // Checkpoint toutes les minutes
};

// Patterns de succès explicites
const SUCCESS_PATTERNS = [
  /tâche\s*(terminée|complétée|finie|accomplie)/i,
  /mission\s*(terminée|accomplie)/i,
  /c'est\s*(fait|terminé|fini)/i,
  /voilà.*c'est\s*fait/i,
  /j'ai\s*(terminé|fini|complété)/i,
  /travail\s*(terminé|accompli)/i,
  /objectif\s*atteint/i,
  /succès/i,
  /done|completed|finished/i
];

// Patterns d'erreurs irrécupérables
const FATAL_ERROR_PATTERNS = [
  /EPERM/i,                              // Permission denied (système)
  /EACCES.*system32/i,                   // Accès système refusé
  /out\s*of\s*memory/i,                  // Mémoire épuisée
  /stack\s*overflow/i,                   // Stack overflow
  /maximum\s*call\s*stack/i,             // Récursion infinie
  /disk\s*full/i,                        // Disque plein
  /ENOSPC/i                              // No space left on device
];

class LoopController extends EventEmitter {
  /**
   * @param {object} options - Configuration
   * @param {number} options.globalTimeoutMs - Timeout global en ms
   * @param {number} options.repetitionThreshold - Seuil de répétition
   * @param {number} options.maxConsecutiveErrors - Max erreurs consécutives
   */
  constructor(options = {}) {
    super();

    this.config = { ...DEFAULT_CONFIG, ...options };

    // État
    this.startTime = null;
    this.lastActionTime = null;
    this.iteration = 0;
    this.isRunning = false;

    // Historique pour détection de patterns
    this.actionHistory = [];       // {action, args, hash, timestamp}
    this.errorHistory = [];        // {error, timestamp, toolName}
    this.toolCallCounts = {};      // {toolName: count}
    this.consecutiveErrors = 0;

    // Checkpoints pour recovery
    this.checkpoints = [];

    // Stats
    this.stats = {
      totalIterations: 0,
      successfulActions: 0,
      failedActions: 0,
      repetitionsDetected: 0,
      blocksDetected: 0,
      timeSpentMs: 0
    };
  }

  /**
   * Démarrer le contrôleur de boucle
   */
  start() {
    this.startTime = Date.now();
    this.lastActionTime = Date.now();
    this.isRunning = true;
    this.iteration = 0;

    // Timer de timeout global
    this._timeoutTimer = setTimeout(() => {
      this.emit('timeout', {
        reason: 'global_timeout',
        elapsed: Date.now() - this.startTime,
        iterations: this.iteration
      });
      this.stop('timeout');
    }, this.config.globalTimeoutMs);

    // Timer de warning
    this._warningTimer = setTimeout(() => {
      this.emit('warning', {
        type: 'long_running',
        elapsed: Date.now() - this.startTime,
        iterations: this.iteration,
        message: `Exécution longue: ${Math.round((Date.now() - this.startTime) / 1000)}s`
      });
    }, this.config.warningTimeoutMs);

    this.emit('started', { timestamp: new Date().toISOString() });
    return this;
  }

  /**
   * Arrêter le contrôleur
   * @param {string} reason - Raison de l'arrêt
   */
  stop(reason = 'manual') {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stats.timeSpentMs = Date.now() - this.startTime;

    clearTimeout(this._timeoutTimer);
    clearTimeout(this._warningTimer);
    clearInterval(this._checkpointInterval);

    this.emit('stopped', {
      reason,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    });

    return this;
  }

  /**
   * Vérifier si la boucle doit continuer
   * @param {object} context - Contexte de la dernière action
   * @param {string} context.action - Nom de l'action
   * @param {object} context.args - Arguments de l'action
   * @param {object} context.result - Résultat de l'action
   * @param {string} context.llmResponse - Réponse textuelle du LLM
   * @returns {object} {continue: boolean, reason: string, suggestion?: string}
   */
  shouldContinue(context = {}) {
    if (!this.isRunning) {
      return { continue: false, reason: 'controller_stopped' };
    }

    this.iteration++;
    this.lastActionTime = Date.now();
    this.stats.totalIterations++;

    const { action, args, result, llmResponse } = context;

    // 1. Vérifier timeout global
    const elapsed = Date.now() - this.startTime;
    if (elapsed >= this.config.globalTimeoutMs) {
      this.stop('timeout');
      return {
        continue: false,
        reason: 'global_timeout',
        message: `Timeout global atteint (${Math.round(elapsed / 1000)}s)`
      };
    }

    // 2. Vérifier succès explicite dans la réponse LLM
    if (llmResponse && this._detectSuccess(llmResponse)) {
      return {
        continue: false,
        reason: 'success_detected',
        message: 'Le LLM indique que la tâche est terminée'
      };
    }

    // 3. Vérifier erreur fatale
    if (result && !result.success) {
      const errorMsg = result.error || JSON.stringify(result);

      if (this._isFatalError(errorMsg)) {
        this.stop('fatal_error');
        return {
          continue: false,
          reason: 'fatal_error',
          message: `Erreur irrécupérable: ${String(errorMsg).substring(0, 100)}`
        };
      }

      // Incrémenter compteur d'erreurs consécutives
      this.consecutiveErrors++;
      this.stats.failedActions++;

      // Enregistrer l'erreur
      this.errorHistory.push({
        error: errorMsg,
        toolName: action,
        timestamp: Date.now()
      });

      // Trop d'erreurs consécutives?
      if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        return {
          continue: false,
          reason: 'too_many_errors',
          message: `${this.consecutiveErrors} erreurs consécutives`,
          suggestion: 'Revoir la stratégie ou demander aide utilisateur'
        };
      }

      // Même erreur répétée?
      const sameErrorCount = this._countSameErrors(errorMsg);
      if (sameErrorCount >= this.config.errorRepetitionThreshold) {
        this.stats.blocksDetected++;
        this.emit('block_detected', {
          type: 'repeated_error',
          error: errorMsg,
          count: sameErrorCount
        });

        return {
          continue: true,
          reason: 'repeated_error',
          needsCorrection: true,
          message: `Même erreur répétée ${sameErrorCount}x: ${String(errorMsg).substring(0, 50)}`,
          suggestion: 'Appliquer stratégie de correction'
        };
      }
    } else {
      // Action réussie - reset compteur erreurs
      this.consecutiveErrors = 0;
      this.stats.successfulActions++;
    }

    // 4. Vérifier répétition d'actions (boucle infinie)
    if (action) {
      const actionHash = this._hashAction(action, args);
      this.actionHistory.push({
        action,
        args,
        hash: actionHash,
        timestamp: Date.now()
      });

      // Compter appels du même outil
      this.toolCallCounts[action] = (this.toolCallCounts[action] || 0) + 1;

      // Même action avec mêmes arguments?
      const repetitionCount = this._countRepetitions(actionHash);
      if (repetitionCount >= this.config.repetitionThreshold) {
        this.stats.repetitionsDetected++;
        this.emit('repetition_detected', {
          action,
          args,
          count: repetitionCount
        });

        return {
          continue: true,
          reason: 'repetition_detected',
          needsCorrection: true,
          message: `Action "${action}" répétée ${repetitionCount}x avec mêmes arguments`,
          suggestion: 'Changer de stratégie ou d\'arguments'
        };
      }
    }

    // 5. Pas de tool calls = réponse finale?
    if (!action && llmResponse && llmResponse.length > 50) {
      // Le LLM a répondu sans demander d'outil = probablement fini
      return {
        continue: false,
        reason: 'no_tool_calls',
        message: 'Le LLM a fourni une réponse sans demander d\'action'
      };
    }

    // 6. Tout OK, continuer
    return {
      continue: true,
      reason: 'continue',
      iteration: this.iteration,
      elapsedMs: elapsed
    };
  }

  /**
   * Créer un checkpoint pour recovery
   * @param {object} state - État à sauvegarder
   */
  createCheckpoint(state) {
    const checkpoint = {
      id: `cp_${Date.now()}`,
      iteration: this.iteration,
      timestamp: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state)),
      stats: { ...this.stats }
    };

    this.checkpoints.push(checkpoint);

    // Garder seulement les 5 derniers checkpoints
    if (this.checkpoints.length > 5) {
      this.checkpoints.shift();
    }

    this.emit('checkpoint_created', checkpoint);
    return checkpoint.id;
  }

  /**
   * Restaurer depuis un checkpoint
   * @param {string} checkpointId - ID du checkpoint
   * @returns {object|null} État restauré
   */
  restoreCheckpoint(checkpointId) {
    const checkpoint = this.checkpoints.find(cp => cp.id === checkpointId);

    if (!checkpoint) {
      return null;
    }

    this.emit('checkpoint_restored', checkpoint);
    return checkpoint.state;
  }

  /**
   * Obtenir le dernier checkpoint
   */
  getLastCheckpoint() {
    return this.checkpoints[this.checkpoints.length - 1] || null;
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      iteration: this.iteration,
      isRunning: this.isRunning,
      elapsedMs: this.startTime ? Date.now() - this.startTime : 0,
      toolCallCounts: { ...this.toolCallCounts },
      consecutiveErrors: this.consecutiveErrors,
      checkpointsCount: this.checkpoints.length
    };
  }

  /**
   * Réinitialiser l'historique (nouveau contexte)
   */
  resetHistory() {
    this.actionHistory = [];
    this.errorHistory = [];
    this.consecutiveErrors = 0;
  }

  // ============= MÉTHODES PRIVÉES =============

  /**
   * Détecter un message de succès
   * @private
   */
  _detectSuccess(text) {
    return SUCCESS_PATTERNS.some(pattern => pattern.test(text));
  }

  /**
   * Vérifier si une erreur est fatale
   * @private
   */
  _isFatalError(errorText) {
    return FATAL_ERROR_PATTERNS.some(pattern => pattern.test(errorText));
  }

  /**
   * Créer un hash d'action pour comparaison
   * @private
   */
  _hashAction(action, args) {
    const argsStr = JSON.stringify(args || {});
    return `${action}:${argsStr}`;
  }

  /**
   * Compter les répétitions d'une action
   * @private
   */
  _countRepetitions(hash) {
    return this.actionHistory.filter(h => h.hash === hash).length;
  }

  /**
   * Compter les occurrences de la même erreur
   * @private
   */
  _countSameErrors(errorMsg) {
    const errorKey = String(errorMsg).substring(0, 100);
    return this.errorHistory.filter(e =>
      String(e.error || '').substring(0, 100) === errorKey
    ).length;
  }

  /**
   * Formater le temps écoulé
   * @private
   */
  _formatElapsed() {
    const ms = Date.now() - this.startTime;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

// ============= FACTORY FUNCTIONS =============

/**
 * Créer un contrôleur avec configuration par défaut
 */
function createLoopController(options = {}) {
  return new LoopController(options);
}

/**
 * Créer un contrôleur pour tâches courtes (2 min max)
 */
function createQuickLoopController() {
  return new LoopController({
    globalTimeoutMs: 2 * 60 * 1000,
    warningTimeoutMs: 60 * 1000,
    maxConsecutiveErrors: 3
  });
}

/**
 * Créer un contrôleur pour tâches longues (30 min max)
 */
function createLongRunningController() {
  return new LoopController({
    globalTimeoutMs: 30 * 60 * 1000,
    warningTimeoutMs: 15 * 60 * 1000,
    maxConsecutiveErrors: 10,
    repetitionThreshold: 5
  });
}

// ============= ALIASED GETTERS FOR API COMPATIBILITY =============

// Ajout de propriétés alias pour compatibilité API
Object.defineProperties(LoopController.prototype, {
  maxIterations: {
    get() { return this.config.maxIterations || 1000; }
  },
  globalTimeoutMs: {
    get() { return this.config.globalTimeoutMs; }
  },
  repetitionThreshold: {
    get() { return this.config.repetitionThreshold; }
  },
  maxConsecutiveErrors: {
    get() { return this.config.maxConsecutiveErrors; }
  },
  maxRetriesPerAction: {
    get() { return this.config.maxRetriesPerAction || 3; }
  },
  running: {
    get() { return this.isRunning; }
  },
  stopReason: {
    get() { return this._stopReason || null; },
    set(val) { this._stopReason = val; }
  }
});

// Méthodes alias pour compatibilité tests
LoopController.prototype.startLoop = function() {
  return this.start();
};

LoopController.prototype.stopLoop = function(reason) {
  this._stopReason = reason;
  return this.stop(reason);
};

LoopController.prototype.reset = function() {
  this.stopLoop('reset');
  this.startTime = null;
  this.lastActionTime = null;
  this.iteration = 0;
  this.isRunning = false;
  this.actionHistory = [];
  this.errorHistory = [];
  this.toolCallCounts = {};
  this.consecutiveErrors = 0;
  this.checkpoints = [];
  this._stopReason = null;
  this.stats = {
    totalIterations: 0,
    successfulActions: 0,
    failedActions: 0,
    repetitionsDetected: 0,
    blocksDetected: 0,
    timeSpentMs: 0
  };
};

// Méthode canRetry pour vérifier si on peut réessayer une action
LoopController.prototype.canRetry = function(actionName) {
  if (!this._retryCounters) {
    this._retryCounters = {};
  }
  const count = this._retryCounters[actionName] || 0;
  if (count >= (this.config.maxRetriesPerAction || 3)) {
    return false;
  }
  this._retryCounters[actionName] = count + 1;
  return true;
};

// ============= LOOP CONFIG PRESETS =============

const LOOP_CONFIG = {
  DEFAULT: {
    maxIterations: 1000,
    globalTimeoutMs: 10 * 60 * 1000,
    warningTimeoutMs: 5 * 60 * 1000,
    repetitionThreshold: 3,
    maxConsecutiveErrors: 5
  },
  QUICK: {
    maxIterations: 100,
    globalTimeoutMs: 2 * 60 * 1000,
    warningTimeoutMs: 60 * 1000,
    repetitionThreshold: 2,
    maxConsecutiveErrors: 3
  },
  LONG_RUNNING: {
    maxIterations: 5000,
    globalTimeoutMs: 30 * 60 * 1000,
    warningTimeoutMs: 15 * 60 * 1000,
    repetitionThreshold: 5,
    maxConsecutiveErrors: 10
  }
};

// ============= EXPORTS =============

module.exports = {
  LoopController,
  createLoopController,
  createQuickLoopController,
  createLongRunningController,
  DEFAULT_CONFIG,
  SUCCESS_PATTERNS,
  FATAL_ERROR_PATTERNS,
  LOOP_CONFIG
};
