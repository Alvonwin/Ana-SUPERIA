const fs = require('fs');
const file = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(file, 'utf8');

// Ajouter l'utilisation de options.context dans le systemPrompt
const searchStr = `  const systemPrompt = options.systemPrompt ||
    \`Tu es Ana, l'assistante IA personnelle d'Alain à Longueuil, Québec.`;

const replaceStr = `  // FIX 2025-12-15: Inclure contexte mémoire proactif
  const contextPrefix = options.context ? \`[CONTEXTE MÉMOIRE]\\n\${options.context}\\n\\n\` : '';

  const systemPrompt = options.systemPrompt || (contextPrefix +
    \`Tu es Ana, l'assistante IA personnelle d'Alain à Longueuil, Québec.`);

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ Context proactif maintenant inclus dans systemPrompt');
} else {
  console.log('✗ Pattern non trouvé');
}
