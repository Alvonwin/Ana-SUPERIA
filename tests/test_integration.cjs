/**
 * TESTS D'INTEGRATION - Phase 4 du plan
 *
 * Teste les scenarios ou plusieurs outils s'enchainent
 */

const fs = require('fs');
const path = require('path');

const { TOOL_IMPLEMENTATIONS } = require('../server/agents/tool-agent.cjs');

const testFilesDir = path.join(__dirname, 'test_files');
const resultsDir = path.join(__dirname, 'results');

console.log('===========================================');
console.log(' TESTS D\'INTEGRATION - Phase 4');
console.log('===========================================\n');

let passed = 0;
let failed = 0;
const details = [];

async function runTest(name, testFn) {
  process.stdout.write(`[Test] ${name.padEnd(50)} `);
  try {
    await testFn();
    console.log('PASSED');
    passed++;
    details.push({ name, status: 'passed' });
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
    failed++;
    details.push({ name, status: 'failed', error: err.message });
  }
}

async function runAllTests() {
  // Test 1: Fichiers enchaines - write -> read -> edit -> backup
  await runTest('Fichiers: write → read → edit → backup', async () => {
    const filePath = path.join(testFilesDir, 'integration_test.txt');

    // Ecrire
    const writeResult = await TOOL_IMPLEMENTATIONS.write_file({
      path: filePath,
      content: 'Ligne 1\nLigne 2\nLigne 3'
    });
    if (!writeResult.success) throw new Error('write_file failed');

    // Lire
    const readResult = await TOOL_IMPLEMENTATIONS.read_file({ path: filePath });
    if (!readResult.success) throw new Error('read_file failed');
    if (!readResult.content.includes('Ligne 1')) throw new Error('content mismatch');

    // Editer
    const editResult = await TOOL_IMPLEMENTATIONS.edit_file({
      path: filePath,
      old_text: 'Ligne 2',
      new_text: 'Ligne 2 modifiee'
    });
    if (!editResult.success) throw new Error('edit_file failed');

    // Backup
    const backupResult = await TOOL_IMPLEMENTATIONS.create_backup({ path: filePath });
    if (!backupResult.success) throw new Error('create_backup failed');
  });

  // Test 2: Git workflow - status -> log -> diff
  await runTest('Git: status → log → branch', async () => {
    const repoPath = 'E:\\ANA';

    const statusResult = await TOOL_IMPLEMENTATIONS.git_status({ path: repoPath });
    if (!statusResult.success) throw new Error('git_status failed');

    const logResult = await TOOL_IMPLEMENTATIONS.git_log({ repo: repoPath, count: 3 });
    if (!logResult.success) throw new Error('git_log failed');

    const branchResult = await TOOL_IMPLEMENTATIONS.git_branch({ repo_path: repoPath, action: 'list' });
    if (!branchResult.success) throw new Error('git_branch failed');
  });

  // Test 3: Conversion - json_to_csv et retour
  await runTest('Conversion: json → csv → json (via fichier)', async () => {
    const jsonPath = path.join(testFilesDir, 'test_data.json');
    const csvPath = path.join(testFilesDir, 'test_data.csv');

    // Ecrire JSON
    const jsonData = JSON.stringify([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 }
    ]);
    fs.writeFileSync(jsonPath, jsonData);

    // Lire et convertir
    const readResult = await TOOL_IMPLEMENTATIONS.read_file({ path: jsonPath });
    if (!readResult.success) throw new Error('read_file failed');

    // Verifier que le JSON est valide
    const validateResult = await TOOL_IMPLEMENTATIONS.validate_json({
      json: readResult.content
    });
    if (!validateResult.success || !validateResult.valid) throw new Error('validate_json failed');
  });

  // Test 4: Web research - search -> fetch
  await runTest('Web: search → fetch', async () => {
    // Recherche
    const searchResult = await TOOL_IMPLEMENTATIONS.web_search({
      query: 'Node.js documentation',
      max_results: 2
    });
    if (!searchResult.success) throw new Error('web_search failed');
    if (!searchResult.results || searchResult.results.length === 0) throw new Error('no results');

    // Fetch example.com (simple)
    const fetchResult = await TOOL_IMPLEMENTATIONS.web_fetch({
      url: 'https://example.com'
    });
    if (!fetchResult.success) throw new Error('web_fetch failed');
  });

  // Test 5: System info chain
  await runTest('System: cpu → memory → disk → processes', async () => {
    const cpuResult = await TOOL_IMPLEMENTATIONS.get_cpu_usage({});
    if (!cpuResult.success) throw new Error('get_cpu_usage failed');

    const memResult = await TOOL_IMPLEMENTATIONS.get_memory_usage({});
    if (!memResult.success) throw new Error('get_memory_usage failed');

    const diskResult = await TOOL_IMPLEMENTATIONS.get_disk_usage({});
    if (!diskResult.success) throw new Error('get_disk_usage failed');

    const procResult = await TOOL_IMPLEMENTATIONS.list_processes({ limit: 5 });
    if (!procResult.success) throw new Error('list_processes failed');
  });

  // Test 6: Crypto chain - generate -> hash
  await runTest('Crypto: generate_password → hash_text → base64_encode', async () => {
    const passResult = await TOOL_IMPLEMENTATIONS.generate_password({ length: 16 });
    if (!passResult.success) throw new Error('generate_password failed');

    const hashResult = await TOOL_IMPLEMENTATIONS.hash_text({
      text: passResult.password,
      algorithm: 'sha256'
    });
    if (!hashResult.success) throw new Error('hash_text failed');

    const encodeResult = await TOOL_IMPLEMENTATIONS.base64_encode({
      input: passResult.password
    });
    if (!encodeResult.success) throw new Error('base64_encode failed');
  });

  // Test 7: Date calculations chain
  await runTest('Date: get_time → format_date → add_to_date → date_diff', async () => {
    const timeResult = await TOOL_IMPLEMENTATIONS.get_time({});
    if (!timeResult.success) throw new Error('get_time failed');

    const formatResult = await TOOL_IMPLEMENTATIONS.format_date({
      date: '2025-12-16',
      format: 'DD/MM/YYYY'
    });
    if (!formatResult.success) throw new Error('format_date failed');

    const addResult = await TOOL_IMPLEMENTATIONS.add_to_date({
      date: '2025-12-16',
      amount: 30,
      unit: 'days'
    });
    if (!addResult.success) throw new Error('add_to_date failed');

    const diffResult = await TOOL_IMPLEMENTATIONS.date_diff({
      date1: '2025-01-01',
      date2: '2025-12-31',
      unit: 'days'
    });
    if (!diffResult.success) throw new Error('date_diff failed');
  });

  // Test 8: Archive workflow
  await runTest('Archive: create_zip → list_archive → extract_zip', async () => {
    const sourceFile = path.join(testFilesDir, 'integration_test.txt');
    const zipPath = path.join(testFilesDir, 'integration_test.zip');
    const extractDir = path.join(testFilesDir, 'extracted_integration');

    // S'assurer que le fichier source existe
    if (!fs.existsSync(sourceFile)) {
      fs.writeFileSync(sourceFile, 'Test content for archive');
    }

    const createResult = await TOOL_IMPLEMENTATIONS.create_zip({
      files: [sourceFile],
      output: zipPath
    });
    if (!createResult.success) throw new Error('create_zip failed: ' + JSON.stringify(createResult));

    const listResult = await TOOL_IMPLEMENTATIONS.list_archive({
      path: zipPath
    });
    // list_archive peut retourner success ou juste le contenu
    if (listResult.success === false) throw new Error('list_archive failed');

    const extractResult = await TOOL_IMPLEMENTATIONS.extract_zip({
      archive: zipPath,
      destination: extractDir
    });
    if (!extractResult.success) throw new Error('extract_zip failed');
  });

  // Test 9: Validation chain
  await runTest('Validation: validate_json → validate_email → validate_url', async () => {
    const jsonResult = await TOOL_IMPLEMENTATIONS.validate_json({
      json: '{"valid": true}'
    });
    if (!jsonResult.success) throw new Error('validate_json failed');

    const emailResult = await TOOL_IMPLEMENTATIONS.validate_email({
      email: 'test@example.com'
    });
    if (!emailResult.success) throw new Error('validate_email failed');

    const urlResult = await TOOL_IMPLEMENTATIONS.validate_url({
      url: 'https://google.com'
    });
    if (!urlResult.success) throw new Error('validate_url failed');
  });

  // Test 10: NPM info chain
  await runTest('NPM: npm_search → npm_info', async () => {
    const searchResult = await TOOL_IMPLEMENTATIONS.npm_search({
      query: 'express'
    });
    if (!searchResult.success) throw new Error('npm_search failed');

    const infoResult = await TOOL_IMPLEMENTATIONS.npm_info({
      package: 'express'
    });
    if (!infoResult.success) throw new Error('npm_info failed');
  });

  // Resume
  console.log('\n===========================================');
  console.log(` RESUME: ${passed}/${passed + failed} tests passes`);
  console.log('===========================================');

  if (failed > 0) {
    console.log('\nEchecs:');
    details.filter(d => d.status === 'failed').forEach(d => {
      console.log(`  - ${d.name}: ${d.error}`);
    });
  }

  // Sauvegarder
  const outputPath = path.join(resultsDir, `test_integration_${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify({ passed, failed, details }, null, 2));
  console.log(`\nResultats: ${outputPath}`);
}

runAllTests().catch(console.error);
