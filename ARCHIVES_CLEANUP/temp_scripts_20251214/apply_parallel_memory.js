/**
 * Script pour appliquer OPTIM 1 - Recherches memoire paralleles
 */
const fs = require('fs');

const file = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\r\n/g, '\n');

const old = `    // 2. Load memory context - BOTH files AND ChromaDB (FIX 2025-12-07)
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
      }`;

const replacement = `    // 2. PERF OPTIM 2025-12-08: Load memory context IN PARALLEL
    // Gain estime: 200-500ms (les deux recherches simultanées)
    const [memoryContext, chromaResults] = await Promise.all([
      Promise.resolve(memory.getContext()),
      (tieredMemory && tieredMemory.initialized)
        ? tieredMemory.search(message, { limit: 15 }).catch(err => {
            console.log('[CHROMADB] Search error:', err.message);
            return [];
          })
        : Promise.resolve([])
    ]);

    // Format ChromaDB results
    let chromaMemories = '';
    if (chromaResults && chromaResults.length > 0) {
      chromaMemories = '\\n=== MÉMOIRE PERSONNELLE CHROMADB ===\\n' +
        chromaResults.map(r => r.document || r.content).join('\\n---\\n') +
        '\\n=== FIN MÉMOIRE CHROMADB ===\\n';
      console.log('[CHROMADB] Found', chromaResults.length, 'relevant memories for:', message.substring(0, 50));`;

if (content.includes(old)) {
  content = content.replace(old, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('[OPTIM 1] Parallel memory search - APPLIED');
} else {
  console.log('[OPTIM 1] Pattern not found - checking file...');
  // Debug: show what we're looking for
  const idx = content.indexOf('// 2. Load memory context');
  if (idx > -1) {
    console.log('Found at index:', idx);
    console.log('Content around it:', content.substring(idx, idx + 200));
  } else {
    console.log('String "// 2. Load memory context" not found at all');
  }
}
