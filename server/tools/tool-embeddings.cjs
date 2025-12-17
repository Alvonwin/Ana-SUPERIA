/**
 * TOOL EMBEDDINGS - Semantic Tool Discovery pour Ana SUPERIA
 *
 * Source: https://www.rconnect.tech/blog/semantic-tool-discovery
 * Date: 15 Decembre 2025
 *
 * Indexe les 181 outils dans ChromaDB pour recherche semantique.
 * Utilise le meme pattern que memory-manager.cjs
 */

const { ChromaClient } = require('chromadb');

// TOOL_DEFINITIONS sera passé en paramètre pour éviter dépendance circulaire
let TOOL_DEFINITIONS = [];

// Meme OllamaEmbedder que memory-manager.cjs
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
          console.warn('[ToolEmbeddings] No embedding returned for:', text.substring(0, 50));
          embeddings.push(new Array(768).fill(0));
        }
      } catch (error) {
        console.error('[ToolEmbeddings] Embedding error:', error.message);
        embeddings.push(new Array(768).fill(0));
      }
    }
    return embeddings;
  }
}

class ToolEmbeddingsManager {
  constructor() {
    this.client = null;
    this.collection = null;
    this.collectionName = 'ana_tools_semantic';
    this.initialized = false;
    this.embedder = new OllamaEmbedder();
  }

  async initialize() {
    if (this.initialized) return { success: true };

    try {
      console.log('[ToolEmbeddings] Connecting to ChromaDB...');

      this.client = new ChromaClient({
        path: 'http://localhost:8000'
      });

      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        embeddingFunction: this.embedder,
        metadata: {
          description: 'Ana SUPERIA semantic tool discovery',
          created: new Date().toISOString()
        }
      });

      this.initialized = true;
      console.log('[ToolEmbeddings] Collection "' + this.collectionName + '" ready');

      return { success: true };
    } catch (error) {
      console.error('[ToolEmbeddings] Init error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Indexe tous les outils dans ChromaDB (indexation granulaire)
   * Pour chaque outil: nom+description, chaque parametre
   * @param {Array} tools - Les definitions d'outils (TOOL_DEFINITIONS)
   */
  async indexAllTools(tools = null) {
    // Utiliser les outils passés en paramètre ou ceux stockés
    const toolsToIndex = tools || TOOL_DEFINITIONS;
    if (!toolsToIndex || toolsToIndex.length === 0) {
      return { success: false, error: 'No tools provided' };
    }
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.collection) {
      return { success: false, error: 'ChromaDB not connected' };
    }

    try {
      console.log('[ToolEmbeddings] Starting indexation of', toolsToIndex.length, 'tools...');

      const ids = [];
      const documents = [];
      const metadatas = [];

      for (const tool of toolsToIndex) {
        const toolName = tool.function?.name || tool.name;
        const toolDesc = tool.function?.description || tool.description || '';
        const params = tool.function?.parameters?.properties || {};

        // 1. Embedding pour nom + description de l'outil
        const toolId = 'tool_' + toolName;
        const toolDoc = toolName + ' - ' + toolDesc;

        ids.push(toolId);
        documents.push(toolDoc);
        metadatas.push({
          tool_name: toolName,
          type: 'tool',
          indexed_at: new Date().toISOString()
        });

        // 2. Embedding pour chaque parametre
        for (const [paramName, paramInfo] of Object.entries(params)) {
          const paramDesc = paramInfo.description || '';
          const paramId = 'param_' + toolName + '_' + paramName;
          const paramDoc = toolName + ' parameter ' + paramName + ': ' + paramDesc;

          ids.push(paramId);
          documents.push(paramDoc);
          metadatas.push({
            tool_name: toolName,
            param_name: paramName,
            type: 'parameter',
            indexed_at: new Date().toISOString()
          });
        }
      }

      // Supprimer anciens documents si existent
      try {
        const existing = await this.collection.count();
        if (existing > 0) {
          console.log('[ToolEmbeddings] Clearing', existing, 'existing entries...');
          const allIds = await this.collection.get();
          if (allIds.ids && allIds.ids.length > 0) {
            await this.collection.delete({ ids: allIds.ids });
          }
        }
      } catch (e) {
        // Ignore if collection is empty
      }

      // Ajouter les nouveaux documents
      console.log('[ToolEmbeddings] Adding', ids.length, 'entries (tools + parameters)...');

      // Ajouter par batches de 50 pour eviter timeout
      const batchSize = 50;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        const batchDocs = documents.slice(i, i + batchSize);
        const batchMetas = metadatas.slice(i, i + batchSize);

        await this.collection.add({
          ids: batchIds,
          documents: batchDocs,
          metadatas: batchMetas
        });

        console.log('[ToolEmbeddings] Indexed batch', Math.floor(i / batchSize) + 1, '/', Math.ceil(ids.length / batchSize));
      }

      console.log('[ToolEmbeddings] Indexation complete:', ids.length, 'entries');

      return {
        success: true,
        toolsCount: toolsToIndex.length,
        entriesCount: ids.length
      };
    } catch (error) {
      console.error('[ToolEmbeddings] Indexation error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Recherche semantique des outils pertinents pour une requete
   * @param {string} query - La requete utilisateur
   * @param {number} topN - Nombre max de resultats
   * @returns {Object} - { tools: string[], results: Array }
   */
  async searchTools(query, topN = 10) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.collection) {
      console.warn('[ToolEmbeddings] ChromaDB not connected');
      return { tools: [], results: [] };
    }

    try {
      console.log('[ToolEmbeddings] Searching for:', query.substring(0, 50) + '...');

      const results = await this.collection.query({
        queryTexts: [query],
        nResults: topN * 2  // Plus de resultats car on deduplique ensuite
      });

      // Extraire les noms d'outils uniques
      const toolNames = new Set();
      const formattedResults = [];

      if (results.ids[0]) {
        results.ids[0].forEach((id, index) => {
          const metadata = results.metadatas[0][index];
          const toolName = metadata.tool_name;

          toolNames.add(toolName);

          formattedResults.push({
            id,
            tool_name: toolName,
            type: metadata.type,
            document: results.documents[0][index],
            distance: results.distances[0][index]
          });
        });
      }

      const uniqueTools = Array.from(toolNames).slice(0, topN);

      console.log('[ToolEmbeddings] Found', uniqueTools.length, 'unique tools');

      return {
        tools: uniqueTools,
        results: formattedResults
      };
    } catch (error) {
      console.error('[ToolEmbeddings] Search error:', error.message);
      return { tools: [], results: [], error: error.message };
    }
  }

  /**
   * Retourne les stats de la collection
   */
  async getStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.collection) {
      return { success: false, error: 'ChromaDB not connected' };
    }

    try {
      const count = await this.collection.count();
      return {
        success: true,
        collectionName: this.collectionName,
        entriesCount: count,
        toolsCount: TOOL_DEFINITIONS.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
const toolEmbeddings = new ToolEmbeddingsManager();

module.exports = {
  ToolEmbeddingsManager,
  toolEmbeddings,
  indexAllTools: () => toolEmbeddings.indexAllTools(),
  searchTools: (query, topN) => toolEmbeddings.searchTools(query, topN),
  getStats: () => toolEmbeddings.getStats()
};
