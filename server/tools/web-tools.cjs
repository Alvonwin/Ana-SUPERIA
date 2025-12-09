/**
 * Ana Web Tools
 * Recherche web et récupération de contenu
 *
 * Fonctionnalités:
 * - WebSearch: Recherche DuckDuckGo (gratuit, sans API key)
 * - WebFetch: Récupérer et analyser pages web
 * - Wikipedia: Recherche Wikipedia FR
 *
 * Date: 25 Novembre 2025
 */

const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

// Load .env
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Configuration
const CONFIG = {
  timeout: 15000,
  maxContentLength: 500000, // 500KB max
  userAgent: 'Ana-SUPERIA/1.0 (AI Assistant; +https://ana.local)',
  braveApi: 'https://api.search.brave.com/res/v1/web/search', // Brave Search - gratuit 2000 req/jour
  ddgApi: 'https://api.duckduckgo.com/', // Fallback DuckDuckGo
  wikipediaApi: 'https://fr.wikipedia.org/w/api.php'
};

class WebTools {
  /**
   * Recherche Web - Brave Search API (gratuit 2000 req/jour)
   * Fallback vers DuckDuckGo si Brave échoue
   * @param {string} query - Requête de recherche
   * @param {object} options - { limit }
   * @returns {Promise<object>} Résultats de recherche
   */
  static async search(query, options = {}) {
    const { limit = 5 } = options;

    if (!query || query.trim().length < 2) {
      return {
        success: false,
        error: 'Query too short (minimum 2 characters)'
      };
    }

    try {
      console.log(`🔍 [WebTools] Recherche Brave: "${query}"`);

      // Brave Search Web API - 2000 req/mois avec clé API
      const response = await axios.get(CONFIG.braveApi, {
        params: {
          q: query,
          count: limit
        },
        timeout: CONFIG.timeout,
        headers: {
          'User-Agent': CONFIG.userAgent,
          'Accept': 'application/json',
          'X-Subscription-Token': process.env.BRAVE_API_KEY
        }
      });

      const webResults = response.data.web?.results || [];

      if (webResults.length > 0) {
        console.log(`✅ [WebTools] Brave: ${webResults.length} résultats`);
        return {
          success: true,
          query: query,
          engine: 'brave',
          results: webResults.map(r => ({
            title: r.title,
            url: r.url,
            description: r.description || r.snippet || ''
          })),
          count: webResults.length
        };
      }

      // Pas de résultats Brave, essayer SearXNG (méta-moteur Google/Bing)
      console.log(`⚠️ [WebTools] Brave vide, fallback SearXNG`);
      return await this._duckduckgoHtmlSearch(query, limit);

    } catch (error) {
      console.error(`❌ [WebTools] Erreur Brave:`, error.message);
      // Fallback SearXNG (méta-moteur qui agrège Google/Bing/etc.)
      return await this._duckduckgoHtmlSearch(query, limit);
    }
  }

