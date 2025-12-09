// Patch to route memory questions to DeepSeek instead of Qwen
const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched
if (content.includes('memoryKeywords')) {
  console.log('ALREADY PATCHED: Memory routing already present');
  process.exit(0);
}

// Find the classifyTask method and add memory keywords before Math tasks
const oldMathSection = `    // Math tasks - Qwen
    const mathKeywords = ['calculer', 'calculate', 'math', 'équation', 'nombre'];
    if (mathKeywords.some(kw => msgLower.includes(kw)) || /\\d+[\\+\\-\\*\\/]\\d+/.test(message)) {
      return { model: LLMS.QWEN, reason: 'Tâche mathématique détectée' };
    }`;

const newMathSection = `    // Memory/context questions - DeepSeek (better at reading context)
    const memoryKeywords = ['souviens', 'rappelle', 'dit', 'conversation', 'mémoire', 'historique', 'ma voiture', 'mon', 'ma ', 'mes ', 'regarde', 'précédemment', 'avant', 'déjà'];
    if (memoryKeywords.some(kw => msgLower.includes(kw))) {
      return { model: LLMS.DEEPSEEK, reason: 'Question de mémoire/contexte détectée' };
    }

    // Math tasks - Qwen
    const mathKeywords = ['calculer', 'calculate', 'math', 'équation', 'nombre'];
    if (mathKeywords.some(kw => msgLower.includes(kw)) || /\\d+[\\+\\-\\*\\/]\\d+/.test(message)) {
      return { model: LLMS.QWEN, reason: 'Tâche mathématique détectée' };
    }`;

if (!content.includes(oldMathSection)) {
  console.log('ERROR: Could not find Math section');
  process.exit(1);
}

content = content.replace(oldMathSection, newMathSection);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Memory questions now routed to DeepSeek');
