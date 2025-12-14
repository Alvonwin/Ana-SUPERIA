/**
 * Sleep-time Consolidation - Traitement background des mémoires
 * Comme le cerveau consolide pendant le sommeil
 *
 * Créé: 14 Décembre 2025
 * Source: LightMem research, Sleep-time Compute concept
 * https://arxiv.org/abs/2407.01527 (LightMem)
 *
 * Processus:
 * 1. Appliquer decay (Ebbinghaus)
 * 2. Nettoyer doublons
 * 3. Consolider mémoires similaires
 * 4. Créer liens (Zettelkasten)
 * 5. Archiver épisodes
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Chemins
const MEMORY_DIR = 'E:/ANA/memory';
const MEMORIES_FILE = path.join(MEMORY_DIR, 'ana_memories.json');
const EPISODES_FILE = path.join(MEMORY_DIR, 'episodes.json');
const LINKS_FILE = path.join(MEMORY_DIR, 'memory_links.json');
const CONSOLIDATION_LOG = path.join(MEMORY_DIR, 'consolidation_log.json');

// Config
const OLLAMA_URL = 'http://localhost:11434';
const EMBEDDING_MODEL = 'nomic-embed-text';
const CONSOLIDATION_INTERVAL = 30 * 60 * 1000; // 30 minutes

/**
 * Charger JSON avec fallback
 */
function loadJSON(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`[SleepConsolidation] Error loading ${filePath}: ${err.message}`);
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
    console.error(`[SleepConsolidation] Error saving ${filePath}: ${err.message}`);
    return false;
  }
}

/**
 * Obtenir embedding
 */
