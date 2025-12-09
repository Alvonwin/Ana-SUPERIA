/**
 * ANA CEREBRAS SERVICE - Ultra-Fast Cloud LLM API
 *
 * Cerebras provides the fastest inference (~1000 tokens/s)
 * Free tier: Unlimited requests!
 *
 * Models disponibles:
 * - llama3.1-8b (fastest, 8B params)
 * - llama3.1-70b (best quality, 70B params)
 */

const axios = require('axios');
const path = require('path');

// Load .env from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

class CerebrasService {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://api.cerebras.ai/v1';
    this.initialized = false;
    this.stats = {
      totalRequests: 0,
      totalTokens: 0,
      errors: 0
    };

    // Available models on Cerebras (free tier)
    this.models = {
      LLAMA_8B: 'llama3.1-8b',     // Fastest (~2000 tok/s)
      LLAMA_70B: 'llama3.1-70b'    // Best quality (~1000 tok/s)
    };

    this.defaultModel = this.models.LLAMA_8B;
  }

  initialize() {
    this.apiKey = process.env.CEREBRAS_API_KEY;

    if (!this.apiKey) {
      console.log('⚠️ CEREBRAS_API_KEY not found in .env - Cerebras service disabled');
      console.log('   Get free API key at: https://cloud.cerebras.ai/');
      return { success: false, error: 'CEREBRAS_API_KEY not configured' };
    }

    this.initialized = true;
    console.log('✅ Cerebras service initialized');
    return { success: true };
  }

  async chat(message, options = {}) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.apiKey) {
      return {
        success: false,
        error: 'Cerebras service not available - check API key'
      };
    }

    const {
      model = this.defaultModel,
      systemPrompt = "Tu es Ana, une IA française. Réponds toujours en français.",
      conversationHistory = [],
      temperature = 0.7,
      maxTokens = 4096
    } = options;

    try {
      this.stats.totalRequests++;
      const startTime = Date.now();

      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // Add conversation history
      if (conversationHistory.length > 0) {
        messages.push(...conversationHistory);
      }

      // Add current message
      messages.push({ role: 'user', content: message });

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data;
      const content = result.choices[0]?.message?.content || '';
      const latencyMs = Date.now() - startTime;

      // Update stats
      this.stats.totalTokens += result.usage?.total_tokens || 0;

      console.log(`⚡ Cerebras response (${model}): ${latencyMs}ms, ${result.usage?.total_tokens || 0} tokens`);

      return {
        success: true,
        response: content,
        model,
        latencyMs,
        usage: result.usage,
        provider: 'cerebras'
      };

    } catch (error) {
      this.stats.errors++;
      console.error('❌ Cerebras chat error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        provider: 'cerebras'
      };
    }
  }

  getModels() {
    return this.models;
  }

  getStats() {
    return {
      ...this.stats,
      initialized: this.initialized,
      defaultModel: this.defaultModel
    };
  }

  isAvailable() {
    return this.initialized && this.apiKey !== null;
  }
}

module.exports = new CerebrasService();
