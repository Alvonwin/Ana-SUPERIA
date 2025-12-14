/**
 * Memory Tools - Outils Self-Editing pour Ana
 * Permet à Ana de GÉRER sa propre mémoire (style MemGPT)
 *
 * Créé: 14 Décembre 2025
 * Phase 1 du plan "Ana Consciente"
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Chemins mémoire
const MEMORY_DIR = 'E:/ANA/memory';
const MEMORIES_FILE = path.join(MEMORY_DIR, 'ana_memories.json');
const FACTS_FILE = path.join(MEMORY_DIR, 'personal_facts.json');
const RELATIONS_FILE = path.join(MEMORY_DIR, 'relations.json');
const FORGETTING_LOG = path.join(MEMORY_DIR, 'forgetting_log.json');
const REFLECTIONS_FILE = path.join(MEMORY_DIR, 'reflections.json');

// Config Ollama pour embeddings
const OLLAMA_URL = 'http://localhost:11434';
const EMBEDDING_MODEL = 'nomic-embed-text';

/**
 * Charger un fichier JSON avec fallback
 */
function loadJSON(filePath, fallback = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`[MemoryTools] Error loading ${filePath}: ${err.message}`);
  }
  return fallback;
}

/**
 * Sauvegarder un fichier JSON
 */
