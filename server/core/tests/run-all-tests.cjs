/**
 * Runner de tous les tests unitaires
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const tests = [
  'test-loop-controller.cjs',
  'test-self-correction.cjs',
  'test-context-manager.cjs',
  'test-plan-manager.cjs',
  'test-transaction-manager.cjs'
];

const testDir = __dirname;
let totalPassed = 0;
let totalFailed = 0;
const results = [];

console.log('\n========================================');
console.log('  TESTS UNITAIRES - MODULES CORE V2');
console.log('========================================\n');

for (const test of tests) {
  const testPath = path.join(testDir, test);
  const moduleName = test.replace('test-', '').replace('.cjs', '');

  console.log(`\n┌─────────────────────────────────────┐`);
  console.log(`│ ${moduleName.toUpperCase().padEnd(35)} │`);
  console.log(`└─────────────────────────────────────┘`);

  try {
    const output = execSync(`node "${testPath}"`, {
      encoding: 'utf-8',
      timeout: 30000,
      cwd: testDir
    });

    console.log(output);

    // Parser le résultat
    const passedMatch = output.match(/Passés:\s*(\d+)/);
    const failedMatch = output.match(/Échoués:\s*(\d+)/);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;

    totalPassed += passed;
    totalFailed += failed;

    results.push({
      module: moduleName,
      passed,
      failed,
      status: failed === 0 ? 'PASS' : 'FAIL'
    });

  } catch (error) {
    console.log(`✗ ERREUR: ${error.message}`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.log(error.stderr);

    results.push({
      module: moduleName,
      passed: 0,
      failed: 1,
      status: 'ERROR',
      error: error.message
    });
    totalFailed++;
  }
}

// Résumé final
console.log('\n========================================');
console.log('          RÉSUMÉ FINAL');
console.log('========================================\n');

console.log('Module                 | Passés | Échoués | Status');
console.log('-----------------------|--------|---------|-------');

for (const r of results) {
  const moduleCol = r.module.padEnd(22);
  const passedCol = String(r.passed).padStart(6);
  const failedCol = String(r.failed).padStart(7);
  const statusCol = r.status;
  console.log(`${moduleCol} |${passedCol} |${failedCol} | ${statusCol}`);
}

console.log('-----------------------|--------|---------|-------');
console.log(`${'TOTAL'.padEnd(22)} |${String(totalPassed).padStart(6)} |${String(totalFailed).padStart(7)} | ${totalFailed === 0 ? 'PASS' : 'FAIL'}`);

console.log('\n========================================');
if (totalFailed === 0) {
  console.log('  ✓ TOUS LES TESTS PASSÉS !');
} else {
  console.log(`  ✗ ${totalFailed} TEST(S) ÉCHOUÉ(S)`);
}
console.log('========================================\n');

process.exit(totalFailed > 0 ? 1 : 0);
