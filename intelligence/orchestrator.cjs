/**
 * Multi-LLM Orchestrator - Routage intelligent entre modèles
 *
 * ANA SUPERIA - Coordination des cerveaux IA
 *
 * Best Practices 2025:
 * - Factory pattern pour handlers
 * - Lazy loading des modèles
 * - Failover automatique
 * - Task-based routing
 *
 * Date: 25 Novembre 2025
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const vramManager = require('../server/services/vram-manager.cjs');
// Cloud LLM Services
const groqService = require('../server/services/groq-service.cjs');
const cerebrasService = require('../server/services/cerebras-service.cjs');

// LLM Configuration - Spécialisations par modèle
const LLM_CONFIG = {
  PHI3: {
    name: 'phi3:mini-128k',
    specialties: ['conversation', 'reasoning', 'general'],
    contextWindow: 128000,
    priority: 1, // Primary for conversation
    vramMB: 3000
  },
  DEEPSEEK: {
    name: 'deepseek-coder-v2:16b-lite-instruct-q4_K_M',
    specialties: ['coding', 'debugging', 'refactoring', 'analysis'],
    contextWindow: 16000,
    priority: 1, // Primary for code
    vramMB: 5500
  },
  QWEN: {
    name: 'qwen2.5-coder:7b',  // Corrigé: nom exact dans Ollama
    specialties: ['coding', 'math', 'logic'],
    contextWindow: 32000,
    priority: 2, // Backup for code
    vramMB: 3400
  },
  LLAMA_VISION: {
    name: 'llama3.2-vision:11b',  // Corrigé: nom exact dans Ollama
    specialties: ['vision', 'image_analysis', 'multimodal'],
    contextWindow: 8000,
    priority: 1, // Primary for vision
    vramMB: 5000
  },
  // === FRENCH TUTOIEMENT MODEL (8 Dec 2025) ===
  FRENCH: {
    name: 'ana-french-tutoiement',
    specialties: ['conversation', 'french', 'tutoiement', 'memory'],
    contextWindow: 8000,
    priority: 0, // TOP PRIORITY for French conversation
    vramMB: 4500
  },
  // === CLOUD PROVIDERS ===
  GROQ_70B: {
    name: 'llama-3.1-70b-versatile',
    provider: 'groq',
    specialties: ['reasoning', 'analysis', 'research', 'documentation'],
    contextWindow: 8192,
    priority: 2,
    tier: 'cloud'
  },
  GROQ_8B: {
    name: 'llama-3.1-8b-instant',
    provider: 'groq',
    specialties: ['conversation', 'fast', 'summary'],
    contextWindow: 8192,
    priority: 3,
    tier: 'cloud'
  },
  CEREBRAS_8B: {
    name: 'llama3.1-8b',
    provider: 'cerebras',
    specialties: ['coding', 'math', 'speed'],
    contextWindow: 8000,
    priority: 2,
    tier: 'cloud'
  },
  CEREBRAS_70B: {
    name: 'llama3.1-70b',
    provider: 'cerebras',
    specialties: ['reasoning', 'complex', 'analysis'],
    contextWindow: 8000,
    priority: 1,
    tier: 'cloud'
  }
};

// Task type to LLM mapping (LOCAL + CLOUD)
const TASK_ROUTING = {
  conversation: ['PHI3', 'QWEN', 'GROQ_8B'],
  coding: ['DEEPSEEK', 'QWEN', 'CEREBRAS_8B'],
  debugging: ['DEEPSEEK', 'QWEN', 'CEREBRAS_8B'],
  refactoring: ['DEEPSEEK', 'QWEN', 'CEREBRAS_8B'],
  analysis: ['DEEPSEEK', 'PHI3', 'GROQ_70B'],
  vision: ['LLAMA_VISION'],
  image_analysis: ['LLAMA_VISION'],
  math: ['QWEN', 'DEEPSEEK', 'CEREBRAS_8B'],
  reasoning: ['PHI3', 'QWEN', 'GROQ_70B', 'CEREBRAS_70B'],
  general: ['PHI3', 'QWEN', 'GROQ_70B'],
  // Cloud en premier pour recherche (meilleure qualité)
  research: ['GROQ_70B', 'CEREBRAS_70B', 'PHI3'],
  web_search: ['GROQ_70B', 'CEREBRAS_70B'],
  documentation: ['PHI3', 'DEEPSEEK', 'GROQ_70B'],
  summary: ['GROQ_8B', 'PHI3', 'QWEN'],
  translation: ['GROQ_70B', 'PHI3']
};

// Response cache (simple in-memory cache)
const responseCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

/**
 * Cache helper functions
 */
