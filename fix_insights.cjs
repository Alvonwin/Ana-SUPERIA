const fs = require('fs');
let content = fs.readFileSync('E:/ana/server/ana-core.cjs', 'utf8');

const oldCode = `        // === INJECTION INSIGHTS AGENTS AUTONOMES ===
        let agentInsightsContext = '';
        if (agentInsights.length > 0) {
          agentInsightsContext = '\\n[INSIGHTS AGENTS - PRENDS EN COMPTE]\\n' +
            agentInsights.slice(-5).map(i => \`- [\${i.agent}] \${i.insight}\`).join('\\n') + '\\n';
          console.log('[WS] Agent insights injectes:', agentInsights.length);
        }`;

const newCode = `        // === INJECTION INSIGHTS AGENTS AUTONOMES ===
        // Ces insights sont des INSTRUCTIONS INTERNES pour Ana, pas à communiquer à l'utilisateur
        let agentInsightsContext = '';
        if (agentInsights.length > 0) {
          const formattedInsights = agentInsights.slice(-5).map(i => {
            // Reformuler les insights comme des instructions pour Ana
            let instruction = i.insight;
            instruction = instruction.replace(/fais une recherche web/gi, 'JE DOIS faire une recherche web');
            instruction = instruction.replace(/n'oublie pas/gi, 'JE NE DOIS PAS oublier');
            instruction = instruction.replace(/AVANT de modifier/gi, 'AVANT de modifier, JE DOIS');
            return \`- \${instruction}\`;
          }).join('\\n');

          agentInsightsContext = \`\\n[INSTRUCTIONS INTERNES - NE PAS MENTIONNER À L'UTILISATEUR]
Ces rappels sont pour MOI (Ana), pas pour l'utilisateur. Je dois les appliquer SILENCIEUSEMENT sans les mentionner:
\${formattedInsights}
IMPORTANT: J'applique ces directives moi-même. Je ne demande PAS à l'utilisateur de les faire.\\n\`;
          console.log('[WS] Agent insights injectes:', agentInsights.length);
        }`;

if (content.includes('INSTRUCTIONS INTERNES')) {
  console.log('SKIP: Deja modifie');
} else if (content.includes('INSIGHTS AGENTS - PRENDS EN COMPTE')) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync('E:/ana/server/ana-core.cjs', content);
  console.log('OK: Insights reformules comme instructions internes');
} else {
  console.log('FAIL: Pattern non trouve');
}
