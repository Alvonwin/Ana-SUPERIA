/**
 * Zettelkasten Memory - Liens bidirectionnels entre mémoires
 * Style A-MEM: interconnected notes permettant multi-hop reasoning
 *
 * Créé: 14 Décembre 2025
 * Source: A-MEM paper, Niklas Luhmann's Zettelkasten method
 *
 * "Alain aime X" + "X est un jeu" = "Alain aime les jeux"
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';
const MEMORIES_FILE = 'E:/ANA/memory/ana_memories.json';
const LINKS_FILE = 'E:/ANA/memory/memory_links.json';
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
    console.error(`[Zettelkasten] Error loading ${filePath}: ${err.message}`);
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
    console.error(`[Zettelkasten] Error saving ${filePath}: ${err.message}`);
    return false;
  }
}

/**
 * Structure d'un lien:
 * {
 *   id: string,
 *   source_id: string,        // ID de la mémoire source
 *   target_id: string,        // ID de la mémoire cible
 *   relation: string,         // Type de relation
 *   strength: number,         // Force du lien [0-1]
 *   created_at: ISO string,
 *   last_used: ISO string,
 *   use_count: number
 * }
 *
 * Types de relations:
 * - 'is_a'        : X est un Y (catégorisation)
 * - 'has'         : X a Y (possession)
 * - 'related_to'  : X est lié à Y (association générale)
 * - 'causes'      : X cause Y (causalité)
 * - 'precedes'    : X précède Y (temporel)
 * - 'contradicts' : X contredit Y (opposition)
 * - 'supports'    : X soutient Y (renforcement)
 * - 'part_of'     : X fait partie de Y (composition)
 */

const RELATION_TYPES = [
  'is_a', 'has', 'related_to', 'causes', 'precedes',
  'contradicts', 'supports', 'part_of'
];

class ZettelkastenMemory {
  constructor() {
    this.links = loadJSON(LINKS_FILE, []);
  }

  /**
   * Créer un lien entre deux mémoires
   * @param {string} sourceId - ID de la mémoire source
   * @param {string} targetId - ID de la mémoire cible
   * @param {string} relation - Type de relation
   * @param {number} strength - Force du lien (0-1)
   */
  createLink(sourceId, targetId, relation = 'related_to', strength = 0.5) {
    // Valider la relation
    if (!RELATION_TYPES.includes(relation)) {
      relation = 'related_to';
    }

    // Vérifier si le lien existe déjà
    const existingLink = this.links.find(l =>
      l.source_id === sourceId && l.target_id === targetId && l.relation === relation
    );

    if (existingLink) {
      // Renforcer le lien existant
      existingLink.strength = Math.min(1, existingLink.strength + 0.1);
      existingLink.use_count++;
      existingLink.last_used = new Date().toISOString();
      saveJSON(LINKS_FILE, this.links);

      console.log(`[Zettelkasten] Reinforced link: ${sourceId} -[${relation}]-> ${targetId}`);
      return { success: true, action: 'reinforced', link: existingLink };
    }

    // Créer nouveau lien
    const newLink = {
      id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      source_id: sourceId,
      target_id: targetId,
      relation,
      strength: Math.max(0, Math.min(1, strength)),
      created_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
      use_count: 1
    };

    this.links.push(newLink);
    saveJSON(LINKS_FILE, this.links);

    console.log(`[Zettelkasten] Created link: ${sourceId} -[${relation}]-> ${targetId}`);
    return { success: true, action: 'created', link: newLink };
  }

  /**
   * Créer un lien bidirectionnel (A -> B et B -> A)
   */
  createBidirectionalLink(memoryId1, memoryId2, relation = 'related_to', strength = 0.5) {
    // Déterminer les relations inverses
    const inverseRelations = {
      'is_a': 'has',
      'has': 'part_of',
      'causes': 'caused_by',
      'precedes': 'follows',
      'contradicts': 'contradicts',
      'supports': 'supports',
      'part_of': 'has',
      'related_to': 'related_to'
    };

    const forwardResult = this.createLink(memoryId1, memoryId2, relation, strength);
    const backwardResult = this.createLink(
      memoryId2,
      memoryId1,
      inverseRelations[relation] || 'related_to',
      strength
    );

    return {
      success: forwardResult.success && backwardResult.success,
      forward: forwardResult,
      backward: backwardResult
    };
  }

  /**
   * Trouver tous les liens d'une mémoire
   * @param {string} memoryId - ID de la mémoire
   * @param {string} direction - 'outgoing', 'incoming', ou 'both'
   */
  findLinks(memoryId, direction = 'both') {
    let results = [];

    if (direction === 'outgoing' || direction === 'both') {
      results = results.concat(this.links.filter(l => l.source_id === memoryId));
    }

    if (direction === 'incoming' || direction === 'both') {
      results = results.concat(this.links.filter(l => l.target_id === memoryId));
    }

    return results;
  }

