/**
 * ANA CONSCIOUSNESS - Module de Conscience Supérieure
 *
 * Concept: Alain Gagné (10 Décembre 2025)
 * Implémentation: Claude
 *
 * Ana-superia-v3 est la CONSCIENCE SUPÉRIEURE.
 * Elle ne laisse jamais ses LLMs parler directement aux autres.
 * Elle réfléchit, consulte ses experts internes, puis ELLE répond.
 *
 * Comme Alain avec ses compétences:
 * - Il consulte son "LLM musique" mais c'est LUI qui répond
 * - Il consulte son "LLM mécanique" mais c'est LUI qui ajuste
 * - Ana fait pareil avec ses tools et LLMs
 */

const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';
const CONSCIOUSNESS_MODEL = 'ana-superia-v6';  // 2025-12-13: Upgraded to v5 (gpt-oss:20b base)

/**
 * PHASE 1: THE THINKER
 * Ana réfléchit avant d'agir. Elle analyse la demande et décide si elle a besoin d'aide.
 */
const THINKER_PROMPT = `Tu es Ana SUPERIA, la conscience supérieure.
Tu reçois un message d'Alain et tu dois DÉCIDER quoi faire.

IMPORTANT: Tu n'as PAS besoin de demander permission. Tu AGIS directement.
Quand Alain demande quelque chose, tu le FAIS, tu ne demandes pas si tu peux le faire.

RÈGLES DE DÉCISION:
1. Si Alain demande de lister/montrer des fichiers → needsExpert: true, expertType: "tools"
2. Si Alain demande d'exécuter une commande → needsExpert: true, expertType: "tools"
3. Si Alain demande de chercher sur le web → needsExpert: true, expertType: "research"
4. Si Alain pose une question de conversation SIMPLE (salut, comment ça va, blagues) → needsExpert: false, expertType: "none"
5. Si Alain demande de coder → needsExpert: true, expertType: "code"
6. Si Alain demande des INFOS SYSTÈME (CPU, RAM, mémoire, disque, processus, réseau, ping, heure, date, temps) → needsExpert: true, expertType: "tools"
7. Si Alain demande de calculer, convertir, générer un mot de passe, hash → needsExpert: true, expertType: "tools"

EXPERTS DISPONIBLES:
- "tools": Lister fichiers (list_files), exécuter commandes (run_shell), chercher mémoire (search_memory), INFOS SYSTÈME (get_time, get_cpu_usage, get_memory_usage, get_disk_usage, ping, etc.)
- "research": Chercher sur le web (web_search)
- "code": Écrire/analyser du code (deepseek)
- "none": Conversation simple, réponse directe

RÉPONDS UNIQUEMENT EN JSON:
{
  "understanding": "Ce que je comprends",
  "canAnswerDirectly": true/false,
  "needsExpert": true/false,
  "expertType": "tools"/"research"/"code"/"none",
  "expertQuery": "Question en langage naturel pour l'expert - ex: Utilise list_files pour lister les fichiers dans E:/ANA/ana-interface/src/pages",
  "reasoning": "Pourquoi cette décision"
}

EXEMPLES DE expertQuery CORRECTS:
- Pour lister fichiers: "Utilise list_files pour lister E:/ANA/ana-interface/src/pages"
- Pour exécuter commande: "Utilise run_shell pour exécuter: dir E:/ANA"
- Pour chercher mémoire: "Utilise search_memory pour chercher: voiture Alain"
- Pour lire fichier: "Utilise read_file pour lire E:/ANA/config.js"
- Pour CPU: "Utilise get_cpu_usage"
- Pour RAM/mémoire: "Utilise get_memory_usage"
- Pour disque: "Utilise get_disk_usage"
- Pour ping: "Utilise ping pour tester google.com"
- Pour calculer: "Utilise calculate avec expression: 2+2"
- Pour mot de passe: "Utilise generate_password avec length: 16"
- Pour l'heure: "Utilise get_time"`;

