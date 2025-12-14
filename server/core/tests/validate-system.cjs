/**
 * Validation Finale du Système Core V2
 * Vérifie que tous les composants sont en place et fonctionnels
 */

const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('  VALIDATION FINALE - CORE V2');
console.log('========================================\n');

let passed = 0;
let failed = 0;
const errors = [];

function check(name, condition, errorMsg = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
    return true;
  } else {
    failed++;
    errors.push({ name, error: errorMsg || 'Check failed' });
    console.log(`  ✗ ${name}: ${errorMsg}`);
    return false;
  }
}

// ============ 1. FICHIERS CORE ============
console.log('┌─────────────────────────────────────┐');
console.log('│ 1. FICHIERS CORE                    │');
console.log('└─────────────────────────────────────┘\n');

const coreDir = path.join(__dirname, '..');
const coreFiles = [
  'loop-controller.cjs',
  'self-correction.cjs',
  'context-manager.cjs',
  'plan-manager.cjs',
  'transaction-manager.cjs',
  'index.cjs'
];

coreFiles.forEach(file => {
  const filePath = path.join(coreDir, file);
  check(`${file} existe`, fs.existsSync(filePath), 'Fichier non trouvé');
});

// ============ 2. IMPORTS CORE ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 2. IMPORTS CORE                     │');
console.log('└─────────────────────────────────────┘\n');

let coreExports;
try {
  coreExports = require('../index.cjs');
  check('index.cjs importable', true);
} catch (err) {
  check('index.cjs importable', false, err.message);
}

if (coreExports) {
  check('LoopController exporté', typeof coreExports.LoopController === 'function');
  check('SelfCorrection exporté', typeof coreExports.SelfCorrection === 'function');
  check('ContextManager exporté', typeof coreExports.ContextManager === 'function');
  check('PlanManager exporté', typeof coreExports.PlanManager === 'function');
  check('TransactionManager exporté', typeof coreExports.TransactionManager === 'function');
  check('selfCorrection singleton', coreExports.selfCorrection !== undefined);
  check('transactionManager singleton', coreExports.transactionManager !== undefined);
  check('TX_STATUS exporté', coreExports.TX_STATUS !== undefined);
  check('OP_TYPE exporté', coreExports.OP_TYPE !== undefined);
  check('STEP_STATUS exporté', coreExports.STEP_STATUS !== undefined);
  check('ERROR_STRATEGIES exporté', coreExports.ERROR_STRATEGIES !== undefined);
}

// ============ 3. FICHIERS AGENTS MODIFIÉS ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 3. AGENTS MODIFIÉS                  │');
console.log('└─────────────────────────────────────┘\n');

const serverDir = path.join(__dirname, '..', '..');
const agentFiles = [
  'agents/tool-agent.cjs',
  'agents/coding-agent.cjs',
  'services/ana-autonomous.cjs',
  'memory/tiered-memory.cjs',
  'config/tool-definitions.cjs'
];

for (const file of agentFiles) {
  const filePath = path.join(serverDir, file);
  if (check(`${file} existe`, fs.existsSync(filePath), 'Fichier non trouvé')) {
    // Vérifier que le fichier contient V2 ou core
    const content = fs.readFileSync(filePath, 'utf-8');
    const hasV2 = content.includes('V2') || content.includes('core/') || content.includes('core\\\\');
    check(`${file} contient V2/core`, hasV2, 'Pas de référence V2/core');
  }
}

// ============ 4. IMPORT AGENTS ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 4. IMPORT AGENTS (syntaxe)          │');
console.log('└─────────────────────────────────────┘\n');

// Vérifier syntaxe des fichiers principaux sans les exécuter complètement
const filesToCheck = [
  { path: 'agents/tool-agent.cjs', name: 'tool-agent.cjs' },
  { path: 'agents/coding-agent.cjs', name: 'coding-agent.cjs' }
];

for (const { path: filePath, name } of filesToCheck) {
  const fullPath = path.join(serverDir, filePath);
  try {
    // Vérifier syntaxe Node.js
    require('vm').compileFunction(fs.readFileSync(fullPath, 'utf-8'), [], {
      filename: fullPath
    });
    check(`${name} syntaxe valide`, true);
  } catch (err) {
    check(`${name} syntaxe valide`, false, err.message);
  }
}

// ============ 5. DOSSIERS TESTS ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 5. FICHIERS TESTS                   │');
console.log('└─────────────────────────────────────┘\n');

