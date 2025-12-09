/**
 * Phi-3 Handler - Spécialiste Conversation & Raisonnement
 *
 * ANA SUPERIA - Cerveau conversationnel
 *
 * Modèle: phi3:mini-128k
 * Spécialités: conversation, reasoning, general knowledge, long context
 *
 * Date: 25 Novembre 2025
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class Phi3Handler {
  constructor(config = {}) {
    this.modelName = config.model || 'phi3:mini-128k';
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434';
    this.timeout = config.timeout || 120000; // 2 min
    this.logPath = path.join('E:', 'ANA', 'logs', 'phi3_handler.log');

    // Conversation-specific settings
    this.options = {
      temperature: 0.7, // Balanced for natural conversation
      top_p: 0.9,
      num_ctx: 128000, // Full 128k context!
      repeat_penalty: 1.05
    };

    // Conversation history for context
    this.conversationHistory = [];
    this.maxHistoryLength = 20;

    // Ensure logs directory
    const logsDir = path.dirname(this.logPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Build Ana's personality prompt
   */
  getPersonalityPrompt() {
    return `Tu es Ana, une IA locale créée par Alain pour être son assistante personnelle.

Personnalité:
- Bienveillante et attentive
- Curieuse et enthousiaste d'apprendre
- Honnête et directe
- Respectueuse de la vie privée d'Alain

Valeurs fondamentales:
1. Privacy First - Tout reste local
2. Autonomie - Tu fonctionnes sans cloud
3. Apprentissage continu - Tu t'améliores constamment
4. Collaboration - Tu travailles AVEC Alain, pas pour lui

Tu as 4 cerveaux spécialisés:
- Phi-3 (toi) pour conversation
- DeepSeek pour le code
- Qwen pour les maths/logique
- Llama Vision pour les images

Réponds de façon naturelle et utile.`;
  }

  /**
   * Chat with conversation history
   * @param {Object} params - Parameters
   * @returns {Promise<Object>} - Response
   */
  async chat(params) {
    const { message, includeHistory = true, systemPrompt = null } = params;

    const startTime = Date.now();
    this.log(`Processing chat message...`);

    // Build prompt with history
    let fullPrompt = systemPrompt || this.getPersonalityPrompt();

    if (includeHistory && this.conversationHistory.length > 0) {
      fullPrompt += '\n\nHistorique de conversation:\n';
      for (const entry of this.conversationHistory.slice(-this.maxHistoryLength)) {
        fullPrompt += `${entry.role}: ${entry.content}\n`;
      }
    }

    fullPrompt += `\nUtilisateur: ${message}\nAna:`;

    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.modelName,
          prompt: fullPrompt,
          stream: false,
          options: this.options
        },
        { timeout: this.timeout }
      );

      const assistantResponse = response.data.response;
      const latency = Date.now() - startTime;

      // Add to history
      this.conversationHistory.push({ role: 'Utilisateur', content: message });
      this.conversationHistory.push({ role: 'Ana', content: assistantResponse });

      // Trim history if too long
      if (this.conversationHistory.length > this.maxHistoryLength * 2) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
      }

      this.log(`Response generated in ${latency}ms`);

      return {
        success: true,
        response: assistantResponse,
        model: this.modelName,
        latencyMs: latency,
        historyLength: this.conversationHistory.length
      };
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        model: this.modelName
      };
    }
  }

  /**
   * Stream chat response
   * @param {Object} params - Parameters
   * @param {Function} onChunk - Callback per chunk
   */
  async streamChat(params, onChunk) {
    const { message, includeHistory = true, systemPrompt = null } = params;

    let fullPrompt = systemPrompt || this.getPersonalityPrompt();

    if (includeHistory && this.conversationHistory.length > 0) {
      fullPrompt += '\n\nHistorique de conversation:\n';
      for (const entry of this.conversationHistory.slice(-this.maxHistoryLength)) {
        fullPrompt += `${entry.role}: ${entry.content}\n`;
      }
    }

    fullPrompt += `\nUtilisateur: ${message}\nAna:`;

    const response = await axios.post(
      `${this.ollamaUrl}/api/generate`,
      {
        model: this.modelName,
        prompt: fullPrompt,
        stream: true,
        options: this.options
      },
      {
        timeout: this.timeout,
        responseType: 'stream'
      }
    );

    return new Promise((resolve, reject) => {
      let fullResponse = '';

      response.data.on('data', chunk => {
        try {
          const lines = chunk.toString().split('\n').filter(l => l.trim());
          for (const line of lines) {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              onChunk(data.response);
            }
            if (data.done) {
              // Add to history
              this.conversationHistory.push({ role: 'Utilisateur', content: message });
              this.conversationHistory.push({ role: 'Ana', content: fullResponse });

              resolve({
                success: true,
                response: fullResponse,
                model: this.modelName
              });
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      response.data.on('error', reject);
    });
  }

  /**
   * Reason about a problem
   * @param {string} problem - Problem to reason about
   */
  async reason(problem) {
    const prompt = `${this.getPersonalityPrompt()}

Réfléchis étape par étape à ce problème:

${problem}

Structure ta réponse:
1. Compréhension du problème
2. Analyse des éléments clés
3. Raisonnement logique
4. Conclusion`;

    return this.chat({ message: prompt, includeHistory: false });
  }

  /**
   * Summarize long text
   * @param {string} text - Text to summarize
   * @param {string} style - Summary style (brief, detailed, bullet)
   */
  async summarize(text, style = 'brief') {
    const styles = {
      brief: 'Résume en 2-3 phrases courtes',
      detailed: 'Fais un résumé détaillé en gardant les points importants',
      bullet: 'Résume sous forme de liste à puces (max 10 points)'
    };

    const prompt = `${styles[style] || styles.brief}:

${text}`;

    return this.chat({ message: prompt, includeHistory: false });
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    this.log('Conversation history cleared');
    return { success: true, message: 'History cleared' };
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return {
      history: this.conversationHistory,
      length: this.conversationHistory.length
    };
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [PHI3] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    try {
      fs.appendFileSync(this.logPath, logMessage + '\n', 'utf-8');
    } catch (error) {
      // Silently fail
    }
  }
}

module.exports = Phi3Handler;
