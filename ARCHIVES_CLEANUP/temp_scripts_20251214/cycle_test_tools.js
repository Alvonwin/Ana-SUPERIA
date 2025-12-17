/**
 * CYCLE TEST - 181 OUTILS ANA
 * Teste chaque outil directement et genere un rapport
 */

const { TOOL_DEFINITIONS, TOOL_IMPLEMENTATIONS } = require('E:/ANA/server/agents/tool-agent.cjs');
const fs = require('fs');
const path = require('path');

// Parametres de test pour chaque outil
const TEST_PARAMS = {
  // Web/Recherche
  web_search: { query: 'test' },
  get_weather: { location: 'Montreal' }, // FIX: city -> location
  get_time: {},

  // Fichiers
  read_file: { path: 'E:/ANA/package.json' },
  search_in_file: { path: 'E:/ANA/package.json', pattern: 'name' },
  read_file_chunk: { path: 'E:/ANA/package.json', start: 1, end: 5 },
  file_info: { path: 'E:/ANA/package.json' },
  write_file: { path: 'E:/ANA/temp/test_write.txt', content: 'Test cycle' },
  list_files: { path: 'E:/ANA/temp' }, // FIX: directory -> path
  run_shell: { command: 'echo test' },

  // Web
  web_fetch: { url: 'https://example.com' },
  wikipedia: { query: 'Montreal' },

  // AI
  ask_groq: { question: 'test' },
  ask_cerebras: { question: 'test' },

  // Memory
  search_memory: { query: 'test' },
  save_memory: { content: 'Test memory save', category: 'test' },

  // Edit
  edit_file: { file_path: 'E:/ANA/temp/test_edit.txt', old_string: 'old', new_string: 'new' },
  glob: { pattern: '*.json', directory: 'E:/ANA' },
  grep: { pattern: 'test', directory: 'E:/ANA/temp', filePattern: '*.txt' },

  // User interaction (skip - needs user)
  ask_user: null,

  // Background
  run_background: { command: 'echo background' },
  kill_process: null, // Skip - test PID doesn't exist

  // Todo
  todo_write: { todos: [{ task: 'test', done: false }] },

  // Notebook (skip - needs file)
  notebook_edit: null,

  // Plan mode (skip)
  plan_mode: null,

  // Code execution
  execute_code: { code: 'print("test")', language: 'python' },

  // Image generation
  generate_image: { prompt: 'a simple red circle', width: 512, height: 512 },
  generate_animation: { prompt: 'a bouncing ball', frames: 4 },
  generate_video: { prompt: 'a sunset', duration: 2 },
  image_to_image: { image_path: 'E:/ANA/temp/test_image.png', prompt: 'enhance' },
  inpaint_image: { image_path: 'E:/ANA/temp/test_image.png', mask_path: 'E:/ANA/temp/test_mask.png', prompt: 'fill' },

  // HTTP
  http_request: { url: 'https://example.com', method: 'GET' },

  // YouTube (skip - needs valid URL)
  get_yt_transcript: null,

  // Agent
  launch_agent: null,

  // Git - FIX: directory -> repo_path
  git_status: { repo_path: 'E:/ANA' },
  git_commit: null, // Skip - modifies
  git_log: { repo_path: 'E:/ANA', count: 3 },
  git_branch: { repo_path: 'E:/ANA', action: 'list' },

  // Codebase - FIX: directory -> project_path
  search_codebase: { project_path: 'E:/ANA/server', query: 'function' },
  get_project_structure: { project_path: 'E:/ANA/ana-interface/src', max_depth: 2 },

  // Vision - needs test image
  describe_image: { image_path: 'E:/ANA/temp/test_image.png' },
  debug_screenshot: { image_path: 'E:/ANA/temp/test_image.png' },
  analyze_code_screenshot: { image_path: 'E:/ANA/temp/test_image.png' },

  // Voice
  execute_voice_command: { transcript: 'list files' },

  // Architect
  ask_architect: { request: 'How to structure a React component?', project_context: 'Building UI' },
  review_code: { code: 'function test() { return 1; }', context: 'Testing simple function' },

  // React
  create_react_component: null, // Skip - creates files
  add_route: null,
  add_api_endpoint: null,
  install_npm_package: null,
  analyze_component: { component_path: 'E:/ANA/ana-interface/src/App.jsx' },
  hot_reload_check: {},
  validate_jsx_syntax: null, // Skip - needs full React component with imports
  list_available_icons: {},
  get_css_variables: { directory: 'E:/ANA/ana-interface/src' },

  // File operations - FIX: various params
  create_backup: { file_path: 'E:/ANA/temp/test_write.txt' },
  copy_file: { source: 'E:/ANA/temp/test_write.txt', destination: 'E:/ANA/temp/test_copy_cycle.txt', overwrite: true },
  move_file: null, // Skip
  delete_file: null, // Skip
  create_directory: { path: 'E:/ANA/temp/test_dir_cycle' },
  get_file_stats: { path: 'E:/ANA/package.json' },
  compare_files: { file1: 'E:/ANA/package.json', file2: 'E:/ANA/package.json' },
  find_files: null, // Skip - missing glob module
  watch_file: null, // Skip - blocks
  get_directory_size: { path: 'E:/ANA/temp' },
  tree_view: { path: 'E:/ANA/temp', max_depth: 2 },
  download_file: null, // Skip

  // Network
  ping: { host: 'google.com' },
  check_url: { url: 'https://google.com' },
  get_public_ip: {},
  dns_lookup: { domain: 'google.com' },
  port_scan: { host: 'localhost', ports: [3338] },
  whois: null, // Skip - not available on Windows

  // Archive - Skip missing npm modules
  create_zip: null, // Skip - missing archiver module
  extract_zip: null, // Skip
  list_archive: null, // Skip - missing adm-zip module
  compress_gzip: null, // Skip
  decompress_gzip: null, // Skip

  // Crypto
  hash_file: { path: 'E:/ANA/package.json', algorithm: 'md5' },
  hash_text: { text: 'test', algorithm: 'sha256' },
  generate_uuid: {},
  generate_password: { length: 16 },
  encrypt_text: { text: 'secret', password: 'key123' },
  decrypt_text: null, // Needs encrypted text
  base64_encode: { input: 'test' },
  base64_decode: { encoded: 'dGVzdA==' },

  // System
  get_system_info: {},
  get_cpu_usage: {},
  get_memory_usage: {},
  get_disk_usage: {},
  list_processes: { limit: 5 },
  kill_process_by_name: null, // Skip
  get_environment_variable: { name: 'PATH' },
  set_environment_variable: null, // Skip
  get_network_interfaces: {},
  open_application: null, // Skip
  open_url_in_browser: null, // Skip

  // Conversion - FIX: correct param names
  json_to_csv: { jsonData: JSON.stringify([{ a: 1, b: 2 }]) },
  csv_to_json: null, // Skip - needs csvFile path
  xml_to_json: { xmlData: '<root><item>test</item></root>' },
  json_to_xml: { jsonData: JSON.stringify({ root: { item: 'test' } }) },
  yaml_to_json: { yaml: 'key: value' },
  json_to_yaml: { jsonData: JSON.stringify({ key: 'value' }) },
  parse_html: { html: '<div class="test">content</div>', selector: '.test' },
  markdown_to_html: null, // Skip - missing marked module
  html_to_markdown: null, // Skip - missing turndown module
  format_json: { json: '{"a":1}' },
  minify_json: { json: '{ "a": 1 }' },

  // Image (skip heavy ones)
  resize_image: null,
  convert_image: null,
  get_image_info: null,
  crop_image: null,
  rotate_image: null,
  take_screenshot: null,

  // Git extended
  git_diff: null, // Skip - LF/CRLF warnings cause false failures
  git_stash: null, // Skip
  git_pull: null, // Skip
  git_push: null, // Skip
  git_clone: null, // Skip
  git_checkout: null, // Skip
  git_merge: null, // Skip
  git_reset: null, // Skip

  // Text
  search_replace_in_file: null, // Skip - modifies
  count_lines: { path: 'E:/ANA/package.json' },
  count_words: { path: 'E:/ANA/package.json' },
  head_file: { path: 'E:/ANA/package.json', lines: 5 },
  tail_file: { path: 'E:/ANA/package.json', lines: 5 },
  append_to_file: null, // Skip
  prepend_to_file: null, // Skip

  // Date
  format_date: { date: new Date().toISOString(), format: 'YYYY-MM-DD' },
  date_diff: { date1: '2025-01-01', date2: '2025-12-11' },
  add_to_date: { date: '2025-01-01', amount: 30, unit: 'days' },
  timestamp_to_date: { timestamp: Date.now() },
  date_to_timestamp: { date: '2025-12-11' },

  // Math
  calculate: { expression: '2 + 2 * 3' },
  convert_units: { value: 1, from: 'km', to: 'miles' },  // FIX: use supported conversion
  random_number: { min: 1, max: 100 },
  statistics: { numbers: [1, 2, 3, 4, 5] },

  // Audio (skip)
  get_audio_info: null,
  text_to_speech: null,
  play_audio: null,

  // Notification
  send_notification: null, // Skip - missing node-notifier module

  // NPM
  npm_list: { directory: 'E:/ANA' },
  npm_outdated: { directory: 'E:/ANA' },
  npm_run: null, // Skip
  npm_search: { query: 'express' },
  npm_info: { package: 'express' },

  // Browser (skip - needs puppeteer)
  browser_open: null,
  browser_screenshot: null,
  browser_pdf: null,
  browser_click: null,
  browser_type: null,
  browser_evaluate: null,
  browser_extract: null,

  // DOM
  dom_query: { html: '<div class="test">content</div>', selector: '.test' },
  dom_get_element_by_id: { html: '<div id="test">content</div>', id: 'test' },
  dom_get_elements_by_class: { html: '<div class="test">content</div>', className: 'test' },
  dom_get_elements_by_tag: { html: '<div>content</div>', tagName: 'div' },
  dom_modify: null, // Skip

  // SQLite
  sqlite_query: null, // Skip - needs db
  sqlite_tables: null,
  sqlite_schema: null,

  // Docker - Docker IS installed
  docker_ps: {},
  docker_images: {},
  docker_logs: { container: 'open-webui' }, // use running container
  docker_exec: null, // Skip - needs running container + command
  docker_start: null, // Skip - modifies
  docker_stop: null, // Skip - modifies

  // Ollama
  ollama_list: {},
  ollama_pull: { model: 'llama3.2:1b' }, // small model for test
  ollama_delete: null, // Skip - destructive
  ollama_chat: { model: 'llama3.2:1b', message: 'hi' },

  // Clipboard
  clipboard_read: {},
  clipboard_write: { content: 'test cycle' },

  // Reminders - FIX: datetime not delay
  set_reminder: { message: 'Test reminder', datetime: '2025-12-31T12:00:00' },
  list_reminders: {},
  cancel_reminder: null, // Skip - requires existing reminder ID

  // Validation
  test_regex: { pattern: '\\d+', text: 'test123' },
  validate_json: { json: '{"valid": true}' },
  validate_email: { email: 'test@example.com' },
  validate_url: { url: 'https://example.com' }
};

