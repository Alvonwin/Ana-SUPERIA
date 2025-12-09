/**
 * ANA CORE - Backend Orchestrator
 *
 * SUPERIA ANA - Super IA Locale
 * Multi-LLM Router + Memory Integration + Real-time WebSocket
 *
 * Port: 3338
 * Date: 2025-11-21
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');
const vm = require('vm'); // For sandboxed code execution (Fix #3)
const { spawn } = require('child_process'); // For Python/TypeScript execution
const esbuild = require('esbuild'); // Fast TS→JS transpilation (Best Practice 2025)

// Ana Tools
const FileTools = require('./tools/file-tools.cjs');
const BashTools = require('./tools/bash-tools.cjs');
const SearchTools = require('./tools/search-tools.cjs');
const GitTools = require('./tools/git-tools.cjs');
const WebTools = require('./tools/web-tools.cjs');
const Security = require('./middleware/security.cjs');

// Ana Services
const AnaAutonomous = require('./services/ana-autonomous.cjs');
const ServiceManager = require('./services/service-manager.cjs');
const memoryCapture = require('./services/memory-capture.cjs');
const memoryCaptureV2 = require('./services/ana-memory-capture-v2.cjs'); // V2: Dedicated Ana memory
const dailyArtGenerator = require('./services/daily-art-generator.cjs');
const researchAgent = require('./agents/research-agent.cjs');
const CodingAgent = require('./agents/coding-agent.cjs');
const toolAgent = require('./agents/tool-agent.cjs');
const memoryManager = require('./memory/memory-manager.cjs');
const vramManager = require('./services/vram-manager.cjs');
const orchestrator = require('../intelligence/orchestrator.cjs');
const n8nIntegration = require('./services/n8n-integration.cjs');
const spellChecker = require('./utils/spell-checker.cjs');
const groqService = require('./services/groq-service.cjs');
const cerebrasService = require('./services/cerebras-service.cjs');
const skillLearner = require('./intelligence/skill-learner.cjs');
const semanticRouter = require('./intelligence/semantic-router.cjs');
const contextSelector = require('./intelligence/context-selector.cjs');
const tieredMemory = require('./memory/tiered-memory.cjs');
const langchainWebSearch = require('./services/langchain-web-search.cjs');

// ================== CONFIGURATION ==================
const PORT = process.env.PORT || 3338;
const OLLAMA_URL = 'http://localhost:11434';
const MEMORY_PATH = 'E:\\Mémoire Claude';

// LLM Models Configuration
const LLMS = {
  PHI3: 'phi3:mini-128k',              // Conversation & Raisonnement
  DEEPSEEK: 'deepseek-coder-v2:16b-lite-instruct-q4_K_M', // Coding Champion
  QWEN: 'qwen2.5-coder:7b',             // Math & Backup Coding
  LLAMA_VISION: 'llama3.2-vision:11b'   // Images & Vision
};

// System Prompt Configuration
const SYSTEM_PROMPT_PATH = path.join(__dirname, 'config', 'system-prompt.json');
const DEFAULT_SYSTEM_PROMPT = "Tu es Ana, une IA locale française. Réponds TOUJOURS en français correct, sans fautes d'orthographe. Ne jamais inventer de mots. Utilise uniquement des mots français existants. Sois précise et technique.";

// ================== LOGGING SYSTEM (Fix #2 - 30-Nov-2025) ==================
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ana-core.log');

// Créer le dossier logs s'il n'existe pas
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Fonction de logging JSONL
function writeLog(entry) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    ...entry,
  }) + '\n';

  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) {
      // Ne jamais casser l'app pour un problème de log
      console.error('LOG WRITE ERROR:', err.message);
    }
  });
}

// ================== SETTINGS SYSTEM (Fix #6 - 30-Nov-2025) ==================
const SETTINGS_PATH = path.join(__dirname, 'config', 'ana-settings.json');

const DEFAULT_SETTINGS = {
  theme: 'dark',
  ttsEnabled: true,
  ttsVoice: '',
  defaultLLM: 'auto',
  notifications: true,
  autoScroll: true,
  streamingEnabled: true
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      return JSON.parse(raw);
    }
    return DEFAULT_SETTINGS;
  } catch (err) {
    console.error('Failed to read settings:', err.message);
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(nextSettings) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(nextSettings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save settings:', err.message);
    return false;
  }
}

// ================== VOICE HISTORY SYSTEM (Fix #5 - 30-Nov-2025) ==================
const VOICE_HISTORY_PATH = path.join(__dirname, 'data', 'voice-history.json');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadVoiceHistory() {
  try {
    if (fs.existsSync(VOICE_HISTORY_PATH)) {
      return JSON.parse(fs.readFileSync(VOICE_HISTORY_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load voice history:', err.message);
  }
  return [];
}

function saveVoiceHistory(history) {
  try {
    fs.writeFileSync(VOICE_HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save voice history:', err.message);
    return false;
  }
}

function addVoiceEntry(entry) {
  const history = loadVoiceHistory();
  const newEntry = {
    id: 'voice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    text: entry.text || '',
    conversationId: entry.conversationId || null,
    llm: entry.llm || 'unknown',
    durationSec: typeof entry.durationSec === 'number' ? entry.durationSec : null,
    meta: entry.meta || {}
  };

  // Add at beginning (newest first)
  history.unshift(newEntry);

  // Keep max 1000 entries
  if (history.length > 1000) {
    history.length = 1000;
  }

  saveVoiceHistory(history);
  return newEntry;
}

// Load system prompt from file
function loadSystemPrompt() {
  try {
    if (fs.existsSync(SYSTEM_PROMPT_PATH)) {
      const data = JSON.parse(fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8'));
      return data.prompt || DEFAULT_SYSTEM_PROMPT;
    }
  } catch (error) {
    console.error('Error loading system prompt:', error.message);
  }
  return DEFAULT_SYSTEM_PROMPT;
}

// Save system prompt to file
function saveSystemPrompt(prompt) {
  try {
    const dir = path.dirname(SYSTEM_PROMPT_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SYSTEM_PROMPT_PATH, JSON.stringify({
      prompt: prompt,
      lastModified: new Date().toISOString()
    }, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving system prompt:', error.message);
    return false;
  }
}

// Current system prompt (loaded at startup)
let currentSystemPrompt = loadSystemPrompt();

// ================== EXPRESS SETUP ==================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"], // Vite dev server
    methods: ["GET", "POST"],
    credentials: true
  },
  // Fix: Augmenter timeouts pour éviter déconnexions intempestives
  pingInterval: 60000,  // 60s entre chaque ping
  pingTimeout: 60000    // 60s avant timeout si pas de réponse
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ================== HTTP LOGGING MIDDLEWARE (Fix #2) ==================
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    // Exclure les endpoints de santé pour ne pas polluer les logs
    if (req.originalUrl !== '/health' && req.originalUrl !== '/api/health') {
      writeLog({
        type: 'http',
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    }
  });

  next();
});

// ================== N8N PROXY ==================
// Proxy pour contourner CORS - forward vers n8n avec auth
// Note: n8n utilise X-N8N-API-KEY pour l'API REST (pas Bearer)
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MGQ3OWJmMS05Y2M5LTQ3NGEtODVkNi05MjU2ODcxNGNjZTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY0NDA0NDcwfQ.VhN8Ihlp5KZ8VT03TJcVwC5ITCCIgaC7Jr1vBod0R2U';

app.use('/api/n8n', createProxyMiddleware({
  target: 'http://localhost:5678',
  changeOrigin: true,
  pathRewrite: { '^/api/n8n': '' },
  onProxyReq: (proxyReq, req, res) => {
    // n8n accepte X-N8N-API-KEY ou Authorization Bearer
    proxyReq.setHeader('X-N8N-API-KEY', N8N_API_KEY);
    proxyReq.setHeader('Content-Type', 'application/json');
    console.log('[n8n Proxy] →', req.method, req.url);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('[n8n Proxy] ←', proxyRes.statusCode, req.url);
  },
  onError: (err, req, res) => {
    console.error('[n8n Proxy] ❌ Error:', err.message);
    res.status(500).json({ error: 'n8n proxy failed', message: err.message });
  }
}));
console.log('✅ n8n Proxy configured: /api/n8n → localhost:5678');

// ================== MULTI-LLM ROUTER ==================
class IntelligenceRouter {
  constructor() {
    this.activeModel = null;
    this.stats = {
      phi3: 0,
      deepseek: 0,
      qwen: 0,
      llama_vision: 0
    };
  }

  /**
   * Classify task and choose best LLM
   */
  classifyTask(message, context = {}) {
    const msgLower = message.toLowerCase();

    // Vision tasks - Llama Vision
    if (context.hasImage || msgLower.includes('image') || msgLower.includes('photo')) {
      return { model: LLMS.LLAMA_VISION, reason: 'Tâche visuelle détectée' };
    }

    // Coding tasks - DeepSeek Coder
    const codingKeywords = ['code', 'function', 'bug', 'debug', 'refactor', 'class', 'variable', 'error', 'fix'];
    if (codingKeywords.some(kw => msgLower.includes(kw))) {
      return { model: LLMS.DEEPSEEK, reason: 'Tâche de coding détectée' };
    }

    // Math tasks - Qwen
    const mathKeywords = ['calculer', 'calculate', 'math', 'équation', 'nombre'];
    if (mathKeywords.some(kw => msgLower.includes(kw)) || /\d+[\+\-\*\/]\d+/.test(message)) {
      return { model: LLMS.QWEN, reason: 'Tâche mathématique détectée' };
    }

    // Default - Qwen (conversation) - phi3 ne respecte pas le français
    return { model: LLMS.QWEN, reason: 'Conversation générale' };
  }

  /**
   * Send request to Ollama
   */
  async query(model, prompt, streaming = false) {
    try {
      const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: model,
        prompt: prompt,
        system: currentSystemPrompt,  // CRITIQUE: Injecter le system prompt!
        stream: streaming
      }, {
        responseType: streaming ? 'stream' : 'json'
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Error querying ${model}:`, error.message);
      throw error;
    }
  }

  updateStats(model) {
    const modelKey = Object.keys(LLMS).find(key => LLMS[key] === model);
    if (modelKey) {
      const statsKey = modelKey.toLowerCase().replace('_', '_');
      if (this.stats[statsKey] !== undefined) {
        this.stats[statsKey]++;
      }
    }
  }
}

const router = new IntelligenceRouter();

// ================== MEMORY MANAGER ==================
class MemoryManager {
  constructor() {
    this.contextPath = path.join(MEMORY_PATH, 'current_conversation.txt');
    this.currentContext = '';
    this.loadContext();
  }

  loadContext() {
    try {
      if (fs.existsSync(this.contextPath)) {
        this.currentContext = fs.readFileSync(this.contextPath, 'utf8');
        console.log(`📚 Contexte mémoire chargé: ${(this.currentContext.length / 1024).toFixed(2)} KB`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement mémoire:', error.message);
    }
  }

  getContext() {
    return this.currentContext;
  }

  appendToContext(text) {
    this.currentContext += '\n' + text;
    // Auto-save every append
    this.saveContext();
  }

  saveContext() {
    try {
      fs.writeFileSync(this.contextPath, this.currentContext, 'utf8');
    } catch (error) {
      console.error('❌ Erreur sauvegarde mémoire:', error.message);
    }
  }

  getStats() {
    return {
      size: this.currentContext.length,
      sizeKB: (this.currentContext.length / 1024).toFixed(2),
      lines: this.currentContext.split('\n').length
    };
  }
}

const memory = new MemoryManager();

// ================== API ROUTES ==================

// ================== LOGS API (Fix #2 - 30-Nov-2025) ==================
app.get('/api/logs', (req, res) => {
  const limit = Number(req.query.limit) || 200;

  fs.readFile(LOG_FILE, 'utf8', (err, data) => {
    if (err) {
      // Si le fichier n'existe pas encore, retourner un tableau vide
      if (err.code === 'ENOENT') {
        return res.json({ items: [], message: 'No logs yet' });
      }
      return res.status(500).json({ error: 'Cannot read logs', message: err.message });
    }

    const lines = data.trim().split('\n').slice(-limit);
    const items = lines
      .map((line) => {
        try { return JSON.parse(line); }
        catch { return null; }
      })
      .filter(Boolean);

    res.json({
      items,
      total: items.length,
      limit,
      logFile: LOG_FILE
    });
  });
});

// ================== SETTINGS API (Fix #6 - 30-Nov-2025) ==================
// GET - Lire les settings
app.get('/api/settings', (req, res) => {
  const settings = loadSettings();
  res.json(settings);
});

// PUT - Mettre à jour les settings (avec validation)
app.put('/api/settings', (req, res) => {
  const current = loadSettings();
  const incoming = req.body || {};

  // Fusion avec validation des types
  const merged = {
    theme: incoming.theme === 'light' || incoming.theme === 'dark'
      ? incoming.theme
      : current.theme,

    ttsEnabled: typeof incoming.ttsEnabled === 'boolean'
      ? incoming.ttsEnabled
      : current.ttsEnabled,

    ttsVoice: typeof incoming.ttsVoice === 'string'
      ? incoming.ttsVoice
      : current.ttsVoice,

    defaultLLM: typeof incoming.defaultLLM === 'string'
      ? incoming.defaultLLM
      : current.defaultLLM,

    notifications: typeof incoming.notifications === 'boolean'
      ? incoming.notifications
      : current.notifications,

    autoScroll: typeof incoming.autoScroll === 'boolean'
      ? incoming.autoScroll
      : current.autoScroll,

    streamingEnabled: typeof incoming.streamingEnabled === 'boolean'
      ? incoming.streamingEnabled
      : current.streamingEnabled
  };

  if (saveSettings(merged)) {
    res.json(merged);
  } else {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ================== VOICE HISTORY API (Fix #5 - 30-Nov-2025) ==================
// GET - Récupérer l'historique vocal
app.get('/api/voice/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    let history = loadVoiceHistory();

    // Filtrage par date si spécifié
    if (from || to) {
      history = history.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        if (from && entryDate < from) return false;
        if (to && entryDate > to) return false;
        return true;
      });
    }

    // Limiter le nombre de résultats
    const items = history.slice(0, limit);

    res.json({
      success: true,
      items,
      count: items.length,
      total: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST - Ajouter une entrée vocale
app.post('/api/voice/history', (req, res) => {
  try {
    const { text, conversationId, llm, durationSec, meta } = req.body;

    // Validation: text requis et non vide
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Le champ "text" est requis et doit être une chaîne non vide'
      });
    }

    const newEntry = addVoiceEntry({
      text: text.trim(),
      conversationId,
      llm,
      durationSec,
      meta
    });

    res.status(201).json({
      success: true,
      entry: newEntry,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ================== CODE EXECUTE API (Fix #3 - 30-Nov-2025) ==================
// Sandboxed JavaScript execution with timeout
// Design: Perplexity - Phase 1 (JS only, vm sandbox, 3s timeout)

const CODE_EXEC_TIMEOUT = 3000; // 3 seconds max
const CODE_MAX_LENGTH = 50000;  // 50KB max

/**
 * Execute user code in a sandboxed VM context
 * @param {string} code - JavaScript code to execute
 * @returns {Promise<{success: boolean, output: string, error?: string, duration: number}>}
 */
async function runUserCode(code) {
  const startTime = Date.now();
  const logs = [];

  // Create sandbox with limited console
  const sandbox = {
    console: {
      log: (...args) => logs.push(args.map(a =>
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' ')),
      error: (...args) => logs.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
      warn: (...args) => logs.push('[WARN] ' + args.map(a => String(a)).join(' ')),
      info: (...args) => logs.push('[INFO] ' + args.map(a => String(a)).join(' '))
    },
    // Safe built-ins only
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Promise,
    setTimeout: undefined,  // Disabled for security
    setInterval: undefined, // Disabled for security
    fetch: undefined,       // Disabled for security
    require: undefined,     // Disabled for security
    process: undefined,     // Disabled for security
    __dirname: undefined,   // Disabled for security
    __filename: undefined   // Disabled for security
  };

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        success: false,
        output: logs.join('\n'),
        error: 'Timeout: exécution interrompue après 3 secondes',
        duration: Date.now() - startTime
      });
    }, CODE_EXEC_TIMEOUT);

    try {
      // Create VM context
      const context = vm.createContext(sandbox);

      // Run code with timeout
      const script = new vm.Script(code, { filename: 'user-code.js' });
      const result = script.runInContext(context, { timeout: CODE_EXEC_TIMEOUT });

      clearTimeout(timeout);

      // If code returns a value, add it to output
      if (result !== undefined) {
        logs.push('=> ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)));
      }

      resolve({
        success: true,
        output: logs.join('\n') || '(aucune sortie)',
        duration: Date.now() - startTime
      });
    } catch (err) {
      clearTimeout(timeout);
      resolve({
        success: false,
        output: logs.join('\n'),
        error: err.message || 'Erreur inconnue',
        duration: Date.now() - startTime
      });
    }
  });
}

/**
 * Execute Python code using child_process
 * Source: https://stackoverflow.com/questions/34213845/call-python-script-using-node-js-child-process
 * @param {string} code - Python code to execute
 * @returns {Promise<{success: boolean, output: string, error?: string, duration: number}>}
 */
async function runPythonCode(code) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const tempFile = path.join(__dirname, 'temp', `python_${Date.now()}.py`);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write code to temp file
    fs.writeFileSync(tempFile, code, 'utf8');

    let stdout = '';
    let stderr = '';

    // Spawn Python process
    const pythonProcess = spawn('python', [tempFile], {
      timeout: CODE_EXEC_TIMEOUT,
      windowsHide: true
    });

    // Timeout handling
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      cleanup();
      resolve({
        success: false,
        output: stdout,
        error: 'Timeout: exécution interrompue après 3 secondes',
        duration: Date.now() - startTime
      });
    }, CODE_EXEC_TIMEOUT);

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (exitCode) => {
      clearTimeout(timeout);
      cleanup();

      resolve({
        success: exitCode === 0,
        output: stdout || '(aucune sortie)',
        error: stderr || (exitCode !== 0 ? `Exit code: ${exitCode}` : null),
        duration: Date.now() - startTime
      });
    });

    pythonProcess.on('error', (err) => {
      clearTimeout(timeout);
      cleanup();
      resolve({
        success: false,
        output: stdout,
        error: `Erreur Python: ${err.message}`,
        duration: Date.now() - startTime
      });
    });

    function cleanup() {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
}

/**
 * Execute TypeScript code using esbuild (Best Practice 2025)
 * Fast transpilation TS→JS then execution in sandbox
 * @param {string} code - TypeScript code to execute
 * @returns {Promise<{success: boolean, output: string, error?: string, duration: number}>}
 */
async function runTypeScriptCode(code) {
  const startTime = Date.now();

  try {
    // Step 1: Transpile TS → JS using esbuild (very fast, no type checking)
    const result = await esbuild.transform(code, {
      loader: 'ts',
      target: 'es2020',
      format: 'cjs'
    });

    const jsCode = result.code;

    // Step 2: Execute the JS code using our existing sandbox
    const jsResult = await runUserCode(jsCode);

    return {
      success: jsResult.success,
      output: jsResult.output,
      error: jsResult.error,
      duration: Date.now() - startTime
    };

  } catch (err) {
    return {
      success: false,
      output: '',
      error: `Erreur TypeScript: ${err.message}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Execute Java code
 * @param {string} code - Java code to execute
 * @returns {Promise<{success: boolean, output: string, error?: string, duration: number}>}
 */
async function runJavaCode(code) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const tempDir = path.join(__dirname, 'temp');

    // Extract class name from code (Java requires filename = classname)
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : 'Main';
    const tempFile = path.join(tempDir, `${className}.java`);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write code to temp file
    fs.writeFileSync(tempFile, code, 'utf8');

    // Compile with javac
    const javacProcess = spawn('javac', [tempFile], {
      timeout: CODE_EXEC_TIMEOUT * 2,
      windowsHide: true
    });

    let javacStderr = '';

    javacProcess.stderr.on('data', (data) => {
      javacStderr += data.toString();
    });

    javacProcess.on('close', (javacExitCode) => {
      if (javacExitCode !== 0) {
        cleanup();
        resolve({
          success: false,
          output: '',
          error: `Erreur compilation Java:\n${javacStderr}`,
          duration: Date.now() - startTime
        });
        return;
      }

      // Run with java
      let stdout = '';
      let stderr = '';

      const javaProcess = spawn('java', ['-cp', tempDir, className], {
        timeout: CODE_EXEC_TIMEOUT,
        windowsHide: true
      });

      javaProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      javaProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      javaProcess.on('close', (exitCode) => {
        cleanup();
        resolve({
          success: exitCode === 0,
          output: stdout || '(aucune sortie)',
          error: stderr || (exitCode !== 0 ? `Exit code: ${exitCode}` : null),
          duration: Date.now() - startTime
        });
      });

      javaProcess.on('error', (err) => {
        cleanup();
        resolve({
          success: false,
          output: stdout,
          error: `Erreur Java: ${err.message}`,
          duration: Date.now() - startTime
        });
      });
    });

    javacProcess.on('error', (err) => {
      cleanup();
      resolve({
        success: false,
        output: '',
        error: `Erreur javac: ${err.message}`,
        duration: Date.now() - startTime
      });
    });

    function cleanup() {
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        const classFile = path.join(tempDir, `${className}.class`);
        if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
}

/**
 * Execute Go code
 * @param {string} code - Go code to execute
 * @returns {Promise<{success: boolean, output: string, error?: string, duration: number}>}
 */
async function runGoCode(code) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const tempDir = path.join(__dirname, 'temp');
    const tempFile = path.join(tempDir, `go_${Date.now()}.go`);

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(tempFile, code, 'utf8');

    // Go can run directly with 'go run'
    const goProcess = spawn('go', ['run', tempFile], {
      timeout: CODE_EXEC_TIMEOUT,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    goProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    goProcess.stderr.on('data', (data) => { stderr += data.toString(); });

    goProcess.on('close', (exitCode) => {
      cleanup();
      resolve({
        success: exitCode === 0,
        output: stdout || '(aucune sortie)',
        error: stderr || (exitCode !== 0 ? `Exit code: ${exitCode}` : null),
        duration: Date.now() - startTime
      });
    });

    goProcess.on('error', (err) => {
      cleanup();
      resolve({ success: false, output: '', error: `Erreur Go: ${err.message}`, duration: Date.now() - startTime });
    });

    function cleanup() {
      try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) {}
    }
  });
}

