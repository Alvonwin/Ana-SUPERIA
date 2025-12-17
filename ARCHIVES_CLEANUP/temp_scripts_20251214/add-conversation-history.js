const fs = require('fs');

const file = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(file, 'utf8');

// Fix Groq call
const oldGroq = `          const groqResult = await groqService.chat(message, {
            model: model,
            systemPrompt: "Tu es Ana, une IA française intelligente et amicale. Réponds toujours en français de manière naturelle et utile."
          });`;

const newGroq = `          const groqResult = await groqService.chat(message, {
            model: model,
            systemPrompt: "Tu es Ana, une IA française intelligente et amicale. Réponds toujours en français de manière naturelle et utile.",
            conversationHistory: conversationHistory
          });`;

// Fix Cerebras call
const oldCerebras = `          const cerebrasResult = await cerebrasService.chat(message, {
            model: model,
            systemPrompt: "Tu es Ana, une IA française intelligente et amicale. Réponds toujours en français de manière naturelle et utile."
          });`;

const newCerebras = `          const cerebrasResult = await cerebrasService.chat(message, {
            model: model,
            systemPrompt: "Tu es Ana, une IA française intelligente et amicale. Réponds toujours en français de manière naturelle et utile.",
            conversationHistory: conversationHistory
          });`;

let groqFixed = false;
let cerebrasFixed = false;

if (content.includes(oldGroq)) {
  content = content.replace(oldGroq, newGroq);
  groqFixed = true;
}

if (content.includes(oldCerebras)) {
  content = content.replace(oldCerebras, newCerebras);
  cerebrasFixed = true;
}

if (groqFixed || cerebrasFixed) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('Results:');
  console.log('- Groq: ' + (groqFixed ? 'FIXED' : 'not found'));
  console.log('- Cerebras: ' + (cerebrasFixed ? 'FIXED' : 'not found'));
} else {
  console.log('No patterns found');
}
