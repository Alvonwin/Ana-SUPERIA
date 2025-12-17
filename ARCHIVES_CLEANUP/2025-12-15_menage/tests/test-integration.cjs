/**
 * Tests d'Intégration - Core Modules V2 avec Agents
 * Vérifie que les nouveaux modules s'intègrent correctement avec les agents existants
 */

const path = require('path');

// Import core modules
const {
  LoopController,
  SelfCorrection,
  ContextManager,
  PlanManager,
  TransactionManager,
  createLoopController,
  createContextManager,
  transactionManager,
  selfCorrection,
  TX_STATUS,
  OP_TYPE,
  STEP_STATUS,
  ERROR_STRATEGIES
} = require('../index.cjs');

// Compteurs de tests
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    results.push({ name, status: 'FAIL', error: error.message });
    console.log(`  ✗ ${name}: ${error.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    results.push({ name, status: 'FAIL', error: error.message });
    console.log(`  ✗ ${name}: ${error.message}`);
  }
}

function assertTrue(value, message = '') {
  if (!value) {
    throw new Error(`${message} Expected true, got ${value}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}`);
  }
}

function assertNotNull(value, message = '') {
  if (value === null || value === undefined) {
    throw new Error(`${message} Expected non-null value`);
  }
}

console.log('\n========================================');
console.log('  TESTS D\'INTÉGRATION - CORE V2');
console.log('========================================\n');

// ============ TEST GROUPE 1: Exports Index ============
console.log('┌─────────────────────────────────────┐');
console.log('│ 1. EXPORTS INDEX                    │');
console.log('└─────────────────────────────────────┘\n');

test('Index exporte LoopController', () => {
  assertNotNull(LoopController);
  assertTrue(typeof LoopController === 'function');
});

test('Index exporte SelfCorrection', () => {
  assertNotNull(SelfCorrection);
  assertTrue(typeof SelfCorrection === 'function');
});

test('Index exporte ContextManager', () => {
  assertNotNull(ContextManager);
  assertTrue(typeof ContextManager === 'function');
});

test('Index exporte PlanManager', () => {
  assertNotNull(PlanManager);
  assertTrue(typeof PlanManager === 'function');
});

test('Index exporte TransactionManager', () => {
  assertNotNull(TransactionManager);
  assertTrue(typeof TransactionManager === 'function');
});

test('Index exporte singletons', () => {
  assertNotNull(transactionManager);
  assertNotNull(selfCorrection);
});

test('Index exporte constantes TX_STATUS', () => {
  assertNotNull(TX_STATUS);
  assertTrue('PENDING' in TX_STATUS);
  assertTrue('COMMITTED' in TX_STATUS);
});

test('Index exporte constantes OP_TYPE', () => {
  assertNotNull(OP_TYPE);
  assertTrue('CREATE' in OP_TYPE);
  assertTrue('DELETE' in OP_TYPE);
});

test('Index exporte constantes STEP_STATUS', () => {
  assertNotNull(STEP_STATUS);
  assertTrue('PENDING' in STEP_STATUS);
  assertTrue('COMPLETED' in STEP_STATUS);
});

test('Index exporte constantes ERROR_STRATEGIES', () => {
  assertNotNull(ERROR_STRATEGIES);
  assertTrue('SEARCH_THEN_RETRY' in ERROR_STRATEGIES);
});

// ============ TEST GROUPE 2: LoopController + SelfCorrection ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 2. LOOP + SELF-CORRECTION           │');
console.log('└─────────────────────────────────────┘\n');

test('LoopController détecte erreur et SelfCorrection suggère correction', () => {
  const lc = new LoopController();
  const sc = new SelfCorrection();

  lc.start();

  // Simuler une erreur ENOENT
  const error = new Error('ENOENT: no such file');
  const detected = sc.detectError(error, { tool: 'read_file', path: '/missing.txt' });

  assertNotNull(detected);
  assertEqual(detected.strategy, ERROR_STRATEGIES.SEARCH_THEN_RETRY);

  // LoopController devrait permettre retry
  const result = lc.shouldContinue({
    action: 'read_file',
    result: { success: false, error: error.message }
  });

  assertTrue(result.continue, 'Devrait continuer après erreur');

  lc.stop('test');
});

test('LoopController arrête après trop d\'erreurs', () => {
  const lc = new LoopController({ maxConsecutiveErrors: 2 });
  const sc = new SelfCorrection();

  lc.start();

  // Simuler plusieurs erreurs
  lc.shouldContinue({ action: 'test', result: { success: false, error: 'fail' } });
  const result = lc.shouldContinue({ action: 'test2', result: { success: false, error: 'fail' } });

  assertEqual(result.continue, false);
  assertEqual(result.reason, 'too_many_errors');

  lc.stop('test');
});

test('SelfCorrection et LoopController partagent logique retry', () => {
  const lc = new LoopController();
  const sc = new SelfCorrection();

  sc.reset();
  lc.start();

  // Les deux peuvent tracker les retries indépendamment
  assertTrue(sc.canRetry('action1', 'error1'));
  assertTrue(lc.canRetry('action1'));

  lc.stop('test');
});

// ============ TEST GROUPE 3: ContextManager + Messages ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 3. CONTEXT MANAGER                  │');
console.log('└─────────────────────────────────────┘\n');

test('ContextManager gère messages système', () => {
  const cm = new ContextManager({ model: 'qwen2.5-coder:7b' });

  const messages = [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' }
  ];

  const tokens = cm.estimateMessagesTokens(messages);
  assertTrue(tokens > 0);

  const compressed = cm.compress(messages);
  assertTrue(Array.isArray(compressed));
  compressed.forEach(msg => {
    assertTrue('role' in msg);
    assertTrue('content' in msg);
  });
});

test('ContextManager détecte priorité code', () => {
  const cm = new ContextManager();

  const codeContent = '```javascript\nconst x = 1;\n```';
  const textContent = 'Just regular text';

  assertEqual(cm.detectPriority(codeContent), 'HIGH');
  assertEqual(cm.detectPriority(textContent), 'LOW');
});

test('ContextManager calcule capacité restante', () => {
  const cm = new ContextManager({ model: 'default' });
  const limit = cm.getContextLimit('default');

  const content = 'a'.repeat(1000);
  const remaining = cm.getRemainingCapacity(content);

  assertTrue(remaining > 0);
  assertTrue(remaining < limit);
});

// ============ TEST GROUPE 4: PlanManager Workflow ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 4. PLAN MANAGER WORKFLOW            │');
console.log('└─────────────────────────────────────┘\n');

test('PlanManager crée et exécute plan complet', () => {
  const pm = new PlanManager();

  // Créer un plan
  const plan = pm.createPlanSync({
    task: 'Test workflow',
    steps: ['Step 1: Setup', 'Step 2: Execute', 'Step 3: Verify']
  });

  assertNotNull(plan);
  assertEqual(plan.steps.length, 3);

  // Vérifier progression initiale
  assertEqual(pm.getProgress(), 0);

  // Exécuter étapes
  pm.startNextStep();
  assertEqual(pm.getStep(0).status, STEP_STATUS.IN_PROGRESS);

  pm.updateStepStatus(0, STEP_STATUS.COMPLETED, 'Done');
  assertEqual(pm.getProgress(), Math.round(100/3));

  pm.startNextStep();
  pm.updateStepStatus(1, STEP_STATUS.COMPLETED);

  pm.startNextStep();
  pm.updateStepStatus(2, STEP_STATUS.COMPLETED);

  // Vérifier complétion
  assertTrue(pm.isCompleted());
  assertEqual(pm.getProgress(), 100);
});

test('PlanManager gère échecs et skips', () => {
  const pm = new PlanManager();

  pm.createPlanSync({
    task: 'Test failures',
    steps: ['Step 1', 'Step 2', 'Step 3']
  });

  pm.updateStepStatus(0, STEP_STATUS.COMPLETED);
  pm.updateStepStatus(1, STEP_STATUS.FAILED, 'Error occurred');
  pm.updateStepStatus(2, STEP_STATUS.SKIPPED, 'Skipped due to failure');

  const failed = pm.getFailedSteps();
  assertEqual(failed.length, 1);
  assertEqual(failed[0].result, 'Error occurred');

  // FAILED ne compte pas comme terminé
  assertEqual(pm.isCompleted(), false);
});

// ============ TEST GROUPE 5: TransactionManager Operations ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 5. TRANSACTION MANAGER              │');
console.log('└─────────────────────────────────────┘\n');

test('Transaction workflow complet', () => {
  const tm = new TransactionManager();

  // Démarrer transaction
  const txId = tm.beginTransaction('Test transaction');
  assertNotNull(txId);

  // Ajouter opérations
  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/test/file1.txt', content: 'Content 1' });
  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/test/file2.txt', content: 'Content 2' });
  tm.addOperation(txId, { type: OP_TYPE.MODIFY, path: '/test/existing.txt', content: 'New', originalContent: 'Old' });

  // Vérifier état
  assertEqual(tm.getOperationCount(txId), 3);
  assertTrue(tm.hasPendingOperations(txId));

  const status = tm.getStatus(txId);
  assertTrue(status.found);
  assertEqual(status.status, TX_STATUS.PENDING);

  // Cleanup
  tm.cancelTransaction(txId);
});

test('Transaction list et pending', () => {
  const tm = new TransactionManager();

  const tx1 = tm.beginTransaction('TX 1');
  const tx2 = tm.beginTransaction('TX 2');

  tm.addOperation(tx1, { type: OP_TYPE.CREATE, path: '/a.txt', content: 'a' });

  const list = tm.listTransactions();
  assertTrue('active' in list);
  assertTrue(list.active.length >= 2);

  const pending = tm.listPendingTransactions();
  assertTrue(Array.isArray(pending));

  // Cleanup
  tm.cancelTransaction(tx1);
  tm.cancelTransaction(tx2);
});

// ============ TEST GROUPE 6: Intégration Multi-Modules ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 6. INTÉGRATION MULTI-MODULES        │');
console.log('└─────────────────────────────────────┘\n');

test('Workflow complet: Plan + Loop + Transaction', () => {
  const pm = new PlanManager();
  const lc = new LoopController({ globalTimeoutMs: 60000 });
  const tm = new TransactionManager();

  // 1. Créer plan
  pm.createPlanSync({
    task: 'Multi-file update',
    steps: ['Create files', 'Verify', 'Commit']
  });

  // 2. Démarrer loop
  lc.start();

  // 3. Démarrer transaction
  const txId = tm.beginTransaction('Multi-file update');

  // 4. Étape 1: Create files
  pm.startNextStep();
  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/new1.txt', content: 'New 1' });
  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/new2.txt', content: 'New 2' });

  // Vérifier loop continue
  let result = lc.shouldContinue({
    action: 'create_file',
    result: { success: true }
  });
  assertTrue(result.continue);

  pm.updateStepStatus(0, STEP_STATUS.COMPLETED);

  // 5. Étape 2: Verify
  pm.startNextStep();
  assertEqual(tm.getOperationCount(txId), 2);
  pm.updateStepStatus(1, STEP_STATUS.COMPLETED);

  // 6. Étape 3: Would commit (skip actual commit)
  pm.startNextStep();
  pm.updateStepStatus(2, STEP_STATUS.COMPLETED, 'Simulated commit');

  // 7. Vérifier complétion
  assertTrue(pm.isCompleted());

  // Cleanup
  lc.stop('completed');
  tm.cancelTransaction(txId);
});

test('Workflow: Error detection + Self-correction + Loop', () => {
  const lc = new LoopController({ repetitionThreshold: 5 });
  const sc = new SelfCorrection();

  sc.reset();
  lc.start();

  // Simuler erreur
  const error = new Error('ENOENT: file not found');
  const detected = sc.detectError(error, { tool: 'read_file' });

  assertNotNull(detected);

  // Obtenir suggestion
  const suggestion = sc.getSuggestion(error, { tool: 'read_file', path: '/missing.txt' });
  assertTrue(typeof suggestion === 'string');
  assertTrue(suggestion.length > 0);

  // Vérifier que loop permet correction
  const result = lc.shouldContinue({
    action: 'read_file',
    result: { success: false, error: error.message }
  });

  assertTrue(result.continue, 'Devrait permettre retry');

  lc.stop('test');
});

test('ContextManager + PlanManager pour tâche complexe', () => {
  const cm = new ContextManager({ model: 'phi3:mini-128k' });
  const pm = new PlanManager();

  // Simuler messages avec plan
  const messages = [
    { role: 'system', content: 'You are a task planner' },
    { role: 'user', content: 'Create a plan for refactoring' },
    { role: 'assistant', content: '```json\n{"steps": ["analyze", "refactor", "test"]}\n```' }
  ];

  // Context manager peut gérer ces messages
  const tokens = cm.estimateMessagesTokens(messages);
  assertTrue(tokens > 0);

  // Plan manager peut créer le plan
  pm.createPlanSync({
    task: 'Refactoring',
    steps: ['Analyze code', 'Refactor modules', 'Run tests']
  });

  assertTrue(pm.hasPlan());
  assertEqual(pm.getProgress(), 0);
});

// ============ TEST GROUPE 7: Edge Cases ============
console.log('\n┌─────────────────────────────────────┐');
console.log('│ 7. EDGE CASES                       │');
console.log('└─────────────────────────────────────┘\n');

test('LoopController gère timeout immédiat', () => {
  const lc = new LoopController({ globalTimeoutMs: 1 });
  lc.start();

  // Attendre un peu pour que timeout soit dépassé
  lc.startTime = Date.now() - 100;

  const result = lc.shouldContinue({ action: 'test', result: { success: true } });
  assertEqual(result.continue, false);
  assertEqual(result.reason, 'global_timeout');

  lc.stop('timeout');
});

test('PlanManager gère plan vide', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Empty', steps: [] });

  assertTrue(pm.hasPlan());
  assertTrue(pm.isCompleted()); // Vide = complété (rien à faire)
  // getProgress retourne 0 pour plan vide (pas de division par 0)
  assertEqual(pm.getProgress(), 0);
});

test('TransactionManager gère transaction inexistante', () => {
  const tm = new TransactionManager();

  const tx = tm.getTransaction('nonexistent');
  assertEqual(tx, null);

  const status = tm.getStatus('nonexistent');
  assertEqual(status.found, false);
});

test('SelfCorrection gère erreur inconnue', () => {
  const sc = new SelfCorrection();

  const detected = sc.detectError(new Error('Completely unknown error xyz123'), { tool: 'test' });
  assertEqual(detected, null);
});

test('ContextManager gère messages vides', () => {
  const cm = new ContextManager();

  const compressed = cm.compress([]);
  assertTrue(Array.isArray(compressed));
  assertEqual(compressed.length, 0);
});

// ============ RÉSUMÉ ============
console.log('\n========================================');
console.log('          RÉSUMÉ INTÉGRATION');
console.log('========================================\n');

console.log(`Tests passés: ${passed}`);
console.log(`Tests échoués: ${failed}`);
console.log(`Total: ${passed + failed}\n`);

if (failed > 0) {
  console.log('Tests échoués:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
  console.log('\n✗ CERTAINS TESTS ONT ÉCHOUÉ\n');
  process.exit(1);
} else {
  console.log('========================================');
  console.log('  ✓ TOUS LES TESTS D\'INTÉGRATION PASSÉS');
  console.log('========================================\n');
  process.exit(0);
}
