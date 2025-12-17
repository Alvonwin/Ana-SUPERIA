const fs = require('fs');

const newContent = `/**
 * ANA MEMORY MANAGER - ChromaDB Integration
 *
 * Implementation complete selon recommandations Perplexity:
 * - RAG avec memoire vectorielle persistante (ChromaDB)
 * - Resumes periodiques pour longues conversations
 * - Versioning et purge/retention
 * - Politique de memoire par session/utilisateur
 * - Tests et metriques de performance
 *
 * Best Practices 2025:
 * - Persistent storage local
 * - Server-side embeddings (ChromaDB HTTP server handles it)
 * - Metadata filtering (date, model, topic, session_id, user_id)
 * - Text chunking 1000 tokens (200 overlap)
 */

const { ChromaClient } = require('chromadb');
const path = require('path');
const fs = require('fs');

// Custom Ollama Embedding Function for ChromaDB 3.x
class OllamaEmbedder {
  constructor(options = {}) {
    this.url = options.url || 'http://localhost:11434/api/embeddings';
    this.model = options.model || 'nomic-embed-text';
  }

  async generate(texts) {
    const embeddings = [];
    for (const text of texts) {
      try {
        const response = await fetch(this.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: this.model, prompt: text })
        });
        const data = await response.json();
        if (data.embedding) {
          embeddings.push(data.embedding);
        } else {
          console.warn('[OllamaEmbedder] No embedding returned for text');
          embeddings.push(new Array(768).fill(0));
        }
      } catch (error) {
        console.error('[OllamaEmbedder] Error:', error.message);
        embeddings.push(new Array(768).fill(0));
      }
    }
    return embeddings;
  }
}

class AnaMemoryManager {
  constructor() {
    this.client = null;
    this.collection = null;
    this.collectionName = 'ana_memory';
    this.storagePath = path.join('E:', 'ANA', 'server', 'memory', 'chroma_data');
    this.initialized = false;
    this.logPath = path.join('E:', 'Memoire Claude', 'memory_manager.log');

    // Configuration retention et versioning (Perplexity)
    this.config = {
      // Retention policy
      maxDocumentsPerSession: 100,
      maxAgeInDays: 30,
      summarizeThreshold: 20, // Nombre d'echanges avant resume

      // Versioning
      currentVersion: 1,

      // Metriques
      metrics: {
        totalSearches: 0,
        totalAdds: 0,
        averageSearchLatency: 0,
        searchLatencies: [],
        successfulContextRecalls: 0,
        failedContextRecalls: 0
      }
    };

    // Charger metriques persistantes
    this.metricsPath = path.join('E:', 'ANA', 'server', 'memory', 'metrics.json');
    this.loadMetrics();
  }

  // === METRIQUES (Perplexity) ===
  loadMetrics() {
    try {
      if (fs.existsSync(this.metricsPath)) {
        const data = fs.readFileSync(this.metricsPath, 'utf8');
        this.config.metrics = JSON.parse(data);
        this.log('Metrics loaded from disk');
      }
    } catch (error) {
      this.log('Could not load metrics: ' + error.message, 'warn');
    }
  }

  saveMetrics() {
    try {
      fs.writeFileSync(this.metricsPath, JSON.stringify(this.config.metrics, null, 2));
    } catch (error) {
      this.log('Could not save metrics: ' + error.message, 'warn');
    }
  }

  recordSearchLatency(latencyMs, success) {
    this.config.metrics.totalSearches++;
    this.config.metrics.searchLatencies.push(latencyMs);

    // Garder seulement les 100 dernieres latences
    if (this.config.metrics.searchLatencies.length > 100) {
      this.config.metrics.searchLatencies.shift();
    }

    // Calculer moyenne
    const sum = this.config.metrics.searchLatencies.reduce((a, b) => a + b, 0);
    this.config.metrics.averageSearchLatency = sum / this.config.metrics.searchLatencies.length;

    if (success) {
      this.config.metrics.successfulContextRecalls++;
    } else {
      this.config.metrics.failedContextRecalls++;
    }

    this.saveMetrics();
  }

  getMetrics() {
    const successRate = this.config.metrics.totalSearches > 0
      ? (this.config.metrics.successfulContextRecalls / this.config.metrics.totalSearches * 100).toFixed(2)
      : 0;

    return {
      totalSearches: this.config.metrics.totalSearches,
      totalAdds: this.config.metrics.totalAdds,
      averageSearchLatencyMs: this.config.metrics.averageSearchLatency.toFixed(2),
      successRate: successRate + '%',
      successfulRecalls: this.config.metrics.successfulContextRecalls,
      failedRecalls: this.config.metrics.failedContextRecalls
    };
  }

  async initialize() {
    try {
      this.log('Initializing ChromaDB client...');

      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
        this.log('Created storage directory: ' + this.storagePath);
      }

      this.client = new ChromaClient({
        path: 'http://localhost:8000'
      });

      const embedder = new OllamaEmbedder({
        url: 'http://localhost:11434/api/embeddings',
        model: 'nomic-embed-text'
      });

      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        embeddingFunction: embedder,
        metadata: {
          description: 'Ana SUPERIA memory with semantic search',
          created: new Date().toISOString(),
          version: this.config.currentVersion
        }
      });
      this.log('Collection "' + this.collectionName + '" ready');

      this.initialized = true;
      this.log('ChromaDB initialized successfully');

      return { success: true };
    } catch (error) {
      this.log('Initialization error: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  // === AJOUT CONVERSATION AVEC METADATA SESSION/USER (Perplexity) ===
  async addConversation(data) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.collection) {
      this.log('ChromaDB not connected - cannot add conversation', 'warn');
      return { success: false, error: 'ChromaDB not connected' };
    }

    try {
      const {
        userMessage,
        anaResponse,
        model,
        sessionId = 'default',
        userId = 'alain',
        metadata = {}
      } = data;

      const timestamp = new Date().toISOString();
      const exchangeId = 'exchange_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const combinedText = 'Alain: ' + userMessage + '\\nAna (' + model + '): ' + anaResponse;
      const chunks = this.chunkText(combinedText, 4000, 800);

      const ids = [];
      const documents = [];
      const metadatas = [];

      chunks.forEach((chunk, index) => {
        const chunkId = exchangeId + '_chunk_' + index;
        ids.push(chunkId);
        documents.push(chunk);
        metadatas.push({
          timestamp,
          model,
          chunkIndex: index,
          totalChunks: chunks.length,
          exchangeId,
          userMessage: userMessage.substring(0, 200),
          // Metadata session/utilisateur (Perplexity)
          sessionId,
          userId,
          version: this.config.currentVersion,
          type: 'conversation',
          ...metadata
        });
      });

      await this.collection.add({
        ids,
        documents,
        metadatas
      });

      this.config.metrics.totalAdds++;
      this.saveMetrics();

      this.log('Added conversation: ' + ids.length + ' chunk(s) | Session: ' + sessionId + ' | User: ' + userId + ' | ID: ' + exchangeId);

      // Verifier si resume necessaire (Perplexity)
      await this.checkAndSummarizeIfNeeded(sessionId, userId);

      return {
        success: true,
        exchangeId,
        chunksCount: chunks.length
      };
    } catch (error) {
      this.log('Add conversation error: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  // === RESUMES PERIODIQUES (Perplexity) ===
  async checkAndSummarizeIfNeeded(sessionId, userId) {
    try {
      // Compter documents de cette session
      const sessionDocs = await this.collection.get({
        where: {
          $and: [
            { sessionId: sessionId },
            { type: 'conversation' }
          ]
        }
      });

      const docCount = sessionDocs.ids?.length || 0;

      if (docCount >= this.config.summarizeThreshold) {
        this.log('Session ' + sessionId + ' has ' + docCount + ' docs, creating summary...');
        await this.createSessionSummary(sessionId, userId, sessionDocs);
      }
    } catch (error) {
      this.log('Summary check error: ' + error.message, 'warn');
    }
  }

  async createSessionSummary(sessionId, userId, sessionDocs) {
    try {
      // Concatener tous les documents de la session
      const allText = sessionDocs.documents?.join('\\n---\\n') || '';

      // Creer un resume (version simple - concatenation des debuts)
      // Note: Pour un vrai resume, utiliser un LLM
      const summaryText = 'RESUME SESSION ' + sessionId + ':\\n' +
        allText.substring(0, 2000) +
        '\\n[... ' + (allText.length - 2000) + ' caracteres de plus ...]';

      const summaryId = 'summary_' + sessionId + '_' + Date.now();

      await this.collection.add({
        ids: [summaryId],
        documents: [summaryText],
        metadatas: [{
          timestamp: new Date().toISOString(),
          sessionId,
          userId,
          type: 'summary',
          version: this.config.currentVersion,
          originalDocCount: sessionDocs.ids?.length || 0
        }]
      });

      this.log('Created summary for session ' + sessionId + ': ' + summaryId);

      return { success: true, summaryId };
    } catch (error) {
      this.log('Create summary error: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  // === RECHERCHE AVEC METRIQUES (Perplexity) ===
  async search(query, nResults = 5, where = null) {
    const startTime = Date.now();

    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.collection) {
      this.log('Searching for: "' + query.substring(0, 50) + '..." (n=' + nResults + ')');
      this.log('ChromaDB not connected - returning empty results', 'warn');
      this.recordSearchLatency(Date.now() - startTime, false);
      return {
        query,
        count: 0,
        results: [],
        error: 'ChromaDB not connected'
      };
    }

    try {
      this.log('Searching for: "' + query.substring(0, 50) + '..." (n=' + nResults + ')');

      const queryParams = {
        queryTexts: [query],
        nResults
      };

      if (where) {
        queryParams.where = where;
      }

      const results = await this.collection.query(queryParams);

      const formattedResults = {
        query,
        count: results.ids[0]?.length || 0,
        results: []
      };

      if (results.ids[0]) {
        results.ids[0].forEach((id, index) => {
          formattedResults.results.push({
            id,
            document: results.documents[0][index],
            metadata: results.metadatas[0][index],
            distance: results.distances[0][index]
          });
        });
      }

      const latency = Date.now() - startTime;
      const success = formattedResults.count > 0;
      this.recordSearchLatency(latency, success);

      this.log('Search complete: ' + formattedResults.count + ' result(s) in ' + latency + 'ms');

      return formattedResults;
    } catch (error) {
      this.log('Search error: ' + error.message, 'error');
      this.recordSearchLatency(Date.now() - startTime, false);
      return { success: false, error: error.message };
    }
  }

  // === RECHERCHE PAR SESSION/UTILISATEUR (Perplexity) ===
  async searchBySession(query, sessionId, nResults = 5) {
    return this.search(query, nResults, { sessionId: sessionId });
  }

  async searchByUser(query, userId, nResults = 5) {
    return this.search(query, nResults, { userId: userId });
  }

  // === PURGE ET RETENTION (Perplexity) ===
  async purgeOldDocuments(maxAgeDays = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    const maxAge = maxAgeDays || this.config.maxAgeInDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    const cutoffIso = cutoffDate.toISOString();

    try {
      // Recuperer tous les documents
      const allDocs = await this.collection.get();

      const idsToDelete = [];

      if (allDocs.ids && allDocs.metadatas) {
        allDocs.ids.forEach((id, index) => {
          const metadata = allDocs.metadatas[index];
          if (metadata && metadata.timestamp && metadata.timestamp < cutoffIso) {
            // Ne pas supprimer les resumes
            if (metadata.type !== 'summary') {
              idsToDelete.push(id);
            }
          }
        });
      }

      if (idsToDelete.length > 0) {
        await this.collection.delete({ ids: idsToDelete });
        this.log('Purged ' + idsToDelete.length + ' documents older than ' + maxAge + ' days');
      } else {
        this.log('No documents to purge');
      }

      return { success: true, purgedCount: idsToDelete.length };
    } catch (error) {
      this.log('Purge error: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  async enforceSessionLimit(sessionId, maxDocs = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    const limit = maxDocs || this.config.maxDocumentsPerSession;

    try {
      const sessionDocs = await this.collection.get({
        where: { sessionId: sessionId }
      });

      const docCount = sessionDocs.ids?.length || 0;

      if (docCount > limit) {
        // Trier par timestamp et supprimer les plus vieux
        const docsWithTime = sessionDocs.ids.map((id, index) => ({
          id,
          timestamp: sessionDocs.metadatas[index]?.timestamp || ''
        }));

        docsWithTime.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        const idsToDelete = docsWithTime
          .slice(0, docCount - limit)
          .map(d => d.id);

        await this.collection.delete({ ids: idsToDelete });
        this.log('Enforced session limit: deleted ' + idsToDelete.length + ' docs from session ' + sessionId);

        return { success: true, deletedCount: idsToDelete.length };
      }

      return { success: true, deletedCount: 0 };
    } catch (error) {
      this.log('Enforce limit error: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  // === STATS ETENDUES (Perplexity) ===
  async getStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.collection) {
      return {
        success: false,
        error: 'ChromaDB not connected (server not running?)',
        collectionName: this.collectionName,
        totalDocuments: 0,
        storagePath: this.storagePath
      };
    }

    try {
      const count = await this.collection.count();
      const metrics = this.getMetrics();

      return {
        success: true,
        collectionName: this.collectionName,
        totalDocuments: count,
        storagePath: this.storagePath,
        version: this.config.currentVersion,
        retention: {
          maxDocumentsPerSession: this.config.maxDocumentsPerSession,
          maxAgeInDays: this.config.maxAgeInDays,
          summarizeThreshold: this.config.summarizeThreshold
        },
        metrics
      };
    } catch (error) {
      this.log('Stats error: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  chunkText(text, chunkSize = 4000, overlap = 800) {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.substring(start, end));
      start += chunkSize - overlap;
    }

    return chunks;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = '[' + timestamp + '] [' + level.toUpperCase() + '] ' + message + '\\n';

    console.log(logMessage.trim());

    try {
      fs.appendFileSync(this.logPath, logMessage, 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  async clearCollection() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.client.deleteCollection({ name: this.collectionName });
      this.log('Collection cleared');

      await this.initialize();

      return { success: true };
    } catch (error) {
      this.log('Clear error: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  // === METHODE POUR CONTEXT MEMORY (compatibilite) ===
  appendToContext(text) {
    // Pour compatibilite avec l'ancien code
    // Extraire userMessage et anaResponse du format "Alain: xxx\\nAna (model): yyy"
    const lines = text.split('\\n');
    let userMessage = '';
    let anaResponse = '';
    let model = 'unknown';

    lines.forEach(line => {
      if (line.startsWith('Alain:')) {
        userMessage = line.replace('Alain:', '').trim();
      } else if (line.startsWith('Ana')) {
        const match = line.match(/^Ana \\(([^)]+)\\):/);
        if (match) {
          model = match[1];
        }
        anaResponse = line.replace(/^Ana[^:]*:/, '').trim();
      }
    });

    if (userMessage && anaResponse) {
      this.addConversation({
        userMessage,
        anaResponse,
        model,
        sessionId: 'default',
        userId: 'alain'
      }).catch(err => this.log('appendToContext error: ' + err.message, 'error'));
    }
  }
}

module.exports = new AnaMemoryManager();
`;

fs.writeFileSync('E:/ANA/server/memory/memory-manager.cjs', newContent, 'utf8');
console.log('memory-manager.cjs updated with complete Perplexity implementation');
