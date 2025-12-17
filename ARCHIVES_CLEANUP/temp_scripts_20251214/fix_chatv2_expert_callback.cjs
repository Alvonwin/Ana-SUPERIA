const fs = require('fs');

// Backup
fs.copyFileSync(
  'E:/ANA/server/ana-core.cjs',
  'E:/ANA/temp/BACKUP_CYCLE_2025-12-11/ana-core.cjs.backup_before_expert_fix'
);

let content = fs.readFileSync('E:/ANA/server/ana-core.cjs', 'utf8');

// OLD EXPERT CALLBACK (incomplet)
const oldCallback = `      async (expertType, expertQuery) => {
        // Expert callback: Ana's consciousness decides to call tools/code
        if (expertType === 'tools') {
          // TODO: Call tool system here
          return { info: 'Tools not yet integrated with consciousness' };
        } else if (expertType === 'code') {
          // Call deepseek for coding
          const codeResult = await orchestrator.chat({
            prompt: expertQuery,
            taskType: 'coding',
            model: 'deepseek-coder-v2:16b-lite-instruct-q4_K_M'
          });
          return codeResult.response;
        }
        return null;
      }`;

// NEW EXPERT CALLBACK (complet, identique à /api/chat)
const newCallback = `      async (expertType, expertQuery) => {
        console.log(\`🔧 [CONSCIOUSNESS V2] Expert \${expertType} appelé avec: \${expertQuery.substring(0, 50)}\`);

        if (expertType === 'tools') {
          // Utiliser le ToolAgent pour les outils
          const toolResult = await toolAgent.runToolAgentV2(expertQuery, {
            sessionId: req.body.sessionId || 'chat_v2',
            context: memoryContext
          });
          return toolResult.success ? toolResult.answer : toolResult.error || 'Erreur outil';
        }
        else if (expertType === 'research') {
          // Recherche web via Groq
          try {
            const searchResult = await router.query('groq', \`Recherche: \${expertQuery}\`, false);
            return searchResult.response;
          } catch (e) {
            return \`Erreur recherche: \${e.message}\`;
          }
        }
        else if (expertType === 'code') {
          // Expert code via DeepSeek
          try {
            const codeResult = await router.query(LLMS.DEEPSEEK, expertQuery, false);
            return codeResult.response;
          } catch (e) {
            return \`Erreur code: \${e.message}\`;
          }
        }
        return null;
      }`;

content = content.replace(oldCallback, newCallback);

fs.writeFileSync('E:/ANA/server/ana-core.cjs', content, 'utf8');
console.log('✅ Expert callback corrigé dans /api/chat/v2');
console.log('   Maintenant identique à /api/chat:');
console.log('   - tools → toolAgent');
console.log('   - research → Groq');
console.log('   - code → DeepSeek');
