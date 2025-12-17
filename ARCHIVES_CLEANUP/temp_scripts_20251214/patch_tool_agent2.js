const fs = require('fs');

const filePath = 'E:/ANA/server/agents/tool-agent.cjs';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the line with "Il y a des tool_calls"
let insertIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Il y a des tool_calls')) {
    // Find the "for (const tc of toolCalls)" line after this
    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      if (lines[j].trim().startsWith('for (const tc of toolCalls)')) {
        insertIndex = j;
        break;
      }
    }
    break;
  }
}

if (insertIndex === -1) {
  console.log('ERROR: Could not find insertion point');
  process.exit(1);
}

// Check if patch already applied
if (content.includes('FIX 2025-12-13: Ajouter le message assistant')) {
  console.log('SKIP: Patch already applied');
  process.exit(0);
}

const patchCode = `
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
`;

// Insert the patch before the for loop
lines.splice(insertIndex, 0, patchCode);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('SUCCESS: Patch applied at line', insertIndex);
