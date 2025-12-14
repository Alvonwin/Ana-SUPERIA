/**
 * CONTEXT MANAGER - Gestion Intelligente du Contexte 200K+
 *
 * Fonctionnalités:
 * 1. Fenêtre glissante de contexte
 * 2. Compression intelligente des anciens messages
 * 3. Résumé automatique pour conversations longues
 * 4. Préservation du contexte critique (code, erreurs, décisions)
 *
 * Date: 7 Décembre 2025
 * Version: 1.0.0
 */

const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';

// Limites de contexte par modèle (en tokens approximatifs)
const MODEL_CONTEXT_LIMITS = {
  // Ollama models
  'phi3:mini-128k': 128000,
  'phi3:mini': 4096,
  'qwen2.5-coder:7b': 32000,
  'qwen2.5:latest': 32000,
  'qwen3:8b': 32000,
  'deepseek-coder:6.7b': 16000,
  'llama3.1:8b': 128000,
  'llama3.2:3b': 8192,
  'mistral:7b': 8192,
  'nomic-embed-text': 8192,

  // Cloud models (références)
  'llama-3.3-70b-versatile': 128000,
  'llama-3.1-70b-versatile': 128000,
  'llama3.1-70b': 8192,
  'mixtral-8x7b-32768': 32768,

  // Défaut
  'default': 8192
};

// Ratio tokens/caractères approximatif
const CHARS_PER_TOKEN = 4;

// Seuil de compression (% de la limite avant compression)
const COMPRESSION_THRESHOLD = 0.75;

// Types de contenu à préserver en priorité
const PRIORITY_CONTENT = {
  HIGH: ['code', 'error', 'tool_result', 'decision', 'file_content'],
  MEDIUM: ['user_request', 'plan', 'summary'],
  LOW: ['thinking', 'explanation', 'greeting']
};

class ContextManager {
  constructor(options = {}) {
    this.defaultModel = options.model || 'qwen2.5-coder:7b';
    this.summaryModel = options.summaryModel || 'phi3:mini-128k';

    // État du contexte
    this.messages = [];
    this.summaries = [];
    this.preservedContext = [];

    // Stats
    this.stats = {
      totalMessages: 0,
      compressedMessages: 0,
      summarizations: 0,
      tokensEstimated: 0,
      tokensSaved: 0
    };
  }

  /**
   * Obtenir la limite de contexte pour un modèle
   * @param {string} model - Nom du modèle
   * @returns {number} Limite en tokens
   */
  getContextLimit(model) {
    return MODEL_CONTEXT_LIMITS[model] || MODEL_CONTEXT_LIMITS['default'];
  }

  /**
   * Estimer le nombre de tokens dans un texte
   * @param {string} text - Texte à analyser
   * @returns {number} Estimation en tokens
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Estimer les tokens pour un tableau de messages
   * @param {Array} messages - Messages à analyser
   * @returns {number} Total estimé
   */
  estimateMessagesTokens(messages) {
    return messages.reduce((total, msg) => {
      const content = typeof msg === 'string' ? msg : (msg.content || '');
      return total + this.estimateTokens(content);
    }, 0);
  }

  /**
   * Construire le contexte optimisé pour un modèle
   * @param {Array} messages - Messages de conversation
   * @param {object} options - Options
   * @param {string} options.model - Modèle cible
   * @param {object} options.systemPrompt - Prompt système à préserver
   * @returns {Promise<Array>} Messages optimisés
   */
  async buildContext(messages, options = {}) {
    const model = options.model || this.defaultModel;
    const systemPrompt = options.systemPrompt;

    const limit = this.getContextLimit(model);
    const threshold = limit * COMPRESSION_THRESHOLD;

    // Estimer la taille actuelle
    let currentTokens = this.estimateMessagesTokens(messages);
    this.stats.tokensEstimated = currentTokens;

    // Si sous le seuil, retourner tel quel
    if (currentTokens < threshold) {
      return messages;
    }

    console.log(`[ContextManager] Context ${currentTokens} tokens > threshold ${threshold}. Compressing...`);

    // Stratégie de compression
    const optimized = await this._compressMessages(messages, {
      targetTokens: threshold * 0.8, // Viser 80% du seuil
      model,
      systemPrompt
    });

    const newTokens = this.estimateMessagesTokens(optimized);
    this.stats.tokensSaved += currentTokens - newTokens;
    this.stats.compressedMessages += messages.length - optimized.length;

    console.log(`[ContextManager] Compressed: ${currentTokens} → ${newTokens} tokens`);

    return optimized;
  }

