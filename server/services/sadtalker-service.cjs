/**
 * SadTalker Service - Animation avatar avec lip-sync
 * Génère des vidéos d'Ana parlant à partir d'audio
 * Avec système de CACHE pour phrases courantes
 *
 * Créé: 23 Décembre 2025
 */

const { spawn, execSync } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Configuration
const SADTALKER_PATH = 'E:/AI_Tools/SadTalker';
const PYTHON_PATH = 'C:/Users/niwno/Miniconda3/envs/sadtalker/python.exe';
const ANA_AVATAR = 'E:/Ana/Ana_img2img_00024_.png';
const OUTPUT_DIR = path.join(__dirname, '../../temp/avatar');
const CACHE_DIR = path.join(__dirname, '../../temp/avatar/cache');
const CACHE_INDEX_PATH = path.join(CACHE_DIR, 'index.json');
const FFMPEG_PATH = 'ffmpeg';

class SadTalkerService {
  constructor() {
    this.enabled = true;
    this.processing = false;
    this.stats = {
      requests: 0,
      success: 0,
      errors: 0,
      cacheHits: 0,
      totalProcessingTime: 0
    };
    this.cache = {};

    // Créer les dossiers si nécessaire
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // Charger l'index du cache
    this.loadCacheIndex();

    // Vérifier que SadTalker est installé
    this.checkInstallation();
  }

  /**
   * Charge l'index du cache depuis le disque
   */
  loadCacheIndex() {
    try {
      if (fs.existsSync(CACHE_INDEX_PATH)) {
        this.cache = JSON.parse(fs.readFileSync(CACHE_INDEX_PATH, 'utf-8'));
        const count = Object.keys(this.cache).length;
        console.log(`[SadTalker] Cache chargé: ${count} vidéos en cache`);
      }
    } catch (err) {
      console.error('[SadTalker] Erreur chargement cache:', err.message);
      this.cache = {};
    }
  }

  /**
   * Sauvegarde l'index du cache sur le disque
   */
  saveCacheIndex() {
    try {
      fs.writeFileSync(CACHE_INDEX_PATH, JSON.stringify(this.cache, null, 2));
    } catch (err) {
      console.error('[SadTalker] Erreur sauvegarde cache:', err.message);
    }
  }

