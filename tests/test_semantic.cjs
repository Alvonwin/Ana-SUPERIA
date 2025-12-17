/**
 * TESTS SEMANTIQUES - Phase 6 du plan
 *
 * Verifie que la recherche semantique hybride fonctionne correctement
 */

const fs = require('fs');
const path = require('path');

const { TOOL_DEFINITIONS } = require('../server/agents/tool-agent.cjs');
const { searchTools } = require('../server/tools/tool-embeddings.cjs');
const { getRelevantToolsHybrid, detectToolGroups } = require('../server/core/tool-groups.cjs');

const resultsDir = path.join(__dirname, 'results');

console.log('===========================================');
console.log(' TESTS SEMANTIQUES - Phase 6');
console.log('===========================================\n');

let passed = 0;
let failed = 0;
const details = [];

// Test scenarios semantiques
const SEMANTIC_TESTS = [
  // Francais
  { query: "envoie un message à quelqu'un", expected: ['send_notification'], lang: 'fr' },
  { query: "sauvegarde mes données", expected: ['create_backup', 'write_file'], lang: 'fr' },
  { query: "trouve des informations sur internet", expected: ['web_search', 'web_fetch'], lang: 'fr' },
  { query: "analyse le code source", expected: ['search_codebase', 'analyze_component', 'review_code'], lang: 'fr' },
  { query: "compresse les fichiers", expected: ['create_zip', 'compress_gzip'], lang: 'fr' },

  // Anglais
  { query: "send an email notification", expected: ['send_notification'], lang: 'en' },
  { query: "search for files in directory", expected: ['find_files', 'list_files', 'glob'], lang: 'en' },
  { query: "get current weather forecast", expected: ['get_weather'], lang: 'en' },
  { query: "execute shell command", expected: ['run_shell', 'run_background'], lang: 'en' },
  { query: "create a new React component", expected: ['create_react_component'], lang: 'en' },

  // Requetes ambigues
  { query: "mets ça de côté", expected: ['save_memory', 'create_backup', 'write_file'], lang: 'ambiguous' },
  { query: "regarde ce qui se passe", expected: ['get_system_info', 'list_processes', 'git_status'], lang: 'ambiguous' },
  { query: "fais le ménage", expected: ['delete_file', 'list_files'], lang: 'ambiguous' },
];

async function testSemanticSearch(test) {
  const desc = `[${test.lang}] "${test.query.substring(0, 40)}..."`;
  process.stdout.write(`${desc.padEnd(55)} `);

  try {
    // Test recherche semantique pure
    const semanticResult = await searchTools(test.query, 10);
    const foundTools = semanticResult.tools || [];

    // Verifier si au moins un outil attendu est dans le top 10
    const found = test.expected.some(exp => foundTools.includes(exp));

    if (found) {
      console.log(`PASSED (${foundTools.slice(0, 3).join(', ')})`);
      passed++;
      details.push({ query: test.query, status: 'passed', found: foundTools.slice(0, 5), expected: test.expected });
    } else {
      console.log(`FAILED`);
      console.log(`    Expected one of: ${test.expected.join(', ')}`);
      console.log(`    Found: ${foundTools.slice(0, 5).join(', ')}`);
      failed++;
      details.push({ query: test.query, status: 'failed', found: foundTools.slice(0, 5), expected: test.expected });
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    failed++;
    details.push({ query: test.query, status: 'error', error: err.message });
  }
}

async function testKeywordFallback() {
  console.log('\n--- Test Fallback Keywords ---\n');

  const tests = [
    { query: "git status", expectedGroup: 'git' },
    { query: "fichier json", expectedGroup: 'files' },
    { query: "docker container", expectedGroup: 'docker' },
    { query: "npm install package", expectedGroup: 'npm' },
    { query: "sqlite database query", expectedGroup: 'database' },
  ];

  for (const test of tests) {
    process.stdout.write(`Keywords: "${test.query}".padEnd(30) `);

    const groups = detectToolGroups(test.query);

    if (groups.includes(test.expectedGroup)) {
      console.log(`PASSED (groups: ${groups.join(', ')})`);
      passed++;
    } else {
      console.log(`FAILED (expected: ${test.expectedGroup}, got: ${groups.join(', ')})`);
      failed++;
    }
  }
}

async function testHybridCombination() {
  console.log('\n--- Test Combinaison Hybride ---\n');

  const tests = [
    { query: "quelle heure est-il et donne la météo", expectedTools: ['get_time', 'get_weather'] },
    { query: "lis le fichier puis fais un backup", expectedTools: ['read_file', 'create_backup'] },
    { query: "recherche sur google et sauvegarde le résultat", expectedTools: ['web_search', 'write_file'] },
  ];

  for (const test of tests) {
    process.stdout.write(`Hybrid: "${test.query.substring(0, 35)}..."`.padEnd(50));

    try {
      const result = await getRelevantToolsHybrid(TOOL_DEFINITIONS, test.query, 15);
      const foundNames = result.tools.map(t => t.function?.name || t.name);

      // Verifier si les deux outils attendus sont trouves
      const allFound = test.expectedTools.every(exp => foundNames.includes(exp));

      if (allFound) {
        console.log(`PASSED`);
        passed++;
      } else {
        console.log(`FAILED`);
        const missing = test.expectedTools.filter(exp => !foundNames.includes(exp));
        console.log(`    Missing: ${missing.join(', ')}`);
        failed++;
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      failed++;
    }
  }
}

async function runAllTests() {
  console.log('--- Tests Recherche Semantique Pure ---\n');

  for (const test of SEMANTIC_TESTS) {
    await testSemanticSearch(test);
  }

  await testKeywordFallback();
  await testHybridCombination();

  // Resume
  console.log('\n===========================================');
  console.log(` RESUME: ${passed}/${passed + failed} tests passes`);
  console.log('===========================================');

  // Taux de reussite par categorie
  const passRate = ((passed / (passed + failed)) * 100).toFixed(1);
  console.log(`\nTaux de reussite: ${passRate}%`);

  // Sauvegarder
  const outputPath = path.join(resultsDir, `test_semantic_${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify({
    passed,
    failed,
    passRate: `${passRate}%`,
    details
  }, null, 2));
  console.log(`Resultats: ${outputPath}`);
}

runAllTests().catch(console.error);
