/**
 * Repetition Detector - Détecte et bloque les réponses répétitives
 *
 * Basé sur les meilleures pratiques:
 * - arXiv: Context Repetition Leading to Probability Enhancement
 * - Post-processing filter pour détecter les répétitions
 * - Similarité de Jaccard pour comparer les réponses
 *
 * @author Claude Code - 2025-12-07
 */

'use strict';

/**
 * Calcule la similarité de Jaccard entre deux textes
 * @param {string} text1
 * @param {string} text2
 * @returns {number} Score entre 0 et 1 (1 = identique)
 */
function jaccardSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  // Normalisation: lowercase, suppression ponctuation, split en mots
  const normalize = (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2); // Ignore mots courts
  };

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  if (words1.size === 0 || words2.size === 0) return 0;

  // Intersection
  const intersection = new Set([...words1].filter(w => words2.has(w)));

  // Union
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Calcule la similarité par n-grams (plus précise pour phrases)
 * @param {string} text1
 * @param {string} text2
 * @param {number} n Taille des n-grams (défaut: 3)
 * @returns {number} Score entre 0 et 1
 */
function ngramSimilarity(text1, text2, n = 3) {
  if (!text1 || !text2) return 0;

  const getNgrams = (text) => {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
    const ngrams = new Set();
    for (let i = 0; i <= normalized.length - n; i++) {
      ngrams.add(normalized.substring(i, i + n));
    }
    return ngrams;
  };

  const ngrams1 = getNgrams(text1);
  const ngrams2 = getNgrams(text2);

  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

  const intersection = new Set([...ngrams1].filter(ng => ngrams2.has(ng)));
  const union = new Set([...ngrams1, ...ngrams2]);

  return intersection.size / union.size;
}

/**
 * Extrait le contenu "significatif" d'une réponse (ignore le formatage)
 * @param {string} response
 * @returns {string}
 */