  /**
   * Multi-hop reasoning: traverser le graphe pour inférer des relations
   * @param {string} startId - Mémoire de départ
   * @param {number} maxHops - Nombre maximum de sauts
   * @returns {Array} - Chaînes de mémoires connectées avec inférences
   */
  async multiHopQuery(startId, maxHops = 3) {
    const memories = loadJSON(MEMORIES_FILE, []);
    const visited = new Set([startId]);
    const paths = [];

    // BFS pour explorer le graphe
    let currentLevel = [{ id: startId, path: [startId], relations: [] }];

    for (let hop = 0; hop < maxHops && currentLevel.length > 0; hop++) {
      const nextLevel = [];

      for (const node of currentLevel) {
        const outgoingLinks = this.links.filter(l => l.source_id === node.id);

        for (const link of outgoingLinks) {
          if (!visited.has(link.target_id)) {
            visited.add(link.target_id);

            const newPath = {
              id: link.target_id,
              path: [...node.path, link.target_id],
              relations: [...node.relations, link.relation]
            };

            nextLevel.push(newPath);

            // Sauvegarder les chemins intéressants (longueur > 1)
            if (newPath.path.length > 1) {
              paths.push(newPath);
            }
          }
        }
      }

      currentLevel = nextLevel;
    }

    // Enrichir les chemins avec les contenus des mémoires
    const enrichedPaths = paths.map(p => {
      const contents = p.path.map(id => {
        const mem = memories.find(m => m.id === id);
        return mem ? mem.content : id;
      });

      return {
        ...p,
        contents,
        inference: this.generateInference(contents, p.relations)
      };
    });

    return enrichedPaths;
  }

  /**
   * Générer une inférence à partir d'un chemin
   */
  generateInference(contents, relations) {
    if (contents.length < 2) return null;

    // Construire une phrase logique
    let inference = contents[0];

    for (let i = 0; i < relations.length; i++) {
      const relation = relations[i];
      const nextContent = contents[i + 1];

      switch (relation) {
        case 'is_a':
          inference += ` (qui est ${nextContent})`;
          break;
        case 'has':
          inference += ` → possède: ${nextContent}`;
          break;
        case 'related_to':
          inference += ` → lié à: ${nextContent}`;
          break;
        case 'causes':
          inference += ` → cause: ${nextContent}`;
          break;
        case 'supports':
          inference += ` ← soutenu par: ${nextContent}`;
          break;
        default:
          inference += ` → ${nextContent}`;
      }
    }

    return inference;
  }

  /**
   * Auto-lier une nouvelle mémoire aux existantes
   * @param {object} newMemory - Nouvelle mémoire à lier
   */
  async autoLink(newMemory) {
    const memories = loadJSON(MEMORIES_FILE, []);
    const linksCreated = [];

    const subject = (newMemory.subject || '').toLowerCase();
    const content = (newMemory.content || '').toLowerCase();

    for (const mem of memories) {
      if (mem.id === newMemory.id) continue;
      if (mem.valid_until !== null) continue; // Skip invalides

      const memSubject = (mem.subject || '').toLowerCase();
      const memContent = (mem.content || '').toLowerCase();

      // Même sujet = lien fort
      if (subject && memSubject && subject === memSubject) {
        const result = this.createLink(newMemory.id, mem.id, 'related_to', 0.8);
        linksCreated.push(result);
        continue;
      }

      // Sujet mentionné dans l'autre contenu
      if (subject && memContent.includes(subject)) {
        const result = this.createLink(newMemory.id, mem.id, 'related_to', 0.5);
        linksCreated.push(result);
      }

      // L'autre sujet mentionné dans ce contenu
      if (memSubject && content.includes(memSubject)) {
        const result = this.createLink(newMemory.id, mem.id, 'related_to', 0.5);
        linksCreated.push(result);
      }
    }

    console.log(`[Zettelkasten] Auto-linked ${linksCreated.length} memories to ${newMemory.id}`);
    return linksCreated;
  }

  /**
   * Obtenir le graphe de mémoires (pour visualisation)
   */
  getGraph() {
    const memories = loadJSON(MEMORIES_FILE, []);

    const nodes = memories
      .filter(m => m.valid_until === null)
      .map(m => ({
        id: m.id,
        label: m.content?.substring(0, 50) || m.id,
        subject: m.subject
      }));

    const edges = this.links.map(l => ({
      source: l.source_id,
      target: l.target_id,
      relation: l.relation,
      strength: l.strength
    }));

    return { nodes, edges };
  }

  /**
   * Statistiques du graphe
   */
  getStats() {
    return {
      total_links: this.links.length,
      by_relation: this.links.reduce((acc, l) => {
        acc[l.relation] = (acc[l.relation] || 0) + 1;
        return acc;
      }, {}),
      avg_strength: this.links.length > 0
        ? (this.links.reduce((sum, l) => sum + l.strength, 0) / this.links.length).toFixed(2)
        : 0
    };
  }

  /**
   * Recharger les liens depuis le fichier
   */
  reload() {
    this.links = loadJSON(LINKS_FILE, []);
    return { success: true, count: this.links.length };
  }
}

// Singleton
const zettelkasten = new ZettelkastenMemory();

module.exports = zettelkasten;
module.exports.ZettelkastenMemory = ZettelkastenMemory;
module.exports.RELATION_TYPES = RELATION_TYPES;
