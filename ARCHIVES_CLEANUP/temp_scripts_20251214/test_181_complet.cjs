/**
 * TEST 181 OUTILS COMPLET
 */

const axios = require('axios');
const fs = require('fs');

const API = 'http://localhost:3338/api/chat/v2';
const TIMEOUT = 120000;
const DELAY = 2000;

// Générer questions pour chaque outil
function genererQuestion(outil) {
  const questions = {
    'web_search': 'Cherche web: test',
    'get_weather': 'Météo Montréal',
    'get_time': 'Quelle heure?',
    'read_file': 'Lis E:/ANA/package.json',
    'search_in_file': 'Cherche "name" dans E:/ANA/package.json',
    'read_file_chunk': 'Lis lignes 1-5 E:/ANA/package.json',
    'file_info': 'Info E:/ANA/package.json',
    'write_file': 'Écris "test" dans E:/ANA/temp/test_tool.txt',
    'list_files': 'Liste E:/ANA/temp/',
    'run_shell': 'Execute: echo test',
    'web_fetch': 'Fetch https://example.com',
    'wikipedia': 'Wiki Montreal',
    'ask_groq': 'Demande Groq: test',
    'ask_cerebras': 'Demande Cerebras: test',
    'search_memory': 'Cherche mémoire: test',
    'save_memory': 'Sauve: Test tool',
    'edit_file': 'Modifie E:/ANA/temp/test_tool.txt',
    'glob': 'Trouve *.json E:/ANA/',
    'grep': 'Grep "name" E:/ANA/package.json',
    'ask_user': 'Pose question: Test?',
    'run_background': 'Lance: ping localhost -n 1',
    'kill_process': 'Kill PID 99999',
    'todo_write': 'Todo: Test task',
    'notebook_edit': 'Édite notebook cell 1',
    'plan_mode': 'Active plan mode',
    'execute_code': 'Execute: console.log("test")',
    'generate_image': 'Génère image: chat',
    'generate_animation': 'Génère anim: vagues',
    'generate_video': 'Génère vidéo: soleil',
    'image_to_image': 'Transform image.jpg',
    'inpaint_image': 'Inpaint image.jpg',
    'http_request': 'HTTP GET https://api.github.com',
    'get_yt_transcript': 'Transcript YouTube: VIDEO_ID',
    'launch_agent': 'Lance agent test',
    'git_status': 'Git status E:/ANA/',
    'git_commit': 'Git commit -m "test"',
    'git_log': 'Git log E:/ANA/',
    'git_branch': 'Git branches',
    'search_codebase': 'Cherche: function',
    'get_project_structure': 'Structure projet',
    'describe_image': 'Décris test.jpg',
    'debug_screenshot': 'Debug screenshot',
    'analyze_code_screenshot': 'Analyse code screenshot',
    'execute_voice_command': 'Voice: test',
    'ask_architect': 'Architecte: design',
    'review_code': 'Review: function(){}',
    'create_react_component': 'Crée Button component',
    'add_route': 'Ajoute route /test',
    'add_api_endpoint': 'Ajoute /api/test',
    'install_npm_package': 'Install express',
    'analyze_component': 'Analyse Button.jsx',
    'hot_reload_check': 'Check hot reload',
    'validate_jsx_syntax': 'Valide JSX: <div/>',
    'list_available_icons': 'Liste icônes',
    'get_css_variables': 'Variables CSS',
    'create_backup': 'Backup E:/ANA/package.json',
    'copy_file': 'Copie test_tool.txt vers test2.txt',
    'move_file': 'Déplace test2.txt',
    'delete_file': 'Supprime test3.txt',
    'create_directory': 'Crée E:/ANA/temp/test_dir/',
    'get_file_stats': 'Stats E:/ANA/package.json',
    'compare_files': 'Compare test1.txt test2.txt',
    'find_files': 'Trouve *.cjs E:/ANA/server/',
    'watch_file': 'Watch E:/ANA/package.json',
    'get_directory_size': 'Taille E:/ANA/temp/',
    'tree_view': 'Arbre E:/ANA/temp/',
    'download_file': 'Télécharge https://example.com/file.txt',
    'ping': 'Ping google.com',
    'check_url': 'Check https://google.com',
    'get_public_ip': 'Mon IP publique?',
    'dns_lookup': 'DNS google.com',
    'port_scan': 'Scan port 80 localhost',
    'whois': 'WHOIS google.com',
    'create_zip': 'ZIP E:/ANA/temp/ to test.zip',
    'extract_zip': 'Extrait test.zip',
    'list_archive': 'Liste test.zip',
    'compress_gzip': 'GZip file.txt',
    'decompress_gzip': 'Décompresse file.gz',
    'hash_file': 'Hash E:/ANA/package.json',
    'hash_text': 'Hash "hello"',
    'generate_uuid': 'UUID',
    'generate_password': 'Password',
    'encrypt_text': 'Chiffre "secret"',
    'decrypt_text': 'Déchiffre "encrypted"',
    'base64_encode': 'Base64 encode "hello"',
    'base64_decode': 'Base64 decode "aGVsbG8="',
    'get_system_info': 'Info système',
    'get_cpu_usage': 'CPU usage?',
    'get_memory_usage': 'RAM usage?',
    'get_disk_usage': 'Disque E:?',
    'list_processes': 'Liste processus',
    'kill_process_by_name': 'Kill "nonexistent.exe"',
    'get_environment_variable': 'Variable PATH',
    'set_environment_variable': 'Set TEST_VAR=1',
    'get_network_interfaces': 'Interfaces réseau',
    'open_application': 'Ouvre notepad',
    'open_url_in_browser': 'Ouvre https://google.com',
    'json_to_csv': 'JSON to CSV',
    'csv_to_json': 'CSV to JSON',
    'xml_to_json': 'XML to JSON',
    'json_to_xml': 'JSON to XML',
    'yaml_to_json': 'YAML to JSON',
    'json_to_yaml': 'JSON to YAML',
    'parse_html': 'Parse <div>test</div>',
    'markdown_to_html': 'MD to HTML # Title',
    'html_to_markdown': 'HTML to MD <h1>Title</h1>',
    'format_json': 'Format {"a":1}',
    'minify_json': 'Minify {"a": 1}',
    'resize_image': 'Resize img.jpg 800x600',
    'convert_image': 'Convert img.jpg to png',
    'get_image_info': 'Info img.jpg',
    'crop_image': 'Crop img.jpg',
    'rotate_image': 'Rotate img.jpg 90°',
    'take_screenshot': 'Screenshot',
    'git_diff': 'Git diff',
    'git_stash': 'Git stash',
    'git_pull': 'Git pull',
    'git_push': 'Git push',
    'git_clone': 'Git clone https://github.com/test/repo',
    'git_checkout': 'Git checkout main',
    'git_merge': 'Git merge branch',
    'git_reset': 'Git reset HEAD~1',
    'search_replace_in_file': 'Remplace "test" par "demo"',
    'count_lines': 'Compte lignes E:/ANA/package.json',
    'count_words': 'Compte mots E:/ANA/README.md',
    'head_file': 'Head 5 E:/ANA/package.json',
    'tail_file': 'Tail 5 E:/ANA/package.json',
    'append_to_file': 'Ajoute "line"',
    'prepend_to_file': 'Insère "first"',
    'format_date': 'Formate date',
    'date_diff': 'Diff 2025-01-01 et 2025-12-12',
    'add_to_date': 'Ajoute 5 jours',
    'timestamp_to_date': 'Timestamp 1700000000',
    'date_to_timestamp': 'Date to timestamp',
    'calculate': 'Calcule 2+2*3',
    'convert_units': 'Convertis 5 km en miles',
    'random_number': 'Nombre 1-100',
    'statistics': 'Stats [1,2,3,4,5]',
    'get_audio_info': 'Info test.mp3',
    'text_to_speech': 'TTS "Bonjour"',
    'play_audio': 'Joue test.mp3',
    'send_notification': 'Notif "Test"',
    'npm_list': 'NPM list',
    'npm_outdated': 'NPM outdated',
    'npm_run': 'NPM run test',
    'npm_search': 'NPM search express',
    'npm_info': 'NPM info express',
    'browser_open': 'Ouvre https://google.com',
    'browser_screenshot': 'Screenshot https://example.com',
    'browser_pdf': 'PDF https://example.com',
    'browser_click': 'Click button#submit',
    'browser_type': 'Type "test"',
    'browser_evaluate': 'Eval: document.title',
    'browser_extract': 'Extrait div.content',
    'dom_query': 'Query div.main',
    'dom_get_element_by_id': 'Element #header',
    'dom_get_elements_by_class': 'Elements .nav',
    'dom_get_elements_by_tag': 'Elements p',
    'dom_modify': 'Modifie #title',
    'sqlite_query': 'SQLite: SELECT * FROM test',
    'sqlite_tables': 'SQLite tables',
    'sqlite_schema': 'SQLite schema',
    'docker_ps': 'Docker PS',
    'docker_images': 'Docker images',
    'docker_logs': 'Docker logs c1',
    'docker_exec': 'Docker exec c1 ls',
    'docker_start': 'Docker start c1',
    'docker_stop': 'Docker stop c1',
    'ollama_list': 'Ollama list',
    'ollama_pull': 'Ollama pull llama2',
    'ollama_delete': 'Ollama delete model',
    'ollama_chat': 'Ollama chat: test',
    'clipboard_read': 'Lis clipboard',
    'clipboard_write': 'Écris clipboard "test"',
    'set_reminder': 'Rappel 5min "Test"',
    'list_reminders': 'Liste rappels',
    'cancel_reminder': 'Annule rappel 1',
    'test_regex': 'Regex /[0-9]+/ sur "123"',
    'validate_json': 'Valide {"a":1}',
    'validate_email': 'Valide test@example.com',
    'validate_url': 'Valide https://google.com'
  };
  return questions[outil] || `Utilise ${outil}`;
}

