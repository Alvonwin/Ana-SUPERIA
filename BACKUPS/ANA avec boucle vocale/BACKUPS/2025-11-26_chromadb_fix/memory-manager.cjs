/**
 * 💾 ANA MEMORY MANAGER - ChromaDB Integration
 *
 * Gère la mémoire sémantique d'Ana avec ChromaDB pour:
 * - Recherche vectorielle dans conversations
 * - RAG (Retrieval Augmented Generation)
 * - Mémoire à long terme avec embeddings
 *
 * Best Practices 2025:
 * - Persistent storage local
 * - Sentence Transformers embeddings
 * - Metadata filtering (date, model, topic)
 * - Text chunking 1000 tokens (200 overlap)
 *
 * Sources:
 * - https://dev.to/vaatiesther/how-to-perform-semantic-search-using-chromadb-in-javascript-3og8
 * - https://www.npmjs.com/package/chromadb
 * - https://devcenter.upsun.com/posts/store-embeddings-in-chroma-with-persistent-storage-nodejs-and-python-examples/
 */

const { ChromaClient } = require('chromadb');
const path = require('path');
const fs = require('fs');

class AnaMemoryManager {
  constructor() {
    this.client = null;
    this.collection = null;
    this.collectionName = 'ana_memory';
    this.storagePath = path.join('E:', 'ANA', 'server', 'memory', 'chroma_data');
    this.initialized = false;
    this.logPath = path.join('E:', 'Mémoire Claude', 'memory_manager.log');
  }

  /**
   * Initialise ChromaDB client et collection
   */
  async initialize() {
    try {
      this.log('🚀 Initializing ChromaDB client...');

      // Ensure storage directory exists
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
        this.log(`📁 Created storage directory: ${this.storagePath}`);
      }

      // Initialize ChromaClient with persistent storage
      this.client = new ChromaClient({
        path: this.storagePath
      });

      // Create or get collection
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName
        });
        this.log(`✅ Collection "${this.collectionName}" loaded`);
      } catch (error) {
        // Collection doesn't exist, create it
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: {
            description: 'Ana SUPERIA memory with semantic search',
            created: new Date().toISOString()
          }
        });
        this.log(`✅ Collection "${this.collectionName}" created`);
      }

      this.initialized = true;
      this.log('✅ ChromaDB initialized successfully');

      return { success: true };
    } catch (error) {
      this.log(`❌ Initialization error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Ajoute une conversation à la mémoire vectorielle
   *
   * @param {Object} data - Données de conversation
   * @param {string} data.userMessage - Message utilisateur
   * @param {string} data.anaResponse - Réponse Ana
   * @param {string} data.model - Modèle LLM utilisé
   * @param {Object} data.metadata - Métadonnées additionnelles
   */
  async addConversation(data) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const { userMessage, anaResponse, model, metadata = {} } = data;
      const timestamp = new Date().toISOString();

      // Create unique ID for this exchange
      const exchangeId = `exchange_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Combine user message and Ana response for embedding
      const combinedText = `Alain: ${userMessage}\nAna (${model}): ${anaResponse}`;

      // Chunk text if too long (max 1000 tokens ≈ 4000 chars)
      const chunks = this.chunkText(combinedText, 4000, 800);

      // Add all chunks to collection
      const ids = [];
      const documents = [];
      const metadatas = [];

      chunks.forEach((chunk, index) => {
        const chunkId = `${exchangeId}_chunk_${index}`;
        ids.push(chunkId);
        documents.push(chunk);
        metadatas.push({
          timestamp,
          model,
          chunkIndex: index,
          totalChunks: chunks.length,
          exchangeId,
          userMessage: userMessage.substring(0, 200), // First 200 chars for filtering
          ...metadata
        });
      });

      // Add to ChromaDB (embeddings generated automatically)
      await this.collection.add({
        ids,
        documents,
        metadatas
      });

      this.log(`💾 Added conversation: ${ids.length} chunk(s) | Model: ${model} | ID: ${exchangeId}`);

      return {
        success: true,
        exchangeId,
        chunksCount: chunks.length
      };
    } catch (error) {
      this.log(`❌ Add conversation error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Recherche sémantique dans la mémoire
   *
   * @param {string} query - Requête de recherche
   * @param {number} nResults - Nombre de résultats (default: 5)
   * @param {Object} where - Filtres metadata (ex: {model: 'phi3:mini-128k'})
   */
  async search(query, nResults = 5, where = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      this.log(`🔍 Searching for: "${query.substring(0, 50)}..." (n=${nResults})`);

      const queryParams = {
        queryTexts: [query],
        nResults
      };

      // Add metadata filters if provided
      if (where) {
        queryParams.where = where;
      }

      // Perform semantic search
      const results = await this.collection.query(queryParams);

      // Format results
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
            distance: results.distances[0][index] // Lower = more similar
          });
        });
      }

      this.log(`✅ Search complete: ${formattedResults.count} result(s)`);

      return formattedResults;
    } catch (error) {
      this.log(`❌ Search error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupère statistiques de la collection
   */
  async getStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const count = await this.collection.count();

      return {
        success: true,
        collectionName: this.collectionName,
        totalDocuments: count,
        storagePath: this.storagePath
      };
    } catch (error) {
      this.log(`❌ Stats error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Chunk text into smaller pieces with overlap
   * Best practice: 1000 tokens ≈ 4000 chars, 200 overlap ≈ 800 chars
   */
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

  /**
   * Log avec timestamp
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    console.log(logMessage.trim());

    try {
      fs.appendFileSync(this.logPath, logMessage, 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Nettoie la collection (use with caution!)
   */
  async clearCollection() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.client.deleteCollection({ name: this.collectionName });
      this.log('⚠️ Collection cleared');

      // Recreate collection
      await this.initialize();

      return { success: true };
    } catch (error) {
      this.log(`❌ Clear error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new AnaMemoryManager();
