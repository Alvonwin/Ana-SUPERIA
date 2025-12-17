/**
 * Grammar Service - Correction grammaticale française
 * Utilise l'API publique LanguageTool
 *
 * Créé: 16 Décembre 2025
 */

const axios = require('axios');

const LANGUAGETOOL_API = 'https://api.languagetool.org/v2/check';

class GrammarService {
  constructor() {
    this.enabled = true;
    this.language = 'fr';
    this.stats = {
      checks: 0,
      corrections: 0,
      errors: 0
    };
  }

  /**
   * Corrige la grammaire d'un texte français
   * @param {string} text - Le texte à corriger
   * @returns {Promise<string>} - Le texte corrigé
   */
  async correct(text) {
    if (!this.enabled || !text || text.length < 5) {
      return text;
    }

    try {
      this.stats.checks++;

      const response = await axios.post(LANGUAGETOOL_API,
        new URLSearchParams({
          text: text,
          language: this.language,
          enabledOnly: 'false'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 5000 // 5 secondes max
        }
      );

      const matches = response.data.matches || [];

      if (matches.length === 0) {
        return text;
      }

      // Appliquer les corrections en partant de la fin
      // pour ne pas décaler les positions
      let correctedText = text;
      const sortedMatches = matches
        .filter(m => m.replacements && m.replacements.length > 0)
        .sort((a, b) => b.offset - a.offset);

      for (const match of sortedMatches) {
        const replacement = match.replacements[0].value;
        const start = match.offset;
        const end = start + match.length;

        correctedText =
          correctedText.slice(0, start) +
          replacement +
          correctedText.slice(end);

        this.stats.corrections++;

        console.log(`[Grammar] Corrigé: "${text.slice(start, end)}" → "${replacement}"`);
      }

      return correctedText;

    } catch (error) {
      this.stats.errors++;
      // En cas d'erreur, retourner le texte original
      console.error('[Grammar] Erreur API:', error.message);
      return text;
    }
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Activer/désactiver le service
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// Singleton
const grammarService = new GrammarService();

module.exports = grammarService;
