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
   * Get embedding for text (reuses semantic router's approach)
   */
  async getEmbedding(text) {
    try {
      const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
        model: 'nomic-embed-text',
        prompt: text.substring(0, 8000) // Limit input size
      }, { timeout: 10000 });

      return response.data.embedding;
    } catch (error) {
      return null;
    }
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

    // Select candidates within token budget
    const selected = [];
    let usedTokens = 0;
    const usedSources = new Set();

    for (const candidate of filteredCandidates) {
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
        // Recent conversation history
        allCandidates.push({
          content: source.data,
          source: 'conversation',
          timestamp: new Date().toISOString(),
          metadata: { type: 'recent' }
        });
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
