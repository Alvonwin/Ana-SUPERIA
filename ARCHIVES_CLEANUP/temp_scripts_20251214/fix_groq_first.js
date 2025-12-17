// Force Groq en premier dans LLM_CHAIN
const fs = require('fs');
const path = 'E:/ANA/server/core/llm-orchestrator.cjs';

let content = fs.readFileSync(path, 'utf8');

// Remplacer la ligne de commentaire
content = content.replace(
  /\/\/ 2025-12-1[0-9]: .* tâches/,
  '// 2025-12-14: GROQ EN PREMIER - Français parfait, rapide, pas de corruption'
);

// Remplacer le premier élément du array
content = content.replace(
  /{ name: 'ollama', model: 'ana-superia-v6', type: 'local' },\s*\/\/ PRINCIPAL/,
  "{ name: 'groq', model: 'llama-3.3-70b-versatile', type: 'cloud' }, // PRINCIPAL Ana Groq"
);

// Remplacer le 3e élément (ancien groq) par ana-superia-v6
content = content.replace(
  /{ name: 'groq', model: 'llama-3.3-70b-versatile', type: 'cloud' }, \/\/ Fallback cloud/,
  "{ name: 'ollama', model: 'ana-superia-v6', type: 'local' },     // Fallback local"
);

fs.writeFileSync(path, content, 'utf8');
console.log('✓ Groq est maintenant en premier!');

// Vérifier
const verify = fs.readFileSync(path, 'utf8');
const match = verify.match(/const LLM_CHAIN = \[([\s\S]*?)\];/);
if (match) {
  console.log('\nLLM_CHAIN actuel:');
  console.log(match[0].substring(0, 400));
}
