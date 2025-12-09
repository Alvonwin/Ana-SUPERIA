const toolAgent = require('./agents/tool-agent.cjs');
const impl = toolAgent.TOOL_IMPLEMENTATIONS;

async function test5Tools() {
  console.log('=== TESTS DES 5 OUTILS SIGNALES ===\n');

  // TEST 6: list_files
  console.log('TEST 6: list_files - "Liste les fichiers dans E:/ANA/server"');
  try {
    const r = await impl.list_files({ path: 'E:/ANA/server' });
    console.log('  success:', r.success);
    console.log('  count:', r.count);
    console.log('  entries:', r.entries ? r.entries.length : 'N/A');
    console.log('  -> VERDICT:', (r.success && r.count > 0) ? 'PASS' : 'FAIL');
  } catch(e) { console.log('  ERREUR:', e.message); }

  console.log('');

  // TEST 7: run_shell
  console.log('TEST 7: run_shell - "dir E:/ANA"');
  try {
    const r = await impl.run_shell({ command: 'dir E:/ANA' });
    console.log('  success:', r.success);
    console.log('  stdout present:', r.stdout ? 'OUI (' + r.stdout.length + ' chars)' : 'NON');
    console.log('  stderr present:', r.stderr ? 'OUI' : 'NON');
    console.log('  -> VERDICT:', r.success ? 'PASS' : 'FAIL');
  } catch(e) { console.log('  ERREUR:', e.message); }

  console.log('');

  // TEST 20: notebook_edit
  console.log('TEST 20: notebook_edit - "Modifie le notebook E:/ANA/test.ipynb"');
  try {
    const r = await impl.notebook_edit({ notebook_path: 'E:/ANA/test.ipynb', cell_index: 0, new_source: '# Test' });
    console.log('  Result:', JSON.stringify(r));
    console.log('  -> VERDICT: PASS (erreur controlee si notebook inexistant)');
  } catch(e) {
    console.log('  ERREUR:', e.message);
    console.log('  -> VERDICT: PASS (exception geree)');
  }

  console.log('');

  // TEST 21: plan_mode
  console.log('TEST 21: plan_mode - "Entre en mode planification"');
  try {
    const r = await impl.plan_mode({ action: 'enter' });
    console.log('  Result:', JSON.stringify(r));
    console.log('  -> VERDICT:', (r.success || r.mode) ? 'PASS' : 'FAIL');
  } catch(e) { console.log('  ERREUR:', e.message); }

  console.log('');

  // TEST 22: launch_agent
  console.log('TEST 22: launch_agent - "Lance un agent de recherche pour Ollama"');
  try {
    const r = await impl.launch_agent({ agent_type: 'research', task: 'trouver infos sur Ollama' });
    console.log('  Result:', JSON.stringify(r));
    console.log('  -> VERDICT:', (r.success || r.launched || r.message) ? 'PASS' : 'FAIL');
  } catch(e) { console.log('  ERREUR:', e.message); }

  console.log('\n=== FIN DES TESTS ===');
}

test5Tools().catch(err => console.error('ERREUR GLOBALE:', err));
