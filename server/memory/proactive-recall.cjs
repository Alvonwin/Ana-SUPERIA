/**
 * Proactive Recall - Injection automatique de contexte pertinent
 * Analyse le message et injecte les mémoires pertinentes AVANT qu'on les demande
 *
 * Créé: 14 Décembre 2025
 * Source: Mem0 proactive memory injection, Google NotebookLM approach
 *
 * "Tu n'as pas besoin de demander - je me souviens déjà"
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';
const MEMORIES_FILE = 'E:/ANA/memory/ana_memories.json';
const EMBEDDING_MODEL = 'nomic-embed-text';

// Cache d'embeddings pour éviter recalculs constants
const embeddingCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Charger JSON avec fallback
 */
function loadJSON(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`[ProactiveRecall] Error loading ${filePath}: ${err.message}`);
  }
  return fallback;
}

/**
 * Obtenir embedding avec cache
 */
async function getEmbedding(text) {
  const cacheKey = text.substring(0, 100);
  const cached = embeddingCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.embedding;
  }

  try {
    const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
      model: EMBEDDING_MODEL,
      prompt: text
    }, { timeout: 10000 });

    const embedding = response.data.embedding;
    embeddingCache.set(cacheKey, { embedding, timestamp: Date.now() });

    return embedding;
  } catch (err) {
    console.log(`[ProactiveRecall] Embedding error: ${err.message}`);
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
 * Extraire les entités/sujets clés d'un message
 * @param {string} message - Message de l'utilisateur
 * @returns {Array} - Liste de sujets extraits
 */
function extractTopics(message) {
  const topics = [];
  const msgLower = message.toLowerCase();

  // Patterns pour extraire les sujets
  const patterns = [
    // Possessions
    /(?:ma|mon|mes)\s+(\w+)/gi,
    // Personnes
    /(?:mon|ma)\s+(père|mère|frère|soeur|ami|copain|copine|femme|mari|enfant|fils|fille)/gi,
    // Entités nommées (mots capitalisés)
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
    // Activités
    /(?:je|j')\s+(?:aime|préfère|déteste|adore|joue|fais|travaille)\s+(?:à|au|aux|le|la|les|du|de)?\s*(\w+)/gi
  ];

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(message)) !== null) {
      if (match[1] && match[1].length > 2) {
        topics.push(match[1].toLowerCase());
      }
    }
  }

  // Mots-clés significatifs (> 4 chars, pas stop words)
  const stopWords = ['quel', 'quelle', 'quels', 'quelles', 'comment', 'pourquoi',
                     'quand', 'est-ce', 'cette', 'cette', 'avec', 'pour', 'dans',
                     'plus', 'moins', 'très', 'bien', 'faire', 'avoir', 'être'];

  const words = msgLower.split(/[\s?!.,;:]+/)
    .filter(w => w.length > 4 && !stopWords.includes(w));

  topics.push(...words);

  // Dédupliquer
  return [...new Set(topics)];
}

/**
 * Rechercher les mémoires pertinentes pour le contexte actuel
 * @param {string} message - Message de l'utilisateur
 * @param {object} options - Options de recherche
 * @returns {Array} - Mémoires pertinentes triées par score
 */
