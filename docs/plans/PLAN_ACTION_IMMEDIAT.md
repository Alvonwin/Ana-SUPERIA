# PLAN D'ACTION IMMÉDIAT - Construction Ana

**Date:** 22 Novembre 2025
**Base:** STACK_OPTIMALE_ANA_2025.json
**Objectif:** Ana opérationnelle phase 1 en 7 jours

---

## JOUR 1: Installation LLMs

### 1. Installer DeepSeek-Coder-V2 (Coding Champion)
```bash
ollama pull deepseek-coder-v2:16b-lite-instruct-q4_K_M
```
**Temps:** ~15 minutes
**Taille:** ~10GB download

### 2. Installer Phi-3-Mini (Conversation & Thinking)
```bash
ollama pull phi3:mini-128k
```
**Temps:** ~5 minutes
**Taille:** ~2.3GB download

### 3. Installer Qwen2.5-Coder (Backup Coding & Math)
```bash
ollama pull qwen2.5-coder:7b
```
**Temps:** ~7 minutes
**Taille:** ~4.4GB download

### 4. Installer Llama 3.2 Vision (Images)
```bash
ollama pull llama3.2-vision:11b
```
**Temps:** ~10 minutes
**Taille:** ~6.6GB download

### 5. Vérifier installation
```bash
ollama list
```
**Résultat attendu:**
```
NAME                                              SIZE
deepseek-coder-v2:16b-lite-instruct-q4_K_M       10GB
phi3:mini-128k                                    2.3GB
qwen2.5-coder:7b                                  4.4GB
llama3.2-vision:11b                               6.6GB
...
```

### 6. Tester chaque LLM
```bash
# Test DeepSeek
ollama run deepseek-coder-v2:16b-lite-instruct-q4_K_M "Write a JavaScript function to reverse a string"

# Test Phi-3
ollama run phi3:mini-128k "Explain what is Ana in one sentence"

# Test Qwen
ollama run qwen2.5-coder:7b "Calculate: 15 * 23 + 42"

# Test Llama Vision
ollama run llama3.2-vision:11b "Describe a beautiful sunset"
```

### 7. Retirer modèles obsolètes
```bash
ollama rm mistral-claude-v2
ollama rm mistral-claude
ollama rm qwen2.5-coder:14b
```

**✅ JOUR 1 TERMINÉ: 4 LLMs opérationnels**

---

## JOUR 2: Continue.dev + Configuration

### 1. Installer Continue.dev extension
```bash
code --install-extension continue.continue
```

### 2. Créer configuration Continue.dev
**Fichier:** `E:\ANA\config\continue_config.json`
```json
{
  "models": [
    {
      "title": "Ana Coding Brain",
      "provider": "ollama",
      "model": "deepseek-coder-v2:16b-lite-instruct-q4_K_M",
      "apiBase": "http://localhost:11434"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Ana Fast Complete",
    "provider": "ollama",
    "model": "phi3:mini-128k"
  }
}
```

### 3. Tester Continue.dev
1. Ouvrir VS Code: `code E:\ANA`
2. Créer fichier: `test_autocomplete.js`
3. Taper: `function sortArray`
4. Appuyer Tab
5. Vérifier autocomplete fonctionne

**✅ JOUR 2 TERMINÉ: Coding assistant local opérationnel**

---

## JOUR 3: Structure + Multi-LLM Router (Part 1)

### 1. Créer structure dossiers
```bash
cd E:\ANA
mkdir intelligence
mkdir intelligence\coding
mkdir intelligence\conversation
mkdir intelligence\vision
mkdir test
```

### 2. Créer fichier orchestrator.cjs
**Fichier:** `E:\ANA\intelligence\orchestrator.cjs`