  /**
   * Ajouter un message avec gestion automatique du contexte
   * @param {object} message - Message à ajouter
   * @param {string} message.role - Role (user/assistant/system/tool)
   * @param {string} message.content - Contenu
   * @param {object} options - Options
   */
  async addMessage(message, options = {}) {
    const model = options.model || this.defaultModel;

    this.messages.push({
      ...message,
      timestamp: Date.now(),
      priority: this._detectPriority(message.content)
    });

    this.stats.totalMessages++;

    // Vérifier si compression nécessaire
    const limit = this.getContextLimit(model);
    const currentTokens = this.estimateMessagesTokens(this.messages);

    if (currentTokens > limit * COMPRESSION_THRESHOLD) {
      this.messages = await this.buildContext(this.messages, { model });
    }

    return this.messages;
  }

  /**
   * Obtenir les messages optimisés pour envoi au LLM
   * @param {object} options - Options
   * @returns {Array} Messages prêts pour le LLM
   */
  getOptimizedMessages(options = {}) {
    const model = options.model || this.defaultModel;
    const systemPrompt = options.systemPrompt;

    const messages = [];

    // 1. System prompt en premier
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // 2. Résumés des conversations précédentes
    if (this.summaries.length > 0) {
      const summaryContext = this.summaries
        .slice(-3)  // Garder les 3 derniers résumés
        .map(s => s.summary)
        .join('\n\n');

      messages.push({
        role: 'system',
        content: `[Contexte précédent résumé]\n${summaryContext}`
      });
    }

    // 3. Contexte préservé (code, erreurs importantes)
    if (this.preservedContext.length > 0) {
      const preserved = this.preservedContext
        .slice(-5)  // Garder les 5 derniers éléments préservés
        .map(p => p.content)
        .join('\n\n');

      messages.push({
        role: 'system',
        content: `[Contexte important]\n${preserved}`
      });
    }

    // 4. Messages récents
    const recentMessages = this._getRecentMessages(model);
    messages.push(...recentMessages);

    return messages;
  }

  /**
   * Préserver un élément important dans le contexte
   * @param {object} item - Élément à préserver
   * @param {string} item.type - Type (code, error, decision)
   * @param {string} item.content - Contenu
   */
  preserve(item) {
    this.preservedContext.push({
      ...item,
      timestamp: Date.now()
    });

    // Limiter à 20 éléments préservés
    if (this.preservedContext.length > 20) {
      this.preservedContext.shift();
    }
  }