function getCacheKey(prompt, taskType) {
  // Simple hash: premiers 100 chars du prompt + taskType
  const promptHash = prompt.substring(0, 100).replace(/\s+/g, ' ').trim();
  return `${taskType}:${promptHash}`;
}

function getCachedResponse(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;

  // Vérifier TTL
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }

  return entry.response;
}

function setCachedResponse(key, response) {
  // Cleanup si cache plein
  if (responseCache.size >= MAX_CACHE_SIZE) {
    // Supprimer les plus vieilles entrées
    const entries = Array.from(responseCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 10; i++) {
      responseCache.delete(entries[i][0]);
    }
  }

  responseCache.set(key, {
    response,
    timestamp: Date.now()
  });
}

class MultiLLMOrchestrator {
  constructor(config = {}) {
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434';
    this.logPath = path.join('E:', 'ANA', 'logs', 'orchestrator.log');
    this.timeout = config.timeout || 120000; // 2 min default
    this.streamingEnabled = config.streaming !== false;

    // Stats tracking
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      failovers: 0,
      byModel: {}
    };

    // Initialize model stats
    for (const key of Object.keys(LLM_CONFIG)) {
      this.stats.byModel[key] = { requests: 0, successes: 0, failures: 0, avgLatencyMs: 0 };
    }