/**
 * Execute Rust code
 * @param {string} code - Rust code to execute
 * @returns {Promise<{success: boolean, output: string, error?: string, duration: number}>}
 */
async function runRustCode(code) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const tempDir = path.join(__dirname, 'temp');
    const tempFile = path.join(tempDir, `rust_${Date.now()}.rs`);
    const outputFile = tempFile.replace('.rs', process.platform === 'win32' ? '.exe' : '');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(tempFile, code, 'utf8');

    // Compile with rustc
    const rustcProcess = spawn('rustc', ['-o', outputFile, tempFile], {
      timeout: CODE_EXEC_TIMEOUT * 2,
      windowsHide: true
    });

    let rustcStderr = '';
    rustcProcess.stderr.on('data', (data) => { rustcStderr += data.toString(); });

    rustcProcess.on('close', (rustcExitCode) => {
      if (rustcExitCode !== 0) {
        cleanup();
        resolve({ success: false, output: '', error: `Erreur compilation Rust:\n${rustcStderr}`, duration: Date.now() - startTime });
        return;
      }

      // Run the compiled binary
      const runProcess = spawn(outputFile, [], { timeout: CODE_EXEC_TIMEOUT, windowsHide: true });
      let stdout = '';
      let stderr = '';

      runProcess.stdout.on('data', (data) => { stdout += data.toString(); });
      runProcess.stderr.on('data', (data) => { stderr += data.toString(); });

      runProcess.on('close', (exitCode) => {
        cleanup();
        resolve({
          success: exitCode === 0,
          output: stdout || '(aucune sortie)',
          error: stderr || (exitCode !== 0 ? `Exit code: ${exitCode}` : null),
          duration: Date.now() - startTime
        });
      });

      runProcess.on('error', (err) => {
        cleanup();
        resolve({ success: false, output: stdout, error: `Erreur Rust: ${err.message}`, duration: Date.now() - startTime });
      });
    });

    rustcProcess.on('error', (err) => {
      cleanup();
      resolve({ success: false, output: '', error: `Erreur rustc: ${err.message}`, duration: Date.now() - startTime });
    });

    function cleanup() {
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      } catch (e) {}
    }
  });
}

/**
 * Execute C# code using dotnet
 * @param {string} code - C# code to execute
 * @returns {Promise<{success: boolean, output: string, error?: string, duration: number}>}
 */
async function runCSharpCode(code) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const tempDir = path.join(__dirname, 'temp', `csharp_${Date.now()}`);
    const tempFile = path.join(tempDir, 'Program.cs');

    // Create project directory
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(tempFile, code, 'utf8');

    // Create minimal .csproj
    const csproj = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>`;
    fs.writeFileSync(path.join(tempDir, 'temp.csproj'), csproj, 'utf8');

    // Run with dotnet run
    const dotnetProcess = spawn('dotnet', ['run', '--project', tempDir], {
      timeout: CODE_EXEC_TIMEOUT * 3, // C# compilation takes longer
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    dotnetProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    dotnetProcess.stderr.on('data', (data) => { stderr += data.toString(); });

    dotnetProcess.on('close', (exitCode) => {
      cleanup();
      resolve({
        success: exitCode === 0,
        output: stdout || '(aucune sortie)',
        error: stderr || (exitCode !== 0 ? `Exit code: ${exitCode}` : null),
        duration: Date.now() - startTime
      });
    });

    dotnetProcess.on('error', (err) => {
      cleanup();
      resolve({ success: false, output: '', error: `Erreur C#: ${err.message}`, duration: Date.now() - startTime });
    });

    function cleanup() {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    }
  });
}

/**
 * Execute C++ code using g++
 * @param {string} code - C++ code to execute
 * @returns {Promise<{success: boolean, output: string, error?: string, duration: number}>}
 */
async function runCppCode(code) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const tempDir = path.join(__dirname, 'temp');
    const tempFile = path.join(tempDir, `cpp_${Date.now()}.cpp`);
    const outputFile = tempFile.replace('.cpp', process.platform === 'win32' ? '.exe' : '');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(tempFile, code, 'utf8');

    // Compile with g++
    const gppProcess = spawn('g++', ['-o', outputFile, tempFile], {
      timeout: CODE_EXEC_TIMEOUT,
      windowsHide: true
    });

    let gppStderr = '';
    gppProcess.stderr.on('data', (data) => { gppStderr += data.toString(); });

    gppProcess.on('close', (gppExitCode) => {
      if (gppExitCode !== 0) {
        cleanup();
        resolve({ success: false, output: '', error: `Erreur compilation C++:\n${gppStderr}`, duration: Date.now() - startTime });
        return;
      }

      // Run the compiled binary
      const runProcess = spawn(outputFile, [], { timeout: CODE_EXEC_TIMEOUT, windowsHide: true });
      let stdout = '';
      let stderr = '';

      runProcess.stdout.on('data', (data) => { stdout += data.toString(); });
      runProcess.stderr.on('data', (data) => { stderr += data.toString(); });

      runProcess.on('close', (exitCode) => {
        cleanup();
        resolve({
          success: exitCode === 0,
          output: stdout || '(aucune sortie)',
          error: stderr || (exitCode !== 0 ? `Exit code: ${exitCode}` : null),
          duration: Date.now() - startTime
        });
      });

      runProcess.on('error', (err) => {
        cleanup();
        resolve({ success: false, output: stdout, error: `Erreur C++: ${err.message}`, duration: Date.now() - startTime });
      });
    });

    gppProcess.on('error', (err) => {
      cleanup();
      resolve({ success: false, output: '', error: `Erreur g++: ${err.message}`, duration: Date.now() - startTime });
    });

    function cleanup() {
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      } catch (e) {}
    }
  });
}

// Supported languages configuration
const SUPPORTED_LANGUAGES = {
  javascript: { executor: runUserCode, name: 'JavaScript', available: true },
  python: { executor: runPythonCode, name: 'Python', available: true },
  typescript: { executor: runTypeScriptCode, name: 'TypeScript', available: true },
  // Langages avec compilation
  java: { executor: runJavaCode, name: 'Java', available: true },
  go: { executor: runGoCode, name: 'Go', available: true },
  rust: { executor: runRustCode, name: 'Rust', available: true },
  csharp: { executor: runCSharpCode, name: 'C#', available: true },
  cpp: { executor: runCppCode, name: 'C++', available: true },
  ruby: { name: 'Ruby', available: false, hint: 'Nécessite Ruby installé' },
  php: { name: 'PHP', available: false, hint: 'Nécessite PHP installé' }
};