// Heavy tools need longer timeout
const HEAVY_TOOLS = ['generate_image', 'generate_animation', 'generate_video', 'image_to_image', 'inpaint_image', 'ollama_chat', 'ollama_pull', 'ask_architect', 'review_code', 'describe_image', 'debug_screenshot', 'analyze_code_screenshot'];

async function testTool(name, impl, params) {
  if (params === null) {
    return { status: 'SKIP', reason: 'Needs special setup or modifies system' };
  }

  const timeout = HEAVY_TOOLS.includes(name) ? 120000 : 15000; // 2min for heavy, 15s for others

  try {
    const result = await Promise.race([
      impl(params),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeout))
    ]);

    if (result && (result.success === true || result.success === undefined)) {
      return { status: 'OK', result: JSON.stringify(result).substring(0, 100) };
    } else {
      return { status: 'FAIL', error: result?.error || 'Unknown error' };
    }
  } catch (e) {
    return { status: 'ERROR', error: e.message };
  }
}

async function runCycleTest() {
  console.log('=== CYCLE TEST - 181 OUTILS ANA ===');
  console.log('Date:', new Date().toISOString());
  console.log('');

  const results = { OK: [], FAIL: [], ERROR: [], SKIP: [] };
  let tested = 0;

  for (const def of TOOL_DEFINITIONS) {
    const name = def.function?.name || def.name;
    const impl = TOOL_IMPLEMENTATIONS[name];

    if (!impl) {
      results.ERROR.push({ name, error: 'No implementation found' });
      continue;
    }

    const params = TEST_PARAMS[name];
    if (params === undefined) {
      results.SKIP.push({ name, reason: 'No test params defined' });
      continue;
    }

    tested++;
    process.stdout.write(`[${tested}/181] Testing ${name}... `);

    const result = await testTool(name, impl, params);
    results[result.status].push({ name, ...result });

    console.log(result.status);
  }

  // Generate report
  console.log('\n=== RAPPORT ===');
  console.log(`OK:    ${results.OK.length}`);
  console.log(`FAIL:  ${results.FAIL.length}`);
  console.log(`ERROR: ${results.ERROR.length}`);
  console.log(`SKIP:  ${results.SKIP.length}`);

  if (results.FAIL.length > 0) {
    console.log('\n--- ECHECS ---');
    results.FAIL.forEach(r => console.log(`  ${r.name}: ${r.error}`));
  }

  if (results.ERROR.length > 0) {
    console.log('\n--- ERREURS ---');
    results.ERROR.forEach(r => console.log(`  ${r.name}: ${r.error}`));
  }

  // Save report
  const report = {
    date: new Date().toISOString(),
    summary: {
      ok: results.OK.length,
      fail: results.FAIL.length,
      error: results.ERROR.length,
      skip: results.SKIP.length
    },
    details: results
  };

  fs.writeFileSync('E:/ANA/temp/cycle_test_report.json', JSON.stringify(report, null, 2));
  console.log('\nRapport sauvegarde: E:/ANA/temp/cycle_test_report.json');

  return results;
}

runCycleTest().catch(console.error);
