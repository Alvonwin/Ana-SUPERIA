const { TOOL_DEFINITIONS } = require('E:/ANA/server/agents/tool-agent.cjs');
console.log('=== LISTE DES ' + TOOL_DEFINITIONS.length + ' OUTILS ANA ===\n');
TOOL_DEFINITIONS.forEach((t, i) => {
  const name = t.function?.name || t.name || 'unknown';
  const desc = (t.function?.description || t.description || '').substring(0, 60);
  const num = String(i+1).padStart(3, ' ');
  console.log(num + '. ' + name.padEnd(30, ' ') + ' - ' + desc);
});