async function findRelevantMemories(message, options = {}) {
  const {
    maxResults = 5,
    minSimilarity = 0.5,
    includeExpired = false
  } = options;

  const memories = loadJSON(MEMORIES_FILE, []);

  if (memories.length === 0) {
    return [];
  }

  // Filtrer mémoires valides
  const validMemories = includeExpired
    ? memories
    : memories.filter(m => m.valid_until === null);

  if (validMemories.length === 0) {
    return [];
  }

  const topics = extractTopics(message);
  console.log(`[ProactiveRecall] Topics extracted: ${topics.join(', ')}`);

  const results = [];

  // 1. Recherche par sujets/mots-clés (rapide)
  for (const mem of validMemories) {
    let score = 0;
    const content = (mem.content || '').toLowerCase();
    const subject = (mem.subject || '').toLowerCase();
    const value = (mem.value || '').toLowerCase();

    for (const topic of topics) {
      if (subject === topic) score += 0.5;  // Match exact sujet
      if (subject.includes(topic)) score += 0.3;
      if (content.includes(topic)) score += 0.2;
      if (value.includes(topic)) score += 0.1;
    }

    if (score > 0) {
      // Boost par confiance et récence
      const confidence = typeof mem.confidence === 'number' ? mem.confidence : 0.7;
      const recencyBoost = mem.last_accessed
        ? Math.max(0, 1 - (Date.now() - new Date(mem.last_accessed)) / (30 * 24 * 60 * 60 * 1000))
        : 0;

      score = score * confidence * (1 + recencyBoost * 0.2);

      results.push({
        memory: mem,
        score,
        matchType: 'keyword'
      });
    }
  }

  // 2. Recherche sémantique si pas assez de résultats keywords
  if (results.length < maxResults && message.length > 10) {
    const messageEmbedding = await getEmbedding(message);

    if (messageEmbedding) {
      for (const mem of validMemories) {
        // Skip si déjà trouvé par keywords
        if (results.some(r => r.memory.id === mem.id)) continue;

        let memEmbedding = mem.embedding;
        if (!memEmbedding && mem.content) {
          memEmbedding = await getEmbedding(mem.content);
        }

        if (memEmbedding) {
          const similarity = cosineSimilarity(messageEmbedding, memEmbedding);

          if (similarity >= minSimilarity) {
            const confidence = typeof mem.confidence === 'number' ? mem.confidence : 0.7;

            results.push({
              memory: mem,
              score: similarity * confidence,
              matchType: 'semantic',
              similarity
            });
          }
        }
      }
    }
  }

  // Trier par score et limiter
  results.sort((a, b) => b.score - a.score);

  const topResults = results.slice(0, maxResults);

  console.log(`[ProactiveRecall] Found ${topResults.length} relevant memories`);

  return topResults;
}

/**
 * Générer le contexte à injecter dans la conversation
 * @param {string} message - Message de l'utilisateur
 * @returns {object} { hasContext, context, memories }
 */
async function generateContext(message) {
  const relevantMemories = await findRelevantMemories(message);

  if (relevantMemories.length === 0) {
    return {
      hasContext: false,
      context: '',
      memories: []
    };
  }

  // Formater le contexte pour injection
  const contextLines = relevantMemories.map(r => {
    const mem = r.memory;
    const matchInfo = r.matchType === 'semantic'
      ? `(similarité: ${(r.similarity * 100).toFixed(0)}%)`
      : '';
    return `- ${mem.content} ${matchInfo}`;
  });

  const context = `[Contexte mémoire pertinent]\n${contextLines.join('\n')}`;

  // Mettre à jour access_count pour les mémoires utilisées
  const memories = loadJSON(MEMORIES_FILE, []);
  const now = new Date().toISOString();
  let updated = false;

  for (const result of relevantMemories) {
    const idx = memories.findIndex(m => m.id === result.memory.id);
    if (idx !== -1) {
      memories[idx].access_count = (memories[idx].access_count || 0) + 1;
      memories[idx].last_accessed = now;
      updated = true;
    }
  }

  if (updated) {
    const dir = path.dirname(MEMORIES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2), 'utf-8');
  }

  return {
    hasContext: true,
    context,
    memories: relevantMemories.map(r => ({
      id: r.memory.id,
      content: r.memory.content,
      score: r.score,
      matchType: r.matchType
    }))
  };
}

/**
 * Nettoyer le cache d'embeddings
 */
function clearCache() {
  const now = Date.now();
  for (const [key, value] of embeddingCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      embeddingCache.delete(key);
    }
  }
}

// Nettoyage périodique du cache
setInterval(clearCache, CACHE_TTL);

module.exports = {
  findRelevantMemories,
  generateContext,
  extractTopics,
  clearCache
};
