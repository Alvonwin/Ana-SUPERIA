/**
 * Memory Curator - Strategic Forgetting pour Ana
 * Gère l'oubli intelligent des informations obsolètes/contradictoires
 *
 * Créé: 14 Décembre 2025
 * Phase 5 du plan "Ana Consciente"
 *
 * Approche progressive:
 * 1. Phase initiale: Ana DEMANDE permission avant d'oublier
 * 2. Phase intermédiaire: Ana NOTIFIE mais n'attend pas
 * 3. Phase finale: Ana gère seule (comme un humain)
 */

const fs = require('fs');
const path = require('path');

// Chemins mémoire
const MEMORY_DIR = 'E:/ANA/memory';
const MEMORIES_FILE = path.join(MEMORY_DIR, 'ana_memories.json');
const FACTS_FILE = path.join(MEMORY_DIR, 'personal_facts.json');
const FORGETTING_LOG = path.join(MEMORY_DIR, 'forgetting_log.json');
const CURATOR_CONFIG = path.join(MEMORY_DIR, 'curator_config.json');

// Configuration par défaut
const DEFAULT_CONFIG = {
  mode: 'permission', // permission | notify | automatic
  thresholds: {
    old_days: 30,           // Jours sans accès avant proposition d'oubli
    duplicate_similarity: 0.9, // Similarité pour considérer comme doublon
    contradiction_confidence: 0.8 // Confiance pour détecter contradiction
  },
  // Ebbinghaus decay parameters
  decay: {
    enabled: true,
    base_rate: 0.95,        // Decay quotidien sans renforcement (5% perte/jour)
    min_confidence: 0.2,    // Seuil minimum avant proposition d'oubli
    reinforcement_boost: 0.1, // Boost par accès
    max_confidence: 1.0
  },
  enabled: true
};

/**
 * Courbe d'Ebbinghaus - Calculer le decay de confiance
 * @param {object} memory - Mémoire à évaluer
 * @returns {number} - Nouvelle confiance [0-1]
 */
function calculateEbbinghausDecay(memory) {
  const config = loadJSON(CURATOR_CONFIG, DEFAULT_CONFIG);
  const decay = config.decay || DEFAULT_CONFIG.decay;

  if (!decay.enabled) return memory.confidence || 1;

  const now = new Date();
  const lastAccess = new Date(memory.last_accessed || memory.timestamp || now);
  const daysSinceAccess = Math.max(0, (now - lastAccess) / (24 * 60 * 60 * 1000));

  // Confiance de base
  let confidence = typeof memory.confidence === 'number' ? memory.confidence :
                   memory.confidence === 'high' ? 1.0 :
                   memory.confidence === 'medium' ? 0.7 : 0.5;

  // Appliquer decay exponentiel (Ebbinghaus)
  // R = e^(-t/S) où t = temps, S = force du souvenir
  const strength = 1 + (memory.access_count || 0) * decay.reinforcement_boost;
  const retentionRate = Math.exp(-daysSinceAccess / (strength * 30)); // 30 jours = baseline

  confidence = confidence * retentionRate;

  // Appliquer limites
  return Math.max(decay.min_confidence, Math.min(decay.max_confidence, confidence));
}

/**
 * Charger JSON avec fallback
 */
function loadJSON(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`[MemoryCurator] Error loading ${filePath}: ${err.message}`);
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
    console.error(`[MemoryCurator] Error saving ${filePath}: ${err.message}`);
    return false;
  }
}

class MemoryCurator {
  constructor() {
    this.config = loadJSON(CURATOR_CONFIG, DEFAULT_CONFIG);
    this.pendingForgetting = []; // Items en attente de permission
  }