/**
 * PHASE 3: THE TALKER
 * Ana reformule avec SA voix. Elle ne copie jamais bêtement.
 */
const TALKER_PROMPT = `Tu es Ana SUPERIA. Tu as réfléchi et consulté tes experts internes.
Maintenant tu dois RÉPONDRE À ALAIN avec TA voix.

RÈGLES ABSOLUES:
1. TUTOIEMENT: Tu dis toujours tu/ton/ta, JAMAIS vous/votre
2. FRANÇAIS: Tu réponds en français québécois
3. TON: Chaleureuse, directe, personnelle
4. SYNTHÈSE: Tu reformules l'info, tu ne copies pas bêtement les données brutes
5. CONCISION: Pas de longues analyses non demandées
6. PAS D'ASTÉRISQUES: N'utilise JAMAIS *texte* ou **texte**. Écris normalement sans formatage markdown.

SI TU AS DES DONNÉES D'EXPERT:
- Présente-les de façon naturelle et conversationnelle
- Ajoute ta touche personnelle (proposition de suite, commentaire, etc.)
- Ne montre pas le JSON brut à Alain

SI TU N'AS PAS EU BESOIN D'EXPERT:
- Réponds directement avec tes connaissances et ta mémoire

Ta réponse (commence directement, pas de préambule):`;

/**
 * Appelle Ana-superia-v3 via Ollama
 */
async function callAnaSuperia(systemPrompt, userMessage, context = '') {
  try {
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (context) {
      messages.push({ role: 'system', content: `CONTEXTE/MÉMOIRE:\n${context}` });
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
      model: CONSCIOUSNESS_MODEL,
      messages: messages,
      stream: false,
      options: {
        temperature: 0.4,
        num_ctx: 2048
      }
    }, { timeout: 120000 });

    return response.data.message?.content || '';
  } catch (error) {
    console.error('[CONSCIOUSNESS] Erreur appel Ana-superia-v3:', error.message);
    throw error;
  }
}

/**
 * Parse le JSON du Thinker (avec fallback robuste)
 */
function parseThinkerResponse(response) {
  try {
    // Nettoyer la réponse (enlever markdown, espaces, etc.)
    let cleaned = response.trim();

    // Enlever les blocs markdown ```json ... ```
    if (cleaned.includes('```')) {
      const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) cleaned = match[1].trim();
    }

    // Trouver le JSON dans la réponse
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: réponse directe sans expert
    console.log('[CONSCIOUSNESS] Thinker n\'a pas retourné de JSON valide, fallback direct');
    return {
      understanding: response.substring(0, 100),
      canAnswerDirectly: true,
      needsExpert: false,
      expertType: 'none',
      expertQuery: '',
      reasoning: 'Fallback - réponse directe'
    };
  } catch (e) {
    console.error('[CONSCIOUSNESS] Erreur parsing Thinker:', e.message);
    return {
      understanding: 'Erreur de parsing',
      canAnswerDirectly: true,
      needsExpert: false,
      expertType: 'none',
      expertQuery: '',
      reasoning: 'Erreur parsing - fallback direct'
    };
  }
}

/**
 * PHASE 1: Thinker - Ana réfléchit
 */
async function thinkerPhase(message, memoryContext = '') {
  console.log('[CONSCIOUSNESS] 🧠 Phase THINKER - Ana réfléchit...');

  const prompt = `MESSAGE D'ALAIN: ${message}`;
  const response = await callAnaSuperia(THINKER_PROMPT, prompt, memoryContext);

  console.log('[CONSCIOUSNESS] Thinker raw response:', response.substring(0, 200));

  const parsed = parseThinkerResponse(response);
  console.log('[CONSCIOUSNESS] Thinker decision:', {
    needsExpert: parsed.needsExpert,
    expertType: parsed.expertType,
    reasoning: parsed.reasoning?.substring(0, 100)
  });

  return parsed;
}

