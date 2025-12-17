/**
 * LangChain Web Search Service
 *
 * Recherche web automatique avec DuckDuckGo
 * Détecte intelligemment quand une recherche est nécessaire
 *
 * Standard industrie: LangChain.js (80K+ stars)
 */

const { DuckDuckGoSearch } = require("@langchain/community/tools/duckduckgo_search");

class LangChainWebSearch {
  constructor() {
    this.searchTool = null;
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      this.searchTool = new DuckDuckGoSearch({ maxResults: 5 });
      this.initialized = true;
      console.log('✅ LangChain Web Search initialisé (DuckDuckGo)');
    } catch (error) {
      console.error('❌ LangChain Web Search init error:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Détecte si une recherche web est nécessaire
   * Retourne true si le message nécessite des infos en temps réel
   */
  needsWebSearch(message) {
    const msgLower = message.toLowerCase();

    // Keywords qui indiquent un besoin de recherche web
    const searchIndicators = [
      // Météo
      'météo', 'meteo', 'température', 'temps qu\'il fait', 'pluie', 'neige', 'fera-t-il',
      // Actualités
      'actualités', 'actualites', 'nouvelles', 'news', 'dernières infos',
      // Recherche explicite
      'cherche', 'recherche', 'trouve', 'google', 'internet',
      // Questions factuelles temps réel
      'aujourd\'hui', 'maintenant', 'actuellement', 'en ce moment',
      'quel est le prix', 'combien coûte', 'où est', 'qui est le',
      'dernière version', 'date de sortie', 'résultats de',
      // Questions générales qui nécessitent des faits récents
      'c\'est quoi', 'qu\'est-ce que', 'définition', 'expliquer',
      'comment fonctionne', 'pourquoi', 'quand est-ce que'
    ];

    // Indicateurs de questions sur des événements récents
    const recentIndicators = [
      '2024', '2025', 'cette année', 'ce mois', 'cette semaine',
      'récent', 'nouveau', 'dernière', 'dernier'
    ];

    const hasSearchIndicator = searchIndicators.some(kw => msgLower.includes(kw));
    const hasRecentIndicator = recentIndicators.some(kw => msgLower.includes(kw));

    // Questions avec "?" qui ne sont pas du code
    const isQuestion = message.includes('?') && !message.includes('function') && !message.includes('const ');

    return hasSearchIndicator || (hasRecentIndicator && isQuestion);
  }

  /**
   * Effectue une recherche web via DuckDuckGo
   * @param {string} query - La requête de recherche
   * @returns {Object} Résultats de recherche formatés
   */
  async search(query) {
    if (!this.initialized || !this.searchTool) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`🔍 LangChain Web Search: "${query}"`);

      const results = await this.searchTool.invoke(query);

      if (results) {
        console.log('✅ Recherche web réussie');
        return {
          success: true,
          query: query,
          results: results,
          formatted: this.formatResults(query, results)
        };
      }

      return { success: false, error: 'Pas de résultats' };
    } catch (error) {
      console.error('❌ Web search error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Formate les résultats pour injection dans le contexte LLM
   */
  formatResults(query, results) {
    return `[RÉSULTATS RECHERCHE WEB - ${new Date().toLocaleDateString('fr-CA')}]
Requête: "${query}"

${results}

[FIN DES RÉSULTATS WEB - Utilise ces informations pour répondre de manière précise et à jour]`;
  }

  /**
   * Méthode principale: détecte et recherche automatiquement
   * @param {string} message - Message de l'utilisateur
   * @returns {Object|null} Résultats si recherche effectuée, null sinon
   */
  async autoSearch(message) {
    if (!this.needsWebSearch(message)) {
      return null;
    }

    // Nettoyer la requête pour la recherche
    let searchQuery = message
      .replace(/cherche|recherche|trouve|google|sur internet|sur le web/gi, '')
      .replace(/c'est quoi|qu'est-ce que|quelle est|quel est/gi, '')
      .replace(/s'il te plaît|s'il vous plaît|svp|stp/gi, '')
      .trim();

    // Si la requête est trop courte, utiliser le message original
    if (searchQuery.length < 5) {
      searchQuery = message;
    }

    return await this.search(searchQuery);
  }
}

// Singleton
const langchainWebSearch = new LangChainWebSearch();

module.exports = langchainWebSearch;