// POST /api/code/execute - Execute code in multiple languages
app.post('/api/code/execute', async (req, res) => {
  const execStart = Date.now();

  try {
    const { code, language = 'javascript' } = req.body;

    // Validation
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Le champ "code" est requis'
      });
    }

    if (code.length > CODE_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Code trop long (max ${CODE_MAX_LENGTH} caractères)`
      });
    }

    // Check if language is supported
    const langConfig = SUPPORTED_LANGUAGES[language];

    if (!langConfig) {
      return res.json({
        success: false,
        error: `Langage "${language}" inconnu. Langages supportés: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`,
        output: ''
      });
    }

    if (!langConfig.available) {
      return res.json({
        success: false,
        error: `${langConfig.name} non disponible. ${langConfig.hint}`,
        output: ''
      });
    }

    // Execute code with appropriate executor
    console.log(`🚀 Exécution ${langConfig.name}: ${code.length} caractères`);
    const result = await langConfig.executor(code);

    // Log execution
    writeLog({
      type: 'code-exec',
      language: language,
      codeLength: code.length,
      success: result.success,
      duration: result.duration,
      hasError: !!result.error
    });

    res.json({
      success: result.success,
      output: result.output,
      error: result.error || null,
      duration: result.duration,
      language: langConfig.name,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    writeLog({
      type: 'code-exec',
      success: false,
      error: error.message,
      duration: Date.now() - execStart
    });

    res.status(500).json({
      success: false,
      error: 'Erreur serveur: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/code/languages - List supported languages
app.get('/api/code/languages', (req, res) => {
  const languages = Object.entries(SUPPORTED_LANGUAGES).map(([key, config]) => ({
    id: key,
    name: config.name,
    available: config.available,
    hint: config.hint || null
  }));

  res.json({
    success: true,
    languages,
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Ana Core',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API Health (alias)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Ana SUPERIA',
    version: '2.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// API Status - Full system status
app.get('/api/status', async (req, res) => {
  try {
    // Check Ollama
    let ollamaStatus = 'offline';
    try {
      const ollamaCheck = await axios.get('http://localhost:11434/api/tags', { timeout: 3000 });
      ollamaStatus = ollamaCheck.data.models ? 'online' : 'offline';
    } catch (e) {
      ollamaStatus = 'offline';
    }

    res.json({
      status: 'operational',
      components: {
        backend: 'online',
        ollama: ollamaStatus,
        memory: 'active',
        orchestrator: 'ready'
      },
      llms: router.stats,
      memory: memory.getStats(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Memory Status
app.get('/api/memory/status', (req, res) => {
  const stats = memory.getStats();
  res.json({
    status: 'active',
    entries: stats.lines || 0,
    sizeKB: stats.sizeKB || '0',
    lastSync: new Date().toISOString(),
    claudePrefix: '##Ana'
  });
});

// Get LLM stats
app.get('/api/stats', (req, res) => {
  res.json({
    llm_usage: router.stats,
    memory: memory.getStats(),
    active_model: router.activeModel
  });
});

// ================== DASHBOARD AGENTS API ==================
const agentStartTime = Date.now();
const agentChecks = {};

app.get('/api/agents', (req, res) => {
  const uptime = Date.now() - agentStartTime;
  const agents = {
    memory_manager: { name: 'Memory Manager', status: 'RUNNING', uptime, checksCount: agentChecks.memory_manager || 0 },
    system_monitor: { name: 'System Monitor', status: 'RUNNING', uptime, checksCount: agentChecks.system_monitor || 0 },
    alain_notifier: { name: 'Alain Notifier', status: 'RUNNING', uptime, checksCount: agentChecks.alain_notifier || 0 },
    emotion_analyzer: { name: 'Emotion Analyzer', status: 'RUNNING', uptime, checksCount: agentChecks.emotion_analyzer || 0 },
    learning_monitor: { name: 'Learning Monitor', status: 'RUNNING', uptime, checksCount: agentChecks.learning_monitor || 0 },
    longterm_memory: { name: 'Long-term Memory', status: 'RUNNING', uptime, checksCount: agentChecks.longterm_memory || 0 },
    truth_checker: { name: 'Truth Checker', status: 'RUNNING', uptime, checksCount: agentChecks.truth_checker || 0 },
    assumption_detector: { name: 'Assumption Detector', status: 'RUNNING', uptime, checksCount: agentChecks.assumption_detector || 0 },
    research_reminder: { name: 'Research Reminder', status: 'RUNNING', uptime, checksCount: agentChecks.research_reminder || 0 },
    methodology_checker: { name: 'Methodology Checker', status: 'RUNNING', uptime, checksCount: agentChecks.methodology_checker || 0 },
    action_monitor: { name: 'Action Monitor', status: 'RUNNING', uptime, checksCount: agentChecks.action_monitor || 0 },
    strict_backup_enforcer: { name: 'Strict Backup Enforcer', status: 'RUNNING', uptime, checksCount: agentChecks.strict_backup_enforcer || 0 },
    synthesis_engine: { name: 'Synthesis Engine', status: 'RUNNING', uptime, checksCount: agentChecks.synthesis_engine || 0 },
    research: { name: 'Research Agent', status: 'RUNNING', uptime, checksCount: agentChecks.research || 0 },
    code_analyzer: { name: 'Code Analyzer', status: 'RUNNING', uptime, checksCount: agentChecks.code_analyzer || 0 },
    doc_updater: { name: 'Doc Updater', status: 'RUNNING', uptime, checksCount: agentChecks.doc_updater || 0 }
  };
  res.json({ count: Object.keys(agents).length, agents, timestamp: new Date().toISOString() });
});

const eventBus = [];
const MAX_EVENTS = 100;

function addEvent(type, agent, data = {}) {
  const event = { id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), type, agent, data, timestamp: new Date().toLocaleTimeString('fr-FR') };
  eventBus.unshift(event);
  if (eventBus.length > MAX_EVENTS) eventBus.pop();
  agentChecks[agent] = (agentChecks[agent] || 0) + 1;
  return event;
}

app.get('/api/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  res.json({ events: eventBus.slice(0, limit), total: eventBus.length, timestamp: new Date().toISOString() });
});

addEvent('SYSTEM_START', 'system_monitor', { message: 'Ana Core started' });


// Get system prompt
app.get('/api/system-prompt', (req, res) => {
  res.json({
    prompt: currentSystemPrompt,
    default: DEFAULT_SYSTEM_PROMPT
  });
});

// Update system prompt
app.post('/api/system-prompt', (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt requis (string)' });
  }

  currentSystemPrompt = prompt;
  const saved = saveSystemPrompt(prompt);

  res.json({
    success: saved,
    prompt: currentSystemPrompt,
    message: saved ? 'Prompt système mis à jour' : 'Erreur de sauvegarde'
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message requis' });
  }

  try {
    // 1. Choose best LLM
    const { model, reason } = router.classifyTask(message, context || {});
    router.activeModel = model;
    router.updateStats(model);

    console.log(`🧠 Routing to ${model} - Raison: ${reason}`);

    // 2. Load memory context
    const memoryContext = memory.getContext();
    const fullPrompt = memoryContext ? `${memoryContext}\n\nAlain: ${message}` : message;

    // 3. Query LLM
    const response = await router.query(model, fullPrompt, false);

    // 4. Save to memory
    memory.appendToContext(`Alain: ${message}\nAna (${model}): ${response.response}`);

    // 5. Send response
    res.json({
      response: response.response,
      model: model,
      reason: reason,
      memory_loaded: memoryContext.length > 0
    });

  } catch (error) {
    console.error('❌ Erreur chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get memory
app.get('/api/memory', (req, res) => {
  res.json({
    context: memory.getContext(),
    stats: memory.getStats()
  });
});

// Helper: Search files in a specific directory
async function searchInDirectory(directory, query, maxResults = 50) {
  const results = [];
  const queryLower = query.toLowerCase();

  const searchDir = async (dir) => {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (results.length >= maxResults) break;

        const fullPath = path.join(dir, item.name);

        // Skip hidden files and node_modules
        if (item.name.startsWith('.') || item.name === 'node_modules') continue;

        if (item.isDirectory()) {
          await searchDir(fullPath);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          const textExts = ['.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.log', '.csv'];
          if (!textExts.includes(ext)) continue;

          try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            const lines = fileContent.split(String.fromCharCode(10));

            // Skip minified files (first line > 500 chars or avg line > 300)
            if (lines.length > 0 && lines[0].length > 500) continue;
            if (lines.length < 10 && fileContent.length > 5000) continue;

            const MAX_LINE_LENGTH = 200;
            const truncateLine = (line) => line.length > MAX_LINE_LENGTH 
              ? line.substring(0, MAX_LINE_LENGTH) + '...' 
              : line;

            for (let i = 0; i < lines.length; i++) {
              if (results.length >= maxResults) break;
              if (lines[i].toLowerCase().includes(queryLower)) {
                const start = Math.max(0, i - 2);
                const end = Math.min(lines.length, i + 3);
                const snippetLines = lines.slice(start, end).map(truncateLine);
                const snippet = snippetLines.join(String.fromCharCode(10));

                results.push({
                  id: 'file_' + results.length,
                  document: snippet,
                  content: truncateLine(lines[i]),
                  metadata: {
                    source: fullPath,
                    filename: item.name,
                    line: i + 1,
                    timestamp: fs.statSync(fullPath).mtime.toISOString()
                  },
                  distance: 0.5
                });
              }
            }
          } catch (e) { /* Skip unreadable files */ }
        }
      }
    } catch (e) { /* Skip inaccessible directories */ }
  };

  await searchDir(directory);
  return results;
}

// Search memory - ChromaDB Semantic Search (REAL Vector Search)
app.post('/api/memory/search', async (req, res) => {
  const { query, nResults = 50, where, useTextFallback = false, directory = null } = req.body;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter required'
    });
  }

  try {
    // If a specific directory is selected, search in that directory
    if (directory && directory !== 'all') {
      if (!fs.existsSync(directory)) {
        return res.status(400).json({
          success: false,
          error: 'Directory not found: ' + directory });
      }

      const dirResults = await searchInDirectory(directory, query, nResults);

      return res.json({
        success: true,
        query: query,
        searchType: 'directory',
        directory: directory,
        results: dirResults,
        count: dirResults.length,
        timestamp: new Date().toISOString()
      });
    }

    // PRIMARY: ChromaDB semantic vector search (when no specific directory)
    const chromaResults = await memoryManager.search(query, nResults, where);

    if (chromaResults.count > 0) {
      // Apply time weighting: recent results get boosted
      const now = Date.now();
      const weightedResults = chromaResults.results.map(r => {
        const timestamp = r.metadata?.timestamp ? new Date(r.metadata.timestamp).getTime() : now;
        const ageHours = (now - timestamp) / (1000 * 60 * 60);
        // Time decay: boost recent (< 24h = 1.5x, < 168h = 1.2x, older = 1.0x)
        const timeBoost = ageHours < 24 ? 1.5 : ageHours < 168 ? 1.2 : 1.0;
        return {
          ...r,
          timeBoost,
          weightedDistance: r.distance / timeBoost
        };
      }).sort((a, b) => a.weightedDistance - b.weightedDistance);

      res.json({
        success: true,
        query: query,
        searchType: 'semantic',
        results: weightedResults,
        count: weightedResults.length,
        chromaDBActive: true,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // FALLBACK: Text search if ChromaDB empty or user requests it
    if (useTextFallback || chromaResults.count === 0) {
      const context = memory.getContext();
      const lines = context.split('\n');
      const queryLower = query.toLowerCase();
      const matchingLines = lines.filter(line => line.toLowerCase().includes(queryLower));
      const textResults = matchingLines.slice(0, nResults);

      res.json({
        success: true,
        query: query,
        searchType: 'text_fallback',
        results: textResults.map((line, i) => ({ document: line, id: `text_${i}` })),
        count: textResults.length,
        totalMatches: matchingLines.length,
        chromaDBActive: false,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      query: query,
      searchType: 'semantic',
      results: [],
      count: 0,
      chromaDBActive: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ChromaDB Memory Stats
app.get('/api/memory/semantic/stats', async (req, res) => {
  try {
    const stats = await memoryManager.getStats();
    res.json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// VRAM Manager Stats
app.get('/api/vram/stats', (req, res) => {
  try {
    const stats = vramManager.getStats();
    res.json({
      success: true,
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ================== SKILL LEARNER API ==================

// Get skill learner stats
app.get('/api/skills/stats', (req, res) => {
  try {
    const stats = skillLearner.getStats();
    res.json({
      success: true,
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Search skills (dynamic + static) - Phase 2 - 30 Nov 2025
app.get('/api/skills/search', (req, res) => {
  try {
    const { query, limit } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 100, 100); // Guard-rail: max 100

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        results: [],
        message: 'Query must be at least 2 characters',
        timestamp: new Date().toISOString()
      });
    }

    const results = skillLearner.searchSkills(query.trim(), maxLimit);

    res.json({
      success: true,
      query: query.trim(),
      count: results.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Skills Intelligence Dashboard - Phase 4 - 01 Dec 2025
app.get('/api/skills/intelligence', (req, res) => {
  try {
    const intelligence = skillLearner.getIntelligence();
    res.json(intelligence);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Record user feedback for learning (legacy endpoint)
app.post('/api/skills/feedback', async (req, res) => {
  try {
    const { type, message, anaResponse, rating, suggestion } = req.body;
    const result = await skillLearner.recordFeedback({
      type, message, anaResponse, rating, suggestion
    });
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================
// FEEDBACK API - Phase 5A - 01 Dec 2025
// Simple feedback endpoints for UI buttons
// ============================================================

// POST /api/feedback - Add feedback from UI (👍/👎/suggestion)
app.post('/api/feedback', async (req, res) => {
  try {
    const { messageId, conversationId, type, comment, source } = req.body;

    // Validate required field
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: type (positive, negative, or suggestion)',
        timestamp: new Date().toISOString()
      });
    }

    // Get current LLM model if available
    const llmModel = global.currentModel || null;

    const result = await skillLearner.addFeedback({
      messageId,
      conversationId,
      type,
      comment,
      source: source || 'chat',
      llmModel
    });

    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] POST /api/feedback error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/feedback/stats - Get feedback statistics
app.get('/api/feedback/stats', async (req, res) => {
  try {
    const stats = skillLearner.getFeedbackStats();
    res.json({
      success: true,
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] GET /api/feedback/stats error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Extract skills from conversation
app.post('/api/skills/extract', async (req, res) => {
  try {
    const { userMessage, anaResponse, model, success } = req.body;
    const result = await skillLearner.extractSkillsFromConversation({
      userMessage, anaResponse, model, success
    });
    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get performance analysis
app.get('/api/skills/performance', async (req, res) => {
  try {
    const performance = await skillLearner.analyzePerformance();
    res.json({
      success: true,
      ...performance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get coding suggestions based on learned skills
app.post('/api/skills/suggestions', async (req, res) => {
  try {
    const { context } = req.body;
    const suggestions = await skillLearner.getSuggestions(context || '');
    res.json({
      success: true,
      ...suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ================== SKILL CREATION API (Ana Autonomy) ==================

// POST /api/skills/create - Ana can create her own skill modules
app.post('/api/skills/create', async (req, res) => {
  try {
    const { category, skills, version = '1.0.0' } = req.body;

    // Validation
    if (!category || !skills || !Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: category (string), skills (array)',
        timestamp: new Date().toISOString()
      });
    }

    if (skills.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Skills array cannot be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Sanitize filename
    const filename = category.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const filepath = path.join(__dirname, '../knowledge/learned/skills', `${filename}.json`);

    // Create skill module
    const skillModule = {
      category: category,
      version: version,
      generatedBy: 'Ana SUPERIA',
      skills: skills
    };

    // Write the file
    fs.writeFileSync(filepath, JSON.stringify(skillModule, null, 2), 'utf-8');

    // Update registry
    const registryPath = path.join(__dirname, '../knowledge/learned/skills.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

    // Check if module already exists
    const existingIndex = registry.modules.findIndex(m => m.name === filename);
    if (existingIndex >= 0) {
      // Update existing
      registry.modules[existingIndex].count = skills.length;
      registry.modules[existingIndex].lastUpdated = new Date().toISOString();
    } else {
      // Add new module
      registry.modules.push({
        name: filename,
        count: skills.length,
        lastUpdated: new Date().toISOString()
      });
    }

    // Recalculate totals
    registry.totalModules = registry.modules.length;
    registry.totalSkills = registry.modules.reduce((sum, m) => sum + m.count, 0);
    registry.lastUpdated = new Date().toISOString();

    // Increment version
    const versionParts = registry.version.replace('v', '').split('.');
    versionParts[1] = parseInt(versionParts[1]) + 1;
    registry.version = `v${versionParts[0]}.${versionParts[1]}.${versionParts[2]}`;

    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');

    // Reload skills in memory
    if (typeof loadAllSkills === 'function') {
      loadAllSkills();
    }

    console.log(`[ANA] Created skill module: ${filename} with ${skills.length} skills`);

    res.json({
      success: true,
      message: `Skill module '${category}' created with ${skills.length} skills`,
      filepath: filepath,
      totalSkills: registry.totalSkills,
      totalModules: registry.totalModules,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ANA] Error creating skill module:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/file/write - Ana can create/modify files in E:/ANA/ (AUTONOMY)
app.post('/api/file/write', async (req, res) => {
  try {
    const { filepath, content, createDirs = true } = req.body;

    // Validation
    if (!filepath || content === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: filepath, content',
        timestamp: new Date().toISOString()
      });
    }

    // Security: Only allow writes within E:/ANA/ and E:/Mémoire Claude/
    const normalizedPath = path.resolve(filepath);
    const allowedPaths = ['E:\\ANA', 'E:\\Mémoire Claude'];
    const isAllowed = allowedPaths.some(allowed => normalizedPath.startsWith(allowed));

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: 'Security: Can only write files in E:/ANA/ or E:/Mémoire Claude/',
        timestamp: new Date().toISOString()
      });
    }

    // Create directories if needed
    if (createDirs) {
      const dir = path.dirname(normalizedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Write the file
    fs.writeFileSync(normalizedPath, content, 'utf-8');
    console.log(`[ANA AUTONOMY] File written: ${normalizedPath}`);

    res.json({
      success: true,
      message: `File written successfully`,
      filepath: normalizedPath,
      size: content.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ANA] Error writing file:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/file/read - Ana can read any file in E:/
app.get('/api/file/read', async (req, res) => {
  try {
    const { filepath } = req.query;

    if (!filepath) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: filepath',
        timestamp: new Date().toISOString()
      });
    }

    // Security: Only allow reads from E:/
    const normalizedPath = path.resolve(filepath);
    if (!normalizedPath.startsWith('E:\\')) {
      return res.status(403).json({
        success: false,
        error: 'Security: Can only read files from E:/',
        timestamp: new Date().toISOString()
      });
    }

    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        timestamp: new Date().toISOString()
      });
    }

    const content = fs.readFileSync(normalizedPath, 'utf-8');

    res.json({
      success: true,
      filepath: normalizedPath,
      content: content,
      size: content.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/file/list - Ana can list directories in E:/
app.get('/api/file/list', async (req, res) => {
  try {
    const { dirpath } = req.query;

    if (!dirpath) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: dirpath',
        timestamp: new Date().toISOString()
      });
    }

    // Security: Only allow listing E:/
    const normalizedPath = path.resolve(dirpath);
    if (!normalizedPath.startsWith('E:\\')) {
      return res.status(403).json({
        success: false,
        error: 'Security: Can only list directories in E:/',
        timestamp: new Date().toISOString()
      });
    }

    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({
        success: false,
        error: 'Directory not found',
        timestamp: new Date().toISOString()
      });
    }

    const items = fs.readdirSync(normalizedPath, { withFileTypes: true });
    const files = items.map(item => {
      const itemPath = path.join(normalizedPath, item.name);
      const isDir = item.isDirectory();
      let size = 0;
      try {
        if (!isDir) {
          const stats = fs.statSync(itemPath);
          size = stats.size;
        }
      } catch (e) { /* ignore */ }
      return {
        name: item.name,
        type: isDir ? 'directory' : 'file',
        isDirectory: isDir,
        path: itemPath,
        size: size
      };
    });

    // Sort: directories first, then files alphabetically
    files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      success: true,
      dirpath: normalizedPath,
      items: files,
      count: files.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/endpoint/create - Ana can create her own endpoints dynamically!
app.post('/api/endpoint/create', async (req, res) => {
  try {
    const { method, route, handler, description } = req.body;

    if (!method || !route || !handler) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: method (GET/POST), route, handler (JS code)',
        timestamp: new Date().toISOString()
      });
    }

    // Security: Only allow routes starting with /api/ana/
    if (!route.startsWith('/api/ana/')) {
      return res.status(403).json({
        success: false,
        error: 'Security: Custom endpoints must start with /api/ana/',
        timestamp: new Date().toISOString()
      });
    }

    // Save endpoint definition to file for persistence
    const endpointsFile = path.join(__dirname, '../knowledge/learned/custom-endpoints.json');
    let endpoints = [];
    if (fs.existsSync(endpointsFile)) {
      endpoints = JSON.parse(fs.readFileSync(endpointsFile, 'utf-8'));
    }

    // Add or update endpoint
    const existing = endpoints.findIndex(e => e.route === route && e.method === method);
    const endpointDef = { method, route, handler, description, createdAt: new Date().toISOString() };

    if (existing >= 0) {
      endpoints[existing] = endpointDef;
    } else {
      endpoints.push(endpointDef);
    }

    fs.writeFileSync(endpointsFile, JSON.stringify(endpoints, null, 2), 'utf-8');

    // Register endpoint dynamically (careful with eval - limited to specific scope)
    try {
      const handlerFn = new Function('req', 'res', 'fs', 'path', handler);
      if (method.toUpperCase() === 'GET') {
        app.get(route, (req, res) => handlerFn(req, res, fs, path));
      } else if (method.toUpperCase() === 'POST') {
        app.post(route, (req, res) => handlerFn(req, res, fs, path));
      }
      console.log(`[ANA AUTONOMY] Endpoint created: ${method} ${route}`);
    } catch (evalError) {
      return res.status(400).json({
        success: false,
        error: `Invalid handler code: ${evalError.message}`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `Endpoint ${method} ${route} created successfully`,
      description: description,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ANA] Error creating endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/skills/list - List all skill modules
app.get('/api/skills/list', (req, res) => {
  try {
    const registryPath = path.join(__dirname, '../knowledge/learned/skills.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

    res.json({
      success: true,
      version: registry.version,
      totalModules: registry.totalModules,
      totalSkills: registry.totalSkills,
      modules: registry.modules,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ================== TIERED MEMORY API ==================

// Get tiered memory statistics
app.get('/api/memory/tiered/stats', (req, res) => {
  try {
    const stats = tieredMemory.getStats();
    res.json({
      success: true,
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Search across all memory tiers
app.post('/api/memory/tiered/search', async (req, res) => {
  try {
    const { query, options } = req.body;
    const results = await tieredMemory.search(query, options || {});
    res.json({
      success: true,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Run memory maintenance (archive old, cleanup)
app.post('/api/memory/tiered/maintenance', async (req, res) => {
  try {
    const result = await tieredMemory.runMaintenance();
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Clear primary memory (new session)
app.post('/api/memory/tiered/clear-session', (req, res) => {
  try {
    tieredMemory.clearPrimary();
    res.json({
      success: true,
      message: 'Primary memory cleared - new session started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get primary context (current session)
app.get('/api/memory/tiered/context', (req, res) => {
  try {
    const context = tieredMemory.getPrimaryContext();
    res.json({
      success: true,
      context,
      length: context.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});


// ================== CODING AGENT API ==================

// Run coding agent task
app.post('/api/agent/code/run', async (req, res) => {
  const { task, context, dryRun } = req.body;

  if (!task) {
    return res.status(400).json({
      success: false,
      error: 'Task description required'
    });
  }

  try {
    console.log('🤖 [API] Coding Agent task:', task.substring(0, 100));

    const agent = new CodingAgent({ dryRun: dryRun || false });
    const result = await agent.run(task, context || {});

    res.json(result);
  } catch (error) {
    console.error('❌ [API] Coding Agent error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get coding agent available tools
app.get('/api/agent/code/tools', (req, res) => {
  try {
    const { CODING_TOOLS } = require('./agents/coding-agent.cjs');
    res.json({
      success: true,
      tools: CODING_TOOLS.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters
      })),
      count: CODING_TOOLS.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================== ORCHESTRATOR V2 API ==================

// Chat V2 - Using new modular orchestrator with failover
app.post('/api/chat/v2', async (req, res) => {
  const { message, taskType, model, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message requis' });
  }

  try {
    // 1. Load memory context
    const memoryContext = memory.getContext();
    const fullPrompt = memoryContext
      ? `Context: ${memoryContext}\n\nAlain: ${message}`
      : message;

    // 2. Use orchestrator with automatic routing and failover
    const result = await orchestrator.chat({
      prompt: fullPrompt,
      taskType,
      model
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
        taskType: result.taskType
      });
    }

    // 3. Save to memory
    memory.appendToContext(`Alain: ${message}\nAna (${result.modelKey}): ${result.response}`);

    // 4. Capture to long-term memory
    memoryCapture.capture({ userMessage: message, anaResponse: result.response, model: result.modelKey }).catch(err => console.error("Memory capture error:", err.message));
    // V2: Capture to dedicated Ana memory (E:\ANA\memory\)
    memoryCaptureV2.capture({ userMessage: message, anaResponse: result.response, model: result.modelKey }).catch(err => console.error("Memory V2 capture error:", err.message));

    // 5. Send response
    res.json({
      success: true,
      response: result.response,
      model: result.model,
      modelKey: result.modelKey,
      taskType: result.taskType,
      latencyMs: result.latencyMs,
      failover: result.failover || false,
      originalModel: result.originalModel,
      memoryLoaded: memoryContext.length > 0
    });

  } catch (error) {
    console.error('❌ Erreur chat V2:', error);
    res.status(500).json({ error: error.message });
  }
});

// Orchestrator stats
app.get('/api/orchestrator/stats', (req, res) => {
  try {
    const stats = orchestrator.getStats();
    res.json({
      success: true,
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get orchestrator model info
app.get('/api/orchestrator/models', (req, res) => {
  try {
    const models = orchestrator.getModelsInfo();
    res.json({
      success: true,
      models,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// List available LLMs
app.get('/api/llms', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    res.json({
      configured: LLMS,
      available: response.data.models || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================== RESEARCH AGENT API ==================

// Execute research
app.post('/api/research/execute', async (req, res) => {
  const { topic, strategy = 'comprehensive', sources } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });
  
  const result = await researchAgent.research(topic, { strategy, sources });
  res.json(result);
});

// Get research status
app.get('/api/research/status', (req, res) => {
  res.json(researchAgent.getStatus());
});

// ================== DAILY ART GENERATOR API ==================

// Get daily art generator status
app.get('/api/art/status', (req, res) => {
  try {
    const status = dailyArtGenerator.getStatus();
    res.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Manually trigger art generation
app.post('/api/art/generate', async (req, res) => {
  try {
    console.log('🎨 Manual art generation requested');

    // Run generation asynchronously
    dailyArtGenerator.triggerManualGeneration().then(result => {
      console.log('Art generation result:', result);
    });

    res.json({
      success: true,
      message: 'Art generation started in background',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ================== N8N INTEGRATION API ==================

// Get n8n health and status
app.get('/api/n8n/status', async (req, res) => {
  try {
    const health = await n8nIntegration.checkHealth();
    const stats = n8nIntegration.getStats();
    res.json({
      success: true,
      healthy: health.healthy,
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get registered webhooks
app.get('/api/n8n/webhooks', (req, res) => {
  try {
    const webhooks = n8nIntegration.getWebhooks();
    res.json({
      success: true,
      webhooks,
      count: webhooks.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Register a new webhook
app.post('/api/n8n/webhooks', (req, res) => {
  const { name, path: webhookPath, description } = req.body;

  if (!name || !webhookPath) {
    return res.status(400).json({
      success: false,
      error: 'Name and path are required'
    });
  }

  try {
    const result = n8nIntegration.registerWebhook(name, webhookPath, description);
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Trigger a webhook
app.post('/api/n8n/trigger', async (req, res) => {
  const { webhookPath, data, test } = req.body;

  if (!webhookPath) {
    return res.status(400).json({
      success: false,
      error: 'webhookPath is required'
    });
  }

  try {
    const result = await n8nIntegration.triggerWebhook(webhookPath, data || {}, { test });
    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ================== GROQ CLOUD API ==================

// Initialize Groq on startup
groqService.initialize();

// Groq Chat endpoint
app.post('/api/groq/chat', async (req, res) => {
  const { message, model, conversationHistory, temperature } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message required'
    });
  }

  try {
    const result = await groqService.chat(message, {
      model,
      conversationHistory,
      temperature,
      systemPrompt: "Tu es Ana, une IA francaise. Reponds toujours en francais."
    });

    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Groq Models list
app.get('/api/groq/models', (req, res) => {
  res.json({
    success: true,
    models: groqService.getModels(),
    available: groqService.isAvailable(),
    timestamp: new Date().toISOString()
  });
});

// ================== CEREBRAS CLOUD API ==================

// Initialize Cerebras on startup
cerebrasService.initialize();

// Cerebras Chat endpoint
app.post('/api/cerebras/chat', async (req, res) => {
  const { message, model, conversationHistory, temperature } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message required'
    });
  }

  try {
    const result = await cerebrasService.chat(message, {
      model,
      conversationHistory,
      temperature,
      systemPrompt: "Tu es Ana, une IA francaise. Reponds toujours en francais."
    });

    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Cerebras Models list
app.get('/api/cerebras/models', (req, res) => {
  res.json({
    success: true,
    models: cerebrasService.getModels(),
    available: cerebrasService.isAvailable(),
    timestamp: new Date().toISOString()
  });
});

// Cerebras Stats
app.get('/api/cerebras/stats', (req, res) => {
  res.json({
    success: true,
    ...cerebrasService.getStats(),
    timestamp: new Date().toISOString()
  });
});

// ================== ALL BRAINS STATUS ==================

// Get status of all available LLM providers
app.get('/api/brains/status', async (req, res) => {
  try {
    // Check Ollama
    let ollamaStatus = 'offline';
    let ollamaModels = [];
    try {
      const ollamaCheck = await require('axios').get('http://localhost:11434/api/tags', { timeout: 3000 });
      ollamaStatus = 'online';
      ollamaModels = ollamaCheck.data.models || [];
    } catch (e) {
      ollamaStatus = 'offline';
    }

    res.json({
      success: true,
      brains: {
        ollama: {
          status: ollamaStatus,
          models: ollamaModels.map(m => m.name),
          type: 'local'
        },
        groq: {
          status: groqService.isAvailable() ? 'online' : 'offline',
          models: Object.values(groqService.getModels()),
          type: 'cloud',
          speed: '~300 tok/s'
        },
        cerebras: {
          status: cerebrasService.isAvailable() ? 'online' : 'offline',
          models: Object.values(cerebrasService.getModels()),
          type: 'cloud',
          speed: '~1000 tok/s'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Groq Stats
app.get('/api/groq/stats', (req, res) => {
  res.json({
    success: true,
    ...groqService.getStats(),
    timestamp: new Date().toISOString()
  });
});

// Get workflow templates
app.get('/api/n8n/templates', (req, res) => {
  try {
    const templates = n8nIntegration.getAnaWorkflowTemplates();
    res.json({
      success: true,
      templates,
      count: templates.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Create a workflow template
app.post('/api/n8n/templates', async (req, res) => {
  const { name, description, triggers } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Name is required'
    });
  }

  try {
    const result = await n8nIntegration.createWorkflowTemplate(
      name,
      description || '',
      triggers || ['webhook']
    );
    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ================== ANA TOOLS API ==================

// SECURITY: Path validation helper to prevent path traversal attacks
const ALLOWED_BASE_PATHS = [
  'E:\\ANA',
  'E:\\Mémoire Claude',
  'E:\\Memoire Claude',
  'E:\\AI_Tools',
  'E:\\ARCHON_PORTABLE',
  'C:\\Users\\niwno\\Desktop'
];

function validateFilePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return { valid: false, error: 'Invalid path: must be a non-empty string' };
  }

  // Resolve to absolute path
  const resolvedPath = require('path').resolve(inputPath);

  // Check for path traversal patterns
  if (inputPath.includes('..') || inputPath.includes('\0')) {
    return { valid: false, error: 'Path traversal detected' };
  }

  // Check if path is within allowed directories
  const isAllowed = ALLOWED_BASE_PATHS.some(basePath =>
    resolvedPath.toLowerCase().startsWith(basePath.toLowerCase())
  );

  if (!isAllowed) {
    return { valid: false, error: 'Access to this path is not allowed' };
  }

  return { valid: true, resolvedPath };
}

// File: Read
app.post('/api/tools/file/read', async (req, res) => {
  const { path: filePath, encoding, offset, limit } = req.body;

  // SECURITY: Validate path
  const validation = validateFilePath(filePath);
  if (!validation.valid) {
    return res.status(403).json({
      success: false,
      tool: 'file.read',
      error: {
        code: 'ACCESS_DENIED',
        message: validation.error
      },
      timestamp: new Date().toISOString()
    });
  }

  try {
    const result = await FileTools.read(validation.resolvedPath, { encoding, offset, limit });
    res.json({
      ...result,
      tool: 'file.read',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'file.read',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// File: Write
app.post('/api/tools/file/write', async (req, res) => {
  const { path: filePath, content, createDirectories, backup } = req.body;

  // SECURITY: Validate path
  const validation = validateFilePath(filePath);
  if (!validation.valid) {
    return res.status(403).json({
      success: false,
      tool: 'file.write',
      error: {
        code: 'ACCESS_DENIED',
        message: validation.error
      },
      timestamp: new Date().toISOString()
    });
  }

  try {
    const result = await FileTools.write(validation.resolvedPath, content, { createDirectories, backup });
    res.json({
      ...result,
      tool: 'file.write',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'file.write',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// File: List
app.post('/api/tools/file/list', async (req, res) => {
  const { path: dirPath, recursive, showHidden, details } = req.body;

  try {
    const result = await FileTools.list(dirPath, { recursive, showHidden, details });
    res.json({
      ...result,
      tool: 'file.list',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'file.list',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// File: Edit
app.post('/api/tools/file/edit', async (req, res) => {
  const { path: filePath, operations, backup } = req.body;

  try {
    const result = await FileTools.edit(filePath, operations, { backup });
    res.json({
      ...result,
      tool: 'file.edit',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'file.edit',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// File: Stat
app.post('/api/tools/file/stat', async (req, res) => {
  const { path: filePath } = req.body;

  try {
    const result = await FileTools.stat(filePath);
    res.json({
      ...result,
      tool: 'file.stat',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'file.stat',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// File: Delete
app.post('/api/tools/file/delete', async (req, res) => {
  const { path: targetPath, recursive, backup } = req.body;

  try {
    const result = await FileTools.delete(targetPath, { recursive, backup });
    res.json({
      ...result,
      tool: 'file.delete',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'file.delete',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Bash: Execute
app.post('/api/tools/bash/execute', async (req, res) => {
  const { command, timeout, cwd } = req.body;

  try {
    const result = await BashTools.execute(command, { timeout, cwd });
    res.json({
      ...result,
      tool: 'bash.execute',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'bash.execute',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Bash: Spawn Background
app.post('/api/tools/bash/spawn', async (req, res) => {
  const { command, cwd } = req.body;

  try {
    const result = await BashTools.spawnBackground(command, { cwd });
    res.json({
      ...result,
      tool: 'bash.spawn',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'bash.spawn',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Bash: Get Output
app.post('/api/tools/bash/output', async (req, res) => {
  const { bashId, sinceTimestamp } = req.body;

  try {
    const result = BashTools.getOutput(bashId, sinceTimestamp);
    res.json({
      ...result,
      tool: 'bash.output',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'bash.output',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Bash: Kill Process
app.post('/api/tools/bash/kill', async (req, res) => {
  const { bashId, signal } = req.body;

  try {
    const result = BashTools.killProcess(bashId, signal);
    res.json({
      ...result,
      tool: 'bash.kill',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'bash.kill',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Bash: List Processes
app.get('/api/tools/bash/processes', (req, res) => {
  try {
    const result = BashTools.listProcesses();
    res.json({
      ...result,
      tool: 'bash.processes',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'bash.processes',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Search: Glob Pattern
app.post('/api/tools/search/glob', async (req, res) => {
  const { pattern, basePath, limit, extensions } = req.body;

  try {
    const result = await SearchTools.glob(pattern, { basePath, limit, extensions });
    res.json({
      ...result,
      tool: 'search.glob',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'search.glob',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Search: Content
app.post('/api/tools/search/content', async (req, res) => {
  const { pattern, files, caseSensitive, wholeWord, includeContext, limit } = req.body;

  try {
    const result = await SearchTools.searchContent(files, pattern, {
      caseSensitive,
      wholeWord,
      includeContext,
      maxResults: limit
    });
    res.json({
      ...result,
      tool: 'search.content',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'search.content',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Search: Combined
app.post('/api/tools/search/combined', async (req, res) => {
  const { query, basePath, limit } = req.body;

  try {
    const result = await SearchTools.combined(query, { basePath, limit });
    res.json({
      ...result,
      tool: 'search.combined',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'search.combined',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================
// GIT TOOLS API ROUTES
// ============================================================

// Git: Status
app.post('/api/tools/git/status', async (req, res) => {
  const { repoPath } = req.body;

  try {
    const result = await GitTools.status(repoPath);
    res.json({
      ...result,
      tool: 'git.status',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'git.status',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Git: Diff
app.post('/api/tools/git/diff', async (req, res) => {
  const { repoPath, file, staged } = req.body;

  try {
    const result = await GitTools.diff(repoPath, { file, staged });
    res.json({
      ...result,
      tool: 'git.diff',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'git.diff',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Git: Add
app.post('/api/tools/git/add', async (req, res) => {
  const { repoPath, files } = req.body;

  try {
    const result = await GitTools.add(repoPath, files);
    res.json({
      ...result,
      tool: 'git.add',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'git.add',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Git: Commit
app.post('/api/tools/git/commit', async (req, res) => {
  const { repoPath, message, author, email } = req.body;

  try {
    const result = await GitTools.commit(repoPath, message, { author, email });
    res.json({
      ...result,
      tool: 'git.commit',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'git.commit',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Git: Log
app.post('/api/tools/git/log', async (req, res) => {
  const { repoPath, maxCount, file } = req.body;

  try {
    const result = await GitTools.log(repoPath, { maxCount, file });
    res.json({
      ...result,
      tool: 'git.log',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'git.log',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Git: Reset
app.post('/api/tools/git/reset', async (req, res) => {
  const { repoPath, files } = req.body;

  try {
    const result = await GitTools.reset(repoPath, files);
    res.json({
      ...result,
      tool: 'git.reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'git.reset',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Git: Is Repository
app.post('/api/tools/git/is-repo', async (req, res) => {
  const { repoPath } = req.body;

  try {
    const result = await GitTools.isRepo(repoPath);
    res.json({
      ...result,
      tool: 'git.isRepo',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'git.isRepo',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================
// WEB TOOLS API
// ============================================================

// Web: DuckDuckGo Search
app.post('/api/tools/web/search', async (req, res) => {
  const { query, limit } = req.body;

  try {
    const result = await WebTools.search(query, { limit });
    res.json({
      ...result,
      tool: 'web.search',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'web.search',
      error: {
        code: 'SEARCH_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Web: Fetch and Parse Page
app.post('/api/tools/web/fetch', async (req, res) => {
  const { url, extractText, extractLinks, maxLength } = req.body;

  try {
    const result = await WebTools.fetch(url, { extractText, extractLinks, maxLength });
    res.json({
      ...result,
      tool: 'web.fetch',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'web.fetch',
      error: {
        code: 'FETCH_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Web: Wikipedia Search
app.post('/api/tools/web/wikipedia', async (req, res) => {
  const { query, limit } = req.body;

  try {
    const result = await WebTools.wikipedia(query, { limit });
    res.json({
      ...result,
      tool: 'web.wikipedia',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'web.wikipedia',
      error: {
        code: 'WIKIPEDIA_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Web: NPM Search
app.post('/api/tools/web/npm', async (req, res) => {
  const { query, limit } = req.body;

  try {
    const result = await WebTools.npmSearch(query, { limit });
    res.json({
      ...result,
      tool: 'web.npm',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'web.npm',
      error: {
        code: 'NPM_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Web: GitHub Search
app.post('/api/tools/web/github', async (req, res) => {
  const { query, sort, limit } = req.body;

  try {
    const result = await WebTools.githubSearch(query, { sort, limit });
    res.json({
      ...result,
      tool: 'web.github',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'web.github',
      error: {
        code: 'GITHUB_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});


// Web: Weather (wttr.in)
app.post('/api/tools/web/weather', async (req, res) => {
  const { location, lang } = req.body;

  try {
    const result = await WebTools.weather(location, { lang });
    res.json({
      ...result,
      tool: 'web.weather',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      tool: 'web.weather',
      error: {
        code: 'WEATHER_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================
// AUTONOMOUS CHAT API
// ============================================================

// Create AnaAutonomous instance
const anaAutonomous = new AnaAutonomous();

// Autonomous Task Execution
app.post('/api/autonomous/execute', async (req, res) => {
  const { task, maxIterations } = req.body;

  if (!task) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameter: task'
    });
  }

  try {
    console.log(`🚀 [API] Autonomous task: "${task.substring(0, 100)}..."`);

    const result = await anaAutonomous.executeTask(task, { maxIterations });

    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Autonomous Stats
app.get('/api/autonomous/stats', (req, res) => {
  res.json({
    success: true,
    stats: anaAutonomous.getStats(),
    timestamp: new Date().toISOString()
  });
});

// Autonomous Planning - Create execution plan for complex tasks
app.post('/api/autonomous/plan', async (req, res) => {
  const { task } = req.body;

  if (!task) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameter: task'
    });
  }

  try {
    console.log(`📋 [API] Creating plan for: "${task.substring(0, 100)}..."`);

    const plan = await anaAutonomous.createPlan(task);

    res.json({
      success: true,
      plan,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Create ServiceManager instance
const serviceManager = new ServiceManager();

// ============================================================
// SERVICE MANAGER API
// ============================================================

// Start a service (agents, comfyui, n8n)
app.post('/api/services/start/:serviceName', async (req, res) => {
  const { serviceName } = req.params;

  try {
    const result = await serviceManager.start(serviceName);
    res.json({
      success: result.success,
      message: result.message,
      service: serviceName,
      pid: result.pid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      service: serviceName,
      timestamp: new Date().toISOString()
    });
  }
});

// Stop a service
app.post('/api/services/stop/:serviceName', async (req, res) => {
  const { serviceName } = req.params;

  try {
    const result = await serviceManager.stop(serviceName);
    res.json({
      success: result.success,
      message: result.message,
      service: serviceName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      service: serviceName,
      timestamp: new Date().toISOString()
    });
  }
});

// Get status of all services
app.get('/api/services/status', (req, res) => {
  try {
    const status = serviceManager.getStatus();
    res.json({
      success: true,
      services: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Check if a specific service is running
app.get('/api/services/check/:serviceName', (req, res) => {
  const { serviceName } = req.params;

  try {
    const isRunning = serviceManager.isRunning(serviceName);
    const status = serviceManager.getStatus();

    res.json({
      success: true,
      service: serviceName,
      running: isRunning,
      details: status[serviceName],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      service: serviceName,
      timestamp: new Date().toISOString()
    });
  }
});

// Autonomous Chat: Execute task autonomously with tool calling
app.post('/api/chat/autonomous', async (req, res) => {
  const { request, maxIterations } = req.body;

  try {
    if (!request || request.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Request cannot be empty'
        }
      });
    }

    console.log(`\n🤖 AUTONOMOUS REQUEST: "${request}"`);

    // Execute task with ReAct loop
    const result = await anaAutonomous.executeTask(request, { maxIterations });

    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur autonomous chat:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTONOMOUS_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Get autonomous execution stats
app.get('/api/chat/autonomous/stats', (req, res) => {
  res.json({
    success: true,
    stats: anaAutonomous.getStats(),
    timestamp: new Date().toISOString()
  });
});

// ================== CHAT WITH TOOL CALLING ==================
// Agent avec vrai tool calling (météo, heure, fichiers, web, etc.)
app.post('/api/chat/tools', async (req, res) => {
  const { message, model, maxLoops } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Champ "message" requis (string)'
    });
  }

  try {
    console.log(`\n🔧 TOOL AGENT REQUEST: "${message.substring(0, 50)}..."`);

    const result = await toolAgent.runToolAgent(message, {
      model: model || 'qwen2.5-coder:7b',
      maxLoops: maxLoops || 10
    });

    res.json({
      success: result.success,
      answer: result.answer,
      error: result.error,
      loopsUsed: result.loopsUsed,
      model: result.model || model || 'qwen2.5-coder:7b',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] /api/chat/tools error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get available tools for tool agent
app.get('/api/chat/tools/list', (req, res) => {
  res.json({
    success: true,
    tools: toolAgent.TOOL_DEFINITIONS.map(t => ({
      name: t.function.name,
      description: t.function.description
    })),
    count: toolAgent.TOOL_DEFINITIONS.length,
    timestamp: new Date().toISOString()
  });
});

// ================== ERROR HANDLING MIDDLEWARE ==================
// Must be defined AFTER all routes but BEFORE server.listen()
// Best practice: 4 arguments (err, req, res, next)
// Sources: Express.js official docs, Better Stack patterns

app.use((err, req, res, next) => {
  // Log error details
  console.error('\n❌ EXPRESS ERROR HANDLER TRIGGERED');
  console.error('Route:', req.method, req.path);
  console.error('Error:', err.name);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send error response (never expose stack in production)
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      // Include stack only in development (NODE_ENV !== 'production')
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    },
    timestamp: new Date().toISOString()
  });
});

// 404 Handler - Must be AFTER all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    },
    timestamp: new Date().toISOString()
  });
});

// ================== WEBSOCKET EVENTS ==================
io.on('connection', (socket) => {
  console.log('✅ Client WebSocket connecté:', socket.id);
  console.log('   Origin:', socket.handshake.headers.origin);

  // Chat streaming
  socket.on('chat:message', async (data) => {
    const { message, context, images } = data;

    try {
      // === DÉTECTION DIRECTE TOOLS (AVANT semantic router) ===
      // Mots-clés qui DOIVENT passer par le tool agent
      const msgLower = message.toLowerCase();
      const toolKeywords = [
        // SEULEMENT les cas évidents - le semantic-router décide pour le reste
        'quelle heure', 'heure est-il',
        'météo', 'meteo', 'quel temps fait-il'
      ];

      const needsTools = toolKeywords.some(kw => msgLower.includes(kw));

      if (needsTools) {
        console.log(`🔧 [DIRECT] Détection tools par mot-clé: "${message.substring(0, 50)}..."`);

        // FIX PERPLEXITY: Émettre model_selected pour l'interface
        socket.emit('chat:model_selected', {
          model: 'qwen2.5-coder:7b (Tool Agent)',
          reason: 'Tool agent (keywords)',
          provider: 'tools',
          taskType: 'tools'
        });

        try {
          const result = await toolAgent.runToolAgent(message, {
            model: 'qwen2.5-coder:7b',
            maxLoops: 10
          });

          if (result.success && result.answer) {
            console.log(`✅ [ToolAgent] Réponse: "${result.answer.substring(0, 100)}..."`);
            socket.emit('chat:chunk', { chunk: result.answer });
            socket.emit('chat:complete', {});

            // Capture V2 pour les réponses toolAgent
            memoryCaptureV2.capture({
              userMessage: message,
              anaResponse: result.answer,
              model: 'qwen2.5-coder:7b (tools)'
            }).catch(err => console.error("Memory V2 capture error (tools):", err.message));

            return;
          }
        } catch (toolError) {
          console.error(`❌ [ToolAgent] Erreur:`, toolError.message);
          // Continue vers le flux normal
        }
      }

      // Use Semantic Router for intelligent task classification
      const routeResult = await semanticRouter.route(message, {
        ...context,
        hasImage: images && images.length > 0,
        images: images
      });

      const { model, taskType, reason, confidence, method, provider, fallbackModel } = routeResult;
      router.activeModel = model;
      router.updateStats(model);

      console.log(`🧠 Semantic routing to ${model} (${taskType}) - ${method} - Provider: ${provider || 'ollama'} - Confidence: ${(confidence * 100).toFixed(1)}%`);
      console.log(`🔍 [DEBUG] taskType="${taskType}" method="${method}" provider="${provider}" → tools check: ${method === 'tools' || taskType === 'tools'}`);
      if (images && images.length > 0) {
        console.log(`📸 ${images.length} image(s) détectée(s), envoi à ${model}`);
      }
      socket.emit('chat:model_selected', { model, reason, provider });

      // === CLOUD LLM ROUTING (GROQ / CEREBRAS) ===
      // Route to cloud providers when semantic router specifies it
      if (provider === 'groq' && method !== 'tools') {
        console.log(`🚀 [GROQ] Routing to cloud LLM: ${model}`);
        try {
          const groqResult = await groqService.chat(message, {
            model: model,
            systemPrompt: "Tu es Ana, une IA française intelligente et amicale. Réponds toujours en français de manière naturelle et utile."
          });

          if (groqResult.success) {
            console.log(`✅ [GROQ] Réponse: ${groqResult.response.substring(0, 100)}...`);
            socket.emit('chat:chunk', { chunk: groqResult.response });
            socket.emit('chat:complete', { model: model, provider: 'groq' });

            // Save to memory
            memory.appendToContext(`Alain: ${message}\nAna (${model}): ${groqResult.response}`);

            // Capture V2
            memoryCaptureV2.capture({
              userMessage: message,
              anaResponse: groqResult.response,
              model: model + ' (groq)'
            }).catch(err => console.error("Memory V2 capture error (groq):", err.message));

            return;
          } else {
            console.log(`⚠️ [GROQ] Failed, falling back to Ollama: ${groqResult.error}`);
            // Fall through to Ollama
          }
        } catch (groqError) {
          console.error(`❌ [GROQ] Error:`, groqError.message);
          // Fall through to Ollama with fallback model
        }
      }

      if (provider === 'cerebras' && method !== 'tools') {
        console.log(`⚡ [CEREBRAS] Routing to cloud LLM: ${model}`);
        try {
          const cerebrasResult = await cerebrasService.chat(message, {
            model: model,
            systemPrompt: "Tu es Ana, une IA française intelligente et amicale. Réponds toujours en français de manière naturelle et utile."
          });

          if (cerebrasResult.success) {
            console.log(`✅ [CEREBRAS] Réponse: ${cerebrasResult.response.substring(0, 100)}...`);
            socket.emit('chat:chunk', { chunk: cerebrasResult.response });
            socket.emit('chat:complete', { model: model, provider: 'cerebras' });

            // Save to memory
            memory.appendToContext(`Alain: ${message}\nAna (${model}): ${cerebrasResult.response}`);

            // Capture V2
            memoryCaptureV2.capture({
              userMessage: message,
              anaResponse: cerebrasResult.response,
              model: model + ' (cerebras)'
            }).catch(err => console.error("Memory V2 capture error (cerebras):", err.message));

            return;
          } else {
            console.log(`⚠️ [CEREBRAS] Failed, falling back to Ollama: ${cerebrasResult.error}`);
            // Fall through to Ollama
          }
        } catch (cerebrasError) {
          console.error(`❌ [CEREBRAS] Error:`, cerebrasError.message);
          // Fall through to Ollama with fallback model
        }
      }

      // === TOOL AGENT ROUTING ===
      // Si le semantic router détecte une requête nécessitant des outils (heure, météo, fichiers, etc.)
      if (method === 'tools' || taskType === 'tools') {
        console.log(`🔧 [ToolAgent] Requête détectée, activation du tool agent...`);
        try {
          const result = await toolAgent.runToolAgent(message, {
            model: model,
            maxLoops: 10
          });

          if (result.success) {
            console.log(`✅ [ToolAgent] Réponse générée (${result.loopsUsed} boucles)`);
            // Envoyer la réponse en une seule fois (pas de streaming pour tool agent)
            socket.emit('chat:chunk', { chunk: result.answer });
            socket.emit('chat:complete', {});

            // Capture V2 pour les réponses toolAgent (semantic router)
            memoryCaptureV2.capture({
              userMessage: message,
              anaResponse: result.answer,
              model: model + ' (tools)'
            }).catch(err => console.error("Memory V2 capture error (tools-semantic):", err.message));

          } else {
            console.log(`⚠️ [ToolAgent] Échec:`, result.error);
            // Fallback vers le flux normal si le tool agent échoue
            socket.emit('chat:chunk', { chunk: `Désolé, je n'ai pas pu utiliser mes outils: ${result.error}. Je vais essayer de répondre autrement.` });
            socket.emit('chat:complete', {});
          }
          return; // Sortir du handler, ne pas continuer vers Ollama direct
        } catch (toolError) {
          console.error(`❌ [ToolAgent] Erreur:`, toolError.message);
          // Continuer vers le flux normal en cas d'erreur
        }
      }

      // === CODING AGENT ROUTING ===
      // Si le semantic router détecte une tâche de coding, utiliser le Coding Agent
      if (taskType === 'coding' && method === 'semantic') {
        console.log(`💻 [CodingAgent] Tâche de code détectée, activation du coding agent...`);
        try {
          const codingAgent = new CodingAgent();
          const result = await codingAgent.run(message, {});

          if (result.success) {
            console.log(`✅ [CodingAgent] Tâche complétée (${result.iterations} itérations)`);
            socket.emit('chat:chunk', { chunk: result.response || result.summary });
            socket.emit('chat:complete', { model: 'deepseek-coder-v2', provider: 'coding-agent' });

            // Capture V2
            memoryCaptureV2.capture({
              userMessage: message,
              anaResponse: result.response || result.summary,
              model: 'coding-agent'
            }).catch(err => console.error("Memory V2 capture error (coding):", err.message));

            return;
          } else {
            console.log(`⚠️ [CodingAgent] Échec, fallback vers LLM standard:`, result.error);
          }
        } catch (codingError) {
          console.error(`❌ [CodingAgent] Erreur:`, codingError.message);
          // Continue vers le flux normal
        }
      }

      // === MÉTÉO EARLY DETECTION (AVANT tout le reste) ===
      // Détection météo en premier pour éviter qu'elle soit sautée par des erreurs
      let earlyWeatherData = null;
      const messageLower = message.toLowerCase();
      const weatherKeywords = ['météo', 'meteo', 'temps qu\'il fait', 'température', 'pluie demain', 'fera-t-il', 'quel temps'];

      if (weatherKeywords.some(kw => messageLower.includes(kw))) {
        console.log('🌤️ Web Intelligence: Détection météo (early)');
        try {
          const WebTools = require('./tools/web-tools.cjs');
          // Patterns pour extraire la ville
          const locationPatterns = [
            /météo[\s]+(?:à|a|de|du|en|pour)[\s]+([A-Z][\w\s-]+)/i,
            /temps[\s]+(?:à|a|de|du|en|pour)[\s]+([A-Z][\w\s-]+)/i,
            /température[\s]+(?:à|a|de|du|en|pour)[\s]+([A-Z][\w\s-]+)/i
          ];
          // Mots temporels à ignorer (pas des villes!)
          const temporalWords = ['demain', 'aujourd', 'hier', 'maintenant', 'actuellement', 'présentement', 'ce soir', 'ce matin', 'cette nuit', 'semaine', 'weekend'];
          let location = 'Longueuil'; // Défaut - Ana habite à Longueuil
          for (const pattern of locationPatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
              const extracted = match[1].trim().toLowerCase();
              // Vérifier que ce n'est pas un mot temporel
              if (!temporalWords.some(tw => extracted.startsWith(tw))) {
                location = match[1].trim();
                break;
              }
            }
          }
          console.log('🌤️ Météo pour:', location);
          const weatherData = await WebTools.weather(location);
          if (weatherData.success) {
            earlyWeatherData = `[DONNÉES MÉTÉO EN TEMPS RÉEL - UTILISE CES DONNÉES POUR RÉPONDRE]
Lieu: ${weatherData.location.name}, ${weatherData.location.country}
Température actuelle: ${weatherData.current.temperature}
Température ressentie: ${weatherData.current.feelsLike}
Conditions: ${weatherData.current.description}
Humidité: ${weatherData.current.humidity}
Vent: ${weatherData.current.windSpeed}`;
            console.log('✅ Météo récupérée:', weatherData.current.temperature);
            socket.emit('chat:web_search', { type: 'weather', location, success: true });
          }
        } catch (weatherError) {
          console.log('⚠️ Météo error (early):', weatherError.message);
        }
      }

      // === INTELLIGENT CONTEXT SELECTION ===
      // Use contextSelector for optimal context within token budget
      let memoryContext = '';
      let contextStats = null;

      try {
        // Collect context sources
        const sources = [];

        // 1. ChromaDB memory search (if available)
        if (memoryManager && memoryManager.initialized) {
          const memoryResults = await memoryManager.search(message, 10);
          if (memoryResults && memoryResults.length > 0) {
            sources.push({
              type: 'memory',
              data: memoryResults.map(r => ({
                content: r.document || r.content,
                metadata: r.metadata,
                timestamp: r.metadata?.timestamp
              }))
            });
          }
        }

        // 2. Session conversation context (recent exchanges)
        const sessionContext = memory.getContext();
        if (sessionContext) {
          sources.push({
            type: 'conversation',
            data: sessionContext
          });
        }

        // 3. Learned skills relevant to this task
        if (skillLearner && skillLearner.initialized) {
          const suggestions = await skillLearner.getSuggestions(message);
          if (suggestions.applicableSkills && suggestions.applicableSkills.length > 0) {
            sources.push({
              type: 'skills',
              data: suggestions.applicableSkills
            });
          }
        }


        // 4. Web Intelligence - LangChain Auto Search (NOUVEAU!)
        // Utilise LangChain + DuckDuckGo pour recherche web automatique
        if (langchainWebSearch && langchainWebSearch.initialized) {
          try {
            const webSearchResult = await langchainWebSearch.autoSearch(message);
            if (webSearchResult && webSearchResult.success) {
              console.log('🔍 LangChain Web Search: Résultats trouvés');
              sources.push({
                type: 'langchain_web',
                data: webSearchResult.formatted
              });
              socket.emit('chat:web_search', { 
                type: 'langchain', 
                query: webSearchResult.query, 
                success: true 
              });
            }
          } catch (webErr) {
            console.log('⚠️ LangChain Web Search error:', webErr.message);
          }
        }

        // 4b. Legacy Web Intelligence - Auto-detect need for internet search (fallback)
        const webKeywords = {
          weather: ['météo', 'meteo', 'temps qu\'il fait', 'température', 'pluie demain', 'fera-t-il', 'quel temps'],
          search: ['cherche sur internet', 'recherche sur le web', 'trouve-moi', 'qui est', 'qu\'est-ce que', 'c\'est quoi', 'définition de', 'wikipedia'],
          news: ['actualités', 'actualites', 'nouvelles', 'news', 'dernières infos', 'que se passe'],
          facts: ['combien', 'quel est le', 'quelle est la', 'date de', 'capitale de', 'président de', 'population de']
        };

        const messageLower = message.toLowerCase();
        let webResults = null;

        // Check for weather request
        if (webKeywords.weather.some(kw => messageLower.includes(kw))) {
          console.log('🌤️ Web Intelligence: Détection météo');
          // Extract location from message
          // Patterns améliorés pour extraire la ville (évite de capturer "fait-il", etc.)
          const locationPatterns = [
            /météo[\s]+(?:à|a|de|du|en|pour)[\s]+([A-Z][\w\s-]+)/i,        // "météo à Montréal"
            /temps[\s]+(?:à|a|de|du|en|pour)[\s]+([A-Z][\w\s-]+)/i,        // "temps à Québec"
            /température[\s]+(?:à|a|de|du|en|pour)[\s]+([A-Z][\w\s-]+)/i,  // "température à Longueuil"
            /(?:à|a|de|du|en|pour)[\s]+([A-Z][\w\s-]+)[\s]*\?/i           // "météo de Paris?"
          ];
          let location = 'Longueuil'; // Default - Ana habite à Longueuil avec ALAIN
          for (const pattern of locationPatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
              location = match[1].trim();
              break;
            }
          }
          try {
            const weatherData = await WebTools.weather(location);
            if (weatherData.success) {
              webResults = {
                type: 'weather',
                data: weatherData,
                summary: `Météo ${weatherData.location.name}: ${weatherData.current.temperature}, ${weatherData.current.description}`
              };
              sources.push({
                type: 'web_weather',
                data: `[DONNÉES MÉTÉO EN TEMPS RÉEL]
Lieu: ${weatherData.location.name}, ${weatherData.location.country}
Température: ${weatherData.current.temperature} (ressenti: ${weatherData.current.feelsLike})
Conditions: ${weatherData.current.description}
Humidité: ${weatherData.current.humidity}
Vent: ${weatherData.current.windSpeed} ${weatherData.current.windDirection}`
              });
              socket.emit('chat:web_search', { type: 'weather', location, success: true });
            }
          } catch (e) {
            console.log('⚠️ Weather fetch error:', e.message);
          }
        }
        // Check for general search request
        else if (webKeywords.search.some(kw => messageLower.includes(kw)) ||
                 webKeywords.facts.some(kw => messageLower.includes(kw))) {
          console.log('🔍 Web Intelligence: Détection recherche web');
          try {
            const searchQuery = message.replace(/cherche sur internet|recherche sur le web|trouve-moi|c'est quoi|qu'est-ce que/gi, '').trim();
            const searchData = await WebTools.search(searchQuery);
            if (searchData.success && (searchData.abstract || searchData.answer || searchData.relatedTopics?.length > 0)) {
              let searchSummary = '';
              if (searchData.answer) searchSummary += searchData.answer + '\n';
              if (searchData.abstract) searchSummary += searchData.abstract + '\n';
              if (searchData.relatedTopics?.length > 0) {
                searchSummary += 'Sujets liés: ' + searchData.relatedTopics.slice(0, 3).map(t => t.text).join('; ');
              }
              sources.push({
                type: 'web_search',
                data: `[RÉSULTATS RECHERCHE WEB]
${searchSummary}`
              });
              socket.emit('chat:web_search', { type: 'search', query: searchQuery, success: true });
            }
          } catch (e) {
            console.log('⚠️ Web search error:', e.message);
          }
        }



        // 5. File Intelligence - Auto-detect file operations
        const fileKeywords = ['lis le fichier', 'ouvre le fichier', 'montre-moi le fichier', 'contenu de', 'affiche le fichier', 'read file'];
        if (fileKeywords.some(kw => messageLower.includes(kw))) {
          console.log('📁 Tools Intelligence: Détection lecture fichier');
          const filePatterns = [
            /(?:lis|ouvre|montre|affiche)[\s]+(?:le|ce)?[\s]*fichier[\s]+([\w\.\/\\:-]+)/i,
            /contenu[\s]+(?:de|du)[\s]+([\w\.\/\\:-]+)/i,
            /fichier[\s]+([\w\.\/\\:-]+)/i
          ];
          for (const pattern of filePatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
              try {
                const FileTools = require('./tools/file-tools.cjs');
                const filePath = match[1].trim();
                const fileData = await FileTools.read(filePath, { limit: 100 });
                if (fileData.success) {
                  sources.push({
                    type: 'file_content',
                    data: `[CONTENU FICHIER: ${filePath}]\n${fileData.content.substring(0, 2000)}${fileData.content.length > 2000 ? '\n...(tronqué)' : ''}`
                  });
                  socket.emit('chat:tool_used', { type: 'file', path: filePath, success: true });
                }
              } catch (e) {
                console.log('⚠️ File read error:', e.message);
              }
              break;
            }
          }
        }

        // 6. Search Intelligence - Auto-detect file search
        const searchKeywords = ['trouve les fichiers', 'cherche les fichiers', 'liste les fichiers', 'quels fichiers', 'où sont les', 'find files'];
        if (searchKeywords.some(kw => messageLower.includes(kw))) {
          console.log('🔎 Tools Intelligence: Détection recherche fichiers');
          try {
            const SearchTools = require('./tools/search-tools.cjs');
            // Extract search pattern
            const searchPatterns = [
              /(?:trouve|cherche|liste)[\s]+(?:les)?[\s]*fichiers?[\s]+([\w\*\.]+)/i,
              /fichiers?[\s]+([\w\*\.]+)/i
            ];
            let searchPattern = '*.txt';
            let searchPath = 'E:/ANA';
            for (const pattern of searchPatterns) {
              const match = message.match(pattern);
              if (match && match[1]) {
                searchPattern = match[1].includes('.') ? `**/*${match[1]}` : `**/*.${match[1]}`;
                break;
              }
            }
            const searchData = await SearchTools.glob(searchPattern, { cwd: searchPath, limit: 20 });
            if (searchData.success && searchData.files?.length > 0) {
              sources.push({
                type: 'file_search',
                data: `[FICHIERS TROUVÉS: ${searchPattern}]\n${searchData.files.slice(0, 15).join('\n')}${searchData.files.length > 15 ? '\n...(+' + (searchData.files.length - 15) + ' autres)' : ''}`
              });
              socket.emit('chat:tool_used', { type: 'search', pattern: searchPattern, count: searchData.files.length });
            }
          } catch (e) {
            console.log('⚠️ Search error:', e.message);
          }
        }

        // 7. Git Intelligence - Auto-detect git operations (read-only by default)
        const gitKeywords = ['status git', 'état du repo', 'git status', 'commits récents', 'historique git', 'derniers commits'];
        if (gitKeywords.some(kw => messageLower.includes(kw))) {
          console.log('📦 Tools Intelligence: Détection Git status');
          try {
            const GitTools = require('./tools/git-tools.cjs');
            const repoPath = 'E:/ANA'; // Default repo
            const gitStatus = await GitTools.status(repoPath);
            if (gitStatus.success) {
              sources.push({
                type: 'git_status',
                data: `[GIT STATUS: ${repoPath}]
Branche: ${gitStatus.current || 'N/A'}
Fichiers modifiés: ${gitStatus.modified?.length || 0}
Fichiers non suivis: ${gitStatus.not_added?.length || 0}
En avance de: ${gitStatus.ahead || 0} commits`
              });
              socket.emit('chat:tool_used', { type: 'git', action: 'status', success: true });
            }
          } catch (e) {
            console.log('⚠️ Git error:', e.message);
          }
        }

        // 8. Web Browser Intelligence - Auto-detect URL fetch requests
        const urlPattern = /(https?:\/\/[^\s]+)/i;
        const browserKeywords = ['va sur', 'ouvre la page', 'lis cette page', 'visite', 'contenu de http', 'fetch url'];
        const urlMatch = message.match(urlPattern);
        if (urlMatch || browserKeywords.some(kw => messageLower.includes(kw))) {
          console.log('🌐 Tools Intelligence: Détection navigation web');
          try {
            const url = urlMatch ? urlMatch[1] : null;
            if (url) {
              const WebBrowser = require('./tools/web_browser.cjs');
              const pageData = await WebBrowser.fetch(url, { extractText: true, maxLength: 3000 });
              if (pageData.success) {
                sources.push({
                  type: 'web_page',
                  data: `[PAGE WEB: ${url}]
Titre: ${pageData.title || 'N/A'}
${pageData.text?.substring(0, 2000) || pageData.content?.substring(0, 2000) || 'Contenu non extrait'}`
                });
                socket.emit('chat:tool_used', { type: 'browser', url, success: true });
              }
            }
          } catch (e) {
            console.log('⚠️ Browser error:', e.message);
          }
        }

        // 9. Bash Intelligence - Auto-detect system commands (safe commands only)
        const bashKeywords = ['exécute la commande', 'lance la commande', 'run command', 'execute'];
        const safeCommands = ['dir', 'ls', 'pwd', 'whoami', 'date', 'time', 'hostname', 'ipconfig', 'systeminfo'];
        if (bashKeywords.some(kw => messageLower.includes(kw))) {
          console.log('💻 Tools Intelligence: Détection commande système');
          // Extract command
          const cmdMatch = message.match(/(?:exécute|lance|run|execute)[\s]+(?:la)?[\s]*commande[\s]+[`"']?([^`"']+)[`"']?/i);
          if (cmdMatch && cmdMatch[1]) {
            const cmd = cmdMatch[1].trim().split(' ')[0].toLowerCase();
            if (safeCommands.includes(cmd)) {
              try {
                const BashTools = require('./tools/bash-tools.cjs');
                const result = await BashTools.execute(cmdMatch[1].trim(), { timeout: 5000 });
                if (result.success) {
                  sources.push({
                    type: 'bash_output',
                    data: `[COMMANDE: ${cmdMatch[1]}]\n${result.stdout?.substring(0, 1500) || 'Pas de sortie'}`
                  });
                  socket.emit('chat:tool_used', { type: 'bash', command: cmdMatch[1], success: true });
                }
              } catch (e) {
                console.log('⚠️ Bash error:', e.message);
              }
            } else {
              console.log('⚠️ Bash: Commande non autorisée:', cmd);
            }
          }
        }



        // 10. Skills Intelligence - SEMANTIC SEARCH across all skills (Phase 2 - 30 Nov 2025)
        // Uses skillLearner.searchSkills() to find relevant skills by content, not just filename
        try {
          // Extract key terms from message for search
          const searchTerms = messageLower
            .split(/\s+/)
            .filter(w => w.length > 3)
            .slice(0, 5); // Max 5 terms

          const loadedSkills = [];
          const usedCategories = new Set();

          // Search skills for each term
          for (const term of searchTerms) {
            const results = skillLearner.searchSkills(term, 20);

            for (const skill of results) {
              // Avoid duplicates and limit per category
              const category = skill.category || skill.sourceFile || 'general';
              if (usedCategories.has(skill.id)) continue;

              // Max 5 skills per category
              const catCount = loadedSkills.filter(s => s.category === category).length;
              if (catCount >= 5) continue;

              usedCategories.add(skill.id);
              loadedSkills.push({
                ...skill,
                category
              });

              // Max 15 skills total to avoid context overflow
              if (loadedSkills.length >= 15) break;
            }
            if (loadedSkills.length >= 15) break;
          }

          if (loadedSkills.length > 0) {
            // Format skills for context
            const skillsByCategory = {};
            for (const skill of loadedSkills) {
              if (!skillsByCategory[skill.category]) {
                skillsByCategory[skill.category] = [];
              }
              skillsByCategory[skill.category].push(
                `- ${skill.name}: ${skill.description}${skill.pattern ? ' (Pattern: ' + skill.pattern + ')' : ''}`
              );
            }

            const formattedSkills = Object.entries(skillsByCategory)
              .map(([cat, skills]) => `[SKILLS: ${cat}]\n${skills.join('\n')}`)
              .join('\n\n');

            sources.push({
              type: 'skills_knowledge',
              data: formattedSkills
            });

            const categories = [...new Set(loadedSkills.map(s => s.category))];
            console.log(`📚 Skills Intelligence: ${loadedSkills.length} skills trouvés (${categories.slice(0, 3).join(', ')}${categories.length > 3 ? '...' : ''})`);

            socket.emit('chat:skills_loaded', {
              modules: categories.slice(0, 5),
              count: loadedSkills.length,
              source: loadedSkills[0]?.source || 'mixed'
            });
          }
        } catch (e) {
          console.log('⚠️ Skills Intelligence error:', e.message);
        }


        // Build optimized context with token budget
        const contextResult = await contextSelector.buildContext(message, sources, {
          model: model,
          tokenBudget: 4000,  // Reserve tokens for context
          diversitySources: true,
          minRelevance: 0.25
        });

        memoryContext = contextResult.context;
        contextStats = contextResult.stats;

        if (contextStats && contextStats.selectedCount > 0) {
          console.log(`📋 Context selected: ${contextStats.selectedCount}/${contextStats.candidatesCount} items (${contextStats.totalTokens} tokens)`);
        }
      } catch (contextError) {
        // Fallback to simple memory context
        console.log('⚠️ Context selection fallback:', contextError.message);
        memoryContext = memory.getContext();
      }

      const systemInstruction = "Tu es Ana, une IA locale française. Réponds TOUJOURS en français. Sois précise et technique.\n\n";
      const fullPrompt = memoryContext
        ? `${systemInstruction}${memoryContext}\n\nAlain: ${message}\nAna (réponds en français):`
        : `${systemInstruction}Alain: ${message}\nAna (réponds en français):`;

      // Détecter si vision model (pour utiliser /api/chat au lieu de /api/generate)
      // Source: https://docs.ollama.com/capabilities/vision
      const isVisionModel = images && images.length > 0;
      let response;

      if (isVisionModel) {
        // Vision: Utiliser /api/chat avec format messages + images
        response = await axios.post(`${OLLAMA_URL}/api/chat`, {
          model: model,
          messages: [
            {
              role: 'user',
              content: fullPrompt,
              images: images  // Tableau base64 strings (sans préfixe data:image)
            }
          ],
          stream: true
        }, {
          responseType: 'stream'
        });
      } else {
        // Texte: Utiliser /api/chat avec messages structurés (best practice)
        const messages = [
          { role: 'system', content: currentSystemPrompt }
        ];

        // Ajouter données météo en temps réel si disponibles (PRIORITÉ HAUTE)
        if (earlyWeatherData) {
          messages.push({
            role: 'system',
            content: earlyWeatherData
          });
          console.log('📤 Données météo injectées dans le contexte LLM');
        }

        // Ajouter contexte mémoire (conversation history)
        if (memoryContext) {
          // Séparer les données temps réel (météo, web) du contexte historique
          const realtimeDataMatch = memoryContext.match(/\[DONNÉES MÉTÉO EN TEMPS RÉEL\][\s\S]*?(?=\[|$)/);
          const webSearchMatch = memoryContext.match(/\[RÉSULTATS RECHERCHE WEB\][\s\S]*?(?=\[|$)/);

          // Si données temps réel, les mettre en premier comme instruction
          if (realtimeDataMatch || webSearchMatch) {
            let realtimeContext = '';
            if (realtimeDataMatch) realtimeContext += realtimeDataMatch[0].trim() + '\n';
            if (webSearchMatch) realtimeContext += webSearchMatch[0].trim();

            messages.push({
              role: 'system',
              content: `DONNÉES EN TEMPS RÉEL (utilise ces informations pour répondre):\n${realtimeContext}`
            });
          }

          // Le reste du contexte comme historique
          const cleanContext = memoryContext
            .replace(/\[DONNÉES MÉTÉO EN TEMPS RÉEL\][\s\S]*?(?=\[|$)/, '')
            .replace(/\[RÉSULTATS RECHERCHE WEB\][\s\S]*?(?=\[|$)/, '')
            .trim();

          if (cleanContext) {
            messages.push({ role: 'assistant', content: `Contexte de nos conversations précédentes:\n${cleanContext}` });
          }
        }

        // Message actuel de l'utilisateur
        messages.push({ role: 'user', content: message });

        response = await axios.post(`${OLLAMA_URL}/api/chat`, {
          model: model,
          messages: messages,
          stream: true
        }, {
          responseType: 'stream'
        });
      }

      // Handle streaming avec bufferisation
      let fullResponse = '';
      let jsonBuffer = '';

      response.data.on('data', (chunk) => {
        // Ajouter au buffer
        jsonBuffer += chunk.toString();

        // Détecter lignes complètes (séparées par \n)
        let boundary = jsonBuffer.lastIndexOf('\n');
        if (boundary !== -1) {
          // Extraire les lignes complètes
          const completeLines = jsonBuffer.substring(0, boundary);
          // Garder le reste pour le prochain chunk
          jsonBuffer = jsonBuffer.substring(boundary + 1);

          // Parser chaque ligne complète
          completeLines.split('\n').forEach(line => {
            if (!line.trim()) return; // Ignorer lignes vides

            try {
              const json = JSON.parse(line);

              // Support deux formats API Ollama:
              // - /api/generate: json.response
              // - /api/chat (vision): json.message.content
              // Source: https://docs.ollama.com/capabilities/vision
              const content = json.response || json.message?.content;

              // Émettre uniquement si content existe ET que ce n'est pas le message final done:true
              if (content && json.done !== true) {
                fullResponse += content;
                console.log('📤 Backend emit chunk:', content);
                socket.emit('chat:chunk', { chunk: content });
              } else if (json.done === true) {
                console.log('✅ Stream terminé (done:true)');
              }
            } catch (e) {
              console.log('⚠️ Parse warning:', e.message);
            }
          });
        }
      });

      response.data.on('end', async () => {
        // Apply French spell correction to Ana's response
        const correctedResponse = spellChecker.correctText(fullResponse);

        memory.appendToContext(`Alain: ${message}\nAna (${model}): ${correctedResponse}`);
        socket.emit('chat:complete', { response: correctedResponse, model });
        console.log(`✅ Response complete: ${correctedResponse.length} chars (spell-checked)`);

        // === CODE INJECTION INTO EDITOR ===
        // Detect code blocks in Ana's response and inject them into the Coding page editor
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        const codeBlocks = [];

        while ((match = codeBlockRegex.exec(correctedResponse)) !== null) {
          const detectedLang = match[1] || 'javascript';
          const code = match[2].trim();
          if (code.length > 10) { // Only inject meaningful code blocks
            codeBlocks.push({ language: detectedLang, code });
          }
        }

        if (codeBlocks.length > 0) {
          // Inject the largest code block (most likely the main program)
          const mainBlock = codeBlocks.reduce((a, b) => a.code.length > b.code.length ? a : b);
          socket.emit('coding:inject', {
            code: mainBlock.code,
            language: mainBlock.language,
            source: 'ana-chat'
          });
          console.log(`📝 Code injected to editor: ${mainBlock.language} (${mainBlock.code.length} chars)`);
        }

        // Capture in V3 memory system (##Ana)
        try {
          const captureResult = await memoryCapture.capture({
            userMessage: message,
            anaResponse: correctedResponse,
            model: model,
            metadata: {
              images: images ? images.length : 0,
              context: context || {}
            }
          });

          if (captureResult.success) {
            console.log('💾 Memory captured:',
              `V1=${captureResult.v1?.success ? '✅' : '❌'}`,
              `V2=${captureResult.v2?.success ? '✅' : '❌'}`
            );
          } else {
            console.warn('⚠️ Memory capture failed:', captureResult.error);
          }
        } catch (captureError) {
          console.error('❌ Memory capture error:', captureError.message);
          // Don't crash if memory capture fails - Ana still works
        }

        // V2: Capture to dedicated Ana memory (E:\ANA\memory\)
        try {
          const captureV2Result = await memoryCaptureV2.capture({
            userMessage: message,
            anaResponse: correctedResponse,
            model: model,
            metadata: {
              images: images ? images.length : 0,
              context: context || {}
            }
          });

          if (captureV2Result.success) {
            console.log('💾 Memory V2 captured:',
              `Text=${captureV2Result.text?.success ? '✅' : '❌'}`,
              `Stage=${captureV2Result.stage?.success ? '✅' : '❌'}`
            );
          }
        } catch (captureV2Error) {
          console.error('❌ Memory V2 capture error:', captureV2Error.message);
        }

        // Capture in ChromaDB for semantic search
        try {
          const chromaResult = await memoryManager.addConversation({
            userMessage: message,
            anaResponse: correctedResponse,
            model: model,
            metadata: {
              images: images ? images.length : 0,
              context: context || {}
            }
          });

          if (chromaResult.success) {
            console.log('🔍 ChromaDB captured:',
              `ID=${chromaResult.exchangeId}`,
              `Chunks=${chromaResult.chunksCount}`
            );
          }
        } catch (chromaError) {
          console.error('❌ ChromaDB capture error:', chromaError.message);
          // Don't crash if ChromaDB fails - Ana still works
        }

        // Store in Tiered Memory (3-level architecture)
        // Primary (session) + Secondary (recent) + Tertiary (archive)
        try {
          await tieredMemory.addExchange({
            userMessage: message,
            anaResponse: correctedResponse,
            model: model
          });
          console.log('🧬 Tiered Memory updated (Primary → Secondary)');
        } catch (tieredError) {
          console.log('⚠️ Tiered Memory update skipped:', tieredError.message);
        }

        // Auto-extract skills from conversation (background, non-blocking)
        // Source: Self-improving AI agent pattern
        skillLearner.extractSkillsFromConversation({
          userMessage: message,
          anaResponse: correctedResponse,
          model: model,
          success: true
        }).then(extractResult => {
          if (extractResult.success && extractResult.extracted > 0) {
            console.log(`🧠 Skills extracted: ${extractResult.extracted} new skills learned`);
          }
        }).catch(skillError => {
          // Silent fail - skill learning is optional
          console.log('⚠️ Skill extraction skipped:', skillError.message);
        });

      });

      response.data.on('error', (err) => {
        console.error('❌ Stream error:', err);
        socket.emit('chat:error', { error: err.message });
      });

    } catch (error) {
      console.error('❌ Chat error:', error);
      socket.emit('chat:error', { error: error.message });
    }
  });

  // Stats request
  socket.on('stats:request', () => {
    socket.emit('stats:update', {
      llm_usage: router.stats,
      memory: memory.getStats(),
      active_model: router.activeModel
    });

  // Coding Agent - Real-time task execution
  socket.on('coding:run', async (data, callback) => {
    const { task, context, dryRun } = data;

    if (!task) {
      if (callback) callback({ success: false, error: 'Task required' });
      return;
    }

    try {
      console.log('🤖 [WebSocket] Coding Agent task:', task.substring(0, 100));

      // Émettre le début
      socket.emit('coding:started', { task: task.substring(0, 100), timestamp: new Date().toISOString() });

      const agent = new CodingAgent({ dryRun: dryRun || false });
      const result = await agent.run(task, context || {});

      // Émettre les actions effectuées
      if (result.actions && result.actions.length > 0) {
        result.actions.forEach((action, index) => {
          socket.emit('coding:action', {
            index,
            total: result.actions.length,
            tool: action.tool,
            success: action.result?.success,
            timestamp: action.timestamp
          });
        });
      }

      // Émettre le résultat final
      socket.emit('coding:completed', result);

      if (callback) callback(result);
    } catch (error) {
      console.error('❌ [WebSocket] Coding Agent error:', error.message);
      const errorResult = { success: false, error: error.message };
      socket.emit('coding:error', errorResult);
      if (callback) callback(errorResult);
    }
  });


  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Client déconnecté:', socket.id, '- Raison:', reason);
  });
});