async function tester(outil, i, total) {
  const q = genererQuestion(outil);
  console.log(`[${i}/${total}] ${outil}`);

  try {
    const debut = Date.now();
    const r = await axios.post(API, {message: q}, {timeout: TIMEOUT});
    const duree = Date.now() - debut;

    if (r.data && r.data.success) {
      console.log(`    ✅ ${duree}ms`);
      return {outil, statut: 'OK', duree};
    }
    console.log(`    ❌ FAIL`);
    return {outil, statut: 'FAIL'};
  } catch (e) {
    console.log(`    ❌ ERROR: ${e.message}`);
    return {outil, statut: 'ERROR', erreur: e.message};
  }
}

async function main() {
  // Lire liste des 181 outils
  const outils = fs.readFileSync('E:/ANA/temp/LISTE_181_OUTILS.txt', 'utf8')
    .split('\n').map(l => l.trim()).filter(l => l);

  console.log('='.repeat(60));
  console.log(`TEST ${outils.length} OUTILS COMPLET`);
  console.log('='.repeat(60));

  const resultats = [];

  for (let i = 0; i < outils.length; i++) {
    const r = await tester(outils[i], i + 1, outils.length);
    resultats.push(r);
    if (i < outils.length - 1) await new Promise(resolve => setTimeout(resolve, DELAY));
  }

  const ok = resultats.filter(r => r.statut === 'OK').length;
  const fail = resultats.filter(r => r.statut === 'FAIL').length;
  const error = resultats.filter(r => r.statut === 'ERROR').length;

  console.log('\n' + '='.repeat(60));
  console.log(`RÉSULTATS: ${ok} OK | ${fail} FAIL | ${error} ERROR`);
  console.log(`Taux: ${(ok/outils.length*100).toFixed(1)}% (${ok}/${outils.length})`);
  console.log('='.repeat(60));

  fs.writeFileSync('E:/ANA/temp/resultats_181_complet.json', JSON.stringify(resultats, null, 2));
}

main().catch(console.error);