function extractSignificantContent(response) {
  if (!response) return '';

  return response
    // Supprime les liens markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Supprime les blocs de code
    .replace(/```[\s\S]*?```/g, '')
    // Supprime le formatage markdown
    .replace(/[*_#`]/g, '')
    // Supprime les URLs
    .replace(/https?:\/\/[^\s]+/g, '')
    // Normalise les espaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Patterns de questions factuelles (répétition autorisée)
 * Ces questions ont une réponse CONSTANTE - normal de répéter
 */
const FACTUAL_QUESTION_PATTERNS = [
  /signe\s*(astro|zodiac)/i,
  /quel\s*est\s*mon/i,
  /ma\s*(voiture|auto|ville|adresse|date|anniversaire)/i,
  /mon\s*(nom|prénom|âge)/i,
  /je\s*m'appelle/i,
  /c'est\s*quoi\s*mon/i,
  /rappelle.*moi/i,
  /tu\s*te\s*souviens/i,
];

/**
 * Patterns de questions créatives (répétition INTERDITE)
 * Ces questions demandent du contenu NOUVEAU à chaque fois
 */
const CREATIVE_QUESTION_PATTERNS = [
  /blague/i,
  /joke/i,
  /citation/i,
  /quote/i,
  /fait\s*(intéressant|amusant|random)/i,
  /raconte.*histoire/i,
  /autre\s*(blague|citation|exemple)/i,
  /nouvelle?\s*(blague|citation)/i,
  /différent/i,
];

/**
 * Classe principale de détection de répétitions
 */
class RepetitionDetector {
  constructor(options = {}) {
    // Configuration
    this.historySize = options.historySize || 20; // Nombre de réponses à conserver
    this.similarityThreshold = options.similarityThreshold || 0.7; // Seuil de similarité
    this.exactMatchThreshold = options.exactMatchThreshold || 0.95; // Seuil pour match exact
    this.enableLogging = options.enableLogging !== false;

    // Historique des réponses par session
    this.responseHistory = new Map(); // sessionId -> [responses]

    // Patterns bloqués (blacklist)
    this.blockedPatterns = new Set();

    // Historique des questions (pour détecter le type)
    this.lastQuestion = new Map(); // sessionId -> lastQuestion

    // Statistiques
    this.stats = {
      totalChecks: 0,
      repetitionsDetected: 0,
      exactMatches: 0,
      highSimilarity: 0,
      factualSkipped: 0
    };
  }

  /**
   * Enregistre la question de l'utilisateur (pour analyse du type)
   * @param {string} question
   * @param {string} sessionId
   */
  setQuestion(question, sessionId = 'default') {
    this.lastQuestion.set(sessionId, question);
  }

  /**
   * Détermine si une question est factuelle (répétition OK)
   * @param {string} question
   * @returns {boolean}
   */
  isFactualQuestion(question) {
    if (!question) return false;
    return FACTUAL_QUESTION_PATTERNS.some(pattern => pattern.test(question));
  }

  /**
   * Détermine si une question demande du contenu créatif (répétition INTERDITE)
   * @param {string} question
   * @returns {boolean}
   */
  isCreativeQuestion(question) {
    if (!question) return false;
    return CREATIVE_QUESTION_PATTERNS.some(pattern => pattern.test(question));
  }

  /**
   * Ajoute un pattern à la blacklist
   * @param {string} pattern
   */
  addBlockedPattern(pattern) {
    const normalized = extractSignificantContent(pattern).toLowerCase();
    if (normalized.length > 10) { // Ignore patterns trop courts
      this.blockedPatterns.add(normalized);
      this.log(`[RepetitionDetector] Pattern bloqué ajouté: "${normalized.substring(0, 50)}..."`);
    }
  }

  /**
   * Vérifie si une réponse est répétitive
   * @param {string} response La réponse à vérifier
   * @param {string} sessionId Identifiant de session (optionnel)
   * @returns {{isRepetitive: boolean, reason: string, similarity: number, matchedWith: string|null}}
   */
  check(response, sessionId = 'default') {
    this.stats.totalChecks++;

    const content = extractSignificantContent(response);
    if (!content || content.length < 20) {
      return { isRepetitive: false, reason: 'too_short', similarity: 0, matchedWith: null };
    }

    const contentLower = content.toLowerCase();

    // 1. Vérifier les patterns bloqués EN PREMIER (TOUJOURS, peu importe le type de question)
    for (const blocked of this.blockedPatterns) {
      if (contentLower.includes(blocked) || blocked.includes(contentLower)) {
        this.stats.repetitionsDetected++;
        this.log(`[RepetitionDetector] Pattern bloqué détecté!`);
        return {
          isRepetitive: true,
          reason: 'blocked_pattern',
          similarity: 1.0,
          matchedWith: blocked.substring(0, 50)
        };
      }
    }

    // 2. Skip si question factuelle (mais APRÈS les patterns bloqués)
    const lastQuestion = this.lastQuestion.get(sessionId);
    if (lastQuestion && this.isFactualQuestion(lastQuestion)) {
      this.stats.factualSkipped++;
      this.log(`[RepetitionDetector] Question factuelle - répétition autorisée: "${lastQuestion.substring(0, 40)}..."`);
      return { isRepetitive: false, reason: 'factual_question', similarity: 0, matchedWith: null };
    }

    // 3. Vérifier l'historique de session (seulement pour questions créatives)
    const history = this.responseHistory.get(sessionId) || [];

    for (const previousResponse of history) {
      // Calcul de similarité combinée (Jaccard + n-gram)
      const jaccardScore = jaccardSimilarity(content, previousResponse.content);
      const ngramScore = ngramSimilarity(content, previousResponse.content);

      // Score combiné (moyenne pondérée)
      const similarity = (jaccardScore * 0.4) + (ngramScore * 0.6);

      // Match exact ou quasi-exact
      if (similarity >= this.exactMatchThreshold) {
        this.stats.repetitionsDetected++;
        this.stats.exactMatches++;
        this.log(`[RepetitionDetector] Match exact détecté! Similarité: ${(similarity * 100).toFixed(1)}%`);
        return {
          isRepetitive: true,
          reason: 'exact_match',
          similarity,
          matchedWith: previousResponse.content.substring(0, 100)
        };
      }

      // Haute similarité
      if (similarity >= this.similarityThreshold) {
        this.stats.repetitionsDetected++;
        this.stats.highSimilarity++;
        this.log(`[RepetitionDetector] Haute similarité détectée! Similarité: ${(similarity * 100).toFixed(1)}%`);
        return {
          isRepetitive: true,
          reason: 'high_similarity',
          similarity,
          matchedWith: previousResponse.content.substring(0, 100)
        };
      }
    }

    return { isRepetitive: false, reason: 'unique', similarity: 0, matchedWith: null };
  }

  /**
   * Enregistre une réponse dans l'historique
   * @param {string} response
   * @param {string} sessionId
   */
  record(response, sessionId = 'default') {
    const content = extractSignificantContent(response);
    if (!content || content.length < 20) return;

    if (!this.responseHistory.has(sessionId)) {
      this.responseHistory.set(sessionId, []);
    }

    const history = this.responseHistory.get(sessionId);
    history.push({
      content,
      timestamp: Date.now(),
      original: response.substring(0, 500)
    });

    // Limite la taille de l'historique
    while (history.length > this.historySize) {
      history.shift();
    }

    this.log(`[RepetitionDetector] Réponse enregistrée pour session ${sessionId}. Historique: ${history.length}/${this.historySize}`);
  }

  /**
   * Vérifie ET enregistre une réponse
   * @param {string} response
   * @param {string} sessionId
   * @returns {{isRepetitive: boolean, reason: string, similarity: number, matchedWith: string|null}}
   */
  checkAndRecord(response, sessionId = 'default') {
    const result = this.check(response, sessionId);

    // N'enregistre que si pas répétitive
    if (!result.isRepetitive) {
      this.record(response, sessionId);
    }

    return result;
  }

  /**
   * Nettoie l'historique d'une session
   * @param {string} sessionId
   */
  clearHistory(sessionId = 'default') {
    this.responseHistory.delete(sessionId);
    this.log(`[RepetitionDetector] Historique nettoyé pour session ${sessionId}`);
  }

  /**
   * Nettoie tout l'historique
   */
  clearAllHistory() {
    this.responseHistory.clear();
    this.log(`[RepetitionDetector] Tout l'historique nettoyé`);
  }

  /**
   * Obtient les statistiques
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      repetitionRate: this.stats.totalChecks > 0
        ? (this.stats.repetitionsDetected / this.stats.totalChecks * 100).toFixed(2) + '%'
        : '0%',
      blockedPatternsCount: this.blockedPatterns.size,
      activeSessions: this.responseHistory.size
    };
  }

  /**
   * Logging conditionnel
   * @param {string} message
   */
  log(message) {
    if (this.enableLogging) {
      console.log(message);
    }
  }
}

// Instance globale partagée
const globalDetector = new RepetitionDetector();

// Ajouter la blague "plongeurs" à la blacklist (TEMPORAIRE - test)
globalDetector.addBlockedPattern('Pourquoi les plongeurs plongent-ils toujours en arrière');
globalDetector.addBlockedPattern('plongeurs plongent toujours');
globalDetector.addBlockedPattern('sinon ils tombent toujours dans le bateau');

module.exports = {
  RepetitionDetector,
  jaccardSimilarity,
  ngramSimilarity,
  extractSignificantContent,
  globalDetector
};