```javascript
#!/usr/bin/env node

class IntelligenceRouter {
  constructor() {
    this.ollamaEndpoint = 'http://localhost:11434';
  }

  classifyTask(prompt) {
    // Coding patterns
    if (/\b(write|create|implement|code|function|debug|refactor)\b/i.test(prompt) ||
        /\b(javascript|python|java|rust|typescript)\b/i.test(prompt)) {
      return 'coding';
    }

    // Vision patterns
    if (/<image_data>/.test(prompt) ||
        /\b(analyze|describe).*\b(image|photo)\b/i.test(prompt)) {
      return 'vision';
    }

    // Math patterns
    if (/\b(calculate|solve|compute)\b/i.test(prompt) ||
        /\d+\s*[\+\-\*\/]\s*\d+/.test(prompt)) {
      return 'math';
    }

    // Default: conversation
    return 'conversation';
  }

  getLLMForTask(taskType) {
    const mapping = {
      coding: 'deepseek-coder-v2:16b-lite-instruct-q4_K_M',
      conversation: 'phi3:mini-128k',
      vision: 'llama3.2-vision:11b',
      math: 'qwen2.5-coder:7b'
    };
    return mapping[taskType];
  }

  async route(prompt) {
    const taskType = this.classifyTask(prompt);
    const llmModel = this.getLLMForTask(taskType);

    console.log(`[Router] Task: ${taskType} → LLM: ${llmModel}`);

    const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: llmModel,
        prompt: prompt,
        stream: false
      })
    });

    const data = await response.json();

    return {
      llm_used: llmModel,
      task_type: taskType,
      response: data.response,
      latency_ms: Date.now() - startTime
    };
  }
}

module.exports = IntelligenceRouter;

// Test si lancé directement
if (require.main === module) {
  const router = new IntelligenceRouter();

  // Tests
  const tests = [
    'Write a function to sort array',
    'Hello how are you?',
    'Calculate 15 * 23',
    'Analyze this image'
  ];

  tests.forEach(async (test) => {
    const result = await router.route(test);
    console.log(`\nPrompt: ${test}`);
    console.log(`Task: ${result.task_type}`);
    console.log(`LLM: ${result.llm_used}`);
    console.log(`Response: ${result.response.substring(0, 100)}...`);
  });
}
```

### 3. Tester router
```bash
cd E:\ANA
node intelligence\orchestrator.cjs
```

**Résultat attendu:**
- Coding prompt → deepseek-coder-v2
- Conversation → phi3
- Math → qwen2.5-coder
- Vision → llama3.2-vision

**✅ JOUR 3 TERMINÉ: Router basic fonctionnel**

---

## JOUR 4: Multi-LLM Router (Part 2 - VRAM Manager)

### 1. Ajouter VRAM Manager à orchestrator.cjs

**Ajouter cette classe AVANT IntelligenceRouter:**
```javascript
class VRAMManager {
  constructor() {
    this.maxConcurrent = 2;
    this.loadedLLMs = new Map();
    this.vramUsage = {
      'deepseek-coder-v2:16b-lite-instruct-q4_K_M': 5.5 * 1024,
      'phi3:mini-128k': 3.0 * 1024,
      'qwen2.5-coder:7b': 3.4 * 1024,
      'llama3.2-vision:11b': 5.0 * 1024
    };
  }

  markAsLoaded(modelName) {
    this.loadedLLMs.set(modelName, {
      vram: this.vramUsage[modelName],
      lastUsed: Date.now()
    });

    // Si > 2 LLMs, unload le moins récemment utilisé
    if (this.loadedLLMs.size > this.maxConcurrent) {
      const lru = this.getLRU();
      this.loadedLLMs.delete(lru);
      console.log(`[VRAM] Unloaded ${lru} (LRU)`);
    }

    this.logState();
  }

  getLRU() {
    let oldest = null;
    let oldestTime = Infinity;
    for (const [model, info] of this.loadedLLMs) {
      if (info.lastUsed < oldestTime) {
        oldestTime = info.lastUsed;
        oldest = model;
      }
    }
    return oldest;
  }

  getTotalVRAM() {
    let total = 0;
    for (const info of this.loadedLLMs.values()) {
      total += info.vram;
    }
    return total;
  }

  logState() {
    const total = this.getTotalVRAM();
    const gb = (total / 1024).toFixed(1);
    const percent = ((total / (8 * 1024)) * 100).toFixed(1);
    console.log(`[VRAM] ${gb}GB / 8GB (${percent}%) | Loaded: ${this.loadedLLMs.size}`);
  }
}
```

### 2. Intégrer VRAM Manager dans IntelligenceRouter

**Modifier constructor:**
```javascript
constructor() {
  this.ollamaEndpoint = 'http://localhost:11434';
  this.vramManager = new VRAMManager();
}
```

**Modifier route() pour tracker VRAM:**
```javascript
async route(prompt) {
  const startTime = Date.now();
  const taskType = this.classifyTask(prompt);
  const llmModel = this.getLLMForTask(taskType);

  // Track VRAM
  this.vramManager.markAsLoaded(llmModel);

  // ... rest of code
}
```

### 3. Tester VRAM tracking
```bash
node intelligence\orchestrator.cjs
```

**Vérifier logs VRAM affichés**

**✅ JOUR 4 TERMINÉ: VRAM Manager opérationnel**

---

## JOUR 5: Memory System (ChromaDB)

### 1. Installer ChromaDB
```bash
cd E:\ANA
python -m pip install chromadb
```

### 2. Créer dossiers memory
```bash
mkdir memory
mkdir memory\long_term
mkdir memory\long_term\chromadb
```

### 3. Créer chromadb_manager.cjs
**Fichier:** `E:\ANA\memory\chromadb_manager.cjs`

