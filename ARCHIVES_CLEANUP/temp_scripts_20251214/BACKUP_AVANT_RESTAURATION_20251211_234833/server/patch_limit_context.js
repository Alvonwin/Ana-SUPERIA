// Patch script to add context size limit to MemoryManager
// Limite le contexte à MAX_CONTEXT_KB pour éviter de surcharger le LLM
const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched with limit
if (content.includes('MAX_CONTEXT_KB')) {
  console.log('ALREADY PATCHED: Context limit is already present');
  process.exit(0);
}

// Find and replace the getContext method
const oldGetContext = `getContext() {
    return this.currentContext;
  }`;

const newGetContext = `getContext(maxKB = 50) {
    // Limite le contexte aux derniers maxKB KB pour ne pas surcharger le LLM
    const MAX_CONTEXT_KB = maxKB;
    const maxBytes = MAX_CONTEXT_KB * 1024;

    if (this.currentContext.length <= maxBytes) {
      return this.currentContext;
    }

    // Tronquer au début pour garder les messages les plus récents
    const truncated = this.currentContext.slice(-maxBytes);

    // Trouver le premier marqueur de message complet (## ou ===)
    const firstMarker = truncated.search(/^(##|===)/m);
    if (firstMarker > 0) {
      const cleanContext = truncated.slice(firstMarker);
      console.log(\`[MEMORY] Context truncated: \${(cleanContext.length / 1024).toFixed(2)} KB (from \${(this.currentContext.length / 1024).toFixed(2)} KB)\`);
      return cleanContext;
    }

    console.log(\`[MEMORY] Context truncated: \${(truncated.length / 1024).toFixed(2)} KB\`);
    return truncated;
  }`;

if (!content.includes(oldGetContext)) {
  console.log('ERROR: Could not find getContext() method to patch');
  console.log('Searching for variations...');

  // Try alternative pattern
  const altPattern = /getContext\(\)\s*\{\s*return\s+this\.currentContext;\s*\}/;
  if (altPattern.test(content)) {
    content = content.replace(altPattern, newGetContext);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: getContext() patched with context limit (alternative pattern)');
    process.exit(0);
  }

  console.log('ERROR: No matching pattern found');
  process.exit(1);
}

content = content.replace(oldGetContext, newGetContext);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: getContext() patched with MAX_CONTEXT_KB = 50');
