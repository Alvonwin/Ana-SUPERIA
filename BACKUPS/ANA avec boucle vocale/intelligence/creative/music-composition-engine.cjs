/**
 * Music Composition Engine - Outil génératif pour Ana
 *
 * ANA SUPERIA - Génération musicale via backends multiples
 *
 * Architecture:
 * - Ana (évolutive) orchestre cet outil (génératif)
 * - Support multi-backend: Local (AudioCraft), API (Replicate/HuggingFace)
 * - Fallback automatique entre backends
 *
 * Best Practices 2025:
 * - Modular backend system
 * - Async/await with proper error handling
 * - Factory pattern for backend selection
 * - Graceful degradation
 *
 * Sources:
 * - https://replicate.com/meta/musicgen
 * - https://huggingface.co/docs/transformers/model_doc/musicgen
 * - https://github.com/facebookresearch/audiocraft
 *
 * Date: 25 Novembre 2025
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration des backends
const BACKENDS = {
  LOCAL: 'local',      // AudioCraft via Python subprocess
  REPLICATE: 'replicate',  // Replicate API
  HUGGINGFACE: 'huggingface', // HuggingFace Inference API
  SIMULATION: 'simulation'  // Mode test sans génération réelle
};

// Modèles MusicGen disponibles
// CONTRAINTES RTX 3070 8GB VRAM:
// - SMALL: ~3GB VRAM → ✅ OK
// - MEDIUM: ~6GB VRAM → ⚠️ Limite (conflit si Ollama actif)
// - LARGE: ~10GB VRAM → ❌ IMPOSSIBLE sur 8GB
// - MELODY: ~6GB VRAM → ⚠️ Limite
const MUSICGEN_MODELS = {
  SMALL: 'facebook/musicgen-small',   // 300M params, ~3GB VRAM - RECOMMANDÉ RTX 3070
  MEDIUM: 'facebook/musicgen-medium', // 1.5B params, ~6GB VRAM - LIMITE
  LARGE: 'facebook/musicgen-large',   // 3.3B params, ~10GB VRAM - INCOMPATIBLE RTX 3070
  MELODY: 'facebook/musicgen-melody'  // 1.5B params, ~6GB VRAM - LIMITE
};

// VRAM requirements par modèle (MB)
const MODEL_VRAM_MB = {
  'facebook/musicgen-small': 3000,
  'facebook/musicgen-medium': 6000,
  'facebook/musicgen-large': 10000,
  'facebook/musicgen-melody': 6000
};

// GPU constraint (RTX 3070)
const GPU_VRAM_MB = 8 * 1024; // 8GB

// Genres et styles supportés
const MUSIC_STYLES = {
  ambient: { tempo: 'slow', mood: 'calm', instruments: 'synthesizers, pads' },
  electronic: { tempo: 'medium', mood: 'energetic', instruments: 'synths, drums, bass' },
  classical: { tempo: 'variable', mood: 'emotional', instruments: 'orchestra, piano, strings' },
  jazz: { tempo: 'medium', mood: 'smooth', instruments: 'piano, saxophone, bass, drums' },
  rock: { tempo: 'fast', mood: 'energetic', instruments: 'electric guitar, drums, bass' },
  lofi: { tempo: 'slow', mood: 'relaxed', instruments: 'piano, vinyl crackle, soft drums' },
  cinematic: { tempo: 'variable', mood: 'epic', instruments: 'orchestra, choir, percussion' }
};

class MusicCompositionEngine {
  constructor(config = {}) {
    this.backend = config.backend || BACKENDS.SIMULATION;
    this.outputDir = config.outputDir || path.join('E:', 'ANA', 'output', 'music');
    this.model = config.model || MUSICGEN_MODELS.SMALL;
    this.logPath = path.join('E:', 'ANA', 'logs', 'music-engine.log');

    // API keys (from environment)
    this.replicateToken = process.env.REPLICATE_API_TOKEN || null;
    this.huggingfaceToken = process.env.HUGGINGFACE_API_TOKEN || null;

    // Python path for local backend
    this.pythonPath = config.pythonPath || 'python';
    this.audiocraft_available = false;

    // Stats tracking
    this.stats = {
      totalGenerations: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      totalDurationGenerated: 0, // in seconds
      byBackend: {}
    };

    // Initialize backend stats
    for (const backend of Object.values(BACKENDS)) {
      this.stats.byBackend[backend] = { attempts: 0, successes: 0, failures: 0 };
    }

    // Ensure directories exist
    this.ensureDirectories();

    // Validate model fits in VRAM
    this.validateModel(this.model);
  }

  /**
   * Validate model can run on RTX 3070 8GB
   * @param {string} model - Model to validate
   * @throws {Error} - If model requires too much VRAM
   */
  validateModel(model) {
    const vramRequired = MODEL_VRAM_MB[model] || 3000;

    if (vramRequired > GPU_VRAM_MB) {
      const errorMsg = `Model ${model} requires ${vramRequired}MB VRAM but RTX 3070 only has ${GPU_VRAM_MB}MB. Use SMALL model instead.`;
      this.log(errorMsg, 'error');
      throw new Error(errorMsg);
    }

    if (vramRequired > 5000) {
      this.log(`WARNING: Model ${model} uses ${vramRequired}MB VRAM - may conflict with Ollama LLMs`, 'warn');
    }
  }

  /**
   * Initialize engine and check backend availability
   */
  async initialize() {
    this.log('Initializing Music Composition Engine (RTX 3070 8GB)...');

    const status = {
      backend: this.backend,
      available: false,
      fallbacks: []
    };

    // Check local AudioCraft availability
    if (this.backend === BACKENDS.LOCAL) {
      this.audiocraft_available = await this.checkAudioCraftAvailable();
      status.available = this.audiocraft_available;

      if (!this.audiocraft_available) {
        this.log('Local AudioCraft not available, will use fallback', 'warn');
        status.fallbacks.push(BACKENDS.REPLICATE, BACKENDS.HUGGINGFACE);
      }
    }

    // Check API availability
    if (this.backend === BACKENDS.REPLICATE || status.fallbacks.includes(BACKENDS.REPLICATE)) {
      if (this.replicateToken) {
        status.available = true;
        this.log('Replicate API configured');
      }
    }

    if (this.backend === BACKENDS.HUGGINGFACE || status.fallbacks.includes(BACKENDS.HUGGINGFACE)) {
      if (this.huggingfaceToken) {
        status.available = true;
        this.log('HuggingFace API configured');
      }
    }

    // Simulation always available
    if (this.backend === BACKENDS.SIMULATION) {
      status.available = true;
      this.log('Simulation mode active');
    }

    return status;
  }

  /**
   * Check if AudioCraft is available locally
   */
  async checkAudioCraftAvailable() {
    return new Promise((resolve) => {
      const check = spawn(this.pythonPath, ['-c', 'import audiocraft; print("OK")']);

      let output = '';
      check.stdout.on('data', (data) => { output += data.toString(); });

      check.on('close', (code) => {
        resolve(code === 0 && output.includes('OK'));
      });

      check.on('error', () => resolve(false));

      // Timeout after 5 seconds
      setTimeout(() => {
        check.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Generate music from text prompt
   * @param {Object} params - Generation parameters
   * @returns {Promise<Object>} - Generation result with file path
   */
  async generate(params) {
    const {
      prompt,
      style = null,
      duration = 10, // seconds (max 30 for MusicGen)
      temperature = 1.0,
      topK = 250,
      topP = 0.0,
      classifierFreeGuidance = 3.0,
      outputFormat = 'wav'
    } = params;

    this.stats.totalGenerations++;
    const startTime = Date.now();

    // Build enhanced prompt with style
    const enhancedPrompt = this.buildEnhancedPrompt(prompt, style);

    this.log(`Generating music: "${enhancedPrompt.substring(0, 50)}..." (${duration}s)`);

    // Try backends in order
    const backendsToTry = this.getBackendOrder();

    for (const backend of backendsToTry) {
      try {
        this.stats.byBackend[backend].attempts++;

        let result;
        switch (backend) {
          case BACKENDS.LOCAL:
            result = await this.generateLocal(enhancedPrompt, { duration, temperature, topK, topP, classifierFreeGuidance, outputFormat });
            break;
          case BACKENDS.REPLICATE:
            result = await this.generateReplicate(enhancedPrompt, { duration, temperature, topK, topP, classifierFreeGuidance, outputFormat });
            break;
          case BACKENDS.HUGGINGFACE:
            result = await this.generateHuggingFace(enhancedPrompt, { duration, outputFormat });
            break;
          case BACKENDS.SIMULATION:
            result = await this.generateSimulation(enhancedPrompt, { duration, outputFormat });
            break;
          default:
            throw new Error(`Unknown backend: ${backend}`);
        }

        // Success
        this.stats.byBackend[backend].successes++;
        this.stats.successfulGenerations++;
        this.stats.totalDurationGenerated += duration;

        return {
          success: true,
          backend,
          prompt: enhancedPrompt,
          duration,
          filePath: result.filePath,
          latencyMs: Date.now() - startTime
        };

      } catch (error) {
        this.log(`Backend ${backend} failed: ${error.message}`, 'warn');
        this.stats.byBackend[backend].failures++;
      }
    }

    // All backends failed
    this.stats.failedGenerations++;
    return {
      success: false,
      error: 'All backends failed',
      backendsAttempted: backendsToTry,
      latencyMs: Date.now() - startTime
    };
  }

  /**
   * Get backend order based on configuration and availability
   */
  getBackendOrder() {
    const order = [];

    // Primary backend first
    order.push(this.backend);

    // Add fallbacks
    if (this.backend === BACKENDS.LOCAL && !this.audiocraft_available) {
      // Local unavailable, try APIs
      if (this.replicateToken) order.push(BACKENDS.REPLICATE);
      if (this.huggingfaceToken) order.push(BACKENDS.HUGGINGFACE);
    }

    // Always add simulation as last resort
    if (!order.includes(BACKENDS.SIMULATION)) {
      order.push(BACKENDS.SIMULATION);
    }

    return [...new Set(order)]; // Remove duplicates
  }

  /**
   * Build enhanced prompt with style information
   */
  buildEnhancedPrompt(prompt, style) {
    if (!style || !MUSIC_STYLES[style]) {
      return prompt;
    }

    const styleInfo = MUSIC_STYLES[style];
    return `${prompt}. Style: ${style}, tempo: ${styleInfo.tempo}, mood: ${styleInfo.mood}, instruments: ${styleInfo.instruments}`;
  }

  /**
   * Generate music locally via AudioCraft Python subprocess
   */
  async generateLocal(prompt, options) {
    const { duration, temperature, topK, topP, classifierFreeGuidance, outputFormat } = options;

    const outputFile = this.generateOutputPath(outputFormat);

    // Python script for AudioCraft generation
    const pythonScript = `
import sys
import torchaudio
from audiocraft.models import MusicGen
from audiocraft.data.audio import audio_write

model = MusicGen.get_pretrained('${this.model.split('/').pop()}')
model.set_generation_params(
    duration=${Math.min(duration, 30)},
    temperature=${temperature},
    top_k=${topK},
    top_p=${topP},
    cfg_coef=${classifierFreeGuidance}
)

wav = model.generate(['${prompt.replace(/'/g, "\\'")}'])
audio_write('${outputFile.replace(/\\/g, '/')}', wav[0].cpu(), model.sample_rate, strategy="loudness")
print('SUCCESS')
`;

    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, ['-c', pythonScript]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => { stdout += data.toString(); });
      process.stderr.on('data', (data) => { stderr += data.toString(); });

      process.on('close', (code) => {
        if (code === 0 && stdout.includes('SUCCESS')) {
          resolve({ filePath: outputFile + '.wav' });
        } else {
          reject(new Error(stderr || 'AudioCraft generation failed'));
        }
      });

      process.on('error', (err) => reject(err));

      // Timeout for generation (2 minutes max)
      setTimeout(() => {
        process.kill();
        reject(new Error('Local generation timeout'));
      }, 120000);
    });
  }

  /**
   * Generate music via Replicate API
   */
  async generateReplicate(prompt, options) {
    if (!this.replicateToken) {
      throw new Error('Replicate API token not configured');
    }

    const { duration, temperature, topK, topP, classifierFreeGuidance, outputFormat } = options;

    // Create prediction
    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38',
        input: {
          prompt: prompt,
          duration: Math.min(duration, 30),
          temperature: temperature,
          top_k: topK,
          top_p: topP,
          classifier_free_guidance: classifierFreeGuidance,
          output_format: outputFormat
        }
      },
      {
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Poll for completion
    const predictionId = response.data.id;
    let prediction = response.data;

    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await this.sleep(2000);

      const statusResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        { headers: { 'Authorization': `Token ${this.replicateToken}` } }
      );
      prediction = statusResponse.data;
    }

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || 'Replicate generation failed');
    }

    // Download audio file
    const audioUrl = prediction.output;
    const outputFile = this.generateOutputPath(outputFormat);

    const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputFile, Buffer.from(audioResponse.data));

    return { filePath: outputFile };
  }

  /**
   * Generate music via HuggingFace Inference API
   */
  async generateHuggingFace(prompt, options) {
    if (!this.huggingfaceToken) {
      throw new Error('HuggingFace API token not configured');
    }

    const { duration, outputFormat } = options;

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${this.model}`,
      { inputs: prompt },
      {
        headers: {
          'Authorization': `Bearer ${this.huggingfaceToken}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 120000
      }
    );

    const outputFile = this.generateOutputPath('wav');
    fs.writeFileSync(outputFile, Buffer.from(response.data));

    return { filePath: outputFile };
  }

  /**
   * Generate simulated music file (for testing)
   */
  async generateSimulation(prompt, options) {
    const { duration, outputFormat } = options;

    this.log('SIMULATION MODE: Creating placeholder file');

    // Generate a valid WAV header with silence
    const sampleRate = 44100;
    const numChannels = 2;
    const bitsPerSample = 16;
    const numSamples = sampleRate * duration * numChannels;
    const dataSize = numSamples * (bitsPerSample / 8);
    const fileSize = 44 + dataSize;

    const buffer = Buffer.alloc(fileSize);

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(1, 20);  // PCM format
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Generate simple sine wave tone (440Hz) for audible output
    const frequency = 440;
    const amplitude = 10000;
    for (let i = 0; i < sampleRate * duration; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
      const sampleInt = Math.round(sample);
      // Left channel
      buffer.writeInt16LE(sampleInt, 44 + i * 4);
      // Right channel
      buffer.writeInt16LE(sampleInt, 44 + i * 4 + 2);
    }

    const outputFile = this.generateOutputPath('wav');
    fs.writeFileSync(outputFile, buffer);

    // Also create metadata file
    const metadataFile = outputFile.replace('.wav', '.json');
    fs.writeFileSync(metadataFile, JSON.stringify({
      prompt,
      duration,
      generatedAt: new Date().toISOString(),
      backend: 'simulation',
      note: 'This is a simulation placeholder - install AudioCraft for real music generation'
    }, null, 2));

    return { filePath: outputFile };
  }

  /**
   * Generate unique output path
   */
  generateOutputPath(format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.outputDir, `music_${timestamp}.${format}`);
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [
      this.outputDir,
      path.dirname(this.logPath)
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Get available styles
   */
  getAvailableStyles() {
    return Object.keys(MUSIC_STYLES);
  }

  /**
   * Get style details
   */
  getStyleDetails(style) {
    return MUSIC_STYLES[style] || null;
  }

  /**
   * Get engine statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalGenerations > 0
        ? ((this.stats.successfulGenerations / this.stats.totalGenerations) * 100).toFixed(1) + '%'
        : 'N/A',
      averageDuration: this.stats.successfulGenerations > 0
        ? (this.stats.totalDurationGenerated / this.stats.successfulGenerations).toFixed(1) + 's'
        : 'N/A'
    };
  }

  /**
   * Get available models info
   */
  getModelsInfo() {
    return Object.entries(MUSICGEN_MODELS).map(([key, value]) => ({
      key,
      model: value,
      description: this.getModelDescription(key)
    }));
  }

  /**
   * Get model description
   */
  getModelDescription(key) {
    const descriptions = {
      SMALL: '300M parameters, fastest generation, lower quality',
      MEDIUM: '1.5B parameters, balanced speed/quality',
      LARGE: '3.3B parameters, highest quality, slowest',
      MELODY: '1.5B parameters, can condition on input audio melody'
    };
    return descriptions[key] || 'Unknown model';
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [MUSIC-ENGINE] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    try {
      fs.appendFileSync(this.logPath, logMessage + '\n', 'utf-8');
    } catch (error) {
      // Silently fail
    }
  }
}

// Export singleton and classes
const musicEngine = new MusicCompositionEngine();

module.exports = {
  musicEngine,
  MusicCompositionEngine,
  BACKENDS,
  MUSICGEN_MODELS,
  MUSIC_STYLES
};
