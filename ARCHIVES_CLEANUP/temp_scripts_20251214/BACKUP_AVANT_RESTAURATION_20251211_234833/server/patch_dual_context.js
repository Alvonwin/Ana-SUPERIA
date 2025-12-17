// Patch script to add DUAL-CONTEXT to MemoryManager
const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched
if (content.includes('anaContextPath')) {
  console.log('ALREADY PATCHED: Dual-context is already present');
  process.exit(0);
}

// Find the MemoryManager class
const oldPattern = /\/\/ ================== MEMORY MANAGER ==================\nclass MemoryManager \{[\s\S]*?^\}/m;

const newClass = `// ================== MEMORY MANAGER (DUAL-CONTEXT) ==================
// Permet a Ana de lire les conversations Claude ET Ana
class MemoryManager {
  constructor() {
    this.contextPath = path.join(MEMORY_PATH, 'current_conversation.txt');
    this.anaContextPath = 'E:/ANA/memory/current_conversation_ana.txt';
    this.currentContext = '';
    this.loadContext();
  }

  loadContext() {
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
  }

  getContext() {
    return this.currentContext;
  }

  appendToContext(text) {
    this.currentContext += '\\n' + text;
    this.saveContext();
  }

  saveContext() {
    try {
      fs.writeFileSync(this.contextPath, this.currentContext, 'utf8');
    } catch (error) {
      console.error('[MEMORY SAVE ERROR]', error.message);
    }
  }

  getStats() {
    return {
      size: this.currentContext.length,
      sizeKB: (this.currentContext.length / 1024).toFixed(2),
      lines: this.currentContext.split('\\n').length,
      dualContext: true
    };
  }
}`;

// Simple string replacement
const startMarker = '// ================== MEMORY MANAGER ==================';
const endMarker = 'const memory = new MemoryManager();';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.log('ERROR: Could not find MemoryManager markers');
  process.exit(1);
}

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);

content = before + newClass + '\n\n' + after;

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: MemoryManager patched with DUAL-CONTEXT');
