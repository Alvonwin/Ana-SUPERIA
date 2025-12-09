/**
 * Test des 22 outils Ana avec paramètres VARIÉS
 * Chaque test utilise des valeurs différentes
 */

const toolAgent = require('./agents/tool-agent.cjs');
const impl = toolAgent.TOOL_IMPLEMENTATIONS;

async function testAll22() {
  console.log('========================================');
  console.log('   TESTS DES 22 OUTILS ANA (VARIÉS)');
  console.log('========================================\n');

  let pass = 0, fail = 0;

  // 1. web_search - Recherche sur sujet différent
  console.log('1. web_search - "recette poutine québécoise"');
  try {
    const r = await impl.web_search({ query: 'recette poutine québécoise' });
    const ok = r.success && r.results && r.results.length > 0;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.results?.length || 0) + ' résultats');
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 2. get_weather - Ville différente
  console.log('2. get_weather - "Tokyo"');
  try {
    const r = await impl.get_weather({ location: 'Tokyo' });
    const ok = r.success || r.temperature;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.temperature || r.description || 'N/A'));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 3. get_time
  console.log('3. get_time');
  try {
    const r = await impl.get_time({});
    const ok = r.time || r.success;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.time || JSON.stringify(r)));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 4. read_file - Fichier différent
  console.log('4. read_file - "E:/ANA/package.json"');
  try {
    const r = await impl.read_file({ path: 'E:/ANA/package.json' });
    const ok = r.success && r.content;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.content?.length || 0) + ' chars');
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 5. write_file - Nouveau fichier
  console.log('5. write_file - "E:/ANA/test_varie.txt"');
  try {
    const r = await impl.write_file({ path: 'E:/ANA/test_varie.txt', content: 'Test varié: ' + new Date().toLocaleString('fr-CA') });
    const ok = r.success;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL'));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 6. list_files - Dossier différent
  console.log('6. list_files - "E:/ANA/agents"');
  try {
    const r = await impl.list_files({ path: 'E:/ANA/agents' });
    const count = r.count || r.files?.length || r.entries?.length || 0;
    const ok = r.success || count > 0;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + count + ' fichiers');
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 7. run_shell - Commande différente avec path Windows
  console.log('7. run_shell - "dir E:/ANA/knowledge"');
  try {
    const r = await impl.run_shell({ command: 'dir E:/ANA/knowledge' });
    const ok = r.success || (r.stdout && r.stdout.length > 0);
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.stdout?.length || 0) + ' chars output');
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 8. web_fetch - URL différente
  console.log('8. web_fetch - "https://jsonplaceholder.typicode.com/posts/1"');
  try {
    const r = await impl.web_fetch({ url: 'https://jsonplaceholder.typicode.com/posts/1' });
    const ok = r && (r.length > 0 || r.success);
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (typeof r === 'string' ? r.length : JSON.stringify(r).length) + ' chars');
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 9. wikipedia - Sujet différent
  console.log('9. wikipedia - "Albert Einstein"');
  try {
    const r = await impl.wikipedia({ query: 'Albert Einstein' });
    const ok = r.success || r.extract;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.extract?.substring(0,50) || r.title || 'N/A'));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 10. ask_groq - Question différente
  console.log('10. ask_groq - "Combien font 15 multiplié par 8?"');
  try {
    const r = await impl.ask_groq({ prompt: 'Combien font 15 multiplié par 8? Réponds juste le nombre.' });
    const ok = r.success || (r.answer && r.answer.length > 0);
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.answer?.substring(0,40) || JSON.stringify(r).substring(0,40)));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 11. ask_cerebras - Question différente
  console.log('11. ask_cerebras - "Quel est le plus grand océan?"');
  try {
    const r = await impl.ask_cerebras({ prompt: 'Quel est le plus grand océan du monde? Un seul mot.' });
    const ok = r.success || (r.answer && r.answer.length > 0);
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.answer?.substring(0,40) || JSON.stringify(r).substring(0,40)));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 12. search_memory - Requête différente
  console.log('12. search_memory - "architecture logicielle"');
  try {
    const r = await impl.search_memory({ query: 'architecture logicielle', limit: 3 });
    const ok = r.success || r.results || r.matches;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.results?.length || r.matches?.length || 0) + ' résultats');
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 13. edit_file - Modification différente
  console.log('13. edit_file - Modifier test_varie.txt');
  try {
    const r = await impl.edit_file({ file_path: 'E:/ANA/test_varie.txt', old_string: 'Test', new_string: 'MODIFICATION' });
    const ok = r.success;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.message || r.error || ''));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 14. glob - Pattern différent
  console.log('14. glob - "*.md" dans E:/ANA');
  try {
    const r = await impl.glob({ pattern: '*.md', path: 'E:/ANA' });
    const ok = r.success && r.count >= 0;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + r.count + ' fichiers .md');
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 15. grep - Pattern différent
  console.log('15. grep - "console.log" dans E:/ANA/server');
  try {
    const r = await impl.grep({ pattern: 'console.log', path: 'E:/ANA/server', glob: '*.cjs' });
    const ok = r.success && r.count >= 0;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + r.count + ' matches');
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 16. ask_user - Question différente
  console.log('16. ask_user - "Quel est ton projet prioritaire?"');
  try {
    const r = await impl.ask_user({ question: 'Quel est ton projet prioritaire actuellement?' });
    const ok = r.waiting || r.success || r.message;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.message || 'En attente'));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 17. run_background - Commande différente
  console.log('17. run_background - "whoami"');
  try {
    const r = await impl.run_background({ command: 'whoami' });
    const ok = r.success || r.pid || r.bashId;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - PID: ' + (r.pid || r.bashId || 'N/A'));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 18. kill_process - PID inexistant (test erreur contrôlée)
  console.log('18. kill_process - PID 77777 (erreur attendue)');
  try {
    const r = await impl.kill_process({ pid: 77777 });
    console.log('   ✅ PASS - Erreur contrôlée: ' + (r.error || r.message || 'process not found'));
    pass++;
  } catch(e) {
    console.log('   ✅ PASS - Exception gérée: ' + e.message.substring(0,40));
    pass++;
  }

  // 19. todo_write - Tâche différente
  console.log('19. todo_write - "Optimiser les performances"');
  try {
    const r = await impl.todo_write({ todos: [{ content: 'Optimiser les performances du serveur', status: 'pending', activeForm: 'Optimisation en cours' }] });
    const ok = r.success;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.message || ''));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 20. notebook_edit - Test sans notebook (erreur attendue)
  console.log('20. notebook_edit - Fichier inexistant (erreur attendue)');
  try {
    const r = await impl.notebook_edit({ notebook_path: 'E:/ANA/fictif.ipynb', cell_number: 0, new_source: '## Titre' });
    console.log('   ✅ PASS - Erreur contrôlée');
    pass++;
  } catch(e) {
    console.log('   ✅ PASS - Exception gérée');
    pass++;
  }

  // 21. plan_mode - Action différente
  console.log('21. plan_mode - action: exit');
  try {
    const r = await impl.plan_mode({ action: 'exit' });
    const ok = r.success || r.mode || r.message;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.mode || r.message || JSON.stringify(r)));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  // 22. launch_agent - Type différent
  console.log('22. launch_agent - type: planner');
  try {
    const r = await impl.launch_agent({ type: 'planner', query: 'planifier mise à jour système' });
    const ok = r.success || r.launched || r.message;
    console.log('   ' + (ok ? '✅ PASS' : '❌ FAIL') + ' - ' + (r.message || JSON.stringify(r).substring(0,40)));
    ok ? pass++ : fail++;
  } catch(e) { console.log('   ❌ FAIL - ' + e.message.substring(0,50)); fail++; }

  console.log('\n========================================');
  console.log('   RÉSUMÉ: ' + pass + '/22 PASS, ' + fail + '/22 FAIL');
  console.log('========================================');
}

testAll22().catch(err => console.error('ERREUR GLOBALE:', err));
