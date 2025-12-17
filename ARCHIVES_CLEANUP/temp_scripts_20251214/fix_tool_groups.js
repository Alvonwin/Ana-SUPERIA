const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';

let content = fs.readFileSync(path, 'utf8');

// Remplacement 1: Ligne 7148 environ
content = content.replace(
  /( {6}\/\/ Appel LLM via Orchestrateur avec fallback.*\n)( {6}const orchResult = await callWithFallback\(messages, TOOL_DEFINITIONS\);)/,
  `$1      // FIX 2025-12-11: Filtrer outils par groupe pour reduire tokens (181->~20)
      const { tools: filteredTools, groups } = getRelevantTools(TOOL_DEFINITIONS, userMessage);
      console.log('[ToolAgent] Groups: ' + groups.join(', ') + ' -> ' + filteredTools.length + ' tools');
      const orchResult = await callWithFallback(messages, filteredTools);`
);

// Remplacement 2: Ligne 7510 environ (continueConversation)
content = content.replace(
  /const orchResult = await callWithFallback\(contextMessages, TOOL_DEFINITIONS\);/,
  `const { tools: filteredTools } = getRelevantTools(TOOL_DEFINITIONS, userMessage);
      const orchResult = await callWithFallback(contextMessages, filteredTools);`
);

fs.writeFileSync(path, content);
console.log('Modifications effectuées');