async function getEmbedding(text) {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
      model: EMBEDDING_MODEL,
      prompt: text.substring(0, 2000)
    }, { timeout: 15000 });
    return response.data.embedding;
  } catch (err) {
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

class SleepConsolidation {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.timer = null;
    this.stats = {
      runs: 0,
      memories_processed: 0,
      duplicates_removed: 0,
      links_created: 0,
      decay_applied: 0
    };
  }

  /**
   * Démarrer la consolidation périodique
   */
  start(interval = CONSOLIDATION_INTERVAL) {
    if (this.timer) {
      console.log('[SleepConsolidation] Already running');
      return;
    }

    console.log(`[SleepConsolidation] Starting with interval ${interval / 1000}s`);

    // Première exécution après 5 minutes
    setTimeout(() => this.runConsolidation(), 5 * 60 * 1000);

    // Exécutions périodiques
    this.timer = setInterval(() => this.runConsolidation(), interval);

    return { success: true, message: 'Sleep consolidation started' };
  }

  /**
   * Arrêter la consolidation
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[SleepConsolidation] Stopped');
    }
    return { success: true, message: 'Sleep consolidation stopped' };
  }

  /**
   * Exécuter un cycle de consolidation
   */
  async runConsolidation() {
    if (this.isRunning) {
      console.log('[SleepConsolidation] Already running a cycle, skipping');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date().toISOString();
    this.stats.runs++;

    console.log('[SleepConsolidation] Starting consolidation cycle...');

    const report = {
      timestamp: this.lastRun,
      steps: [],
      summary: {}
    };

    try {
      // 1. Appliquer decay
      const decayResult = await this.applyDecay();
      report.steps.push({ name: 'decay', result: decayResult });

      // 2. Nettoyer doublons
      const dedupeResult = await this.cleanDuplicates();
      report.steps.push({ name: 'dedupe', result: dedupeResult });

      // 3. Générer embeddings manquants
      const embedResult = await this.generateMissingEmbeddings();
      report.steps.push({ name: 'embeddings', result: embedResult });

      // 4. Créer liens auto
      const linksResult = await this.autoCreateLinks();
      report.steps.push({ name: 'links', result: linksResult });

      // 5. Archiver vieilles mémoires
      const archiveResult = await this.archiveOldMemories();
      report.steps.push({ name: 'archive', result: archiveResult });

      report.summary = {
        decay_applied: decayResult.updated || 0,
        duplicates_removed: dedupeResult.removed || 0,
        embeddings_generated: embedResult.generated || 0,
        links_created: linksResult.created || 0,
        memories_archived: archiveResult.archived || 0
      };

      // Sauvegarder le log
      const logs = loadJSON(CONSOLIDATION_LOG, []);
      logs.push(report);
      // Garder seulement les 100 derniers logs
      if (logs.length > 100) logs.splice(0, logs.length - 100);
      saveJSON(CONSOLIDATION_LOG, logs);

      console.log(`[SleepConsolidation] Cycle complete: ${JSON.stringify(report.summary)}`);

    } catch (err) {
      console.error(`[SleepConsolidation] Error: ${err.message}`);
      report.error = err.message;
    }

    this.isRunning = false;
    return report;
  }

  /**
   * Appliquer le decay d'Ebbinghaus
   */
  async applyDecay() {
    const memories = loadJSON(MEMORIES_FILE, []);
    let updated = 0;

    const now = new Date();

    for (let i = 0; i < memories.length; i++) {
      const mem = memories[i];
      if (mem.valid_until !== null) continue;

      const lastAccess = new Date(mem.last_accessed || mem.timestamp || now);
      const daysSinceAccess = Math.max(0, (now - lastAccess) / (24 * 60 * 60 * 1000));

      // Calculer decay
      const accessCount = mem.access_count || 0;
      const strength = 1 + accessCount * 0.1;
      const retentionRate = Math.exp(-daysSinceAccess / (strength * 30));

      let oldConfidence = typeof mem.confidence === 'number' ? mem.confidence : 0.7;
      let newConfidence = oldConfidence * retentionRate;
      newConfidence = Math.max(0.2, Math.min(1.0, newConfidence));

      if (Math.abs(oldConfidence - newConfidence) > 0.01) {
        memories[i].confidence = newConfidence;
        updated++;
      }
    }

    if (updated > 0) {
      saveJSON(MEMORIES_FILE, memories);
    }

    this.stats.decay_applied += updated;
    return { success: true, updated };
  }

  /**
   * Nettoyer les doublons exacts
   */
  async cleanDuplicates() {
    const memories = loadJSON(MEMORIES_FILE, []);
    const seen = new Map();
    const toRemove = [];

    for (let i = 0; i < memories.length; i++) {
      const mem = memories[i];
      if (mem.valid_until !== null) continue;

      const content = (mem.content || '').toLowerCase().trim();
      if (seen.has(content)) {
        // Garder celui avec plus d'accès
        const existingIdx = seen.get(content);
        const existing = memories[existingIdx];

        if ((mem.access_count || 0) > (existing.access_count || 0)) {
          toRemove.push(existingIdx);
          seen.set(content, i);
        } else {
          toRemove.push(i);
        }
      } else {
        seen.set(content, i);
      }
    }

    // Marquer comme invalides
    const now = new Date().toISOString();
    for (const idx of toRemove) {
      memories[idx].valid_until = now;
      memories[idx].duplicate_of = 'auto_cleanup';
    }

    if (toRemove.length > 0) {
      saveJSON(MEMORIES_FILE, memories);
    }

    this.stats.duplicates_removed += toRemove.length;
    return { success: true, removed: toRemove.length };
  }

  /**
   * Générer les embeddings manquants
   */
  async generateMissingEmbeddings() {
    const memories = loadJSON(MEMORIES_FILE, []);
    let generated = 0;

    for (let i = 0; i < memories.length; i++) {
      const mem = memories[i];
      if (mem.valid_until !== null) continue;
      if (mem.embedding) continue;
      if (!mem.content) continue;

      const embedding = await getEmbedding(mem.content);
      if (embedding) {
        memories[i].embedding = embedding;
        generated++;

        // Batch save every 10
        if (generated % 10 === 0) {
          saveJSON(MEMORIES_FILE, memories);
        }
      }

      // Limiter à 20 par cycle pour ne pas surcharger
      if (generated >= 20) break;
    }

    if (generated > 0) {
      saveJSON(MEMORIES_FILE, memories);
    }

    return { success: true, generated };
  }

  /**
   * Créer automatiquement des liens entre mémoires similaires
   */
  async autoCreateLinks() {
    const memories = loadJSON(MEMORIES_FILE, []);
    const links = loadJSON(LINKS_FILE, []);
    let created = 0;

    const validMemories = memories.filter(m => m.valid_until === null && m.embedding);

    // Comparer chaque paire (limité pour performance)
    const maxComparisons = 50;
    let comparisons = 0;

    for (let i = 0; i < validMemories.length && comparisons < maxComparisons; i++) {
      for (let j = i + 1; j < validMemories.length && comparisons < maxComparisons; j++) {
        comparisons++;

        const memA = validMemories[i];
        const memB = validMemories[j];

        // Vérifier si lien existe déjà
        const linkExists = links.some(l =>
          (l.source_id === memA.id && l.target_id === memB.id) ||
          (l.source_id === memB.id && l.target_id === memA.id)
        );

        if (linkExists) continue;

        // Calculer similarité
        const similarity = cosineSimilarity(memA.embedding, memB.embedding);

        // Créer lien si assez similaire
        if (similarity >= 0.7) {
          const newLink = {
            id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            source_id: memA.id,
            target_id: memB.id,
            relation: 'related_to',
            strength: similarity,
            created_at: new Date().toISOString(),
            source: 'auto_consolidation'
          };

          links.push(newLink);
          created++;
        }
      }
    }

    if (created > 0) {
      saveJSON(LINKS_FILE, links);
    }

    this.stats.links_created += created;
    return { success: true, created };
  }

  /**
   * Archiver les mémoires très anciennes (> 90 jours sans accès, faible confiance)
   */
  async archiveOldMemories() {
    const memories = loadJSON(MEMORIES_FILE, []);
    const now = new Date();
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
    let archived = 0;

    for (let i = 0; i < memories.length; i++) {
      const mem = memories[i];
      if (mem.valid_until !== null) continue;

      const lastAccess = new Date(mem.last_accessed || mem.timestamp || now);
      const confidence = typeof mem.confidence === 'number' ? mem.confidence : 0.7;

      // Archiver si: > 90 jours sans accès ET confiance < 0.3
      if (lastAccess < ninetyDaysAgo && confidence < 0.3) {
        memories[i].valid_until = now.toISOString();
        memories[i].archive_reason = 'auto_archive_low_confidence_old';
        archived++;
      }
    }

    if (archived > 0) {
      saveJSON(MEMORIES_FILE, memories);
    }

    return { success: true, archived };
  }

  /**
   * Forcer une consolidation immédiate
   */
  async forceRun() {
    return await this.runConsolidation();
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      timerActive: !!this.timer
    };
  }

  /**
   * Obtenir les logs récents
   */
  getLogs(limit = 10) {
    const logs = loadJSON(CONSOLIDATION_LOG, []);
    return logs.slice(-limit);
  }
}

// Singleton
const sleepConsolidation = new SleepConsolidation();

module.exports = sleepConsolidation;
module.exports.SleepConsolidation = SleepConsolidation;
