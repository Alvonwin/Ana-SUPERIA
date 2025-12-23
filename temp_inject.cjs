const fs = require('fs');
let content = fs.readFileSync('E:/ana/server/ana-core.cjs', 'utf8');

// Find the specific line with simpler pattern
const searchPattern = "const fullPrompt = memoryContext ? `${memoryContext}\\n\\nQuestion: ${message}` : message;";

if (content.includes('agentInsightsContext')) {
  console.log('SKIP: Deja present');
  process.exit(0);
}

// Replace with agent insights injection
const replacement = `// === INJECTION INSIGHTS AGENTS AUTONOMES ===
        let agentInsightsContext = '';
        if (agentInsights.length > 0) {
          agentInsightsContext = '\\n[INSIGHTS AGENTS - PRENDS EN COMPTE]\\n' +
            agentInsights.slice(-5).map(i => \`- [\${i.agent}] \${i.insight}\`).join('\\n') + '\\n';
          console.log('[WS] Agent insights injectes:', agentInsights.length);
        }
        const fullPrompt = memoryContext
          ? \`\${memoryContext}\${agentInsightsContext}\\n\\nQuestion: \${message}\`
          : agentInsightsContext + \`Question: \${message}\`;`;

if (content.includes(searchPattern)) {
  content = content.replace(searchPattern, replacement);
  fs.writeFileSync('E:/ana/server/ana-core.cjs', content);
  console.log('OK: Injection insights WebSocket ajoutee');
} else {
  console.log('FAIL: Pattern non trouve, essai avec regex');
  // Try regex approach
  const regex = /const fullPrompt = memoryContext \? [`][$]{memoryContext}\\n\\nQuestion: [$]{message}[`] : message;/;
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('E:/ana/server/ana-core.cjs', content);
    console.log('OK via regex');
  } else {
    console.log('FAIL: Regex aussi');
  }
}
