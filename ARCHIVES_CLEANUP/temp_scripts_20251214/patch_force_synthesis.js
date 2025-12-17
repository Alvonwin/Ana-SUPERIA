const fs = require('fs');

const filePath = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Trouver et remplacer la section après l'exécution des outils
// On veut ajouter un appel SANS outils pour forcer la synthèse

const oldPattern = `// FIX 2025-12-13: Utiliser role='user' car ana-superia-v5 ne comprend pas role='tool'
          const resultStr = JSON.stringify(result, null, 2);
          messages.push({
            role: 'user',
            content: \`[RÉSULTAT de \${toolName}]:\\n\${resultStr}\\n\\nRéponds maintenant en français avec ces informations. Ne demande pas d'autres actions.\`
          });`;

const newPattern = `// FIX 2025-12-13: Appel SANS outils pour forcer la synthèse
          const resultStr = JSON.stringify(result, null, 2);
          messages.push({
            role: 'user',
            content: \`[RÉSULTAT de \${toolName}]:\\n\${resultStr}\\n\\nRéponds maintenant en français avec ces informations.\`
          });

          // Appel final SANS OUTILS pour forcer la synthèse
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
          }`;

if (content.includes('FIX 2025-12-13: Appel SANS outils')) {
  console.log('SKIP: Already patched');
} else if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Force synthesis patch applied');
} else {
  console.log('ERROR: Pattern not found');
}
