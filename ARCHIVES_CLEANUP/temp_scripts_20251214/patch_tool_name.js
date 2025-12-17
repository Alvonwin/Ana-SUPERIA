const fs = require('fs');

const filePath = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Pattern 1: Changer tool_call_id en tool_name (succès)
const old1 = `messages.push({
            role: 'tool',
            tool_call_id: tc.id || toolName,
            content: JSON.stringify(result)
          });`;

const new1 = `messages.push({
            role: 'tool',
            tool_name: toolName,  // FIX 2025-12-13: Ollama attend tool_name, pas tool_call_id
            content: JSON.stringify(result)
          });`;

// Pattern 2: Changer tool_call_id en tool_name (erreur)
const old2 = `messages.push({
            role: 'tool',
            tool_call_id: tc.id || toolName,
            content: JSON.stringify({ error: \`Outil "\${toolName}" non implémenté.\` })
          });`;

const new2 = `messages.push({
            role: 'tool',
            tool_name: toolName,  // FIX 2025-12-13
            content: JSON.stringify({ error: \`Outil "\${toolName}" non implémenté.\` })
          });`;

// Pattern 3: Changer tool_call_id en tool_name (catch error)
const old3 = `messages.push({
            role: 'tool',
            tool_call_id: tc.id || toolName,
            content: JSON.stringify({ error: err.message || 'Erreur pendant l\\'exécution' })
          });`;

const new3 = `messages.push({
            role: 'tool',
            tool_name: toolName,  // FIX 2025-12-13
            content: JSON.stringify({ error: err.message || 'Erreur pendant l\\'exécution' })
          });`;

let modified = false;

if (content.includes(old1)) {
  content = content.replace(old1, new1);
  modified = true;
  console.log('Pattern 1 replaced');
}

if (content.includes(old2)) {
  content = content.replace(old2, new2);
  modified = true;
  console.log('Pattern 2 replaced');
}

if (content.includes(old3)) {
  content = content.replace(old3, new3);
  modified = true;
  console.log('Pattern 3 replaced');
}

// Remplacer tous les autres tool_call_id par tool_name dans les messages tool
content = content.replace(/tool_call_id: tc\.id \|\| toolName/g, 'tool_name: toolName');

if (modified || content.includes('tool_name: toolName')) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: All tool_call_id replaced with tool_name');
} else {
  console.log('ERROR: No patterns found');
}
