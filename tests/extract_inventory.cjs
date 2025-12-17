/**
 * EXTRACT INVENTORY - Phase 1 du plan d'integration
 *
 * Extrait l'inventaire complet des outils depuis tool-agent.cjs
 * et cree inventaire_outils.json
 */

const fs = require('fs');
const path = require('path');

// Charger tool-agent.cjs
const { TOOL_DEFINITIONS, TOOL_IMPLEMENTATIONS } = require('../server/agents/tool-agent.cjs');
const { TOOL_GROUPS, GROUP_KEYWORDS } = require('../server/core/tool-groups.cjs');

// Categorisation des risques
const RISK_LEVELS = {
  safe: [
    'read_file', 'search_in_file', 'read_file_chunk', 'file_info', 'list_files',
    'glob', 'grep', 'get_file_stats', 'compare_files', 'find_files', 'tree_view',
    'count_lines', 'count_words', 'head_file', 'tail_file', 'watch_file', 'get_directory_size',
    'get_system_info', 'get_cpu_usage', 'get_memory_usage', 'get_disk_usage',
    'list_processes', 'get_environment_variable', 'get_network_interfaces', 'take_screenshot',
    'git_status', 'git_log', 'git_branch', 'git_diff',
    'web_search', 'get_weather', 'get_time', 'web_fetch', 'wikipedia', 'http_request',
    'check_url', 'get_public_ip', 'dns_lookup', 'whois', 'ping',
    'search_memory', 'memory_reflect', 'memory_query_graph',
    'describe_image', 'get_image_info', 'get_audio_info',
    'json_to_csv', 'csv_to_json', 'xml_to_json', 'json_to_xml', 'yaml_to_json', 'json_to_yaml',
    'parse_html', 'markdown_to_html', 'html_to_markdown', 'format_json', 'minify_json',
    'hash_file', 'hash_text', 'generate_uuid', 'base64_encode', 'base64_decode',
    'format_date', 'date_diff', 'add_to_date', 'timestamp_to_date', 'date_to_timestamp',
    'calculate', 'convert_units', 'random_number', 'statistics', 'get_zodiac_sign',
    'test_regex', 'validate_json', 'validate_email', 'validate_url',
    'npm_list', 'npm_outdated', 'npm_search', 'npm_info', 'list_archive',
    'docker_ps', 'docker_images', 'docker_logs',
    'ollama_list', 'sqlite_tables', 'sqlite_schema',
    'clipboard_read', 'list_reminders', 'get_yt_transcript', 'youtube_search', 'get_news',
    'ask_user', 'list_available_icons', 'get_css_variables', 'get_project_structure',
    'analyze_component', 'hot_reload_check', 'validate_jsx_syntax', 'search_codebase'
  ],
  moderate: [
    'write_file', 'edit_file', 'copy_file', 'move_file', 'create_directory',
    'create_backup', 'search_replace_in_file', 'append_to_file', 'prepend_to_file',
    'set_environment_variable', 'open_application', 'open_url_in_browser', 'run_background',
    'git_commit', 'git_stash', 'git_pull', 'git_push', 'git_clone', 'git_checkout', 'git_merge', 'git_reset',
    'save_memory', 'memory_update', 'memory_forget', 'memory_link',
    'generate_image', 'generate_animation', 'generate_video', 'image_to_image', 'inpaint_image',
    'resize_image', 'convert_image', 'crop_image', 'rotate_image',
    'generate_password', 'encrypt_text', 'decrypt_text',
    'create_zip', 'extract_zip', 'compress_gzip', 'decompress_gzip', 'download_file',
    'text_to_speech', 'play_audio',
    'npm_run', 'install_npm_package',
    'browser_open', 'browser_screenshot', 'browser_pdf', 'browser_click', 'browser_type',
    'browser_evaluate', 'browser_extract', 'dom_query', 'dom_get_element_by_id',
    'dom_get_elements_by_class', 'dom_get_elements_by_tag', 'dom_modify',
    'sqlite_query',
    'docker_exec', 'docker_start', 'docker_stop',
    'ollama_pull', 'ollama_delete', 'ollama_chat',
    'clipboard_write', 'set_reminder', 'cancel_reminder', 'send_notification',
    'todo_write', 'notebook_edit', 'plan_mode',
    'execute_code', 'create_react_component', 'add_route', 'add_api_endpoint',
    'debug_screenshot', 'analyze_code_screenshot', 'execute_voice_command',
    'ask_groq', 'ask_cerebras', 'launch_agent', 'ask_architect', 'review_code',
    'port_scan'
  ],
  dangerous: [
    'delete_file', 'kill_process', 'kill_process_by_name', 'run_shell'
  ]
};

