/**
 * Fact Classifier - Détection automatique de faits personnels
 * Analyse chaque message pour extraire et sauvegarder les faits importants
 *
 * Créé: 14 Décembre 2025
 * Source: Mem0 research, ChatGPT memory approach
 * https://mem0.ai/research
 *
 * "Subconscious memory" - extraction automatique sans ralentir l'interaction
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';
const MEMORIES_FILE = 'E:/ANA/memory/ana_memories.json';
const FACTS_FILE = 'E:/ANA/memory/personal_facts.json';
const NOTIFICATIONS_FILE = 'E:/ANA/memory/memory_notifications.json';

// FIX 2025-12-14: Utiliser llama3.2:1b (1.3GB) au lieu de phi3:mini-128k (2.1GB)
// Raison: phi3 cause CUDA OOM quand Ana utilise déjà un autre modèle
// llama3.2:1b est assez petit pour coexister et extrait correctement en français
const CLASSIFIER_MODEL = 'llama3.2:1b';
const EMBEDDING_MODEL = 'nomic-embed-text';
const SIMILARITY_THRESHOLD = 0.85;  // Seuil pour semantic deduplication

/**
 * Obtenir embedding via Ollama (pour semantic deduplication)
 */
async function getEmbedding(text) {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
      model: EMBEDDING_MODEL,
      prompt: text
    }, { timeout: 10000 });
    return response.data.embedding;
  } catch (err) {
    console.log(`[FactClassifier] Embedding error: ${err.message}`);
    return null;
  }
}

/**
 * Calculer similarité cosinus entre deux vecteurs
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
 * Patterns pour détection rapide (avant LLM)
 * Évite d'appeler le LLM pour chaque message banal
 */
const FACT_PATTERNS = [
  // Possessions
  /ma\s+(voiture|auto|maison|appartement|moto|vélo)/i,
  /mon\s+(chien|chat|animal|téléphone|ordi|ordinateur)/i,
  /j'ai\s+(une?|des?|le|la)\s+\w+/i,

  // Identité
  /je\s+(suis|m'appelle|habite|travaille|vis)/i,
  /mon\s+(nom|prénom|âge|anniversaire|adresse)/i,
  /ma\s+(date\s+de\s+naissance|profession|job)/i,

  // Préférences
  /j'aime\s+(pas\s+)?/i,
  /je\s+(préfère|déteste|adore|n'aime\s+pas)/i,
  /mon\s+\w+\s+(préféré|favori)/i,

  // Attributs
  /est\s+(blanc|noir|rouge|bleu|vert|jaune|gris)/i,
  /c'est\s+(un|une)\s+\w+/i,

  // Relations
  /mon\s+(père|mère|frère|soeur|ami|copain|copine|femme|mari|enfant)/i
];

/**
 * Vérification rapide si le message POURRAIT contenir un fait
 */
function mightContainFact(message) {
  if (!message || message.length < 10) return false;

  // Questions = pas de faits à sauvegarder
  if (message.trim().endsWith('?')) return false;

  // Commandes = pas de faits
  if (message.toLowerCase().startsWith('ana,')) return false;
  if (/^(cherche|trouve|donne|montre|affiche|liste)/i.test(message)) return false;

  // Vérifier patterns
  return FACT_PATTERNS.some(pattern => pattern.test(message));
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
    console.error(`[FactClassifier] Error loading ${filePath}: ${err.message}`);
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
    console.error(`[FactClassifier] Error saving ${filePath}: ${err.message}`);
    return false;
  }
}

/**
 * Classifier un message et extraire les faits
 * @param {string} message - Message de l'utilisateur
 * @returns {object} { hasFacts, facts[] }
 */
async function classifyMessage(message) {
  // 1. Vérification rapide
  if (!mightContainFact(message)) {
    return { hasFacts: false, facts: [], reason: 'No patterns detected' };
  }

  console.log(`[FactClassifier] Analyzing: "${message.substring(0, 50)}..."`);

  try {
    // 2. Utiliser LLM pour extraction précise (prompt simplifié pour llama3.2:1b)
    const prompt = `Extrait les faits personnels de ce message. Reponds UNIQUEMENT en JSON.

Message: "${message}"

Exemple pour "Ma voiture est blanche":
{"has_facts": true, "facts": [{"category": "possession", "subject": "voiture", "value": "blanche", "full_fact": "Ma voiture est blanche"}]}

Exemple pour "Bonjour":
{"has_facts": false, "facts": []}

Ton JSON:`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: CLASSIFIER_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.1 }
    }, { timeout: 15000 });  // FIX: 15s timeout pour petit modèle

    // Parser la réponse
    const text = response.data?.response || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        hasFacts: parsed.has_facts || false,
        facts: parsed.facts || [],
        reason: 'LLM extraction'
      };
    }

  } catch (err) {
    console.error(`[FactClassifier] Error: ${err.message}`);
  }

  return { hasFacts: false, facts: [], reason: 'Extraction failed' };
}

