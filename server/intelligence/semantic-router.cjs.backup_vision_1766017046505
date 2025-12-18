/**
 * ANA SEMANTIC ROUTER - Intelligent Task Classification
 *
 * Replaces keyword-based routing with semantic analysis
 * Uses embeddings to classify tasks and route to optimal LLM
 *
 * Best Practices 2025:
 * - Source: https://github.com/lm-sys/RouteLLM
 * - Source: https://blog.langchain.dev/semantic-routing/
 *
 * FIX 2025-12-17: Amélioration détection CODING vs TOOLS
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OLLAMA_URL = 'http://localhost:11434';
const CACHE_PATH = path.join('E:', 'ANA', 'knowledge', 'learned', 'router_cache.json');

// Task type definitions with semantic descriptions
// Provider: 'ollama' (local), 'groq' (cloud fast), 'cerebras' (cloud ultra-fast)
const TASK_TYPES = {
  CODING: {
    name: 'coding',
    description: 'Writing code, programming, fixing bugs, debugging, creating functions, classes, implementing features, React components, JavaScript, Python, algorithms, refactoring, API development',
    examples: [
      'Write a function to sort an array',
      'Fix this bug in my code',
      'Create a class for user authentication',
      'Debug this error',
      'Implement a REST API endpoint',
      'Crée un composant React',
      'Écris une fonction JavaScript',
      'Analyse ce code',
      'Refactorise cette classe',
      'Corrige ce bug',
      'Implémente un algorithme',
      'Ajoute une méthode à la classe',
      'Crée une API REST',
      'Optimise cette fonction',
      'Génère du code Python'
    ],
    preferredModel: 'deepseek-coder-v2:16b-lite-instruct-q4_K_M',
    fallbackModel: 'qwen2.5-coder:7b',
    provider: 'ollama'
  },
  MATH: {
    name: 'math',
    description: 'Mathematical calculations, equations, statistics, numerical analysis, data processing',
    examples: [
      'Calculate the derivative of x^2',
      'Solve this equation',
      'What is 15% of 340',
      'Compute the standard deviation',
      'Parse this numerical data'
    ],
    preferredModel: 'llama-3.3-70b',
    fallbackModel: 'llama-3.3-70b',
    provider: 'cerebras'
  },
  VISION: {
    name: 'vision',
    description: 'Image analysis, visual content, pictures, photos, screenshots, diagrams',
    examples: [
      'What do you see in this image',
      'Analyze this screenshot',
      'Describe this photo',
      'Read the text in this picture',
      'What is shown in this diagram'
    ],
    preferredModel: 'llama3.2-vision:11b',
    fallbackModel: 'phi3:mini-128k',
    provider: 'ollama'
  },
  REASONING: {
    name: 'reasoning',
    description: 'Complex reasoning, analysis, planning, strategy, explaining concepts, research',
    examples: [
      'Explain how neural networks work',
      'Plan a migration strategy',
      'Analyze these requirements',
      'Compare these approaches',
      'What are the pros and cons'
    ],
    preferredModel: 'llama-3.3-70b',
    fallbackModel: 'llama-3.3-70b',
    provider: 'cerebras'
  },
  CONVERSATION: {
    name: 'conversation',
    description: 'General chat, greetings, questions, simple requests, help, information, French conversation',
    examples: [
      'Bonjour comment vas-tu',
      'Salut Ana',
      'Comment tu t appelles',
      'Parle-moi de toi',
      'Merci beaucoup',
      'Tu peux m aider',
      'Hello how are you',
      'Tell me about yourself'
    ],
    preferredModel: 'llama-3.3-70b',
    fallbackModel: 'llama-3.3-70b',
    provider: 'cerebras'
  },
  CREATIVE: {
    name: 'creative',
    description: 'Writing, storytelling, creative content, poetry, brainstorming ideas',
    examples: [
      'Write a poem about nature',
      'Generate creative ideas for',
      'Help me brainstorm',
      'Create a story about',
      'Suggest names for my project'
    ],
    preferredModel: 'llama-3.3-70b',
    fallbackModel: 'llama-3.3-70b',
    provider: 'cerebras'
  },
  TOOLS: {
    name: 'tools',
    description: 'Outils externes: heure, meteo, fichiers, shell, web, Wikipedia, Groq, Cerebras, agents',
    examples: [
      'cherche sur le web',
      'Quelle est la meteo',
      'meteo a Longueuil',
      'Quelle heure est-il',
      'Il est quelle heure',
      'Lis le fichier',
      'Cree un fichier',
      'Quels fichiers y a-t-il',
      'Liste les fichiers dans',
      'Execute la commande',
      'Recupere le contenu de https',
      'Cherche sur Wikipedia',
      'Demande a Groq',
      'Demande a Cerebras',
      'cherche dans ta memoire',
      'Tu te rappelles quand',
      'Modifie le fichier',
      'Trouve tous les fichiers',
      'Cherche Bonjour dans',
      'Pose-moi une question',
      'Lance en arriere-plan',
      'Arrete le processus',
      'Ajoute une tache',
      'Modifie le notebook',
      'Entre en mode planification',
      'Lance un agent',
      'Quel est l usage du CPU',
      'usage CPU',
      'utilisation du processeur',
      'Quelle est la memoire RAM utilisee',
      'combien de RAM',
      'memoire utilisee',
      'espace disque',
      'combien de place sur le disque',
      'fais un ping vers',
      'ping google',
      'infos systeme',
      'calcule',
      'genere un mot de passe',
      'hash du fichier',
      'convertis en miles'
    ],
    preferredModel: 'qwen2.5-coder:7b',
    fallbackModel: 'qwen2.5-coder:7b',
    provider: 'ollama',
    method: 'tools'
  },
  MEMORY: {
    name: 'memory',
    description: 'Questions about past conversations, memory, personal information, what was said before, remembering things',
    examples: [
      'Quelle est ma voiture',
      'Tu te souviens de ma voiture',
      'Qu est-ce que je t ai dit',
      'Rappelle-toi notre conversation',
      'Regarde dans ta memoire',
      'Tu te rappelles',
      'Je t avais dit que',
      'Ma voiture c est quoi',
      'Quelle est la marque de ma voiture',
      'Tu as deja cette information',
      'On en a parle avant',
      'Precedemment je t ai dit'
    ],
    preferredModel: 'llama-3.3-70b',
    fallbackModel: 'llama-3.3-70b',
    provider: 'cerebras'
  }
};

// FIX 2025-12-17: Keywords pour détecter CODING avec priorité sur TOOLS
const CODING_KEYWORDS = [
  // Langages et frameworks
  'react', 'javascript', 'python', 'typescript', 'java', 'nodejs', 'node.js',
  'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'express', 'django', 'flask',
  // Termes de code FR
  'composant', 'component', 'fonction', 'function', 'classe', 'class',
  'méthode', 'method', 'variable', 'algorithme', 'algorithm',
  'boucle', 'loop', 'condition', 'if else', 'switch', 'array', 'tableau',
  'objet', 'object', 'interface', 'type', 'enum',
  // Actions de code
  'refactoriser', 'refactorise', 'refactor', 'optimiser', 'optimize',
  'débugger', 'debug', 'debugger', 'corriger le bug', 'fix bug',
  'implémenter', 'implement', 'implémente',
  'coder', 'programmer', 'développer',
  // Termes API/Backend
  'api rest', 'endpoint', 'backend', 'frontend', 'fullstack',
  'route', 'controller', 'middleware', 'service',
  'base de données', 'database', 'query', 'requête sql',
  // Code patterns
  '.jsx', '.tsx', '.js', '.ts', '.py', '.java', '.cpp', '.cs',
  'import ', 'export ', 'const ', 'let ', 'var ', 'def ', 'async ', 'await '
];

class SemanticRouter {
  constructor() {
    this.embedCache = new Map();
    this.taskTypeEmbeddings = null;
    this.initialized = false;
    this.stats = {
      totalRoutes: 0,
      byTaskType: {},
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  async initialize() {
    try {
      console.log('[SemanticRouter] Initializing...');
      await this.precomputeTaskTypeEmbeddings();
      await this.loadCache();
      this.initialized = true;
      console.log('[SemanticRouter] Ready with', Object.keys(TASK_TYPES).length, 'task types');
      return { success: true };
    } catch (error) {
      console.error('[SemanticRouter] Init error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getEmbedding(text) {
    try {
      const cacheKey = this.hashText(text.substring(0, 200));
      if (this.embedCache.has(cacheKey)) {
        this.stats.cacheHits++;
        return this.embedCache.get(cacheKey);
      }
      this.stats.cacheMisses++;
      const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
        model: 'nomic-embed-text',
        prompt: text
      }, { timeout: 10000 });
      const embedding = response.data.embedding;
      this.embedCache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      try {
        const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
          model: 'mxbai-embed-large',
          prompt: text
        }, { timeout: 10000 });
        return response.data.embedding;
      } catch (fallbackError) {
        console.error('[SemanticRouter] Embedding error:', error.message);
        return null;
      }
    }
  }

  async precomputeTaskTypeEmbeddings() {
    this.taskTypeEmbeddings = {};
    for (const [key, taskType] of Object.entries(TASK_TYPES)) {
      const fullText = `${taskType.description}. Examples: ${taskType.examples.join('. ')}`;
      const embedding = await this.getEmbedding(fullText);
      if (embedding) {
        this.taskTypeEmbeddings[key] = {
          ...taskType,
          embedding: embedding
        };
      }
    }
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async route(message, context = {}) {
    this.stats.totalRoutes++;
    if (context.hasImage || context.images?.length > 0) {
      this.updateStats('VISION');
      return {
        model: TASK_TYPES.VISION.preferredModel,
        taskType: 'vision',
        reason: 'Image detected in context',
        confidence: 1.0,
        method: 'context_override'
      };
    }

    const msgLower = message.toLowerCase();

    // FIX 2025-12-17: Check CODING FIRST (before TOOLS)
    // "Crée un composant React" = CODING, pas TOOLS
    if (CODING_KEYWORDS.some(kw => msgLower.includes(kw))) {
      this.updateStats('CODING');
      console.log('[SemanticRouter] 🔧 CODING detected via keyword');
      return {
        model: TASK_TYPES.CODING.preferredModel,
        taskType: 'coding',
        reason: 'Priority keyword match: coding task',
        confidence: 0.95,
        method: 'keyword_priority',
        provider: TASK_TYPES.CODING.provider,
        fallbackModel: TASK_TYPES.CODING.fallbackModel
      };
    }

    // TOOLS keywords (after CODING check)
    const toolsKeywords = [
      'heure', 'quelle heure', 'meteo', 'météo', 'temps qu', 'temps fait', 'température', 'weather',
      'whois', 'dns', 'dns lookup', 'ip publique', 'public ip', 'check_url', 'http_request', 'web_fetch',
      'fichier', 'lis le', 'lire', 'ouvre', 'liste les', 'lister', 'quels fichiers', 'trouve les fichiers',
      'execute', 'exécute', 'commande', 'shell', 'dir ', 'ls ',
      'cherche sur', 'recherche web', 'récupère', 'recupere', 'contenu de http',
      'wikipedia', 'groq', 'cerebras', 'demande à', 'demande a',
      'mémoire ana', 'memoire ana', 'rappelles', 'souviens', 'rappelle-toi',
      'modifie le fichier', 'modifier le fichier', 'glob', 'grep', 'pose-moi', 'processus', 'pid',
      'tâche', 'tache', 'notebook', 'planification',
      'arrête le', 'lance ', 'ajoute une tâche', 'en arrière-plan',
      'cpu', 'ram', 'disque', 'disk', 'ping ', 'infos systeme',
      'mot de passe', 'password', 'hash', 'convertis en'
    ];
    if (toolsKeywords.some(kw => msgLower.includes(kw))) {
      this.updateStats('TOOLS');
      return {
        model: TASK_TYPES.TOOLS.preferredModel,
        taskType: 'tools',
        reason: 'Priority keyword match: tools task',
        confidence: 0.95,
        method: 'tools',
        provider: TASK_TYPES.TOOLS.provider,
        fallbackModel: TASK_TYPES.TOOLS.fallbackModel
      };
    }

    const messageEmbedding = await this.getEmbedding(message);
    if (!messageEmbedding || !this.taskTypeEmbeddings) {
      return this.fallbackRoute(message);
    }
    const similarities = [];
    for (const [key, taskType] of Object.entries(this.taskTypeEmbeddings)) {
      const similarity = this.cosineSimilarity(messageEmbedding, taskType.embedding);
      similarities.push({ key, taskType, similarity });
    }
    similarities.sort((a, b) => b.similarity - a.similarity);
    const best = similarities[0];
    this.updateStats(best.key);
    return {
      model: best.taskType.preferredModel,
      taskType: best.taskType.name,
      reason: `Semantic match: ${best.taskType.description.substring(0, 50)}...`,
      confidence: best.similarity,
      method: best.taskType.method || 'semantic',
      provider: best.taskType.provider || 'ollama',
      fallbackModel: best.taskType.fallbackModel,
      alternatives: similarities.slice(1, 3).map(s => ({
        taskType: s.taskType.name,
        model: s.taskType.preferredModel,
        provider: s.taskType.provider || 'ollama',
        confidence: s.similarity
      }))
    };
  }

  fallbackRoute(message) {
    const msgLower = message.toLowerCase();

    // CODING keywords (French + English)
    if (CODING_KEYWORDS.some(kw => msgLower.includes(kw))) {
      this.updateStats('CODING');
      return {
        model: TASK_TYPES.CODING.preferredModel,
        taskType: 'coding',
        reason: 'Keyword match: coding task',
        confidence: 0.8,
        method: 'keyword_fallback',
        provider: TASK_TYPES.CODING.provider,
        fallbackModel: TASK_TYPES.CODING.fallbackModel
      };
    }

    // TOOLS keywords
    const toolsKeywords = [
      'heure', 'quelle heure', 'meteo', 'météo', 'temps qu',
      'fichier', 'lis le', 'lire', 'ouvre', 'liste les', 'lister', 'quels fichiers', 'trouve', 'trouver',
      'execute', 'exécute', 'commande', 'shell', 'dir ',
      'cherche sur', 'recherche', 'récupère', 'recupere', 'contenu de', 'web',
      'wikipedia', 'groq', 'cerebras', 'demande à', 'demande a',
      'mémoire', 'memoire', 'rappelles', 'souviens',
      'modifie', 'modifier', 'glob', 'grep', 'pose-moi', 'processus', 'pid', 'tâche', 'tache', 'notebook', 'planification'
    ];
    if (toolsKeywords.some(kw => msgLower.includes(kw))) {
      this.updateStats('TOOLS');
      return {
        model: TASK_TYPES.TOOLS.preferredModel,
        taskType: 'tools',
        reason: 'Keyword match: tools task',
        confidence: 0.8,
        method: 'tools',
        provider: TASK_TYPES.TOOLS.provider,
        fallbackModel: TASK_TYPES.TOOLS.fallbackModel
      };
    }

    const mathKeywords = ['calcul', 'math', 'equation', 'nombre', 'statistique', 'formule', '%', '+', '-', '*', '/'];
    if (mathKeywords.some(kw => msgLower.includes(kw)) || /\d+[\+\-\*\/]\d+/.test(message)) {
      this.updateStats('MATH');
      return {
        model: TASK_TYPES.MATH.preferredModel,
        taskType: 'math',
        reason: 'Keyword match: math task',
        confidence: 0.7,
        method: 'keyword_fallback',
        provider: TASK_TYPES.MATH.provider,
        fallbackModel: TASK_TYPES.MATH.fallbackModel
      };
    }
    const creativeKeywords = ['ecris une histoire', 'poeme', 'creatif', 'idee', 'brainstorm', 'invente'];
    if (creativeKeywords.some(kw => msgLower.includes(kw))) {
      this.updateStats('CREATIVE');
      return {
        model: TASK_TYPES.CREATIVE.preferredModel,
        taskType: 'creative',
        reason: 'Keyword match: creative task',
        confidence: 0.7,
        method: 'keyword_fallback',
        provider: TASK_TYPES.CREATIVE.provider,
        fallbackModel: TASK_TYPES.CREATIVE.fallbackModel
      };
    }
    this.updateStats('CONVERSATION');
    return {
      model: TASK_TYPES.CONVERSATION.preferredModel,
      taskType: 'conversation',
      reason: 'Default: general conversation',
      confidence: 0.5,
      method: 'default',
      provider: TASK_TYPES.CONVERSATION.provider,
      fallbackModel: TASK_TYPES.CONVERSATION.fallbackModel
    };
  }

  updateStats(taskType) {
    if (!this.stats.byTaskType[taskType]) {
      this.stats.byTaskType[taskType] = 0;
    }
    this.stats.byTaskType[taskType]++;
  }

  hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  async loadCache() {
    try {
      if (fs.existsSync(CACHE_PATH)) {
        const data = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
        if (data.embedCache) {
          this.embedCache = new Map(Object.entries(data.embedCache));
        }
        if (data.stats) {
          this.stats = { ...this.stats, ...data.stats };
        }
        console.log('[SemanticRouter] Loaded cache with', this.embedCache.size, 'entries');
      }
    } catch (error) {
      console.log('[SemanticRouter] Cache load skipped:', error.message);
    }
  }

  async saveCache() {
    try {
      const dir = path.dirname(CACHE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const cacheObj = {};
      this.embedCache.forEach((value, key) => {
        cacheObj[key] = value;
      });
      fs.writeFileSync(CACHE_PATH, JSON.stringify({
        embedCache: cacheObj,
        stats: this.stats,
        savedAt: new Date().toISOString()
      }, null, 2), 'utf-8');
    } catch (error) {
      console.error('[SemanticRouter] Cache save error:', error.message);
    }
  }

  getStats() {
    return {
      initialized: this.initialized,
      ...this.stats,
      cacheSize: this.embedCache.size,
      taskTypes: Object.keys(TASK_TYPES).length
    };
  }

  getTaskTypes() {
    return Object.entries(TASK_TYPES).map(([key, value]) => ({
      key,
      name: value.name,
      description: value.description,
      preferredModel: value.preferredModel
    }));
  }
}

module.exports = new SemanticRouter();
