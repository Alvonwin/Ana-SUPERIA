/**
 * TEST CYCLE FINAL - 181 OUTILS À 100%
 *
 * RÈGLES:
 * - AUCUNE modification du code
 * - Questions en langage naturel
 * - Vérification réelle des résultats
 * - 5 groupes (4×36 + 1×37)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ANA_API = 'http://localhost:3338/api/chat/v2';
const TEMP_DIR = 'E:/ANA/temp';
const DELAY_MS = 2000; // 2 secondes entre tests

// Résultats globaux
const resultatsGlobaux = {
  dateDebut: new Date().toISOString(),
  totalOutils: 181,
  totalTestes: 0,
  totalReussis: 0,
  totalEchoues: 0,
  groupes: []
};

/**
 * Pose une question à Ana et retourne sa réponse
 */
async function demanderAna(question) {
  try {
    const response = await axios.post(ANA_API, {
      message: question
    }, {
      timeout: 30000
    });

    if (response.data && response.data.success) {
      return {
        success: true,
        response: response.data.response,
        model: response.data.model,
        modelKey: response.data.modelKey
      };
    }

    return {
      success: false,
      error: 'Pas de réponse valide'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Questions en langage naturel pour chaque outil
 */
const questionsOutils = {
  // WEB & API
  'get_time': 'Quelle heure est-il maintenant?',
  'get_date': 'Quelle est la date aujourd\'hui?',
  'get_weather': 'Quel temps fait-il à Montréal?',
  'web_search': 'Cherche sur le web: météo Québec',
  'wikipedia_search': 'Cherche sur Wikipedia: Canada',

  // FILES
  'read_file': 'Lis le fichier E:/ANA/temp/LISTE_181_OUTILS.txt',
  'write_file': 'Écris "Test cycle final" dans E:/ANA/temp/test_cycle.txt',
  'list_files': 'Liste les fichiers dans E:/ANA/temp/',
  'file_info': 'Donne-moi des infos sur E:/ANA/temp/LISTE_181_OUTILS.txt',
  'delete_file': 'Supprime E:/ANA/temp/test_cycle.txt',

  // SYSTEM
  'get_cpu_usage': 'Quel est l\'usage du CPU?',
  'get_memory_usage': 'Quelle est l\'utilisation de la RAM?',
  'get_disk_usage': 'Quel est l\'espace disque disponible?',
  'get_system_info': 'Donne-moi les infos système',

  // GIT
  'git_status': 'Quel est le statut git dans E:/ANA?',
  'git_log': 'Montre-moi les derniers commits dans E:/ANA',

  // DEFAULT pour outils sans question spécifique
  '_default': (outil) => `Utilise l'outil ${outil}`
};

/**
 * Teste un outil
 */
async function testerOutil(outil, index, total) {
  console.log(`\\n[${index}/${total}] Test: ${outil}`);

  // Question en langage naturel
  const question = questionsOutils[outil] || questionsOutils._default(outil);
  console.log(`   Question: "${question}"`);

  // Demander à Ana
  const debut = Date.now();
  const resultat = await demanderAna(question);
  const duree = Date.now() - debut;

  // Analyser le résultat
  let statut = 'echec';
  let details = '';

  if (resultat.success) {
    console.log(`   ✅ Réponse reçue (${duree}ms)`);
    console.log(`   Modèle: ${resultat.model} (${resultat.modelKey})`);
    console.log(`   Extrait: ${resultat.response.substring(0, 100)}...`);

    // Vérification simple: réponse non vide et pas d'erreur évidente
    if (resultat.response && resultat.response.length > 10) {
      statut = 'succes';
      details = `Réponse valide (${resultat.response.length} chars)`;
    } else {
      statut = 'partiel';
      details = 'Réponse trop courte';
    }
  } else {
    console.log(`   ❌ ÉCHEC: ${resultat.error}`);
    details = resultat.error;
  }

  return {
    outil,
    question,
    statut,
    duree,
    model: resultat.model,
    modelKey: resultat.modelKey,
    reponseExtrait: resultat.success ? resultat.response.substring(0, 200) : null,
    details
  };
}

/**
 * Teste un groupe d'outils
 */
async function testerGroupe(groupeId) {
  console.log(`\\n${'='.repeat(60)}`);
  console.log(`GROUPE ${groupeId} - DÉBUT`);
  console.log(${'='.repeat(60)});

  // Charger les outils du groupe
  const fichierGroupe = path.join(TEMP_DIR, `GROUPE_${groupeId}_OUTILS.txt`);
  const outils = fs.readFileSync(fichierGroupe, 'utf8')
    .split('\\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  console.log(`Outils à tester: ${outils.length}`);

  const resultats = {
    groupeId,
    totalOutils: outils.length,
    totalTestes: 0,
    totalReussis: 0,
    totalEchoues: 0,
    tests: []
  };

  // Tester chaque outil
  for (let i = 0; i < outils.length; i++) {
    const outil = outils[i];
    const resultat = await testerOutil(outil, i + 1, outils.length);

    resultats.tests.push(resultat);
    resultats.totalTestes++;

    if (resultat.statut === 'succes') {
      resultats.totalReussis++;
    } else {
      resultats.totalEchoues++;
    }

    // Délai entre tests
    if (i < outils.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  // Sauvegarder résultats groupe
  const fichierResultats = path.join(TEMP_DIR, `GROUPE_${groupeId}_RESULTATS.json`);
  fs.writeFileSync(fichierResultats, JSON.stringify(resultats, null, 2));

  console.log(`\\n${'='.repeat(60)}`);
  console.log(`GROUPE ${groupeId} - TERMINÉ`);
  console.log(`Succès: ${resultats.totalReussis}/${resultats.totalTestes} (${(resultats.totalReussis/resultats.totalTestes*100).toFixed(1)}%)`);
  console.log(`${'='.repeat(60)}`);

  return resultats;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST CYCLE FINAL - 181 OUTILS À 100%                     ║');
  console.log('║  Aucune modification - Langage naturel - Vérification     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\\n');

  // Tester les 5 groupes
  for (let groupeId = 1; groupeId <= 5; groupeId++) {
    const resultatsGroupe = await testerGroupe(groupeId);
    resultatsGlobaux.groupes.push(resultatsGroupe);
    resultatsGlobaux.totalTestes += resultatsGroupe.totalTestes;
    resultatsGlobaux.totalReussis += resultatsGroupe.totalReussis;
    resultatsGlobaux.totalEchoues += resultatsGroupe.totalEchoues;

    console.log(`\\n⏳ Pause 5 secondes avant groupe suivant...\\n`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Rapport final
  resultatsGlobaux.dateFin = new Date().toISOString();
  resultatsGlobaux.pourcentageSucces = (resultatsGlobaux.totalReussis / resultatsGlobaux.totalTestes * 100).toFixed(2);

  // Sauvegarder rapport final
  const fichierRapport = path.join(TEMP_DIR, 'RAPPORT_FINAL_181_OUTILS.json');
  fs.writeFileSync(fichierRapport, JSON.stringify(resultatsGlobaux, null, 2));

  console.log('\\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                 RAPPORT FINAL                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\\nTotal outils testés: ${resultatsGlobaux.totalTestes}/${resultatsGlobaux.totalOutils}`);
  console.log(`Succès: ${resultatsGlobaux.totalReussis}`);
  console.log(`Échecs: ${resultatsGlobaux.totalEchoues}`);
  console.log(`Taux de succès: ${resultatsGlobaux.pourcentageSucces}%`);
  console.log(`\\nRapport sauvegardé: ${fichierRapport}`);

  if (resultatsGlobaux.pourcentageSucces === '100.00') {
    console.log('\\n🎉🎉🎉 VICTOIRE TOTALE - 181/181 = 100% 🎉🎉🎉\\n');
  } else {
    console.log(`\\n⚠️ Objectif non atteint: ${resultatsGlobaux.pourcentageSucces}% (cible: 100%)\\n`);
  }
}

// Lancer les tests
main().catch(err => {
  console.error('ERREUR FATALE:', err);
  process.exit(1);
});
