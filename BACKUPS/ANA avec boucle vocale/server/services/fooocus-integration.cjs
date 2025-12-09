/**
 * Fooocus Integration - Interface simplifiée pour génération d'images
 *
 * ANA SUPERIA - Intégration Fooocus pour génération rapide SDXL
 *
 * Best Practices 2025:
 * - API locale via Gradio backend
 * - Presets optimisés pour RTX 3070 8GB
 * - Queue de génération avec timeout
 * - Logging des créations
 *
 * Fooocus Path: E:\AI_Tools\Fooocus_win64_2-5-0\
 *
 * Date: 25 Novembre 2025
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Configuration
const FOOOCUS_PATH = path.join('E:', 'AI_Tools', 'Fooocus_win64_2-5-0');
const FOOOCUS_OUTPUT = path.join('E:', 'ANA', 'creative_studio', 'gallery', 'fooocus');
const FOOOCUS_LOG = path.join('E:', 'ANA', 'logs', 'fooocus.log');

// RTX 3070 8GB optimized presets
const PRESETS = {
  default: {
    name: 'Default',
    description: 'Standard quality, balanced speed',
    performance: 'Quality',
    aspectRatio: '1024×1024',
    steps: 30,
    guidance: 7
  },
  lightning: {
    name: 'Lightning',
    description: 'Ultra fast generation (4 steps)',
    performance: 'Lightning',
    aspectRatio: '1024×1024',
    steps: 4,
    guidance: 7
  },
  anime: {
    name: 'Anime',
    description: 'Anime style images',
    performance: 'Quality',
    aspectRatio: '896×1152',
    steps: 30,
    guidance: 7,
    style: 'anime'
  },
  realistic: {
    name: 'Realistic',
    description: 'Photorealistic images',
    performance: 'Quality',
    aspectRatio: '1024×1024',
    steps: 40,
    guidance: 8,
    style: 'realistic'
  },
  portrait: {
    name: 'Portrait',
    description: 'Portrait format',
    performance: 'Quality',
    aspectRatio: '768×1152',
    steps: 35,
    guidance: 7
  },
  landscape: {
    name: 'Landscape',
    description: 'Landscape format',
    performance: 'Quality',
    aspectRatio: '1152×768',
    steps: 35,
    guidance: 7
  }
};

// Style presets
const STYLES = [
  'Fooocus V2',
  'Fooocus Enhance',
  'Fooocus Sharp',
  'Fooocus Masterpiece',
  'MRE Cinematic Dynamic',
  'MRE Spontaneous Picture',
  'SAI Anime',
  'SAI Photographic',
  'SAI Digital Art',
  'SAI Fantasy Art'
];

class FooocusIntegration {
  constructor() {
    this.process = null;
    this.isRunning = false;
    this.apiUrl = 'http://127.0.0.1:7865'; // Default Fooocus port
    this.queue = [];
    this.currentJob = null;
    this.generationCount = 0;
    this.initialized = false;

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [
      FOOOCUS_OUTPUT,
      path.dirname(FOOOCUS_LOG)
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Check if Fooocus is installed
   */
  isInstalled() {
    const runBat = path.join(FOOOCUS_PATH, 'run.bat');
    return fs.existsSync(runBat);
  }

  /**
   * Start Fooocus server
   */
  async start() {
    if (this.isRunning) {
      this.log('Fooocus already running');
      return { success: true, status: 'already_running' };
    }

    if (!this.isInstalled()) {
      this.log('Fooocus not installed at: ' + FOOOCUS_PATH, 'error');
      return {
        success: false,
        error: 'Fooocus not installed',
        installPath: FOOOCUS_PATH
      };
    }

    try {
      this.log('Starting Fooocus server...');

      // Spawn Fooocus process
      const batFile = path.join(FOOOCUS_PATH, 'run.bat');
      this.process = spawn('cmd', ['/c', batFile], {
        cwd: FOOOCUS_PATH,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.process.stdout.on('data', (data) => {
        this.log(`[STDOUT] ${data.toString().trim()}`);
      });

      this.process.stderr.on('data', (data) => {
        this.log(`[STDERR] ${data.toString().trim()}`);
      });

      this.process.on('exit', (code) => {
        this.log(`Fooocus exited with code ${code}`);
        this.isRunning = false;
        this.process = null;
      });

      // Wait for server to be ready
      const ready = await this.waitForReady(60000); // 60s timeout

      if (ready) {
        this.isRunning = true;
        this.initialized = true;
        this.log('Fooocus server started successfully');
        return { success: true, status: 'started', url: this.apiUrl };
      } else {
        return { success: false, error: 'Timeout waiting for Fooocus to start' };
      }

    } catch (error) {
      this.log(`Failed to start Fooocus: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Wait for Fooocus server to be ready
   */
  async waitForReady(timeout = 60000) {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(this.apiUrl, { timeout: 2000 });
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    return false;
  }

  /**
   * Stop Fooocus server
   */
  async stop() {
    if (!this.isRunning || !this.process) {
      return { success: true, status: 'not_running' };
    }

    try {
      this.log('Stopping Fooocus server...');

      // Kill the process tree on Windows
      process.kill(-this.process.pid);

      this.isRunning = false;
      this.process = null;
      this.log('Fooocus server stopped');
      return { success: true, status: 'stopped' };

    } catch (error) {
      this.log(`Failed to stop Fooocus: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Check server status
   */
  async getStatus() {
    const installed = this.isInstalled();

    if (!installed) {
      return {
        installed: false,
        running: false,
        installPath: FOOOCUS_PATH
      };
    }

    let serverReady = false;
    if (this.isRunning) {
      try {
        await axios.get(this.apiUrl, { timeout: 2000 });
        serverReady = true;
      } catch (error) {
        serverReady = false;
      }
    }

    return {
      installed: true,
      running: this.isRunning,
      serverReady,
      apiUrl: this.apiUrl,
      queueLength: this.queue.length,
      generationCount: this.generationCount,
      presets: Object.keys(PRESETS),
      styles: STYLES
    };
  }

  /**
   * Generate image (simplified API)
   * Note: This is a simplified interface. Full Fooocus API requires Gradio
   *
   * @param {Object} params - Generation parameters
   * @returns {Object} - Generation result
   */
  async generate(params) {
    const {
      prompt,
      negativePrompt = '',
      preset = 'default',
      style = 'Fooocus V2',
      seed = -1,
      outputName
    } = params;

    if (!prompt) {
      return { success: false, error: 'Prompt is required' };
    }

    const presetConfig = PRESETS[preset] || PRESETS.default;

    this.log(`Generating image with preset: ${preset}`);
    this.log(`Prompt: ${prompt.substring(0, 100)}...`);

    // Check if server is running
    if (!this.isRunning) {
      return {
        success: false,
        error: 'Fooocus server not running. Call start() first.',
        needsStart: true
      };
    }

    try {
      // Note: Fooocus uses Gradio API which is more complex
      // This is a placeholder for the actual API integration
      // Real implementation would use gradio_client or HTTP requests to Gradio endpoints

      const jobId = `fooocus-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // For now, return a job structure
      // In production, this would interact with Fooocus's Gradio API
      const job = {
        id: jobId,
        status: 'pending',
        prompt,
        negativePrompt,
        preset,
        presetConfig,
        style,
        seed,
        createdAt: new Date().toISOString(),
        estimatedTime: presetConfig.steps * 0.5 // Rough estimate
      };

      // Add to queue
      this.queue.push(job);
      this.generationCount++;

      this.log(`Job queued: ${jobId}`);

      return {
        success: true,
        jobId,
        status: 'queued',
        position: this.queue.length,
        message: 'Note: Full Gradio API integration required for actual generation',
        manualInstructions: {
          step1: `Open Fooocus UI at ${this.apiUrl}`,
          step2: `Enter prompt: ${prompt}`,
          step3: `Select style: ${style}`,
          step4: `Set performance: ${presetConfig.performance}`,
          step5: 'Click Generate'
        }
      };

    } catch (error) {
      this.log(`Generation failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available presets
   */
  getPresets() {
    return PRESETS;
  }

  /**
   * Get available styles
   */
  getStyles() {
    return STYLES;
  }

  /**
   * Get generation queue
   */
  getQueue() {
    return {
      length: this.queue.length,
      jobs: this.queue,
      currentJob: this.currentJob
    };
  }

  /**
   * Quick generate with preset
   */
  async quickGenerate(prompt, presetName = 'lightning') {
    return this.generate({
      prompt,
      preset: presetName
    });
  }

  /**
   * Generate anime style image
   */
  async generateAnime(prompt) {
    return this.generate({
      prompt,
      preset: 'anime',
      style: 'SAI Anime'
    });
  }

  /**
   * Generate realistic image
   */
  async generateRealistic(prompt) {
    return this.generate({
      prompt,
      preset: 'realistic',
      style: 'SAI Photographic'
    });
  }

  /**
   * Get Fooocus path info
   */
  getPathInfo() {
    return {
      installPath: FOOOCUS_PATH,
      outputPath: FOOOCUS_OUTPUT,
      logPath: FOOOCUS_LOG,
      runBat: path.join(FOOOCUS_PATH, 'run.bat'),
      animeBat: path.join(FOOOCUS_PATH, 'run_anime.bat'),
      realisticBat: path.join(FOOOCUS_PATH, 'run_realistic.bat')
    };
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [FOOOCUS] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    try {
      fs.appendFileSync(FOOOCUS_LOG, logMessage + '\n', 'utf-8');
    } catch (error) {
      // Silently fail
    }
  }
}

// Export singleton
const fooocusIntegration = new FooocusIntegration();
module.exports = fooocusIntegration;