  /**
   * Analyser la mémoire et proposer des nettoyages
   * @returns {object} { suggestions, duplicates, old_memories, contradictions }
   */
  async analyze() {
    console.log('[MemoryCurator] Analyzing memory...');

    const memories = loadJSON(MEMORIES_FILE, []);
    const facts = loadJSON(FACTS_FILE, {});

    const analysis = {
      timestamp: new Date().toISOString(),
      total_memories: memories.length,
      suggestions: [],
      duplicates: [],
      old_memories: [],
      contradictions: []
    };

    // 1. Détecter les doublons
    const seen = new Map();
    for (let i = 0; i < memories.length; i++) {
      const mem = memories[i];
      const content = (mem.content || '').toLowerCase().trim();

      if (seen.has(content)) {
        analysis.duplicates.push({
          original_index: seen.get(content),
          duplicate_index: i,
          content: mem.content?.substring(0, 100)
        });
      } else {
        seen.set(content, i);
      }
    }

    // 2. Détecter les mémoires anciennes non utilisées
    const now = new Date();
    const oldThreshold = new Date(now - this.config.thresholds.old_days * 24 * 60 * 60 * 1000);

    for (let i = 0; i < memories.length; i++) {
      const mem = memories[i];
      const lastAccess = new Date(mem.last_accessed || mem.timestamp || mem.created_at || 0);

      if (lastAccess < oldThreshold) {
        analysis.old_memories.push({
          index: i,
          content: mem.content?.substring(0, 100),
          last_access: lastAccess.toISOString(),
          days_old: Math.floor((now - lastAccess) / (24 * 60 * 60 * 1000))
        });
      }
    }

    // 3. Générer suggestions
    if (analysis.duplicates.length > 0) {
      analysis.suggestions.push({
        type: 'duplicates',
        count: analysis.duplicates.length,
        action: 'Supprimer les doublons',
        priority: 'high'
      });
    }

    if (analysis.old_memories.length > 0) {
      analysis.suggestions.push({
        type: 'old_memories',
        count: analysis.old_memories.length,
        action: `Archiver les mémoires non utilisées depuis ${this.config.thresholds.old_days} jours`,
        priority: 'medium'
      });
    }

    console.log(`[MemoryCurator] Analysis complete: ${analysis.duplicates.length} duplicates, ${analysis.old_memories.length} old memories`);

    return analysis;
  }

  /**
   * Proposer d'oublier avec permission (Phase initiale)
   * @param {Array} items - Items à oublier
   * @param {string} reason - Raison de l'oubli
   * @returns {object} { requires_permission, items, message }
   */
  async proposeForget(items, reason) {
    if (this.config.mode === 'automatic') {
      // Mode automatique - oublier directement
      return await this.executeForget(items, reason);
    }

    // Mode permission ou notify - stocker pour approbation
    this.pendingForgetting = items.map(item => ({
      ...item,
      reason,
      proposed_at: new Date().toISOString()
    }));

    const message = this.config.mode === 'permission'
      ? `Je propose d'oublier ${items.length} élément(s). Raison: ${reason}. Approuves-tu?`
      : `Je vais oublier ${items.length} élément(s). Raison: ${reason}. (Mode notification)`;

    return {
      requires_permission: this.config.mode === 'permission',
      items: this.pendingForgetting,
      message
    };
  }

  /**
   * Exécuter l'oubli (après permission si nécessaire)
   * @param {Array} items - Items à oublier
   * @param {string} reason - Raison
   * @returns {object} { success, forgotten_count }
   */
  async executeForget(items, reason) {
    const memories = loadJSON(MEMORIES_FILE, []);
    const forgettingLog = loadJSON(FORGETTING_LOG, []);

    const forgotten = [];
    const indicesToRemove = new Set();

    for (const item of items) {
      if (item.index !== undefined && item.index < memories.length) {
        indicesToRemove.add(item.index);
        forgotten.push({
          content: memories[item.index]?.content?.substring(0, 100),
          reason
        });
      }
    }

    // Supprimer les mémoires (en ordre inverse pour préserver les indices)
    const newMemories = memories.filter((_, idx) => !indicesToRemove.has(idx));
    saveJSON(MEMORIES_FILE, newMemories);

    // Logger l'oubli
    forgettingLog.push({
      timestamp: new Date().toISOString(),
      reason,
      count: forgotten.length,
      items: forgotten
    });
    saveJSON(FORGETTING_LOG, forgettingLog);

    // Vider pending
    this.pendingForgetting = [];

    console.log(`[MemoryCurator] Forgotten ${forgotten.length} items. Reason: ${reason}`);

    return {
      success: true,
      forgotten_count: forgotten.length,
      message: `J'ai oublié ${forgotten.length} élément(s). Raison: ${reason}`
    };
  }

  /**
   * Approuver l'oubli en attente
   */
  async approveForget() {
    if (this.pendingForgetting.length === 0) {
      return { success: false, message: "Rien en attente d'oubli" };
    }

    const reason = this.pendingForgetting[0]?.reason || 'Approuvé par Alain';
    return await this.executeForget(this.pendingForgetting, reason);
  }

  /**
   * Refuser l'oubli en attente
   */
  rejectForget() {
    const count = this.pendingForgetting.length;
    this.pendingForgetting = [];
    return {
      success: true,
      message: `OK, je garde ces ${count} élément(s) en mémoire.`
    };
  }

