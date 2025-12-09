// Patch script to balance context between Claude and Ana conversations
// Prend les derniers 25KB de chaque source au lieu de tout prendre puis tronquer
const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched
if (content.includes('BALANCED_CONTEXT')) {
  console.log('ALREADY PATCHED: Balanced context is already present');
  process.exit(0);
}

// Find the loadContext method and replace it
const oldLoadContext = `loadContext() {
    try {
      let combined = '';

      // 1. Conversations Claude Code (## Claude:, ## Alain:)
      if (fs.existsSync(this.contextPath)) {
        const claudeContext = fs.readFileSync(this.contextPath, 'utf8');
        combined += '=== CONVERSATIONS CLAUDE CODE ===\\n' + claudeContext;
        console.log(\`[MEMORY] Contexte Claude: \${(claudeContext.length / 1024).toFixed(2)} KB\`);
      }

      // 2. Conversations Ana (## Ana:)
      if (fs.existsSync(this.anaContextPath)) {
        const anaContext = fs.readFileSync(this.anaContextPath, 'utf8');
        combined += '\\n\\n=== CONVERSATIONS ANA ===\\n' + anaContext;
        console.log(\`[MEMORY] Contexte Ana: \${(anaContext.length / 1024).toFixed(2)} KB\`);
      }

      this.currentContext = combined;
      console.log(\`[MEMORY] DUAL CONTEXT TOTAL: \${(this.currentContext.length / 1024).toFixed(2)} KB\`);
    } catch (error) {
      console.error('[MEMORY ERROR]', error.message);
    }
  }`;

const newLoadContext = `loadContext() {
    // BALANCED_CONTEXT: Prend les derniers N KB de chaque source
    const MAX_PER_SOURCE_KB = 25;
    const maxPerSource = MAX_PER_SOURCE_KB * 1024;

    try {
      let claudePart = '';
      let anaPart = '';

      // 1. Conversations Claude Code (les plus récentes d'abord)
      if (fs.existsSync(this.contextPath)) {
        let claudeContext = fs.readFileSync(this.contextPath, 'utf8');
        const claudeOriginal = claudeContext.length;

        if (claudeContext.length > maxPerSource) {
          // Garder les derniers maxPerSource bytes
          claudeContext = claudeContext.slice(-maxPerSource);
          // Trouver le premier ## pour ne pas couper un message
          const firstMarker = claudeContext.search(/^##/m);
          if (firstMarker > 0) {
            claudeContext = claudeContext.slice(firstMarker);
          }
        }

        claudePart = '=== CONVERSATIONS RÉCENTES AVEC CLAUDE CODE ===\\n' + claudeContext;
        console.log(\`[MEMORY] Contexte Claude: \${(claudeContext.length / 1024).toFixed(2)} KB (de \${(claudeOriginal / 1024).toFixed(2)} KB)\`);
      }

      // 2. Conversations Ana (les plus récentes)
      if (fs.existsSync(this.anaContextPath)) {
        let anaContext = fs.readFileSync(this.anaContextPath, 'utf8');
        const anaOriginal = anaContext.length;

        if (anaContext.length > maxPerSource) {
          anaContext = anaContext.slice(-maxPerSource);
          const firstMarker = anaContext.search(/^##/m);
          if (firstMarker > 0) {
            anaContext = anaContext.slice(firstMarker);
          }
        }

        anaPart = '\\n\\n=== CONVERSATIONS RÉCENTES AVEC ANA ===\\n' + anaContext;
        console.log(\`[MEMORY] Contexte Ana: \${(anaContext.length / 1024).toFixed(2)} KB (de \${(anaOriginal / 1024).toFixed(2)} KB)\`);
      }

      this.currentContext = claudePart + anaPart;
      console.log(\`[MEMORY] BALANCED DUAL CONTEXT: \${(this.currentContext.length / 1024).toFixed(2)} KB\`);
    } catch (error) {
      console.error('[MEMORY ERROR]', error.message);
    }
  }`;

if (!content.includes(oldLoadContext)) {
  console.log('ERROR: Could not find loadContext() method');
  process.exit(1);
}

content = content.replace(oldLoadContext, newLoadContext);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: loadContext() patched with BALANCED_CONTEXT (25KB per source)');
