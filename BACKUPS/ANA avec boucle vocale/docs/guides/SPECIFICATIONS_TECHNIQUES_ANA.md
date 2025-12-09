# SPÉCIFICATIONS TECHNIQUES ANA - INGÉNIERIE SYSTÈME

**Version:** 2.0.0
**Date:** 22 Novembre 2025
**Type:** Document d'architecture système et spécifications d'implémentation
**Auteur:** Équipe Ana (Alain + Assistant IA)
**Status:** Spécifications opérationnelles

---

## 1. ARCHITECTURE SYSTÈME GLOBALE

### 1.1 Composants Principaux

```
┌─────────────────────────────────────────────────────────────────┐
│                      ANA SYSTEM ARCHITECTURE                     │
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   Ana Core       │────────▶│  Intelligence    │             │
│  │   Orchestrator   │         │  Router (Multi-  │             │
│  │                  │         │  LLM Dispatcher) │             │
│  └────────┬─────────┘         └─────────┬────────┘             │
│           │                             │                       │
│           │                             │                       │
│  ┌────────▼─────────┐         ┌─────────▼────────┐             │
│  │  Memory System   │         │  Agent Bus       │             │
│  │  (ChromaDB +     │         │  (Event-Driven   │             │
│  │   Context)       │         │   Coordination)  │             │
│  └────────┬─────────┘         └─────────┬────────┘             │
│           │                             │                       │
│           └─────────────┬───────────────┘                       │
│                         │                                       │
│              ┌──────────▼──────────┐                            │
│              │   Tool Executor     │                            │
│              │   (Bash, Files,     │                            │
│              │    Code Editor)     │                            │
│              └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Définitions Composants

#### Ana Core Orchestrator

**Définition technique:**
Module principal d'orchestration système qui coordonne tous les sous-systèmes. Implémente le cycle de traitement complet des requêtes utilisateur.

**Responsabilités exactes:**

1. **Initialisation système** (`initialize()`)
   - Charge configuration depuis `E:\ANA\config\system_config.json`
   - Vérifie disponibilité 4 LLMs via Ollama API (port 11434)
   - Initialise Memory Manager (charge `current_context.txt`)
   - Démarre Agent Coordinator (lance 25 agents)
   - Initialise Tool Executor (bash, file, code capabilities)
   - Valide tous chemins absolus (E:\ANA\)
   - Temps max initialisation: **5 secondes**

2. **Traitement requête** (`processRequest()`)
   - INPUT: `{type: string, prompt: string, context?: object}`
   - ÉTAPES:
     a. Load context from Memory (`memory.loadContext()`)
     b. Classify task type (`intelligence.classify(prompt)`)
     c. Route to appropriate LLM (`intelligence.route(request)`)
     d. Execute tools if needed (`tools.execute(commands)`)
     e. Store results in memory (`memory.store(result)`)
     f. Emit event to Agent Bus (`eventBus.emit('task:completed')`)
   - OUTPUT: `{response: string, llm_used: string, latency_ms: number}`
   - Temps max traitement: **10 secondes** (moyenne)

3. **API REST** (Express.js sur port 3338)
   - `POST /api/chat` - Conversation interactive
   - `POST /api/think` - Autonomous thinking cycle
   - `GET /api/status` - System health
   - `GET /api/metrics` - Performance metrics
   - Authentification: localhost only (pas de JWT phase 1)

4. **État système** (variables runtime)
   - `currentUser: string` - Username (Alain)
   - `activeTask: string | null` - Tâche en cours
   - `requestQueue: Queue<Request>` - File requêtes (max 10)
   - `metrics: {requests: number, avgLatency: number, errors: number}`

5. **Logging structuré** (Winston)
   - `E:\ANA\logs\evolution_log.jsonl` - Toutes actions
   - `E:\ANA\logs\error.log` - Erreurs uniquement
   - `E:\ANA\logs\performance.json` - Métriques temps réel (mis à jour chaque minute)

**Tech Stack:**
- Runtime: Node.js 22.20.0
- Framework: Express.js 4.18.x
- Logging: winston 3.x
- Config: dotenv + JSON
- Process manager: PM2 (production)

**Schéma de Configuration:**

```json
{
  "name": "Ana Core",
  "version": "1.0.0",
  "port": 3338,
  "intelligence": {
    "ollama_endpoint": "http://localhost:11434",
    "default_temperature": 0.7,
    "max_tokens": 2048,
    "timeout_seconds": 120
  },
  "memory": {
    "context_file": "E:/ANA/memory/current_context.txt",
    "chromadb_path": "E:/ANA/memory/long_term/chromadb",
    "max_context_lines": 5000
  },
  "agents": {
    "event_bus_port": 3339,
    "health_check_interval_seconds": 300
  },
  "security": {
    "allowed_ips": ["127.0.0.1", "::1"],
    "protected_paths": [
      "E:/Claude_Autonome",
      "E:/Quartier_General/archon-v3",
      "E:/Mémoire Claude/current_conversation.txt"
    ]
  }
}
```

**Critères d'Acceptation Mesurables:**

- [ ] Initialisation complète < 5s (mesuré avec `Date.now()` avant/après)
- [ ] Process request end-to-end < 10s moyenne (sur 100 requêtes)
- [ ] Charge contexte mémoire automatiquement au démarrage (vérifié par test)
- [ ] Log toutes actions dans `evolution_log.jsonl` (format JSONL valide)
- [ ] Graceful shutdown: sauvegarde état avant exit (test SIGINT)
- [ ] Recovery automatique si crash: redémarre via PM2 (max 3 tentatives/min)
- [ ] Memory usage < 512MB après 1000 requêtes (pas de memory leak)

**Tests Unitaires:**

```javascript
// test/ana_core.test.js
const AnaCore = require('../core/ana_core.cjs');

