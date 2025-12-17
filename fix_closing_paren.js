const fs = require('fs');

const file = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(file, 'utf8');

// Remplacer tous les `; qui terminent le systemPrompt par `);
content = content.replace(
  /- memory_query_graph: Interroger mes relations pour faire des connexions`;\n/g,
  '- memory_query_graph: Interroger mes relations pour faire des connexions`);\n'
);

fs.writeFileSync(file, content, 'utf8');
console.log('✓ Parenthèse fermante ajoutée');
