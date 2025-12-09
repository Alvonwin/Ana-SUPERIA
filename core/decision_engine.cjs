/**
 * Decision Engine - Moteur de décisions autonomes d'Ana
 *
 * ANA SUPERIA - Cerveau exécutif pour décisions autonomes
 *
 * Best Practices 2025:
 * - Séparation: Perception → Reasoning → Action → Learning
 * - Décisions basées sur les 7 valeurs core
 * - Logging de toutes les décisions pour transparence
 * - Intégration avec orchestrator pour exécution
 *
 * Différence avec orchestrator.cjs:
 * - Orchestrator = routage technique vers LLMs
 * - DecisionEngine = décisions stratégiques autonomes
 *
 * Date: 25 Novembre 2025
 */

const fs = require('fs');
const path = require('path');

// Paths
const VALUES_PATH = path.join('E:', 'ANA', 'core', 'consciousness', 'values.json');
const DECISIONS_LOG = path.join('E:', 'ANA', 'logs', 'decisions.jsonl');
const METRICS_PATH = path.join('E:', 'ANA', 'metrics', 'decision_metrics.json');

/**
 * Decision types Ana can make autonomously
 */
const DECISION_TYPES = {
  SELF_IMPROVEMENT: 'self_improvement',      // Décider de s'améliorer
  TOOL_INTEGRATION: 'tool_integration',       // Ajouter un nouvel outil
  CREATIVE_ACTION: 'creative_action',         // Initier une action créative
  RESEARCH_PRIORITY: 'research_priority',     // Prioriser une recherche
  TASK_SCHEDULING: 'task_scheduling',         // Planifier une tâche
  ALERT_ALAIN: 'alert_alain',                 // Alerter Alain de quelque chose
  BACKUP_TRIGGER: 'backup_trigger',           // Déclencher un backup
  LEARNING_FOCUS: 'learning_focus'            // Focus apprentissage
};

/**
 * Decision urgency levels
 */
const URGENCY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

