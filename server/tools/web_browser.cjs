/**
 * Web Browser Tool - Navigation web autonome
 *
 * ANA SUPERIA - Outil de navigation et scraping web
 *
 * Best Practices 2025:
 * - Fetch + Cheerio pour parsing léger
 * - Respecter robots.txt
 * - Rate limiting pour éviter ban
 * - Cache pour réduire requêtes
 * - Extraction de contenu pertinent
 *
 * Date: 25 Novembre 2025
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CACHE_DIR = path.join('E:', 'ANA', 'cache', 'web');
const CACHE_TTL = 3600000; // 1 hour in milliseconds
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Ana/1.0';
const RATE_LIMIT_MS = 1000; // 1 second between requests to same domain
const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB max

// Rate limiting tracker
const rateLimiter = new Map();

class WebBrowserTool {
  constructor() {
    this.cache = new Map();
    this.stats = {
      totalFetches: 0,
      cacheHits: 0,
      errors: 0
    };

    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  /**
   * Fetch a URL and return its content
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Object} - Fetch result
   */
  async fetch(url, options = {}) {
    const {
      useCache = true,
      extractText = true,
      maxLength = MAX_CONTENT_LENGTH,
      timeout = 30000
    } = options;

    this.stats.totalFetches++;

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      return { success: false, error: 'Invalid URL' };
    }

    // Check cache
    if (useCache) {
      const cached = this.getFromCache(url);
      if (cached) {
        this.stats.cacheHits++;
        return { success: true, cached: true, ...cached };
      }
    }

    // Rate limiting
    await this.waitForRateLimit(parsedUrl.hostname);

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout,
        maxContentLength: maxLength,
        responseType: 'text'
      });

      const result = {
        url,
        statusCode: response.status,
        contentType: response.headers['content-type'],
        contentLength: response.data.length,
        html: response.data,
        fetchedAt: new Date().toISOString()
      };

      // Extract text content if requested
      if (extractText) {
        result.text = this.extractText(response.data);
        result.title = this.extractTitle(response.data);
        result.links = this.extractLinks(response.data, url);
        result.headings = this.extractHeadings(response.data);
      }

      // Cache the result
      if (useCache) {
        this.saveToCache(url, result);
      }

      return { success: true, ...result };

    } catch (error) {
      this.stats.errors++;

      if (error.response) {
        return {
          success: false,
          statusCode: error.response.status,
          error: `HTTP ${error.response.status}: ${error.response.statusText}`
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract plain text from HTML
   */
  extractText(html) {
    // Remove scripts, styles, and other non-content elements
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Replace common elements with text equivalents
    text = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/li>/gi, '');

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Clean up whitespace
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return text;
  }

  /**
   * Extract page title
   */
  extractTitle(html) {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract links from HTML
   */
  extractLinks(html, baseUrl) {
    const links = [];
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      try {
        const href = match[1];
        const text = match[2].trim();

        // Resolve relative URLs
        const absoluteUrl = new URL(href, baseUrl).href;

        links.push({
          url: absoluteUrl,
          text: text || null
        });
      } catch (error) {
        // Skip invalid URLs
      }
    }

    return links;
  }

  /**
   * Extract headings from HTML
   */
  extractHeadings(html) {
    const headings = [];
    const headingRegex = /<h([1-6])[^>]*>([^<]*)<\/h\1>/gi;
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        text: match[2].trim()
      });
    }

    return headings;
  }

  /**
   * Search the web using DuckDuckGo HTML interface
   * @param {string} query - Search query
   * @param {Object} options - Search options
   */
  async search(query, options = {}) {
    const { maxResults = 10 } = options;

    // Using DuckDuckGo HTML for privacy
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const result = await this.fetch(searchUrl, { extractText: false });

    if (!result.success) {
      return result;
    }

    // Parse DuckDuckGo results
    const results = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi;

    let match;
    while ((match = resultRegex.exec(result.html)) !== null && results.length < maxResults) {
      results.push({
        url: match[1],
        title: match[2].trim()
      });
    }

    // Try to add snippets
    let snippetMatch;
    let i = 0;
    while ((snippetMatch = snippetRegex.exec(result.html)) !== null && i < results.length) {
      results[i].snippet = snippetMatch[1].trim();
      i++;
    }

    return {
      success: true,
      query,
      resultsCount: results.length,
      results
    };
  }

  /**
   * Read a specific article or page, extracting main content
   */
  async readArticle(url) {
    const result = await this.fetch(url);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      url,
      title: result.title,
      text: result.text,
      wordCount: result.text ? result.text.split(/\s+/).length : 0,
      headings: result.headings
    };
  }

  /**
   * Wait for rate limit
   */
  async waitForRateLimit(domain) {
    const lastRequest = rateLimiter.get(domain) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;

    if (timeSinceLastRequest < RATE_LIMIT_MS) {
      await new Promise(resolve =>
        setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest)
      );
    }

    rateLimiter.set(domain, Date.now());
  }

  /**
   * Get from cache
   */
  getFromCache(url) {
    // Memory cache first
    if (this.cache.has(url)) {
      const cached = this.cache.get(url);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      this.cache.delete(url);
    }

    // File cache
    const cacheFile = this.getCacheFileName(url);
    if (fs.existsSync(cacheFile)) {
      try {
        const stats = fs.statSync(cacheFile);
        if (Date.now() - stats.mtimeMs < CACHE_TTL) {
          const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
          this.cache.set(url, { data, timestamp: stats.mtimeMs });
          return data;
        }
        // Cache expired, delete
        fs.unlinkSync(cacheFile);
      } catch (error) {
        // Ignore cache errors
      }
    }

    return null;
  }

  /**
   * Save to cache
   */
  saveToCache(url, data) {
    // Memory cache
    this.cache.set(url, { data, timestamp: Date.now() });

    // File cache (without full HTML to save space)
    const cacheData = {
      url: data.url,
      title: data.title,
      text: data.text,
      links: data.links?.slice(0, 50), // Limit links
      headings: data.headings,
      fetchedAt: data.fetchedAt
    };

    const cacheFile = this.getCacheFileName(url);
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData), 'utf-8');
    } catch (error) {
      // Ignore cache write errors
    }
  }

  /**
   * Get cache file name for URL
   */
  getCacheFileName(url) {
    const hash = Buffer.from(url).toString('base64')
      .replace(/[/+=]/g, '_')
      .substring(0, 100);
    return path.join(CACHE_DIR, `${hash}.json`);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();

    try {
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
    } catch (error) {
      // Ignore errors
    }

    return { success: true, message: 'Cache cleared' };
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      hitRate: this.stats.totalFetches > 0
        ? ((this.stats.cacheHits / this.stats.totalFetches) * 100).toFixed(1) + '%'
        : 'N/A'
    };
  }
}

// Export singleton
const webBrowserTool = new WebBrowserTool();
module.exports = webBrowserTool;
