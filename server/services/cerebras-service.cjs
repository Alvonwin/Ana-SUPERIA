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

    const startTime = Date.now();
    try {
      this.stats.totalRequests++;

      // LOG DIAGNOSTIC 2025-12-16: Voir exactement ce qui est envoyé
      console.log(`[Cerebras] Sending ${tools ? tools.length : 0} tools, ${messages.length} messages`);
      if (tools && tools.length > 0) {
        console.log(`[Cerebras] Tool names: ${tools.map(t => t.function?.name).join(', ')}`);
      }

      // FIX 2025-12-16: Ajouter strict:true selon documentation officielle Cerebras
      // https://inference-docs.cerebras.ai/capabilities/tool-use
      // FIX 2025-12-20: Cerebras strict mode exige:
      // - TOUTES les propriétés dans required
      // FIX 2025-12-20: Simplifier le schema - ne garder QUE les propriétés required
      // Le pattern anyOf génère None (Python) au lieu de null (JSON) avec Llama
      const formattedTools = tools ? tools.map(tool => {
        const params = tool.function.parameters || { type: 'object', properties: {} };
        const properties = params.properties || {};
        const required = params.required || [];

        // Ne garder QUE les propriétés obligatoires
        const newProperties = {};

        for (const [key, prop] of Object.entries(properties)) {
          if (required.includes(key)) {
            // Propriété obligatoire - nettoyer (supprimer default)
            const cleanProp = {
              type: prop.type,
              description: prop.description
            };
            if (prop.enum) cleanProp.enum = prop.enum;
            newProperties[key] = cleanProp;
          }
          // Propriétés optionnelles ignorées - Llama ne les gère pas bien
        }

        // FIX 2025-12-20: Désactiver strict mode - Llama génère Python au lieu de JSON en strict
        return {
          type: 'function',
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: {
              type: 'object',
              properties: newProperties,
              required: required.length > 0 ? required : undefined
            }
          }
        };
      }) : undefined;

      // FIX 2025-12-20: Respecter limite stricte 5000 chars pour schemas Cerebras
      // Réduire automatiquement le nombre d'outils si nécessaire
      let finalTools = formattedTools;
      if (formattedTools && formattedTools.length > 0) {
        let schemaSize = JSON.stringify(formattedTools).length;
        const originalCount = formattedTools.length;

        // Limite stricte < 5000, pas ≤ 5000
        while (schemaSize >= 5000 && finalTools.length > 1) {
          finalTools = finalTools.slice(0, finalTools.length - 1);
          schemaSize = JSON.stringify(finalTools).length;
        }

        if (finalTools.length < originalCount) {
          console.log(`[Cerebras] Schema reduced: ${originalCount} → ${finalTools.length} tools (${schemaSize} chars)`);
        } else {
          console.log(`[Cerebras] Schema size: ${schemaSize} chars, ${finalTools.length} tools`);
        }
      }

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          tools: finalTools,
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

      // FIX 2025-12-20: Récupérer les tool_calls depuis failed_generation
      // Llama génère parfois Python au lieu de JSON, ex: describe_image(image_path=/tmp/test.jpg)
      const errorData = error.response?.data;

      if (errorData?.code === 'tool_use_failed' && errorData?.failed_generation) {
        const parsed = this.parsePythonToolCall(errorData.failed_generation);
        if (parsed) {
          console.log(`[Cerebras] Recovered tool_call from failed_generation: ${parsed.function.name}`);
          return {
            success: true,
            message: { tool_calls: [parsed] },
            tool_calls: [parsed],
            content: '',
            model: options.model || this.defaultModel,
            latencyMs: Date.now() - startTime,
            provider: 'cerebras',
            recovered: true
          };
        }
      }

      console.error('Cerebras error:', status || '', error.message);
      if (errorData) {
        console.error('Cerebras error details:', JSON.stringify(errorData, null, 2));
      }
      return {
        success: false,
        error: errorData?.error?.message || errorData?.message || error.message,
        provider: 'cerebras'
      };
    }
  }

  /**
   * Parse une syntaxe Python en tool_call JSON
   * Ex: describe_image(image_path=/tmp/test.jpg, prompt=None)
   * → { name: 'describe_image', arguments: '{"image_path": "/tmp/test.jpg"}' }
   */
  parsePythonToolCall(pythonStr) {
    if (!pythonStr || typeof pythonStr !== 'string') return null;

    // Pattern: function_name(arg1=val1, arg2=val2, ...)
    const match = pythonStr.match(/^(\w+)\((.*)\)$/s);
    if (!match) return null;

    const name = match[1];
    const argsStr = match[2].trim();

    if (!argsStr) {
      // Pas d'arguments
      return {
        id: Math.random().toString(36).substring(2, 11),
        type: 'function',
        function: { name, arguments: '{}' }
      };
    }

    // Parser les arguments key=value
    const args = {};
    // Gérer les valeurs avec guillemets et sans guillemets
    const argPattern = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^,\)]+))/g;
    let argMatch;

    while ((argMatch = argPattern.exec(argsStr)) !== null) {
      const key = argMatch[1];
      // Valeur: guillemets doubles, simples, ou sans guillemets
      let value = argMatch[2] ?? argMatch[3] ?? argMatch[4]?.trim();

      // Ignorer None/null
      if (value === 'None' || value === 'null') continue;

      args[key] = value;
    }

    return {
      id: Math.random().toString(36).substring(2, 11),
      type: 'function',
      function: {
        name,
        arguments: JSON.stringify(args)
      }
    };
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
