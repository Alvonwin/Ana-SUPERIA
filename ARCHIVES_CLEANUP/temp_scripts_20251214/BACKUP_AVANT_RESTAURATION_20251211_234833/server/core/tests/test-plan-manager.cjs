/**
 * Tests Unitaires - PlanManager
 * Tests du gestionnaire de plans
 */

const { PlanManager, createPlanManager, STEP_STATUS } = require('../plan-manager.cjs');
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

console.log('\n=== Tests PlanManager ===\n');

// Test 1: STEP_STATUS
test('STEP_STATUS contient tous les statuts', () => {
  assertTrue('PENDING' in STEP_STATUS);
  assertTrue('IN_PROGRESS' in STEP_STATUS);
  assertTrue('COMPLETED' in STEP_STATUS);
  assertTrue('FAILED' in STEP_STATUS);
  assertTrue('SKIPPED' in STEP_STATUS);
  assertTrue('BLOCKED' in STEP_STATUS);
});

// Test 2: Création instance
test('Création PlanManager', () => {
  const pm = new PlanManager();
  assertTrue(pm instanceof PlanManager);
  assertNotNull(pm.plansDir);
});

test('createPlanManager factory', () => {
  const pm = createPlanManager();
  assertTrue(pm instanceof PlanManager);
});

// Test 3: createPlanSync (sans LLM)
test('createPlanSync crée plan basique', () => {
  const pm = new PlanManager();
  const plan = pm.createPlanSync({
    task: 'Test task',
    steps: ['Step 1', 'Step 2', 'Step 3']
  });

  assertNotNull(plan);
  assertTrue('id' in plan);
  assertTrue('title' in plan);
  assertTrue('steps' in plan);
  assertEqual(plan.steps.length, 3);
});

test('createPlanSync initialise étapes en PENDING', () => {
  const pm = new PlanManager();
  const plan = pm.createPlanSync({
    task: 'Test',
    steps: ['Do X', 'Do Y']
  });

  plan.steps.forEach(step => {
    assertEqual(step.status, STEP_STATUS.PENDING);
  });
});

// Test 4: getCurrentPlan
test('getCurrentPlan retourne null sans plan', () => {
  const pm = new PlanManager();
  assertEqual(pm.getCurrentPlan(), null);
});

test('getCurrentPlan retourne plan actif', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['Step 1'] });

  const current = pm.getCurrentPlan();
  assertNotNull(current);
  assertTrue('id' in current);
});

// Test 5: getStep
test('getStep retourne étape par index', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['First', 'Second', 'Third'] });

  const step = pm.getStep(1);
  assertNotNull(step);
  assertTrue(step.action.includes('Second'));
});

test('getStep retourne null pour index invalide', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['Only one'] });

  assertEqual(pm.getStep(5), null);
  assertEqual(pm.getStep(-1), null);
});

// Test 6: updateStepStatus
test('updateStepStatus change statut', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['Step 1'] });

  pm.updateStepStatus(0, STEP_STATUS.IN_PROGRESS);
  assertEqual(pm.getStep(0).status, STEP_STATUS.IN_PROGRESS);

  pm.updateStepStatus(0, STEP_STATUS.COMPLETED);
  assertEqual(pm.getStep(0).status, STEP_STATUS.COMPLETED);
});

test('updateStepStatus ajoute result', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['Step 1'] });

  pm.updateStepStatus(0, STEP_STATUS.COMPLETED, 'Success result');
  assertEqual(pm.getStep(0).result, 'Success result');
});

// Test 7: startNextStep
test('startNextStep démarre première étape PENDING', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A', 'B', 'C'] });

  const step = pm.startNextStep();
  assertNotNull(step);
  assertEqual(step.status, STEP_STATUS.IN_PROGRESS);
});

test('startNextStep saute étapes COMPLETED', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A', 'B', 'C'] });

  pm.updateStepStatus(0, STEP_STATUS.COMPLETED);

  const step = pm.startNextStep();
  assertEqual(pm.getStep(1).status, STEP_STATUS.IN_PROGRESS);
});

test('startNextStep retourne null si tout complété', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A'] });
  pm.updateStepStatus(0, STEP_STATUS.COMPLETED);

  assertEqual(pm.startNextStep(), null);
});

// Test 8: isCompleted
test('isCompleted retourne false avec étapes PENDING', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A', 'B'] });

  assertFalse(pm.isCompleted());
});