  /**
   * Forcer une summarization de la conversation
   * @returns {Promise<object>} Résumé créé
   */
  async summarizeConversation() {
    if (this.messages.length < 10) {
      return null; // Pas assez de messages à résumer
    }

    const messagesToSummarize = this.messages.slice(0, -5); // Garder les 5 derniers
    const summary = await this._createSummary(messagesToSummarize);

    if (summary) {
      this.summaries.push({
        summary,
        messageCount: messagesToSummarize.length,
        timestamp: Date.now()
      });

      // Supprimer les messages résumés
      this.messages = this.messages.slice(-5);
      this.stats.summarizations++;

      return { success: true, summary, messagesCompressed: messagesToSummarize.length };
    }

    return { success: false };
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      currentMessages: this.messages.length,
      summariesCount: this.summaries.length,
      preservedCount: this.preservedContext.length,
      currentTokensEstimate: this.estimateMessagesTokens(this.messages)
    };
  }

  /**
   * Réinitialiser le contexte
   */
  reset() {
    this.messages = [];
    // Garder les résumés et le contexte préservé
  }

  /**
   * Réinitialisation complète
   */
  fullReset() {
    this.messages = [];
    this.summaries = [];
    this.preservedContext = [];
  }

  // ============= MÉTHODES PRIVÉES =============

  /**
   * Compresser les messages pour tenir dans la limite
   * @private
   */
  async _compressMessages(messages, options) {
    const { targetTokens, systemPrompt } = options;
    const result = [];

    // 1. Toujours garder le system prompt
    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }

    // 2. Identifier les messages haute priorité
    const prioritized = messages.map((msg, idx) => ({
      ...msg,
      index: idx,
      priority: this._detectPriority(msg.content),
      tokens: this.estimateTokens(msg.content)
    }));

    // 3. Trier par priorité (garder les HIGH, comprimer les LOW)
    const highPriority = prioritized.filter(m => m.priority === 'HIGH');
    const mediumPriority = prioritized.filter(m => m.priority === 'MEDIUM');
    const lowPriority = prioritized.filter(m => m.priority === 'LOW');

    // 4. Toujours garder les 5 derniers messages
    const lastFive = messages.slice(-5);
    let currentTokens = this.estimateMessagesTokens(lastFive);

    // 5. Ajouter les high priority tant qu'on a de la place
    for (const msg of highPriority) {
      if (currentTokens + msg.tokens < targetTokens) {
        result.push({ role: msg.role, content: msg.content });
        currentTokens += msg.tokens;
      }
    }

    // 6. Ajouter les medium priority compressés
    if (mediumPriority.length > 0 && currentTokens < targetTokens * 0.7) {
      const mediumText = mediumPriority.map(m => m.content).join('\n');
      const compressed = await this._compressText(mediumText);

      if (compressed && this.estimateTokens(compressed) + currentTokens < targetTokens) {
        result.push({
          role: 'system',
          content: `[Contexte compressé]\n${compressed}`
        });
        currentTokens += this.estimateTokens(compressed);
      }
    }

    // 7. Ajouter les 5 derniers messages
    result.push(...lastFive);

    return result;
  }

  /**
   * Compresser un texte long
   * @private
   */
  async _compressText(text) {
    if (this.estimateTokens(text) < 500) {
      return text; // Pas besoin de comprimer
    }

    try {
      const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: this.summaryModel,
        prompt: `Résume ce texte en gardant les informations essentielles (noms, décisions, code, erreurs). Maximum 200 mots.\n\nTexte:\n${text.substring(0, 8000)}\n\nRésumé concis:`,
        stream: false,
        options: { temperature: 0.3 }
      }, { timeout: 30000 });

      return response.data.response;
    } catch (err) {
      console.warn('[ContextManager] Compression failed:', err.message);
      // Fallback: tronquer
      return text.substring(0, 2000) + '\n[...tronqué...]';
    }
  }

  /**
   * Créer un résumé des messages
   * @private
   */
  async _createSummary(messages) {
    const text = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n')
      .substring(0, 12000);

    try {
      const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: this.summaryModel,
        prompt: `Résume cette conversation en gardant:
1. Les demandes utilisateur principales
2. Les décisions prises
3. Les fichiers modifiés
4. Les erreurs rencontrées et solutions
5. L'état final

Conversation:
${text}

Résumé structuré:`,
        stream: false,
        options: { temperature: 0.2 }
      }, { timeout: 60000 });

      return response.data.response;
    } catch (err) {
      console.warn('[ContextManager] Summary failed:', err.message);
      return null;
    }
  }

  /**
   * Détecter la priorité d'un message
   * @private
   */
  _detectPriority(content) {
    if (!content) return 'LOW';

    const text = content.toLowerCase();

    // HIGH priority patterns
    if (
      /```/.test(content) ||           // Code blocks
      /error|erreur|failed|échec/i.test(text) ||
      /file:|fichier:|path:/i.test(text) ||
      /\.(js|cjs|ts|jsx|tsx|py|json|md)/.test(text) ||
      /décision|decision|important/i.test(text)
    ) {
      return 'HIGH';
    }

    // MEDIUM priority patterns
    if (
      /plan|étape|step|todo/i.test(text) ||
      /résumé|summary/i.test(text) ||
      /modifi|change|update/i.test(text)
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Obtenir les messages récents adaptés au modèle
   * @private
   */
  _getRecentMessages(model) {
    const limit = this.getContextLimit(model);
    const targetTokens = limit * 0.6; // 60% pour les messages récents

    const recent = [];
    let tokens = 0;

    // Parcourir en ordre inverse (plus récent d'abord)
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      const msgTokens = this.estimateTokens(msg.content);

      if (tokens + msgTokens > targetTokens) {
        break;
      }

      recent.unshift({ role: msg.role, content: msg.content });
      tokens += msgTokens;
    }

    return recent;
  }
}

// ============= MÉTHODES SUPPLÉMENTAIRES POUR API TESTS =============

// Alias et propriétés pour compatibilité tests
Object.defineProperties(ContextManager.prototype, {
  model: {
    get() { return this.defaultModel; }
  },
  compressionThreshold: {
    get() { return COMPRESSION_THRESHOLD; }
  },
  maxTokens: {
    get() { return this.getContextLimit(this.defaultModel); }
  }
});

/**
 * Vérifier si compression nécessaire
 * @param {string|Array} content - Contenu à analyser
 * @returns {boolean}
 */
ContextManager.prototype.needsCompression = function(content) {
  const limit = this.getContextLimit(this.defaultModel);
  const threshold = limit * COMPRESSION_THRESHOLD;

  let tokens;
  if (Array.isArray(content)) {
    tokens = this.estimateMessagesTokens(content);
  } else {
    tokens = this.estimateTokens(content);
  }

  return tokens > threshold;
};

/**
 * Détecter la priorité (exposé publiquement)
 * @param {string} content - Contenu
 * @returns {string} HIGH, MEDIUM, ou LOW
 */
ContextManager.prototype.detectPriority = function(content) {
  return this._detectPriority(content);
};

/**
 * Compresser des messages (version synchrone simplifiée)
 * @param {Array} messages - Messages à compresser
 * @param {object} options - Options
 * @returns {Array} Messages compressés
 */
ContextManager.prototype.compress = function(messages, options = {}) {
  if (!messages || messages.length === 0) {
    return [];
  }

  const preserveRecent = options.preserveRecent || 3;
  const result = [];

  // Garder les messages récents
  const recent = messages.slice(-preserveRecent);

  // Pour les anciens, garder seulement les high priority
  const older = messages.slice(0, -preserveRecent);
  for (const msg of older) {
    const priority = this._detectPriority(msg.content);
    if (priority === 'HIGH') {
      result.push(msg);
    }
  }

  // Ajouter les récents
  result.push(...recent);

  return result;
};

/**
 * Créer un résumé simple (version synchrone)
 * @param {Array} messages - Messages à résumer
 * @returns {string} Résumé
 */
ContextManager.prototype.createSummary = function(messages) {
  if (!messages || messages.length === 0) {
    return '';
  }

  // Résumé simple: premier et dernier échange
  const parts = [];

  if (messages[0]) {
    parts.push(`Début: ${messages[0].content?.substring(0, 100) || ''}...`);
  }

  if (messages.length > 1) {
    const last = messages[messages.length - 1];
    parts.push(`Fin: ${last.content?.substring(0, 100) || ''}...`);
  }

  return parts.join('\n');
};

/**
 * Extraire les blocs de code d'un texte
 * @param {string} content - Contenu à analyser
 * @returns {Array} Blocs de code trouvés
 */
ContextManager.prototype.extractCodeBlocks = function(content) {
  if (!content) return [];

  const codeBlockRegex = /```[\s\S]*?```/g;
  const matches = content.match(codeBlockRegex) || [];

  return matches.map(block => ({
    content: block,
    language: block.match(/```(\w+)/)?.[1] || 'unknown'
  }));
};

