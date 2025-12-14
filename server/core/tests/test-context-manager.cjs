/**
 * Tests Unitaires - ContextManager
 * Tests du gestionnaire de contexte 200K+
 */

const { ContextManager, createContextManager, createLargeContextManager, MODEL_CONTEXT_LIMITS } = require('../context-manager.cjs');

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

function assertApprox(actual, expected, tolerance, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message} Expected ~${expected} (±${tolerance}), got ${actual}`);
  }
}

console.log('\n=== Tests ContextManager ===\n');

// Test 1: Création instance
test('Création ContextManager avec options par défaut', () => {
  const cm = new ContextManager();
  assertTrue(cm instanceof ContextManager);
  assertNotNull(cm.defaultModel);
});

test('Création avec modèle spécifique', () => {
  const cm = new ContextManager({ model: 'phi3:mini-128k' });
  assertEqual(cm.defaultModel, 'phi3:mini-128k');
});

// Test 2: MODEL_CONTEXT_LIMITS
test('MODEL_CONTEXT_LIMITS contient modèles courants', () => {
  assertTrue('phi3:mini-128k' in MODEL_CONTEXT_LIMITS);
  assertTrue('qwen2.5-coder:7b' in MODEL_CONTEXT_LIMITS);
  assertTrue('default' in MODEL_CONTEXT_LIMITS);
});

test('Limites contexte sont raisonnables', () => {
  assertTrue(MODEL_CONTEXT_LIMITS['phi3:mini-128k'] >= 100000);
  assertTrue(MODEL_CONTEXT_LIMITS['default'] >= 4000);
});

// Test 3: Factory functions
test('createContextManager crée instance valide', () => {
  const cm = createContextManager({ model: 'qwen2.5-coder:7b' });
  assertTrue(cm instanceof ContextManager);
});

test('createLargeContextManager utilise grand contexte', () => {
  const cm = createLargeContextManager();
  assertTrue(cm.getContextLimit(cm.defaultModel) >= 100000);
});

// Test 4: getContextLimit
test('getContextLimit retourne limite pour modèle', () => {
  const cm = new ContextManager({ model: 'phi3:mini-128k' });
  const limit = cm.getContextLimit('phi3:mini-128k');
  assertEqual(limit, MODEL_CONTEXT_LIMITS['phi3:mini-128k']);
});

test('getContextLimit retourne défaut pour modèle inconnu', () => {
  const cm = new ContextManager({ model: 'unknown-model-xyz' });
  const limit = cm.getContextLimit('random-unknown');
  assertEqual(limit, MODEL_CONTEXT_LIMITS['default']);
});

// Test 5: estimateTokens
test('estimateTokens calcule approximation', () => {
  const cm = new ContextManager();

  // ~4 caractères par token
  const text = 'a'.repeat(400);
  const tokens = cm.estimateTokens(text);

  assertApprox(tokens, 100, 20, 'Estimation tokens');
});

test('estimateTokens gère tableau messages', () => {
  const cm = new ContextManager();
  const messages = [
    { role: 'user', content: 'Hello world' },
    { role: 'assistant', content: 'Hi there!' }
  ];

  const tokens = cm.estimateMessagesTokens(messages);
  assertTrue(tokens > 0);
});

// Test 6: needsCompression
test('needsCompression retourne false sous seuil', () => {
  const cm = new ContextManager();

  // Petit texte
  const smallContext = 'a'.repeat(100);

  assertFalse(cm.needsCompression(smallContext));
});

test('needsCompression retourne true au-dessus seuil', () => {
  const cm = new ContextManager({ model: 'default' });
  const limit = cm.getContextLimit('default'); // 8192

  // 80% du contexte (au-dessus de 75%)
  const largeContext = 'a'.repeat(Math.floor(limit * 0.8 * 4));

  assertTrue(cm.needsCompression(largeContext));
});

// Test 7: detectPriority
test('detectPriority HIGH pour code blocks', () => {
  const cm = new ContextManager();
  const content = '```javascript\nconst x = 1;\n```';

  const priority = cm.detectPriority(content);
  assertEqual(priority, 'HIGH');
});

test('detectPriority HIGH pour erreurs', () => {
  const cm = new ContextManager();
  const content = 'ERROR: Something went wrong';

  const priority = cm.detectPriority(content);
  assertEqual(priority, 'HIGH');
});

test('detectPriority MEDIUM pour plans', () => {
  const cm = new ContextManager();
  const content = 'Step 1: First do this\nStep 2: Then do that';

  const priority = cm.detectPriority(content);
  assertEqual(priority, 'MEDIUM');
});

test('detectPriority LOW pour texte simple', () => {
  const cm = new ContextManager();
  const content = 'Bonjour, je suis un texte simple sans rien de special.';

  const priority = cm.detectPriority(content);
  assertEqual(priority, 'LOW');
});

// Test 8: compress
test('compress préserve messages prioritaires', () => {
  const cm = new ContextManager();
  const messages = [
    { role: 'user', content: 'old message' },
    { role: 'assistant', content: 'old response' },
    { role: 'user', content: '```code block```' },
    { role: 'assistant', content: 'ERROR: important' },
    { role: 'user', content: 'latest message' }
  ];

  const compressed = cm.compress(messages, { preserveRecent: 2 });

  assertTrue(Array.isArray(compressed));
  assertTrue(compressed.length > 0);

  // Devrait préserver les messages récents
  const lastMessage = compressed[compressed.length - 1];
  assertEqual(lastMessage.content, 'latest message');
});

test('compress gère tableau vide', () => {
  const cm = new ContextManager();
  const compressed = cm.compress([]);

  assertTrue(Array.isArray(compressed));
  assertEqual(compressed.length, 0);
});

// Test 9: buildContext (async mais retourne promesse)
test('buildContext retourne array', async () => {
  const cm = new ContextManager();
  const messages = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi' }
  ];

  const context = await cm.buildContext(messages);

  assertTrue(Array.isArray(context));
});

// Test 10: getStats
test('getStats retourne statistiques', () => {
  const cm = new ContextManager();
  const stats = cm.getStats();

  assertNotNull(stats);
  assertTrue('totalMessages' in stats);
  assertTrue('compressedMessages' in stats);
  assertTrue('tokensEstimated' in stats);
});

// Test 11: createSummary
test('createSummary génère résumé', () => {
  const cm = new ContextManager();
  const messages = [
    { role: 'user', content: 'Please help me with X' },
    { role: 'assistant', content: 'Sure, here is how to do X' },
    { role: 'user', content: 'Now help with Y' },
    { role: 'assistant', content: 'For Y, you need to...' }
  ];

  const summary = cm.createSummary(messages);

  assertTrue(typeof summary === 'string');
  assertTrue(summary.length > 0);
});

// Test 12: extractCodeBlocks
test('extractCodeBlocks trouve blocs de code', () => {
  const cm = new ContextManager();
  const content = 'Some text\n```javascript\nconst x = 1;\n```\nMore text\n```python\nprint("hi")\n```';

  const blocks = cm.extractCodeBlocks(content);

  assertTrue(Array.isArray(blocks));
  assertEqual(blocks.length, 2);
});

test('extractCodeBlocks gère absence de code', () => {
  const cm = new ContextManager();
  const content = 'Just regular text without any code blocks.';

  const blocks = cm.extractCodeBlocks(content);

  assertTrue(Array.isArray(blocks));
  assertEqual(blocks.length, 0);
});

// Test 13: getRemainingCapacity
test('getRemainingCapacity calcule espace restant', () => {
  const cm = new ContextManager({ model: 'default' });
  const limit = cm.getContextLimit('default');
  const text = 'a'.repeat(1000); // ~250 tokens

  const remaining = cm.getRemainingCapacity(text);

  assertTrue(remaining > 0);
  assertTrue(remaining < limit);
});

// Test 14: shouldTruncate
test('shouldTruncate retourne info truncation', () => {
  const cm = new ContextManager({ model: 'default' });
  const limit = cm.getContextLimit('default');

  // Texte dépassant la limite
  const hugeText = 'a'.repeat(limit * 5);

  const result = cm.shouldTruncate(hugeText);

  assertNotNull(result);
  assertTrue(result.shouldTruncate === true);
  assertTrue(result.excessTokens > 0);
});

// Test 15: Compression préserve structure
test('Compression préserve structure de message', () => {
  const cm = new ContextManager();
  const messages = [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi!' }
  ];

  const compressed = cm.compress(messages);

  compressed.forEach(msg => {
    assertTrue('role' in msg, 'Message devrait avoir role');
    assertTrue('content' in msg, 'Message devrait avoir content');
    assertTrue(['system', 'user', 'assistant'].includes(msg.role));
  });
});

// Résumé
console.log('\n=== Résumé Tests ContextManager ===');
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