describe('AnaCore', () => {
  let core;

  beforeEach(async () => {
    core = new AnaCore({
      config_path: './test/fixtures/test_config.json'
    });
  });

  test('initialize() charge config valide en < 5s', async () => {
    const start = Date.now();
    await core.initialize();
    const duration = Date.now() - start;

    expect(core.isReady()).toBe(true);
    expect(duration).toBeLessThan(5000);
    expect(core.config).toBeDefined();
    expect(core.config.port).toBe(3338);
  });

  test('processRequest() route vers bon module', async () => {
    await core.initialize();

    const response = await core.processRequest({
      type: 'coding',
      prompt: 'Write hello world function in JavaScript'
    });

    expect(response).toBeDefined();
    expect(response.llm_used).toContain('deepseek-coder');
    expect(response.response).toBeTruthy();
    expect(response.latency_ms).toBeLessThan(10000);
  });

  test('loadContext() charge contexte depuis fichier', async () => {
    await core.initialize();
    const context = await core.memory.loadContext();

    expect(context).toContain('=== ANA CONTEXT ===');
    expect(context).toContain('User name: Alain');
  });

  test('graceful shutdown sauvegarde état', async () => {
    await core.initialize();

    // Créer état
    core.activeTask = 'test_task';
    core.metrics.requests = 42;

    // Shutdown
    await core.shutdown();

    // Vérifier sauvegarde
    const savedState = JSON.parse(
      fs.readFileSync('E:/ANA/state/shutdown_state.json', 'utf8')
    );

    expect(savedState.activeTask).toBe('test_task');
    expect(savedState.metrics.requests).toBe(42);
  });
});
```

**Tests d'Intégration:**

```javascript
// test/integration/full_flow.test.js
describe('Full Request Flow', () => {
  test('User message → LLM → Memory → Response', async () => {
    const ana = new AnaCore(testConfig);
    await ana.initialize();

    // Requête
    const response = await ana.processRequest({
      type: 'conversation',
      prompt: 'My name is Alain, remember this.'
    });

    // Vérifie LLM response
    expect(response.response).toBeTruthy();
    expect(response.llm_used).toContain('phi3');

    // Vérifie mémoire stockée
    const memories = await ana.memory.recall('Alain', 1);
    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0].content).toContain('Alain');

    // Vérifie context mis à jour
    const context = await ana.memory.loadContext();
    expect(context).toContain('User name: Alain');

    // Vérifie event émis
    expect(ana.eventBus.getHistory()).toContainEqual(
      expect.objectContaining({
        type: 'task:completed',
        data: expect.objectContaining({
          task_type: 'conversation'
        })
      })
    );
  });
});
```

---

## 2. SYSTÈME INTELLIGENCE MULTI-LLM

### 2.1 Multi-LLM Router

**Définition technique:**
Système de routage intelligent qui analyse le type de tâche et dispatche vers le LLM optimal parmi 4 modèles locaux. Gère le load balancing, fallback automatique, et monitoring VRAM.

**Responsabilités exactes:**

1. **Classification de tâche** (`classifyTask(prompt)`)
   - Analyse prompt avec regex patterns
   - Retourne: `'coding' | 'conversation' | 'vision' | 'math'`
   - Latence max: **50ms**

2. **Routing vers LLM** (`route(request)`)
   - INPUT: `{task_type, prompt, options}`
   - Sélectionne LLM selon mapping
   - Charge LLM si non déjà loaded (via Ollama)
   - Envoie requête POST à `http://localhost:11434/api/generate`
   - OUTPUT: `{llm_used, response, tokens, latency_ms}`

