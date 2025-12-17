/**
 * TESTS END-TO-END - Phase 5 du plan
 *
 * Simule des requetes utilisateur reelles et verifie que les bons outils sont appeles
 */

const fs = require('fs');
const path = require('path');

const { TOOL_DEFINITIONS, TOOL_IMPLEMENTATIONS } = require('../server/agents/tool-agent.cjs');
const { getRelevantToolsHybrid } = require('../server/core/tool-groups.cjs');

const resultsDir = path.join(__dirname, 'results');

console.log('===========================================');
console.log(' TESTS END-TO-END - Phase 5');
console.log('===========================================\n');

// Scenarios de test avec les outils attendus
const SCENARIOS = [
  {
    query: "Quelle heure est-il?",
    expectedTools: ['get_time'],
    description: 'Demande de l\'heure'
  },
  {
    query: "Donne-moi mon horoscope, je suis Poissons",
    expectedTools: ['get_zodiac_sign'],
    description: 'Demande d\'horoscope'
  },
  {
    query: "Quelle est la meteo a Montreal?",
    expectedTools: ['get_weather'],
    description: 'Demande meteo'
  },
  {
    query: "Lis le fichier package.json dans E:\\ANA",
    expectedTools: ['read_file'],
    description: 'Lecture de fichier'
  },
  {
    query: "Cherche 'function' dans les fichiers .cjs",
    expectedTools: ['grep', 'search_in_file', 'search_codebase'],
    description: 'Recherche dans code'
  },
  {
    query: "Resume cette video YouTube: https://youtube.com/watch?v=test",
    expectedTools: ['get_yt_transcript'],
    description: 'Transcription YouTube'
  },
  {
    query: "Combien font 25 fois 48?",
    expectedTools: ['calculate'],
    description: 'Calcul mathematique'
  },
  {
    query: "Genere-moi un mot de passe securise de 20 caracteres",
    expectedTools: ['generate_password'],
    description: 'Generation mot de passe'
  },
  {
    query: "Montre-moi le statut git du projet ANA",
    expectedTools: ['git_status'],
    description: 'Statut git'
  },
  {
    query: "Recherche sur le web: meilleures pratiques Node.js 2025",
    expectedTools: ['web_search'],
    description: 'Recherche web'
  },
  {
    query: "Combien de RAM utilise mon PC en ce moment?",
    expectedTools: ['get_memory_usage'],
    description: 'Usage memoire'
  },
  {
    query: "Liste les processus qui tournent",
    expectedTools: ['list_processes'],
    description: 'Liste processus'
  },
  {
    query: "Convertis ce JSON en YAML: {\"key\": \"value\"}",
    expectedTools: ['json_to_yaml'],
    description: 'Conversion JSON-YAML'
  },
  {
    query: "Hashe le texte 'secret123' en SHA256",
    expectedTools: ['hash_text'],
    description: 'Hashage texte'
  },
  {
    query: "Verifie si cette email est valide: test@example.com",
    expectedTools: ['validate_email'],
    description: 'Validation email'
  }
];

let passed = 0;
let failed = 0;
const details = [];

async function runE2ETest(scenario) {
  process.stdout.write(`[E2E] ${scenario.description.padEnd(30)} `);

  try {
    // Utiliser la recherche hybride pour trouver les outils
    const result = await getRelevantToolsHybrid(TOOL_DEFINITIONS, scenario.query, 10);
    const foundTools = result.tools.map(t => t.function?.name || t.name);

    // Verifier si au moins un outil attendu est trouve
    const expectedFound = scenario.expectedTools.some(expected =>
      foundTools.includes(expected)
    );

    if (expectedFound) {
      console.log(`PASSED (found: ${foundTools.slice(0, 3).join(', ')})`);
      passed++;
      details.push({
        query: scenario.query,
        description: scenario.description,
        status: 'passed',
        expected: scenario.expectedTools,
        found: foundTools.slice(0, 5)
      });
    } else {
      console.log(`FAILED`);
      console.log(`    Expected: ${scenario.expectedTools.join(', ')}`);
      console.log(`    Found: ${foundTools.slice(0, 5).join(', ')}`);
      failed++;
      details.push({
        query: scenario.query,
        description: scenario.description,
        status: 'failed',
        expected: scenario.expectedTools,
        found: foundTools.slice(0, 5)
      });
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    failed++;
    details.push({
      query: scenario.query,
      description: scenario.description,
      status: 'error',
      error: err.message
    });
  }
}

async function runAllE2E() {
  for (const scenario of SCENARIOS) {
    await runE2ETest(scenario);
  }

  // Resume
  console.log('\n===========================================');
  console.log(` RESUME: ${passed}/${passed + failed} scenarios passes`);
  console.log('===========================================');

  // Details des echecs
  const failures = details.filter(d => d.status !== 'passed');
  if (failures.length > 0) {
    console.log('\nScenarios echoues:');
    failures.forEach(f => {
      console.log(`  - ${f.description}: Expected ${f.expected?.join('|')}`);
    });
  }

  // Sauvegarder
  const outputPath = path.join(resultsDir, `test_e2e_${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify({ passed, failed, details }, null, 2));
  console.log(`\nResultats: ${outputPath}`);
}

runAllE2E().catch(console.error);
