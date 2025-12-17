/**
 * Tests Unitaires - TransactionManager
 * Tests du gestionnaire de transactions atomiques
 */

const { TransactionManager, transactionManager, TX_STATUS, OP_TYPE } = require('../transaction-manager.cjs');
const fs = require('fs');
const path = require('path');

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

async function testAsync(name, fn) {
  try {
    await fn();
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

console.log('\n=== Tests TransactionManager ===\n');

// Test 1: Constants
test('TX_STATUS contient tous les statuts', () => {
  assertTrue('PENDING' in TX_STATUS);
  assertTrue('IN_PROGRESS' in TX_STATUS);
  assertTrue('COMMITTED' in TX_STATUS);
  assertTrue('ROLLED_BACK' in TX_STATUS);
  assertTrue('FAILED' in TX_STATUS);
});

test('OP_TYPE contient toutes les opérations', () => {
  assertTrue('CREATE' in OP_TYPE);
  assertTrue('MODIFY' in OP_TYPE);
  assertTrue('DELETE' in OP_TYPE);
  assertTrue('RENAME' in OP_TYPE);
});

// Test 2: Création instance
test('TransactionManager singleton existe', () => {
  assertNotNull(transactionManager);
  assertTrue(transactionManager instanceof TransactionManager);
});

test('Création nouvelle instance TransactionManager', () => {
  const tm = new TransactionManager();
  assertTrue(tm instanceof TransactionManager);
  assertNotNull(tm.backupDir);
  assertNotNull(tm.logDir);
});

// Test 3: beginTransaction
test('beginTransaction retourne txId', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Test transaction');

  assertNotNull(txId);
  assertTrue(typeof txId === 'string');
  assertTrue(txId.length > 0);
});

test('beginTransaction crée transaction en PENDING', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Test');

  const tx = tm.getTransaction(txId);
  assertNotNull(tx);
  assertEqual(tx.status, TX_STATUS.PENDING);
});

// Test 4: addOperation
test('addOperation ajoute opération CREATE', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Test');

  tm.addOperation(txId, {
    type: OP_TYPE.CREATE,
    path: '/test/file.txt',
    content: 'Hello World'
  });

  const tx = tm.getTransaction(txId);
  assertEqual(tx.operations.length, 1);
  assertEqual(tx.operations[0].type, OP_TYPE.CREATE);
});

test('addOperation ajoute opération MODIFY', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Test');

  tm.addOperation(txId, {
    type: OP_TYPE.MODIFY,
    path: '/test/existing.txt',
    content: 'New content',
    originalContent: 'Old content'
  });

  const tx = tm.getTransaction(txId);
  assertEqual(tx.operations.length, 1);
  assertEqual(tx.operations[0].type, OP_TYPE.MODIFY);
  assertNotNull(tx.operations[0].originalContent);
});

test('addOperation ajoute multiples opérations', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Multi-op');

  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/a.txt', content: 'A' });
  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/b.txt', content: 'B' });
  tm.addOperation(txId, { type: OP_TYPE.MODIFY, path: '/c.txt', content: 'C', originalContent: 'c' });

  const tx = tm.getTransaction(txId);
  assertEqual(tx.operations.length, 3);
});

// Test 5: getTransaction
test('getTransaction retourne transaction existante', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Test');

  const tx = tm.getTransaction(txId);
  assertNotNull(tx);
  assertEqual(tx.id, txId);
});

test('getTransaction retourne null pour ID inexistant', () => {
  const tm = new TransactionManager();
  assertEqual(tm.getTransaction('nonexistent-id'), null);
});

// Test 6: getStatus
test('getStatus retourne statut correct', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Test');

  const status = tm.getStatus(txId);
  assertTrue(status.found);
  assertEqual(status.status, TX_STATUS.PENDING);

  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/test.txt', content: 'x' });

  // Statut reste PENDING jusqu'au commit
  const status2 = tm.getStatus(txId);
  assertEqual(status2.status, TX_STATUS.PENDING);
});

test('getStatus retourne found false pour ID inexistant', () => {
  const tm = new TransactionManager();
  const status = tm.getStatus('fake-id');
  assertFalse(status.found);
});

// Test 7: hasPendingOperations
test('hasPendingOperations retourne false sans opérations', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Empty');

  assertFalse(tm.hasPendingOperations(txId));
});

test('hasPendingOperations retourne true avec opérations', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('With ops');
  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/test.txt', content: 'x' });

  assertTrue(tm.hasPendingOperations(txId));
});

// Test 8: getOperationCount
test('getOperationCount retourne nombre correct', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Count test');

  assertEqual(tm.getOperationCount(txId), 0);

  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/a.txt', content: 'a' });
  assertEqual(tm.getOperationCount(txId), 1);

  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/b.txt', content: 'b' });
  assertEqual(tm.getOperationCount(txId), 2);
});

