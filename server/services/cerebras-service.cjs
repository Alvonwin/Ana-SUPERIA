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
const llmProfiles = require('../config/llm-profiles.cjs');

class CerebrasService {
  constructor() {
    this.apiKeys = [];  // Rotation de cles API
    this.currentKeyIndex = 0;
    this.baseUrl = 'https://api.cerebras.ai/v1';
    this.initialized = false;
    this.stats = {
      totalRequests: 0,
      totalTokens: 0,
      errors: 0,
      keyRotations: 0
    };

    // Available models on Cerebras (free tier)
    this.models = {
      LLAMA_8B: 'llama3.1-8b',
      LLAMA_70B: 'llama-3.3-70b',
      QWEN_235B: 'qwen-3-235b-a22b-instruct-2507'
    };

    this.defaultModel = this.models.LLAMA_70B;
  }

  initialize() {
    this.apiKeys = [];
    if (process.env.CEREBRAS_API_KEY) this.apiKeys.push(process.env.CEREBRAS_API_KEY);
    if (process.env.CEREBRAS_API_KEY_2) this.apiKeys.push(process.env.CEREBRAS_API_KEY_2);
    if (process.env.CEREBRAS_API_KEY_3) this.apiKeys.push(process.env.CEREBRAS_API_KEY_3);
    if (process.env.CEREBRAS_API_KEY_4) this.apiKeys.push(process.env.CEREBRAS_API_KEY_4);
    if (process.env.CEREBRAS_API_KEY_5) this.apiKeys.push(process.env.CEREBRAS_API_KEY_5);

    if (this.apiKeys.length === 0) {
      console.log('CEREBRAS_API_KEY not found - disabled');
      return { success: false, error: 'No API key' };
    }

    this.initialized = true;
    console.log('Cerebras: ' + this.apiKeys.length + ' API key(s) loaded');
    return { success: true };
  }

  get apiKey() { return this.apiKeys[this.currentKeyIndex] || null; }

  rotateKey() {
    if (this.apiKeys.length <= 1) return false;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    this.stats.keyRotations++;
    console.log('[Cerebras] Key rotation -> ' + (this.currentKeyIndex + 1));
    return true;
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
      systemPrompt = llmProfiles.getSystemPrompt(),
      conversationHistory = [],
      temperature = llmProfiles.ACTIVE_PROFILE.temperature,
      maxTokens = llmProfiles.ACTIVE_PROFILE.maxTokens
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
      let content = result.choices[0]?.message?.content || '';
      // Auto-fix common French errors
      content = content.replace(/puisage/gi, 'puis-je').replace(/aujourd'ener/gi, "aujourd'hui");
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
      const status = error.response?.status;

      // Auto-rotate key on rate limit (429) or auth error (401)
      if ((status === 429 || status === 401) && this.rotateKey()) {
        console.log(`🔄 Cerebras: Key rotated after ${status} error, retrying...`);
        return this.chat(message, options); // Retry with new key
      }

      console.error('❌ Cerebras chat error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        provider: 'cerebras'
      };
    }
  }

  /**
   * Chat avec support tool calling (OpenAI-compatible)
   * AJOUTE: 2025-12-15 - Support tools pour Ana SUPERIA
   */
  async chatWithTools(messages, tools, options = {}) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.apiKey) {
      return {
        success: false,
        error: 'Cerebras service not available - check API key',
        provider: 'cerebras'
      };
    }

    const {
      model = this.models.LLAMA_70B,  // 70B pour meilleure qualité
      temperature = 0.1,
      maxTokens = 4096
    } = options;

    try {
      this.stats.totalRequests++;
      const startTime = Date.now();

      // LOG DIAGNOSTIC 2025-12-16: Voir exactement ce qui est envoyé
      console.log(`[Cerebras] Sending ${tools ? tools.length : 0} tools, ${messages.length} messages`);
      if (tools && tools.length > 0) {
        console.log(`[Cerebras] Tool names: ${tools.map(t => t.function?.name).join(', ')}`);
      }

      // FIX 2025-12-16: Ajouter strict:true selon documentation officielle Cerebras
      // https://inference-docs.cerebras.ai/capabilities/tool-use
      const formattedTools = tools ? tools.map(tool => ({
        type: 'function',
        function: {
          ...tool.function,
          strict: true  // REQUIS par Cerebras
        }
      })) : undefined;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          tools: formattedTools,
          tool_choice: 'auto',
          parallel_tool_calls: false,  // Recommandé pour llama-3.3-70b
          temperature,
          max_tokens: maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000  // 2 minutes max
        }
      );

      const result = response.data;
      const msg = result.choices[0]?.message || {};
      const latencyMs = Date.now() - startTime;

      // Update stats
      this.stats.totalTokens += result.usage?.total_tokens || 0;

      console.log(`⚡ Cerebras tool-call (${model}): ${latencyMs}ms`);

      return {
        success: true,
        message: msg,
        tool_calls: msg.tool_calls || [],
        content: msg.content || '',
        model,
        latencyMs,
        usage: result.usage,
        provider: 'cerebras'
      };

    } catch (error) {
      this.stats.errors++;
      const status = error.response?.status;

      // Auto-rotate key on rate limit (429) or auth error (401)
      if ((status === 429 || status === 401) && this.rotateKey()) {
        console.log(`🔄 Cerebras: Key rotated after ${status} error, retrying...`);
        return this.chatWithTools(messages, tools, options);
      }

      console.error('Cerebras error:', status || '', error.message);
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