test('isCompleted retourne true quand tout COMPLETED', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A', 'B'] });
  pm.updateStepStatus(0, STEP_STATUS.COMPLETED);
  pm.updateStepStatus(1, STEP_STATUS.COMPLETED);

  assertTrue(pm.isCompleted());
});

test('isCompleted considère SKIPPED comme terminé', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A', 'B'] });
  pm.updateStepStatus(0, STEP_STATUS.COMPLETED);
  pm.updateStepStatus(1, STEP_STATUS.SKIPPED);

  assertTrue(pm.isCompleted());
});

// Test 9: getProgress
test('getProgress retourne pourcentage correct', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A', 'B', 'C', 'D'] });

  assertEqual(pm.getProgress(), 0);

  pm.updateStepStatus(0, STEP_STATUS.COMPLETED);
  assertEqual(pm.getProgress(), 25);

  pm.updateStepStatus(1, STEP_STATUS.COMPLETED);
  assertEqual(pm.getProgress(), 50);

  pm.updateStepStatus(2, STEP_STATUS.COMPLETED);
  pm.updateStepStatus(3, STEP_STATUS.COMPLETED);
  assertEqual(pm.getProgress(), 100);
});

// Test 10: getStatus
test('getStatus retourne résumé complet', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A', 'B'] });
  pm.updateStepStatus(0, STEP_STATUS.COMPLETED);

  const status = pm.getStatus();

  assertNotNull(status);
  assertTrue('active' in status);
  assertTrue('planId' in status);
  assertTrue('title' in status);
  assertTrue('progress' in status);
  assertEqual(status.progress.percentage, 50);
});

test('getStatus retourne active false sans plan', () => {
  const pm = new PlanManager();
  const status = pm.getStatus();
  assertEqual(status.active, false);
});

// Test 11: getPendingSteps
test('getPendingSteps retourne étapes non démarrées', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A', 'B', 'C'] });
  pm.updateStepStatus(0, STEP_STATUS.COMPLETED);

  const pending = pm.getPendingSteps();
  assertEqual(pending.length, 2);
});

// Test 12: getFailedSteps
test('getFailedSteps retourne étapes échouées', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A', 'B', 'C'] });
  pm.updateStepStatus(0, STEP_STATUS.FAILED, 'Error occurred');
  pm.updateStepStatus(1, STEP_STATUS.COMPLETED);

  const failedSteps = pm.getFailedSteps();
  assertEqual(failedSteps.length, 1);
  assertEqual(failedSteps[0].result, 'Error occurred');
});

// Test 13: clearPlan
test('clearPlan efface plan courant', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A'] });

  assertNotNull(pm.getCurrentPlan());

  pm.clearPlan();

  assertEqual(pm.getCurrentPlan(), null);
});

// Test 14: addStep
test('addStep ajoute étape au plan', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A', 'B'] });

  assertEqual(pm.getCurrentPlan().steps.length, 2);

  pm.addStep('New Step C');

  assertEqual(pm.getCurrentPlan().steps.length, 3);
  assertTrue(pm.getStep(2).action.includes('C'));
});

// Test 15: removeStep
test('removeStep supprime étape', () => {
  const pm = new PlanManager();
  pm.createPlanSync({ task: 'Test', steps: ['A', 'B', 'C'] });

  pm.removeStep(1);

  assertEqual(pm.getCurrentPlan().steps.length, 2);
});

// Test 16: hasPlan
test('hasPlan retourne true avec plan actif', () => {
  const pm = new PlanManager();
  assertFalse(pm.hasPlan());

  pm.createPlanSync({ task: 'Test', steps: ['A'] });
  assertTrue(pm.hasPlan());
});

// Test 17: Validation entrées
test('createPlanSync gère steps vide', () => {
  const pm = new PlanManager();
  const plan = pm.createPlanSync({ task: 'Empty', steps: [] });

  assertNotNull(plan);
  assertEqual(plan.steps.length, 0);
  assertTrue(pm.isCompleted()); // Vide = complété
});

test('createPlanSync échappe caractères spéciaux', () => {
  const pm = new PlanManager();
  const plan = pm.createPlanSync({
    task: 'Test with "quotes" and <brackets>',
    steps: ['Step with $pecial chars']
  });

  assertNotNull(plan);
  assertTrue(plan.title.includes('quotes'));
});

// Résumé
console.log('\n=== Résumé Tests PlanManager ===');
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
