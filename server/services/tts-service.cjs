/**
 * TTS Service - Synthèse vocale pour Ana
 * Utilise edge-tts avec la voix québécoise Sylvie
 *
 * Créé: 16 Décembre 2025
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const PYTHON_PATH = 'C:\\Users\\niwno\\AppData\\Local\\Programs\\Python\\Python310\\python.exe';
const VOICE = 'fr-CA-SylvieNeural'; // Voix québécoise féminine
const OUTPUT_DIR = path.join(__dirname, '../../temp/tts');

// Conversion chiffres → mots pour une meilleure prononciation
const CHIFFRES_EN_MOTS = {
  '0': 'zéro',
  '1': 'un',
  '2': 'deux',
  '3': 'trois',
  '4': 'quatre',
  '5': 'cinq',
  '6': 'six',
  '7': 'sept',
  '8': 'huit',
  '9': 'neuf',
  '10': 'dix'
};

/**
 * Convertit les chiffres isolés en mots pour une meilleure prononciation TTS
 * Ex: "Joueur 1" → "Joueur un", "Au tour de Joueur 2" → "Au tour de Joueur deux"
 */
function convertirChiffresEnMots(text) {
  // Remplacer les chiffres isolés (entourés d'espaces ou en fin de phrase)
  return text.replace(/\b(\d+)\b/g, (match) => {
    return CHIFFRES_EN_MOTS[match] || match;
  });
}

class TTSService {
  constructor() {
    this.voice = VOICE;
    this.enabled = true;
    this.stats = {
      requests: 0,
      success: 0,
      errors: 0
    };

    // Créer le dossier de sortie si nécessaire
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  }

  /**
   * Synthétise du texte en audio
   * @param {string} text - Le texte à synthétiser
   * @param {string} [outputFile] - Fichier de sortie (optionnel)
   * @returns {Promise<string>} - Chemin vers le fichier audio
   */
  async synthesize(text, outputFile = null) {
    if (!this.enabled || !text || text.length < 1) {
      return null;
    }

    this.stats.requests++;

    // Générer un nom de fichier unique si non fourni
    if (!outputFile) {
      const timestamp = Date.now();
      outputFile = path.join(OUTPUT_DIR, `ana_${timestamp}.mp3`);
    }

    return new Promise((resolve, reject) => {
      // Convertir les chiffres en mots pour une meilleure prononciation
      const textePrononcable = convertirChiffresEnMots(text);

      const args = [
        '-m', 'edge_tts',
        '--voice', this.voice,
        '--text', textePrononcable,
        '--write-media', outputFile
      ];

      const process = spawn(PYTHON_PATH, args);

      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputFile)) {
          this.stats.success++;
          console.log(`[TTS] Audio généré: ${outputFile}`);
          resolve(outputFile);
        } else {
          this.stats.errors++;
          console.error(`[TTS] Erreur: ${stderr}`);
          reject(new Error(stderr || `Exit code: ${code}`));
        }
      });

      process.on('error', (err) => {
        this.stats.errors++;
        console.error(`[TTS] Erreur spawn: ${err.message}`);
        reject(err);
      });

      // Timeout de 30 secondes
      setTimeout(() => {
        process.kill();
        reject(new Error('TTS timeout'));
      }, 30000);
    });
  }

  /**
   * Change la voix
   * @param {string} voice - Nom de la voix (ex: fr-CA-SylvieNeural)
   */
  setVoice(voice) {
    this.voice = voice;
    console.log(`[TTS] Voix changée: ${voice}`);
  }

  /**
   * Liste les voix disponibles
   * @returns {Promise<Array>} - Liste des voix
   */
  async listVoices() {
    return new Promise((resolve, reject) => {
      const args = ['-m', 'edge_tts', '--list-voices'];
      const process = spawn(PYTHON_PATH, args);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          // Parser la sortie
          const lines = stdout.split('\n').filter(l => l.includes('fr-'));
          const voices = lines.map(line => {
            const parts = line.trim().split(/\s{2,}/);
            return {
              name: parts[0],
              gender: parts[1],
              locale: parts[0].split('-').slice(0, 2).join('-')
            };
          });
          resolve(voices);
        } else {
          reject(new Error(stderr));
        }
      });
    });
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return { ...this.stats, voice: this.voice };
  }

  /**
   * Activer/désactiver le service
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Nettoyer les anciens fichiers audio (plus de 1 heure)
   */
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    try {
      const files = fs.readdirSync(OUTPUT_DIR);
      let cleaned = 0;

      for (const file of files) {
        if (file.startsWith('ana_') && file.endsWith('.mp3')) {
          const filePath = path.join(OUTPUT_DIR, file);
          const stat = fs.statSync(filePath);

          if (stat.mtimeMs < oneHourAgo) {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        console.log(`[TTS] Nettoyage: ${cleaned} fichiers supprimés`);
      }
    } catch (err) {
      console.error('[TTS] Erreur nettoyage:', err.message);
    }
  }
}

// Singleton
const ttsService = new TTSService();

// Nettoyage automatique toutes les heures
setInterval(() => {
  ttsService.cleanup();
}, 60 * 60 * 1000);

module.exports = ttsService;