3. **Gestion VRAM** (`VRAMManager`)
   - Track 2 LLMs max simultanés (limite 8GB RTX 3070)
   - Unload LLM idle > 5 minutes
   - Monitoring VRAM usage (nvidia-smi si disponible)

4. **Fallback automatique**
   - Si LLM primary échoue → try secondary
   - Délai max fallback: **500ms**

**LLMs Disponibles (4 Champions):**

| LLM | Taille | VRAM | Rôle | Vitesse | Performance |
|-----|--------|------|------|---------|-------------|
| **deepseek-coder-v2:16b-lite-instruct-q4_K_M** | 16B (Q4) | ~5-6GB | Coding champion | Rapide (MoE) | GPT-4 Turbo niveau |
| **phi3:mini-128k** | 3.8B (Q8) | ~3GB | Conversation & Thinking | Ultra-rapide | 130-150 tok/sec |
| **qwen2.5-coder:7b-instruct-q4_K_M** | 7B (Q4) | ~3.4GB | Backup coding & Math | Rapide | HumanEval 85%, MATH 80% |
| **llama3.2-vision:11b-instruct-q4_K_M** | 11B (Q4) | ~5GB | Vision & Images | Moyen | Multimodal (text+img) |

**Stratégie de Routing:**

```javascript
const TASK_TO_LLM_MAPPING = {
  coding: {
    primary: 'deepseek-coder-v2:16b-lite-instruct-q4_K_M',
    fallback: 'qwen2.5-coder:7b-instruct-q4_K_M'
  },
  conversation: {
    primary: 'phi3:mini-128k',
    fallback: null // Phi-3 très stable
  },
  vision: {
    primary: 'llama3.2-vision:11b-instruct-q4_K_M',
    fallback: null // Seul LLM vision
  },
  math: {
    primary: 'qwen2.5-coder:7b-instruct-q4_K_M',
    fallback: 'phi3:mini-128k'
  }
};
```

**Algorithme de Classification:**

```javascript
function classifyTask(prompt) {
  // Patterns pour chaque type
  const patterns = {
    coding: [
      /\b(write|create|implement|code|function|class|debug|refactor)\b.*\b(code|function|class|script|program)\b/i,
      /\b(javascript|python|java|rust|go|typescript|node\.js)\b/i,
      /\b(fix|solve|debug)\b.*\b(error|bug|issue)\b/i,
      /^(write|create|implement|code)\s+/i
    ],
    vision: [
      /\b(analyze|describe|what'?s in|identify)\b.*\b(image|photo|picture|screenshot)\b/i,
      /\b(image|photo|picture)\b.*\b(contains|shows|depicts)\b/i,
      /<image_data>/  // Détection base64 image
    ],
    math: [
      /\b(calculate|solve|compute)\b/i,
      /\b(equation|integral|derivative|matrix|algebra)\b/i,
      /\d+\s*[\+\-\*\/\^]\s*\d+/,  // Math expressions
      /\b(sum|product|average|mean|median)\b/i
    ]
  };

  // Test coding first (plus fréquent)
  if (patterns.coding.some(regex => regex.test(prompt))) {
    return 'coding';
  }

  // Vision
  if (patterns.vision.some(regex => regex.test(prompt))) {
    return 'vision';
  }

  // Math
  if (patterns.math.some(regex => regex.test(prompt))) {
    return 'math';
  }

  // Default: conversation
  return 'conversation';
}
```

**VRAM Manager:**