// Log Socket.IO errors
io.on('error', (error) => {
  console.error('❌ Erreur Socket.IO:', error);
});

// ================== STARTUP VALIDATION ==================
// Best practice: Validate dependencies before starting server
// Sources: Production-ready Node.js patterns

async function validateDependencies() {
  const errors = [];

  // 1. Check Ollama connectivity
  try {
    await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    console.log('✅ Ollama connected');
  } catch (error) {
    errors.push(`Ollama not reachable at ${OLLAMA_URL}: ${error.message}`);
  }

  // 2. Check memory path accessibility
  try {
    if (!fs.existsSync(MEMORY_PATH)) {
      errors.push(`Memory path does not exist: ${MEMORY_PATH}`);
    } else {
      // Test write permission
      const testFile = path.join(MEMORY_PATH, '.ana_write_test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ Memory path accessible');
    }
  } catch (error) {
    errors.push(`Memory path not writable: ${error.message}`);
  }

  // 3. Check required modules
  const requiredModules = ['express', 'socket.io', 'axios', 'cors'];
  for (const mod of requiredModules) {
    try {
      require.resolve(mod);
    } catch (error) {
      errors.push(`Required module missing: ${mod}`);
    }
  }
  if (errors.length === 0) {
    console.log('✅ All required modules present');
  }

  return errors;
}