/**
 * Obtenir la capacité restante
 * @param {string|Array} currentContent - Contenu actuel
 * @returns {number} Tokens restants
 */
ContextManager.prototype.getRemainingCapacity = function(currentContent) {
  const limit = this.getContextLimit(this.defaultModel);

  let used;
  if (Array.isArray(currentContent)) {
    used = this.estimateMessagesTokens(currentContent);
  } else {
    used = this.estimateTokens(currentContent);
  }

  return Math.max(0, limit - used);
};

/**
 * Vérifier si truncation nécessaire
 * @param {string|Array} content - Contenu à analyser
 * @returns {object} Info de truncation
 */
ContextManager.prototype.shouldTruncate = function(content) {
  const limit = this.getContextLimit(this.defaultModel);

  let tokens;
  if (Array.isArray(content)) {
    tokens = this.estimateMessagesTokens(content);
  } else {
    tokens = this.estimateTokens(content);
  }

  const excess = tokens - limit;

  return {
    shouldTruncate: excess > 0,
    currentTokens: tokens,
    limit,
    excessTokens: Math.max(0, excess)
  };
};

// ============= FACTORY FUNCTIONS =============

/**
 * Créer un gestionnaire de contexte standard
 */
function createContextManager(options = {}) {
  return new ContextManager(options);
}

/**
 * Créer un gestionnaire pour grands contextes (128K+)
 */
function createLargeContextManager() {
  return new ContextManager({
    model: 'phi3:mini-128k',
    summaryModel: 'phi3:mini-128k'
  });
}

// ============= EXPORTS =============

module.exports = {
  ContextManager,
  createContextManager,
  createLargeContextManager,
  MODEL_CONTEXT_LIMITS,
  COMPRESSION_THRESHOLD,
  PRIORITY_CONTENT
};
