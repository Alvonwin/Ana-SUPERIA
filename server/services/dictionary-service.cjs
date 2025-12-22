/**
 * Service de dictionnaire français partagé
 * Sources:
 * - Taknok/French-Wordlist (22,740 mots généraux)
 * - hbenbel/French-Dictionary (noms, verbes, adjectifs catégorisés)
 */

const fs = require('fs');
const path = require('path');

const DICTIONARIES_PATH = path.join(__dirname, '..', 'data', 'dictionaries');

class DictionaryService {
  constructor() {
    this.words = {
      general: [],      // Mots généraux (french-words.txt)
      nouns: [],        // Noms (nouns.csv)
      verbs: [],        // Verbes infinitifs uniquement
      adjectives: [],   // Adjectifs
      all: []           // Tous les mots combinés (dédupliqués)
    };
    this.loaded = false;
    this.stats = {};
  }

  /**
   * Charge tous les dictionnaires
   */
  async load() {
    if (this.loaded) return;

    console.log('[DictionaryService] Chargement des dictionnaires...');

    try {
      // Charger french-words.txt (mots généraux)
      await this.loadGeneralWords();

      // Charger les CSVs catégorisés
      await this.loadNouns();
      await this.loadVerbs();
      await this.loadAdjectives();

      // Combiner tous les mots (dédupliqués)
      this.combineAll();

      this.loaded = true;
      console.log('[DictionaryService] Dictionnaires chargés:', this.stats);

    } catch (error) {
      console.error('[DictionaryService] Erreur chargement:', error.message);
      throw error;
    }
  }

