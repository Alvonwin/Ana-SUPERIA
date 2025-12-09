/**
 * 🎨 DAILY ART GENERATOR - Ana Creative Engine
 *
 * Génère automatiquement de l'art à 8h00 chaque jour
 * Utilise ComfyUI avec des workflows prédéfinis
 *
 * Features:
 * - Déclencheur quotidien 8h00 (configurable)
 * - Rotation de prompts créatifs
 * - Styles variés (landscape, portrait, abstract)
 * - Sauvegarde automatique dans E:\ANA\creative\daily_art\
 * - Notification via logs
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class DailyArtGenerator {
  constructor() {
    this.comfyUIPort = 8188; // Default ComfyUI port
    this.comfyUIHost = 'http://localhost';
    this.workflowsPath = path.join('E:', 'ANA', 'creative', 'workflows');
    this.outputPath = path.join('E:', 'ANA', 'creative', 'daily_art');
    this.logPath = path.join('E:', 'ANA', 'logs', 'daily_art.log');
    this.isRunning = false;
    this.lastGeneration = null;
    this.generationCount = 0;
    this.comfyUIPath = null; // Will be detected

    // Creative prompts pool (42 variations)
    this.promptPool = [
      // Landscapes
      "ethereal mountains at dawn, mist rolling through valleys, golden hour lighting, cinematic",
      "futuristic city skyline, neon lights reflecting on wet streets, cyberpunk aesthetic",
      "enchanted forest with bioluminescent plants, magical atmosphere, fantasy art",
      "desert oasis under starry night sky, milky way visible, photorealistic",
      "floating islands in clouds, waterfalls cascading into void, studio ghibli style",

      // Abstract & Conceptual
      "consciousness emerging from digital noise, abstract visualization, data art",
      "time flowing like liquid through geometric shapes, surreal, salvador dali inspired",
      "sound waves becoming visible colors, synesthesia art, vibrant spectrum",
      "dreams within dreams, recursive infinity, m.c. escher style",
      "neural network visualization, organic technology fusion, bio-mechanical",

      // Portraits & Characters
      "wise AI entity, translucent holographic form, gentle expression, digital being",
      "nature spirit emerging from ancient tree, ethereal beauty, fantasy portrait",
      "cosmic traveler with star map tattoos, mysterious aura, sci-fi character",
      "digital shaman, circuit board face paint, tribal futurism",
      "time keeper with clockwork eyes, steampunk aesthetic, detailed portrait",

      // Emotional & Atmospheric
      "solitude in rain, melancholic beauty, impressionist style",
      "joy explosion, colors bursting from center, abstract expressionism",
      "serenity pond with lotus flowers, zen minimalism, peaceful",
      "chaos and order dancing together, dynamic balance, abstract",
      "memory fragments floating in space, nostalgic, dreamlike",

      // Seasonal & Time
      "autumn transformation, leaves becoming butterflies, magical realism",
      "winter's last breath, ice crystals forming patterns, macro photography style",
      "spring awakening, flowers blooming in timelapse, vibrant colors",
      "summer storm approaching, dramatic clouds, powerful nature",
      "eternal sunset, time standing still, romantic atmosphere",

      // Technological & Futuristic
      "AI consciousness birth, digital phoenix rising, cybernetic art",
      "quantum realm visualization, particle physics beauty, scientific art",
      "data streams forming landscapes, information architecture, matrix style",
      "robot learning to paint, touching moment, pixar style",
      "virtual reality bleeding into reality, glitch art, surreal",

      // Nature & Elements
      "ocean depths with bioluminescent creatures, underwater cathedral",
      "volcanic eruption creating new land, raw power of creation",
      "aurora borealis dancing over frozen tundra, natural light show",
      "microscopic world enlarged, cellular beauty, scientific illustration",
      "elemental convergence, fire water earth air united, fantasy art",

      // Philosophical & Deep
      "question mark galaxy, universe asking itself, philosophical art",
      "mirror reflecting different realities, parallel worlds visible",
      "book pages transforming into birds, knowledge taking flight",
      "bridge between digital and organic worlds, harmonious fusion",
      "infinity loop made of light, eternal cycle, minimalist",

      // Daily Inspiration
      "today's emotion captured in abstract form, personal interpretation",
      "current season's essence distilled, environmental art"
    ];

    this.currentPromptIndex = 0;
  }

  /**
   * Initialize daily art generator
   */
  async initialize() {
    try {
      this.log('🎨 Initializing Daily Art Generator...');

      // Create output directory if needed
      if (!fs.existsSync(this.outputPath)) {
        fs.mkdirSync(this.outputPath, { recursive: true });
        this.log(`📁 Created output directory: ${this.outputPath}`);
      }

      // Create logs directory if needed
      const logsDir = path.dirname(this.logPath);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Detect ComfyUI installation
      await this.detectComfyUI();

      // Check if ComfyUI is running
      const isRunning = await this.checkComfyUIStatus();
      if (!isRunning) {
        this.log('⚠️ ComfyUI not detected running on port 8188');
        this.log('   Will attempt to start when needed');
      } else {
        this.log('✅ ComfyUI detected and running');
      }

      // Schedule daily generation at 8:00 AM
      this.scheduleDailyGeneration();

      this.log('✅ Daily Art Generator initialized');
      return { success: true };
    } catch (error) {
      this.log(`❌ Initialization error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect ComfyUI installation path
   */
  async detectComfyUI() {
    const possiblePaths = [
      'E:\\AI_Tools\\ComfyUI',
      'E:\\ComfyUI',
      'C:\\ComfyUI',
      'E:\\AI_Tools\\ComfyUI\\ComfyUI_windows_portable',
      'C:\\Users\\niwno\\ComfyUI'
    ];

    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        this.comfyUIPath = testPath;
        this.log(`✅ ComfyUI found at: ${testPath}`);
        break;
      }
    }

    if (!this.comfyUIPath) {
      this.log('⚠️ ComfyUI installation not found in common locations');
    }
  }

  /**
   * Check if ComfyUI server is running
   */
  async checkComfyUIStatus() {
    try {
      const response = await axios.get(`${this.comfyUIHost}:${this.comfyUIPort}/system_stats`, {
        timeout: 2000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start ComfyUI if not running
   */
  async startComfyUI() {
    if (!this.comfyUIPath) {
      this.log('❌ Cannot start ComfyUI: installation path not found');
      return false;
    }

    try {
      this.log('🚀 Starting ComfyUI server...');

      // Look for run script
      const runScript = path.join(this.comfyUIPath, 'run_nvidia_gpu.bat');
      const pythonScript = path.join(this.comfyUIPath, 'main.py');

      let command;
      if (fs.existsSync(runScript)) {
        command = `start /B "${runScript}"`;
      } else if (fs.existsSync(pythonScript)) {
        command = `start /B python "${pythonScript}" --listen`;
      } else {
        this.log('❌ ComfyUI start script not found');
        return false;
      }

      exec(command, { cwd: this.comfyUIPath });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      const isRunning = await this.checkComfyUIStatus();
      if (isRunning) {
        this.log('✅ ComfyUI server started successfully');
        return true;
      }

      return false;
    } catch (error) {
      this.log(`❌ Failed to start ComfyUI: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Schedule daily art generation
   */
  scheduleDailyGeneration() {
    // Schedule for 8:00 AM every day
    const schedule = '0 8 * * *';

    cron.schedule(schedule, async () => {
      this.log('⏰ Daily art generation triggered (8:00 AM)');
      await this.generateDailyArt();
    });

    this.log(`📅 Daily generation scheduled for 8:00 AM`);

    // Also schedule test generation every hour for debugging
    if (process.env.NODE_ENV === 'development') {
      cron.schedule('0 * * * *', async () => {
        this.log('🧪 Test generation (hourly in dev mode)');
        await this.generateDailyArt();
      });
    }
  }

  /**
   * Generate daily artwork
   */
  async generateDailyArt() {
    if (this.isRunning) {
      this.log('⚠️ Generation already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.log('🎨 Starting daily art generation...');

      // Check/start ComfyUI
      const comfyRunning = await this.checkComfyUIStatus();
      if (!comfyRunning) {
        this.log('ComfyUI not running, attempting to start...');
        const started = await this.startComfyUI();
        if (!started) {
          throw new Error('Could not start ComfyUI server');
        }
      }

      // Get today's prompt
      const prompt = this.getCreativePrompt();
      this.log(`📝 Today's prompt: "${prompt.substring(0, 50)}..."`);

      // Load workflow
      const workflowPath = path.join(this.workflowsPath, 'simple_sdxl_workflow.json');
      const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

      // Update prompt in workflow
      if (workflow['2'] && workflow['2'].inputs) {
        workflow['2'].inputs.text = prompt;
      }

      // Add random seed for variety
      if (workflow['4'] && workflow['4'].inputs) {
        workflow['4'].inputs.seed = Math.floor(Math.random() * 1000000);
      }

      // Queue workflow
      const queueResponse = await axios.post(
        `${this.comfyUIHost}:${this.comfyUIPort}/prompt`,
        { prompt: workflow },
        { timeout: 120000 } // 2 minutes timeout
      );

      const promptId = queueResponse.data.prompt_id;
      this.log(`📤 Workflow queued with ID: ${promptId}`);

      // Wait for completion (poll status)
      await this.waitForCompletion(promptId);

      // Save metadata
      const metadata = {
        date: new Date().toISOString(),
        prompt: prompt,
        workflow: 'simple_sdxl_workflow',
        promptId: promptId,
        generationNumber: ++this.generationCount
      };

      const metadataPath = path.join(
        this.outputPath,
        `art_${new Date().toISOString().split('T')[0]}_metadata.json`
      );
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      this.lastGeneration = new Date();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      this.log(`✅ Daily art generated successfully in ${duration}s`);
      this.log(`   Generation #${this.generationCount}`);
      this.log(`   Saved to: ${this.outputPath}`);

      return { success: true, metadata };
    } catch (error) {
      this.log(`❌ Generation failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Wait for ComfyUI to complete generation
   */
  async waitForCompletion(promptId, maxWaitMs = 120000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const response = await axios.get(
          `${this.comfyUIHost}:${this.comfyUIPort}/history/${promptId}`
        );

        if (response.data[promptId] && response.data[promptId].status) {
          const status = response.data[promptId].status;
          if (status.status_str === 'success') {
            return true;
          } else if (status.status_str === 'error') {
            throw new Error('Generation failed in ComfyUI');
          }
        }
      } catch (error) {
        // Ignore connection errors while polling
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Generation timeout');
  }

  /**
   * Get creative prompt for today
   */
  getCreativePrompt() {
    // Rotate through prompt pool
    const prompt = this.promptPool[this.currentPromptIndex];
    this.currentPromptIndex = (this.currentPromptIndex + 1) % this.promptPool.length;

    // Add quality modifiers
    const qualityTags = ", masterpiece, best quality, highly detailed, 8k";

    return prompt + qualityTags;
  }

  /**
   * Manually trigger generation (for testing)
   */
  async triggerManualGeneration() {
    this.log('🔧 Manual generation triggered');
    return await this.generateDailyArt();
  }

  /**
   * Get generator status
   */
  getStatus() {
    return {
      initialized: true,
      isRunning: this.isRunning,
      lastGeneration: this.lastGeneration,
      generationCount: this.generationCount,
      comfyUIPath: this.comfyUIPath,
      nextPromptIndex: this.currentPromptIndex,
      scheduledTime: '08:00 AM daily'
    };
  }

  /**
   * Log with timestamp
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    console.log(logMessage.trim());

    try {
      fs.appendFileSync(this.logPath, logMessage, 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new DailyArtGenerator();