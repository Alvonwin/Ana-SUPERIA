/**
 * ANA TIERED MEMORY SYSTEM - 3-Level Memory Architecture
 *
 * Implements human-like memory with different retention levels:
 * - PRIMARY (Working): Current session, in-memory, instant access
 * - SECONDARY (Recent): Last 24-48h, ChromaDB, fast semantic search
 * - TERTIARY (Archive): Older memories, compressed summaries
 *
 * Best Practices 2025:
 * - Source: https://www.pinecone.io/learn/memory-management-llm/
 * - Source: https://langchain.com/docs/memory/tiered_memory
 */

const { ChromaClient } = require('chromadb');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';

// Custom Ollama Embedding Function for ChromaDB v3.x
class OllamaEmbedder {
  constructor(model = 'nomic-embed-text') {
    this.model = model;
  }

  async generate(texts) {
    const embeddings = [];
    for (const text of texts) {
      try {
        const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
          model: this.model,
          prompt: text
        }, { timeout: 30000 });
        embeddings.push(response.data.embedding);
      } catch (error) {
        console.error('[OllamaEmbedder] Error:', error.message);
        // Return zero vector as fallback
        embeddings.push(new Array(768).fill(0));
      }
    }
    return embeddings;
  }
}

const embedder = new OllamaEmbedder('nomic-embed-text');

// Time boundaries (in milliseconds)
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const SECONDARY_CUTOFF = 2 * DAY;  // 48 hours
const ARCHIVE_BATCH_SIZE = 50;     // Compress 50 items at a time

class TieredMemory {
  constructor() {
    this.initialized = false;
    this.client = null;

    // PRIMARY MEMORY: In-memory, current session
    this.primary = {
      exchanges: [],       // Current conversation exchanges
      maxSize: 20,         // Keep last 20 exchanges in RAM
      sessionStart: null
    };

    // SECONDARY MEMORY: Recent (ChromaDB collection)
    this.secondaryCollection = null;
    this.secondaryName = 'ana_memory_recent';

    // TERTIARY MEMORY: Archive (ChromaDB collection, compressed)
    this.tertiaryCollection = null;
    this.tertiaryName = 'ana_memory_archive';

    // Stats
    this.stats = {
      primaryHits: 0,
      secondaryHits: 0,
      tertiaryHits: 0,
      compressions: 0
    };

    this.archivePath = path.join('E:', 'ANA', 'knowledge', 'memory_archive.json');
  }