// Dependances externes
const DEPENDENCIES = {
  internet: [
    'web_search', 'get_weather', 'web_fetch', 'wikipedia', 'http_request',
    'check_url', 'get_public_ip', 'dns_lookup', 'whois', 'ping',
    'download_file', 'youtube_search', 'get_yt_transcript', 'get_news', 'port_scan'
  ],
  ollama: [
    'ollama_list', 'ollama_pull', 'ollama_delete', 'ollama_chat',
    'describe_image', 'ask_groq', 'ask_cerebras'
  ],
  chromadb: [
    'search_memory', 'save_memory', 'memory_update', 'memory_forget',
    'memory_reflect', 'memory_link', 'memory_query_graph'
  ],
  docker: [
    'docker_ps', 'docker_images', 'docker_logs', 'docker_exec', 'docker_start', 'docker_stop'
  ],
  browser: [
    'browser_open', 'browser_screenshot', 'browser_pdf', 'browser_click', 'browser_type',
    'browser_evaluate', 'browser_extract', 'dom_query', 'dom_get_element_by_id',
    'dom_get_elements_by_class', 'dom_get_elements_by_tag', 'dom_modify'
  ],
  comfyui: [
    'generate_image', 'generate_animation', 'generate_video', 'image_to_image', 'inpaint_image'
  ],
  audio: [
    'get_audio_info', 'text_to_speech', 'play_audio'
  ],
  git: [
    'git_status', 'git_commit', 'git_log', 'git_branch', 'git_diff',
    'git_stash', 'git_pull', 'git_push', 'git_clone', 'git_checkout', 'git_merge', 'git_reset'
  ],
  sqlite: [
    'sqlite_query', 'sqlite_tables', 'sqlite_schema'
  ]
};

// Trouver le groupe d'un outil
function findGroup(toolName) {
  for (const [group, tools] of Object.entries(TOOL_GROUPS)) {
    if (tools.includes(toolName)) {
      return group;
    }
  }
  return 'unknown';
}

// Trouver le niveau de risque
function findRiskLevel(toolName) {
  if (RISK_LEVELS.dangerous.includes(toolName)) return 'dangerous';
  if (RISK_LEVELS.moderate.includes(toolName)) return 'moderate';
  if (RISK_LEVELS.safe.includes(toolName)) return 'safe';
  return 'unknown';
}

// Trouver les dependances
function findDependencies(toolName) {
  const deps = [];
  for (const [dep, tools] of Object.entries(DEPENDENCIES)) {
    if (tools.includes(toolName)) {
      deps.push(dep);
    }
  }
  return deps;
}

// Extraire les noms des definitions
const definitionNames = TOOL_DEFINITIONS.map(t => t.function?.name || t.name);

// Extraire les noms des implementations
const implementationNames = Object.keys(TOOL_IMPLEMENTATIONS);

// Creer l'inventaire
const inventory = {
  metadata: {
    extracted_at: new Date().toISOString(),
    total_definitions: definitionNames.length,
    total_implementations: implementationNames.length,
    source_file: 'E:\\ANA\\server\\agents\\tool-agent.cjs'
  },
  summary: {
    by_risk: { safe: 0, moderate: 0, dangerous: 0, unknown: 0 },
    by_group: {},
    missing_implementation: [],
    missing_definition: []
  },
  tools: {}
};

// Analyser chaque outil defini
for (const toolName of definitionNames) {
  const hasImpl = implementationNames.includes(toolName);
  const group = findGroup(toolName);
  const riskLevel = findRiskLevel(toolName);
  const deps = findDependencies(toolName);

  inventory.tools[toolName] = {
    group: group,
    risk_level: riskLevel,
    dependencies: deps,
    has_definition: true,
    has_implementation: hasImpl,
    testable_offline: deps.length === 0 || deps.every(d => !['internet', 'ollama', 'chromadb', 'docker', 'browser', 'comfyui'].includes(d)),
    status: 'not_tested'
  };

  // Compteurs
  inventory.summary.by_risk[riskLevel]++;
  inventory.summary.by_group[group] = (inventory.summary.by_group[group] || 0) + 1;

  if (!hasImpl) {
    inventory.summary.missing_implementation.push(toolName);
  }
}

// Verifier les implementations sans definition
for (const implName of implementationNames) {
  if (!definitionNames.includes(implName)) {
    inventory.summary.missing_definition.push(implName);
  }
}

// Sauvegarder
const outputPath = path.join(__dirname, 'inventaire_outils.json');
fs.writeFileSync(outputPath, JSON.stringify(inventory, null, 2), 'utf-8');

console.log('===========================================');
console.log(' INVENTAIRE DES OUTILS - Phase 1');
console.log('===========================================');
console.log('');
console.log('Definitions:', inventory.metadata.total_definitions);
console.log('Implementations:', inventory.metadata.total_implementations);
console.log('');
console.log('Par risque:');
console.log('  - Safe:', inventory.summary.by_risk.safe);
console.log('  - Moderate:', inventory.summary.by_risk.moderate);
console.log('  - Dangerous:', inventory.summary.by_risk.dangerous);
console.log('  - Unknown:', inventory.summary.by_risk.unknown);
console.log('');
console.log('Par groupe:');
for (const [group, count] of Object.entries(inventory.summary.by_group).sort((a, b) => b[1] - a[1])) {
  console.log('  -', group + ':', count);
}
console.log('');
if (inventory.summary.missing_implementation.length > 0) {
  console.log('ATTENTION - Outils sans implementation:', inventory.summary.missing_implementation.length);
  console.log(inventory.summary.missing_implementation.join(', '));
}
if (inventory.summary.missing_definition.length > 0) {
  console.log('ATTENTION - Implementations sans definition:', inventory.summary.missing_definition.length);
  console.log(inventory.summary.missing_definition.join(', '));
}
console.log('');
console.log('Inventaire sauvegarde:', outputPath);