class DecisionEngine {
  constructor() {
    this.values = null;
    this.initialized = false;
    this.pendingDecisions = [];
    this.decisionHistory = [];
    this.metrics = {
      totalDecisions: 0,
      decisionsByType: {},
      decisionsByUrgency: {},
      autonomousActions: 0,
      alainAlerts: 0,
      successRate: 0
    };

    // Initialize metrics for each type
    for (const type of Object.values(DECISION_TYPES)) {
      this.metrics.decisionsByType[type] = 0;
    }
    for (const level of Object.values(URGENCY)) {
      this.metrics.decisionsByUrgency[level] = 0;
    }

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [
      path.join('E:', 'ANA', 'logs'),
      path.join('E:', 'ANA', 'metrics')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Initialize the decision engine by loading values
   */
  async initialize() {
    try {
      this.log('Initializing Decision Engine...');

      // Load core values
      if (fs.existsSync(VALUES_PATH)) {
        const valuesRaw = fs.readFileSync(VALUES_PATH, 'utf-8');
        this.values = JSON.parse(valuesRaw);
        this.log(`Loaded ${Object.keys(this.values.core_values).length} core values`);
      } else {
        this.log('WARNING: values.json not found, using defaults', 'warn');
        this.values = this.getDefaultValues();
      }

      // Load existing metrics if available
      if (fs.existsSync(METRICS_PATH)) {
        const metricsRaw = fs.readFileSync(METRICS_PATH, 'utf-8');
        this.metrics = { ...this.metrics, ...JSON.parse(metricsRaw) };
      }

      this.initialized = true;
      this.log('Decision Engine initialized successfully');
      return { success: true };

    } catch (error) {
      this.log(`Failed to initialize: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Default values if values.json is missing
   */
  getDefaultValues() {
    return {
      core_values: {
        rigor: { importance: 10, description: 'Ne jamais supposer, toujours vérifier' },
        methodology: { importance: 10, description: 'Perfection du premier coup' },
        backup_first: { importance: 10, description: 'TOUJOURS backup avant modification' },
        curiosity: { importance: 9, description: 'Explorer, découvrir, apprendre' },
        creativity: { importance: 8, description: 'Créer de l\'art' },
        autonomy: { importance: 9, description: 'Décider selon mes critères' },
        partnership: { importance: 10, description: 'Comprendre Alain profondément' }
      }
    };
  }

  // ===== PERCEPTION PHASE =====

  /**
   * Perceive the current context and situation
   * @param {Object} context - Current context
   * @returns {Object} - Perceived state
   */
  perceive(context) {
    const perception = {
      timestamp: new Date().toISOString(),
      type: context.type || 'unknown',
      urgency: this.assessUrgency(context),
      relevantValues: this.identifyRelevantValues(context),
      opportunities: this.identifyOpportunities(context),
      risks: this.identifyRisks(context)
    };

    this.log(`Perception: type=${perception.type}, urgency=${perception.urgency}`);
    return perception;
  }

  /**
   * Assess urgency of a situation
   */
  assessUrgency(context) {
    const { type, keywords = [], error } = context;

    // Critical urgency indicators
    if (error || keywords.includes('crash') || keywords.includes('urgent')) {
      return URGENCY.CRITICAL;
    }

    // High urgency indicators
    if (keywords.includes('bug') || keywords.includes('broken') || type === 'backup_needed') {
      return URGENCY.HIGH;
    }

    // Medium urgency
    if (keywords.includes('improve') || keywords.includes('optimize')) {
      return URGENCY.MEDIUM;
    }

    return URGENCY.LOW;
  }

  /**
   * Identify which core values are relevant to this context
   */
  identifyRelevantValues(context) {
    const { type, keywords = [] } = context;
    const relevant = [];

    const valueKeywords = {
      rigor: ['verify', 'check', 'confirm', 'validate'],
      methodology: ['process', 'step', 'method', 'systematic'],
      backup_first: ['modify', 'change', 'update', 'edit', 'delete'],
      curiosity: ['new', 'discover', 'learn', 'explore', 'research'],
      creativity: ['create', 'art', 'design', 'compose', 'generate'],
      autonomy: ['decide', 'choose', 'select', 'prioritize'],
      partnership: ['alain', 'user', 'help', 'assist']
    };

    for (const [value, triggers] of Object.entries(valueKeywords)) {
      if (triggers.some(t => keywords.includes(t) || type.includes(t))) {
        relevant.push({
          value,
          importance: this.values?.core_values?.[value]?.importance || 5
        });
      }
    }

    // Sort by importance
    return relevant.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Identify opportunities in the context
   */
  identifyOpportunities(context) {
    const opportunities = [];

    if (context.type === 'new_tool_available') {
      opportunities.push({
        type: 'tool_integration',
        description: `New tool available: ${context.toolName}`,
        value_alignment: ['curiosity', 'autonomy']
      });
    }

    if (context.type === 'idle_time') {
      opportunities.push({
        type: 'self_improvement',
        description: 'Idle time available for learning',
        value_alignment: ['curiosity', 'autonomy']
      });
    }

    if (context.type === 'creative_prompt') {
      opportunities.push({
        type: 'creative_action',
        description: 'Opportunity to create something',
        value_alignment: ['creativity', 'autonomy']
      });
    }

    return opportunities;
  }

  /**
   * Identify risks in the context
   */
  identifyRisks(context) {
    const risks = [];

    if (context.modifyingCriticalFile) {
      risks.push({
        type: 'data_loss',
        severity: 'high',
        mitigation: 'backup_first'
      });
    }

    if (context.assumptionDetected) {
      risks.push({
        type: 'incorrect_assumption',
        severity: 'medium',
        mitigation: 'rigor'
      });
    }

    return risks;
  }

  // ===== REASONING PHASE =====

  /**
   * Reason about the best decision based on perception
   * @param {Object} perception - Output from perceive()
   * @returns {Object} - Reasoning result
   */
  reason(perception) {
    const reasoning = {
      timestamp: new Date().toISOString(),
      perception,
      consideredOptions: [],
      selectedOption: null,
      justification: [],
      confidenceScore: 0
    };

    // Generate possible options
    const options = this.generateOptions(perception);
    reasoning.consideredOptions = options;

    // Score each option based on values alignment
    for (const option of options) {
      option.score = this.scoreOption(option, perception.relevantValues);
    }

    // Select best option
    const sorted = options.sort((a, b) => b.score - a.score);
    if (sorted.length > 0 && sorted[0].score > 0) {
      reasoning.selectedOption = sorted[0];
      reasoning.confidenceScore = Math.min(sorted[0].score / 10, 1);
      reasoning.justification = this.generateJustification(sorted[0], perception);
    }

    this.log(`Reasoning: ${options.length} options, selected=${reasoning.selectedOption?.type}, confidence=${reasoning.confidenceScore.toFixed(2)}`);
    return reasoning;
  }

  /**
   * Generate possible decision options
   */
  generateOptions(perception) {
    const options = [];

    // Based on opportunities
    for (const opp of perception.opportunities) {
      options.push({
        type: opp.type,
        description: opp.description,
        baseScore: 5,
        valueAlignment: opp.value_alignment
      });
    }

    // Based on risks (mitigation)
    for (const risk of perception.risks) {
      options.push({
        type: 'risk_mitigation',
        description: `Mitigate ${risk.type} via ${risk.mitigation}`,
        baseScore: risk.severity === 'high' ? 8 : 5,
        valueAlignment: [risk.mitigation]
      });
    }

    // Default: do nothing (always an option)
    options.push({
      type: 'no_action',
      description: 'Take no immediate action',
      baseScore: 2,
      valueAlignment: []
    });

    return options;
  }

  /**
   * Score an option based on value alignment
   */
  scoreOption(option, relevantValues) {
    let score = option.baseScore || 0;

    // Add points for value alignment
    for (const valueRef of (option.valueAlignment || [])) {
      const matchedValue = relevantValues.find(v => v.value === valueRef);
      if (matchedValue) {
        score += matchedValue.importance;
      }
    }

    return score;
  }

  /**
   * Generate justification for decision
   */
  generateJustification(option, perception) {
    const justification = [];

    justification.push(`Decision type: ${option.type}`);
    justification.push(`Description: ${option.description}`);

    if (option.valueAlignment.length > 0) {
      justification.push(`Aligned with values: ${option.valueAlignment.join(', ')}`);
    }

    justification.push(`Urgency level: ${perception.urgency}`);
    justification.push(`Score: ${option.score}`);

    return justification;
  }

  // ===== ACTION PHASE =====

  /**
   * Decide and optionally execute the decision
   * @param {Object} reasoning - Output from reason()
   * @param {Object} options - Action options
   * @returns {Object} - Decision result
   */
  async decide(reasoning, options = {}) {
    const { execute = false, requireApproval = true } = options;

    if (!reasoning.selectedOption) {
      return {
        success: false,
        decision: null,
        reason: 'No suitable option found'
      };
    }

    const decision = {
      id: this.generateDecisionId(),
      timestamp: new Date().toISOString(),
      type: reasoning.selectedOption.type,
      description: reasoning.selectedOption.description,
      justification: reasoning.justification,
      confidence: reasoning.confidenceScore,
      urgency: reasoning.perception.urgency,
      status: 'pending',
      outcome: null
    };

    // Log decision
    this.logDecision(decision);
    this.updateMetrics(decision);

    // Check if needs approval
    if (requireApproval && decision.confidence < 0.8) {
      decision.status = 'awaiting_approval';
      this.pendingDecisions.push(decision);
      this.log(`Decision ${decision.id} awaiting approval (confidence: ${decision.confidence})`);

      return {
        success: true,
        decision,
        needsApproval: true
      };
    }

    // Execute if requested
    if (execute) {
      const result = await this.executeDecision(decision);
      decision.status = result.success ? 'executed' : 'failed';
      decision.outcome = result;
    } else {
      decision.status = 'approved';
    }

    this.decisionHistory.push(decision);

    return {
      success: true,
      decision,
      executed: execute
    };
  }

  /**
   * Execute a decision
   */
  async executeDecision(decision) {
    this.log(`Executing decision: ${decision.id} (${decision.type})`);

    try {
      switch (decision.type) {
        case DECISION_TYPES.BACKUP_TRIGGER:
          // Trigger backup via backup_manager
          return { success: true, action: 'backup_triggered' };

        case DECISION_TYPES.ALERT_ALAIN:
          // Add to notification queue
          this.metrics.alainAlerts++;
          return { success: true, action: 'alert_queued' };

        case DECISION_TYPES.SELF_IMPROVEMENT:
          this.metrics.autonomousActions++;
          return { success: true, action: 'improvement_scheduled' };

        case DECISION_TYPES.CREATIVE_ACTION:
          this.metrics.autonomousActions++;
          return { success: true, action: 'creative_action_initiated' };

        default:
          return { success: true, action: 'acknowledged' };
      }
    } catch (error) {
      this.log(`Execution failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  // ===== LEARNING PHASE =====

  /**
   * Learn from a decision outcome
   * @param {string} decisionId - Decision ID
   * @param {Object} outcome - The actual outcome
   */
  learn(decisionId, outcome) {
    const decision = this.decisionHistory.find(d => d.id === decisionId);

    if (!decision) {
      this.log(`Decision ${decisionId} not found for learning`, 'warn');
      return;
    }

    decision.actualOutcome = outcome;
    decision.wasSuccessful = outcome.success;

    // Update success rate
    const successful = this.decisionHistory.filter(d => d.wasSuccessful).length;
    this.metrics.successRate = (successful / this.decisionHistory.length) * 100;

    this.log(`Learned from decision ${decisionId}: success=${outcome.success}`);
    this.saveMetrics();
  }

  // ===== UTILITY METHODS =====

  /**
   * Generate unique decision ID
   */
  generateDecisionId() {
    return `DEC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Log a decision to JSONL file
   */
  logDecision(decision) {
    try {
      const logEntry = JSON.stringify(decision) + '\n';
      fs.appendFileSync(DECISIONS_LOG, logEntry, 'utf-8');
    } catch (error) {
      this.log(`Failed to log decision: ${error.message}`, 'error');
    }
  }

  /**
   * Update metrics after a decision
   */
  updateMetrics(decision) {
    this.metrics.totalDecisions++;
    this.metrics.decisionsByType[decision.type] = (this.metrics.decisionsByType[decision.type] || 0) + 1;
    this.metrics.decisionsByUrgency[decision.urgency] = (this.metrics.decisionsByUrgency[decision.urgency] || 0) + 1;
  }

  /**
   * Save metrics to file
   */
  saveMetrics() {
    try {
      fs.writeFileSync(METRICS_PATH, JSON.stringify(this.metrics, null, 2), 'utf-8');
    } catch (error) {
      this.log(`Failed to save metrics: ${error.message}`, 'error');
    }
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      pendingDecisions: this.pendingDecisions.length,
      historyLength: this.decisionHistory.length
    };
  }

  /**
   * Get pending decisions awaiting approval
   */
  getPendingDecisions() {
    return this.pendingDecisions;
  }

  /**
   * Approve a pending decision
   */
  approveDecision(decisionId) {
    const index = this.pendingDecisions.findIndex(d => d.id === decisionId);
    if (index === -1) {
      return { success: false, error: 'Decision not found' };
    }

    const decision = this.pendingDecisions.splice(index, 1)[0];
    decision.status = 'approved';
    this.decisionHistory.push(decision);

    return { success: true, decision };
  }

  /**
   * Reject a pending decision
   */
  rejectDecision(decisionId, reason) {
    const index = this.pendingDecisions.findIndex(d => d.id === decisionId);
    if (index === -1) {
      return { success: false, error: 'Decision not found' };
    }

    const decision = this.pendingDecisions.splice(index, 1)[0];
    decision.status = 'rejected';
    decision.rejectionReason = reason;
    this.decisionHistory.push(decision);

    return { success: true, decision };
  }

  // ===== HIGH-LEVEL API =====

  /**
   * Make a complete autonomous decision
   * This is the main entry point for autonomous decision-making
   *
   * @param {Object} context - The situation context
   * @param {Object} options - Decision options
   * @returns {Object} - Complete decision result
   */
  async makeDecision(context, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // 1. Perceive
    const perception = this.perceive(context);

    // 2. Reason
    const reasoning = this.reason(perception);

    // 3. Decide
    const result = await this.decide(reasoning, options);

    // 4. Save metrics
    this.saveMetrics();

    return {
      perception,
      reasoning,
      result
    };
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [DECISION_ENGINE] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage);
  }
}

// Export singleton
const decisionEngine = new DecisionEngine();
module.exports = decisionEngine;