function saveJSON(filePath, data) {
  try {
    // Créer dossier si nécessaire
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[MemoryTools] Error saving ${filePath}: ${err.message}`);
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
      prompt: text.substring(0, 2000)
    }, { timeout: 10000 });
    return response.data.embedding;
  } catch (err) {
    console.log(`[MemoryTools] Embedding error: ${err.message}`);
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

class MemoryTools {

  /**
   * MEMORY_STORE - Ana décide de sauvegarder quelque chose
   * @param {object} args - { content, category, subject, value, importance }
   */
  static async memory_store(args) {
    const { content, category = 'general', subject = null, value = null, importance = 'medium' } = args;
    console.log(`🧠 [MemoryTools] memory_store: "${content?.substring(0, 50)}..."`);

    if (!content) {
      return { success: false, message: "Il me faut le contenu à mémoriser (content)." };
    }

    const memories = loadJSON(MEMORIES_FILE, []);
    const now = new Date().toISOString();

    const newMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      content: content,
      category: category,
      subject: subject,
      value: value,
      source: 'self_store',
      timestamp: now,
      confidence: importance === 'high' ? 1.0 : importance === 'medium' ? 0.7 : 0.5,
      valid_from: now,
      valid_until: null,
      access_count: 0,
      last_accessed: null,
      embedding: await getEmbedding(content)
    };

    memories.push(newMemory);
    saveJSON(MEMORIES_FILE, memories);

    return {
      success: true,
      memory_id: newMemory.id,
      message: `Mémorisé: "${content.substring(0, 50)}..."`
    };
  }

  /**
   * MEMORY_SEARCH - Ana cherche dans ses souvenirs avec support sémantique
   * @param {object} args - { query, category, limit, semantic }
   */
  static async memory_search(args) {
    const { query, category = null, limit = 5, semantic = true } = args;
    console.log(`🧠 [MemoryTools] memory_search: "${query}"`);

    if (!query) {
      return { success: false, message: "Il me faut une requête (query)." };
    }

    const memories = loadJSON(MEMORIES_FILE, []);
    const validMemories = category
      ? memories.filter(m => m.category === category && m.valid_until === null)
      : memories.filter(m => m.valid_until === null);

    const queryLower = query.toLowerCase();
    const queryEmbedding = semantic ? await getEmbedding(query) : null;
    const results = [];

    for (const mem of validMemories) {
      let score = 0;
      const content = (mem.content || '').toLowerCase();
      const subject = (mem.subject || '').toLowerCase();
      const value = (mem.value || '').toLowerCase();

      // Recherche textuelle
      if (content.includes(queryLower)) score += 0.4;
      if (subject.includes(queryLower)) score += 0.3;
      if (value.includes(queryLower)) score += 0.2;

      // Recherche sémantique
      if (queryEmbedding && mem.embedding) {
        const similarity = cosineSimilarity(queryEmbedding, mem.embedding);
        score += similarity * 0.5;
      }

      if (score > 0.15) {
        results.push({ memory: mem, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, limit);

    // Mettre à jour access_count
    const now = new Date().toISOString();
    for (const result of topResults) {
      const idx = memories.findIndex(m => m.id === result.memory.id);
      if (idx !== -1) {
        memories[idx].access_count = (memories[idx].access_count || 0) + 1;
        memories[idx].last_accessed = now;
      }
    }
    if (topResults.length > 0) saveJSON(MEMORIES_FILE, memories);

    return {
      success: true,
      count: topResults.length,
      memories: topResults.map(r => ({
        id: r.memory.id,
        content: r.memory.content,
        subject: r.memory.subject,
        value: r.memory.value,
        score: r.score.toFixed(2)
      }))
    };
  }

  /**
   * MEMORY_CONSOLIDATE - Fusionner plusieurs mémoires similaires
   * @param {object} args - { memory_ids, new_content }
   */
  static async memory_consolidate(args) {
    const { memory_ids, new_content } = args;
    console.log(`🧠 [MemoryTools] memory_consolidate: ${memory_ids?.length} mémoires`);

    if (!memory_ids || memory_ids.length < 2) {
      return { success: false, message: "Il faut au moins 2 memory_ids." };
    }
    if (!new_content) {
      return { success: false, message: "Il faut le nouveau contenu consolidé (new_content)." };
    }

    const memories = loadJSON(MEMORIES_FILE, []);
    const now = new Date().toISOString();
    const consolidated = [];

    // Marquer les anciennes comme obsolètes
    for (const memId of memory_ids) {
      const idx = memories.findIndex(m => m.id === memId);
      if (idx !== -1) {
        memories[idx].valid_until = now;
        memories[idx].consolidated_into = `cons_${Date.now()}`;
        consolidated.push(memories[idx].content);
      }
    }

    if (consolidated.length === 0) {
      return { success: false, message: "Aucune mémoire trouvée avec ces IDs." };
    }

    // Créer mémoire consolidée
    const newMemory = {
      id: `cons_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      content: new_content,
      category: 'consolidated',
      source: 'self_consolidate',
      timestamp: now,
      confidence: 1.0,
      valid_from: now,
      valid_until: null,
      consolidated_from: memory_ids,
      access_count: 0,
      last_accessed: null,
      embedding: await getEmbedding(new_content)
    };

    memories.push(newMemory);
    saveJSON(MEMORIES_FILE, memories);

    return {
      success: true,
      new_memory_id: newMemory.id,
      consolidated_count: consolidated.length,
      message: `Consolidé ${consolidated.length} mémoires en: "${new_content.substring(0, 50)}..."`
    };
  }

  /**
   * MEMORY_UPDATE - Ana met à jour une information existante
   * Trouve l'ancienne info et la remplace par la nouvelle
   *
   * @param {object} args - { old_content, new_content, reason }
   * @returns {object} { success, message, updated }
   */
  static async memory_update(args) {
    const { old_content, new_content, reason = 'Mise à jour' } = args;
    console.log(`🧠 [MemoryTools] memory_update: "${old_content?.substring(0, 50)}..." → "${new_content?.substring(0, 50)}..."`);

    if (!old_content || !new_content) {
      return {
        success: false,
        message: "Il me faut l'ancienne info (old_content) et la nouvelle (new_content)."
      };
    }

    let updated = false;
    const results = [];

    // 1. Chercher dans ana_memories.json
    const memories = loadJSON(MEMORIES_FILE, []);
    const oldContentLower = old_content.toLowerCase();

    for (let i = 0; i < memories.length; i++) {
      if (memories[i].content && memories[i].content.toLowerCase().includes(oldContentLower)) {
        const oldValue = memories[i].content;
        memories[i].content = new_content;
        memories[i].updated_at = new Date().toISOString();
        memories[i].update_reason = reason;
        memories[i].previous_value = oldValue;
        updated = true;
        results.push({ source: 'ana_memories', index: i, oldValue, newValue: new_content });
      }
    }

    if (updated) {
      saveJSON(MEMORIES_FILE, memories);
    }

    // 2. Chercher dans personal_facts.json
    const facts = loadJSON(FACTS_FILE, {});

    // Parcourir toutes les catégories de faits
    for (const category of Object.keys(facts)) {
      if (Array.isArray(facts[category])) {
        for (let i = 0; i < facts[category].length; i++) {
          const fact = facts[category][i];
          if (typeof fact === 'string' && fact.toLowerCase().includes(oldContentLower)) {
            const oldValue = fact;
            facts[category][i] = new_content;
            updated = true;
            results.push({ source: 'personal_facts', category, index: i, oldValue, newValue: new_content });
          } else if (typeof fact === 'object' && fact.content && fact.content.toLowerCase().includes(oldContentLower)) {
            const oldValue = fact.content;
            fact.content = new_content;
            fact.updated_at = new Date().toISOString();
            updated = true;
            results.push({ source: 'personal_facts', category, index: i, oldValue, newValue: new_content });
          }
        }
      }
    }

    if (results.some(r => r.source === 'personal_facts')) {
      saveJSON(FACTS_FILE, facts);
    }

    return {
      success: updated,
      message: updated
        ? `J'ai mis à jour ${results.length} entrée(s) dans ma mémoire. Raison: ${reason}`
        : `Je n'ai pas trouvé "${old_content}" dans ma mémoire.`,
      updated: results
    };
  }

  /**
   * MEMORY_FORGET - Ana décide d'oublier quelque chose
   * Strategic forgetting avec demande de permission (Phase initiale)
   *
   * @param {object} args - { content, reason, force }
   * @returns {object} { success, message, requires_permission, forgotten }
   */
  static async memory_forget(args) {
    const { content, reason = 'Non spécifié', force = false } = args;
    console.log(`🧠 [MemoryTools] memory_forget: "${content?.substring(0, 50)}..." (force=${force})`);

    if (!content) {
      return {
        success: false,
        message: "Il me faut le contenu à oublier (content)."
      };
    }

    const contentLower = content.toLowerCase();
    const found = [];

    // 1. Chercher dans ana_memories.json
    const memories = loadJSON(MEMORIES_FILE, []);
    for (let i = 0; i < memories.length; i++) {
      if (memories[i].content && memories[i].content.toLowerCase().includes(contentLower)) {
        found.push({
          source: 'ana_memories',
          index: i,
          content: memories[i].content,
          category: memories[i].category
        });
      }
    }

    // 2. Chercher dans personal_facts.json
    const facts = loadJSON(FACTS_FILE, {});
    for (const category of Object.keys(facts)) {
      if (Array.isArray(facts[category])) {
        for (let i = 0; i < facts[category].length; i++) {
          const fact = facts[category][i];
          const factContent = typeof fact === 'string' ? fact : fact.content;
          if (factContent && factContent.toLowerCase().includes(contentLower)) {
            found.push({
              source: 'personal_facts',
              category,
              index: i,
              content: factContent
            });
          }
        }
      }
    }

    if (found.length === 0) {
      return {
        success: false,
        message: `Je n'ai pas trouvé "${content}" dans ma mémoire.`
      };
    }

    // Si pas force, demander permission (Phase initiale)
    if (!force) {
      return {
        success: true,
        requires_permission: true,
        message: `J'ai trouvé ${found.length} entrée(s) correspondant à "${content}". Puis-je les oublier? Raison: ${reason}`,
        items_to_forget: found.map(f => ({
          source: f.source,
          content: f.content.substring(0, 100) + (f.content.length > 100 ? '...' : '')
        }))
      };
    }

    // Avec force=true, procéder à l'oubli
    const forgotten = [];
    const forgettingLog = loadJSON(FORGETTING_LOG, []);

    // Supprimer de ana_memories
    const memoriesToRemove = found.filter(f => f.source === 'ana_memories').map(f => f.index);
    if (memoriesToRemove.length > 0) {
      const newMemories = memories.filter((_, idx) => !memoriesToRemove.includes(idx));
      saveJSON(MEMORIES_FILE, newMemories);
      forgotten.push(...found.filter(f => f.source === 'ana_memories'));
    }

    // Supprimer de personal_facts
    const factsToRemove = found.filter(f => f.source === 'personal_facts');
    if (factsToRemove.length > 0) {
      for (const item of factsToRemove) {
        if (facts[item.category] && Array.isArray(facts[item.category])) {
          facts[item.category] = facts[item.category].filter((f, idx) => {
            const fc = typeof f === 'string' ? f : f.content;
            return !fc.toLowerCase().includes(contentLower);
          });
        }
      }
      saveJSON(FACTS_FILE, facts);
      forgotten.push(...factsToRemove);
    }

    // Logger l'oubli
    forgettingLog.push({
      timestamp: new Date().toISOString(),
      reason,
      forgotten: forgotten.map(f => ({ source: f.source, content: f.content }))
    });
    saveJSON(FORGETTING_LOG, forgettingLog);

    return {
      success: true,
      message: `J'ai oublié ${forgotten.length} entrée(s). Raison: ${reason}`,
      forgotten: forgotten.map(f => f.content.substring(0, 100))
    };
  }

  /**
   * MEMORY_REFLECT - Ana réfléchit sur ce qu'elle sait
   * Analyse sa mémoire et identifie patterns, contradictions, lacunes
   *
   * @param {object} args - { topic, depth }
   * @returns {object} { success, reflection, stats, suggestions }
   */
  static async memory_reflect(args) {
    const { topic = null, depth = 'normal' } = args;
    console.log(`🧠 [MemoryTools] memory_reflect: topic="${topic}", depth="${depth}"`);

    const reflection = {
      timestamp: new Date().toISOString(),
      topic: topic || 'général',
      stats: {},
      findings: [],
      contradictions: [],
      suggestions: []
    };

    // 1. Charger toutes les mémoires
    const memories = loadJSON(MEMORIES_FILE, []);
    const facts = loadJSON(FACTS_FILE, {});
    const relations = loadJSON(RELATIONS_FILE, []);

    // 2. Statistiques basiques
    reflection.stats = {
      total_memories: memories.length,
      total_facts: Object.values(facts).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
      total_relations: relations.length,
      categories_memories: [...new Set(memories.map(m => m.category).filter(Boolean))],
      categories_facts: Object.keys(facts)
    };

    // 3. Si topic spécifié, filtrer
    let relevantMemories = memories;
    let relevantFacts = [];

    if (topic) {
      const topicLower = topic.toLowerCase();
      relevantMemories = memories.filter(m =>
        m.content && m.content.toLowerCase().includes(topicLower)
      );

      for (const category of Object.keys(facts)) {
        if (Array.isArray(facts[category])) {
          for (const fact of facts[category]) {
            const content = typeof fact === 'string' ? fact : fact.content;
            if (content && content.toLowerCase().includes(topicLower)) {
              relevantFacts.push({ category, content });
            }
          }
        }
      }

      reflection.findings.push(`J'ai ${relevantMemories.length} souvenir(s) et ${relevantFacts.length} fait(s) sur "${topic}".`);
    }

    // 4. Détecter les duplicatas potentiels
    const contentSet = new Set();
    const duplicates = [];

    for (const mem of memories) {
      const normalized = mem.content?.toLowerCase().trim();
      if (normalized && contentSet.has(normalized)) {
        duplicates.push(mem.content.substring(0, 50));
      }
      contentSet.add(normalized);
    }

    if (duplicates.length > 0) {
      reflection.suggestions.push({
        type: 'duplicates',
        message: `J'ai trouvé ${duplicates.length} doublon(s) potentiel(s) dans ma mémoire.`,
        examples: duplicates.slice(0, 3)
      });
    }

    // 5. Détecter les mémoires anciennes (> 30 jours sans accès)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const oldMemories = memories.filter(m => {
      const lastAccess = m.last_accessed || m.timestamp || m.created_at;
      return lastAccess && lastAccess < thirtyDaysAgo;
    });

    if (oldMemories.length > 0) {
      reflection.suggestions.push({
        type: 'old_memories',
        message: `J'ai ${oldMemories.length} souvenir(s) non utilisé(s) depuis plus de 30 jours.`,
        examples: oldMemories.slice(0, 3).map(m => m.content?.substring(0, 50))
      });
    }

    // 6. Résumé
    reflection.summary = topic
      ? `Réflexion sur "${topic}": ${relevantMemories.length + relevantFacts.length} éléments trouvés.`
      : `Ma mémoire contient ${reflection.stats.total_memories} souvenirs et ${reflection.stats.total_facts} faits.`;

    if (reflection.suggestions.length > 0) {
      reflection.summary += ` J'ai ${reflection.suggestions.length} suggestion(s) d'optimisation.`;
    }

    return {
      success: true,
      reflection: reflection.summary,
      stats: reflection.stats,
      suggestions: reflection.suggestions,
      findings: reflection.findings
    };
  }

  /**
   * MEMORY_LINK - Créer une relation entre deux concepts (Graph Memory)
   *
   * @param {object} args - { subject, relation, object, confidence }
   * @returns {object} { success, message, relation_id }
   */
  static async memory_link(args) {
    const { subject, relation, object, confidence = 1.0 } = args;
    console.log(`🧠 [MemoryTools] memory_link: "${subject}" --${relation}--> "${object}"`);

    if (!subject || !relation || !object) {
      return {
        success: false,
        message: "Il me faut subject, relation, et object pour créer un lien."
      };
    }

    const relations = loadJSON(RELATIONS_FILE, []);

    // Vérifier si relation existe déjà
    const existing = relations.find(r =>
      r.subject.toLowerCase() === subject.toLowerCase() &&
      r.relation.toLowerCase() === relation.toLowerCase() &&
      r.object.toLowerCase() === object.toLowerCase()
    );

    if (existing) {
      return {
        success: true,
        message: `Cette relation existe déjà: "${subject}" --${relation}--> "${object}"`,
        relation_id: existing.id
      };
    }

    // Créer nouvelle relation
    const newRelation = {
      id: `rel_${Date.now()}`,
      subject,
      relation,
      object,
      confidence,
      created_at: new Date().toISOString(),
      source: 'self-edit'
    };

    relations.push(newRelation);
    saveJSON(RELATIONS_FILE, relations);

    return {
      success: true,
      message: `J'ai créé la relation: "${subject}" --${relation}--> "${object}"`,
      relation_id: newRelation.id
    };
  }

  /**
   * MEMORY_QUERY_GRAPH - Interroger le graph de relations
   *
   * @param {object} args - { subject, relation, object, depth }
   * @returns {object} { success, results, paths }
   */
  static async memory_query_graph(args) {
    const { subject = null, relation = null, object = null, depth = 1 } = args;
    console.log(`🧠 [MemoryTools] memory_query_graph: subject="${subject}", relation="${relation}", object="${object}"`);

    const relations = loadJSON(RELATIONS_FILE, []);

    if (relations.length === 0) {
      return {
        success: true,
        message: "Mon graph de relations est vide pour l'instant.",
        results: []
      };
    }

    // Filtrer selon les critères
    let results = relations;

    if (subject) {
      const subjectLower = subject.toLowerCase();
      results = results.filter(r => r.subject.toLowerCase().includes(subjectLower));
    }

    if (relation) {
      const relationLower = relation.toLowerCase();
      results = results.filter(r => r.relation.toLowerCase().includes(relationLower));
    }

    if (object) {
      const objectLower = object.toLowerCase();
      results = results.filter(r => r.object.toLowerCase().includes(objectLower));
    }

    // Format résultats
    const formatted = results.map(r => ({
      triple: `${r.subject} --${r.relation}--> ${r.object}`,
      confidence: r.confidence,
      created: r.created_at
    }));

    return {
      success: true,
      message: `J'ai trouvé ${results.length} relation(s) dans mon graph.`,
      results: formatted.slice(0, 20) // Limiter à 20
    };
  }
}