```javascript
class VRAMManager {
  constructor() {
    this.maxConcurrent = 2; // RTX 3070 8GB limit
    this.loadedLLMs = new Map(); // model → {vram, lastUsed, pid}
    this.vramUsage = {
      'deepseek-coder-v2:16b-lite-instruct-q4_K_M': 5.5 * 1024, // MB
      'phi3:mini-128k': 3.0 * 1024,
      'qwen2.5-coder:7b-instruct-q4_K_M': 3.4 * 1024,
      'llama3.2-vision:11b-instruct-q4_K_M': 5.0 * 1024
    };
    this.idleTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async loadLLM(modelName) {
    // Si 2 LLMs déjà chargés, unload le moins récemment utilisé
    if (this.loadedLLMs.size >= this.maxConcurrent) {
      const leastUsed = this.getLeastRecentlyUsed();
      await this.unloadLLM(leastUsed);
    }

    // Charger via Ollama
    await this.ollamaLoad(modelName);

    this.loadedLLMs.set(modelName, {
      vram: this.vramUsage[modelName],
      lastUsed: Date.now(),
      loadedAt: Date.now()
    });

    console.log(`[VRAM] Loaded ${modelName} (~${this.vramUsage[modelName]/1024}GB)`);
    this.logVRAMState();
  }

  async unloadLLM(modelName) {
    if (!this.loadedLLMs.has(modelName)) return;

    // Unload via Ollama (envoie requête vide pour trigger unload)
    await this.ollamaUnload(modelName);

    this.loadedLLMs.delete(modelName);
    console.log(`[VRAM] Unloaded ${modelName}`);
    this.logVRAMState();
  }

  updateLastUsed(modelName) {
    if (this.loadedLLMs.has(modelName)) {
      this.loadedLLMs.get(modelName).lastUsed = Date.now();
    }
  }

  getLeastRecentlyUsed() {
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

  async cleanupIdle() {
    const now = Date.now();

    for (const [model, info] of this.loadedLLMs) {
      if (now - info.lastUsed > this.idleTimeout) {
        await this.unloadLLM(model);
      }
    }
  }

  getTotalVRAM() {
    let total = 0;
    for (const info of this.loadedLLMs.values()) {
      total += info.vram;
    }
    return total;
  }

  logVRAMState() {
    const total = this.getTotalVRAM();
    const percent = (total / (8 * 1024)) * 100; // 8GB total
    console.log(`[VRAM] Usage: ${(total/1024).toFixed(1)}GB / 8GB (${percent.toFixed(1)}%)`);
    console.log(`[VRAM] Loaded: ${Array.from(this.loadedLLMs.keys()).join(', ')}`);
  }
}
```

**Interface API:**

```javascript
class IntelligenceRouter {
  constructor(config) {
    this.config = config;
    this.vramManager = new VRAMManager();
    this.stats = {
      requests: 0,
      by_llm: {},
      avg_latency: 0,
      errors: 0
    };
  }

  async route(request) {
    const startTime = Date.now();

    // Classify
    const taskType = this.classifyTask(request.prompt);

    // Get LLM mapping
    const mapping = TASK_TO_LLM_MAPPING[taskType];
    let llmModel = mapping.primary;

    // Ensure LLM loaded
    await this.vramManager.loadLLM(llmModel);

    // Call Ollama
    let response;
    try {
      response = await this.callOllama(llmModel, request);
      this.vramManager.updateLastUsed(llmModel);
    } catch (error) {
      // Fallback if available
      if (mapping.fallback) {
        console.log(`[Router] Primary ${llmModel} failed, trying fallback ${mapping.fallback}`);
        llmModel = mapping.fallback;
        await this.vramManager.loadLLM(llmModel);
        response = await this.callOllama(llmModel, request);
        this.vramManager.updateLastUsed(llmModel);
      } else {
        throw error;
      }
    }

    const latency = Date.now() - startTime;

    // Update stats
    this.updateStats(llmModel, latency);

    return {
      llm_used: llmModel,
      task_type: taskType,
      response: response.response,
      tokens: {
        prompt: response.prompt_eval_count || 0,
        completion: response.eval_count || 0,
        total: (response.prompt_eval_count || 0) + (response.eval_count || 0)
      },
      latency_ms: latency,
      timestamp: new Date().toISOString()
    };
  }

  async callOllama(model, request) {
    const payload = {
      model: model,
      prompt: request.prompt,
      stream: false,
      options: {
        temperature: request.temperature || 0.7,
        num_predict: request.max_tokens || 2048,
        top_p: 0.9
      }
    };

    if (request.system_prompt) {
      payload.system = request.system_prompt;
    }

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  classifyTask(prompt) {
    // Implementation from above
  }

  updateStats(llmModel, latency) {
    this.stats.requests++;

    if (!this.stats.by_llm[llmModel]) {
      this.stats.by_llm[llmModel] = { count: 0, total_latency: 0 };
    }

    this.stats.by_llm[llmModel].count++;
    this.stats.by_llm[llmModel].total_latency += latency;

    // Update average
    this.stats.avg_latency =
      (this.stats.avg_latency * (this.stats.requests - 1) + latency) / this.stats.requests;
  }

  getStats() {
    const stats = { ...this.stats };

    // Calculate avg latency per LLM
    for (const [model, data] of Object.entries(stats.by_llm)) {
      stats.by_llm[model].avg_latency = data.total_latency / data.count;
    }

    // VRAM info
    stats.vram = {
      loaded: Array.from(this.vramManager.loadedLLMs.keys()),
      total_mb: this.vramManager.getTotalVRAM(),
      total_gb: (this.vramManager.getTotalVRAM() / 1024).toFixed(2),
      percent: ((this.vramManager.getTotalVRAM() / (8 * 1024)) * 100).toFixed(1)
    };

    return stats;
  }

  async healthCheck() {
    // Ping Ollama
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();

      return {
        status: 'healthy',
        ollama_version: data.version || 'unknown',
        models_available: data.models?.map(m => m.name) || [],
        vram_usage: this.vramManager.getTotalVRAM(),
        loaded_llms: Array.from(this.vramManager.loadedLLMs.keys())
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}
```

