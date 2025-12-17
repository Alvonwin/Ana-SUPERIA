/**
 * Script d'optimisation tiered-memory.cjs
 * 8 Decembre 2025
 */

const fs = require('fs');

const sourceFile = 'E:/ANA/server/memory/tiered-memory.cjs.backup_20251208_perf_optim';
const targetFile = 'E:/ANA/temp/tiered-memory-optimized.cjs';

console.log('=== Tiered Memory Optimization Script ===\n');

let content = fs.readFileSync(sourceFile, 'utf8');
console.log('Source file loaded:', sourceFile);

// OPTIM 2: Lazy maintenance ChromaDB - defer to 30s after startup
const oldMaintenance = `      // Run maintenance on startup
      await this.runMaintenance();`;

const newMaintenance = `      // PERF OPTIM 2025-12-08: Lazy maintenance - defer 30s after startup
      // Gain estime: 500ms-1s au demarrage
      setTimeout(() => {
        this.runMaintenance().catch(err => {
          console.log('[TieredMemory] Background maintenance error:', err.message);
        });
      }, 30000);  // 30 seconds delay`;

if (content.includes(oldMaintenance)) {
  content = content.replace(oldMaintenance, newMaintenance);
  console.log('[OPTIM 2] Lazy ChromaDB maintenance - APPLIED');
} else {
  console.log('[OPTIM 2] Maintenance pattern not found - SKIPPED');
}

// OPTIM 3: Batch embeddings via /api/embed (single request instead of loop)
const oldEmbedder = `  async generate(texts) {
    const embeddings = [];
    for (const text of texts) {
      try {
        const response = await axios.post(\`\${OLLAMA_URL}/api/embeddings\`, {
          model: this.model,
          prompt: text
        }, { timeout: 30000 });
        embeddings.push(response.data.embedding);
      } catch (error) {
        console.error('[OllamaEmbedder] Error:', error.message);
        // Return zero vector as fallback
        embeddings.push(new Array(768).fill(0));
      }
    }
    return embeddings;
  }`;

const newEmbedder = `  async generate(texts) {
    // PERF OPTIM 2025-12-08: Batch embeddings via /api/embed
    // Gain estime: 50-200ms (single HTTP request instead of N)
    try {
      // Use /api/embed which supports batch input
      const response = await axios.post(\`\${OLLAMA_URL}/api/embed\`, {
        model: this.model,
        input: texts  // Batch all texts in one request
      }, { timeout: 60000 });

      // api/embed returns { embeddings: [[...], [...], ...] }
      if (response.data.embeddings && Array.isArray(response.data.embeddings)) {
        console.log(\`[OllamaEmbedder] Batch embedded \${texts.length} texts in one request\`);
        return response.data.embeddings;
      }

      // Fallback: old sequential method if batch format not returned
      console.log('[OllamaEmbedder] Batch response format unexpected, falling back to sequential');
      return this.generateSequential(texts);
    } catch (error) {
      console.error('[OllamaEmbedder] Batch error:', error.message, '- falling back to sequential');
      return this.generateSequential(texts);
    }
  }

  // Fallback sequential method
  async generateSequential(texts) {
    const embeddings = [];
    for (const text of texts) {
      try {
        const response = await axios.post(\`\${OLLAMA_URL}/api/embeddings\`, {
          model: this.model,
          prompt: text
        }, { timeout: 30000 });
        embeddings.push(response.data.embedding);
      } catch (error) {
        console.error('[OllamaEmbedder] Error:', error.message);
        embeddings.push(new Array(768).fill(0));
      }
    }
    return embeddings;
  }`;

if (content.includes('for (const text of texts)')) {
  content = content.replace(oldEmbedder, newEmbedder);
  console.log('[OPTIM 3] Batch embeddings - APPLIED');
} else {
  console.log('[OPTIM 3] Embedder pattern not found - SKIPPED');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('\nOptimized file written to:', targetFile);
console.log('\n=== Tiered Memory Optimization Complete ===');
