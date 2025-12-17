/**
 * TEST 181 OUTILS - Langage Naturel
 * Test des outils via requêtes en langue naturelle
 */

const axios = require('axios');
const fs = require('fs');

const API = 'http://localhost:3338/api/chat/v2';
const DELAY = 3000; // 3 secondes entre chaque test

// Questions en langage naturel pour tester les outils
const TESTS = [
  // Groupe WEB
  { nom: 'web_search', question: 'Cherche sur le web: Claude AI' },
  { nom: 'get_weather', question: 'Quel temps fait-il à Paris?' },
  { nom: 'get_time', question: 'Quelle heure est-il maintenant?' },

  // Groupe FICHIERS
  { nom: 'read_file', question: 'Lis le fichier E:/ANA/README.md' },
  { nom: 'list_files', question: 'Liste les fichiers dans E:/ANA/server/' },
  { nom: 'file_info', question: 'Info sur E:/ANA/server/ana-core.cjs' },

  // Groupe SYSTÈME
  { nom: 'get_cpu_usage', question: 'Quel est usage CPU actuel?' },
  { nom: 'get_memory_usage', question: 'Combien de RAM utilisée?' },
  { nom: 'get_disk_usage', question: 'Espace disque disponible sur E:?' },

  // Groupe GIT
  { nom: 'git_status', question: 'Statut git dans E:/ANA/' },
];

async function tester(test, index) {
  console.log(`\n[${index + 1}/${TESTS.length}] Test: ${test.nom}`);
  console.log(`    Question: ${test.question}`);

  try {
    const debut = Date.now();
    const r = await axios.post(API,
      { message: test.question },
      { timeout: 60000 }
    );
    const duree = Date.now() - debut;

    if (r.data && r.data.success) {
      const reponse = r.data.response.substring(0, 100);
      console.log(`    ✅ ${duree}ms - ${r.data.model}`);
      console.log(`    "${reponse}..."`);
      return { test: test.nom, statut: 'OK', duree, model: r.data.model };
    } else {
      console.log(`    ❌ Pas de succès dans réponse`);
      return { test: test.nom, statut: 'FAIL', erreur: 'No success' };
    }
  } catch (e) {
    console.log(`    ❌ ERREUR: ${e.message}`);
    return { test: test.nom, statut: 'ERROR', erreur: e.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('TEST OUTILS - LANGAGE NATUREL');
  console.log('='.repeat(60));

  const resultats = [];

  for (let i = 0; i < TESTS.length; i++) {
    const r = await tester(TESTS[i], i);
    resultats.push(r);

    // Pause entre tests
    if (i < TESTS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY));
    }
  }

  // Statistiques
  const ok = resultats.filter(r => r.statut === 'OK').length;
  const fail = resultats.filter(r => r.statut === 'FAIL').length;
  const error = resultats.filter(r => r.statut === 'ERROR').length;

  console.log('\n' + '='.repeat(60));
  console.log(`RÉSULTATS: ${ok} OK | ${fail} FAIL | ${error} ERROR`);
  console.log(`Taux de réussite: ${(ok/TESTS.length*100).toFixed(1)}%`);
  console.log('='.repeat(60));

  // Sauvegarder résultats
  fs.writeFileSync('E:/ANA/temp/resultats_test_natural.json', JSON.stringify(resultats, null, 2));
  console.log('\nRésultats sauvegardés dans E:/ANA/temp/resultats_test_natural.json');
}

main().catch(console.error);
