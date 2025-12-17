/**
 * TESTS UNITAIRES - Phase 3 du plan d'integration
 *
 * Teste chaque outil individuellement avec des parametres valides
 * Sauvegarde les resultats dans results/
 */

const fs = require('fs');
const path = require('path');

// Charger les outils
const { TOOL_IMPLEMENTATIONS } = require('../server/agents/tool-agent.cjs');
const inventory = require('./inventaire_outils.json');

// Creer le dossier results
const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Dossier de test pour les fichiers
const testFilesDir = path.join(__dirname, 'test_files');
if (!fs.existsSync(testFilesDir)) {
  fs.mkdirSync(testFilesDir, { recursive: true });
}

// Creer un fichier de test
const testFilePath = path.join(testFilesDir, 'test_file.txt');
fs.writeFileSync(testFilePath, 'Ceci est un fichier de test.\nLigne 2.\nLigne 3.\n');

// Outils a IGNORER (dangereux ou necessitent setup special)
const SKIP_TOOLS = [
  'delete_file', 'kill_process', 'kill_process_by_name', 'run_shell',
  // Outils necessitant des services externes (ComfyUI, browser, docker, ollama)
  'generate_image', 'generate_animation', 'generate_video', 'image_to_image', 'inpaint_image',
  'browser_open', 'browser_screenshot', 'browser_pdf', 'browser_click', 'browser_type',
  'browser_evaluate', 'browser_extract', 'dom_query', 'dom_get_element_by_id',
  'dom_get_elements_by_class', 'dom_get_elements_by_tag', 'dom_modify',
  'docker_ps', 'docker_images', 'docker_logs', 'docker_exec', 'docker_start', 'docker_stop',
  'ollama_list', 'ollama_pull', 'ollama_delete', 'ollama_chat',
  'text_to_speech', 'play_audio',
  // Outils interactifs
  'ask_user', 'watch_file', 'run_background',
  // Outils avec effets de bord irreversibles
  'git_commit', 'git_push', 'git_pull', 'git_clone', 'git_merge', 'git_reset', 'git_stash',
  'git_checkout', 'set_environment_variable', 'open_application', 'open_url_in_browser',
  'send_notification', 'clipboard_write', 'set_reminder', 'cancel_reminder',
  'execute_voice_command', 'launch_agent',
  // ChromaDB (necessite service running)
  'search_memory', 'save_memory', 'memory_update', 'memory_forget',
  'memory_reflect', 'memory_link', 'memory_query_graph',
  // Outils d'image (sharp requis)
  'resize_image', 'convert_image', 'crop_image', 'rotate_image', 'describe_image', 'get_image_info',
  // SQLite (better-sqlite3 requis)
  'sqlite_tables', 'sqlite_schema', 'sqlite_query',
  // Screenshot (screenshot-desktop requis)
  'take_screenshot', 'debug_screenshot', 'analyze_code_screenshot'
];