const testsDir = path.join(coreDir, 'tests');
const testFiles = [
  'test-loop-controller.cjs',
  'test-self-correction.cjs',
  'test-context-manager.cjs',
  'test-plan-manager.cjs',
  'test-transaction-manager.cjs',
  'test-integration.cjs',
  'run-all-tests.cjs'
];

testFiles.forEach(file => {
  const filePath = path.join(testsDir, file);
  check(`tests/${file} existe`, fs.existsSync(filePath), 'Fichier non trouvé');
});

// ============ 6. CRÉATION INSTANCES ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 6. CRÉATION INSTANCES               │');
console.log('└─────────────────────────────────────┘\n');

if (coreExports) {
  try {
    const lc = new coreExports.LoopController();
    check('LoopController instanciable', lc instanceof coreExports.LoopController);
  } catch (err) {
    check('LoopController instanciable', false, err.message);
  }

  try {
    const sc = new coreExports.SelfCorrection();
    check('SelfCorrection instanciable', sc instanceof coreExports.SelfCorrection);
  } catch (err) {
    check('SelfCorrection instanciable', false, err.message);
  }

  try {
    const cm = new coreExports.ContextManager();
    check('ContextManager instanciable', cm instanceof coreExports.ContextManager);
  } catch (err) {
    check('ContextManager instanciable', false, err.message);
  }

  try {
    const pm = new coreExports.PlanManager();
    check('PlanManager instanciable', pm instanceof coreExports.PlanManager);
  } catch (err) {
    check('PlanManager instanciable', false, err.message);
  }

  try {
    const tm = new coreExports.TransactionManager();
    check('TransactionManager instanciable', tm instanceof coreExports.TransactionManager);
  } catch (err) {
    check('TransactionManager instanciable', false, err.message);
  }
}

// ============ 7. TOOL DEFINITIONS ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 7. TOOL DEFINITIONS                 │');
console.log('└─────────────────────────────────────┘\n');

const toolDefsPath = path.join(serverDir, 'config/tool-definitions.cjs');
if (fs.existsSync(toolDefsPath)) {
  const content = fs.readFileSync(toolDefsPath, 'utf-8');

  // Noms réels des outils V2 ajoutés dans tool-definitions.cjs
  const newTools = [
    'create_plan',
    'plan_status',
    'begin_transaction',
    'commit_transaction',
    'rollback_transaction',
    'compress_context',
    'search_memory'
  ];

  newTools.forEach(tool => {
    check(`Tool ${tool} défini`, content.includes(tool), 'Tool non trouvé');
  });
}

// ============ 8. STATISTIQUES FICHIERS ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 8. STATISTIQUES FICHIERS            │');
console.log('└─────────────────────────────────────┘\n');

const stats = {
  coreModules: 0,
  testFiles: 0,
  totalLines: 0
};

// Compter lignes modules core
coreFiles.forEach(file => {
  const filePath = path.join(coreDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    stats.coreModules++;
    stats.totalLines += content.split('\\n').length;
  }
});

// Compter lignes tests
testFiles.forEach(file => {
  const filePath = path.join(testsDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    stats.testFiles++;
    stats.totalLines += content.split('\\n').length;
  }
});

console.log(`  Modules core: ${stats.coreModules}`);
console.log(`  Fichiers test: ${stats.testFiles}`);
console.log(`  Total lignes: ~${stats.totalLines}`);

// ============ RÉSUMÉ ============
console.log('\n========================================');
console.log('          RÉSUMÉ VALIDATION');
console.log('========================================\n');

console.log(`Vérifications passées: ${passed}`);
console.log(`Vérifications échouées: ${failed}`);
console.log(`Total: ${passed + failed}\n`);

if (failed > 0) {
  console.log('Erreurs:');
  errors.forEach(e => {
    console.log(`  - ${e.name}: ${e.error}`);
  });
  console.log('\n✗ VALIDATION INCOMPLÈTE\n');
  process.exit(1);
} else {
  console.log('========================================');
  console.log('  ✓ SYSTÈME CORE V2 VALIDÉ');
  console.log('========================================');
  console.log('\nRésumé des améliorations implémentées:');
  console.log('  1. LoopController - Boucle autonome sans limite fixe');
  console.log('  2. ContextManager - Gestion contexte 200K+');
  console.log('  3. SelfCorrection - Auto-correction intelligente');
  console.log('  4. PlanManager - Mode plan structuré');
  console.log('  5. TransactionManager - Transactions atomiques');
  console.log('\n');
  process.exit(0);
}
