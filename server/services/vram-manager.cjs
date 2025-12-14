/**
 * VRAM Manager - Gestionnaire de mémoire GPU pour Multi-LLM
 *
 * ANA SUPERIA - Gestion intelligente des modèles Ollama
 *
 * Best Practices 2025:
 * - Max 2 LLMs simultanés (RTX 3070 8GB)
 * - Unload LLMs idle > 5 minutes
 * - KV cache monitoring
 * - Fallback automatique si primary échoue
 *
 * Sources:
 * - https://geekbacon.com/2025/05/03/understanding-vram-usage-in-ollama-with-large-models/
 * - https://www.byteplus.com/en/topic/516162
 * - https://www.glukhov.org/post/2025/09/memory-allocation-in-ollama-new-version/
 * - https://localllm.in/blog/best-local-llms-8gb-vram-2025
 *
 * Date: 25 Novembre 2025
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class VRAMManager {
  constructor(config = {}) {
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434';
    this.maxConcurrent = config.maxConcurrent || 2; // RTX 3070 8GB limit
    this.idleTimeout = config.idleTimeout || 5 * 60 * 1000; // 5 minutes
    this.checkInterval = config.checkInterval || 60 * 1000; // 1 minute

    // Track loaded models with timestamps
    this.loadedModels = new Map(); // model → {vram_mb, lastUsed, loadedAt}

    // VRAM estimates per model (MB)
    this.vramEstimates = {
      'phi3:mini-128k': 3000,
      'deepseek-coder-v2:16b-lite-instruct-q4_K_M': 5500,
      'qwen2.5-coder:7b': 3400,
      'qwen2.5-coder:7b-instruct-q4_K_M': 3400,
      'llama3.2-vision:11b': 5000,
      'llama3.2-vision:11b-instruct-q4_K_M': 5000
    };

    this.totalVRAM = 8 * 1024; // 8GB in MB
    this.logPath = path.join('E:', 'ANA', 'logs', 'vram_manager.log');
    this.intervalId = null;

    // Ensure logs directory exists
    const logsDir = path.dirname(this.logPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Initialize VRAM Manager
   * Starts idle cleanup interval
   */
  async initialize() {
    this.log('Initializing VRAM Manager...');

    // Check Ollama connection
    const health = await this.checkOllamaHealth();
    if (!health.healthy) {
      this.log(`WARNING: Ollama not responding: ${health.error}`, 'warn');
    } else {
      this.log(`Ollama connected. Models available: ${health.modelsCount}`);
    }

    // Get currently loaded models
    await this.syncLoadedModels();

    // Start idle cleanup interval
    this.intervalId = setInterval(() => this.cleanupIdle(), this.checkInterval);

    this.log('VRAM Manager initialized');
    return { success: true };
  }

  /**
   * Check Ollama health and available models
   */
  async checkOllamaHealth() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 });
      return {
        healthy: true,
        modelsCount: response.data.models?.length || 0,
        models: response.data.models?.map(m => m.name) || []
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Sync loaded models from Ollama ps endpoint
   */
  async syncLoadedModels() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/ps`, { timeout: 5000 });
      const runningModels = response.data.models || [];

      // Update our tracking with running models
      for (const model of runningModels) {
        const modelName = model.name;
        if (!this.loadedModels.has(modelName)) {
          this.loadedModels.set(modelName, {
            vram_mb: model.size_vram ? Math.round(model.size_vram / (1024 * 1024)) : this.getVRAMEstimate(modelName),
            lastUsed: Date.now(),
            loadedAt: Date.now()
          });
          this.log(`Synced running model: ${modelName}`);
        }
      }

      // Remove models that are no longer running
      for (const [modelName] of this.loadedModels) {
        if (!runningModels.find(m => m.name === modelName)) {
          this.loadedModels.delete(modelName);
          this.log(`Removed unloaded model from tracking: ${modelName}`);
        }
      }
    } catch (error) {
      this.log(`Failed to sync loaded models: ${error.message}`, 'warn');
    }
  }

  /**
   * Ensure model is loaded, unloading others if needed
   * @param {string} modelName - Model to load
   * @returns {Promise<{success: boolean, model: string}>}
   */
  async ensureModelLoaded(modelName) {
    // Update lastUsed if already loaded
    if (this.loadedModels.has(modelName)) {
      this.loadedModels.get(modelName).lastUsed = Date.now();
      this.log(`Model ${modelName} already loaded, updated lastUsed`);
      return { success: true, model: modelName, action: 'already_loaded' };
    }

    // Check if we need to unload a model
    if (this.loadedModels.size >= this.maxConcurrent) {
      const modelToUnload = this.getLeastRecentlyUsed();
      if (modelToUnload) {
        await this.unloadModel(modelToUnload);
      }
    }

    // Load the model (first request will trigger load)
    try {
      // Send a minimal request to trigger model loading
      this.log(`Loading model: ${modelName}...`);

      await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: modelName,
        prompt: 'Hi',
        options: { num_predict: 1 }
      }, { timeout: 120000 }); // 2 min timeout for loading

      // Track the loaded model
      this.loadedModels.set(modelName, {
        vram_mb: this.getVRAMEstimate(modelName),
        lastUsed: Date.now(),
        loadedAt: Date.now()
      });

      this.log(`Model ${modelName} loaded successfully`);
      this.logVRAMState();

      return { success: true, model: modelName, action: 'loaded' };
    } catch (error) {
      this.log(`Failed to load model ${modelName}: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Unload a model from VRAM
   * @param {string} modelName - Model to unload
   */
  async unloadModel(modelName) {
    if (!this.loadedModels.has(modelName)) {
      return { success: true, message: 'Model not loaded' };
    }

    try {
      this.log(`Unloading model: ${modelName}...`);

      // Send request with keep_alive: 0 to unload
      await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: modelName,
        prompt: '',
        keep_alive: 0
      }, { timeout: 30000 });

      this.loadedModels.delete(modelName);
      this.log(`Model ${modelName} unloaded`);
      this.logVRAMState();

      return { success: true };
    } catch (error) {
      this.log(`Failed to unload model ${modelName}: ${error.message}`, 'warn');
      // Remove from tracking anyway
      this.loadedModels.delete(modelName);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update lastUsed timestamp for a model
   * @param {string} modelName - Model name
   */
  updateLastUsed(modelName) {
    if (this.loadedModels.has(modelName)) {
      this.loadedModels.get(modelName).lastUsed = Date.now();
    }
  }

  /**
   * Get the least recently used model
   * @returns {string|null} - Model name or null
   */
  getLeastRecentlyUsed() {
    let oldest = null;
    let oldestTime = Infinity;

    for (const [model, info] of this.loadedModels) {
      if (info.lastUsed < oldestTime) {
        oldestTime = info.lastUsed;
        oldest = model;
      }
    }

    return oldest;
  }

  /**
   * Cleanup idle models (not used for idleTimeout)
   */
  async cleanupIdle() {
    const now = Date.now();
    const toUnload = [];

    for (const [model, info] of this.loadedModels) {
      if (now - info.lastUsed > this.idleTimeout) {
        toUnload.push(model);
      }
    }

    for (const model of toUnload) {
      this.log(`Cleaning up idle model: ${model} (idle for ${Math.round((now - this.loadedModels.get(model).lastUsed) / 1000)}s)`);
      await this.unloadModel(model);
    }
  }

  /**
   * Get VRAM estimate for a model
   * @param {string} modelName - Model name
   * @returns {number} - Estimated VRAM in MB
   */
  getVRAMEstimate(modelName) {
    // Check exact match
    if (this.vramEstimates[modelName]) {
      return this.vramEstimates[modelName];
    }

    // Check partial match
    for (const [key, value] of Object.entries(this.vramEstimates)) {
      if (modelName.includes(key.split(':')[0])) {
        return value;
      }
    }

    // Default estimate
    return 4000; // 4GB default
  }

  /**
   * Get total VRAM usage
   * @returns {number} - Total VRAM in MB
   */
  getTotalVRAM() {
    let total = 0;
    for (const info of this.loadedModels.values()) {
      total += info.vram_mb;
    }
    return total;
  }

  /**
   * Log VRAM state
   */
  logVRAMState() {
    const total = this.getTotalVRAM();
    const percent = ((total / this.totalVRAM) * 100).toFixed(1);
    const models = Array.from(this.loadedModels.keys()).join(', ') || 'none';

    this.log(`VRAM: ${(total / 1024).toFixed(1)}GB / ${(this.totalVRAM / 1024).toFixed(0)}GB (${percent}%) | Loaded: ${models}`);
  }

  /**
   * Get current stats
   * @returns {Object} - Stats object
   */
  getStats() {
    const total = this.getTotalVRAM();

    return {
      loadedModels: Array.from(this.loadedModels.entries()).map(([name, info]) => ({
        name,
        vram_mb: info.vram_mb,
        lastUsed: new Date(info.lastUsed).toISOString(),
        loadedAt: new Date(info.loadedAt).toISOString(),
        idleSeconds: Math.round((Date.now() - info.lastUsed) / 1000)
      })),
      totalVRAM_mb: total,
      totalVRAM_gb: (total / 1024).toFixed(2),
      maxVRAM_gb: (this.totalVRAM / 1024).toFixed(0),
      usagePercent: ((total / this.totalVRAM) * 100).toFixed(1),
      maxConcurrent: this.maxConcurrent,
      idleTimeoutMinutes: this.idleTimeout / 60000
    };
  }

  /**
   * Shutdown - cleanup interval
   */
  shutdown() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.log('VRAM Manager shutdown');
  }

  /**
   * Log with timestamp
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [VRAM] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    try {
      fs.appendFileSync(this.logPath, logMessage + '\n', 'utf-8');
    } catch (error) {
      // Silently fail if can't write to log
    }
  }
}

// Export singleton instance
const vramManager = new VRAMManager();
module.exports = vramManager;