  /**
   * Génère une clé de cache à partir du texte
   */
  getCacheKey(text) {
    const normalized = text.toLowerCase().trim();
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Vérifie si une vidéo est en cache
   */
  getFromCache(text) {
    const key = this.getCacheKey(text);
    const entry = this.cache[key];

    if (entry && fs.existsSync(entry.path)) {
      console.log(`[SadTalker] Cache HIT: "${text.substring(0, 30)}..."`);
      this.stats.cacheHits++;
      return entry.path;
    }

    return null;
  }

  /**
   * Ajoute une vidéo au cache
   */
  addToCache(text, videoPath) {
    const key = this.getCacheKey(text);
    const cacheFileName = `${key}.mp4`;
    const cachePath = path.join(CACHE_DIR, cacheFileName);

    try {
      // Copier la vidéo dans le cache
      fs.copyFileSync(videoPath, cachePath);

      this.cache[key] = {
        text: text.substring(0, 100),
        path: cachePath,
        created: new Date().toISOString()
      };

      this.saveCacheIndex();
      console.log(`[SadTalker] Ajouté au cache: "${text.substring(0, 30)}..."`);
      return cachePath;
    } catch (err) {
      console.error('[SadTalker] Erreur ajout cache:', err.message);
      return videoPath;
    }
  }

  checkInstallation() {
    try {
      if (!fs.existsSync(SADTALKER_PATH)) {
        console.error('[SadTalker] ERREUR: SadTalker non trouvé à', SADTALKER_PATH);
        this.enabled = false;
        return false;
      }
      if (!fs.existsSync(PYTHON_PATH)) {
        console.error('[SadTalker] ERREUR: Python conda non trouvé à', PYTHON_PATH);
        this.enabled = false;
        return false;
      }
      if (!fs.existsSync(ANA_AVATAR)) {
        console.error('[SadTalker] ERREUR: Avatar Ana non trouvé à', ANA_AVATAR);
        this.enabled = false;
        return false;
      }
      console.log('[SadTalker] Service initialisé');
      console.log('[SadTalker] Avatar:', ANA_AVATAR);
      return true;
    } catch (err) {
      console.error('[SadTalker] Erreur vérification:', err.message);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Convertit un fichier audio MP3 en WAV
   * @param {string} mp3Path - Chemin du fichier MP3
   * @returns {Promise<string>} - Chemin du fichier WAV
   */
  async convertToWav(mp3Path) {
    const wavPath = mp3Path.replace(/\.mp3$/i, '.wav');

    return new Promise((resolve, reject) => {
      const args = [
        '-i', mp3Path,
        '-ar', '16000',  // Sample rate pour SadTalker
        '-ac', '1',      // Mono
        '-y',            // Overwrite
        wavPath
      ];

      const process = spawn(FFMPEG_PATH, args);

      process.on('close', (code) => {
        if (code === 0 && fs.existsSync(wavPath)) {
          console.log('[SadTalker] Audio converti:', wavPath);
          resolve(wavPath);
        } else {
          reject(new Error(`Conversion WAV échouée (code ${code})`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`FFmpeg erreur: ${err.message}`));
      });
    });
  }

  /**
   * Génère une vidéo d'Ana parlant
   * @param {string} audioPath - Chemin vers le fichier audio (MP3 ou WAV)
   * @returns {Promise<string>} - Chemin vers la vidéo générée
   */
  async animate(audioPath) {
    if (!this.enabled) {
      throw new Error('SadTalker service désactivé');
    }

    if (this.processing) {
      throw new Error('Une génération est déjà en cours');
    }

    this.stats.requests++;
    this.processing = true;
    const startTime = Date.now();

    try {
      // Convertir en WAV si nécessaire
      let wavPath = audioPath;
      if (audioPath.toLowerCase().endsWith('.mp3')) {
        wavPath = await this.convertToWav(audioPath);
      }

      // Générer un nom de fichier unique pour la sortie
      const timestamp = Date.now();
      const outputDir = path.join(OUTPUT_DIR, `ana_${timestamp}`);
      fs.mkdirSync(outputDir, { recursive: true });

      // Lancer SadTalker
      console.log('[SadTalker] Génération vidéo en cours...');

      const videoPath = await this.runSadTalker(wavPath, outputDir);

      // Fusionner l'audio avec la vidéo (meilleure qualité)
      const finalVideoPath = await this.mergeAudio(videoPath, wavPath);

      const processingTime = (Date.now() - startTime) / 1000;
      this.stats.success++;
      this.stats.totalProcessingTime += processingTime;

      console.log(`[SadTalker] Vidéo générée en ${processingTime.toFixed(1)}s:`, finalVideoPath);

      return finalVideoPath;

    } catch (err) {
      this.stats.errors++;
      console.error('[SadTalker] Erreur:', err.message);
      throw err;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Lance SadTalker pour générer la vidéo
   */
  runSadTalker(audioPath, outputDir) {
    return new Promise((resolve, reject) => {
      const args = [
        'inference.py',
        '--driven_audio', audioPath,
        '--source_image', ANA_AVATAR,
        '--enhancer', 'gfpgan',
        '--result_dir', outputDir,
        '--still',  // Mode portrait statique (plus rapide)
        '--preprocess', 'crop'
      ];

      console.log('[SadTalker] Commande:', PYTHON_PATH, args.join(' '));

      const childProc = spawn(PYTHON_PATH, args, {
        cwd: SADTALKER_PATH,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      let stdout = '';
      let stderr = '';

      childProc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProc.on('close', (code) => {
        if (code !== 0) {
          console.error('[SadTalker] Stderr:', stderr);
          reject(new Error(`SadTalker exit code ${code}`));
          return;
        }

        // Trouver le fichier vidéo généré
        try {
          const files = fs.readdirSync(outputDir);
          const videoFile = files.find(f => f.endsWith('.mp4'));

          if (videoFile) {
            resolve(path.join(outputDir, videoFile));
          } else {
            // Chercher dans les sous-dossiers
            const subdirs = files.filter(f => {
              const fullPath = path.join(outputDir, f);
              return fs.statSync(fullPath).isDirectory();
            });

            for (const subdir of subdirs) {
              const subdirPath = path.join(outputDir, subdir);
              const subFiles = fs.readdirSync(subdirPath);
              const video = subFiles.find(f => f.endsWith('.mp4'));
              if (video) {
                resolve(path.join(subdirPath, video));
                return;
              }
            }

            reject(new Error('Vidéo non trouvée dans ' + outputDir));
          }
        } catch (err) {
          reject(new Error(`Erreur lecture résultats: ${err.message}`));
        }
      });

      childProc.on('error', (err) => {
        reject(new Error(`Erreur spawn SadTalker: ${err.message}`));
      });

      // Timeout de 5 minutes
      setTimeout(() => {
        childProc.kill();
        reject(new Error('SadTalker timeout (5 min)'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Fusionne l'audio original avec la vidéo (meilleure qualité)
   */
  mergeAudio(videoPath, audioPath) {
    return new Promise((resolve, reject) => {
      const outputPath = videoPath.replace('.mp4', '_final.mp4');

      const args = [
        '-i', videoPath,
        '-i', audioPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-y',
        outputPath
      ];

      const process = spawn(FFMPEG_PATH, args);

      process.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          // Si la fusion échoue, retourner la vidéo originale
          console.warn('[SadTalker] Fusion audio échouée, utilisation vidéo originale');
          resolve(videoPath);
        }
      });

      process.on('error', () => {
        resolve(videoPath);
      });
    });
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      enabled: this.enabled,
      processing: this.processing,
      avgProcessingTime: this.stats.success > 0
        ? (this.stats.totalProcessingTime / this.stats.success).toFixed(1)
        : 0
    };
  }

  /**
   * Activer/désactiver le service
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Nettoyer les anciennes vidéos (plus de 1 heure)
   */
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    try {
      const dirs = fs.readdirSync(OUTPUT_DIR);
      let cleaned = 0;

      for (const dir of dirs) {
        if (dir.startsWith('ana_')) {
          const dirPath = path.join(OUTPUT_DIR, dir);
          const stat = fs.statSync(dirPath);

          if (stat.mtimeMs < oneHourAgo) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        console.log(`[SadTalker] Nettoyage: ${cleaned} dossiers supprimés`);
      }
    } catch (err) {
      console.error('[SadTalker] Erreur nettoyage:', err.message);
    }
  }
}

// Singleton
const sadtalkerService = new SadTalkerService();

// Nettoyage automatique toutes les heures
setInterval(() => {
  sadtalkerService.cleanup();
}, 60 * 60 * 1000);

module.exports = sadtalkerService;
