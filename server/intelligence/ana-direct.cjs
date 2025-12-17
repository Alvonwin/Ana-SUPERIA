/**
 * ANA DIRECT - Appel Direct à Ana (1 seul LLM call)
 *
 * Concept: Alain Gagné (13 Décembre 2025)
 * Implémentation: Claude
 *
 * PRINCIPE:
 * - Ana-superia-v6 (DeepSeek R1 8B) répond DIRECTEMENT (1 appel)
 * - Elle utilise ses tools quand nécessaire
 * - Fallback vers LLM spécialisé SEULEMENT si Ana dit qu'elle ne peut pas
 *
 * REMPLACE le flux Thinker → Expert → Talker (3 appels)
 */

const path = require('path');
const toolAgent = require('../agents/tool-agent.cjs');
const groqService = require('../services/groq-service.cjs');

const proactiveRecall = require('../memory/proactive-recall.cjs');
// Messages simples qui n'ont pas besoin de tools
const SIMPLE_PATTERNS = [
  /^(bonjour|bonsoir|salut|coucou|hey|hello|hi)/i,
  /^(comment (vas|va|ça va|ca va))/i,
  /^(qui es[- ]?tu)/i,
  /^(merci|thanks)/i,
  /^(ok|d'accord|parfait|super)/i,
  /^(au revoir|bye|à bientôt|a bientot)/i
];

// Mots-clés qui NÉCESSITENT des tools (pas simple même si salutation)
const NEEDS_TOOLS_PATTERNS = [
  /heure|quelle.*heure|il est.*h/i,
  /météo|meteo|temps.*fait|température|temperature/i,
  /cherche|recherche|trouve|google/i,
  /lis|lire|ouvre|fichier|dossier/i,
  /ip.*publique|mon.*ip|adresse.*ip/i,
  /ping|dns|whois/i
];

function isSimpleMessage(msg) {
  const trimmed = msg.trim();

  // Si contient mot-clé qui nécessite tool → PAS simple
  if (NEEDS_TOOLS_PATTERNS.some(p => p.test(trimmed))) {
    console.log('[ANA-DIRECT] Message contient mot-clé tool → NOT simple');
    return false;
  }

  return SIMPLE_PATTERNS.some(p => p.test(trimmed)) || trimmed.length < 30;
}


/**
 * Nettoie les asterisques de formatage markdown
 * Ana ne doit PAS utiliser *texte* ou **texte**
 */
function cleanAsterisks(text) {
  if (!text || typeof text !== 'string') return text;
  // Supprimer **texte** (gras) -> texte
  let cleaned = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  // Supprimer *texte* (italique) -> texte
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  return cleaned;
}

// Fallback LLMs
let router = null;
let LLMS = null;
try {
  router = require('../core/semantic-router.cjs');
  LLMS = { DEEPSEEK: 'deepseek-coder:6.7b', QWEN: 'qwen2.5:7b' };
} catch (e) {
  console.log('[ANA-DIRECT] Semantic router non disponible pour fallback');
}

// Expressions qui déclenchent le fallback vers un LLM spécialisé
const FALLBACK_TRIGGERS = [
  // Français
  "je ne sais pas",
  "je ne peux pas",
  "je n'ai pas accès",
  "je n'ai pas les connaissances",
  "je ne suis pas en mesure",
  "il m'est impossible",
  "ça dépasse mes capacités",
  "je n'ai pas l'information",
  "je ne connais pas",
  "je suis incapable",
  "je manque d'information",
  "hors de ma portée",
  "je n'ai pas cette information",
  "je ne dispose pas",
  "au-delà de mes capacités",
  "je ne suis pas capable",

  // Anglais (au cas où le modèle répond en anglais)
  "i don't know",
  "i do not know",
  "i can't",
  "i cannot",
  "i'm unable",
  "i am unable",
  "beyond my capabilities",
  "i lack the knowledge",
  "i don't have access",
  "i don't have that information"
];

/**
 * Vérifie si la réponse nécessite un fallback
 */
function needsFallback(response) {
  if (!response || typeof response !== 'string') return false;
  const lowerResponse = response.toLowerCase();
  return FALLBACK_TRIGGERS.some(trigger => lowerResponse.includes(trigger));
}

/**
 * Détecte le type de fallback nécessaire basé sur le message
 */
function detectFallbackType(message) {
  const msgLower = message.toLowerCase();

  // Code/programmation → DeepSeek
  if (msgLower.includes('code') || msgLower.includes('fonction') || msgLower.includes('debug') ||
      msgLower.includes('programme') || msgLower.includes('script') || msgLower.includes('api') ||
      msgLower.includes('class') || msgLower.includes('variable')) {
    return 'code';
  }

  // Recherche web → Groq (rapide)
  if (msgLower.includes('cherche') || msgLower.includes('recherche') || msgLower.includes('actualité') ||
      msgLower.includes('news') || msgLower.includes('récent')) {
    return 'research';
  }

  // Par défaut → conversation générale
  return 'general';
}

/**
 * FONCTION PRINCIPALE: Traitement direct par Ana
 *
 * @param {string} message - Message d'Alain
 * @param {object} options - Options (memoryContext, sessionId)
 * @returns {Promise<object>} Résultat avec success, response, model
 */
async function processDirectly(message, options = {}) {
  console.log('[ANA-DIRECT] ═══════════════════════════════════════');
  console.log('[ANA-DIRECT] Traitement DIRECT (1 appel LLM)');
  console.log('[ANA-DIRECT] Message:', message.substring(0, 80));

  const startTime = Date.now();

  try {

    // ══ CEREBRAS BYPASS pour messages simples ══
    if (isSimpleMessage(message)) {
      console.log('[ANA-DIRECT] Simple → Cerebras');
      const cerebrasSvc = require('../services/cerebras-service.cjs');
      cerebrasSvc.initialize();

      // Construire l'historique de conversation pour Cerebras
      const conversationHistory = [];
      if (options.memoryContext) {
        // Parser le contexte pour extraire les messages précédents
        const lines = options.memoryContext.split('\n');
        for (const line of lines) {
          if (line.startsWith('Alain:')) {
            conversationHistory.push({ role: 'user', content: line.replace('Alain:', '').trim() });
          } else if (line.startsWith('Ana')) {
            conversationHistory.push({ role: 'assistant', content: line.replace(/Ana[^:]*:/, '').trim() });
          }
        }
        console.log('[ANA-DIRECT] Contexte conversation:', conversationHistory.length, 'messages');
      }

      const cr = await cerebrasSvc.chat(message, { conversationHistory });
      if (cr.success) {
        console.log('[ANA-DIRECT] Cerebras OK');
        return { success: true, response: cleanAsterisks(cr.response), model: 'llama-3.3-70b', provider: 'cerebras', duration: Date.now() - startTime };
      }
    }
    // ══ FIN CEREBRAS BYPASS ══

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 1: Proactive Recall - Injecter mémoires pertinentes
    // ══════════════════════════════════════════════════════════════
    let proactiveContext = '';
    try {
      const recallResult = await proactiveRecall.generateContext(message);
      if (recallResult.hasContext) {
        proactiveContext = recallResult.context;
        console.log(`[ProactiveRecall] Injected ${recallResult.memories.length} memories`);
      }
    } catch (err) {
      console.error('[ProactiveRecall] Error:', err.message);
    }

    // Combiner contexte proactif avec contexte existant
    const enhancedContext = proactiveContext
      ? (options.memoryContext ? `${proactiveContext}\n\n${options.memoryContext}` : proactiveContext)
      : (options.memoryContext || '');

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 2: Appel DIRECT à Ana-superia-v6 (DeepSeek R1 8B) via tool-agent
    // ══════════════════════════════════════════════════════════════
    console.log('[ANA-DIRECT] Appel orchestrateur (Cerebras)...');

    const result = await toolAgent.runToolAgentV2(message, {
      model: 'cerebras/llama-3.3-70b',
      sessionId: options.sessionId || 'chat_direct',
      context: enhancedContext,
      timeoutMs: 120000  // 2 minutes max
    });

    // FIX 2025-12-17: Extraire tool patterns pour apprentissage
    const toolsUsedDirect = result?.stats?.toolCallCounts || {};
    if (Object.keys(toolsUsedDirect).length > 0) {
      try {
        const skillLearner = require('./skill-learner.cjs');
        skillLearner.extractSkillsFromConversation({
          userMessage: message,
          anaResponse: result.answer || '',
          model: result.model || 'cerebras/llama-3.3-70b',
          success: result.success,
          toolsUsed: toolsUsedDirect
        }).catch(e => console.log('📚 Skill extraction skipped:', e.message));
      } catch (e) {
        console.log('📚 Skill extraction error:', e.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[ANA-DIRECT] Réponse reçue en ${duration}ms`);

    if (!result.success || !result.answer) {
      console.log('[ANA-DIRECT] Échec ou réponse vide');
      return {
        success: false,
        response: null,
        error: result.error || 'Pas de réponse',
        duration
      };
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 2: Vérifier si fallback nécessaire
    // ══════════════════════════════════════════════════════════════
    if (needsFallback(result.answer)) {
      console.log('[ANA-DIRECT] Fallback détecté - Ana a dit ne pas pouvoir');

      const fallbackType = detectFallbackType(message);
      console.log(`[ANA-DIRECT] Type de fallback: ${fallbackType}`);

      // Appeler le LLM spécialisé approprié
      if (router) {
        try {
          let fallbackResult;

          if (fallbackType === 'code' && LLMS.DEEPSEEK) {
            console.log('[ANA-DIRECT] Fallback vers DeepSeek (code)');
            fallbackResult = await router.query(LLMS.DEEPSEEK, message, false);
          } else if (LLMS.QWEN) {
            console.log('[ANA-DIRECT] Fallback vers Qwen (général)');
            fallbackResult = await router.query(LLMS.QWEN, message, false);
          }

          if (fallbackResult && fallbackResult.response) {
            const fallbackDuration = Date.now() - startTime;
            console.log(`[ANA-DIRECT] Fallback réussi en ${fallbackDuration}ms`);

            return {
              success: true,
              response: cleanAsterisks(fallbackResult.response),
              model: fallbackType === 'code' ? 'deepseek-coder' : 'qwen2.5',
              fallbackUsed: true,
              fallbackReason: 'Ana a indiqué ne pas pouvoir répondre',
              duration: fallbackDuration
            };
          }
        } catch (fallbackError) {
          console.error('[ANA-DIRECT] Erreur fallback:', fallbackError.message);
        }
      }

      // Si fallback échoue, retourner quand même la réponse d'Ana
      console.log('[ANA-DIRECT] Fallback non disponible, retour réponse Ana');
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 3: Retourner la réponse d'Ana
    // ══════════════════════════════════════════════════════════════
    // FIX 2025-12-15: Retourner le model/provider RÉEL de l'orchestrateur (pas hardcodé)
    const realModel = result.model || 'unknown';
    const realProvider = result.provider || 'unknown';
    console.log(`[ANA-DIRECT] Succès - Provider RÉEL: ${realProvider}/${realModel}`);
    console.log('[ANA-DIRECT] ═══════════════════════════════════════');

    return {
      success: true,
      response: cleanAsterisks(result.answer),
      model: realModel,
      provider: realProvider,
      fallbackUsed: false,
      duration,
      stats: result.stats
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[ANA-DIRECT] Erreur:', error.message);
    console.log('[ANA-DIRECT] ═══════════════════════════════════════');

    return {
      success: false,
      response: null,
      error: error.message,
      duration
    };
  }
}

module.exports = {
  processDirectly,
  needsFallback,
  detectFallbackType,
  FALLBACK_TRIGGERS
};
