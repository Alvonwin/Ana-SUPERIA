// Patch tool-agent.cjs pour utiliser ana-superia-v6
const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';

let content = fs.readFileSync(path, 'utf8');

// Remplacer ana-superia-v4 par ana-superia-v6
content = content.replace(
  /const DEFAULT_MODEL = 'ana-superia-v4';.*$/m,
  "const DEFAULT_MODEL = 'ana-superia-v6';  // DeepSeek R1 8B - 52 tokens/s, French support"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patch appliqué! tool-agent.cjs utilise maintenant ana-superia-v6');
