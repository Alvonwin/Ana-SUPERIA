const fs = require('fs');

const filePath = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Pattern dans runToolAgentV2 - après l'exécution réussie
const oldPattern = `          const result = await impl(parsedArgs);
          messages.push({
            role: 'tool',
            tool_name: toolName,
            content: JSON.stringify(result)
          });
          // Verification REELLE du succes avant log (2025-12-10)
          if (result && result.success === false) {
            console.log(\`❌ [ToolAgentV2] \${toolName} a echoue:\`, result.error || result.stderr || 'Erreur inconnue');
          } else {
            console.log(\`✅ [ToolAgentV2] \${toolName} exécuté avec succès\`);
          }`;

const newPattern = `          const result = await impl(parsedArgs);
          // FIX 2025-12-13: Utiliser role='user' et forcer synthèse
          const resultStr = JSON.stringify(result, null, 2);
          messages.push({
            role: 'user',
            content: \`[RÉSULTAT de \${toolName}]:\\n\${resultStr}\\n\\nRéponds maintenant en français avec ces informations.\`
          });

          // Verification REELLE du succes avant log (2025-12-10)
          if (result && result.success === false) {
            console.log(\`❌ [ToolAgentV2] \${toolName} a echoue:\`, result.error || result.stderr || 'Erreur inconnue');
          } else {
            console.log(\`✅ [ToolAgentV2] \${toolName} exécuté avec succès\`);

            // FIX 2025-12-13: Appel SANS outils pour forcer la synthèse
            const synthResult = await callWithFallback(messages, []); // Pas d'outils!
            if (synthResult.success && synthResult.message.content) {
              console.log(\`📝 [ToolAgentV2] Synthèse forcée: \${synthResult.message.content.substring(0, 100)}...\`);
              loopController.stop('synthesis_complete');
              return {
                success: true,
                answer: synthResult.message.content,
                messages: messages,
                stats: loopController.getStats(),
                model: synthResult.model,
                version: 'v2'
              };
            }
          }`;

if (content.includes('FIX 2025-12-13: Utiliser role=\'user\' et forcer synthèse')) {
  console.log('SKIP: Already patched');
} else if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: V2 synthesis patch applied');
} else {
  console.log('ERROR: Pattern not found');
  // Debug
  if (content.includes('role: \'tool\',')) {
    console.log('Found role:tool in file');
  }
  if (content.includes('tool_name: toolName')) {
    console.log('Found tool_name: toolName in file');
  }
}