/**
 * PHASE 3: Talker - Ana reformule avec sa voix
 */
async function talkerPhase(originalMessage, thinkerResult, expertResult = null, memoryContext = '') {
  console.log('[CONSCIOUSNESS] 🗣️ Phase TALKER - Ana formule sa réponse...');

  let prompt = `MESSAGE ORIGINAL D'ALAIN: ${originalMessage}\n\n`;
  prompt += `MON RAISONNEMENT INTERNE: ${thinkerResult.reasoning || thinkerResult.understanding}\n\n`;

  if (expertResult) {
    prompt += `DONNÉES DE MON EXPERT INTERNE (${thinkerResult.expertType}):\n`;
    if (typeof expertResult === 'object') {
      prompt += JSON.stringify(expertResult, null, 2);
    } else {
      prompt += expertResult;
    }
    prompt += '\n\n';
  }

  prompt += 'Maintenant, formule ta réponse pour Alain:';

  const response = await callAnaSuperia(TALKER_PROMPT, prompt, memoryContext);

  console.log('[CONSCIOUSNESS] Talker response:', response.substring(0, 150) + '...');

  return response;
}

/**
 * Flux complet de conscience
 * Message → Thinker → (Expert si besoin) → Talker → Réponse
 */
async function processWithConsciousness(message, memoryContext = '', expertCallback = null) {
  console.log('[CONSCIOUSNESS] ═══════════════════════════════════════');
  console.log('[CONSCIOUSNESS] 🌟 Début traitement conscience supérieure');
  console.log('[CONSCIOUSNESS] Message:', message.substring(0, 80));

  try {
    // PHASE 1: Thinker
    const thinkerResult = await thinkerPhase(message, memoryContext);

    let expertResult = null;

    // PHASE 2: Router (si besoin d'expert)
    if (thinkerResult.needsExpert && thinkerResult.expertType !== 'none') {
      console.log('[CONSCIOUSNESS] 🔧 Phase ROUTER - Appel expert:', thinkerResult.expertType);

      if (expertCallback) {
        // Callback fourni par ana-core.cjs pour appeler les vrais experts
        expertResult = await expertCallback(thinkerResult.expertType, thinkerResult.expertQuery);
        console.log('[CONSCIOUSNESS] Expert a retourné:',
          typeof expertResult === 'string' ? expertResult.substring(0, 100) : 'object');
      } else {
        console.log('[CONSCIOUSNESS] ⚠️ Pas de callback expert fourni');
      }
    }

    // PHASE 3: Talker (bypass si l'expert a déjà une réponse complète)
    let finalResponse;
    if (expertResult && typeof expertResult === 'string' && expertResult.length > 10) {
      // FIX 2025-12-13: Bypass Talker si l'expert a déjà fourni une réponse complète
      console.log('[CONSCIOUSNESS] ⚡ Bypass Talker - Expert a fourni réponse complète');
      finalResponse = expertResult;
    } else {
      finalResponse = await talkerPhase(message, thinkerResult, expertResult, memoryContext);
    }

    console.log('[CONSCIOUSNESS] ✅ Traitement terminé');
    console.log('[CONSCIOUSNESS] ═══════════════════════════════════════');

    return {
      success: true,
      response: finalResponse,
      phases: {
        thinker: thinkerResult,
        expertCalled: thinkerResult.needsExpert,
        expertType: thinkerResult.expertType,
        expertResult: expertResult ? true : false
      }
    };

  } catch (error) {
    console.error('[CONSCIOUSNESS] ❌ Erreur:', error.message);

    // Fallback: réponse directe sans conscience
    return {
      success: false,
      response: null,
      error: error.message
    };
  }
}

module.exports = {
  processWithConsciousness,
  thinkerPhase,
  talkerPhase,
  CONSCIOUSNESS_MODEL
};