/**
 * Phase 2: DECIDE - Comparer avec mémoires existantes et décider action
 * (Mem0 style: ADD, UPDATE, DELETE, IGNORE)
 * Utilise semantic deduplication (embeddings) + subject matching
 */
async function decideAction(fact, existingMemories) {
  const fullFact = fact.full_fact || `${fact.subject}: ${fact.value}`;
  const subject = fact.subject?.toLowerCase() || '';

  // 1. Filtrer mémoires valides (non expirées)
  const validMemories = existingMemories.filter(m => m.valid_until === null);

  // 2. Chercher par sujet exact d'abord (rapide)
  const sameSubject = validMemories.filter(m =>
    m.subject && m.subject.toLowerCase() === subject
  );

  if (sameSubject.length > 0) {
    const oldValue = sameSubject[0].value?.toLowerCase() || '';
    const newValue = fact.value?.toLowerCase() || '';

    if (oldValue === newValue) {
      return { action: 'IGNORE', reason: 'Doublon exact (même sujet+valeur)', existingId: sameSubject[0].id };
    }
    // Même sujet, valeur différente = UPDATE
    return { action: 'UPDATE', reason: 'Mise à jour (même sujet)', existingId: sameSubject[0].id, oldValue: sameSubject[0].value };
  }

  // 3. Semantic deduplication via embeddings (si pas de match exact)
  if (validMemories.length > 0) {
    const newEmbedding = await getEmbedding(fullFact);
    if (newEmbedding) {
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const mem of validMemories) {
        // Utiliser embedding stocké ou en générer un
        let memEmbedding = mem.embedding;
        if (!memEmbedding && mem.content) {
          memEmbedding = await getEmbedding(mem.content);
        }

        if (memEmbedding) {
          const similarity = cosineSimilarity(newEmbedding, memEmbedding);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = mem;
          }
        }
      }

      // Si très similaire sémantiquement = MERGE ou IGNORE
      if (bestMatch && bestSimilarity >= SIMILARITY_THRESHOLD) {
        console.log(`[FactClassifier] Semantic match: ${bestSimilarity.toFixed(3)} with "${bestMatch.content?.substring(0, 30)}..."`);
        if (bestSimilarity >= 0.95) {
          return { action: 'IGNORE', reason: `Doublon sémantique (${(bestSimilarity*100).toFixed(0)}%)`, existingId: bestMatch.id };
        }
        // Similaire mais pas identique = MERGE (update enrichi)
        return { action: 'MERGE', reason: `Fusion sémantique (${(bestSimilarity*100).toFixed(0)}%)`, existingId: bestMatch.id, oldContent: bestMatch.content };
      }
    }
  }

  // 4. Nouveau fait unique
  return { action: 'ADD', reason: 'Nouveau fait unique' };
}

/**
 * Sauvegarder les faits extraits en mémoire
 * Phase 1: EXTRACT (déjà fait) → Phase 2: DECIDE → Phase 3: EXECUTE
 * @param {Array} facts - Faits à sauvegarder
 * @returns {object} { saved, updated, ignored }
 */
