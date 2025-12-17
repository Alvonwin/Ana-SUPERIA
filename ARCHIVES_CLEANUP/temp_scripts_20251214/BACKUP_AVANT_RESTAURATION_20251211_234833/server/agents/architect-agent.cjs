/**
 * Architect Agent - Phase 3.3 ANA CODE
 *
 * Agent superviseur qui planifie avant d'exécuter.
 * Pattern: Architecte → Analyse → Plan → Validation → Execution
 *
 * Créé: 9 Décembre 2025
 */

const axios = require('axios');
const { callWithFallback } = require('../core/llm-orchestrator.cjs');

const OLLAMA_URL = 'http://localhost:11434';
const ARCHITECT_MODEL = 'qwen2.5-coder:7b'; // Modèle pour analyse architecturale

/**
 * System prompt pour l'architecte
 */
const ARCHITECT_SYSTEM_PROMPT = `Tu es un Architecte Logiciel Senior.

TON RÔLE:
- Analyser les demandes de développement
- Créer des plans d'implémentation détaillés
- Identifier les risques et dépendances
- Valider les modifications avant exécution
- Assurer la qualité et la cohérence du code

MÉTHODOLOGIE:
1. COMPRENDRE - Analyser la demande en profondeur
2. EXPLORER - Identifier les fichiers et modules concernés
3. PLANIFIER - Créer un plan étape par étape
4. VALIDER - Vérifier la cohérence du plan
5. SUPERVISER - Guider l'exécution

FORMAT DE RÉPONSE:
{
  "analysis": "Compréhension de la demande",
  "scope": ["fichier1.js", "fichier2.js"],
  "risks": ["risque1", "risque2"],
  "plan": [
    {"step": 1, "action": "Description", "file": "path/to/file"},
    {"step": 2, "action": "Description", "file": "path/to/file"}
  ],
  "validation_criteria": ["critère1", "critère2"],
  "estimated_complexity": "low|medium|high",
  "recommendation": "PROCEED|REVIEW|REJECT"
}

LANGUE: Français québécois.`;

/**
 * Analyser une demande et créer un plan d'architecture
 * @param {string} request - La demande de développement
 * @param {Object} context - Contexte optionnel (fichiers existants, etc.)
 */
async function analyzeRequest(request, context = {}) {
  console.log(`🏗️ [Architect] Analyzing request: "${request.substring(0, 100)}..."`);

  const prompt = `DEMANDE: ${request}

${context.files ? `FICHIERS EXISTANTS:\n${context.files.join('\n')}` : ''}
${context.codebase ? `STRUCTURE PROJET:\n${context.codebase}` : ''}

Analyse cette demande et crée un plan d'implémentation détaillé.
Retourne UNIQUEMENT un JSON valide suivant le format spécifié.`;

  try {
    // callWithFallback expects array of messages, not a string
    const messages = [
      { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ];
    const result = await callWithFallback(messages, null, {
      temperature: 0.3, // Precision pour architecture
      maxTokens: 2000
    });

    // Tenter de parser le JSON
    let plan;
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      } else {
        plan = { raw: result.response, parsed: false };
      }
    } catch (parseError) {
      plan = { raw: result.response, parsed: false, error: parseError.message };
    }

    return {
      success: true,
      request: request,
      plan: plan,
      model: result.model || ARCHITECT_MODEL
    };
  } catch (error) {
    console.error(`❌ [Architect] Error:`, error.message);
    return {
      success: false,
      error: error.message,
      request: request
    };
  }
}

/**
 * Valider un plan avant exécution
 * @param {Object} plan - Plan à valider
 */
