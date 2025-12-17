// Test direct de get_cpu_usage
const { TOOL_DEFINITIONS, TOOL_IMPLEMENTATIONS } = require('E:/ANA/server/agents/tool-agent.cjs');

console.log('=== TEST DIRECT get_cpu_usage ===\n');

// 1. Verifier que l'outil existe dans les definitions
const cpuTool = TOOL_DEFINITIONS.find(t => t.function.name === 'get_cpu_usage');
console.log('1. Definition existe:', cpuTool ? 'OUI' : 'NON');

// 2. Verifier que l'implementation existe
console.log('2. Implementation existe:', typeof TOOL_IMPLEMENTATIONS.get_cpu_usage === 'function' ? 'OUI' : 'NON');

// 3. Executer l'outil directement
console.log('\n3. Execution directe de get_cpu_usage()...');
TOOL_IMPLEMENTATIONS.get_cpu_usage({}).then(result => {
  console.log('Resultat:', JSON.stringify(result, null, 2));
}).catch(err => {
  console.log('Erreur:', err.message);
});
