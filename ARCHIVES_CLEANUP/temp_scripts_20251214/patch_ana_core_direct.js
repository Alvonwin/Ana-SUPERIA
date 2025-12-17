const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Ajouter import de ana-direct.cjs après ana-consciousness
const importPattern = `const anaConsciousness = require('./intelligence/ana-consciousness.cjs');`;
const importReplacement = `const anaConsciousness = require('./intelligence/ana-consciousness.cjs');
// === ANA DIRECT - Appel Direct (1 seul LLM call) - Remplace Thinker->Expert->Talker ===
const anaDirect = require('./intelligence/ana-direct.cjs');`;

if (content.includes(importPattern) && !content.includes('ana-direct.cjs')) {
  content = content.replace(importPattern, importReplacement);
  console.log('OK: Import ana-direct.cjs ajoute');
} else if (content.includes('ana-direct.cjs')) {
  console.log('SKIP: Import ana-direct.cjs deja present');
} else {
  console.log('ERROR: Pattern import non trouve');
}

// 2. Remplacer les 3 appels processWithConsciousness par processDirectly
// Pattern 1: Ligne ~1922 (endpoint /api/chat)
const pattern1 = `// Conscience Supérieure: Thinker → Expert (si besoin) → Talker
        const consciousnessResult = await anaConsciousness.processWithConsciousness(
          message,
          fullPrompt,  // Contexte complet avec mémoire
          expertCallback
        );`;

const replacement1 = `// Appel DIRECT à Ana (1 seul LLM call au lieu de 3)
        const consciousnessResult = await anaDirect.processDirectly(
          message,
          { memoryContext: fullPrompt, sessionId: 'chat_main' }
        );`;

if (content.includes(pattern1)) {
  content = content.replace(pattern1, replacement1);
  console.log('OK: Pattern 1 (api/chat) remplace');
}

// Pattern 2: Ligne ~3086 (endpoint /api/chat/v2)
const pattern2 = `// Conscience Supérieure
      const consciousnessResult = await anaConsciousness.processWithConsciousness(
        message,
        fullPrompt,
        expertCallback
      );`;

const replacement2 = `// Appel DIRECT à Ana (1 seul LLM call)
      const consciousnessResult = await anaDirect.processDirectly(
        message,
        { memoryContext: fullPrompt, sessionId: 'chat_v2' }
      );`;

if (content.includes(pattern2)) {
  content = content.replace(pattern2, replacement2);
  console.log('OK: Pattern 2 (api/chat/v2) remplace');
}

// Pattern 3: Ligne ~4669 (WebSocket)
const pattern3 = `// Conscience Supérieure: Thinker → Expert (si besoin) → Talker
        const consciousnessResult = await anaConsciousness.processWithConsciousness(
          message,
          fullPrompt,
          expertCallback
        );`;

const replacement3 = `// Appel DIRECT à Ana (1 seul LLM call)
        const consciousnessResult = await anaDirect.processDirectly(
          message,
          { memoryContext: fullPrompt, sessionId: 'chat_ws' }
        );`;

if (content.includes(pattern3)) {
  content = content.replace(pattern3, replacement3);
  console.log('OK: Pattern 3 (WebSocket) remplace');
}

// Sauvegarder
fs.writeFileSync(filePath, content, 'utf8');
console.log('DONE: ana-core.cjs patche avec succes');
