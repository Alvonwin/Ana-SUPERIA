/**
 * Episodic Memory - Mémoire des expériences et conversations passées
 * Stocke des "épisodes" complets (contexte + événements) pas juste des faits isolés
 *
 * Créé: 14 Décembre 2025
 * Source: Cognitive architecture research, Tulving's episodic memory theory
 *
 * "La dernière fois qu'on a parlé de X, tu avais mentionné Y..."
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';
const EPISODES_FILE = 'E:/ANA/memory/episodes.json';
const EMBEDDING_MODEL = 'nomic-embed-text';

/**
 * Charger JSON avec fallback
 */
function loadJSON(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`[EpisodicMemory] Error loading ${filePath}: ${err.message}`);
  }
  return fallback;
}

/**
 * Sauvegarder JSON
 */
function saveJSON(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[EpisodicMemory] Error saving ${filePath}: ${err.message}`);
    return false;
  }
}

/**
 * Obtenir embedding via Ollama
 */
async function getEmbedding(text) {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
      model: EMBEDDING_MODEL,
      prompt: text.substring(0, 2000) // Limiter pour embeddings
    }, { timeout: 15000 });
    return response.data.embedding;
  } catch (err) {
    console.log(`[EpisodicMemory] Embedding error: ${err.message}`);
    return null;
  }
}

/**
 * Calculer similarité cosinus
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Structure d'un épisode:
 * {
 *   id: string,
 *   timestamp: ISO string,
 *   type: 'conversation' | 'task' | 'learning' | 'error',
 *   summary: string,            // Résumé de l'épisode
 *   context: {
 *     topic: string,            // Sujet principal
 *     participants: string[],   // Qui était impliqué
 *     mood: string,             // Ton de la conversation
 *     location: string          // Contexte (interface, vocal, etc.)
 *   },
 *   events: [                   // Événements séquentiels
 *     { role: 'user'|'ana', content: string, timestamp: string }
 *   ],
 *   outcome: {
 *     success: boolean,
 *     learnings: string[],      // Ce qu'Ana a appris
 *     emotions: string[]        // Réactions émotionnelles
 *   },
 *   links: string[],            // IDs d'épisodes liés
 *   embedding: number[],        // Pour recherche sémantique
 *   access_count: number,
 *   last_accessed: ISO string
 * }
 */

class EpisodicMemory {
  constructor() {
    this.currentEpisode = null;
    this.episodeStartTime = null;
  }

  /**
   * Démarrer un nouvel épisode
   * @param {string} type - Type d'épisode
   * @param {object} context - Contexte initial
   */
  startEpisode(type = 'conversation', context = {}) {
    this.currentEpisode = {
      id: `ep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      type,
      summary: '',
      context: {
        topic: context.topic || 'général',
        participants: context.participants || ['Alain', 'Ana'],
        mood: context.mood || 'neutre',
        location: context.location || 'interface'
      },
      events: [],
      outcome: {
        success: null,
        learnings: [],
        emotions: []
      },
      links: [],
      embedding: null,
      access_count: 0,
      last_accessed: null
    };
    this.episodeStartTime = Date.now();

    console.log(`[EpisodicMemory] Started episode ${this.currentEpisode.id}`);
    return this.currentEpisode.id;
  }

  /**
   * Ajouter un événement à l'épisode en cours
   * @param {string} role - 'user' ou 'ana'
   * @param {string} content - Contenu du message
   */
  addEvent(role, content) {
    if (!this.currentEpisode) {
      this.startEpisode();
    }

    this.currentEpisode.events.push({
      role,
      content: content.substring(0, 1000), // Limiter la taille
      timestamp: new Date().toISOString()
    });

    // Mettre à jour le topic si on détecte un sujet
    if (role === 'user' && this.currentEpisode.events.length === 1) {
      this.currentEpisode.context.topic = this.extractTopic(content);
    }

    return true;
  }

  /**
   * Extraire le sujet principal d'un message
   */
  extractTopic(message) {
    const msgLower = message.toLowerCase();

    // Patterns de sujets
    const patterns = [
      { regex: /(?:parle|discute|question).*(?:de|sur|à propos)\s+(.+?)(?:\?|$)/i, group: 1 },
      { regex: /(?:ma|mon|mes)\s+(\w+)/i, group: 1 },
      { regex: /(?:comment|pourquoi|quand|où)\s+(.+?)(?:\?|$)/i, group: 1 }
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern.regex);
      if (match && match[pattern.group]) {
        return match[pattern.group].trim().substring(0, 50);
      }
    }

    // Fallback: premiers mots significatifs
    const words = msgLower.split(/\s+/).filter(w => w.length > 3);
    return words.slice(0, 3).join(' ') || 'général';
  }

  /**
   * Clôturer l'épisode en cours et le sauvegarder
   * @param {object} outcome - Résultat de l'épisode
   */
  async endEpisode(outcome = {}) {
    if (!this.currentEpisode) {
      return { success: false, message: 'No active episode' };
    }

    // Ne pas sauvegarder les épisodes trop courts
    if (this.currentEpisode.events.length < 2) {
      this.currentEpisode = null;
      return { success: false, message: 'Episode too short' };
    }

    // Compléter l'outcome
    this.currentEpisode.outcome = {
      success: outcome.success ?? true,
      learnings: outcome.learnings || [],
      emotions: outcome.emotions || []
    };

    // Générer un résumé
    this.currentEpisode.summary = await this.generateSummary(this.currentEpisode);

    // Générer embedding pour recherche
    const summaryForEmbedding = `${this.currentEpisode.context.topic}: ${this.currentEpisode.summary}`;
    this.currentEpisode.embedding = await getEmbedding(summaryForEmbedding);

    // Trouver épisodes liés
    this.currentEpisode.links = await this.findRelatedEpisodes(this.currentEpisode);

    // Sauvegarder
    const episodes = loadJSON(EPISODES_FILE, []);
    episodes.push(this.currentEpisode);
    saveJSON(EPISODES_FILE, episodes);

    console.log(`[EpisodicMemory] Saved episode ${this.currentEpisode.id}: "${this.currentEpisode.summary}"`);

    const savedEpisode = this.currentEpisode;
    this.currentEpisode = null;
    this.episodeStartTime = null;

    return {
      success: true,
      episode: savedEpisode
    };
  }

  /**
   * Générer un résumé de l'épisode
   */
  async generateSummary(episode) {
    // Résumé simple basé sur les événements
    const userMessages = episode.events
      .filter(e => e.role === 'user')
      .map(e => e.content)
      .join(' ');

    // Limiter et nettoyer
    const summary = userMessages.substring(0, 200).replace(/\s+/g, ' ').trim();

    return summary || `Conversation sur ${episode.context.topic}`;
  }

  /**
   * Trouver des épisodes liés (même sujet ou similaires)
   */
  async findRelatedEpisodes(episode, maxLinks = 3) {
    const episodes = loadJSON(EPISODES_FILE, []);
    const links = [];

    if (episodes.length === 0 || !episode.embedding) {
      return links;
    }

    // Chercher par similarité sémantique
    const similarities = [];

    for (const ep of episodes) {
      if (ep.id === episode.id) continue;
      if (!ep.embedding) continue;

      const similarity = cosineSimilarity(episode.embedding, ep.embedding);
      if (similarity > 0.6) {
        similarities.push({ id: ep.id, similarity });
      }
    }

    // Trier et garder les meilleurs
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, maxLinks).map(s => s.id);
  }

  /**
   * Rechercher des épisodes passés
   * @param {string} query - Requête de recherche
   * @param {object} options - Options
   */
  async searchEpisodes(query, options = {}) {
    const { maxResults = 5, type = null } = options;

    const episodes = loadJSON(EPISODES_FILE, []);

    if (episodes.length === 0) {
      return [];
    }

    // Filtrer par type si spécifié
    let filtered = type
      ? episodes.filter(ep => ep.type === type)
      : episodes;

    // Recherche par embedding
    const queryEmbedding = await getEmbedding(query);
    const results = [];

    for (const ep of filtered) {
      let score = 0;

      // Recherche textuelle
      const searchText = `${ep.summary} ${ep.context.topic}`.toLowerCase();
      if (searchText.includes(query.toLowerCase())) {
        score += 0.5;
      }

      // Recherche sémantique
      if (queryEmbedding && ep.embedding) {
        score += cosineSimilarity(queryEmbedding, ep.embedding);
      }

      if (score > 0.3) {
        results.push({ episode: ep, score });
      }
    }

    // Trier et retourner
    results.sort((a, b) => b.score - a.score);

    // Mettre à jour access_count
    const now = new Date().toISOString();
    for (const result of results.slice(0, maxResults)) {
      const idx = episodes.findIndex(ep => ep.id === result.episode.id);
      if (idx !== -1) {
        episodes[idx].access_count = (episodes[idx].access_count || 0) + 1;
        episodes[idx].last_accessed = now;
      }
    }
    saveJSON(EPISODES_FILE, episodes);

    return results.slice(0, maxResults).map(r => ({
      ...r.episode,
      score: r.score
    }));
  }

  /**
   * Récupérer le contexte conversationnel d'épisodes passés similaires
   * @param {string} currentTopic - Sujet actuel
   */
  async getConversationalContext(currentTopic) {
    const relatedEpisodes = await this.searchEpisodes(currentTopic, { maxResults: 3 });

    if (relatedEpisodes.length === 0) {
      return null;
    }

    // Construire le contexte
    const contextParts = relatedEpisodes.map(ep => {
      const date = new Date(ep.timestamp).toLocaleDateString('fr-FR');
      return `[${date}] ${ep.summary}`;
    });

    return {
      hasContext: true,
      episodes: relatedEpisodes,
      narrative: `Conversations précédentes sur ce sujet:\n${contextParts.join('\n')}`
    };
  }

  /**
   * Obtenir les statistiques des épisodes
   */
  getStats() {
    const episodes = loadJSON(EPISODES_FILE, []);

    return {
      total_episodes: episodes.length,
      by_type: episodes.reduce((acc, ep) => {
        acc[ep.type] = (acc[ep.type] || 0) + 1;
        return acc;
      }, {}),
      recent: episodes.slice(-5).map(ep => ({
        id: ep.id,
        topic: ep.context.topic,
        date: ep.timestamp
      })),
      has_active: !!this.currentEpisode
    };
  }
}

// Singleton
const episodicMemory = new EpisodicMemory();

module.exports = episodicMemory;
module.exports.EpisodicMemory = EpisodicMemory;