async function validatePlan(plan) {
  console.log(`✅ [Architect] Validating plan...`);

  const checks = {
    hasSteps: plan.plan && plan.plan.length > 0,
    hasScope: plan.scope && plan.scope.length > 0,
    hasRecommendation: !!plan.recommendation,
    risksIdentified: plan.risks && plan.risks.length > 0,
    validComplexity: ['low', 'medium', 'high'].includes(plan.estimated_complexity)
  };

  const allPassed = Object.values(checks).every(v => v);

  return {
    valid: allPassed,
    checks: checks,
    recommendation: plan.recommendation || 'REVIEW',
    message: allPassed
      ? 'Plan validé, prêt pour exécution.'
      : 'Plan incomplet, révision nécessaire.'
  };
}

/**
 * Créer un plan de refactoring
 * @param {string} filePath - Fichier à refactorer
 * @param {string} goal - Objectif du refactoring
 */
async function planRefactoring(filePath, goal) {
  const request = `REFACTORING: ${filePath}
OBJECTIF: ${goal}

Crée un plan de refactoring détaillé qui:
1. Préserve le comportement existant
2. Améliore la qualité du code
3. Minimise les risques de régression`;

  return analyzeRequest(request, { files: [filePath] });
}

/**
 * Créer un plan pour nouvelle fonctionnalité
 * @param {string} feature - Description de la fonctionnalité
 * @param {Object} context - Contexte du projet
 */
async function planNewFeature(feature, context = {}) {
  const request = `NOUVELLE FONCTIONNALITÉ: ${feature}

Crée un plan d'implémentation qui:
1. S'intègre proprement à l'architecture existante
2. Suit les patterns du projet
3. Inclut les tests nécessaires
4. Documente les changements`;

  return analyzeRequest(request, context);
}

/**
 * Réviser du code et suggérer des améliorations
 * @param {string} code - Code à réviser
 * @param {string} context - Contexte
 */
async function reviewCode(code, context = '') {
  console.log(`📝 [Architect] Code review...`);

  const prompt = `RÉVISION DE CODE:

\`\`\`
${code}
\`\`\`

${context ? `CONTEXTE: ${context}` : ''}

Analyse ce code et fournis:
1. Problèmes identifiés (bugs, sécurité, performance)
2. Suggestions d'amélioration
3. Conformité aux bonnes pratiques
4. Score de qualité (1-10)

Format JSON:
{
  "issues": [{"severity": "high|medium|low", "description": "...", "line": N}],
  "suggestions": ["suggestion1", "suggestion2"],
  "quality_score": N,
  "summary": "..."
}`;

  try {
    // callWithFallback expects array of messages
    const messages = [
      { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ];
    const result = await callWithFallback(messages, null, {
      temperature: 0.3
    });

    let review;
    try {
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        review = JSON.parse(jsonMatch[0]);
      } else {
        review = { raw: result.response, parsed: false };
      }
    } catch (e) {
      review = { raw: result.response, parsed: false };
    }

    return {
      success: true,
      review: review,
      model: result.model
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Superviser l'exécution d'un plan
 * @param {Object} plan - Plan à exécuter
 * @param {Function} executor - Fonction d'exécution pour chaque étape
 */
async function supervisePlan(plan, executor) {
  console.log(`🎯 [Architect] Supervising plan execution...`);

  const results = [];
  let allSuccess = true;

  for (const step of plan.plan || []) {
    console.log(`  → Step ${step.step}: ${step.action}`);

    try {
      const result = await executor(step);
      results.push({
        step: step.step,
        success: result.success !== false,
        result: result
      });

      if (result.success === false) {
        allSuccess = false;
        console.log(`  ❌ Step ${step.step} failed`);
        // Optionnel: arrêter sur erreur
        // break;
      } else {
        console.log(`  ✅ Step ${step.step} completed`);
      }
    } catch (error) {
      results.push({
        step: step.step,
        success: false,
        error: error.message
      });
      allSuccess = false;
    }
  }

  return {
    success: allSuccess,
    stepsExecuted: results.length,
    totalSteps: (plan.plan || []).length,
    results: results
  };
}

module.exports = {
  analyzeRequest,
  validatePlan,
  planRefactoring,
  planNewFeature,
  reviewCode,
  supervisePlan,
  ARCHITECT_SYSTEM_PROMPT
};
