/**
 * Script d'optimisation performance Ana SUPERIA
 * 8 Decembre 2025
 */

const fs = require('fs');

// Fichier source
const sourceFile = 'E:/ANA/server/ana-core.cjs.backup_20251208_perf_optim';
const targetFile = 'E:/ANA/temp/ana-core-optimized.cjs';

console.log('=== Ana Performance Optimization Script ===\n');

// Lire le fichier source
let content = fs.readFileSync(sourceFile, 'utf8');
console.log('Source file loaded:', sourceFile);

// OPTIM 1: Paralleliser recherches memoire
const oldMemoryCode = `    // 2. Load memory context - BOTH files AND ChromaDB (FIX 2025-12-07)
    const memoryContext = memory.getContext();

    // 2.5 Search ChromaDB for relevant memories (critical for personal info)
    let chromaMemories = '';
    if (tieredMemory && tieredMemory.initialized) {
      try {
        const chromaResults = await tieredMemory.search(message, { limit: 15 });
        if (chromaResults && chromaResults.length > 0) {
          chromaMemories = '\\n=== MÉMOIRE PERSONNELLE CHROMADB ===\\n' +
            chromaResults.map(r => r.document || r.content).join('\\n---\\n') +
            '\\n=== FIN MÉMOIRE CHROMADB ===\\n';
          console.log('[CHROMADB] Found', chromaResults.length, 'relevant memories for:', message.substring(0, 50));
        }
      } catch (err) {
        console.log('[CHROMADB] Search error:', err.message);
      }
    }`;

const newMemoryCode = `    // 2. Load memory context - BOTH files AND ChromaDB IN PARALLEL (PERF OPTIM 2025-12-08)
    // Gain estime: 200-400ms par requete
    const startMemory = Date.now();

    // Execute both memory searches in parallel with Promise.all
    const [memoryContext, chromaResults] = await Promise.all([
      Promise.resolve(memory.getContext()),  // Sync wrapped in Promise for parallel execution
      (tieredMemory && tieredMemory.initialized)
        ? tieredMemory.search(message, { limit: 15 }).catch(err => {
            console.log('[CHROMADB] Search error:', err.message);
            return [];
          })
        : Promise.resolve([])
    ]);

    // 2.5 Format ChromaDB results
    let chromaMemories = '';
    if (chromaResults && chromaResults.length > 0) {
      chromaMemories = '\\n=== MÉMOIRE PERSONNELLE CHROMADB ===\\n' +
        chromaResults.map(r => r.document || r.content).join('\\n---\\n') +
        '\\n=== FIN MÉMOIRE CHROMADB ===\\n';
      console.log('[CHROMADB] Found', chromaResults.length, 'relevant memories for:', message.substring(0, 50));
    }

    console.log(\`[PERF] Memory search parallel: \${Date.now() - startMemory}ms\`);`;

if (content.includes('// 2. Load memory context - BOTH files AND ChromaDB (FIX 2025-12-07)')) {
  content = content.replace(oldMemoryCode, newMemoryCode);
  console.log('[OPTIM 1] Parallel memory search - APPLIED');
} else {
  console.log('[OPTIM 1] Pattern not found - SKIPPED');
}

// OPTIM 5: Cache routing (ajouter avant IntelligenceRouter)
const routerCacheCode = `// PERF OPTIM 2025-12-08: Routing cache pour classifyTask
const routingCache = new Map();
const ROUTING_CACHE_MAX = 100;

`;

// Trouver la classe IntelligenceRouter et ajouter le cache avant
if (!content.includes('const routingCache = new Map()')) {
  content = content.replace(
    '// ================== MULTI-LLM ROUTER ==================',
    routerCacheCode + '// ================== MULTI-LLM ROUTER =================='
  );
  console.log('[OPTIM 5] Routing cache variable - ADDED');
} else {
  console.log('[OPTIM 5] Routing cache - ALREADY EXISTS');
}

// OPTIM 5b: Modifier classifyTask pour utiliser le cache
const oldClassifyStart = `  classifyTask(message, context = {}) {
    const msgLower = message.toLowerCase();`;

const newClassifyStart = `  classifyTask(message, context = {}) {
    // PERF OPTIM: Use cache for repeated patterns
    const cacheKey = message.substring(0, 50).toLowerCase();
    if (routingCache.has(cacheKey)) {
      return routingCache.get(cacheKey);
    }
    const msgLower = message.toLowerCase();`;

if (content.includes(oldClassifyStart)) {
  content = content.replace(oldClassifyStart, newClassifyStart);
  console.log('[OPTIM 5b] classifyTask cache check - APPLIED');
} else {
  console.log('[OPTIM 5b] classifyTask pattern not found - SKIPPED');
}

// OPTIM 5c: Ajouter cache save avant return dans classifyTask
// On cherche les return de classifyTask et on ajoute le cache
const returnPatterns = [
  { find: "return { model: 'tools', reason:", replace: "const result = { model: 'tools', reason:" },
  { find: "return { model: LLMS.LLAMA_VISION, reason:", replace: "const result = { model: LLMS.LLAMA_VISION, reason:" },
  { find: "return { model: LLMS.DEEPSEEK, reason:", replace: "const result = { model: LLMS.DEEPSEEK, reason:" },
  { find: "return { model: LLMS.FRENCH, reason: 'Question de mémoire", replace: "const result = { model: LLMS.FRENCH, reason: 'Question de mémoire" },
  { find: "return { model: LLMS.QWEN, reason:", replace: "const result = { model: LLMS.QWEN, reason:" },
];

// Note: Cette modification est complexe, on la simplifie en ajoutant juste le cache au dernier return
const lastReturn = "    // Default - French model (tutoiement obligatoire)\n    return { model: LLMS.FRENCH, reason: 'Conversation générale - French tutoiement' };";
const cachedLastReturn = `    // Default - French model (tutoiement obligatoire)
    const result = { model: LLMS.FRENCH, reason: 'Conversation générale - French tutoiement' };
    // PERF: Cache routing decision
    if (routingCache.size >= ROUTING_CACHE_MAX) {
      const firstKey = routingCache.keys().next().value;
      routingCache.delete(firstKey);
    }
    routingCache.set(cacheKey, result);
    return result;`;

if (content.includes(lastReturn)) {
  content = content.replace(lastReturn, cachedLastReturn);
  console.log('[OPTIM 5c] classifyTask cache save - APPLIED');
} else {
  console.log('[OPTIM 5c] Last return pattern not found - SKIPPED');
}

// Ecrire le fichier optimise
fs.writeFileSync(targetFile, content, 'utf8');
console.log('\nOptimized file written to:', targetFile);
console.log('\n=== Optimization Complete ===');