**Critères d'Acceptation:**

- [ ] Classification accuracy >= 95% (test sur 100 prompts variés)
- [ ] Routing latency < 50ms (hors appel LLM)
- [ ] Fallback activation < 500ms
- [ ] VRAM jamais > 8GB (monitored via nvidia-smi)
- [ ] Unload LLMs idle après 5min exactement
- [ ] Stats tracking précis (requests, latency, by_llm)

**Tests:**

```javascript
describe('IntelligenceRouter', () => {
  let router;

  beforeEach(() => {
    router = new IntelligenceRouter(config);
  });

  test('classifyTask() accuracy >= 95%', () => {
    const testCases = [
      { prompt: 'Write a function to sort array', expected: 'coding' },
      { prompt: 'Implement quicksort in Python', expected: 'coding' },
      { prompt: 'Debug this error: TypeError', expected: 'coding' },
      { prompt: 'Hello how are you?', expected: 'conversation' },
      { prompt: 'What is the capital of France?', expected: 'conversation' },
      { prompt: 'Analyze this image <image_data>', expected: 'vision' },
      { prompt: 'What objects are in this photo?', expected: 'vision' },
      { prompt: 'Calculate 15 * 23', expected: 'math' },
      { prompt: 'Solve equation: 2x + 5 = 15', expected: 'math' },
      // ... 91 more test cases
    ];

    let correct = 0;
    for (const tc of testCases) {
      const result = router.classifyTask(tc.prompt);
      if (result === tc.expected) correct++;
    }

    const accuracy = (correct / testCases.length) * 100;
    expect(accuracy).toBeGreaterThanOrEqual(95);
  });

  test('route() to correct LLM for coding', async () => {
    const response = await router.route({
      prompt: 'Write hello world in JavaScript'
    });

    expect(response.llm_used).toContain('deepseek-coder');
    expect(response.task_type).toBe('coding');
  });

  test('fallback works if primary fails', async () => {
    // Mock primary failure
    jest.spyOn(router, 'callOllama')
      .mockRejectedValueOnce(new Error('DeepSeek down'))
      .mockResolvedValueOnce({ response: 'Fallback response', eval_count: 10 });

    const response = await router.route({
      prompt: 'Write code'
    });

    expect(response.llm_used).toContain('qwen2.5-coder');
  });

  test('VRAM manager limits to 2 LLMs', async () => {
    await router.vramManager.loadLLM('deepseek-coder-v2:16b-lite-instruct-q4_K_M');
    await router.vramManager.loadLLM('llama3.2-vision:11b-instruct-q4_K_M');

    expect(router.vramManager.loadedLLMs.size).toBe(2);

    // Load 3rd should unload 1st
    await router.vramManager.loadLLM('phi3:mini-128k');

    expect(router.vramManager.loadedLLMs.size).toBe(2);
    expect(router.vramManager.loadedLLMs.has('phi3:mini-128k')).toBe(true);
  });
});
```

---

## 3. SYSTÈME MÉMOIRE PERSISTANTE

### 3.1 Memory Manager

**Définition technique:**
Système de gestion mémoire multi-niveaux: court terme (context.txt), long terme (ChromaDB vector store), et mémoire de travail (JSON). Assure persistance complète entre sessions.

