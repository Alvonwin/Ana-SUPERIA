/**
 * Tests Unitaires - LoopController
 * Tests du contrôleur de boucle autonome
 */

const { LoopController, createLoopController, createQuickLoopController, createLongRunningController, LOOP_CONFIG, DEFAULT_CONFIG } = require('../loop-controller.cjs');

// Compteurs de tests
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    results.push({ name, status: 'FAIL', error: error.message });
    console.log(`✗ ${name}: ${error.message}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, message = '') {
  if (!value) {
    throw new Error(`${message} Expected true, got ${value}`);
  }
}

function assertFalse(value, message = '') {
  if (value) {
    throw new Error(`${message} Expected false, got ${value}`);
  }
}

console.log('\n=== Tests LoopController ===\n');

// Test 1: Création basique
test('Création LoopController avec options par défaut', () => {
  const lc = new LoopController();
  assertTrue(lc instanceof LoopController);
  assertEqual(lc.config.globalTimeoutMs, DEFAULT_CONFIG.globalTimeoutMs);
});

// Test 2: Création avec options personnalisées
test('Création LoopController avec options personnalisées', () => {
  const lc = new LoopController({
    globalTimeoutMs: 60000,
    repetitionThreshold: 5
  });
  assertEqual(lc.config.globalTimeoutMs, 60000);
  assertEqual(lc.config.repetitionThreshold, 5);
});

// Test 3: Factory functions
test('createLoopController crée une instance valide', () => {
  const lc = createLoopController({ globalTimeoutMs: 50000 });
  assertTrue(lc instanceof LoopController);
  assertEqual(lc.config.globalTimeoutMs, 50000);
});

test('createQuickLoopController utilise config courte', () => {
  const lc = createQuickLoopController();
  // Quick = 2 minutes
  assertEqual(lc.config.globalTimeoutMs, 2 * 60 * 1000);
});

test('createLongRunningController utilise config longue', () => {
  const lc = createLongRunningController();
  // Long = 30 minutes
  assertEqual(lc.config.globalTimeoutMs, 30 * 60 * 1000);
});

// Test 4: start et stop
test('start initialise correctement', () => {
  const lc = new LoopController();
  lc.start();
  assertTrue(lc.isRunning);
  assertTrue(lc.startTime !== null);
  assertEqual(lc.iteration, 0);
  lc.stop('test');
});

test('stop arrête la boucle', () => {
  const lc = new LoopController();
  lc.start();
  lc.stop('test_reason');
  assertFalse(lc.isRunning);
});

// Test 5: shouldContinue - basique
test('shouldContinue retourne objet avec continue', () => {
  const lc = new LoopController();
  lc.start();
  const result = lc.shouldContinue({
    action: 'read_file',
    result: { success: true }
  });
  assertTrue('continue' in result);
  assertTrue('reason' in result);
  lc.stop('test');
});

// Test 6: shouldContinue - succès détecté via llmResponse
test('shouldContinue détecte succès dans llmResponse', () => {
  const lc = new LoopController();
  lc.start();
  const result = lc.shouldContinue({
    llmResponse: 'La tâche est terminée avec succès.'
  });
  assertFalse(result.continue);
  assertEqual(result.reason, 'success_detected');
  lc.stop('test');
});

// Test 7: shouldContinue - pas de tool call = fini
test('shouldContinue sans action avec réponse = fini', () => {
  const lc = new LoopController();
  lc.start();
  const result = lc.shouldContinue({
    llmResponse: 'Voici la réponse complète à votre question avec tous les détails nécessaires pour comprendre le sujet.'
  });
  assertFalse(result.continue);
  assertEqual(result.reason, 'no_tool_calls');
  lc.stop('test');
});

// Test 8: shouldContinue - action normale continue
test('shouldContinue continue pour action normale', () => {
  const lc = new LoopController();
  lc.start();
  const result = lc.shouldContinue({
    action: 'read_file',
    result: { success: true }
  });
  assertTrue(result.continue);
  lc.stop('test');
});

// Test 9: Détection répétitions
test('shouldContinue détecte les répétitions', () => {
  const lc = new LoopController({ repetitionThreshold: 3 });
  lc.start();

  // Même action 3 fois
  const ctx = { action: 'read_file', args: { path: '/test.txt' }, result: { success: true } };
  lc.shouldContinue(ctx);
  lc.shouldContinue(ctx);
  const result = lc.shouldContinue(ctx);

  assertTrue(result.needsCorrection === true);
  assertEqual(result.reason, 'repetition_detected');
  lc.stop('test');
});

// Test 10: Détection erreurs consécutives
test('shouldContinue détecte trop d erreurs consécutives', () => {
  const lc = new LoopController({ maxConsecutiveErrors: 3 });
  lc.start();

  lc.shouldContinue({ action: 'test', result: { success: false, error: 'fail 1' } });
  lc.shouldContinue({ action: 'test2', result: { success: false, error: 'fail 2' } });
  const result = lc.shouldContinue({ action: 'test3', result: { success: false, error: 'fail 3' } });

  assertFalse(result.continue);
  assertEqual(result.reason, 'too_many_errors');
  lc.stop('test');
});

// Test 11: Reset erreurs sur succès
test('Erreurs consécutives reset sur succès', () => {
  const lc = new LoopController({ maxConsecutiveErrors: 3 });
  lc.start();

  lc.shouldContinue({ action: 'test', result: { success: false, error: 'fail 1' } });
  lc.shouldContinue({ action: 'test', result: { success: false, error: 'fail 2' } });
  lc.shouldContinue({ action: 'test', result: { success: true } }); // Reset
  const result = lc.shouldContinue({ action: 'test', result: { success: false, error: 'fail again' } });

  assertTrue(result.continue); // Devrait continuer car reset
  lc.stop('test');
});

// Test 12: Timeout global
test('shouldContinue détecte timeout', () => {
  const lc = new LoopController({ globalTimeoutMs: 100 });
  lc.start();
  lc.startTime = Date.now() - 200; // Simuler démarrage il y a 200ms

  const result = lc.shouldContinue({ action: 'test', result: { success: true } });

  assertFalse(result.continue);
  assertEqual(result.reason, 'global_timeout');
  lc.stop('test');
});

// Test 13: getStats
test('getStats retourne statistiques correctes', () => {
  const lc = new LoopController();
  lc.start();
  lc.shouldContinue({ action: 'test1', result: { success: true } });
  lc.shouldContinue({ action: 'test2', result: { success: false, error: 'test error' } });

  const stats = lc.getStats();

  assertEqual(stats.iteration, 2);
  assertTrue(stats.isRunning);
  assertEqual(stats.totalIterations, 2);
  lc.stop('test');
});

// Test 14: canRetry
test('canRetry retourne true sous limite', () => {
  const lc = new LoopController();
  lc.start();

  assertTrue(lc.canRetry('test_action'));
  assertTrue(lc.canRetry('test_action'));
  assertTrue(lc.canRetry('test_action'));
  assertFalse(lc.canRetry('test_action'));
  lc.stop('test');
});

// Test 15: Reset via resetHistory
test('resetHistory réinitialise historique', () => {
  const lc = new LoopController();
  lc.start();
  lc.shouldContinue({ action: 'test', result: { success: true } });

  lc.resetHistory();

  assertEqual(lc.actionHistory.length, 0);
  assertEqual(lc.errorHistory.length, 0);
  assertEqual(lc.consecutiveErrors, 0);
  lc.stop('test');
});

// Test 16: Checkpoints
test('createCheckpoint crée un checkpoint', () => {
  const lc = new LoopController();
  lc.start();
  lc.shouldContinue({ action: 'test', result: { success: true } });

  const cpId = lc.createCheckpoint({ foo: 'bar' });

  assertTrue(cpId.startsWith('cp_'));
  assertEqual(lc.checkpoints.length, 1);
  lc.stop('test');
});

test('getLastCheckpoint retourne dernier checkpoint', () => {
  const lc = new LoopController();
  lc.start();
  lc.createCheckpoint({ state: 1 });
  lc.createCheckpoint({ state: 2 });

  const last = lc.getLastCheckpoint();

  assertEqual(last.state.state, 2);
  lc.stop('test');
});

// Résumé
console.log('\n=== Résumé Tests LoopController ===');
console.log(`Passés: ${passed}`);
console.log(`Échoués: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  console.log('\nTests échoués:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('\n✓ Tous les tests passés!');
  process.exit(0);
}