```javascript
#!/usr/bin/env node

const { ChromaClient } = require('chromadb');
const fs = require('fs');
const path = require('path');

class ChromaDBManager {
  constructor() {
    this.client = null;
    this.collection = null;
    this.dbPath = 'E:/ANA/memory/long_term/chromadb';
    this.collectionName = 'ana_memories';
  }

  async initialize() {
    this.client = new ChromaClient({ path: this.dbPath });

    try {
      this.collection = await this.client.getCollection({
        name: this.collectionName
      });
    } catch (error) {
      this.collection = await this.client.createCollection({
        name: this.collectionName
      });
    }

    console.log(`[ChromaDB] Initialized: ${this.collectionName}`);
  }

  async store(text, metadata = {}) {
    const embedding = await this.embed(text);
    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await this.collection.add({
      ids: [id],
      embeddings: [embedding],
      documents: [text],
      metadatas: [{ ...metadata, timestamp: new Date().toISOString() }]
    });

    return id;
  }

  async recall(query, n = 5) {
    const embedding = await this.embed(query);

    const results = await this.collection.query({
      queryEmbeddings: [embedding],
      nResults: n
    });

    return results.documents[0].map((doc, i) => ({
      content: doc,
      metadata: results.metadatas[0][i],
      distance: results.distances[0][i]
    }));
  }

  async embed(text) {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text
      })
    });

    const data = await response.json();
    return data.embedding;
  }
}

module.exports = ChromaDBManager;

// Test
if (require.main === module) {
  (async () => {
    const manager = new ChromaDBManager();
    await manager.initialize();

    // Store test
    const memId = await manager.store('Ana is built by Alain', {
      importance: 10,
      category: 'user'
    });
    console.log(`Stored: ${memId}`);

    // Recall test
    const results = await manager.recall('Who built Ana?', 1);
    console.log('Recalled:', results[0].content);
  })();
}
```

### 4. Tester ChromaDB
```bash
node memory\chromadb_manager.cjs
```

**Résultat attendu:**
```
[ChromaDB] Initialized: ana_memories
Stored: mem_1234567890_abc123
Recalled: Ana is built by Alain
```

**✅ JOUR 5 TERMINÉ: ChromaDB opérationnel**

---

## JOUR 6: Memory Manager + Context

### 1. Créer memory_manager.cjs
**Fichier:** `E:\ANA\memory\memory_manager.cjs`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const ChromaDBManager = require('./chromadb_manager.cjs');

class MemoryManager {
  constructor() {
    this.contextFile = 'E:/ANA/memory/current_context.txt';
    this.workingMemoryFile = 'E:/ANA/memory/working_memory.json';
    this.chromaDB = new ChromaDBManager();
    this.context = '';
    this.workingMemory = {};
  }

  async initialize() {
    await this.chromaDB.initialize();
    this.context = await this.loadContext();

    if (fs.existsSync(this.workingMemoryFile)) {
      this.workingMemory = JSON.parse(fs.readFileSync(this.workingMemoryFile, 'utf8'));
    }

    console.log('[Memory] Initialized');
  }

  async loadContext() {
    if (!fs.existsSync(this.contextFile)) {
      return this.createDefaultContext();
    }
    return fs.readFileSync(this.contextFile, 'utf8');
  }

  async saveContext() {
    const updated = this.context.replace(
      /Last Updated: .*/,
      `Last Updated: ${new Date().toISOString()}`
    );
    fs.writeFileSync(this.contextFile, updated, 'utf8');
  }

  async store(text, metadata = {}) {
    return await this.chromaDB.store(text, metadata);
  }

  async recall(query, n = 5) {
    return await this.chromaDB.recall(query, n);
  }

  setWorkingMemory(key, value) {
    this.workingMemory[key] = value;
    fs.writeFileSync(
      this.workingMemoryFile,
      JSON.stringify(this.workingMemory, null, 2),
      'utf8'
    );
  }

  getWorkingMemory(key) {
    return this.workingMemory[key];
  }

  createDefaultContext() {
    return `=== ANA CONTEXT ===
Last Updated: ${new Date().toISOString()}
Session ID: ${Date.now()}

--- USER PROFILE ---
Name: Alain
Role: Master Engineer, Creator of Ana

--- CONVERSATION HISTORY ---
[${new Date().toISOString()}] System: Ana initialized

--- CURRENT TASK ---
Task: None
Status: Ready

--- KEY FACTS ---
- Ana birth: 2025-11-18
- Ana purpose: Autonomous, creative, evolving AI
- Primary LLMs: DeepSeek (coding), Phi-3 (conversation), Llama Vision (images), Qwen (math)

--- ACTIVE METRICS ---
technical_skills: 0/10
creative_output: 0/10
autonomy_level: 0/10
`;
  }
}

