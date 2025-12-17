const fs = require('fs');

const filePath = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Pattern: Changer role='tool' en role='user' avec instruction claire
const old1 = `messages.push({
            role: 'tool',
            tool_name: toolName,  // FIX 2025-12-13: Ollama attend tool_name, pas tool_call_id
            content: JSON.stringify(result)
          });`;

const new1 = `// FIX 2025-12-13: Utiliser role='user' car ana-superia-v5 ne comprend pas role='tool'
          const resultStr = JSON.stringify(result, null, 2);
          messages.push({
            role: 'user',
            content: \`[RÉSULTAT de \${toolName}]:\\n\${resultStr}\\n\\nRéponds maintenant en français avec ces informations. Ne demande pas d'autres actions.\`
          });`;

const old2 = `messages.push({
            role: 'tool',
            tool_name: toolName,  // FIX 2025-12-13
            content: JSON.stringify({ error: \`Outil "\${toolName}" non implémenté.\` })
          });`;

const new2 = `messages.push({
            role: 'user',
            content: \`[ERREUR] L'outil \${toolName} n'est pas implémenté. Informe l'utilisateur de cette erreur.\`
          });`;

const old3 = `messages.push({
            role: 'tool',
            tool_name: toolName,  // FIX 2025-12-13
            content: JSON.stringify({ error: err.message || 'Erreur pendant l\\'exécution' })
          });`;

const new3 = `messages.push({
            role: 'user',
            content: \`[ERREUR] L'outil \${toolName} a échoué: \${err.message || 'Erreur pendant l\\'exécution'}. Informe l'utilisateur de cette erreur.\`
          });`;

let modified = false;

if (content.includes(old1)) {
  content = content.replace(old1, new1);
  modified = true;
  console.log('Pattern 1 replaced (success result)');
}

if (content.includes(old2)) {
  content = content.replace(old2, new2);
  modified = true;
  console.log('Pattern 2 replaced (not implemented)');
}

if (content.includes(old3)) {
  content = content.replace(old3, new3);
  modified = true;
  console.log('Pattern 3 replaced (execution error)');
}

if (modified) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: All patterns replaced with user role format');
} else {
  console.log('ERROR: No patterns found');
  // Afficher un extrait pour debug
  const idx = content.indexOf('role: \'tool\'');
  if (idx > 0) {
    console.log('Found role:tool at position', idx);
    console.log(content.substring(idx - 100, idx + 200));
  }
}