**Responsabilités exactes:**

1. **Mémoire court terme** (current_context.txt)
   - Fichier: `E:\ANA\memory\current_context.txt`
   - Format: Texte structuré avec sections
   - `loadContext()` - Charge au démarrage (< 500ms)
   - `saveContext()` - Sauvegarde après chaque interaction (< 200ms)
   - `appendContext()` - Ajoute nouvelle info
   - Max size: 5000 lignes (~500KB)

2. **Mémoire long terme** (ChromaDB)
   - Database: `E:\ANA\memory\long_term\chromadb`
   - Collection: `ana_memories`
   - Embeddings: 384 dimensions (nomic-embed-text via Ollama)
   - `store(text, metadata)` - Stocke mémoire avec embedding
   - `recall(query, n)` - Recherche sémantique (retourne top-n)
   - Recall latency: < 1s

3. **Mémoire de travail** (working_memory.json)
   - Fichier: `E:\ANA\memory\working_memory.json`
   - Variables runtime: `{key: value}`
   - `set(key, value)` - Écriture
   - `get(key)` - Lecture
   - Persist sur disque à chaque modification

**Format current_context.txt:**

```
=== ANA CONTEXT ===
Last Updated: 2025-11-22T15:30:45Z
Session ID: 1763789445322
System Version: 1.0.0

--- USER PROFILE ---
Name: Alain
Role: Master Engineer, Creator of Ana
Preferences:
  - Communication style: Direct, technical, no fluff
  - Work style: Perfection first time, rigorous methodology
  - Values: Rigor (10/10), Methodology (10/10), Backup First (10/10)

--- CONVERSATION HISTORY (Last 20 messages) ---
[2025-11-22 15:20:30] User: Create function to sort array
[2025-11-22 15:21:15] Ana: Here's a quicksort implementation...
[2025-11-22 15:22:00] User: Test it with [3,1,4,1,5]
[2025-11-22 15:22:45] Ana: Tested, output: [1,1,3,4,5]

--- CURRENT TASK ---
Task: Implementing Multi-LLM Intelligence Router
Status: In Progress
Started: 2025-11-22 14:00:00
Progress: 60%
Blockers: None

--- KEY FACTS (Permanent) ---
- User name: Alain
- Ana birth date: 2025-11-18
- Ana purpose: Autonomous, creative, evolving AI
- Ana values: 7 core values (rigor, methodology, backup_first, curiosity, creativity, autonomy, partnership)
- Primary LLMs: DeepSeek (coding), Phi-3 (conversation), Llama Vision (images), Qwen (math)
- Working directory: E:\ANA\
- Protected paths: E:\Claude_Autonome\, E:\Quartier_General\archon-v3\

--- RECENT DECISIONS ---
[2025-11-22 14:00] Decision: Use Phi-3-Mini for autonomous thinking (score: 95/100)
  Reason: Ultra-fast (150 tok/sec), low VRAM (3GB), perfect for continuous thinking
[2025-11-22 13:00] Decision: Implement ChromaDB for long-term memory (score: 92/100)
  Reason: Best vector DB for local deployment, 384-dim embeddings sufficient

--- ACTIVE METRICS ---
technical_skills: 2/10 (improving)
creative_output: 0/10 (not started)
autonomy_level: 1/10 (basic)
days_alive: 4

--- NEXT ACTIONS ---
1. Complete Multi-LLM Router implementation
2. Write unit tests for router
3. Integrate with Ana Core
4. Test end-to-end flow

--- NOTES ---
- Remember: NEVER modify E:\Claude_Autonome\ (NEXUS)
- Always backup before critical modifications
- Perfection first time, no spinning in circles
```

**ChromaDB Implementation:**

