/**
 * PLAN MANAGER - Mode Planification Explicite
 *
 * Fonctionnalités:
 * 1. Création de plans structurés avant exécution
 * 2. Suivi de progression des étapes
 * 3. Validation des étapes critiques
 * 4. Sauvegarde et reprise de plans
 *
 * Date: 7 Décembre 2025
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';
const PLANS_DIR = path.join('E:', 'ANA', 'memory', 'plans');

// Modèle pour planification
const PLANNING_MODEL = 'qwen2.5-coder:7b';

// États possibles d'une étape
const STEP_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  BLOCKED: 'blocked'
};

// Template de plan
const PLAN_TEMPLATE = {
  id: null,
  title: '',
  description: '',
  status: 'draft',  // draft, active, completed, failed, paused
  createdAt: null,
  updatedAt: null,
  steps: [],
  risks: [],
  dependencies: [],
  estimatedDuration: null,
  actualDuration: null,
  metadata: {}
};

class PlanManager {
  constructor(options = {}) {
    this.model = options.model || PLANNING_MODEL;
    this.currentPlan = null;
    this.planHistory = [];

    // S'assurer que le dossier existe
    if (!fs.existsSync(PLANS_DIR)) {
      fs.mkdirSync(PLANS_DIR, { recursive: true });
    }

    // Stats
    this.stats = {
      plansCreated: 0,
      plansCompleted: 0,
      plansFailed: 0,
      stepsExecuted: 0
    };
  }

  /**
   * Créer un plan pour une tâche
   * @param {string} task - Description de la tâche
   * @param {object} options - Options de planification
   * @returns {Promise<object>} Plan créé
   */
  async createPlan(task, options = {}) {
    const { context = '', requireApproval = false, maxSteps = 20 } = options;

    console.log(`[PlanManager] Creating plan for: "${task.substring(0, 50)}..."`);

    // Générer le plan via LLM
    const prompt = `Tu es un planificateur expert. Crée un plan d'exécution détaillé pour cette tâche:

TÂCHE: ${task}

${context ? `CONTEXTE:\n${context}\n` : ''}

Génère un plan JSON structuré avec ce format EXACT:
{
  "title": "Titre court du plan",
  "description": "Description de l'objectif",
  "steps": [
    {
      "id": 1,
      "action": "Description de l'action",
      "tools": ["tool1", "tool2"],
      "validation": "Comment valider que c'est fait",
      "critical": true/false,
      "dependencies": []
    }
  ],
  "risks": ["Risque 1", "Risque 2"],
  "estimatedDuration": "estimation en minutes"
}

RÈGLES:
- Maximum ${maxSteps} étapes
- Étapes concrètes et actionnables
- Inclure les validations
- Marquer les étapes critiques (critical: true)
- Lister les dépendances entre étapes

Réponds UNIQUEMENT avec le JSON, pas d'explication.`;

    try {
      const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: this.model,
        prompt,
        stream: false,
        options: { temperature: 0.2 }
      }, { timeout: 60000 });

      // Parser le JSON
      const jsonMatch = response.data.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM did not return valid JSON plan');
      }

      const planData = JSON.parse(jsonMatch[0]);

      // Créer le plan complet
      const plan = {
        ...PLAN_TEMPLATE,
        ...planData,
        id: `plan_${Date.now()}`,
        status: requireApproval ? 'draft' : 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: (planData.steps || []).map((step, idx) => ({
          ...step,
          id: step.id || idx + 1,
          status: STEP_STATUS.PENDING,
          result: null,
          startedAt: null,
          completedAt: null
        }))
      };

      // Sauvegarder le plan
      this._savePlan(plan);
      this.currentPlan = plan;
      this.stats.plansCreated++;

      return {
        success: true,
        plan,
        requiresApproval: requireApproval
      };

    } catch (err) {
      console.error('[PlanManager] Plan creation failed:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Approuver et activer un plan
   * @param {string} planId - ID du plan
   * @returns {object} Résultat
   */
  approvePlan(planId = null) {
    const plan = planId ? this._loadPlan(planId) : this.currentPlan;

    if (!plan) {
      return { success: false, error: 'Plan not found' };
    }

    plan.status = 'active';
    plan.updatedAt = new Date().toISOString();
    this._savePlan(plan);
    this.currentPlan = plan;

    return { success: true, plan };
  }

  /**
   * Obtenir la prochaine étape à exécuter
   * @returns {object|null} Prochaine étape ou null
   */
  getNextStep() {
    if (!this.currentPlan || this.currentPlan.status !== 'active') {
      return null;
    }

    // Trouver la première étape pending dont les dépendances sont satisfaites
    for (const step of this.currentPlan.steps) {
      if (step.status !== STEP_STATUS.PENDING) continue;

      // Vérifier les dépendances
      const depsOk = (step.dependencies || []).every(depId => {
        const depStep = this.currentPlan.steps.find(s => s.id === depId);
        return depStep && depStep.status === STEP_STATUS.COMPLETED;
      });

      if (depsOk) {
        return step;
      }
    }

    return null;
  }

  /**
   * Marquer une étape comme en cours
   * @param {number} stepId - ID de l'étape
   */
  startStep(stepId) {
    const step = this._findStep(stepId);
    if (!step) return { success: false, error: 'Step not found' };

    step.status = STEP_STATUS.IN_PROGRESS;
    step.startedAt = new Date().toISOString();
    this.currentPlan.updatedAt = new Date().toISOString();
    this._savePlan(this.currentPlan);

    return { success: true, step };
  }

  /**
   * Marquer une étape comme terminée
   * @param {number} stepId - ID de l'étape
   * @param {object} result - Résultat de l'étape
   */
  completeStep(stepId, result = {}) {
    const step = this._findStep(stepId);
    if (!step) return { success: false, error: 'Step not found' };

    step.status = STEP_STATUS.COMPLETED;
    step.completedAt = new Date().toISOString();
    step.result = result;
    this.currentPlan.updatedAt = new Date().toISOString();
    this.stats.stepsExecuted++;

    // Vérifier si le plan est terminé
    const allCompleted = this.currentPlan.steps.every(
      s => s.status === STEP_STATUS.COMPLETED || s.status === STEP_STATUS.SKIPPED
    );

    if (allCompleted) {
      this.currentPlan.status = 'completed';
      this.currentPlan.actualDuration = this._calculateDuration();
      this.stats.plansCompleted++;
    }

    this._savePlan(this.currentPlan);

    return {
      success: true,
      step,
      planCompleted: allCompleted
    };
  }

  /**
   * Marquer une étape comme échouée
   * @param {number} stepId - ID de l'étape
   * @param {string} error - Message d'erreur
   */
  failStep(stepId, error) {
    const step = this._findStep(stepId);
    if (!step) return { success: false, error: 'Step not found' };

    step.status = STEP_STATUS.FAILED;
    step.error = error;
    step.completedAt = new Date().toISOString();

    // Si étape critique, le plan échoue
    if (step.critical) {
      this.currentPlan.status = 'failed';
      this.currentPlan.failureReason = `Critical step ${stepId} failed: ${error}`;
      this.stats.plansFailed++;
    }

    this.currentPlan.updatedAt = new Date().toISOString();
    this._savePlan(this.currentPlan);

    return {
      success: true,
      step,
      planFailed: step.critical
    };
  }

  /**
   * Sauter une étape
   * @param {number} stepId - ID de l'étape
   * @param {string} reason - Raison
   */
  skipStep(stepId, reason = '') {
    const step = this._findStep(stepId);
    if (!step) return { success: false, error: 'Step not found' };

    if (step.critical) {
      return { success: false, error: 'Cannot skip critical step' };
    }

    step.status = STEP_STATUS.SKIPPED;
    step.skipReason = reason;
    this.currentPlan.updatedAt = new Date().toISOString();
    this._savePlan(this.currentPlan);

    return { success: true, step };
  }

  /**
   * Mettre le plan en pause
   */
  pausePlan() {
    if (!this.currentPlan) return { success: false, error: 'No active plan' };

    this.currentPlan.status = 'paused';
    this.currentPlan.pausedAt = new Date().toISOString();
    this._savePlan(this.currentPlan);

    return { success: true };
  }

  /**
   * Reprendre un plan en pause
   * @param {string} planId - ID du plan (optionnel)
   */
  resumePlan(planId = null) {
    const plan = planId ? this._loadPlan(planId) : this.currentPlan;

    if (!plan) return { success: false, error: 'Plan not found' };

    plan.status = 'active';
    plan.resumedAt = new Date().toISOString();
    this._savePlan(plan);
    this.currentPlan = plan;

    return { success: true, plan };
  }

  /**
   * Obtenir le statut du plan actuel
   */
  getStatus() {
    if (!this.currentPlan) {
      return { active: false };
    }

    const completed = this.currentPlan.steps.filter(s => s.status === STEP_STATUS.COMPLETED).length;
    const failed = this.currentPlan.steps.filter(s => s.status === STEP_STATUS.FAILED).length;
    const pending = this.currentPlan.steps.filter(s => s.status === STEP_STATUS.PENDING).length;
    const inProgress = this.currentPlan.steps.filter(s => s.status === STEP_STATUS.IN_PROGRESS).length;

    return {
      active: true,
      planId: this.currentPlan.id,
      title: this.currentPlan.title,
      status: this.currentPlan.status,
      progress: {
        total: this.currentPlan.steps.length,
        completed,
        failed,
        pending,
        inProgress,
        percentage: Math.round((completed / this.currentPlan.steps.length) * 100)
      },
      currentStep: this.getNextStep()
    };
  }

  /**
   * Obtenir tous les plans sauvegardés
   */
  listPlans() {
    try {
      const files = fs.readdirSync(PLANS_DIR);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const plan = JSON.parse(fs.readFileSync(path.join(PLANS_DIR, f), 'utf-8'));
          return {
            id: plan.id,
            title: plan.title,
            status: plan.status,
            createdAt: plan.createdAt,
            stepsCount: plan.steps?.length || 0
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      return [];
    }
  }

  /**
   * Charger un plan existant
   * @param {string} planId - ID du plan
   */
  loadPlan(planId) {
    const plan = this._loadPlan(planId);
    if (plan) {
      this.currentPlan = plan;
      return { success: true, plan };
    }
    return { success: false, error: 'Plan not found' };
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      currentPlanId: this.currentPlan?.id || null,
      plansInHistory: this.planHistory.length
    };
  }

  // ============= MÉTHODES PRIVÉES =============

  /**
   * Trouver une étape par ID
   * @private
   */
  _findStep(stepId) {
    if (!this.currentPlan) return null;
    return this.currentPlan.steps.find(s => s.id === stepId);
  }

  /**
   * Sauvegarder un plan
   * @private
   */
  _savePlan(plan) {
    const filePath = path.join(PLANS_DIR, `${plan.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(plan, null, 2));
  }

  /**
   * Charger un plan
   * @private
   */
  _loadPlan(planId) {
    const filePath = path.join(PLANS_DIR, `${planId}.json`);
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (err) {
      console.warn('[PlanManager] Load plan failed:', err.message);
    }
    return null;
  }

  /**
   * Calculer la durée d'exécution
   * @private
   */
  _calculateDuration() {
    if (!this.currentPlan) return null;

    const firstStart = this.currentPlan.steps
      .filter(s => s.startedAt)
      .map(s => new Date(s.startedAt))
      .sort((a, b) => a - b)[0];

    const lastEnd = this.currentPlan.steps
      .filter(s => s.completedAt)
      .map(s => new Date(s.completedAt))
      .sort((a, b) => b - a)[0];

    if (firstStart && lastEnd) {
      const ms = lastEnd - firstStart;
      return `${Math.round(ms / 60000)} minutes`;
    }

    return null;
  }
}

// ============= MÉTHODES SUPPLÉMENTAIRES POUR API TESTS =============

// Propriété pour accéder au dossier des plans
Object.defineProperty(PlanManager.prototype, 'plansDir', {
  get() { return PLANS_DIR; }
});

/**
 * Créer un plan de manière synchrone (sans LLM)
 * @param {object} options - Options
 * @param {string} options.task - Description de la tâche
 * @param {Array<string>} options.steps - Liste des étapes
 * @returns {object} Plan créé
 */
PlanManager.prototype.createPlanSync = function(options) {
  const { task, steps = [] } = options;

  const plan = {
    ...PLAN_TEMPLATE,
    id: `plan_${Date.now()}`,
    title: task || 'Plan sans titre',
    description: task || '',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: steps.map((step, idx) => ({
      id: idx,
      action: typeof step === 'string' ? step : step.action || 'Step',
      status: STEP_STATUS.PENDING,
      tools: [],
      validation: '',
      critical: false,
      dependencies: [],
      result: null,
      startedAt: null,
      completedAt: null
    }))
  };

  this._savePlan(plan);
  this.currentPlan = plan;
  this.stats.plansCreated++;

  return plan;
};

/**
 * Obtenir le plan courant
 * @returns {object|null} Plan actuel
 */
PlanManager.prototype.getCurrentPlan = function() {
  return this.currentPlan;
};

/**
 * Obtenir une étape par index
 * @param {number} index - Index de l'étape
 * @returns {object|null} Étape
 */
PlanManager.prototype.getStep = function(index) {
  if (!this.currentPlan || index < 0 || index >= this.currentPlan.steps.length) {
    return null;
  }
  return this.currentPlan.steps[index];
};

/**
 * Mettre à jour le statut d'une étape
 * @param {number} index - Index de l'étape
 * @param {string} status - Nouveau statut
 * @param {string} result - Résultat optionnel
 */
PlanManager.prototype.updateStepStatus = function(index, status, result = null) {
  if (!this.currentPlan || index < 0 || index >= this.currentPlan.steps.length) {
    return;
  }

  const step = this.currentPlan.steps[index];
  step.status = status;
  if (result !== null) {
    step.result = result;
  }

  if (status === STEP_STATUS.IN_PROGRESS) {
    step.startedAt = new Date().toISOString();
  }
  if (status === STEP_STATUS.COMPLETED || status === STEP_STATUS.FAILED || status === STEP_STATUS.SKIPPED) {
    step.completedAt = new Date().toISOString();
  }

  this.currentPlan.updatedAt = new Date().toISOString();
  this._savePlan(this.currentPlan);
};

/**
 * Démarrer la prochaine étape disponible
 * @returns {object|null} Étape démarrée
 */
PlanManager.prototype.startNextStep = function() {
  if (!this.currentPlan) return null;

  for (let i = 0; i < this.currentPlan.steps.length; i++) {
    const step = this.currentPlan.steps[i];
    if (step.status === STEP_STATUS.PENDING) {
      this.updateStepStatus(i, STEP_STATUS.IN_PROGRESS);
      return step;
    }
  }

  return null;
};

/**
 * Vérifier si le plan est terminé
 * @returns {boolean}
 */
PlanManager.prototype.isCompleted = function() {
  if (!this.currentPlan) return true;
  if (this.currentPlan.steps.length === 0) return true;

  return this.currentPlan.steps.every(
    s => s.status === STEP_STATUS.COMPLETED || s.status === STEP_STATUS.SKIPPED
  );
};

/**
 * Obtenir le pourcentage de progression
 * @returns {number} Pourcentage 0-100
 */
PlanManager.prototype.getProgress = function() {
  if (!this.currentPlan || this.currentPlan.steps.length === 0) return 0;

  const completed = this.currentPlan.steps.filter(
    s => s.status === STEP_STATUS.COMPLETED || s.status === STEP_STATUS.SKIPPED
  ).length;

  return Math.round((completed / this.currentPlan.steps.length) * 100);
};

/**
 * Obtenir les étapes en attente
 * @returns {Array} Étapes pending
 */
PlanManager.prototype.getPendingSteps = function() {
  if (!this.currentPlan) return [];
  return this.currentPlan.steps.filter(s => s.status === STEP_STATUS.PENDING);
};

/**
 * Obtenir les étapes échouées
 * @returns {Array} Étapes failed
 */
PlanManager.prototype.getFailedSteps = function() {
  if (!this.currentPlan) return [];
  return this.currentPlan.steps.filter(s => s.status === STEP_STATUS.FAILED);
};

/**
 * Effacer le plan courant
 */
PlanManager.prototype.clearPlan = function() {
  this.currentPlan = null;
};

/**
 * Ajouter une étape au plan
 * @param {string} action - Description de l'action
 */
PlanManager.prototype.addStep = function(action) {
  if (!this.currentPlan) return;

  const newStep = {
    id: this.currentPlan.steps.length,
    action,
    status: STEP_STATUS.PENDING,
    tools: [],
    validation: '',
    critical: false,
    dependencies: [],
    result: null,
    startedAt: null,
    completedAt: null
  };

  this.currentPlan.steps.push(newStep);
  this.currentPlan.updatedAt = new Date().toISOString();
  this._savePlan(this.currentPlan);
};

/**
 * Supprimer une étape
 * @param {number} index - Index de l'étape
 */
PlanManager.prototype.removeStep = function(index) {
  if (!this.currentPlan || index < 0 || index >= this.currentPlan.steps.length) return;

  this.currentPlan.steps.splice(index, 1);

  // Réindexer
  this.currentPlan.steps.forEach((step, i) => {
    step.id = i;
  });

  this.currentPlan.updatedAt = new Date().toISOString();
  this._savePlan(this.currentPlan);
};

/**
 * Vérifier si un plan est actif
 * @returns {boolean}
 */
PlanManager.prototype.hasPlan = function() {
  return this.currentPlan !== null;
};

// ============= FACTORY =============

function createPlanManager(options = {}) {
  return new PlanManager(options);
}

// ============= EXPORTS =============

module.exports = {
  PlanManager,
  createPlanManager,
  STEP_STATUS,
  PLAN_TEMPLATE
};
