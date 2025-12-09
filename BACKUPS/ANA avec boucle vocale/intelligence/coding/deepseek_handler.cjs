/**
 * DeepSeek Handler - Spécialiste Code & Debugging
 *
 * ANA SUPERIA - Cerveau programmation
 *
 * Modèle: deepseek-coder-v2:16b-lite-instruct-q4_K_M
 * Spécialités: coding, debugging, refactoring, code analysis
 *
 * Date: 25 Novembre 2025
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DeepSeekHandler {
  constructor(config = {}) {
    this.modelName = config.model || 'deepseek-coder-v2:16b-lite-instruct-q4_K_M';
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434';
    this.timeout = config.timeout || 180000; // 3 min for complex code
    this.logPath = path.join('E:', 'ANA', 'logs', 'deepseek_handler.log');

    // Code-specific settings
    this.options = {
      temperature: 0.3, // Lower temp for precise code
      top_p: 0.9,
      num_ctx: 16384, // 16k context
      repeat_penalty: 1.1
    };

    // Ensure logs directory
    const logsDir = path.dirname(this.logPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Build system prompt for coding tasks
   */
  buildSystemPrompt(taskType) {
    const prompts = {
      coding: `Tu es DeepSeek, un assistant expert en programmation.
- Écris du code propre, commenté et fonctionnel
- Utilise les best practices 2025
- Explique brièvement ton approche
- Gère les erreurs correctement`,

      debugging: `Tu es DeepSeek, expert en debugging.
- Analyse méthodiquement le code problématique
- Identifie la cause racine
- Propose une solution claire avec explication
- Suggère des tests pour vérifier le fix`,

      refactoring: `Tu es DeepSeek, expert en refactoring.
- Améliore la qualité sans changer le comportement
- Applique les principes SOLID
- Optimise la performance si possible
- Documente les changements importants`,

      analysis: `Tu es DeepSeek, expert en analyse de code.
- Explique le fonctionnement du code
- Identifie les patterns utilisés
- Note les forces et faiblesses
- Suggère des améliorations potentielles`
    };

    return prompts[taskType] || prompts.coding;
  }

  /**
   * Generate code completion
   * @param {Object} params - Parameters
   * @returns {Promise<Object>} - Response
   */
  async generate(params) {
    const { prompt, taskType = 'coding', context = '', stream = false } = params;

    const systemPrompt = this.buildSystemPrompt(taskType);
    const fullPrompt = context
      ? `${systemPrompt}\n\nContexte:\n${context}\n\nDemande:\n${prompt}`
      : `${systemPrompt}\n\nDemande:\n${prompt}`;

    const startTime = Date.now();
    this.log(`Generating ${taskType} response...`);

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

      const latency = Date.now() - startTime;
      this.log(`Response generated in ${latency}ms`);

      return {
        success: true,
        response: response.data.response,
        model: this.modelName,
        taskType,
        latencyMs: latency,
        tokensGenerated: response.data.eval_count || 0
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
   * Stream code generation
   * @param {Object} params - Parameters
   * @param {Function} onChunk - Callback per chunk
   */
  async streamGenerate(params, onChunk) {
    const { prompt, taskType = 'coding', context = '' } = params;

    const systemPrompt = this.buildSystemPrompt(taskType);
    const fullPrompt = context
      ? `${systemPrompt}\n\nContexte:\n${context}\n\nDemande:\n${prompt}`
      : `${systemPrompt}\n\nDemande:\n${prompt}`;

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
   * Analyze code for issues
   * @param {string} code - Code to analyze
   * @param {string} language - Programming language
   */
  async analyzeCode(code, language = 'javascript') {
    const prompt = `Analyse ce code ${language} et identifie:
1. Bugs potentiels
2. Problèmes de sécurité
3. Optimisations possibles
4. Violations de best practices

Code à analyser:
\`\`\`${language}
${code}
\`\`\``;

    return this.generate({ prompt, taskType: 'analysis' });
  }

  /**
   * Fix code bug
   * @param {string} code - Buggy code
   * @param {string} errorMessage - Error description
   * @param {string} language - Programming language
   */
  async fixBug(code, errorMessage, language = 'javascript') {
    const prompt = `Corrige ce bug dans le code ${language}.

Erreur: ${errorMessage}

Code problématique:
\`\`\`${language}
${code}
\`\`\`

Fournis:
1. Le code corrigé complet
2. Explication du problème
3. Comment éviter ce bug à l'avenir`;

    return this.generate({ prompt, taskType: 'debugging' });
  }

  /**
   * Refactor code
   * @param {string} code - Code to refactor
   * @param {string} instructions - Refactoring instructions
   * @param {string} language - Programming language
   */
  async refactorCode(code, instructions, language = 'javascript') {
    const prompt = `Refactorise ce code ${language} selon ces instructions: ${instructions}

Code actuel:
\`\`\`${language}
${code}
\`\`\`

Fournis:
1. Le code refactorisé
2. Liste des changements effectués
3. Avantages du nouveau code`;

    return this.generate({ prompt, taskType: 'refactoring' });
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [DEEPSEEK] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    try {
      fs.appendFileSync(this.logPath, logMessage + '\n', 'utf-8');
    } catch (error) {
      // Silently fail
    }
  }
}

module.exports = DeepSeekHandler;
