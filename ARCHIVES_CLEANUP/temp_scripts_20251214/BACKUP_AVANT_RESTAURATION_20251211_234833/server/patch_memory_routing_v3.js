const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched
if (content.includes('memoryKeywords')) {
  console.log('ALREADY PATCHED: Memory routing already present');
  process.exit(0);
}

// Find the exact position
const mathIdx = content.indexOf('// Math tasks - Qwen');
if (mathIdx === -1) {
  console.log('ERROR: Could not find "// Math tasks - Qwen"');
  process.exit(1);
}

const insertCode = `// Memory/context questions - DeepSeek (meilleur pour lire le contexte)
    const memoryKeywords = ['souviens', 'rappelle', 'dit', 'conversation', 'mémoire', 'historique', 'ma voiture', 'mon ', 'ma ', 'mes ', 'regarde', 'précédemment', 'avant', 'déjà'];
    if (memoryKeywords.some(kw => msgLower.includes(kw))) {
      return { model: LLMS.DEEPSEEK, reason: 'Question de mémoire détectée' };
    }

    `;

content = content.slice(0, mathIdx) + insertCode + content.slice(mathIdx);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Memory routing added');