  async initialize() {
    try {
      console.log('[TieredMemory] Initializing 3-level memory system...');

      // Connect to ChromaDB (updated syntax for chromadb v2.x+)
      this.client = new ChromaClient({
        host: 'localhost',
        port: 8000
      });

      // Create/get SECONDARY collection (recent memories)
      this.secondaryCollection = await this.client.getOrCreateCollection({
        name: this.secondaryName,
        embeddingFunction: embedder,
        metadata: {
          description: 'Recent memories (last 48h)',
          tier: 'secondary'
        }
      });

      // Create/get TERTIARY collection (archived, compressed)
      this.tertiaryCollection = await this.client.getOrCreateCollection({
        name: this.tertiaryName,
        embeddingFunction: embedder,
        metadata: {
          description: 'Archived compressed memories',
          tier: 'tertiary'
        }
      });

      // Initialize primary memory session
      this.primary.sessionStart = new Date().toISOString();

      this.initialized = true;
      console.log('[TieredMemory] 3-tier memory ready');

      // Run maintenance on startup
      await this.runMaintenance();

      return { success: true };
    } catch (error) {
      console.error('[TieredMemory] Init error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ================== PRIMARY MEMORY (Working Memory) ==================

  /**
   * Add to primary (session) memory - instant, in-RAM
   */
  addToPrimary(exchange) {
    const entry = {
      id: 'primary_' + Date.now(),
      timestamp: new Date().toISOString(),
      userMessage: exchange.userMessage,
      anaResponse: exchange.anaResponse,
      model: exchange.model,
      tier: 'primary'
    };

    this.primary.exchanges.push(entry);

    // Keep only last N exchanges in RAM
    if (this.primary.exchanges.length > this.primary.maxSize) {
      const overflow = this.primary.exchanges.shift();
      // Move overflow to secondary automatically
      this.promoteToSecondary(overflow).catch(err => {
        console.log('[TieredMemory] Promotion warning:', err.message);
      });
    }

    return entry;
  }

  /**
   * Get primary memory context (current session)
   */
  getPrimaryContext() {
    if (this.primary.exchanges.length === 0) return '';

    // Format last exchanges for context
    return this.primary.exchanges
      .slice(-5) // Last 5 exchanges
      .map(e => `Alain: ${e.userMessage}\nAna: ${e.anaResponse}`)
      .join('\n\n');
  }

  // ================== SECONDARY MEMORY (Recent) ==================

  /**
   * Promote from primary to secondary (ChromaDB)
   */
  async promoteToSecondary(exchange) {
    if (!this.secondaryCollection) return;

    try {
      const combinedText = `Alain: ${exchange.userMessage}\nAna: ${exchange.anaResponse}`;

      // Generate embeddings using Ollama
      const embeddingVectors = await embedder.generate([combinedText]);

      await this.secondaryCollection.add({
        ids: [exchange.id || 'exchange_' + Date.now()],
        documents: [combinedText],
        embeddings: embeddingVectors,
        metadatas: [{
          timestamp: exchange.timestamp || new Date().toISOString(),
          timestampMs: Date.now(),  // Numeric timestamp for ChromaDB $lt comparisons
          model: exchange.model || 'unknown',
          tier: 'secondary',
          userMessage: exchange.userMessage?.substring(0, 200),
          originalPrimaryId: exchange.id
        }]
      });
    } catch (error) {
      console.error('[TieredMemory] Promote to secondary error:', error.message);
    }
  }

  /**
   * Search secondary memory (recent 48h)
   */
  async searchSecondary(query, limit = 5) {
    if (!this.secondaryCollection) return [];

    try {
      // Generate query embedding
      const queryEmbedding = await embedder.generate([query]);

      const results = await this.secondaryCollection.query({
        queryEmbeddings: queryEmbedding,
        nResults: limit
      });

      this.stats.secondaryHits++;

      return results.documents?.[0]?.map((doc, i) => ({
        document: doc,
        metadata: results.metadatas?.[0]?.[i],
        distance: results.distances?.[0]?.[i],
        tier: 'secondary'
      })) || [];
    } catch (error) {
      console.error('[TieredMemory] Search secondary error:', error.message);
      return [];
    }
  }

  // ================== TERTIARY MEMORY (Archive) ==================

  /**
   * Archive old secondary memories to tertiary (compressed)
   */
  async archiveOldMemories() {
    if (!this.secondaryCollection || !this.tertiaryCollection) return;

    try {
      // Use numeric timestamp for ChromaDB $lt comparison (requires number, not string)
      const cutoffMs = Date.now() - SECONDARY_CUTOFF;

      // Get old items from secondary
      const oldItems = await this.secondaryCollection.get({
        where: {
          timestampMs: { $lt: cutoffMs }
        },
        limit: ARCHIVE_BATCH_SIZE
      });

      if (!oldItems.ids || oldItems.ids.length === 0) return { archived: 0 };

      // Compress and summarize old memories
      const summaries = await this.compressMemories(oldItems.documents);

      // Add summaries to tertiary with embeddings
      for (let i = 0; i < summaries.length; i++) {
        const embeddingVectors = await embedder.generate([summaries[i].summary]);
        await this.tertiaryCollection.add({
          ids: ['archive_' + Date.now() + '_' + i],
          documents: [summaries[i].summary],
          embeddings: embeddingVectors,
          metadatas: [{
            tier: 'tertiary',
            originalCount: summaries[i].originalCount,
            dateRange: summaries[i].dateRange,
            topics: JSON.stringify(summaries[i].topics),
            archivedAt: new Date().toISOString()
          }]
        });
      }

      // Remove from secondary
      await this.secondaryCollection.delete({
        ids: oldItems.ids
      });

      this.stats.compressions++;
      console.log(`[TieredMemory] Archived ${oldItems.ids.length} memories`);

      return { archived: oldItems.ids.length };
    } catch (error) {
      console.error('[TieredMemory] Archive error:', error.message);
      return { archived: 0, error: error.message };
    }
  }

  /**
   * Compress multiple memories into summaries using LLM
   */
  async compressMemories(documents) {
    if (!documents || documents.length === 0) return [];

    try {
      // Group documents (5 at a time for summarization)
      const groups = [];
      for (let i = 0; i < documents.length; i += 5) {
        groups.push(documents.slice(i, i + 5));
      }

      const summaries = [];

      for (const group of groups) {
        const combinedText = group.join('\n\n---\n\n');

        // Use PHI3 for summarization (fast + good at reasoning)
        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
          model: 'phi3:mini-128k',
          prompt: `Résume ces ${group.length} échanges de conversation en gardant les informations clés, préférences utilisateur, et décisions importantes. Sois concis mais complet.\n\nConversations:\n${combinedText}\n\nRésumé (en français):`,
          stream: false,
          options: { temperature: 0.3 }
        }, { timeout: 30000 });

        summaries.push({
          summary: response.data.response,
          originalCount: group.length,
          dateRange: 'archived',
          topics: this.extractTopics(combinedText)
        });
      }

      return summaries;
    } catch (error) {
      // Fallback: simple concatenation if LLM fails
      return [{
        summary: documents.slice(0, 3).join('\n---\n'),
        originalCount: documents.length,
        dateRange: 'archived',
        topics: []
      }];
    }
  }

  /**
   * Extract topics from text (simple keyword extraction)
   */
  extractTopics(text) {
    const keywords = ['code', 'bug', 'erreur', 'projet', 'fonction', 'api', 'image', 'fichier', 'test', 'ana', 'claude'];
    const textLower = text.toLowerCase();
    return keywords.filter(kw => textLower.includes(kw));
  }

  /**
   * Search tertiary memory (archived)
   */
  async searchTertiary(query, limit = 3) {
    if (!this.tertiaryCollection) return [];

    try {
      // Generate query embedding
      const queryEmbedding = await embedder.generate([query]);

      const results = await this.tertiaryCollection.query({
        queryEmbeddings: queryEmbedding,
        nResults: limit
      });

      this.stats.tertiaryHits++;

      return results.documents?.[0]?.map((doc, i) => ({
        document: doc,
        metadata: results.metadatas?.[0]?.[i],
        distance: results.distances?.[0]?.[i],
        tier: 'tertiary'
      })) || [];
    } catch (error) {
      console.error('[TieredMemory] Search tertiary error:', error.message);
      return [];
    }
  }

  // ================== UNIFIED SEARCH ==================

  /**
   * Search across all memory tiers
   * Priority: Primary > Secondary > Tertiary
   */
  async search(query, options = {}) {
    const {
      includePrimary = true,
      includeSecondary = true,
      includeTertiary = true,
      limit = 10
    } = options;

    const results = [];

    // 1. Primary (instant, in-memory)
    if (includePrimary) {
      const primaryMatches = this.searchPrimary(query);
      results.push(...primaryMatches.map(m => ({ ...m, tier: 'primary', priority: 1 })));
      this.stats.primaryHits++;
    }

    // 2. Secondary (recent, ChromaDB)
    if (includeSecondary) {
      const secondaryMatches = await this.searchSecondary(query, Math.ceil(limit / 2));
      results.push(...secondaryMatches.map(m => ({ ...m, priority: 2 })));
    }

    // 3. Tertiary (archive, compressed)
    if (includeTertiary && results.length < limit) {
      const tertiaryMatches = await this.searchTertiary(query, 3);
      results.push(...tertiaryMatches.map(m => ({ ...m, priority: 3 })));
    }

    // Sort by priority (lower = better) then by relevance
    results.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.distance || 0) - (b.distance || 0);
    });

    return results.slice(0, limit);
  }

  /**
   * Search primary memory (simple text match for session)
   */
  searchPrimary(query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);

    return this.primary.exchanges
      .filter(e => {
        const text = `${e.userMessage} ${e.anaResponse}`.toLowerCase();
        return queryWords.some(word => text.includes(word));
      })
      .map(e => ({
        document: `Alain: ${e.userMessage}\nAna: ${e.anaResponse}`,
        metadata: { timestamp: e.timestamp, model: e.model },
        tier: 'primary'
      }));
  }

  // ================== MEMORY OPERATIONS ==================

  /**
   * Add a new conversation exchange
   */
  async addExchange(exchange) {
    // Always add to primary first
    const entry = this.addToPrimary(exchange);

    // Also add to secondary for persistence
    await this.promoteToSecondary({
      ...exchange,
      id: entry.id,
      timestamp: entry.timestamp
    });

    return entry;
  }

  /**
   * Run maintenance tasks (archive old, cleanup)
   */
  async runMaintenance() {
    try {
      console.log('[TieredMemory] Running maintenance...');

      // Archive old secondary memories
      const archiveResult = await this.archiveOldMemories();

      // Log stats
      const secondaryCount = await this.getCollectionCount(this.secondaryCollection);
      const tertiaryCount = await this.getCollectionCount(this.tertiaryCollection);

      console.log(`[TieredMemory] Maintenance complete - Primary: ${this.primary.exchanges.length}, Secondary: ${secondaryCount}, Tertiary: ${tertiaryCount}`);

      return {
        success: true,
        archived: archiveResult.archived || 0,
        counts: {
          primary: this.primary.exchanges.length,
          secondary: secondaryCount,
          tertiary: tertiaryCount
        }
      };
    } catch (error) {
      console.error('[TieredMemory] Maintenance error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get collection document count
   */
  async getCollectionCount(collection) {
    if (!collection) return 0;
    try {
      const count = await collection.count();
      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      primary: {
        count: this.primary.exchanges.length,
        maxSize: this.primary.maxSize,
        sessionStart: this.primary.sessionStart
      },
      hits: this.stats,
      tierDescription: {
        primary: 'In-memory (current session)',
        secondary: 'ChromaDB (last 48h)',
        tertiary: 'ChromaDB (compressed archive)'
      }
    };
  }

  /**
   * Clear primary memory (session reset)
   */
  clearPrimary() {
    this.primary.exchanges = [];
    this.primary.sessionStart = new Date().toISOString();
    console.log('[TieredMemory] Primary memory cleared (new session)');
  }
}

module.exports = new TieredMemory();
