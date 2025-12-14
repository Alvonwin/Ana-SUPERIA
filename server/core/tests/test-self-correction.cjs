/**
 * Tests Unitaires - SelfCorrection
 * Tests du système d'auto-correction
 */

const { SelfCorrection, selfCorrection, ERROR_STRATEGIES } = require('../self-correction.cjs');

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

function assertNotNull(value, message = '') {
  if (value === null || value === undefined) {
    throw new Error(`${message} Expected non-null value`);
  }
}

console.log('\n=== Tests SelfCorrection ===\n');

// Test 1: Création instance
test('SelfCorrection singleton existe', () => {
  assertNotNull(selfCorrection);
  assertTrue(selfCorrection instanceof SelfCorrection);
});

test('Création nouvelle instance SelfCorrection', () => {
  const sc = new SelfCorrection();
  assertTrue(sc instanceof SelfCorrection);
  assertTrue(Array.isArray(sc.errorPatterns));
  assertTrue(sc.errorPatterns.length > 0);
});

// Test 2: ERROR_STRATEGIES définies
test('ERROR_STRATEGIES contient stratégies requises', () => {
  assertTrue('SEARCH_THEN_RETRY' in ERROR_STRATEGIES);
  assertTrue('RETRY_WITH_DELAY' in ERROR_STRATEGIES);
  assertTrue('CHANGE_APPROACH' in ERROR_STRATEGIES);
  assertTrue('CREATE_MISSING' in ERROR_STRATEGIES);
  assertTrue('WAIT_AND_RETRY' in ERROR_STRATEGIES);
});

// Test 3: Détection pattern ENOENT
test('detectError identifie ENOENT', () => {
  const sc = new SelfCorrection();
  const error = new Error('ENOENT: no such file or directory');
  const detected = sc.detectError(error, { tool: 'read_file', path: '/test.txt' });

  assertNotNull(detected);
  assertEqual(detected.strategy, ERROR_STRATEGIES.SEARCH_THEN_RETRY);
});

// Test 4: Détection pattern timeout
test('detectError identifie timeout', () => {
  const sc = new SelfCorrection();
  const error = new Error('ETIMEDOUT: connection timed out');
  const detected = sc.detectError(error, { tool: 'http_request' });

  assertNotNull(detected);
  assertEqual(detected.strategy, ERROR_STRATEGIES.RETRY_WITH_DELAY);
});

// Test 5: Détection rate limit
test('detectError identifie rate limit', () => {
  const sc = new SelfCorrection();
  const error = new Error('Rate limit exceeded');
  const detected = sc.detectError(error, { tool: 'api_call' });

  assertNotNull(detected);
  assertEqual(detected.strategy, ERROR_STRATEGIES.WAIT_AND_RETRY);
});

// Test 6: Détection erreur générale
test('detectError gère erreur générale', () => {
  const sc = new SelfCorrection();
  const error = new Error('ECONNREFUSED: connection refused');
  const detected = sc.detectError(error, { tool: 'network' });

  assertNotNull(detected);
  assertEqual(detected.strategy, ERROR_STRATEGIES.RETRY_WITH_DELAY);
});

// Test 7: Erreur non reconnue
test('detectError retourne null pour erreur inconnue', () => {
  const sc = new SelfCorrection();
  const error = new Error('Some random unknown error xyz123abc789');
  const detected = sc.detectError(error, { tool: 'test' });

  // Non reconnu = null
  assertEqual(detected, null);
});

// Test 8: canRetry
test('canRetry retourne true initialement', () => {
  const sc = new SelfCorrection();
  sc.reset(); // S'assurer état propre
  assertTrue(sc.canRetry('test_action', 'test_error'));
});

test('canRetry retourne false après max retries', () => {
  const sc = new SelfCorrection();
  sc.reset();
  sc.maxRetries = 2;

  sc.recordAttempt('test_action', 'test_error', false);
  sc.recordAttempt('test_action', 'test_error', false);
  sc.recordAttempt('test_action', 'test_error', false);

  assertFalse(sc.canRetry('test_action', 'test_error'));
});

// Test 9: recordAttempt
test('recordAttempt enregistre tentative', () => {
  const sc = new SelfCorrection();
  sc.reset();
  sc.recordAttempt('action1', 'error1', false);

  const attempts = sc.getAttempts('action1', 'error1');
  assertEqual(attempts, 1);
});

test('recordAttempt reset sur succès', () => {
  const sc = new SelfCorrection();
  sc.reset();
  sc.recordAttempt('action1', 'error1', false);
  sc.recordAttempt('action1', 'error1', false);
  sc.recordAttempt('action1', 'error1', true); // Succès

  const attempts = sc.getAttempts('action1', 'error1');
  assertEqual(attempts, 0);
});

// Test 10: getDelayForRetry
test('getDelayForRetry retourne délai exponential', () => {
  const sc = new SelfCorrection();

  const delay1 = sc.getDelayForRetry(0);
  const delay2 = sc.getDelayForRetry(1);
  const delay3 = sc.getDelayForRetry(2);

  assertTrue(delay2 > delay1, 'Delay 2 devrait être > delay 1');
  assertTrue(delay3 > delay2, 'Delay 3 devrait être > delay 2');
});

test('getDelayForRetry retourne valeur positive', () => {
  const sc = new SelfCorrection();
  const delay = sc.getDelayForRetry(5);
  assertTrue(delay > 0);
  assertTrue(delay <= 60000); // Raisonnable
});

// Test 11: getSuggestion
test('getSuggestion retourne suggestion pour ENOENT', () => {
  const sc = new SelfCorrection();
  const error = new Error('ENOENT: no such file');
  const suggestion = sc.getSuggestion(error, { tool: 'read_file', path: '/missing.txt' });

  assertNotNull(suggestion);
  assertTrue(typeof suggestion === 'string');
  assertTrue(suggestion.length > 0);
});

// Test 12: getStats
test('getStats retourne statistiques', () => {
  const sc = new SelfCorrection();
  const stats = sc.getStats();

  assertNotNull(stats);
  assertTrue('correctionsAttempted' in stats);
  assertTrue('correctionsSucceeded' in stats);
  assertTrue('correctionsFailed' in stats);
});

// Test 13: reset
test('reset efface historique', () => {
  const sc = new SelfCorrection();
  sc.recordAttempt('action1', 'error1', false);
  sc.recordAttempt('action2', 'error2', false);

  sc.reset();

  assertEqual(sc.getAttempts('action1', 'error1'), 0);
  assertEqual(sc.getAttempts('action2', 'error2'), 0);
});

// Test 14: Pattern matching avancé
test('detectError match pattern ENOENT variations', () => {
  const sc = new SelfCorrection();

  const errors = [
    new Error('Error: ENOENT'),
    new Error('ENOENT error occurred'),
    'ENOENT: no such file'
  ];

  for (const err of errors) {
    const detected = sc.detectError(err, { tool: 'read_file' });
    assertNotNull(detected);
  }
});

// Test 15: Gestion erreurs string
test('detectError accepte string comme erreur', () => {
  const sc = new SelfCorrection();
  const detected = sc.detectError('ENOENT: no such file', { tool: 'test' });

  assertNotNull(detected);
  assertEqual(detected.strategy, ERROR_STRATEGIES.SEARCH_THEN_RETRY);
});

// Résumé
console.log('\n=== Résumé Tests SelfCorrection ===');
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
