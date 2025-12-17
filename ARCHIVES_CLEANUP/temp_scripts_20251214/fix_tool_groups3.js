const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';

let content = fs.readFileSync(path, 'utf8');

// Pattern avec bonne indentation (2 espaces par niveau)
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
  console.log('Modification effectuée avec succès');
} else {
  console.log('Code non trouvé. Essayons une approche ligne par ligne...');

  // Remplacer directement la ligne 7147
  const lines = content.split('\n');
  const targetLine = 7146; // Index 0-based = ligne 7147

  if (lines[targetLine] && lines[targetLine].includes('const orchResult = await callWithFallback(messages, TOOL_DEFINITIONS)')) {
    // Insérer les nouvelles lignes avant
    lines.splice(targetLine, 1,
      '      // FIX 2025-12-11: Filtrer outils par groupe pour reduire tokens (181->~20)',
      '      const { tools: filteredTools, groups } = getRelevantTools(TOOL_DEFINITIONS, userMessage);',
      "      console.log('[ToolAgent] Groups: ' + groups.join(', ') + ' -> ' + filteredTools.length + ' tools');",
      '      const orchResult = await callWithFallback(messages, filteredTools);'
    );
    fs.writeFileSync(path, lines.join('\n'));
    console.log('Modification effectuée via remplacement de ligne');
  } else {
    console.log('Ligne cible non trouvée à l\'index ' + targetLine);
    console.log('Contenu actuel:', lines[targetLine]);
  }
}