  /**
   * Fallback DuckDuckGo Instant Answer
   */
  static async _duckduckgoSearch(query, limit = 5) {
    try {
      console.log(`🔍 [WebTools] Fallback DuckDuckGo: "${query}"`);

      const response = await axios.get(CONFIG.ddgApi, {
        params: {
          q: query,
          format: 'json',
          no_html: 1,
          skip_disambig: 1,
          t: 'Ana-SUPERIA'
        },
        timeout: CONFIG.timeout,
        headers: {
          'User-Agent': CONFIG.userAgent
        }
      });

      const data = response.data;
      const results = [];

      // Abstract (souvent Wikipedia)
      if (data.Abstract) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || '',
          description: data.Abstract
        });
      }

      // Related Topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        data.RelatedTopics
          .filter(t => t.Text && t.FirstURL)
          .slice(0, limit - results.length)
          .forEach(topic => {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text,
              url: topic.FirstURL,
              description: topic.Text
            });
          });
      }

      console.log(`✅ [WebTools] DuckDuckGo: ${results.length} résultats`);

      return {
        success: results.length > 0,
        query: query,
        engine: 'duckduckgo',
        results: results,
        count: results.length,
        abstract: data.Abstract || null
      };

    } catch (error) {
      console.error(`❌ [WebTools] Erreur DuckDuckGo:`, error.message);
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error.message,
          query: query
        }
      };
    }
  }

  /**
   * DuckDuckGo HTML Scraping - Vraie recherche web
   * Scrape les résultats HTML de DuckDuckGo (plus fiable que l'API Instant Answer)
   * Ajouté 2025-12-03 pour avoir de vrais résultats de recherche
   */
  static async _duckduckgoHtmlSearch(query, limit = 5) {
    try {
      console.log(`🔍 [WebTools] DuckDuckGo HTML: "${query}"`);

      // DuckDuckGo HTML search (pas l'API Instant Answer)
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: {
          q: query
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
        }
      });

      const cheerio = require('cheerio');
      const $ = cheerio.load(response.data);
      const results = [];

      // Parser les résultats de recherche
      $('.result').each((i, elem) => {
        if (results.length >= limit) return false;

        const $elem = $(elem);
        const titleLink = $elem.find('.result__a');
        const snippet = $elem.find('.result__snippet');

        const title = titleLink.text().trim();
        let url = titleLink.attr('href') || '';
        const description = snippet.text().trim();

        // DuckDuckGo utilise des redirections, extraire l'URL réelle
        if (url.includes('uddg=')) {
          const match = url.match(/uddg=([^&]+)/);
          if (match) {
            url = decodeURIComponent(match[1]);
          }
        }

        if (title && url && !url.includes('duckduckgo.com')) {
          results.push({
            title: title,
            url: url,
            description: description
          });
        }
      });

      if (results.length > 0) {
        console.log(`✅ [WebTools] DuckDuckGo HTML: ${results.length} résultats`);
        return {
          success: true,
          query: query,
          engine: 'duckduckgo-html',
          results: results,
          count: results.length
        };
      }

      console.log(`⚠️ [WebTools] DuckDuckGo HTML: 0 résultats`);
      return {
        success: false,
        error: {
          code: 'NO_RESULTS',
          message: 'Aucun résultat trouvé',
          query: query
        }
      };

    } catch (error) {
      console.error(`❌ [WebTools] Erreur DuckDuckGo HTML:`, error.message);
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error.message,
          query: query
        }
      };
    }
  }

  /**
   * Récupérer et parser une page web
   * @param {string} url - URL à récupérer
   * @param {object} options - { extractText, extractLinks, maxLength }
   * @returns {Promise<object>} Contenu de la page
   */
  static async fetch(url, options = {}) {
    const {
      extractText = true,
      extractLinks = true,
      extractHeadings = true,
      maxLength = 10000
    } = options;

    // Validation URL
    if (!url || !url.startsWith('http')) {
      return {
        success: false,
        error: 'Invalid URL (must start with http or https)'
      };
    }

    try {
      console.log(`🌐 [WebTools] Fetch: ${url}`);

      const response = await axios.get(url, {
        timeout: CONFIG.timeout,
        maxContentLength: CONFIG.maxContentLength,
        headers: {
          'User-Agent': CONFIG.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
        },
        responseType: 'text'
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extraire métadonnées
      const result = {
        url: url,
        title: $('title').text().trim() || null,
        description: $('meta[name="description"]').attr('content') || null,
        charset: response.headers['content-type'] || null,
        statusCode: response.status
      };

      // Extraire texte principal
      if (extractText) {
        // Supprimer scripts, styles, nav, etc.
        $('script, style, nav, header, footer, aside, noscript, iframe').remove();

        // Chercher contenu principal
        let mainContent = '';
        const contentSelectors = ['article', 'main', '.content', '#content', '.post', '.entry'];

        for (const selector of contentSelectors) {
          const content = $(selector).text();
          if (content && content.length > mainContent.length) {
            mainContent = content;
          }
        }

        // Fallback: body entier
        if (!mainContent || mainContent.length < 100) {
          mainContent = $('body').text();
        }

        // Nettoyer whitespace
        mainContent = mainContent
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n/g, '\n')
          .trim();

        result.text = mainContent.substring(0, maxLength);
        result.textLength = mainContent.length;
        result.truncated = mainContent.length > maxLength;
      }

      // Extraire liens
      if (extractLinks) {
        const links = [];
        $('a[href]').each((i, el) => {
          if (i >= 50) return false; // Max 50 liens
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          if (href && text && !href.startsWith('#') && !href.startsWith('javascript:')) {
            links.push({
              text: text.substring(0, 100),
              url: href.startsWith('http') ? href : new URL(href, url).href
            });
          }
        });
        result.links = links;
      }

      // Extraire headings
      if (extractHeadings) {
        const headings = [];
        $('h1, h2, h3').each((i, el) => {
          if (i >= 20) return false;
          const level = el.tagName.toLowerCase();
          const text = $(el).text().trim();
          if (text) {
            headings.push({ level, text: text.substring(0, 200) });
          }
        });
        result.headings = headings;
      }

      console.log(`✅ [WebTools] Fetch OK: ${result.title || 'No title'}`);

      return {
        success: true,
        ...result
      };

    } catch (error) {
      console.error(`❌ [WebTools] Erreur fetch:`, error.message);

      return {
        success: false,
        error: {
          code: error.response?.status || 'FETCH_ERROR',
          message: error.message,
          url: url
        }
      };
    }
  }

  /**
   * Recherche Wikipedia (FR)
   * @param {string} query - Terme de recherche
   * @param {object} options - { limit, extract }
   * @returns {Promise<object>} Résultats Wikipedia
   */
  static async wikipedia(query, options = {}) {
    const { limit = 5, extractLength = 1000 } = options;

    if (!query || query.trim().length < 2) {
      return {
        success: false,
        error: 'Query too short'
      };
    }

    try {
      console.log(`📚 [WebTools] Wikipedia: "${query}"`);

      // Recherche Wikipedia
      const searchResponse = await axios.get(CONFIG.wikipediaApi, {
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          srlimit: limit,
          format: 'json',
          utf8: 1
        },
        timeout: CONFIG.timeout,
        headers: { 'User-Agent': CONFIG.userAgent }
      });

      const searchResults = searchResponse.data.query?.search || [];

      if (searchResults.length === 0) {
        return {
          success: true,
          query: query,
          results: [],
          message: 'No Wikipedia articles found'
        };
      }

      // Récupérer extraits des premiers résultats
      const pageIds = searchResults.slice(0, 3).map(r => r.pageid).join('|');

      const extractResponse = await axios.get(CONFIG.wikipediaApi, {
        params: {
          action: 'query',
          pageids: pageIds,
          prop: 'extracts|info',
          exintro: true,
          explaintext: true,
          exsentences: 5,
          inprop: 'url',
          format: 'json',
          utf8: 1
        },
        timeout: CONFIG.timeout,
        headers: { 'User-Agent': CONFIG.userAgent }
      });

      const pages = extractResponse.data.query?.pages || {};

      const results = Object.values(pages).map(page => ({
        title: page.title,
        pageId: page.pageid,
        url: page.fullurl || `https://fr.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
        extract: page.extract?.substring(0, extractLength) || null,
        touched: page.touched
      }));

      console.log(`✅ [WebTools] Wikipedia: ${results.length} articles trouvés`);

      return {
        success: true,
        query: query,
        totalHits: searchResponse.data.query?.searchinfo?.totalhits || 0,
        results: results
      };

    } catch (error) {
      console.error(`❌ [WebTools] Erreur Wikipedia:`, error.message);

      return {
        success: false,
        error: {
          code: 'WIKIPEDIA_ERROR',
          message: error.message,
          query: query
        }
      };
    }
  }

  /**
   * Recherche NPM packages
   * @param {string} query - Nom du package
   * @param {object} options - { limit }
   * @returns {Promise<object>} Résultats NPM
   */
  static async npmSearch(query, options = {}) {
    const { limit = 10 } = options;

    try {
      console.log(`📦 [WebTools] NPM: "${query}"`);

      const response = await axios.get(`https://registry.npmjs.org/-/v1/search`, {
        params: {
          text: query,
          size: limit
        },
        timeout: CONFIG.timeout,
        headers: { 'User-Agent': CONFIG.userAgent }
      });

      const packages = response.data.objects?.map(obj => ({
        name: obj.package.name,
        version: obj.package.version,
        description: obj.package.description,
        keywords: obj.package.keywords?.slice(0, 5) || [],
        author: obj.package.author?.name || null,
        date: obj.package.date,
        links: {
          npm: obj.package.links?.npm,
          homepage: obj.package.links?.homepage,
          repository: obj.package.links?.repository
        },
        score: {
          final: obj.score.final,
          quality: obj.score.detail?.quality,
          popularity: obj.score.detail?.popularity
        }
      })) || [];

      console.log(`✅ [WebTools] NPM: ${packages.length} packages trouvés`);

      return {
        success: true,
        query: query,
        total: response.data.total || 0,
        packages: packages
      };

    } catch (error) {
      console.error(`❌ [WebTools] Erreur NPM:`, error.message);

      return {
        success: false,
        error: {
          code: 'NPM_ERROR',
          message: error.message,
          query: query
        }
      };
    }
  }

  /**
   * Recherche GitHub repositories
   * @param {string} query - Terme de recherche
   * @param {object} options - { limit, sort }
   * @returns {Promise<object>} Résultats GitHub
   */
  static async githubSearch(query, options = {}) {
    const { limit = 10, sort = 'stars' } = options;

    try {
      console.log(`🐙 [WebTools] GitHub: "${query}"`);

      const response = await axios.get(`https://api.github.com/search/repositories`, {
        params: {
          q: query,
          sort: sort,
          order: 'desc',
          per_page: limit
        },
        timeout: CONFIG.timeout,
        headers: {
          'User-Agent': CONFIG.userAgent,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const repos = response.data.items?.map(repo => ({
        name: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        topics: repo.topics?.slice(0, 5) || [],
        updated: repo.updated_at,
        license: repo.license?.name || null
      })) || [];

      console.log(`✅ [WebTools] GitHub: ${repos.length} repos trouvés`);

      return {
        success: true,
        query: query,
        total: response.data.total_count || 0,
        repositories: repos
      };

    } catch (error) {
      console.error(`❌ [WebTools] Erreur GitHub:`, error.message);

      return {
        success: false,
        error: {
          code: 'GITHUB_ERROR',
          message: error.message,
          query: query
        }
      };
    }
  }


  /**
   * Météo via wttr.in (gratuit, sans API key)
   * @param {string} location - Ville ou lieu
   * @param {object} options - { lang, format }
   * @returns {Promise<object>} Données météo
   */
  static async weather(location, options = {}) {
    const { lang = 'fr', format = 'j1' } = options;

    if (!location || location.trim().length < 2) {
      return {
        success: false,
        error: 'Location required (minimum 2 characters)'
      };
    }

    try {
      console.log(`🌤️ [WebTools] Météo: "${location}"`);

      // wttr.in API - format j1 = JSON compact
      const url = `https://wttr.in/${encodeURIComponent(location)}?format=${format}&lang=${lang}`;
      
      const response = await axios.get(url, {
        timeout: CONFIG.timeout,
        headers: {
          'User-Agent': CONFIG.userAgent,
          'Accept': 'application/json'
        }
      });

      const data = response.data;
      
      if (!data.current_condition || data.current_condition.length === 0) {
        return {
          success: false,
          error: 'Location not found or no weather data'
        };
      }

      const current = data.current_condition[0];
      const area = data.nearest_area?.[0];
      
      const result = {
        success: true,
        location: {
          name: area?.areaName?.[0]?.value || location,
          region: area?.region?.[0]?.value || null,
          country: area?.country?.[0]?.value || null
        },
        current: {
          temperature: current.temp_C + '°C',
          feelsLike: current.FeelsLikeC + '°C',
          humidity: current.humidity + '%',
          description: current.lang_fr?.[0]?.value || current.weatherDesc?.[0]?.value || 'N/A',
          windSpeed: current.windspeedKmph + ' km/h',
          windDirection: current.winddir16Point,
          visibility: current.visibility + ' km',
          uvIndex: current.uvIndex,
          cloudCover: current.cloudcover + '%'
        },
        forecast: []
      };

      // Ajouter prévisions si disponibles - avec noms de jours corrects (FIX 2025-12-08)
      if (data.weather && data.weather.length > 0) {
        const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

        result.forecast = data.weather.slice(0, 3).map(day => {
          // Calculer le vrai jour de la semaine à partir de la date YYYY-MM-DD
          const dateObj = new Date(day.date + 'T12:00:00');
          const jourNom = joursSemaine[dateObj.getDay()];
          const jourNum = dateObj.getDate();
          const mois = dateObj.toLocaleDateString('fr-CA', { month: 'long' });

          return {
            date: day.date,
            jour: `${jourNom} ${jourNum} ${mois}`,  // ex: "lundi 9 décembre"
            maxTemp: day.maxtempC + '°C',
            minTemp: day.mintempC + '°C',
            description: day.hourly?.[4]?.lang_fr?.[0]?.value || day.hourly?.[4]?.weatherDesc?.[0]?.value || 'N/A',
            chanceOfRain: day.hourly?.[4]?.chanceofrain + '%'
          };
        });
      }

      console.log(`✅ [WebTools] Météo OK: ${result.location.name}`);
      return result;

    } catch (error) {
      console.error(`❌ [WebTools] Erreur météo:`, error.message);
      
      return {
        success: false,
        error: {
          code: 'WEATHER_ERROR',
          message: error.message,
          location: location
        }
      };
    }
  }
}

module.exports = WebTools;
