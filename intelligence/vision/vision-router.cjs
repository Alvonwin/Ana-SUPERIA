/**
 * Vision Router - Sélection Intelligente de Modèle Vision
 *
 * ANA SUPERIA - Routeur Vision
 *
 * Stratégie:
 * - Moondream 2 (1.7GB, rapide): Descriptions générales, lookups rapides
 * - Llama Vision 11B (8GB, puissant): OCR, analyse code, raisonnement complexe
 *
 * Date: 17 Décembre 2025
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration des modèles
const VISION_MODELS = {
  fast: {
    name: 'moondream',
    displayName: 'Moondream 2',
    size: '1.7GB',
    timeout: 30000,  // 30s
    options: {
      temperature: 0.5,
      top_p: 0.9
    },
    // Bonnes capacités
    strengths: ['description', 'objects', 'colors', 'general'],
    // Limitations
    weaknesses: ['ocr', 'code', 'detailed-text']
  },
  powerful: {
    name: 'llama3.2-vision:11b',
    displayName: 'Llama Vision 11B',
    size: '8GB',
    timeout: 180000,  // 3min
    options: {
      temperature: 0.5,
      top_p: 0.9,
      num_ctx: 8192
    },
    strengths: ['ocr', 'code', 'detailed-analysis', 'reasoning', 'text-extraction'],
    weaknesses: ['slow-startup']
  }
};

class VisionRouter {
  constructor(config = {}) {
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || 'fast';
    this.logPath = path.join('E:', 'ANA', 'logs', 'vision_router.log');
    this.supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

    // Statistiques
    this.stats = {
      moondream: { calls: 0, successes: 0, totalMs: 0 },
      llama_vision: { calls: 0, successes: 0, totalMs: 0 }
    };

    // Assurer logs directory
    const logsDir = path.dirname(this.logPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Sélectionne automatiquement le meilleur modèle selon la tâche
   * @param {string} taskType - Type de tâche vision
   * @returns {string} - 'fast' ou 'powerful'
   */
  selectModel(taskType) {
    const task = (taskType || '').toLowerCase();

    // Tâches nécessitant Llama Vision (puissant)
    const powerfulTasks = [
      'ocr', 'text', 'extract', 'code', 'screenshot',
      'read', 'document', 'analyze-code', 'detailed',
      'ui', 'interface', 'accessibility'
    ];

    for (const keyword of powerfulTasks) {
      if (task.includes(keyword)) {
        this.log(`Task "${task}" -> powerful (Llama Vision)`);
        return 'powerful';
      }
    }

    // Par défaut: Moondream (rapide)
    this.log(`Task "${task}" -> fast (Moondream)`);
    return 'fast';
  }

  /**
   * Patterns de chemins inventés/placeholders à rejeter
   * Le LLM invente souvent ces chemins au lieu de demander le vrai
   */
  static PLACEHOLDER_PATTERNS = [
    /[\\\/]nom[\\\/]/i,              // C:\Users\nom\...
    /[\\\/]username[\\\/]/i,         // C:\Users\username\...
    /[\\\/]user[\\\/](?!niwno)/i,    // C:\Users\user\... (mais pas niwno)
    /[\\\/]exemple[\\\/]/i,          // ...\exemple\...
    /[\\\/]example[\\\/]/i,          // ...\example\...
    /nom_de_l[_']?image/i,           // nom_de_l_image.jpg
    /^image\d*\.jpg$/i,              // image.jpg, image1.jpg (seul)
    /placeholder/i,                   // placeholder
    /\[.*\]/,                         // [chemin] ou [image]
    /<.*>/,                           // <chemin> ou <image>
  ];

  /**
   * Vérifie si un chemin est un placeholder inventé par le LLM
   */
  isPlaceholderPath(imagePath) {
    for (const pattern of VisionRouter.PLACEHOLDER_PATTERNS) {
      if (pattern.test(imagePath)) {
        this.log(`Chemin placeholder détecté: "${imagePath}" (pattern: ${pattern})`, 'warn');
        return true;
      }
    }
    return false;
  }

  /**
   * Convertit une image locale en base64
   * @param {string} imagePath - Chemin vers l'image
   * @returns {string} - Image en base64
   */
  imageToBase64(imagePath) {
    // === FIX 2025-12-17: Détecter les chemins inventés/placeholders ===
    if (this.isPlaceholderPath(imagePath)) {
      throw new Error(
        `CHEMIN INVALIDE: "${imagePath}" semble être un chemin inventé. ` +
        `DEMANDE à l'utilisateur le chemin EXACT de l'image. ` +
        `Exemple: "Quel est le chemin complet de l'image? (ex: C:\\Users\\niwno\\Desktop\\photo.jpg)"`
      );
    }

    // Rejeter les URLs
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      throw new Error(`Cette fonction ne supporte que les images LOCALES. "${imagePath}" est une URL.`);
    }

    // Normaliser le chemin Windows
    let normalizedPath = imagePath.replace(/\//g, path.sep);

    // Vérifier l'existence
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Fichier image introuvable: "${normalizedPath}"`);
    }

    // Vérifier le format
    const ext = path.extname(normalizedPath).toLowerCase();
    if (!this.supportedFormats.includes(ext)) {
      throw new Error(`Format non supporté: ${ext}. Supportés: ${this.supportedFormats.join(', ')}`);
    }

    const imageBuffer = fs.readFileSync(normalizedPath);
    this.log(`Image chargée: ${normalizedPath} (${Math.round(imageBuffer.length / 1024)} KB)`);
    return imageBuffer.toString('base64');
  }

  /**
   * Analyse une image avec sélection automatique du modèle
   * @param {Object} params - Paramètres
   * @returns {Promise<Object>} - Résultat
   */
  async analyze(params) {
    const {
      imagePath,
      imageBase64,
      prompt = 'Décris cette image.',
      taskType = 'description',
      forceModel = null  // 'fast' ou 'powerful' pour forcer
    } = params;

    const startTime = Date.now();

    // Sélection du modèle
    const modelKey = forceModel || this.selectModel(taskType);
    const modelConfig = VISION_MODELS[modelKey];

    this.log(`Analyse avec ${modelConfig.displayName} (${modelConfig.size})`);

    // Obtenir base64
    let base64;
    try {
      if (imageBase64) {
        base64 = imageBase64;
      } else if (imagePath) {
        base64 = this.imageToBase64(imagePath);
      } else {
        throw new Error('imagePath ou imageBase64 requis');
      }
    } catch (error) {
      this.log(`Erreur image: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }

    // Appel Ollama
    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: modelConfig.name,
          prompt: prompt,
          images: [base64],
          stream: false,
          options: modelConfig.options
        },
        { timeout: modelConfig.timeout }
      );

      const latencyMs = Date.now() - startTime;

      // Mise à jour stats
      const statKey = modelKey === 'fast' ? 'moondream' : 'llama_vision';
      this.stats[statKey].calls++;
      this.stats[statKey].successes++;
      this.stats[statKey].totalMs += latencyMs;

      this.log(`Analyse terminée en ${latencyMs}ms`);

      return {
        success: true,
        response: response.data.response,
        model: modelConfig.displayName,
        modelId: modelConfig.name,
        latencyMs: latencyMs,
        taskType: taskType
      };

    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.log(`Erreur ${modelConfig.displayName}: ${error.message}`, 'error');

      // Mise à jour stats
      const statKey = modelKey === 'fast' ? 'moondream' : 'llama_vision';
      this.stats[statKey].calls++;

      // Si Moondream échoue, essayer Llama Vision comme fallback
      if (modelKey === 'fast' && !forceModel) {
        this.log('Fallback vers Llama Vision...');
        return this.analyze({
          imagePath,
          imageBase64: base64,
          prompt,
          taskType,
          forceModel: 'powerful'
        });
      }

      return {
        success: false,
        error: error.message,
        model: modelConfig.displayName,
        modelId: modelConfig.name,
        latencyMs: latencyMs
      };
    }
  }

  /**
   * Description rapide d'une image (Moondream)
   */
  async quickDescribe(imagePath) {
    return this.analyze({
      imagePath,
      prompt: 'Décris cette image brièvement.',
      taskType: 'description',
      forceModel: 'fast'
    });
  }

  /**
   * Extraction de texte / OCR (Llama Vision)
   */
  async extractText(imagePath) {
    return this.analyze({
      imagePath,
      prompt: `Extrais TOUT le texte visible dans cette image.
Format la sortie proprement, préserve la structure (listes, paragraphes, etc.).
Si l'image ne contient pas de texte, indique-le clairement.`,
      taskType: 'ocr',
      forceModel: 'powerful'
    });
  }

  /**
   * Analyse de code dans une capture d'écran (Llama Vision)
   */
  async analyzeCode(imagePath) {
    return this.analyze({
      imagePath,
      prompt: `Cette image contient du code. Analyse-la:
1. Extrais le code visible
2. Identifie le langage de programmation
3. Explique ce que fait le code
4. Signale les erreurs éventuelles visibles`,
      taskType: 'code',
      forceModel: 'powerful'
    });
  }

  /**
   * Description pour accessibilité (Llama Vision - détaillé)
   */
  async describeForAccessibility(imagePath) {
    return this.analyze({
      imagePath,
      prompt: `Fournis une description détaillée de cette image pour une personne malvoyante.
Inclus:
- Les éléments principaux
- Les couleurs et textures
- Les actions ou mouvements
- L'ambiance générale
- Le texte visible s'il y en a`,
      taskType: 'accessibility',
      forceModel: 'powerful'
    });
  }

  /**
   * Analyse d'interface UI (Llama Vision)
   */
  async analyzeUI(imagePath) {
    return this.analyze({
      imagePath,
      prompt: `Analyse cette capture d'écran d'interface utilisateur:
1. Identifie l'application/site web
2. Liste les éléments UI visibles (boutons, menus, formulaires)
3. Décris la disposition générale
4. Note les problèmes d'UX potentiels`,
      taskType: 'ui',
      forceModel: 'powerful'
    });
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    const stats = { ...this.stats };

    // Calculer moyennes
    if (stats.moondream.successes > 0) {
      stats.moondream.avgMs = Math.round(stats.moondream.totalMs / stats.moondream.successes);
    }
    if (stats.llama_vision.successes > 0) {
      stats.llama_vision.avgMs = Math.round(stats.llama_vision.totalMs / stats.llama_vision.successes);
    }

    return stats;
  }

  /**
   * Log
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [VISION_ROUTER] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    try {
      fs.appendFileSync(this.logPath, logMessage + '\n', 'utf-8');
    } catch (error) {
      // Silently fail
    }
  }
}

// Singleton
const visionRouter = new VisionRouter();

module.exports = visionRouter;
module.exports.VisionRouter = VisionRouter;
module.exports.VISION_MODELS = VISION_MODELS;
