const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';

let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Trouver la ligne exacte
let targetIndex = -1;
for (let i = 7140; i < 7160; i++) {
  if (lines[i] && lines[i].includes('const orchResult = await callWithFallback(messages, TOOL_DEFINITIONS)')) {
    targetIndex = i;
    console.log('Trouvé à l\'index ' + i + ': ' + lines[i]);
    break;
  }
}

if (targetIndex >= 0) {
  // Remplacer la ligne avec les nouvelles lignes
  lines.splice(targetIndex, 1,
    '      // FIX 2025-12-11: Filtrer outils par groupe pour reduire tokens (181->~20)',
    '      const { tools: filteredTools, groups } = getRelevantTools(TOOL_DEFINITIONS, userMessage);',
    "      console.log('[ToolAgent] Groups: ' + groups.join(', ') + ' -> ' + filteredTools.length + ' tools');",
    '      const orchResult = await callWithFallback(messages, filteredTools);'
  );
  fs.writeFileSync(path, lines.join('\n'));
  console.log('Modification effectuée avec succès!');
} else {
  console.log('Ligne cible non trouvée dans la plage 7140-7160');
  // Afficher les lignes
  for (let i = 7140; i < 7160; i++) {
    console.log(i + ': ' + lines[i]);
  }
}
