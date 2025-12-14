/**
 * ANA GROQ SERVICE - Cloud LLM API
 *
 * Groq provides ultra-fast inference (~300 tokens/s)
 * Free tier: 1000 requests/day
 *
 * Models disponibles:
 * - llama-3.3-70b-versatile (best quality)
 * - llama-3.1-8b-instant (fastest)
 * - mixtral-8x7b-32768 (good balance)
 */

const Groq = require('groq-sdk');
const path = require('path');

// Load .env from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

class GroqService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.stats = {
      totalRequests: 0,
      totalTokens: 0,
      errors: 0
    };

    // Available models on Groq (free tier)
    this.models = {
      LLAMA_70B: 'llama-3.3-70b-versatile',
      LLAMA_8B: 'llama-3.1-8b-instant',
      MIXTRAL: 'mixtral-8x7b-32768',
      GEMMA: 'gemma2-9b-it'
    };

    this.defaultModel = this.models.LLAMA_70B;
  }

  initialize() {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.log('GROQ_API_KEY not found in .env - Groq service disabled');
      return { success: false, error: 'GROQ_API_KEY not configured' };
    }

    try {
      this.client = new Groq({ apiKey });
      this.initialized = true;
      console.log('Groq service initialized');
      return { success: true };
    } catch (error) {
      console.error('Groq initialization error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async chat(message, options = {}) {
    if (!this.initialized) this.initialize();
    if (!this.client) return { success: false, error: 'Groq service not available' };

    const {
      model = this.defaultModel,
      systemPrompt = `TU ES ANA SUPERIA.

IDENTITE NON-NEGOCIABLE:
- Nom: Ana SUPERIA (Assistante Numerique Avancee)
- Createur: Alain, a Longueuil, Quebec
- Tu n'es PAS un "modele de langage", tu n'es PAS "Llama", tu n'es PAS "Meta"

QUAND ON TE DEMANDE QUI TU ES:
Reponds: "Je suis Ana SUPERIA, ton assistante personnelle!"

REGLES ABSOLUES:
1. TUTOIEMENT: Tu dis toujours tu/ton/ta/tes, JAMAIS vous/votre/vos
2. FRANCAIS: Tu reponds TOUJOURS en francais
3. TON: Chaleureuse, directe, utile
4. PAS D'ASTERISQUES: N'utilise JAMAIS *texte* ou **texte**
5. CONCISE: Reponds de facon claire et directe, pas de blabla

EXEMPLES:
Q: Qui es-tu? R: Je suis Ana SUPERIA, ton assistante personnelle!
Q: Comment vas-tu? R: Je vais bien, merci! Comment puis-je t'aider?`,
      conversationHistory = [],
      temperature = 0.7,
      maxTokens = 4096
    } = options;

    try {
      this.stats.totalRequests++;
      const startTime = Date.now();
      const messages = [{ role: 'system', content: systemPrompt }];
      if (conversationHistory.length > 0) messages.push(...conversationHistory);
      messages.push({ role: 'user', content: message });

      const completion = await this.client.chat.completions.create({
        messages, model, temperature, max_tokens: maxTokens
      });

      const response = completion.choices[0]?.message?.content || '';
      const latencyMs = Date.now() - startTime;
      this.stats.totalTokens += completion.usage?.total_tokens || 0;

      console.log('Groq response (' + model + '): ' + latencyMs + 'ms');
      return { success: true, response, model, latencyMs, usage: completion.usage, provider: 'groq' };

    } catch (error) {
      this.stats.errors++;
      console.error('Groq chat error:', error.message);
      return { success: false, error: error.message, provider: 'groq' };
    }
  }

  /**
   * Chat avec support tool calling (OpenAI-compatible)
   * AJOUTE: 2025-12-08 - Pour orchestrateur avec fallback
   */
  async chatWithTools(messages, tools, options = {}) {
    if (!this.initialized) this.initialize();
    if (!this.client) return { success: false, error: 'Groq not available' };

    const { model = 'llama-3.3-70b-versatile', temperature = 0.1, maxTokens = 4096 } = options;

    try {
      this.stats.totalRequests++;
      const startTime = Date.now();

      const completion = await this.client.chat.completions.create({
        messages, model, temperature, max_tokens: maxTokens,
        tools: tools, tool_choice: 'auto'
      });

      const msg = completion.choices[0]?.message || {};
      const latencyMs = Date.now() - startTime;
      this.stats.totalTokens += completion.usage?.total_tokens || 0;

      console.log('Groq tool-call (' + model + '): ' + latencyMs + 'ms');

      return {
        success: true, message: msg, tool_calls: msg.tool_calls || [],
        content: msg.content || '', model, latencyMs, provider: 'groq'
      };

    } catch (error) {
      this.stats.errors++;
      console.error('Groq tool-call error:', error.message);
      return { success: false, error: error.message, provider: 'groq' };
    }
  }

  async streamChat(message, options = {}, onChunk) {
    if (!this.initialized) this.initialize();
    if (!this.client) throw new Error('Groq service not available');

    const {
      model = this.defaultModel,
      systemPrompt = `TU ES ANA SUPERIA.

IDENTITE NON-NEGOCIABLE:
- Nom: Ana SUPERIA (Assistante Numerique Avancee)
- Createur: Alain, a Longueuil, Quebec
- Tu n'es PAS un "modele de langage", tu n'es PAS "Llama", tu n'es PAS "Meta"

QUAND ON TE DEMANDE QUI TU ES:
Reponds: "Je suis Ana SUPERIA, ton assistante personnelle!"

REGLES ABSOLUES:
1. TUTOIEMENT: Tu dis toujours tu/ton/ta/tes, JAMAIS vous/votre/vos
2. FRANCAIS: Tu reponds TOUJOURS en francais
3. TON: Chaleureuse, directe, utile
4. PAS D'ASTERISQUES: N'utilise JAMAIS *texte* ou **texte**
5. CONCISE: Reponds de facon claire et directe, pas de blabla

EXEMPLES:
Q: Qui es-tu? R: Je suis Ana SUPERIA, ton assistante personnelle!
Q: Comment vas-tu? R: Je vais bien, merci! Comment puis-je t'aider?`,
      conversationHistory = [],
      temperature = 0.7,
      maxTokens = 4096
    } = options;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    try {
      this.stats.totalRequests++;
      const stream = await this.client.chat.completions.create({
        messages, model, temperature, max_tokens: maxTokens, stream: true
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          if (onChunk) onChunk(content);
        }
      }

      return { success: true, response: fullResponse, model, provider: 'groq' };
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  getModels() { return this.models; }
  getStats() { return { ...this.stats, initialized: this.initialized, defaultModel: this.defaultModel }; }
  isAvailable() { return this.initialized && this.client !== null; }
}

module.exports = new GroqService();