// Export pour utilisation dans tool-agent
module.exports = MemoryTools;

// Définitions d'outils pour le système
module.exports.toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'memory_store',
      description: "Sauvegarder une nouvelle information en mémoire. Utiliser quand je veux mémoriser quelque chose d'important.",
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: "Le contenu à mémoriser" },
          category: { type: 'string', description: "Catégorie (possession, preference, identity, general)", default: 'general' },
          subject: { type: 'string', description: "Le sujet principal (ex: voiture, travail)" },
          value: { type: 'string', description: "La valeur associée (ex: blanche, informaticien)" },
          importance: { type: 'string', enum: ['low', 'medium', 'high'], description: "Niveau d'importance", default: 'medium' }
        },
        required: ['content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'memory_search',
      description: "Chercher dans mes souvenirs. Recherche textuelle et sémantique combinées.",
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: "Ce que je cherche" },
          category: { type: 'string', description: "Filtrer par catégorie (optionnel)" },
          limit: { type: 'number', description: "Nombre max de résultats", default: 5 },
          semantic: { type: 'boolean', description: "Activer recherche sémantique", default: true }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'memory_consolidate',
      description: "Fusionner plusieurs mémoires similaires en une seule plus complète.",
      parameters: {
        type: 'object',
        properties: {
          memory_ids: { type: 'array', items: { type: 'string' }, description: "IDs des mémoires à fusionner" },
          new_content: { type: 'string', description: "Le nouveau contenu consolidé" }
        },
        required: ['memory_ids', 'new_content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'memory_update',
      description: "Mettre à jour une information dans ma mémoire. Utiliser quand une info change (ex: Alain a changé de voiture, nouvelle adresse, correction d'une erreur).",
      parameters: {
        type: 'object',
        properties: {
          old_content: { type: 'string', description: "L'ancienne information à remplacer" },
          new_content: { type: 'string', description: "La nouvelle information correcte" },
          reason: { type: 'string', description: "Pourquoi cette mise à jour (ex: correction, changement)", default: 'Mise à jour' }
        },
        required: ['old_content', 'new_content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'memory_forget',
      description: "Oublier stratégiquement une information obsolète ou incorrecte. Demande permission par défaut. Utiliser pour nettoyer ma mémoire.",
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: "L'information à oublier" },
          reason: { type: 'string', description: "Pourquoi oublier (obsolète, incorrect, contradictoire)" },
          force: { type: 'boolean', description: "Oublier sans demander permission (déconseillé)", default: false }
        },
        required: ['content', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'memory_reflect',
      description: "Réfléchir sur ma mémoire. Analyser ce que je sais, trouver des patterns, détecter des contradictions, suggérer des optimisations.",
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: "Sujet spécifique sur lequel réfléchir (optionnel)" },
          depth: { type: 'string', enum: ['quick', 'normal', 'deep'], description: "Profondeur de l'analyse", default: 'normal' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'memory_link',
      description: "Créer une relation entre deux concepts dans mon graph de connaissances. Ex: 'Alain' --aime--> 'jeux', 'Bug X' --résolu_par--> 'Solution Y'.",
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: "Le sujet de la relation (ex: Alain, Bug X)" },
          relation: { type: 'string', description: "Le type de relation (ex: aime, possède, résolu_par)" },
          object: { type: 'string', description: "L'objet de la relation (ex: jeux, Solution Y)" },
          confidence: { type: 'number', description: "Niveau de confiance 0-1", default: 1.0 }
        },
        required: ['subject', 'relation', 'object']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'memory_query_graph',
      description: "Interroger mon graph de relations. Trouver des connexions entre concepts. Ex: 'Qu'est-ce qu'Alain aime?', 'Comment a-t-on résolu ce bug?'.",
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: "Filtrer par sujet (optionnel)" },
          relation: { type: 'string', description: "Filtrer par type de relation (optionnel)" },
          object: { type: 'string', description: "Filtrer par objet (optionnel)" },
          depth: { type: 'number', description: "Profondeur de recherche (1-3)", default: 1 }
        },
        required: []
      }
    }
  }
];
