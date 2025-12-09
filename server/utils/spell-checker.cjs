/**
 * French Spell Checker Module for Ana
 * Uses nspell with French Hunspell dictionary
 *
 * @module spell-checker
 * @description Corrects spelling errors in Ana's responses
 */

const nspell = require('nspell');

let spellChecker = null;
let isInitialized = false;

/**
 * Initialize the French spell checker
 * @returns {Promise<void>}
 */
async function initialize() {
  if (isInitialized) return;

  try {
    // Dynamic import for ESM module dictionary-fr
    const dictionary = await import('dictionary-fr');
    const dict = dictionary.default;

    // dictionary-fr exports { aff, dic } directly as Buffers
    spellChecker = nspell(dict);
    isInitialized = true;
    console.log('✅ Correcteur orthographique français initialisé');
  } catch (error) {
    console.error('❌ Erreur import dictionary-fr:', error.message);
    throw error;
  }
}

/**
 * Check if a word is spelled correctly
 * @param {string} word - Word to check
 * @returns {boolean} True if correct
 */
function isCorrect(word) {
  if (!spellChecker) return true;
  return spellChecker.correct(word);
}

/**
 * Get spelling suggestions for a word
 * @param {string} word - Misspelled word
 * @returns {string[]} Array of suggestions
 */
function suggest(word) {
  if (!spellChecker) return [];
  return spellChecker.suggest(word);
}

/**
 * Correct spelling in a text
 * @param {string} text - Text to correct
 * @returns {string} Corrected text
 */
function correctText(text) {
  if (!spellChecker || !text) return text;

  // Split text into words while preserving punctuation and whitespace
  const wordPattern = /([a-zA-ZÀ-ÿ'-]+)|([^a-zA-ZÀ-ÿ'-]+)/g;
  const tokens = text.match(wordPattern) || [];

  const correctedTokens = tokens.map(token => {
    // Skip non-word tokens (punctuation, whitespace, numbers)
    if (!/^[a-zA-ZÀ-ÿ'-]+$/.test(token)) {
      return token;
    }

    // Skip short words (likely abbreviations or intentional)
    if (token.length <= 2) {
      return token;
    }

    // Skip words that start with uppercase (proper nouns)
    if (/^[A-ZÀ-Ý]/.test(token) && token.length > 1) {
      return token;
    }

    // Check if word is correct
    if (spellChecker.correct(token)) {
      return token;
    }

    // Get suggestions
    const suggestions = spellChecker.suggest(token);

    // Use first suggestion if available and reasonable
    if (suggestions.length > 0) {
      const suggestion = suggestions[0];

      // Only use suggestion if it's similar enough (prevent drastic changes)
      if (isSimilarEnough(token, suggestion)) {
        return suggestion;
      }
    }

    // Return original if no good suggestion
    return token;
  });

  return correctedTokens.join('');
}

/**
 * Check if two words are similar enough for auto-correction
 * Uses Levenshtein distance ratio
 * @param {string} original - Original word
 * @param {string} suggestion - Suggested correction
 * @returns {boolean} True if similar enough
 */
function isSimilarEnough(original, suggestion) {
  const distance = levenshteinDistance(original.toLowerCase(), suggestion.toLowerCase());
  const maxLength = Math.max(original.length, suggestion.length);
  const similarity = 1 - (distance / maxLength);

  // Require at least 60% similarity
  return similarity >= 0.6;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Get spell checker status
 * @returns {object} Status info
 */
function getStatus() {
  return {
    initialized: isInitialized,
    language: 'fr',
    ready: spellChecker !== null
  };
}

module.exports = {
  initialize,
  isCorrect,
  suggest,
  correctText,
  getStatus
};
