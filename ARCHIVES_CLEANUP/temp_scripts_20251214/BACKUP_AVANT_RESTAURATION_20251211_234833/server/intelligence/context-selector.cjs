/**
 * ANA CONTEXT SELECTOR - Intelligent Context Selection
 *
 * Selects the most relevant context for each query to maximize
 * LLM performance while staying within token limits
 *
 * Features:
 * - Semantic relevance scoring
 * - Token budget management
 * - Recency weighting
 * - Source diversity
 *
 * Best Practices 2025:
 * - Source: https://blog.langchain.dev/context-selection/
 * - Source: RAG optimization patterns
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OLLAMA_URL = 'http://localhost:11434';

// ================== QWEN3 RAG 2-STAGE CONFIG (6 Dec 2025) ==================
// Best-in-class models for RAG pipeline
// Source: https://huggingface.co/spaces/mteb/leaderboard (Qwen3 #1 multilingual)
const RAG_MODELS = {
  EMBEDDING: 'dengcao/Qwen3-Embedding-8B:Q5_K_M',    // #1 MTEB multilingual (70.58)
  RERANKER: 'dengcao/Qwen3-Reranker-4B:Q5_K_M',     // Cross-encoder +31% precision
  FALLBACK_EMBED: 'nomic-embed-text'                // Fallback if Qwen3 unavailable
};

// Reranking configuration
const RERANK_CONFIG = {
  initialRetrieve: 20,    // First stage: get top 20 by cosine similarity
  finalSelect: 5,         // Second stage: rerank to top 5
  enabled: true           // Enable 2-stage RAG
};

// Token budget configuration (approximate)
const TOKEN_LIMITS = {
  'phi3:mini-128k': 128000,
  'deepseek-coder-v2:16b-lite-instruct-q4_K_M': 16384,
  'qwen2.5-coder:7b': 32768,
  'llama3.2-vision:11b': 8192
};

const DEFAULT_CONTEXT_BUDGET = 4000; // tokens reserved for context
const CHARS_PER_TOKEN = 4; // approximate

class ContextSelector {
  constructor() {
    this.initialized = false;
    this.stats = {
      totalSelections: 0,
      avgContextSize: 0,
      truncations: 0,
      sourceDistribution: {}
    };
  }

  async initialize() {
    try {
      this.initialized = true;
      console.log('[ContextSelector] Initialized');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get embedding for text using Qwen3-Embedding (best-in-class 2025)
   * Falls back to nomic-embed-text if Qwen3 unavailable
   */
  async getEmbedding(text, useQwen3 = true) {
    const model = useQwen3 ? RAG_MODELS.EMBEDDING : RAG_MODELS.FALLBACK_EMBED;

    try {
      const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
        model: model,
        prompt: text.substring(0, 8000) // Limit input size
      }, { timeout: 15000 }); // Increased timeout for larger model

      return response.data.embedding;
    } catch (error) {
      // Fallback to nomic-embed-text if Qwen3 fails
      if (useQwen3) {
        console.log('[ContextSelector] Qwen3-Embedding fallback to nomic-embed-text');
        return this.getEmbedding(text, false);
      }
      return null;
    }
  }

  /**
   * Rerank candidates using Qwen3-Reranker (cross-encoder)
   * Source: https://huggingface.co/Qwen/Qwen3-Reranker-4B
   *
   * @param {string} query - The user's query
   * @param {Array} candidates - Pre-filtered candidates from embedding similarity
   * @returns {Array} - Reranked candidates with rerank scores
   */
  async rerankCandidates(query, candidates) {
    if (!RERANK_CONFIG.enabled || candidates.length === 0) {
      return candidates;
    }

    console.log(`[RAG 2-Stage] Reranking ${candidates.length} candidates with Qwen3-Reranker`);

    const reranked = [];

    for (const candidate of candidates) {
      try {
        // Cross-encoder: score query-document pair directly
        // The reranker model expects a specific prompt format
        const prompt = `Query: ${query}\n\nDocument: ${candidate.content.substring(0, 2000)}\n\nIs this document relevant to the query? Rate from 0 to 1:`;

        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
          model: RAG_MODELS.RERANKER,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0,       // Deterministic scoring
            num_predict: 10,      // Short response (just the score)
            stop: ['\n']          // Stop after first line
          }
        }, { timeout: 10000 });

        // Parse relevance score from response
        const responseText = response.data.response || '';
        const scoreMatch = responseText.match(/([0-9]*\.?[0-9]+)/);
        const rerankScore = scoreMatch ? parseFloat(scoreMatch[1]) : 0.5;

        reranked.push({
          ...candidate,
          rerankScore: Math.min(1, Math.max(0, rerankScore)), // Clamp to [0,1]
          originalScore: candidate.combinedScore
        });
      } catch (error) {
        // Keep original score if reranking fails for this item
        reranked.push({
          ...candidate,
          rerankScore: candidate.combinedScore,
          originalScore: candidate.combinedScore
        });
      }
    }

    // Sort by rerank score (highest first)
    reranked.sort((a, b) => b.rerankScore - a.rerankScore);

    console.log(`[RAG 2-Stage] Reranking complete. Top score: ${reranked[0]?.rerankScore?.toFixed(3) || 'N/A'}`);

    return reranked;
  }

  /**
   * Calculate cosine similarity
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate recency score (exponential decay)
   * Recent = higher score, old = lower score
   */
  recencyScore(timestamp) {
    if (!timestamp) return 0.5;

    const now = Date.now();
    const age = now - new Date(timestamp).getTime();
    const hoursOld = age / (1000 * 60 * 60);

    // Exponential decay: 1.0 for now, ~0.5 after 24h, ~0.25 after 48h
    return Math.exp(-hoursOld / 24);
  }

  /**
   * Estimate token count from text
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Select optimal context for a query
   *
   * @param {string} query - The user's query
   * @param {Array} candidates - Array of context candidates
   *   Each candidate: { content, source, timestamp, metadata }
   * @param {Object} options - Selection options
   *   - model: LLM model name
   *   - tokenBudget: Max tokens for context
   *   - diversitySources: Ensure variety in sources
   *   - minRelevance: Minimum relevance threshold
   */
  async selectContext(query, candidates, options = {}) {
    const {
      model = 'phi3:mini-128k',
      tokenBudget = DEFAULT_CONTEXT_BUDGET,
      diversitySources = true,
      minRelevance = 0.3
    } = options;

    this.stats.totalSelections++;

    if (!candidates || candidates.length === 0) {
      return {
        context: '',
        selected: [],
        stats: { candidatesCount: 0, selectedCount: 0, totalTokens: 0 }
      };
    }

    // Get query embedding for semantic scoring
    const queryEmbedding = await this.getEmbedding(query);

    // Score each candidate
    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate, index) => {
        // Semantic relevance score
        let relevanceScore = 0;
        if (queryEmbedding) {
          const candidateEmbedding = await this.getEmbedding(candidate.content);
          relevanceScore = this.cosineSimilarity(queryEmbedding, candidateEmbedding);
        } else {
          // Fallback: keyword matching
          const queryWords = query.toLowerCase().split(/\s+/);
          const contentLower = candidate.content.toLowerCase();
          const matches = queryWords.filter(w => w.length > 3 && contentLower.includes(w));
          relevanceScore = matches.length / Math.max(queryWords.length, 1);
        }

        // Recency score
        const recency = this.recencyScore(candidate.timestamp);

        // Source diversity bonus (new sources get slight boost)
        const source = candidate.source || 'unknown';
        const sourceBonux = this.stats.sourceDistribution[source] ? 0 : 0.1;

        // Combined score (weighted average)
        const combinedScore = (
          relevanceScore * 0.6 +   // Relevance is most important
          recency * 0.3 +          // Recency matters
          sourceBonux * 0.1        // Diversity bonus
        );

        return {
          ...candidate,
          index,
          relevanceScore,
          recencyScore: recency,
          combinedScore,
          tokens: this.estimateTokens(candidate.content)
        };
      })
    );

    // Filter by minimum relevance
    const filteredCandidates = scoredCandidates.filter(c => c.combinedScore >= minRelevance);

    // Sort by combined score (highest first)
    filteredCandidates.sort((a, b) => b.combinedScore - a.combinedScore);

    // ================== RAG 2-STAGE: RERANKING (6 Dec 2025) ==================
    // Step 1: Take top N candidates from embedding similarity
    // Step 2: Rerank with cross-encoder for higher precision
    let candidatesForSelection = filteredCandidates;

    if (RERANK_CONFIG.enabled && filteredCandidates.length > RERANK_CONFIG.finalSelect) {
      // Get top candidates for reranking (Stage 1)
      const topCandidates = filteredCandidates.slice(0, RERANK_CONFIG.initialRetrieve);

      // Rerank with Qwen3-Reranker (Stage 2)
      const rerankedCandidates = await this.rerankCandidates(query, topCandidates);

      // Use reranked results for final selection
      candidatesForSelection = rerankedCandidates;

      console.log(`[RAG 2-Stage] Pipeline: ${filteredCandidates.length} → ${topCandidates.length} → reranked`);
    }

    // Select candidates within token budget
    const selected = [];
    let usedTokens = 0;
    const usedSources = new Set();

    for (const candidate of candidatesForSelection) {
      // Check if adding this would exceed budget
      if (usedTokens + candidate.tokens > tokenBudget) {
        // Check if we can truncate to fit
        const remainingTokens = tokenBudget - usedTokens;
        if (remainingTokens > 100) {
          // Truncate content to fit
          const truncatedLength = remainingTokens * CHARS_PER_TOKEN;
          const truncatedContent = candidate.content.substring(0, truncatedLength) + '...';
          selected.push({
            ...candidate,
            content: truncatedContent,
            tokens: remainingTokens,
            truncated: true
          });
          usedTokens = tokenBudget;
          this.stats.truncations++;
        }
        break;
      }

      // Diversity check: limit items from same source
      if (diversitySources && usedSources.has(candidate.source)) {
        const sameSourceCount = selected.filter(s => s.source === candidate.source).length;
        if (sameSourceCount >= 3) continue; // Max 3 from same source
      }

      selected.push(candidate);
      usedTokens += candidate.tokens;
      usedSources.add(candidate.source);

      // Update source distribution
      this.stats.sourceDistribution[candidate.source] =
        (this.stats.sourceDistribution[candidate.source] || 0) + 1;
    }

    // Build final context string
    const contextParts = selected.map((item, idx) => {
      const sourceLabel = item.source ? `[${item.source}]` : '';
      const dateLabel = item.timestamp ?
        `(${new Date(item.timestamp).toLocaleDateString('fr-FR')})` : '';
      return `${sourceLabel}${dateLabel}\n${item.content}`;
    });

    const finalContext = contextParts.join('\n\n---\n\n');

    // Update stats
    this.stats.avgContextSize = (
      (this.stats.avgContextSize * (this.stats.totalSelections - 1) + usedTokens) /
      this.stats.totalSelections
    );

    return {
      context: finalContext,
      selected: selected.map(s => ({
        source: s.source,
        relevance: s.relevanceScore,
        recency: s.recencyScore,
        combined: s.combinedScore,
        tokens: s.tokens,
        truncated: s.truncated || false
      })),
      stats: {
        candidatesCount: candidates.length,
        filteredCount: filteredCandidates.length,
        selectedCount: selected.length,
        totalTokens: usedTokens,
        tokenBudget: tokenBudget
      }
    };
  }

  /**
   * Build context from multiple sources
   */
  async buildContext(query, sources, options = {}) {
    // Collect candidates from all sources
    const allCandidates = [];

    // Guard: ensure sources is an array
    if (!sources || !Array.isArray(sources)) {
      return this.selectContext(query, allCandidates, options);
    }

    for (const source of sources) {
      // Guard: skip invalid sources
      if (!source || !source.type || !source.data) continue;

      if (source.type === 'memory' && Array.isArray(source.data)) {
        // ChromaDB results
        for (const item of source.data) {
          allCandidates.push({
            content: item.document || item.content,
            source: 'memory',
            timestamp: item.metadata?.timestamp,
            metadata: item.metadata
          });
        }
      } else if (source.type === 'conversation' && source.data) {
        // Recent conversation history - SPLIT by messages for better RAG (6 Dec 2025)
        // Each message becomes a separate candidate for semantic matching
        const conversationText = source.data;

        // Split by message markers (## Alain: or ## Ana:)
        const messagePattern = /##\s*(Alain|Ana):\s*/gi;
        const messages = conversationText.split(messagePattern).filter(m => m.trim());

        // Group messages in pairs (question + response) for context
        for (let i = 0; i < messages.length - 1; i += 2) {
          const speaker = messages[i];
          const content = messages[i + 1];

          if (content && content.trim().length > 10) {
            // Create meaningful chunks (max 500 chars each for efficient RAG)
            const chunkSize = 500;
            if (content.length > chunkSize) {
              // Split long messages into chunks
              for (let j = 0; j < content.length; j += chunkSize) {
                allCandidates.push({
                  content: `${speaker}: ${content.substring(j, j + chunkSize)}`,
                  source: 'conversation',
                  timestamp: new Date().toISOString(),
                  metadata: { type: 'conversation_chunk', speaker }
                });
              }
            } else {
              allCandidates.push({
                content: `${speaker}: ${content}`,
                source: 'conversation',
                timestamp: new Date().toISOString(),
                metadata: { type: 'conversation_message', speaker }
              });
            }
          }
        }

        console.log(`[ContextSelector] Split conversation into ${allCandidates.filter(c => c.source === 'conversation').length} message chunks`);
      } else if (source.type === 'skills' && Array.isArray(source.data)) {
        // Learned skills context
        for (const skill of source.data) {
          if (skill && skill.name) {
            allCandidates.push({
              content: `Skill: ${skill.name} - ${skill.description || ''}`,
              source: 'skills',
              timestamp: skill.learnedAt,
              metadata: skill
            });
          }
        }
      } else if (source.type === 'skills_knowledge' && source.data) {
        // Skills knowledge base (formatted string) - Phase 2 - 30 Nov 2025
        allCandidates.push({
          content: source.data,
          source: 'skills_knowledge',
          timestamp: new Date().toISOString(),
          metadata: { type: 'skills_knowledge' }
        });
      } else if (source.type === 'custom') {
        // Custom context provided directly
        allCandidates.push({
          content: source.data,
          source: source.name || 'custom',
          timestamp: source.timestamp,
          metadata: source.metadata
        });
      } else if (typeof source.data === 'string') {
        // Catch-all for any string data (langchain_web, bash_output, etc.)
        allCandidates.push({
          content: source.data,
          source: source.type || 'unknown',
          timestamp: new Date().toISOString(),
          metadata: { type: source.type }
        });
      }
    }

    return this.selectContext(query, allCandidates, options);
  }

  /**
   * Get context selection stats
   */
  getStats() {
    return {
      initialized: this.initialized,
      ...this.stats
    };
  }

  /**
   * Clear stats
   */
  clearStats() {
    this.stats = {
      totalSelections: 0,
      avgContextSize: 0,
      truncations: 0,
      sourceDistribution: {}
    };
  }
}

module.exports = new ContextSelector();
