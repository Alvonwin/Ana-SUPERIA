/**
 * ANA CORE MODULES - Export Central
 *
 * 5 modules de contrôle avancés pour Ana:
 * 1. LoopController - Boucle autonome sans limite fixe
 * 2. SelfCorrection - Détection et correction automatique d'erreurs
 * 3. ContextManager - Gestion intelligente du contexte 200K+
 * 4. PlanManager - Mode planification explicite
 * 5. TransactionManager - Opérations atomiques multi-fichiers
 *
 * Date: 7 Décembre 2025
 * Version: 1.0.0
 */

// ============= IMPORTS =============

const {
  LoopController,
  createLoopController,
  createQuickLoopController,
  createLongRunningController,
  DEFAULT_CONFIG: LOOP_CONFIG,
  SUCCESS_PATTERNS,
  FATAL_ERROR_PATTERNS
} = require('./loop-controller.cjs');

const {
  SelfCorrection,
  selfCorrection,
  ERROR_STRATEGIES,
  ERROR_PATTERNS
} = require('./self-correction.cjs');

const {
  ContextManager,
  createContextManager,
  createLargeContextManager,
  MODEL_CONTEXT_LIMITS,
  COMPRESSION_THRESHOLD,
  PRIORITY_CONTENT
} = require('./context-manager.cjs');

const {
  PlanManager,
  createPlanManager,
  STEP_STATUS,
  PLAN_TEMPLATE
} = require('./plan-manager.cjs');

const {
  TransactionManager,
  createTransactionManager,
  transactionManager,
  TX_STATUS,
  OP_TYPE
} = require('./transaction-manager.cjs');

const {
  RepetitionDetector,
  jaccardSimilarity,
  ngramSimilarity,
  extractSignificantContent,
  globalDetector
} = require('./repetition-detector.cjs');

// ============= VERSION INFO =============

const VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  date: '2025-12-07',
  modules: [
    'LoopController',
    'SelfCorrection',
    'ContextManager',
    'PlanManager',
    'TransactionManager',
    'RepetitionDetector'
  ]
};

// ============= CONVENIENCE FUNCTIONS =============

/**
 * Créer un ensemble complet de contrôleurs pour un agent
 * @param {object} options - Options de configuration
 * @returns {object} Ensemble de contrôleurs
 */
function createAgentControllers(options = {}) {
  return {
    loop: createLoopController(options.loop),
    correction: new SelfCorrection(),
    context: createContextManager(options.context),
    plan: createPlanManager(options.plan),
    transaction: createTransactionManager(options.transaction)
  };
}

/**
 * Créer des contrôleurs pour tâches rapides
 */
function createQuickTaskControllers() {
  return {
    loop: createQuickLoopController(),
    correction: new SelfCorrection(),
    context: createContextManager(),
    plan: null, // Pas de plan pour tâches rapides
    transaction: null // Pas de transactions
  };
}

/**
 * Créer des contrôleurs pour tâches longues/complexes
 */
function createComplexTaskControllers() {
  return {
    loop: createLongRunningController(),
    correction: new SelfCorrection(),
    context: createLargeContextManager(),
    plan: createPlanManager(),
    transaction: createTransactionManager()
  };
}

// ============= EXPORTS =============

module.exports = {
  // Version
  VERSION,

  // LoopController
  LoopController,
  createLoopController,
  createQuickLoopController,
  createLongRunningController,
  LOOP_CONFIG,
  SUCCESS_PATTERNS,
  FATAL_ERROR_PATTERNS,

  // SelfCorrection
  SelfCorrection,
  selfCorrection,
  ERROR_STRATEGIES,
  ERROR_PATTERNS,

  // ContextManager
  ContextManager,
  createContextManager,
  createLargeContextManager,
  MODEL_CONTEXT_LIMITS,
  COMPRESSION_THRESHOLD,
  PRIORITY_CONTENT,

  // PlanManager
  PlanManager,
  createPlanManager,
  STEP_STATUS,
  PLAN_TEMPLATE,

  // TransactionManager
  TransactionManager,
  createTransactionManager,
  transactionManager,
  TX_STATUS,
  OP_TYPE,

  // RepetitionDetector
  RepetitionDetector,
  jaccardSimilarity,
  ngramSimilarity,
  extractSignificantContent,
  globalDetector,

  // Convenience functions
  createAgentControllers,
  createQuickTaskControllers,
  createComplexTaskControllers
};