    // Ensure logs directory exists
    const logsDir = path.dirname(this.logPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Initialize orchestrator
   */
  async initialize() {
    this.log('Initializing Multi-LLM Orchestrator...');

    // Verify Ollama connection
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
      const availableModels = response.data.models?.map(m => m.name) || [];

      // Check which configured models are available
      const modelStatus = {};
      for (const [key, config] of Object.entries(LLM_CONFIG)) {
        if (config.tier === 'cloud') { modelStatus[key] = 'missing'; } else { const isAvailable = availableModels.some(m => m === config.name || m === config.name + ':latest' || m.startsWith(config.name + ':')); modelStatus[key] = isAvailable ? 'available' : 'missing'; }
      }

      this.log(`Models status: ${JSON.stringify(modelStatus)}`);
      return { success: true, modelStatus };
    } catch (error) {
      this.log(`Failed to connect to Ollama: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect task type from prompt
   * @param {string} prompt - User prompt
   * @returns {string} - Task type
   */
  detectTaskType(prompt) {
    const lowerPrompt = prompt.toLowerCase();

    // Vision detection (images in prompt)
    if (prompt.includes('[IMAGE]') || prompt.includes('image:') ||
        lowerPrompt.includes('regarde cette image') || lowerPrompt.includes('analyse cette image')) {
      return 'vision';
    }

    // Code detection
    const codeIndicators = ['```', 'function', 'const ', 'let ', 'var ', 'class ', 'def ',
                           'import ', 'require(', 'module.exports', 'async ', 'await '];
    if (codeIndicators.some(ind => prompt.includes(ind))) {
      return 'coding';
    }

    // Task keywords - Enhanced for web research
    const taskKeywords = {
      debugging: ['bug', 'erreur', 'error', 'fix', 'debug', 'problème', 'ne fonctionne pas', 'crash'],
      refactoring: ['refactor', 'améliorer', 'optimiser', 'nettoyer', 'restructurer'],
      analysis: ['analyse', 'explique', 'comprendre', 'pourquoi', 'comment fonctionne'],
      math: ['calcul', 'équation', 'mathématique', 'probabilité', 'statistique'],
      coding: ['code', 'programme', 'script', 'fonction', 'créer', 'implémenter', 'écrire'],
      // NEW: Web research detection
      research: ['recherche', 'cherche', 'trouve', 'search', 'web', 'internet', 'online'],
      web_search: ['duckduckgo', 'wikipedia', 'google', 'npm', 'github', 'package'],
      documentation: ['documentation', 'docs', 'api', 'manuel', 'guide', 'tutoriel'],
      summary: ['résume', 'summarize', 'synthèse', 'résumé', 'points clés'],
      translation: ['traduis', 'translate', 'traduction', 'anglais', 'français']
    };

    for (const [taskType, keywords] of Object.entries(taskKeywords)) {
      if (keywords.some(kw => lowerPrompt.includes(kw))) {
        return taskType;
      }
    }

    return 'conversation'; // Default
  }

  /**
   * Get best model for task
   * @param {string} taskType - Type of task
   * @returns {Object} - Model config
   */
  getBestModelForTask(taskType) {
    const candidates = TASK_ROUTING[taskType] || TASK_ROUTING.general;

    // TASK_ROUTING order IS the priority - first listed = best for this task
    // Return first candidate with its config
    const key = candidates[0];
    return { key, config: LLM_CONFIG[key] };
  }

  /**
   * Get fallback models for task
   * @param {string} taskType - Type of task
   * @param {string} excludeKey - Model to exclude
   * @returns {Array} - Fallback models
   */
  getFallbackModels(taskType, excludeKey) {
    const candidates = TASK_ROUTING[taskType] || TASK_ROUTING.general;
    return candidates
      .filter(key => key !== excludeKey)
      .map(key => ({ key, config: LLM_CONFIG[key] }));
  }

  /**
   * Send request to LLM with automatic failover
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} - Response
   */
  async chat(params) {
    const { prompt, taskType: forcedTaskType, model: forcedModel, stream, images } = params;

    this.stats.totalRequests++;
    const startTime = Date.now();

    // Detect task type
    const taskType = forcedTaskType || this.detectTaskType(prompt);
    this.log(`Task type detected: ${taskType}`);

    // FIX: Check cache first (only for non-streaming, no images)
    const useCache = !stream && (!images || images.length === 0);
    let cacheKey = null;

    if (useCache) {
      cacheKey = getCacheKey(prompt, taskType);
      const cachedResponse = getCachedResponse(cacheKey);
      if (cachedResponse) {
        this.log(`Cache hit for key: ${cacheKey.substring(0, 30)}...`);
        return {
          ...cachedResponse,
          cached: true,
          latencyMs: Date.now() - startTime
        };
      }
    }

    // Get model to use
    let modelInfo;
    if (forcedModel) {
      const key = Object.keys(LLM_CONFIG).find(k =>
        LLM_CONFIG[k].name === forcedModel || k === forcedModel
      );
      modelInfo = key ? { key, config: LLM_CONFIG[key] } : this.getBestModelForTask(taskType);
    } else {
      modelInfo = this.getBestModelForTask(taskType);
    }

    // Try primary model
    try {
      const provider = modelInfo.config.provider || 'ollama';
      this.log(`🧠 Using ${provider}:${modelInfo.config.name} for ${taskType}`);

      let response;

      if (provider === 'groq') {
        const result = await groqService.chat(prompt, {
          model: modelInfo.config.name,
          temperature: 0.7,
          maxTokens: 4096
        });
        if (!result.success) throw new Error(result.error || 'Groq failed');
        response = { response: result.response };
      } else if (provider === 'cerebras') {
        const result = await cerebrasService.chat(prompt, {
          model: modelInfo.config.name,
          temperature: 0.7,
          maxTokens: 4096
        });
        if (!result.success) throw new Error(result.error || 'Cerebras failed');
        response = { response: result.response };
      } else {
        // Ollama (défaut)
        await vramManager.ensureModelLoaded(modelInfo.config.name);
        response = await this.sendToOllama({
          model: modelInfo.config.name,
          prompt,
          stream: stream !== false && this.streamingEnabled,
          images
        });
      }

      const latency = Date.now() - startTime;
      this.log(`✅ ${provider.toUpperCase()}:${modelInfo.key} → ${latency}ms`);

      // Update stats
      this.updateStats(modelInfo.key, true, latency);
      this.stats.successfulRequests++;

      const result = {
        success: true,
        model: modelInfo.config.name,
        modelKey: modelInfo.key,
        provider,
        taskType,
        response: response.response,
        latencyMs: latency
      };

      // FIX: Store in cache
      if (useCache && cacheKey) {
        setCachedResponse(cacheKey, result);
        this.log(`Cached response for key: ${cacheKey.substring(0, 30)}...`);
      }

      return result;

    } catch (primaryError) {
      this.log(`Primary model ${modelInfo.key} failed: ${primaryError.message}`, 'warn');
      this.updateStats(modelInfo.key, false, Date.now() - startTime);

      // Try fallbacks
      const fallbacks = this.getFallbackModels(taskType, modelInfo.key);

      for (const fallback of fallbacks) {
        try {
          this.stats.failovers++;
          const fbProvider = fallback.config.provider || 'ollama';
          this.log(`🔄 Trying fallback: ${fbProvider}:${fallback.key}`);

          let response;

          if (fbProvider === 'groq') {
            const result = await groqService.chat(prompt, {
              model: fallback.config.name,
              temperature: 0.7,
              maxTokens: 4096
            });
            if (!result.success) throw new Error(result.error || 'Groq failed');
            response = { response: result.response };
          } else if (fbProvider === 'cerebras') {
            const result = await cerebrasService.chat(prompt, {
              model: fallback.config.name,
              temperature: 0.7,
              maxTokens: 4096
            });
            if (!result.success) throw new Error(result.error || 'Cerebras failed');
            response = { response: result.response };
          } else {
            await vramManager.ensureModelLoaded(fallback.config.name);
            response = await this.sendToOllama({
              model: fallback.config.name,
              prompt,
              stream: stream !== false && this.streamingEnabled,
              images
            });
          }

          this.updateStats(fallback.key, true, Date.now() - startTime);
          this.stats.successfulRequests++;

          return {
            success: true,
            model: fallback.config.name,
            modelKey: fallback.key,
            provider: fbProvider,
            taskType,
            response: response.response,
            latencyMs: Date.now() - startTime,
            failover: true,
            originalModel: modelInfo.config.name
          };

        } catch (fallbackError) {
          this.log(`Fallback ${fallback.key} failed: ${fallbackError.message}`, 'warn');
          this.updateStats(fallback.key, false, Date.now() - startTime);
        }
      }

      // All models failed
      this.stats.failedRequests++;
      return {
        success: false,
        error: 'All models failed',
        taskType,
        latencyMs: Date.now() - startTime
      };
    }
  }

  /**
   * Send request to Ollama
   * @param {Object} params - Ollama parameters
   * @returns {Promise<Object>} - Ollama response
   */
  async sendToOllama(params) {
    const { model, prompt, stream, images } = params;

    const requestBody = {
      model,
      prompt,
      stream: false, // For simplicity, non-streaming first
      options: {
        temperature: 0.7,
        top_p: 0.9
      }
    };

    // Add images for vision models
    if (images && images.length > 0) {
      requestBody.images = images;
    }

    const response = await axios.post(
      `${this.ollamaUrl}/api/generate`,
      requestBody,
      { timeout: this.timeout }
    );

    // Update VRAM manager lastUsed
    vramManager.updateLastUsed(model);

    return response.data;
  }

  /**
   * Stream response from LLM
   * @param {Object} params - Request parameters
   * @param {Function} onChunk - Callback for each chunk
   */
  async streamChat(params, onChunk) {
    const { prompt, taskType: forcedTaskType, model: forcedModel, images } = params;

    const taskType = forcedTaskType || this.detectTaskType(prompt);
    let modelInfo;

    if (forcedModel) {
      const key = Object.keys(LLM_CONFIG).find(k =>
        LLM_CONFIG[k].name === forcedModel || k === forcedModel
      );
      modelInfo = key ? { key, config: LLM_CONFIG[key] } : this.getBestModelForTask(taskType);
    } else {
      modelInfo = this.getBestModelForTask(taskType);
    }

    // Ensure model is loaded
    await vramManager.ensureModelLoaded(modelInfo.config.name);

    const requestBody = {
      model: modelInfo.config.name,
      prompt,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9
      }
    };

    if (images && images.length > 0) {
      requestBody.images = images;
    }

    const response = await axios.post(
      `${this.ollamaUrl}/api/generate`,
      requestBody,
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
              vramManager.updateLastUsed(modelInfo.config.name);
              resolve({
                success: true,
                model: modelInfo.config.name,
                modelKey: modelInfo.key,
                taskType,
                response: fullResponse
              });
            }
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
        }
      });

      response.data.on('error', reject);
    });
  }

  /**
   * Update stats for a model
   */
  updateStats(modelKey, success, latencyMs) {
    const stats = this.stats.byModel[modelKey];
    if (!stats) return;

    stats.requests++;
    if (success) {
      stats.successes++;
      // Running average for latency
      stats.avgLatencyMs = Math.round(
        (stats.avgLatencyMs * (stats.successes - 1) + latencyMs) / stats.successes
      );
    } else {
      stats.failures++;
    }
  }

  /**
   * Get orchestrator stats
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0
        ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(1) + '%'
        : 'N/A',
      failoverRate: this.stats.totalRequests > 0
        ? ((this.stats.failovers / this.stats.totalRequests) * 100).toFixed(1) + '%'
        : 'N/A'
    };
  }

  /**
   * Get available models info
   */
  getModelsInfo() {
    return Object.entries(LLM_CONFIG).map(([key, config]) => ({
      key,
      name: config.name,
      specialties: config.specialties,
      contextWindow: config.contextWindow,
      vramMB: config.vramMB
    }));
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [ORCHESTRATOR] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    try {
      fs.appendFileSync(this.logPath, logMessage + '\n', 'utf-8');
    } catch (error) {
      // Silently fail
    }
  }
}

// Export singleton
const orchestrator = new MultiLLMOrchestrator();
module.exports = orchestrator;
