/**
 * RETEST 10 OUTILS EN ERREUR - Timeout étendu
 */

const axios = require('axios');
const fs = require('fs');

const API = 'http://localhost:3338/api/chat/v2';
const TIMEOUT = 120000; // 2 minutes

const OUTILS_ERREUR = [
  { nom: 'analyze_component', question: 'Analyse le component Button.jsx dans E:/ANA/ana-interface/src/' },
  { nom: 'list_available_icons', question: 'Liste tous les icônes disponibles dans le projet' },
  { nom: 'get_css_variables', question: 'Montre les variables CSS du projet' },
  { nom: 'create_backup', question: 'Crée backup de E:/ANA/package.json' },
  { nom: 'get_directory_size', question: 'Taille du dossier E:/ANA/temp/' },
  { nom: 'tree_view', question: 'Affiche arbre de E:/ANA/server/ avec max depth 2' },
  { nom: 'get_public_ip', question: 'Quelle est mon adresse IP publique?' },
  { nom: 'dns_lookup', question: 'DNS lookup pour google.com' },
  { nom: 'port_scan', question: 'Scan port 80 sur localhost' },
  { nom: 'hash_file', question: 'Hash SHA256 de E:/ANA/package.json' }
];

async function retester(test, index) {
  console.log(`[${index + 1}/${OUTILS_ERREUR.length}] ${test.nom}`);
  console.log(`    Q: ${test.question}`);

  try {
    const debut = Date.now();
    const r = await axios.post(API, { message: test.question }, { timeout: TIMEOUT });
    const duree = Date.now() - debut;

    if (r.data && r.data.success) {
      const reponse = r.data.response.substring(0, 100).replace(/\n/g, ' ');
      console.log(`    ✅ OK ${duree}ms`);
      console.log(`    "${reponse}..."`);
      return { outil: test.nom, statut: 'OK', duree };
    } else {
      console.log(`    ❌ FAIL`);
      return { outil: test.nom, statut: 'FAIL' };
    }
  } catch (e) {
    console.log(`    ❌ ERROR: ${e.message}`);
    return { outil: test.nom, statut: 'ERROR', erreur: e.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('RETEST 10 OUTILS EN ERREUR - Timeout 120s');
  console.log('='.repeat(60));

  const resultats = [];

  for (let i = 0; i < OUTILS_ERREUR.length; i++) {
    const r = await retester(OUTILS_ERREUR[i], i);
    resultats.push(r);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  const ok = resultats.filter(r => r.statut === 'OK').length;
  const fail = resultats.filter(r => r.statut === 'FAIL').length;
  const error = resultats.filter(r => r.statut === 'ERROR').length;

  console.log('\n' + '='.repeat(60));
  console.log(`RÉSULTATS RETEST: ${ok} OK | ${fail} FAIL | ${error} ERROR`);
  console.log(`Taux: ${(ok/OUTILS_ERREUR.length*100).toFixed(1)}%`);
  console.log('='.repeat(60));

  fs.writeFileSync('E:/ANA/temp/retest_results.json', JSON.stringify(resultats, null, 2));
}

main().catch(console.error);
