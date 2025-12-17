const fs = require('fs');

const filePath = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Pattern 1: Dans runToolAgentV2 - après l'exécution de l'outil
const oldPattern1 = `          const result = await impl(parsedArgs);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id || toolName,
            content: JSON.stringify(result)
          });`;

const newPattern1 = `          const result = await impl(parsedArgs);
          // FIX 2025-12-13: Reformater tool result pour ana-superia-v5
          // Le modèle ne comprend pas role='tool', on utilise role='user'
          messages.push({
            role: 'user',
            content: \`[RÉSULTAT DE L'OUTIL \${toolName}]:\\n\${JSON.stringify(result, null, 2)}\\n\\nMaintenant, formule une réponse claire en français avec ce résultat.\`
          });`;

if (content.includes('FIX 2025-12-13: Reformater tool result')) {
  console.log('SKIP: Already patched');
} else if (content.includes(oldPattern1)) {
  content = content.replace(oldPattern1, newPattern1);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Tool result format patched');
} else {
  console.log('ERROR: Pattern not found');
}
