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
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
        maxRedirects: 10,
        headers: {
          'User-Agent': CONFIG.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-CA,fr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.google.com/',
          'Cache-Control': 'no-cache'
        },
        responseType: 'text',
        decompress: true
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

      // Détection spécifique des erreurs de redirection
      let errorCode = error.response?.status || 'FETCH_ERROR';
      let errorMessage = error.message;

      if (error.code === 'ERR_FR_TOO_MANY_REDIRECTS' ||
          error.message.includes('redirect') ||
          error.message.includes('Redirected')) {
        errorCode = 'TOO_MANY_REDIRECTS';
        errorMessage = `Trop de redirections pour ${url}. Le site peut bloquer les requêtes automatisées.`;
        console.error(`⚠️ [WebTools] Site avec redirections excessives: ${url}`);
      }

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
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
    // FIX 2025-12-13: Utilise Open-Meteo (gratuit, fiable) au lieu de wttr.in (ECONNRESET)
    if (!location || location.trim().length < 2) {
      return {
        success: false,
        error: 'Location required (minimum 2 characters)'
      };
    }

    try {
      console.log(`🌤️ [WebTools] Météo Open-Meteo: "${location}"`);

      // Étape 1: Géocodage (nom -> coordonnées)
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=fr`;
      const geoResponse = await axios.get(geoUrl, { timeout: 10000 });

      if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
        return { success: false, error: 'Lieu non trouvé: ' + location };
      }

      const geo = geoResponse.data.results[0];
      const { latitude, longitude, name, admin1, country } = geo;

      // Étape 2: Météo actuelle + prévisions
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=3`;
      const weatherResponse = await axios.get(weatherUrl, { timeout: 10000 });
      const data = weatherResponse.data;

      // Codes météo WMO -> description française
      const weatherCodes = {
        0: 'Ciel dégagé', 1: 'Principalement dégagé', 2: 'Partiellement nuageux', 3: 'Nuageux',
        45: 'Brouillard', 48: 'Brouillard givrant',
        51: 'Bruine légère', 53: 'Bruine modérée', 55: 'Bruine dense',
        61: 'Pluie légère', 63: 'Pluie modérée', 65: 'Pluie forte',
        71: 'Neige légère', 73: 'Neige modérée', 75: 'Neige forte',
        80: 'Averses légères', 81: 'Averses modérées', 82: 'Averses violentes',
        95: 'Orage', 96: 'Orage avec grêle légère', 99: 'Orage avec grêle forte'
      };

      const result = {
        success: true,
        location: { name, region: admin1 || null, country: country || null },
        current: {
          temperature: Math.round(data.current.temperature_2m) + '°C',
          feelsLike: Math.round(data.current.apparent_temperature) + '°C',
          humidity: data.current.relative_humidity_2m + '%',
          description: weatherCodes[data.current.weather_code] || 'N/A',
          windSpeed: Math.round(data.current.wind_speed_10m) + ' km/h',
          windDirection: data.current.wind_direction_10m + '°'
        },
        forecast: []
      };

      // Prévisions 3 jours
      const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      if (data.daily && data.daily.time) {
        result.forecast = data.daily.time.map((date, i) => {
          const dateObj = new Date(date + 'T12:00:00');
          return {
            date,
            jour: `${joursSemaine[dateObj.getDay()]} ${dateObj.getDate()} ${dateObj.toLocaleDateString('fr-CA', { month: 'long' })}`,
            maxTemp: Math.round(data.daily.temperature_2m_max[i]) + '°C',
            minTemp: Math.round(data.daily.temperature_2m_min[i]) + '°C',
            description: weatherCodes[data.daily.weather_code[i]] || 'N/A',
            chanceOfRain: (data.daily.precipitation_probability_max[i] || 0) + '%'
          };
        });
      }

      console.log(`✅ [WebTools] Météo OK: ${result.location.name}`);
      return result;

    } catch (error) {
      console.error(`❌ [WebTools] Erreur météo:`, error.message);
      return {
        success: false,
        error: { code: 'WEATHER_ERROR', message: error.message, location }
      };
    }
  }
}

module.exports = WebTools;
