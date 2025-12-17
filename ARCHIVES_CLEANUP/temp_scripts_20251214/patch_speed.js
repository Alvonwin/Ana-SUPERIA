const fs = require('fs');

// Patch llm-orchestrator.cjs
const orchPath = 'E:/ANA/server/core/llm-orchestrator.cjs';
let orchContent = fs.readFileSync(orchPath, 'utf8');

const oldOrch = `options: { temperature: 0 },
          stream: false`;
const newOrch = `options: { temperature: 0, num_ctx: 2048, num_predict: 512 },
          keep_alive: -1,
          stream: false`;

if (orchContent.includes('num_ctx: 2048')) {
  console.log('SKIP: llm-orchestrator already patched');
} else if (orchContent.includes(oldOrch)) {
  orchContent = orchContent.replace(oldOrch, newOrch);
  fs.writeFileSync(orchPath, orchContent, 'utf8');
  console.log('SUCCESS: llm-orchestrator patched');
} else {
  console.log('ERROR: pattern not found in llm-orchestrator');
}

// Patch ana-consciousness.cjs
const consPath = 'E:/ANA/server/intelligence/ana-consciousness.cjs';
let consContent = fs.readFileSync(consPath, 'utf8');

const oldCons = 'num_ctx: 4096';
const newCons = 'num_ctx: 2048';

if (consContent.includes('num_ctx: 2048')) {
  console.log('SKIP: ana-consciousness already patched');
} else if (consContent.includes(oldCons)) {
  consContent = consContent.replace(oldCons, newCons);
  fs.writeFileSync(consPath, consContent, 'utf8');
  console.log('SUCCESS: ana-consciousness patched');
} else {
  console.log('ERROR: pattern not found in ana-consciousness');
}