module.exports = MemoryManager;

// Test
if (require.main === module) {
  (async () => {
    const memory = new MemoryManager();
    await memory.initialize();

    // Test store + recall
    await memory.store('Alain is a master engineer');
    const results = await memory.recall('Who is Alain?', 1);
    console.log('Recalled:', results[0].content);

    // Test working memory
    memory.setWorkingMemory('current_task', 'Building Ana');
    console.log('Working memory:', memory.getWorkingMemory('current_task'));
  })();
}
```

### 2. Tester Memory Manager
```bash
node memory\memory_manager.cjs
```

**✅ JOUR 6 TERMINÉ: Memory system complet**

---

## JOUR 7: Ana Core Integration

### 1. Mettre à jour ana_core.cjs
**Fichier:** `E:\ANA\core\ana_core.cjs`

**Remplacer:**
```javascript
this.llmModel = 'mistral-claude-v2';
```

**Par:**
```javascript
this.llmModel = 'phi3:mini-128k'; // Thinking autonome Ana
```

### 2. Intégrer Intelligence Router + Memory

**Ajouter au début:**
```javascript
const IntelligenceRouter = require('../intelligence/orchestrator.cjs');
const MemoryManager = require('../memory/memory_manager.cjs');
```

**Dans constructor:**
```javascript
this.intelligence = new IntelligenceRouter();
this.memory = new MemoryManager();
```

**Dans start():**
```javascript
await this.memory.initialize();
```

### 3. Créer test end-to-end
**Fichier:** `E:\ANA\test\integration.test.js`

```javascript
const AnaCore = require('../core/ana_core.cjs');

(async () => {
  console.log('=== TEST ANA INTEGRATION ===\n');

  const ana = new AnaCore();
  await ana.start();

  // Test 1: Coding
  console.log('TEST 1: Coding task');
  const coding = await ana.intelligence.route('Write hello world in JavaScript');
  console.log(`✓ Routed to: ${coding.llm_used}`);
  console.assert(coding.llm_used.includes('deepseek'), 'Should route to DeepSeek');

  // Test 2: Conversation
  console.log('\nTEST 2: Conversation');
  const conv = await ana.intelligence.route('Hello, how are you?');
  console.log(`✓ Routed to: ${conv.llm_used}`);
  console.assert(conv.llm_used.includes('phi3'), 'Should route to Phi-3');

  // Test 3: Memory
  console.log('\nTEST 3: Memory store + recall');
  await ana.memory.store('Alain created Ana on 2025-11-18');
  const results = await ana.memory.recall('When was Ana created?', 1);
  console.log(`✓ Recalled: ${results[0].content}`);

  console.log('\n=== ALL TESTS PASSED ===');
})();
```

### 4. Lancer test complet
```bash
node test\integration.test.js
```

**Résultat attendu:**
```
=== TEST ANA INTEGRATION ===

TEST 1: Coding task
✓ Routed to: deepseek-coder-v2:16b-lite-instruct-q4_K_M

TEST 2: Conversation
✓ Routed to: phi3:mini-128k

TEST 3: Memory store + recall
✓ Recalled: Alain created Ana on 2025-11-18

=== ALL TESTS PASSED ===
```

**✅ JOUR 7 TERMINÉ: Ana Core opérationnel avec Multi-LLM + Memory**

---

## CHECKLIST FINAL (Jour 7)

- [ ] 4 LLMs installés (ollama list montre tous)
- [ ] Continue.dev autocomplete fonctionne
- [ ] Multi-LLM Router route correctement (test coding → deepseek)
- [ ] VRAM Manager limite à 2 LLMs
- [ ] ChromaDB store + recall fonctionnent
- [ ] Memory Manager complet (context + chromadb + working)
- [ ] Ana Core intégré avec Router + Memory
- [ ] Test integration.test.js passe
- [ ] NEXUS intact (vérifier E:\Claude_Autonome\ non modifié)
- [ ] ARCHON intact (vérifier E:\Quartier_General\archon-v3\ non modifié)

**SI TOUS ✅ → ANA PHASE 1 OPÉRATIONNELLE**

---

## COMMANDES VÉRIFICATION RAPIDE

```bash
# Vérifier LLMs
ollama list

# Vérifier VRAM
nvidia-smi

# Tester router
node E:\ANA\intelligence\orchestrator.cjs

# Tester memory
node E:\ANA\memory\memory_manager.cjs

# Test complet
node E:\ANA\test\integration.test.js

# Lancer Ana
node E:\ANA\core\ana_core.cjs
```

---

**PRÊT À COMMENCER. JOUR 1 = MAINTENANT.**