async function saveFacts(facts) {
  if (!facts || facts.length === 0) {
    return { saved: 0, updated: 0, ignored: 0 };
  }

  const memories = loadJSON(MEMORIES_FILE, []);
  let saved = 0;
  let updated = 0;
  let ignored = 0;
  const notifications = [];  // Pour notification user

  for (const fact of facts) {
    const fullFact = fact.full_fact || `${fact.subject}: ${fact.value}`;

    // Phase 2: DECIDE
    const decision = await decideAction(fact, memories);
    console.log(`[FactClassifier] Decision: ${decision.action} - ${decision.reason}`);

    const now = new Date().toISOString();

    // Générer embedding pour semantic deduplication future
    const embedding = await getEmbedding(fullFact);

    // Phase 3: EXECUTE
    switch (decision.action) {
      case 'ADD':
        memories.push({
          id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          content: fullFact,
          category: fact.category || 'general',
          subject: fact.subject,
          value: fact.value,
          source: 'auto_classifier',
          timestamp: now,
          confidence: 'high',
          valid_from: now,
          valid_until: null,
          supersedes: null,
          access_count: 0,
          last_accessed: null,
          embedding: embedding  // Pour semantic deduplication
        });
        saved++;
        notifications.push({ type: 'ADD', fact: fullFact });
        console.log(`[FactClassifier] ADD: "${fullFact.substring(0, 50)}"`);
        break;

      case 'UPDATE':
        // Marquer ancien comme invalide
        const oldIdx = memories.findIndex(m => m.id === decision.existingId);
        if (oldIdx !== -1) {
          memories[oldIdx].valid_until = now;
        }
        // Ajouter nouveau avec référence à l'ancien
        const newId = `fact_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        memories.push({
          id: newId,
          content: fullFact,
          category: fact.category || 'general',
          subject: fact.subject,
          value: fact.value,
          source: 'auto_classifier',
          timestamp: now,
          confidence: 'high',
          valid_from: now,
          valid_until: null,
          supersedes: decision.existingId,
          access_count: 0,
          last_accessed: null,
          embedding: embedding
        });
        updated++;
        notifications.push({ type: 'UPDATE', fact: fullFact, oldValue: decision.oldValue });
        console.log(`[FactClassifier] UPDATE: "${fact.subject}" ${decision.oldValue} → ${fact.value}`);
        break;

      case 'MERGE':
        // Fusionner avec mémoire existante (enrichir)
        const mergeIdx = memories.findIndex(m => m.id === decision.existingId);
        if (mergeIdx !== -1) {
          // Combiner les contenus
          const mergedContent = `${memories[mergeIdx].content}. ${fullFact}`;
          memories[mergeIdx].content = mergedContent;
          memories[mergeIdx].timestamp = now;
          memories[mergeIdx].embedding = await getEmbedding(mergedContent);
          updated++;
          notifications.push({ type: 'MERGE', fact: fullFact, mergedWith: decision.oldContent });
          console.log(`[FactClassifier] MERGE: "${fullFact.substring(0, 30)}" avec "${decision.oldContent?.substring(0, 30)}"`);
        }
        break;

      case 'IGNORE':
        ignored++;
        console.log(`[FactClassifier] IGNORE: "${fullFact.substring(0, 50)}" (${decision.reason})`);
        break;
    }
  }

  if (saved > 0 || updated > 0) {
    saveJSON(MEMORIES_FILE, memories);

    // Sauvegarder notifications pour l'utilisateur (ChatGPT style)
    if (notifications.length > 0) {
      const existingNotifs = loadJSON(NOTIFICATIONS_FILE, []);
      const newNotifs = notifications.map(n => ({
        ...n,
        timestamp: new Date().toISOString(),
        read: false
      }));
      saveJSON(NOTIFICATIONS_FILE, [...existingNotifs, ...newNotifs]);
      console.log(`[FactClassifier] ${notifications.length} notification(s) saved`);
    }
  }

  return { saved, updated, ignored, notifications };
}

/**
 * Fonction principale: analyser et sauvegarder automatiquement
 * À appeler sur chaque message utilisateur
 */
async function processMessage(message) {
  const classification = await classifyMessage(message);

  if (classification.hasFacts && classification.facts.length > 0) {
    const saveResult = await saveFacts(classification.facts);
    return {
      processed: true,
      factsFound: classification.facts.length,
      factsSaved: saveResult.saved,
      factsUpdated: saveResult.updated,
      factsIgnored: saveResult.ignored,
      notifications: saveResult.notifications  // Pour notification user
    };
  }

  return {
    processed: true,
    factsFound: 0,
    factsSaved: 0,
    factsUpdated: 0,
    reason: classification.reason
  };
}

module.exports = {
  classifyMessage,
  saveFacts,
  processMessage,
  mightContainFact
};
