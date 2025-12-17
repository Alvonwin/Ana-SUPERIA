const fs = require('fs');

const filePath = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `      // Il y a des tool_calls → on les exécute
      console.log(\`🔧 [ToolAgent] \${toolCalls.length} tool(s) à exécuter\`);

      for (const tc of toolCalls) {`;

const newCode = `      // Il y a des tool_calls → on les exécute
      console.log(\`🔧 [ToolAgent] \${toolCalls.length} tool(s) à exécuter\`);

      // FIX 2025-12-13: Ajouter le message assistant avec tool_calls aux messages
      // CRITICAL: Le LLM doit voir qu'il a demande ces outils pour generer une reponse
      messages.push({
        role: 'assistant',
        content: msg.content || '',
        tool_calls: toolCalls.map(tc => ({
          id: tc.id || tc.function?.name || 'call_' + Date.now(),
          type: 'function',
          function: tc.function
        }))
      });

      for (const tc of toolCalls) {`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Patch applied!');
} else {
  console.log('ERROR: Old code not found - maybe already patched?');
}
