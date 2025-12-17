const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';

let content = fs.readFileSync(path, 'utf8');

// Chercher le pattern exact
const oldCode = `    try {
      // Appel LLM via Orchestrateur avec fallback (Groq -> llama3.1 -> qwen3)
      const orchResult = await callWithFallback(messages, TOOL_DEFINITIONS);`;

const newCode = `    try {
      // Appel LLM via Orchestrateur avec fallback (Groq -> llama3.1 -> qwen3)
      // FIX 2025-12-11: Filtrer outils par groupe pour reduire tokens (181->~20)
      const { tools: filteredTools, groups } = getRelevantTools(TOOL_DEFINITIONS, userMessage);
      console.log('[ToolAgent] Groups: ' + groups.join(', ') + ' -> ' + filteredTools.length + ' tools');
      const orchResult = await callWithFallback(messages, filteredTools);`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(path, content);
  console.log('Modification 1 effectuée avec succès');
} else {
  console.log('Code cible 1 non trouvé, vérifiant...');

  // Afficher les lignes autour de la cible
  const lines = content.split('\n');
  for (let i = 7140; i < 7160; i++) {
    console.log(i + ': ' + lines[i]);
  }
}
