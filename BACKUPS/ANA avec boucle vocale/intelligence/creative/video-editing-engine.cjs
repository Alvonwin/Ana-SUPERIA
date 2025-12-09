/**
 * Video Editing Engine - Outil génératif pour Ana
 *
 * ANA SUPERIA - Édition vidéo via FFmpeg
 *
 * PRÉREQUIS: FFmpeg doit être installé
 * Installation: https://ffmpeg.org/download.html
 * Windows: winget install FFmpeg.FFmpeg
 *
 * STATUT ACTUEL: FFmpeg NON installé sur ce système
 *
 * Best Practices 2025:
 * - fluent-ffmpeg pour API Node.js
 * - Streaming pour gros fichiers
 * - GPU encoding si disponible (NVENC RTX 3070)
 *
 * Sources:
 * - https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
 * - https://creatomate.com/blog/how-to-use-ffmpeg-in-nodejs
 * - https://mayallo.com/video-processing-using-ffmpeg-nodejs/
 *
 * Date: 25 Novembre 2025
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// GPU constraint (RTX 3070)
const GPU_VRAM_MB = 8 * 1024; // 8GB

// FFmpeg status
let FFMPEG_AVAILABLE = false;
let FFMPEG_PATH = null;
let FFPROBE_PATH = null;
let FFMPEG_VERSION = null;

// Presets optimisés pour RTX 3070 NVENC
const ENCODING_PRESETS = {
  // CPU presets (libx264)
  cpu_fast: { codec: 'libx264', preset: 'veryfast', crf: 23 },
  cpu_balanced: { codec: 'libx264', preset: 'medium', crf: 20 },
  cpu_quality: { codec: 'libx264', preset: 'slow', crf: 18 },

  // GPU presets (NVENC - RTX 3070)
  gpu_fast: { codec: 'h264_nvenc', preset: 'p4', cq: 23 },
  gpu_balanced: { codec: 'h264_nvenc', preset: 'p5', cq: 20 },
  gpu_quality: { codec: 'h264_nvenc', preset: 'p7', cq: 18 }
};

// Output formats supportés
const OUTPUT_FORMATS = {
  mp4: { ext: 'mp4', container: 'mp4', movflags: '+faststart' },
  webm: { ext: 'webm', container: 'webm', codec: 'libvpx-vp9' },
  gif: { ext: 'gif', container: 'gif' },
  hls: { ext: 'm3u8', container: 'hls' }
};

class VideoEditingEngine {
  constructor(config = {}) {
    this.outputDir = config.outputDir || path.join('E:', 'ANA', 'output', 'video');
    this.tempDir = config.tempDir || path.join('E:', 'ANA', 'temp', 'video');
    this.logPath = path.join('E:', 'ANA', 'logs', 'video-engine.log');
    this.useGPU = config.useGPU !== false; // Default true for RTX 3070

    // Stats tracking
    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalProcessingTimeMs: 0
    };

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Initialize engine - check FFmpeg availability
   * @returns {Promise<Object>} - Status object
   */
  async initialize() {
    this.log('Initializing Video Editing Engine...');

    // Check FFmpeg installation
    const ffmpegStatus = await this.checkFFmpegInstallation();

    FFMPEG_AVAILABLE = ffmpegStatus.available;
    FFMPEG_PATH = ffmpegStatus.ffmpegPath;
    FFPROBE_PATH = ffmpegStatus.ffprobePath;
    FFMPEG_VERSION = ffmpegStatus.version;

    if (!FFMPEG_AVAILABLE) {
      this.log('FFmpeg NOT installed - video editing disabled', 'error');
      this.log('Installation: winget install FFmpeg.FFmpeg', 'info');
      return {
        success: false,
        available: false,
        error: 'FFmpeg not installed',
        installInstructions: 'Run: winget install FFmpeg.FFmpeg'
      };
    }

    this.log(`FFmpeg ${FFMPEG_VERSION} found at ${FFMPEG_PATH}`);

    // Check NVENC availability
    const nvencAvailable = await this.checkNVENCAvailable();

    return {
      success: true,
      available: true,
      ffmpegVersion: FFMPEG_VERSION,
      ffmpegPath: FFMPEG_PATH,
      ffprobePath: FFPROBE_PATH,
      nvencAvailable,
      gpu: 'RTX 3070 8GB'
    };
  }

  /**
   * Check if FFmpeg is installed
   */
  async checkFFmpegInstallation() {
    const result = {
      available: false,
      ffmpegPath: null,
      ffprobePath: null,
      version: null
    };

    try {
      // Try common paths
      const possiblePaths = [
        'ffmpeg',
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_*', 'ffmpeg-*', 'bin', 'ffmpeg.exe')
      ];

      for (const ffmpegPath of possiblePaths) {
        try {
          const output = execSync(`"${ffmpegPath}" -version`, {
            encoding: 'utf-8',
            timeout: 5000,
            windowsHide: true
          });

          const versionMatch = output.match(/ffmpeg version (\S+)/);
          if (versionMatch) {
            result.available = true;
            result.ffmpegPath = ffmpegPath;
            result.ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');
            result.version = versionMatch[1];
            return result;
          }
        } catch (e) {
          // Try next path
        }
      }
    } catch (error) {
      this.log(`FFmpeg check error: ${error.message}`, 'warn');
    }

    return result;
  }

  /**
   * Check if NVENC is available (RTX 3070)
   */
  async checkNVENCAvailable() {
    if (!FFMPEG_AVAILABLE) return false;

    try {
      const output = execSync(`"${FFMPEG_PATH}" -encoders`, {
        encoding: 'utf-8',
        timeout: 5000,
        windowsHide: true
      });
      return output.includes('h264_nvenc');
    } catch (error) {
      return false;
    }
  }

  /**
   * Get video metadata
   * @param {string} inputPath - Path to video file
   * @returns {Promise<Object>} - Video metadata
   */
  async getMetadata(inputPath) {
    this.requireFFmpeg();

    if (!fs.existsSync(inputPath)) {
      throw new Error(`File not found: ${inputPath}`);
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        inputPath
      ];

      const ffprobe = spawn(FFPROBE_PATH, args);
      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => { stdout += data.toString(); });
      ffprobe.stderr.on('data', (data) => { stderr += data.toString(); });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const metadata = JSON.parse(stdout);
            resolve(this.parseMetadata(metadata));
          } catch (e) {
            reject(new Error(`Failed to parse metadata: ${e.message}`));
          }
        } else {
          reject(new Error(`ffprobe failed: ${stderr}`));
        }
      });

      ffprobe.on('error', reject);
    });
  }

  /**
   * Parse ffprobe metadata into simplified format
   */
  parseMetadata(raw) {
    const videoStream = raw.streams?.find(s => s.codec_type === 'video');
    const audioStream = raw.streams?.find(s => s.codec_type === 'audio');

    return {
      duration: parseFloat(raw.format?.duration || 0),
      size: parseInt(raw.format?.size || 0),
      bitrate: parseInt(raw.format?.bit_rate || 0),
      video: videoStream ? {
        codec: videoStream.codec_name,
        width: videoStream.width,
        height: videoStream.height,
        fps: eval(videoStream.r_frame_rate || '0'),
        bitrate: parseInt(videoStream.bit_rate || 0)
      } : null,
      audio: audioStream ? {
        codec: audioStream.codec_name,
        channels: audioStream.channels,
        sampleRate: parseInt(audioStream.sample_rate || 0),
        bitrate: parseInt(audioStream.bit_rate || 0)
      } : null
    };
  }

  /**
   * Compress/transcode video
   * @param {Object} params - Compression parameters
   */
  async compress(params) {
    this.requireFFmpeg();

    const {
      input,
      output,
      preset = 'gpu_balanced',
      resolution = null, // e.g., '1920x1080'
      fps = null,
      audioBitrate = '128k'
    } = params;

    if (!fs.existsSync(input)) {
      throw new Error(`Input file not found: ${input}`);
    }

    const startTime = Date.now();
    this.stats.totalOperations++;

    const presetConfig = ENCODING_PRESETS[preset];
    if (!presetConfig) {
      throw new Error(`Unknown preset: ${preset}. Available: ${Object.keys(ENCODING_PRESETS).join(', ')}`);
    }

    // Build FFmpeg arguments
    const args = ['-y', '-i', input];

    // Video codec
    args.push('-c:v', presetConfig.codec);

    // Quality setting
    if (presetConfig.crf !== undefined) {
      args.push('-crf', presetConfig.crf.toString());
    }
    if (presetConfig.cq !== undefined) {
      args.push('-cq', presetConfig.cq.toString());
    }
    if (presetConfig.preset) {
      args.push('-preset', presetConfig.preset);
    }

    // Resolution
    if (resolution) {
      args.push('-vf', `scale=${resolution.replace('x', ':')}`);
    }

    // FPS
    if (fps) {
      args.push('-r', fps.toString());
    }

    // Audio
    args.push('-c:a', 'aac', '-b:a', audioBitrate);

    // Output optimization
    args.push('-movflags', '+faststart');

    // Output file
    const outputPath = output || this.generateOutputPath('mp4');
    args.push(outputPath);

    this.log(`Compressing: ${path.basename(input)} → ${path.basename(outputPath)}`);
    this.log(`Preset: ${preset}, Codec: ${presetConfig.codec}`);

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(FFMPEG_PATH, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        // Log progress
        const timeMatch = stderr.match(/time=(\d+:\d+:\d+\.\d+)/);
        if (timeMatch) {
          this.log(`Progress: ${timeMatch[1]}`, 'debug');
        }
      });

      ffmpeg.on('close', (code) => {
        const latencyMs = Date.now() - startTime;

        if (code === 0) {
          this.stats.successfulOperations++;
          this.stats.totalProcessingTimeMs += latencyMs;

          resolve({
            success: true,
            input,
            output: outputPath,
            preset,
            latencyMs
          });
        } else {
          this.stats.failedOperations++;
          reject(new Error(`FFmpeg failed (code ${code}): ${stderr.slice(-500)}`));
        }
      });

      ffmpeg.on('error', (err) => {
        this.stats.failedOperations++;
        reject(err);
      });
    });
  }

  /**
   * Extract thumbnail from video
   */
  async extractThumbnail(params) {
    this.requireFFmpeg();

    const {
      input,
      output,
      timestamp = '00:00:01',
      size = '320x180'
    } = params;

    if (!fs.existsSync(input)) {
      throw new Error(`Input file not found: ${input}`);
    }

    const outputPath = output || this.generateOutputPath('jpg');

    const args = [
      '-y', '-i', input,
      '-ss', timestamp,
      '-vframes', '1',
      '-vf', `scale=${size.replace('x', ':')}`,
      outputPath
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(FFMPEG_PATH, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: outputPath });
        } else {
          reject(new Error(`Thumbnail extraction failed: ${stderr}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  /**
   * Extract audio from video
   */
  async extractAudio(params) {
    this.requireFFmpeg();

    const {
      input,
      output,
      format = 'mp3',
      bitrate = '192k'
    } = params;

    if (!fs.existsSync(input)) {
      throw new Error(`Input file not found: ${input}`);
    }

    const outputPath = output || this.generateOutputPath(format);

    const args = [
      '-y', '-i', input,
      '-vn', // No video
      '-acodec', format === 'mp3' ? 'libmp3lame' : 'aac',
      '-b:a', bitrate,
      outputPath
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(FFMPEG_PATH, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: outputPath });
        } else {
          reject(new Error(`Audio extraction failed: ${stderr}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  /**
   * Concatenate multiple videos
   */
  async concatenate(params) {
    this.requireFFmpeg();

    const { inputs, output } = params;

    if (!Array.isArray(inputs) || inputs.length < 2) {
      throw new Error('Need at least 2 input files');
    }

    for (const input of inputs) {
      if (!fs.existsSync(input)) {
        throw new Error(`Input file not found: ${input}`);
      }
    }

    // Create concat file
    const concatFile = path.join(this.tempDir, `concat_${Date.now()}.txt`);
    const concatContent = inputs.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(concatFile, concatContent);

    const outputPath = output || this.generateOutputPath('mp4');

    const args = [
      '-y', '-f', 'concat', '-safe', '0',
      '-i', concatFile,
      '-c', 'copy',
      outputPath
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(FFMPEG_PATH, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });

      ffmpeg.on('close', (code) => {
        // Cleanup temp file
        try { fs.unlinkSync(concatFile); } catch (e) {}

        if (code === 0) {
          resolve({ success: true, output: outputPath, inputCount: inputs.length });
        } else {
          reject(new Error(`Concatenation failed: ${stderr}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  /**
   * Require FFmpeg to be available
   */
  requireFFmpeg() {
    if (!FFMPEG_AVAILABLE) {
      throw new Error('FFmpeg not installed. Run: winget install FFmpeg.FFmpeg');
    }
  }

  /**
   * Generate unique output path
   */
  generateOutputPath(ext) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.outputDir, `video_${timestamp}.${ext}`);
  }

  /**
   * Ensure directories exist
   */
  ensureDirectories() {
    const dirs = [this.outputDir, this.tempDir, path.dirname(this.logPath)];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      ffmpegAvailable: FFMPEG_AVAILABLE,
      ffmpegVersion: FFMPEG_VERSION,
      successRate: this.stats.totalOperations > 0
        ? ((this.stats.successfulOperations / this.stats.totalOperations) * 100).toFixed(1) + '%'
        : 'N/A',
      avgProcessingTimeMs: this.stats.successfulOperations > 0
        ? Math.round(this.stats.totalProcessingTimeMs / this.stats.successfulOperations)
        : 0
    };
  }

  /**
   * Get available presets
   */
  getPresets() {
    return Object.entries(ENCODING_PRESETS).map(([name, config]) => ({
      name,
      codec: config.codec,
      isGPU: config.codec.includes('nvenc'),
      quality: config.crf || config.cq
    }));
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [VIDEO-ENGINE] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    try {
      fs.appendFileSync(this.logPath, logMessage + '\n', 'utf-8');
    } catch (error) {
      // Silently fail
    }
  }
}

// Export
const videoEngine = new VideoEditingEngine();

module.exports = {
  videoEngine,
  VideoEditingEngine,
  ENCODING_PRESETS,
  OUTPUT_FORMATS,
  FFMPEG_AVAILABLE: () => FFMPEG_AVAILABLE
};
