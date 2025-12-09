#!/usr/bin/env node
/**
 * 🧠 COGNITIVE ANALYZER - Intelligence contextuelle échanges
 *
 * RÔLE: Analyser contenu échanges pour enrichir métadonnées
 * INPUT: {userMessage: string, claudeResponse: string}
 * OUTPUT: {project, theme, intent, urgency, keywords, requires...}
 *
 * PHILOSOPHIE:
 * - Détection automatique projets (Le Spot SUP, Voice Platform, etc.)
 * - Classification thématique (architecture, bug, feature, doc)
 * - Extraction mots-clés intelligente
 * - Identification patterns récurrents
 *
 * Date: 2025-11-01
 * Système: V3 Architecture
 */

class CognitiveAnalyzer {
  constructor() {
    // Dictionnaire projets
    this.projects = {
      'Le_Spot_SUP': ['spot sup', 'spots', 'gps', 'nominatim', 'leaflet', 'carte', 'sup'],
      'Voice_Platform': ['voice', 'piper', 'tts', 'voxtral', 'voix', 'audio', 'websocket'],
      'Systeme_Memoire': ['mémoire', 'stage', 'pyramide', 'archivage', 'résumé', 'exchange', 'v1', 'v2', 'v3'],
      'Quartier_General': ['quartier général', 'contrôle', 'dashboard'],
      'General': []
    };

    // Thématiques
    this.themes = {
      'Architecture': ['architecture', 'système', 'structure', 'design', 'pattern', 'infrastructure'],
      'Bug_Fix': ['bug', 'erreur', 'problème', 'correction', 'fix', 'crash', 'échec'],
      'Feature': ['feature', 'fonctionnalité', 'nouvelle', 'ajouter', 'implémenter', 'créer'],
      'Documentation': ['documentation', 'readme', 'guide', 'manuel', 'expliquer'],
      'Optimization': ['optimisation', 'performance', 'améliorer', 'accélérer', 'efficacité'],
      'Refactoring': ['refactoring', 'refonte', 'restructurer', 'nettoyer', 'simplifier']
    };

    // Intentions utilisateur
    this.intents = {
      'Question': ['pourquoi', 'comment', 'où', 'quand', 'quel', 'est-ce que', '?'],
      'Demande_Action': ['fais', 'crée', 'implémente', 'corrige', 'modifie', 'vérifie'],
      'Validation': ['correct', 'ok', 'bien', 'parfait', 'continue', 'bon'],
      'Correction': ['non', 'pas', 'erreur', 'plutôt', 'au lieu', 'incorrect'],
      'Proposition': ['peut-être', 'on devrait', 'proposer', 'suggérer', 'idée']
    };
  }

  /**
   * Analyser un échange complet
   * @param {string} userMessage - Message d'Alain
   * @param {string} claudeResponse - Réponse de Claude
   * @returns {Object} Métadonnées enrichies
   */
  analyze(userMessage, claudeResponse) {
    const lowerUser = userMessage.toLowerCase();
    const lowerClaude = claudeResponse.toLowerCase();
    const combined = `${lowerUser} ${lowerClaude}`;

    return {
      project: this.detectProject(combined),
      theme: this.detectTheme(combined),
      intent: this.detectIntent(lowerUser),
      urgency: this.detectUrgency(lowerUser),
      keywords: this.extractKeywords(combined),
      sentiment: this.analyzeSentiment(lowerUser),
      requires_documentation: this.requiresDocumentation(combined),
      architectural_decision: this.isArchitecturalDecision(combined),
      code_modification: this.detectsCodeModification(lowerClaude),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Détection projet principal
   */
  detectProject(text) {
    for (const [project, keywords] of Object.entries(this.projects)) {
      if (project === 'General') continue;

      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return project;
        }
      }
    }

    return 'General';
  }

  /**
   * Détection thème
   */
  detectTheme(text) {
    const detected = [];

    for (const [theme, keywords] of Object.entries(this.themes)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          detected.push(theme);
          break;
        }
      }
    }

    return detected.length > 0 ? detected : ['General'];
  }

  /**
   * Détection intention utilisateur
   */
  detectIntent(userText) {
    for (const [intent, keywords] of Object.entries(this.intents)) {
      for (const keyword of keywords) {
        if (userText.includes(keyword)) {
          return intent;
        }
      }
    }

    return 'Statement';
  }

  /**
   * Détection urgence
   */
  detectUrgency(userText) {
    const urgent = ['urgent', 'immédiat', 'tout de suite', 'maintenant', 'critique', 'bloqué'];
    const high = ['important', 'priorité', 'rapidement', 'vite'];
    const low = ['quand tu peux', 'pas urgent', 'plus tard'];

    if (urgent.some(k => userText.includes(k))) return 'urgent';
    if (high.some(k => userText.includes(k))) return 'high';
    if (low.some(k => userText.includes(k))) return 'low';

    return 'medium';
  }

  /**
   * Extraction mots-clés (simple)
   */
  extractKeywords(text) {
    // Mots communs à ignorer
    const stopWords = [
      'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'donc',
      'pour', 'dans', 'sur', 'avec', 'par', 'de', 'du', 'que', 'qui',
      'est', 'sont', 'être', 'avoir', 'faire', 'peut', 'doit', 'va'
    ];

    const words = text
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëïîôùûüÿç]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.includes(w));

    // Compter fréquences
    const freq = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);

    // Top 5 mots
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Analyse sentiment utilisateur
   */
  analyzeSentiment(userText) {
    const positive = ['bien', 'parfait', 'excellent', 'super', 'merci', 'bravo', 'ok'];
    const negative = ['non', 'erreur', 'problème', 'bug', 'échec', 'mauvais'];

    const posCount = positive.filter(k => userText.includes(k)).length;
    const negCount = negative.filter(k => userText.includes(k)).length;

    if (posCount > negCount) return 'positive';
    if (negCount > posCount) return 'negative';
    return 'neutral';
  }

  /**
   * Nécessite documentation?
   */
  requiresDocumentation(text) {
    const indicators = [
      'architecture',
      'système',
      'nouveau',
      'créer',
      'important',
      'critique',
      'fonctionnement',
      'principe'
    ];

    return indicators.some(k => text.includes(k));
  }

  /**
   * Décision architecturale?
   */
  isArchitecturalDecision(text) {
    const indicators = [
      'architecture',
      'décision',
      'choix',
      'structure',
      'système',
      'design',
      'pattern',
      'organisation',
      'stratégie'
    ];

    return indicators.some(k => text.includes(k));
  }

  /**
   * Claude a modifié du code?
   */
  detectsCodeModification(claudeText) {
    const indicators = [
      'créé',
      'modifié',
      'écrit',
      'write',
      'edit',
      'fichier',
      'code',
      'script',
      'function',
      'class'
    ];

    return indicators.some(k => claudeText.includes(k));
  }
}

module.exports = CognitiveAnalyzer;