  /**
   * Charge les mots généraux depuis french-words.txt
   */
  async loadGeneralWords() {
    const filePath = path.join(DICTIONARIES_PATH, 'french-words.txt');

    if (!fs.existsSync(filePath)) {
      console.warn('[DictionaryService] french-words.txt non trouvé');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const words = content
      .split('\n')
      .map(w => w.trim().toLowerCase())
      .filter(w => this.isValidWord(w));

    this.words.general = words;
    this.stats.general = words.length;
  }

  /**
   * Charge les noms depuis nouns.csv
   */
  async loadNouns() {
    const filePath = path.join(DICTIONARIES_PATH, 'nouns.csv');

    if (!fs.existsSync(filePath)) {
      console.warn('[DictionaryService] nouns.csv non trouvé');
      return;
    }

    const words = this.parseCSV(filePath, {
      // Garder seulement les noms sans tag "plural" pour éviter les doublons
      excludeTags: ['plural']
    });

    this.words.nouns = words;
    this.stats.nouns = words.length;
  }

  /**
   * Charge les verbes depuis verbs.csv (infinitifs uniquement)
   */
  async loadVerbs() {
    const filePath = path.join(DICTIONARIES_PATH, 'verbs.csv');

    if (!fs.existsSync(filePath)) {
      console.warn('[DictionaryService] verbs.csv non trouvé');
      return;
    }

    // Pour les verbes, on ne garde que les infinitifs
    const words = this.parseCSV(filePath, {
      requireTags: ['infinitive']
    });

    this.words.verbs = words;
    this.stats.verbs = words.length;
  }

  /**
   * Charge les adjectifs depuis adjectives.csv
   */
  async loadAdjectives() {
    const filePath = path.join(DICTIONARIES_PATH, 'adjectives.csv');

    if (!fs.existsSync(filePath)) {
      console.warn('[DictionaryService] adjectives.csv non trouvé');
      return;
    }

    const words = this.parseCSV(filePath, {
      // Garder seulement les formes canoniques ou sans tag
      preferCanonical: true
    });

    this.words.adjectives = words;
    this.stats.adjectives = words.length;
  }

  /**
   * Parse un fichier CSV et extrait les mots
   */
  parseCSV(filePath, options = {}) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const words = new Set();

    // Ignorer la première ligne (header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Format: form,tags
      const commaIndex = line.indexOf(',');
      if (commaIndex === -1) continue;

      const word = line.substring(0, commaIndex).trim().toLowerCase();
      const tagsStr = line.substring(commaIndex + 1).trim();

      // Parser les tags
      let tags = [];
      if (tagsStr && tagsStr !== '') {
        try {
          // Les tags sont au format Python: ['tag1', 'tag2']
          tags = tagsStr
            .replace(/'/g, '"')
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map(t => t.trim().replace(/"/g, ''))
            .filter(t => t);
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      }

      // Appliquer les filtres
      if (options.excludeTags) {
        const hasExcluded = options.excludeTags.some(t => tags.includes(t));
        if (hasExcluded) continue;
      }

      if (options.requireTags) {
        const hasRequired = options.requireTags.some(t => tags.includes(t));
        if (!hasRequired) continue;
      }

      if (options.preferCanonical && tags.length > 0) {
        // Si on préfère les canoniques, ignorer les non-canoniques
        if (!tags.includes('canonical') && tags.length > 0) continue;
      }

      // Valider le mot
      if (this.isValidWord(word)) {
        words.add(word);
      }
    }

    return Array.from(words);
  }

  /**
   * Vérifie si un mot est valide pour les jeux
   */
  isValidWord(word) {
    if (!word || word.length < 2) return false;

    // Doit contenir uniquement des lettres (avec accents français)
    const validPattern = /^[a-zàâäéèêëïîôùûüÿœæç-]+$/i;
    if (!validPattern.test(word)) return false;

    // Pas de tirets au début ou à la fin
    if (word.startsWith('-') || word.endsWith('-')) return false;

    return true;
  }

  /**
   * Combine tous les mots dans une liste unique
   */
  combineAll() {
    const allWords = new Set();

    for (const category of ['general', 'nouns', 'verbs', 'adjectives']) {
      for (const word of this.words[category]) {
        allWords.add(word);
      }
    }

    this.words.all = Array.from(allWords);
    this.stats.all = this.words.all.length;
  }

  /**
   * Retourne un mot aléatoire
   */
  getRandomWord(options = {}) {
    const {
      category = 'all',      // 'all', 'nouns', 'verbs', 'adjectives', 'general'
      minLength = 3,
      maxLength = 15,
      excludeAccents = false
    } = options;

    let wordList = this.words[category] || this.words.all;

    // Filtrer par longueur
    let filtered = wordList.filter(w => w.length >= minLength && w.length <= maxLength);

    // Optionnel: exclure les mots avec accents
    if (excludeAccents) {
      filtered = filtered.filter(w => !/[àâäéèêëïîôùûüÿœæç]/i.test(w));
    }

    if (filtered.length === 0) return null;

    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  /**
   * Retourne plusieurs mots aléatoires
   */
  getRandomWords(count, options = {}) {
    const words = [];
    const used = new Set();

    for (let i = 0; i < count * 3 && words.length < count; i++) {
      const word = this.getRandomWord(options);
      if (word && !used.has(word)) {
        words.push(word);
        used.add(word);
      }
    }

    return words;
  }

  /**
   * Vérifie si un mot existe dans le dictionnaire
   */
  wordExists(word, category = 'all') {
    const wordLower = word.toLowerCase();
    const wordList = this.words[category] || this.words.all;
    return wordList.includes(wordLower);
  }

  /**
   * Retourne des mots par difficulté pour le pendu
   */
  getWordByDifficulty(difficulty = 'medium') {
    const difficulties = {
      easy: { minLength: 4, maxLength: 6, excludeAccents: true },
      medium: { minLength: 5, maxLength: 8, excludeAccents: false },
      hard: { minLength: 7, maxLength: 12, excludeAccents: false },
      expert: { minLength: 10, maxLength: 20, excludeAccents: false }
    };

    return this.getRandomWord(difficulties[difficulty] || difficulties.medium);
  }

  /**
   * Statistiques du dictionnaire
   */
  getStats() {
    return {
      ...this.stats,
      loaded: this.loaded
    };
  }

  /**
   * Recherche des mots contenant un pattern
   */
  searchWords(pattern, options = {}) {
    const { category = 'all', limit = 100 } = options;
    const regex = new RegExp(pattern, 'i');
    const wordList = this.words[category] || this.words.all;

    return wordList.filter(w => regex.test(w)).slice(0, limit);
  }

  /**
   * Retourne des mots commençant par une lettre
   */
  getWordsByFirstLetter(letter, options = {}) {
    const { category = 'all', limit = 100 } = options;
    const wordList = this.words[category] || this.words.all;

    return wordList
      .filter(w => w.toLowerCase().startsWith(letter.toLowerCase()))
      .slice(0, limit);
  }
}

// Instance singleton
const dictionaryService = new DictionaryService();

module.exports = dictionaryService;