// Parametres de test pour chaque outil (noms de parametres corriges)
const TEST_PARAMS = {
  // FILES - utiliser 'path' au lieu de 'file_path' pour la plupart
  read_file: { path: testFilePath },
  list_files: { path: testFilesDir },
  glob: { pattern: '*.txt', path: testFilesDir },
  grep: { pattern: 'test', path: testFilePath },
  search_in_file: { path: testFilePath, pattern: 'Ligne' },
  read_file_chunk: { path: testFilePath, start_line: 1, end_line: 3 },
  file_info: { path: testFilePath },
  get_file_stats: { path: testFilePath },
  count_lines: { path: testFilePath },
  count_words: { path: testFilePath },
  head_file: { path: testFilePath, lines: 2 },
  tail_file: { path: testFilePath, lines: 2 },
  tree_view: { path: testFilesDir, depth: 2 },
  find_files: { path: testFilesDir, pattern: '*.txt' },
  get_directory_size: { path: testFilesDir },
  compare_files: { path1: testFilePath, path2: testFilePath },

  // SYSTEM
  get_system_info: {},
  get_cpu_usage: {},
  get_memory_usage: {},
  get_disk_usage: {},
  list_processes: { limit: 5 },
  get_environment_variable: { name: 'PATH' },
  get_network_interfaces: {},
  take_screenshot: { output_path: path.join(testFilesDir, 'screenshot_test.png') },

  // GIT (lecture seule) - corriger les params
  git_status: { path: 'E:\\ANA' },
  git_log: { repo: 'E:\\ANA', count: 3 },
  git_branch: { repo_path: 'E:\\ANA', action: 'list' },
  git_diff: { repo: 'E:\\ANA' },

  // WEB (necessite internet) - corriger params
  get_time: {},
  web_search: { query: 'test', max_results: 2 },
  get_weather: { location: 'Montreal' },
  wikipedia: { query: 'Montreal', lang: 'fr' },
  get_public_ip: {},
  dns_lookup: { domain: 'google.com' },
  ping: { host: '8.8.8.8', count: 1 },
  check_url: { url: 'https://google.com' },
  whois: { domain: 'google.com' },
  http_request: { url: 'https://httpbin.org/get', method: 'GET' },
  web_fetch: { url: 'https://example.com' },
  port_scan: { host: 'localhost', ports: '80,443' },

  // CONVERSION - corriger les noms de params
  json_to_csv: { data: [{ name: 'test', value: 1 }] },
  csv_to_json: { data: 'name,value\ntest,1' },
  format_json: { json: '{"a":1}' },
  minify_json: { json: '{ "a": 1 }' },
  xml_to_json: { xml: '<root><item>test</item></root>' },
  json_to_xml: { data: { item: 'test' } },
  yaml_to_json: { yaml: 'key: value' },
  json_to_yaml: { data: { key: 'value' } },
  markdown_to_html: { markdown: '# Test\n\nParagraphe' },
  html_to_markdown: { html: '<h1>Test</h1><p>Paragraphe</p>' },
  parse_html: { html: '<div><p>Test</p></div>', selector: 'p' },

  // CRYPTO - corriger les noms de params
  hash_text: { text: 'test', algorithm: 'md5' },
  hash_file: { path: testFilePath, algorithm: 'md5' },
  generate_uuid: {},
  generate_password: { length: 16 },
  base64_encode: { input: 'Hello World' },
  base64_decode: { input: 'SGVsbG8gV29ybGQ=' },
  encrypt_text: { text: 'secret', password: 'key123' },
  decrypt_text: { encrypted: '', password: 'key123' },

  // DATETIME
  get_time: {},
  format_date: { date: '2025-12-16', format: 'DD/MM/YYYY' },
  date_diff: { date1: '2025-01-01', date2: '2025-12-16', unit: 'days' },
  add_to_date: { date: '2025-12-16', amount: 7, unit: 'days' },
  timestamp_to_date: { timestamp: 1734350400 },
  date_to_timestamp: { date: '2025-12-16' },
  calculate: { expression: '2 + 2 * 3' },
  convert_units: { value: 100, from: 'cm', to: 'm' },
  random_number: { min: 1, max: 100 },
  statistics: { numbers: [1, 2, 3, 4, 5] },
  get_zodiac_sign: { date: '1985-03-15' },

  // VALIDATION
  test_regex: { pattern: '\\d+', text: 'abc123def' },
  validate_json: { json_string: '{"valid": true}' },
  validate_email: { email: 'test@example.com' },
  validate_url: { url: 'https://google.com' },

  // NPM
  npm_list: { directory: 'E:\\ANA' },
  npm_outdated: { directory: 'E:\\ANA' },
  npm_search: { query: 'express' },
  npm_info: { package_name: 'express' },

  // ARCHIVE
  list_archive: { archive_path: path.join(testFilesDir, 'test.zip') },

  // YOUTUBE
  get_yt_transcript: { video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  youtube_search: { query: 'test video', max_results: 2 },
  get_news: { topic: 'technology', max_results: 3 },

  // CODE - corriger params
  get_project_structure: { path: 'E:\\ANA', depth: 2 },
  search_codebase: { query: 'function', path: 'E:\\ANA\\server', extensions: ['.cjs'] },
  list_available_icons: {},
  get_css_variables: { path: 'E:\\ANA\\src\\App.css' },

  // UTILS
  todo_write: { todos: [{ content: 'Test', status: 'pending', activeForm: 'Testing' }] },
  list_reminders: {},
  clipboard_read: {},

  // AGENTS - utiliser modele valide
  ask_groq: { prompt: 'Say hello in one word' },
  ask_cerebras: { prompt: 'Say hello in one word' },
  ask_architect: { question: 'What is the best pattern for a REST API?' },
  review_code: { code: 'function test() { return 1; }', language: 'javascript' },

  // DATABASE
  sqlite_tables: { path: path.join(testFilesDir, 'test.db') },

  // AUDIO
  get_audio_info: { path: path.join(testFilesDir, 'test.mp3') },

  // IMAGE
  describe_image: { path: path.join(testFilesDir, 'test.png') },
  get_image_info: { path: path.join(testFilesDir, 'test.png') },

  // OUTILS SUPPLEMENTAIRES
  write_file: { path: path.join(testFilesDir, 'write_test.txt'), content: 'Test write' },
  edit_file: { path: path.join(testFilesDir, 'test_file.txt'), old_text: 'Ligne 2', new_text: 'Ligne 2 modifiee' },
  copy_file: { source: testFilePath, destination: path.join(testFilesDir, 'copy_test.txt') },
  move_file: { source: path.join(testFilesDir, 'copy_test.txt'), destination: path.join(testFilesDir, 'moved_test.txt') },
  create_directory: { path: path.join(testFilesDir, 'new_dir') },
  create_backup: { path: testFilePath },
  append_to_file: { path: testFilePath, content: '\nNouvelle ligne' },
  prepend_to_file: { path: testFilePath, content: 'Premiere ligne\n' },
  download_file: { url: 'https://example.com/robots.txt', path: path.join(testFilesDir, 'robots.txt') },
  create_zip: { files: [testFilePath], output: path.join(testFilesDir, 'test.zip') },
  extract_zip: { archive: path.join(testFilesDir, 'test.zip'), destination: path.join(testFilesDir, 'extracted') },
  compress_gzip: { input: testFilePath, output: path.join(testFilesDir, 'test.txt.gz') },
  decompress_gzip: { input: path.join(testFilesDir, 'test.txt.gz'), output: path.join(testFilesDir, 'test_decompressed.txt') },
  resize_image: { input: path.join(testFilesDir, 'test.png'), output: path.join(testFilesDir, 'resized.png'), width: 100 },
  convert_image: { input: path.join(testFilesDir, 'test.png'), output: path.join(testFilesDir, 'converted.jpg') },
  crop_image: { input: path.join(testFilesDir, 'test.png'), output: path.join(testFilesDir, 'cropped.png'), x: 0, y: 0, width: 50, height: 50 },
  rotate_image: { input: path.join(testFilesDir, 'test.png'), output: path.join(testFilesDir, 'rotated.png'), angle: 90 },
  npm_run: { script: 'help', path: 'E:\\ANA' },
  execute_code: { code: 'console.log("hello")', language: 'javascript' },
  add_route: { path: '/test', method: 'GET', handler: 'testHandler' },
  add_api_endpoint: { path: '/api/test', method: 'GET', handler: 'testHandler' },
  create_react_component: { name: 'TestComponent', type: 'functional' },
  analyze_component: { path: 'E:\\ANA\\src\\App.jsx' },
  hot_reload_check: {},
  validate_jsx_syntax: { code: '<div>Hello</div>' }
};

// Fonction de test
async function testTool(name, impl) {
  const params = TEST_PARAMS[name];

  if (!params) {
    return { status: 'no_params', message: 'Pas de parametres de test definis' };
  }

  try {
    const result = await impl(params);
    if (result && (result.success !== false)) {
      return { status: 'passed', result };
    } else {
      return { status: 'failed', error: result?.error || result?.message || 'Echec sans message' };
    }
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

// Execution des tests
async function runTests() {
  console.log('===========================================');
  console.log(' TESTS UNITAIRES - Phase 3');
  console.log('===========================================\n');

  const results = {
    timestamp: new Date().toISOString(),
    summary: { passed: 0, failed: 0, skipped: 0, no_params: 0, error: 0 },
    details: {}
  };

  const toolNames = Object.keys(TOOL_IMPLEMENTATIONS).sort();
  const total = toolNames.length;

  for (let i = 0; i < toolNames.length; i++) {
    const name = toolNames[i];
    const impl = TOOL_IMPLEMENTATIONS[name];
    const group = inventory.tools[name]?.group || 'unknown';

    process.stdout.write(`[${i + 1}/${total}] ${name.padEnd(30)} `);

    if (SKIP_TOOLS.includes(name)) {
      console.log('SKIPPED');
      results.summary.skipped++;
      results.details[name] = { status: 'skipped', group };
      continue;
    }

    const testResult = await testTool(name, impl);
    results.details[name] = { ...testResult, group };

    switch (testResult.status) {
      case 'passed':
        console.log('PASSED');
        results.summary.passed++;
        break;
      case 'failed':
        console.log(`FAILED: ${testResult.error}`);
        results.summary.failed++;
        break;
      case 'error':
        console.log(`ERROR: ${testResult.error}`);
        results.summary.error++;
        break;
      case 'no_params':
        console.log('NO_PARAMS');
        results.summary.no_params++;
        break;
    }
  }

  // Sauvegarder les resultats
  const outputPath = path.join(resultsDir, `test_unitaires_${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  // Resume
  console.log('\n===========================================');
  console.log(' RESUME');
  console.log('===========================================');
  console.log(`  Passed:    ${results.summary.passed}`);
  console.log(`  Failed:    ${results.summary.failed}`);
  console.log(`  Error:     ${results.summary.error}`);
  console.log(`  Skipped:   ${results.summary.skipped}`);
  console.log(`  No params: ${results.summary.no_params}`);
  console.log(`  Total:     ${total}`);
  console.log(`\nResultats: ${outputPath}`);

  return results;
}

// Lancer les tests
runTests().catch(console.error);