// ================== START SERVER ==================
async function startServer() {
  console.log('\n🔍 Validating dependencies...\n');

  const validationErrors = await validateDependencies();

  if (validationErrors.length > 0) {
    console.error('\n❌ STARTUP VALIDATION FAILED:\n');
    validationErrors.forEach((err, i) => console.error(`   ${i + 1}. ${err}`));
    console.error('\n⚠️ Cannot start server. Fix issues above and retry.\n');
    process.exit(1);
  }

  console.log('\n✅ All validations passed\n');

  // Initialize Daily Art Generator
  console.log('🎨 Initializing Daily Art Generator...');
  dailyArtGenerator.initialize().then(result => {
    if (result.success) {
      console.log('✅ Daily Art Generator ready (8:00 AM schedule)');
    }
  });

  // Initialize Research Agent
  console.log('🔍 Initializing Research Agent...');
  researchAgent.initialize().then(result => {
    if (result.success) {
      console.log('✅ Research Agent ready');
    } else {
      console.error('⚠️ Research Agent initialization failed');
    }
  });

  // Initialize VRAM Manager
  console.log('🎮 Initializing VRAM Manager...');
  vramManager.initialize().then(result => {
    if (result.success) {
      console.log('✅ VRAM Manager ready (max 2 LLMs, 5min idle timeout)');
    } else {
      console.error('⚠️ VRAM Manager initialization failed');
    }
  });

  // Initialize Multi-LLM Orchestrator
  console.log('🎯 Initializing Multi-LLM Orchestrator...');
  orchestrator.initialize().then(result => {
    if (result.success) {
      console.log('✅ Orchestrator ready with models:', Object.keys(result.modelStatus).filter(k => result.modelStatus[k] === 'available').join(', '));
    } else {
      console.error('⚠️ Orchestrator initialization failed:', result.error);
    }
  });

  // Initialize n8n Integration
  console.log('🔗 Initializing n8n Integration...');
  n8nIntegration.initialize().then(result => {
    if (result.success) {
      console.log(`✅ n8n Integration ready (${result.webhooksCount} webhooks)`);
    } else {
      console.log('⚠️ n8n not available (start with: n8n start)');
    }
  });

  // Initialize French Spell Checker
  console.log('📝 Initializing French Spell Checker...');
  spellChecker.initialize().then(() => {
    console.log('✅ French Spell Checker ready');
  }).catch(err => {
    console.log('⚠️ Spell Checker not available:', err.message);
  });

  // Initialize Skill Learner (Self-Improvement System)
  console.log('🧠 Initializing Skill Learner...');
  skillLearner.initialize().then(result => {
    if (result.success) {
      console.log('✅ Skill Learner ready (self-improvement enabled)');
    } else {
      console.log('⚠️ Skill Learner initialization failed:', result.error);
    }
  });

  // Initialize Semantic Router (Intelligent Task Classification)
  console.log('🎯 Initializing Semantic Router...');
  semanticRouter.initialize().then(result => {
    if (result.success) {
      console.log('✅ Semantic Router ready (embedding-based routing)');
    } else {
      console.log('⚠️ Semantic Router fallback to keywords:', result.error);
    }
  });

  // Initialize Context Selector (Intelligent Context Management)
  console.log('📋 Initializing Context Selector...');
  contextSelector.initialize().then(result => {
    if (result.success) {
      console.log('✅ Context Selector ready (token budget optimization)');
    } else {
      console.log('⚠️ Context Selector initialization failed:', result.error);
    }
  });

  // Initialize Tiered Memory (3-Level Memory Architecture)
  console.log('🧬 Initializing Tiered Memory System...');
  tieredMemory.initialize().then(result => {
    if (result.success) {
      console.log('✅ Tiered Memory ready (Primary/Secondary/Tertiary)');
    } else {
      console.log('⚠️ Tiered Memory initialization failed:', result.error);
    }
  });

  server.listen(PORT, () => {
    console.log('🤖 ============================================');
    console.log('   ANA CORE - Backend Orchestrator');
    console.log('   SUPERIA ANA - Super IA Locale');
    console.log('============================================');
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`💾 Memory path: ${MEMORY_PATH}`);
    console.log(`🧠 Configured LLMs:`);
    console.log(`   - Phi-3 Mini: ${LLMS.PHI3}`);
    console.log(`   - DeepSeek Coder: ${LLMS.DEEPSEEK}`);
    console.log(`   - Qwen Coder: ${LLMS.QWEN}`);
    console.log(`   - Llama Vision: ${LLMS.LLAMA_VISION}`);
    console.log('============================================\n');
  }).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use`);
      console.error('⚠️ Another Ana instance or service is running on this port\n');
      process.exit(1);
    } else {
      console.error('\n❌ Server startup error:', error.message, '\n');
      process.exit(1);
    }
  });
}

// Start server with validation
startServer().catch((error) => {
  console.error('\n❌ Fatal startup error:', error);
  process.exit(1);
});

// ================== PROCESS-LEVEL ERROR HANDLERS ==================
// Best practice: Fail-fast philosophy with proper logging
// Sources: Heroku Node.js best practices, Better Stack patterns

// Uncaught Exception Handler
process.on('uncaughtException', (error) => {
  console.error('\n💥 UNCAUGHT EXCEPTION - FATAL ERROR');
  console.error('Error:', error.name);
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  console.error('\n⚠️ Application state is corrupted. Exiting...\n');

  // Save memory before crash
  try {
    memory.saveContext();
    console.log('✅ Memory saved before exit');
  } catch (saveError) {
    console.error('❌ Failed to save memory:', saveError.message);
  }

  // Exit with error code (process manager will restart)
  process.exit(1);
});

// Unhandled Promise Rejection Handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 UNHANDLED PROMISE REJECTION');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('\n⚠️ This will become a fatal error in future Node.js versions');
  console.error('⚠️ Application state may be corrupted. Exiting...\n');

  // Save memory before crash
  try {
    memory.saveContext();
    console.log('✅ Memory saved before exit');
  } catch (saveError) {
    console.error('❌ Failed to save memory:', saveError.message);
  }

  // Exit with error code
  process.exit(1);
});

// Graceful shutdown on SIGINT
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt Ana Core (SIGINT)...');
  memory.saveContext();
  console.log('✅ Memory saved');
  process.exit(0);
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  console.log('\n👋 Arrêt Ana Core (SIGTERM)...');
  memory.saveContext();
  console.log('✅ Memory saved');
  process.exit(0);
});