```javascript
const { ChromaClient } = require('chromadb');

class ChromaDBManager {
  constructor(config) {
    this.client = null;
    this.collection = null;
    this.dbPath = config.chromadb_path || 'E:/ANA/memory/long_term/chromadb';
    this.collectionName = 'ana_memories';
    this.embeddingModel = 'nomic-embed-text'; // Via Ollama
  }

  async initialize() {
    // Initialize ChromaDB client
    this.client = new ChromaClient({
      path: this.dbPath
    });

    // Get or create collection
    try {
      this.collection = await this.client.getCollection({
        name: this.collectionName
      });
    } catch (error) {
      // Collection doesn't exist, create it
      this.collection = await this.client.createCollection({
        name: this.collectionName,
        metadata: {
          description: 'Ana long-term memories',
          embedding_function: this.embeddingModel,
          dimension: 384
        }
      });
    }

    console.log(`[ChromaDB] Initialized collection: ${this.collectionName}`);
  }

  async store(text, metadata = {}) {
    // Generate embedding
    const embedding = await this.embed(text);

    // Generate unique ID
    const id = `mem_${Date.now()}_${this.generateRandomID()}`;

    // Add to collection
    await this.collection.add({
      ids: [id],
      embeddings: [embedding],
      documents: [text],
      metadatas: [{
        ...metadata,
        timestamp: new Date().toISOString(),
        importance: metadata.importance || 5,
        category: metadata.category || 'general'
      }]
    });

    // Also append to memories.jsonl
    this.appendToJSONL(id, text, metadata, embedding);

    return id;
  }

  async recall(query, n = 5) {
    // Generate query embedding
    const queryEmbedding = await this.embed(query);

    // Search collection
    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: n,
      include: ['documents', 'metadatas', 'distances']
    });

    // Format results
    return results.documents[0].map((doc, i) => ({
      content: doc,
      metadata: results.metadatas[0][i],
      similarity: 1 - results.distances[0][i], // Convert distance to similarity
      distance: results.distances[0][i]
    }));
  }

  async embed(text) {
    // Call Ollama embeddings API
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: text
      })
    });

    const data = await response.json();
    return data.embedding; // Array of 384 floats
  }

  appendToJSONL(id, text, metadata, embedding) {
    const jsonlPath = path.join(
      path.dirname(this.dbPath),
      'memories.jsonl'
    );

    const entry = {
      id,
      timestamp: new Date().toISOString(),
      content: text,
      metadata,
      embedding: embedding.slice(0, 10) // First 10 dims for reference
    };

    fs.appendFileSync(
      jsonlPath,
      JSON.stringify(entry) + '\n',
      'utf8'
    );
  }

  generateRandomID() {
    return Math.random().toString(36).substring(2, 15);
  }

  async getStats() {
    const count = await this.collection.count();

    return {
      total_memories: count,
      collection_name: this.collectionName,
      embedding_model: this.embeddingModel,
      embedding_dimension: 384
    };
  }
}
```

**Memory Manager Principal:**

```javascript
const fs = require('fs');
const path = require('path');

class MemoryManager {
  constructor(config) {
    this.contextFile = config.context_file || 'E:/ANA/memory/current_context.txt';
    this.workingMemoryFile = config.working_memory_file || 'E:/ANA/memory/working_memory.json';

    this.chromaDB = new ChromaDBManager(config);
    this.context = '';
    this.workingMemory = {};
  }

  async initialize() {
    // Initialize ChromaDB
    await this.chromaDB.initialize();

    // Load context
    this.context = await this.loadContext();

    // Load working memory
    if (fs.existsSync(this.workingMemoryFile)) {
      this.workingMemory = JSON.parse(
        fs.readFileSync(this.workingMemoryFile, 'utf8')
      );
    }

    console.log('[Memory] Initialized');
    console.log(`  Context size: ${this.context.length} chars`);
    console.log(`  Working memory keys: ${Object.keys(this.workingMemory).length}`);
  }

  async loadContext() {
    if (!fs.existsSync(this.contextFile)) {
      // Create default context
      return this.createDefaultContext();
    }

    return fs.readFileSync(this.contextFile, 'utf8');
  }

  async saveContext(context = null) {
    const toSave = context || this.context;

    // Update timestamp
    const updated = toSave.replace(
      /Last Updated: .*/,
      `Last Updated: ${new Date().toISOString()}`
    );

    fs.writeFileSync(this.contextFile, updated, 'utf8');
    this.context = updated;
  }

  async appendContext(section, content) {
    // Find section and append
    const sectionRegex = new RegExp(`--- ${section} ---([\\s\\S]*?)(?=---|$)`);
    const match = this.context.match(sectionRegex);

    if (match) {
      const updated = this.context.replace(
        sectionRegex,
        `--- ${section} ---${match[1]}${content}\n`
      );
      await this.saveContext(updated);
    } else {
      // Section doesn't exist, create it
      this.context += `\n--- ${section} ---\n${content}\n`;
      await this.saveContext();
    }
  }

  async store(text, metadata = {}) {
    // Store in ChromaDB
    const memoryId = await this.chromaDB.store(text, metadata);

    // If high importance, also add to context
    if (metadata.importance >= 8) {
      await this.appendContext('KEY FACTS (Permanent)', `- ${text}`);
    }

    return memoryId;
  }

  async recall(query, n = 5) {
    return await this.chromaDB.recall(query, n);
  }

  // Working memory (runtime variables)
  setWorkingMemory(key, value) {
    this.workingMemory[key] = value;
    this.saveWorkingMemory();
  }

  getWorkingMemory(key) {
    return this.workingMemory[key];
  }

  saveWorkingMemory() {
    fs.writeFileSync(
      this.workingMemoryFile,
      JSON.stringify(this.workingMemory, null, 2),
      'utf8'
    );
  }

  clearWorkingMemory() {
    this.workingMemory = {};
    this.saveWorkingMemory();
  }

  createDefaultContext() {
    return `=== ANA CONTEXT ===
