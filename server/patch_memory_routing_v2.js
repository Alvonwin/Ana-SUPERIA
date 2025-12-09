const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched
if (content.includes('memoryKeywords')) {
  console.log('ALREADY PATCHED: Memory routing already present');
  process.exit(0);
}

// Simple string search and replace
const searchStr = "    // Math tasks - Qwen\n    const mathKeywords";
const replaceStr = `    // Memory/context questions - DeepSeek (meilleur pour lire le contexte)
    const memoryKeywords = ['souviens', 'rappelle', 'dit', 'conversation', 'mémoire', 'historique', 'ma voiture', 'mon ', 'ma ', 'mes ', 'regarde', 'précédemment', 'avant', 'déjà'];
    if (memoryKeywords.some(kw => msgLower.includes(kw))) {
      return { model: LLMS.DEEPSEEK, reason: 'Question de mémoire détectée' };
    }

    // Math tasks - Qwen
    const mathKeywords`;

if (!content.includes(searchStr)) {
  console.log('ERROR: Could not find search string');
  console.log('Looking for:', searchStr.substring(0, 50));
  process.exit(1);
}

content = content.replace(searchStr, replaceStr);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Memory routing added - memory questions go to DeepSeek');