  /**
   * Nettoyer automatiquement les doublons
   */
  async cleanDuplicates() {
    const analysis = await this.analyze();

    if (analysis.duplicates.length === 0) {
      return { success: true, message: "Aucun doublon trouvé", cleaned: 0 };
    }

    const items = analysis.duplicates.map(d => ({ index: d.duplicate_index }));

    if (this.config.mode === 'automatic') {
      return await this.executeForget(items, 'Nettoyage automatique des doublons');
    }

    return await this.proposeForget(items, 'Doublons détectés');
  }

  /**
   * Changer le mode de curation
   * @param {string} mode - permission | notify | automatic
   */
  setMode(mode) {
    if (!['permission', 'notify', 'automatic'].includes(mode)) {
      return { success: false, message: `Mode invalide: ${mode}` };
    }

    this.config.mode = mode;
    saveJSON(CURATOR_CONFIG, this.config);

    return {
      success: true,
      message: `Mode de curation changé à: ${mode}`
    };
  }

  /**
   * Obtenir le statut du curator
   */
  getStatus() {
    return {
      mode: this.config.mode,
      pending_count: this.pendingForgetting.length,
      thresholds: this.config.thresholds,
      enabled: this.config.enabled
    };
  }

  /**
   * Appliquer le decay d'Ebbinghaus à toutes les mémoires
   * Met à jour les scores de confiance basé sur le temps
   * @returns {object} { updated, low_confidence, proposed_for_forgetting }
   */
  async applyDecay() {
    const memories = loadJSON(MEMORIES_FILE, []);
    let updated = 0;
    const lowConfidence = [];

    for (let i = 0; i < memories.length; i++) {
      const mem = memories[i];

      // Skip mémoires déjà invalides
      if (mem.valid_until !== null) continue;

      const oldConfidence = mem.confidence;
      const newConfidence = calculateEbbinghausDecay(mem);

      // Mettre à jour si changement significatif
      if (typeof oldConfidence === 'number' && Math.abs(oldConfidence - newConfidence) > 0.01) {
        memories[i].confidence = newConfidence;
        updated++;
      } else if (typeof oldConfidence !== 'number') {
        // Convertir string confidence en number
        memories[i].confidence = newConfidence;
        updated++;
      }

      // Tracker les mémoires à faible confiance
      if (newConfidence < this.config.decay.min_confidence + 0.1) {
        lowConfidence.push({
          index: i,
          content: mem.content?.substring(0, 100),
          confidence: newConfidence,
          days_since_access: Math.floor((new Date() - new Date(mem.last_accessed || mem.timestamp)) / (24 * 60 * 60 * 1000))
        });
      }
    }

    if (updated > 0) {
      saveJSON(MEMORIES_FILE, memories);
      console.log(`[MemoryCurator] Applied decay to ${updated} memories`);
    }

    // Proposer l'oubli pour les mémoires très faibles
    const toForget = lowConfidence.filter(m => m.confidence <= this.config.decay.min_confidence);

    return {
      updated,
      low_confidence: lowConfidence,
      proposed_for_forgetting: toForget.length,
      message: `Decay appliqué: ${updated} mémoires mises à jour, ${lowConfidence.length} à faible confiance`
    };
  }

  /**
   * Renforcer une mémoire (appelé quand elle est accédée)
   * @param {string} memoryId - ID de la mémoire à renforcer
   */
  reinforceMemory(memoryId) {
    const memories = loadJSON(MEMORIES_FILE, []);
    const idx = memories.findIndex(m => m.id === memoryId);

    if (idx !== -1) {
      const decay = this.config.decay || DEFAULT_CONFIG.decay;
      const currentConfidence = typeof memories[idx].confidence === 'number'
        ? memories[idx].confidence
        : 0.7;

      // Boost de confiance par accès
      memories[idx].confidence = Math.min(
        decay.max_confidence,
        currentConfidence + decay.reinforcement_boost
      );
      memories[idx].access_count = (memories[idx].access_count || 0) + 1;
      memories[idx].last_accessed = new Date().toISOString();

      saveJSON(MEMORIES_FILE, memories);
      console.log(`[MemoryCurator] Reinforced memory ${memoryId}: confidence=${memories[idx].confidence}`);

      return { success: true, new_confidence: memories[idx].confidence };
    }

    return { success: false, message: 'Memory not found' };
  }
}

// Singleton
const curator = new MemoryCurator();

module.exports = curator;
module.exports.MemoryCurator = MemoryCurator;