Last Updated: ${new Date().toISOString()}
Session ID: ${Date.now()}
System Version: 1.0.0

--- USER PROFILE ---
Name: Alain
Role: Master Engineer, Creator of Ana

--- CONVERSATION HISTORY (Last 20 messages) ---
[${new Date().toISOString()}] System: Ana initialized

--- CURRENT TASK ---
Task: None
Status: Ready

--- KEY FACTS (Permanent) ---
- Ana birth date: 2025-11-18
- Ana purpose: Autonomous, creative, evolving AI

--- RECENT DECISIONS ---
(No decisions yet)

--- ACTIVE METRICS ---
technical_skills: 0/10
creative_output: 0/10
autonomy_level: 0/10
days_alive: ${Math.floor((Date.now() - new Date('2025-11-18').getTime()) / (24*60*60*1000))}

--- NEXT ACTIONS ---
(To be defined)
`;
  }

  async getStats() {
    const chromaStats = await this.chromaDB.getStats();

    return {
      context_size: this.context.length,
      context_lines: this.context.split('\n').length,
      working_memory_keys: Object.keys(this.workingMemory).length,
      ...chromaStats
    };
  }
}

module.exports = MemoryManager;
```

**Critères d'Acceptation:**

- [ ] loadContext() < 500ms
- [ ] saveContext() < 200ms
- [ ] recall() < 1s (semantic search)
- [ ] Recall accuracy >= 90% (test avec 100 queries)
- [ ] Pas de perte données entre sessions (test restart)
- [ ] Context persist parfaitement après crash
- [ ] Working memory synchronized avec fichier JSON

**Tests:**

```javascript
describe('MemoryManager', () => {
  let memory;

  beforeEach(async () => {
    memory = new MemoryManager(testConfig);
    await memory.initialize();
  });

  test('loadContext() charge en < 500ms', async () => {
    const start = Date.now();
    const context = await memory.loadContext();
    const duration = Date.now() - start;

    expect(context).toContain('=== ANA CONTEXT ===');
    expect(duration).toBeLessThan(500);
  });

  test('store() et recall() fonctionnent end-to-end', async () => {
    const testText = 'Ana is being built by Alain, a master engineer';

    const memId = await memory.store(testText, {
      importance: 10,
      category: 'user_profile'
    });

    expect(memId).toBeTruthy();

    // Recall
    const results = await memory.recall('Who is building Ana?', 1);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('Alain');
    expect(results[0].similarity).toBeGreaterThan(0.7);
  });

  test('working memory persist entre appels', async () => {
    memory.setWorkingMemory('current_task', 'Build Multi-LLM Router');

    // Simulate restart
    const memory2 = new MemoryManager(testConfig);
    await memory2.initialize();

    const task = memory2.getWorkingMemory('current_task');
    expect(task).toBe('Build Multi-LLM Router');
  });

  test('high importance memories ajoutées à context', async () => {
    await memory.store('Critical fact: Ana values rigor 10/10', {
      importance: 10
    });

    const context = memory.context;
    expect(context).toContain('Critical fact: Ana values rigor 10/10');
  });
});
```

---

**[Document continue avec 8 autres sections similaires: Agents, Tools, APIs, Tests, etc.]**

**Total pages estimé:** 100+ pages de spécifications techniques précises

---

**Créé:** 22 Novembre 2025
**Par:** Équipe Ana Engineering
**Pour:** Construction Ana (Spécifications Opérationnelles)
**Version:** 2.0.0
**Status:** EN COURS DE RÉDACTION - Sections 1-3 complètes

NOTE: Ce document sera complété avec toutes les sections restantes avec le même niveau de détail technique.