// Test 9: cancelTransaction
test('cancelTransaction annule transaction', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('To cancel');
  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/temp.txt', content: 'x' });

  tm.cancelTransaction(txId);

  // Transaction devrait être marquée annulée ou supprimée
  const tx = tm.getTransaction(txId);
  assertTrue(tx === null || tx.status === TX_STATUS.ROLLED_BACK);
});

// Test 10: listTransactions
test('listTransactions retourne objet avec active et recent', () => {
  const tm = new TransactionManager();
  tm.beginTransaction('TX 1');
  tm.beginTransaction('TX 2');

  const list = tm.listTransactions();
  assertTrue('active' in list);
  assertTrue('recent' in list);
  assertTrue(Array.isArray(list.active));
  assertTrue(list.active.length >= 2);
});

// Test 11: listPendingTransactions
test('listPendingTransactions filtre par statut', () => {
  const tm = new TransactionManager();
  const tx1 = tm.beginTransaction('Pending 1');
  const tx2 = tm.beginTransaction('Pending 2');

  const pending = tm.listPendingTransactions();
  assertTrue(Array.isArray(pending));
  pending.forEach(tx => {
    assertEqual(tx.status, TX_STATUS.PENDING);
  });
});

// Test 12: getSummary
test('getSummary retourne résumé transaction', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Summary test');
  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/a.txt', content: 'a' });
  tm.addOperation(txId, { type: OP_TYPE.MODIFY, path: '/b.txt', content: 'b', originalContent: 'B' });

  const summary = tm.getSummary(txId);

  assertNotNull(summary);
  assertTrue('id' in summary);
  assertTrue('description' in summary);
  assertTrue('operationCount' in summary);
  assertTrue('status' in summary);
  assertEqual(summary.operationCount, 2);
});

// Test 13: Validation opérations
test('addOperation valide type opération', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Validation');

  // Type valide
  tm.addOperation(txId, { type: OP_TYPE.CREATE, path: '/test.txt', content: 'x' });
  assertEqual(tm.getOperationCount(txId), 1);
});

test('addOperation rejette opération sans path', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('No path test');

  // Le module retourne erreur si path manquant (ne lance pas exception)
  const result = tm.addOperation(txId, { type: OP_TYPE.CREATE, content: 'x' }); // Pas de path

  // Vérifie que l'opération est rejetée
  assertFalse(result.success, 'Devrait échouer sans path');
  assertTrue(result.error.includes('Path'), 'Erreur devrait mentionner Path');
  assertEqual(tm.getOperationCount(txId), 0, 'Aucune opération ne devrait être ajoutée');
});

// Test 14: DELETE operation
test('addOperation DELETE stocke path seulement', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Delete test');

  tm.addOperation(txId, {
    type: OP_TYPE.DELETE,
    path: '/file/to/delete.txt'
  });

  const tx = tm.getTransaction(txId);
  assertEqual(tx.operations[0].type, OP_TYPE.DELETE);
  assertEqual(tx.operations[0].path, '/file/to/delete.txt');
});

// Test 15: RENAME operation
test('addOperation RENAME stocke oldPath et newPath', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Rename test');

  tm.addOperation(txId, {
    type: OP_TYPE.RENAME,
    path: '/old/name.txt',
    newPath: '/new/name.txt'
  });

  const tx = tm.getTransaction(txId);
  assertEqual(tx.operations[0].type, OP_TYPE.RENAME);
  assertNotNull(tx.operations[0].newPath);
});

// Test 16: getTransactionAge
test('getTransactionAge retourne durée', () => {
  const tm = new TransactionManager();
  const txId = tm.beginTransaction('Age test');

  const age = tm.getTransactionAge(txId);
  assertTrue(typeof age === 'number');
  assertTrue(age >= 0);
  assertTrue(age < 1000); // Moins d'une seconde
});

// Test 17: Cleanup transactions anciennes
test('cleanup vieilles transactions ne crash pas', () => {
  const tm = new TransactionManager();
  tm.beginTransaction('Old TX');

  // cleanup devrait fonctionner sans erreur
  let threw = false;
  try {
    tm.cleanup(0); // Nettoie tout
  } catch (e) {
    threw = true;
  }

  assertFalse(threw);
});

// Test 18: Transactions concurrentes
test('Multiple transactions simultanées', () => {
  const tm = new TransactionManager();
  const tx1 = tm.beginTransaction('TX 1');
  const tx2 = tm.beginTransaction('TX 2');
  const tx3 = tm.beginTransaction('TX 3');

  tm.addOperation(tx1, { type: OP_TYPE.CREATE, path: '/1.txt', content: '1' });
  tm.addOperation(tx2, { type: OP_TYPE.CREATE, path: '/2.txt', content: '2' });
  tm.addOperation(tx3, { type: OP_TYPE.CREATE, path: '/3.txt', content: '3' });

  assertEqual(tm.getOperationCount(tx1), 1);
  assertEqual(tm.getOperationCount(tx2), 1);
  assertEqual(tm.getOperationCount(tx3), 1);
});

// Résumé
console.log('\n=== Résumé Tests TransactionManager ===');
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
