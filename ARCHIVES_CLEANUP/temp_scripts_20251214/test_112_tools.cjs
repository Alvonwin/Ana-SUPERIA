/**
 * TEST 112 OUTILS TESTABLES - Automatique
 * Génère automatiquement des questions en langage naturel
 */

const axios = require('axios');
const fs = require('fs');

const API = 'http://localhost:3338/api/chat/v2';
const DELAY = 2000;  // 2 secondes entre tests
const TIMEOUT = 60000; // 60 secondes timeout par test

// Générateur de questions en langage naturel
function genererQuestion(nomOutil) {
  const questions = {
    // WEB
    'web_search': 'Cherche sur le web: test search',
    'get_weather': 'Météo à Montréal',
    'get_time': 'Quelle heure maintenant?',
    'web_fetch': 'Fetch https://example.com',
    'wikipedia': 'Wikipédia Montreal',
    'http_request': 'HTTP GET https://api.github.com',
    'check_url': 'Vérifie URL https://google.com',
    'get_public_ip': 'Mon IP publique?',
    'dns_lookup': 'DNS lookup google.com',
    'whois': 'WHOIS google.com',
    'ping': 'Ping google.com',

    // FILES
    'read_file': 'Lis E:/ANA/package.json',
    'write_file': 'Écris "test" dans E:/ANA/temp/test1.txt',
    'edit_file': 'Modifie E:/ANA/temp/test1.txt',
    'list_files': 'Liste E:/ANA/temp/',
    'glob': 'Trouve fichiers *.json dans E:/ANA/',
    'grep': 'Cherche "name" dans E:/ANA/package.json',
    'search_in_file': 'Cherche "test" dans E:/ANA/package.json',
    'read_file_chunk': 'Lis lignes 1-10 de E:/ANA/package.json',
    'file_info': 'Info E:/ANA/package.json',
    'copy_file': 'Copie E:/ANA/temp/test1.txt vers E:/ANA/temp/test2.txt',
    'move_file': 'Déplace E:/ANA/temp/test2.txt vers E:/ANA/temp/test3.txt',
    'delete_file': 'Supprime E:/ANA/temp/test3.txt',
    'create_directory': 'Crée dossier E:/ANA/temp/test_dir/',
    'get_file_stats': 'Stats E:/ANA/package.json',
    'compare_files': 'Compare E:/ANA/temp/test1.txt et E:/ANA/temp/test2.txt',
    'find_files': 'Trouve fichiers *.cjs dans E:/ANA/server/',
    'tree_view': 'Arbre E:/ANA/temp/',
    'create_backup': 'Backup E:/ANA/package.json',
    'search_replace_in_file': 'Remplace "test" par "demo" dans E:/ANA/temp/test1.txt',
    'count_lines': 'Compte lignes E:/ANA/package.json',
    'count_words': 'Compte mots E:/ANA/README.md',
    'head_file': 'Head 5 lignes E:/ANA/package.json',
    'tail_file': 'Tail 5 lignes E:/ANA/package.json',
    'append_to_file': 'Ajoute "new line" à E:/ANA/temp/test1.txt',
    'prepend_to_file': 'Insère "first line" au début de E:/ANA/temp/test1.txt',

    // SYSTEM
    'get_system_info': 'Info système?',
    'get_cpu_usage': 'Usage CPU?',
    'get_memory_usage': 'Usage RAM?',
    'get_disk_usage': 'Espace disque E:?',
    'list_processes': 'Liste processus',
    'kill_process': 'Kill process PID 99999',
    'kill_process_by_name': 'Kill process "nonexistent.exe"',
    'get_environment_variable': 'Variable PATH?',
    'set_environment_variable': 'Set TEST_VAR=value',
    'get_network_interfaces': 'Interfaces réseau?',
    'open_application': 'Ouvre notepad',
    'open_url_in_browser': 'Ouvre https://google.com dans navigateur',
    'run_shell': 'Execute: echo test',
    'run_background': 'Lance en background: ping localhost -n 2',
    'take_screenshot': 'Capture écran',

    // GIT
    'git_status': 'Git status E:/ANA/',
    'git_commit': 'Git commit -m "test"',
    'git_log': 'Git log E:/ANA/',
    'git_branch': 'Git branch E:/ANA/',
    'git_diff': 'Git diff E:/ANA/',
    'git_stash': 'Git stash E:/ANA/',
    'git_pull': 'Git pull E:/ANA/',
    'git_push': 'Git push E:/ANA/',
    'git_clone': 'Git clone https://github.com/test/repo',
    'git_checkout': 'Git checkout main',
    'git_merge': 'Git merge feature',
    'git_reset': 'Git reset HEAD~1',

    // DOCKER
    'docker_ps': 'Docker PS',
    'docker_images': 'Docker images',
    'docker_logs': 'Docker logs container1',
    'docker_exec': 'Docker exec container1 ls',
    'docker_start': 'Docker start container1',
    'docker_stop': 'Docker stop container1',

    // OLLAMA
    'ollama_list': 'Ollama list',
    'ollama_pull': 'Ollama pull llama2',
    'ollama_delete': 'Ollama delete test-model',
    'ollama_chat': 'Ollama chat: bonjour',

    // IMAGE
    'generate_image': 'Génère image: un chat',
    'generate_animation': 'Génère animation: vagues',
    'generate_video': 'Génère vidéo: soleil levant',
    'image_to_image': 'Transform image test.jpg',
    'inpaint_image': 'Inpaint image.jpg mask.jpg',
    'describe_image': 'Décris image test.jpg',
    'debug_screenshot': 'Debug screenshot',
    'analyze_code_screenshot': 'Analyse code screenshot',
    'resize_image': 'Resize image.jpg 800x600',
    'convert_image': 'Convert image.jpg to .png',
    'get_image_info': 'Info image test.jpg',
    'crop_image': 'Crop image.jpg 0,0,100,100',
    'rotate_image': 'Rotate image.jpg 90°',

    // CONVERSION
    'json_to_csv': 'JSON to CSV data.json',
    'csv_to_json': 'CSV to JSON data.csv',
    'xml_to_json': 'XML to JSON data.xml',
    'json_to_xml': 'JSON to XML data.json',
    'yaml_to_json': 'YAML to JSON config.yaml',
    'json_to_yaml': 'JSON to YAML config.json',
    'parse_html': 'Parse HTML <div>test</div>',
    'markdown_to_html': 'Markdown to HTML # Title',
    'html_to_markdown': 'HTML to Markdown <h1>Title</h1>',
    'format_json': 'Format JSON {"a":1}',
    'minify_json': 'Minify JSON {"a": 1}',

    // CRYPTO
    'hash_file': 'Hash E:/ANA/package.json',
    'hash_text': 'Hash "hello world"',
    'generate_uuid': 'Génère UUID',
    'generate_password': 'Génère mot de passe',
    'encrypt_text': 'Chiffre "secret"',
    'decrypt_text': 'Déchiffre "encrypted"',
    'base64_encode': 'Base64 encode "hello"',
    'base64_decode': 'Base64 decode "aGVsbG8="',

    // NPM
    'npm_list': 'NPM list',
    'npm_outdated': 'NPM outdated',
    'npm_run': 'NPM run test',
    'npm_search': 'NPM search express',
    'npm_info': 'NPM info express',
    'install_npm_package': 'Install express',

    // ARCHIVE
    'create_zip': 'ZIP E:/ANA/temp/ to test.zip',
    'extract_zip': 'Extrait test.zip',
    'list_archive': 'Liste archive test.zip',
    'compress_gzip': 'GZip file.txt',
    'decompress_gzip': 'Décompresse file.gz',
    'download_file': 'Télécharge https://example.com/file.txt',

    // DATE/MATH
    'format_date': 'Formate date aujourd\'hui',
    'date_diff': 'Différence entre 2025-01-01 et 2025-12-12',
    'add_to_date': 'Ajoute 5 jours à aujourd\'hui',
    'timestamp_to_date': 'Timestamp 1700000000 to date',
    'date_to_timestamp': 'Date 2025-12-12 to timestamp',
    'calculate': 'Calcule 2+2*3',
    'convert_units': 'Convertis 5 km en miles',
    'random_number': 'Nombre aléatoire 1-100',
    'statistics': 'Stats de [1,2,3,4,5]',

    // AUDIO
    'get_audio_info': 'Info audio test.mp3',
    'text_to_speech': 'TTS "Bonjour"',
    'play_audio': 'Joue test.mp3',

    // BROWSER
    'browser_open': 'Ouvre https://google.com',
    'browser_screenshot': 'Screenshot https://example.com',
    'browser_pdf': 'PDF https://example.com',
    'browser_click': 'Click button#submit',
    'browser_type': 'Type "test" dans input#search',
    'browser_evaluate': 'Eval JS: document.title',
    'browser_extract': 'Extrait texte de div.content',
    'dom_query': 'Query DOM: div.main',
    'dom_get_element_by_id': 'Element ID: header',
    'dom_get_elements_by_class': 'Elements classe: nav-item',
    'dom_get_elements_by_tag': 'Elements tag: p',
    'dom_modify': 'Modifie DOM #title textContent="Test"',

    // DATABASE
    'sqlite_query': 'SQLite query: SELECT * FROM test',
    'sqlite_tables': 'SQLite tables db.sqlite',
    'sqlite_schema': 'SQLite schema db.sqlite',

    // MEMORY
    'search_memory': 'Cherche mémoire: test',
    'save_memory': 'Sauve mémoire: Test save',

    // CODE
    'execute_code': 'Execute: console.log("test")',
    'create_react_component': 'Crée component Button',
    'add_route': 'Ajoute route /test',
    'add_api_endpoint': 'Ajoute endpoint /api/test',
    'analyze_component': 'Analyse component Button',
    'hot_reload_check': 'Check hot reload',
    'validate_jsx_syntax': 'Valide JSX: <div>test</div>',
    'list_available_icons': 'Liste icônes',
    'get_css_variables': 'Variables CSS',
    'search_codebase': 'Cherche code: function',
    'get_project_structure': 'Structure projet',

    // AGENTS
    'ask_groq': 'Demande Groq: test',
    'ask_cerebras': 'Demande Cerebras: test',
    'launch_agent': 'Lance agent test',
    'ask_architect': 'Demande architecte: design',
    'review_code': 'Révise code: function test(){}',

    // VALIDATION
    'test_regex': 'Test regex /[0-9]+/ sur "123"',
    'validate_json': 'Valide JSON {"a":1}',
    'validate_email': 'Valide email test@example.com',
    'validate_url': 'Valide URL https://google.com',

    // UTILS
    'ask_user': 'Demande utilisateur une question',
    'todo_write': 'Écris TODO: Task 1',
    'notebook_edit': 'Édite notebook cell 1',
    'plan_mode': 'Mode plan',
    'send_notification': 'Notif "Test message"',
    'clipboard_read': 'Lis clipboard',
    'clipboard_write': 'Écris clipboard "test"',
    'set_reminder': 'Rappel dans 5 min "Test"',
    'list_reminders': 'Liste rappels',
    'cancel_reminder': 'Annule rappel 1',
    'execute_voice_command': 'Commande vocale "test"',

    // YOUTUBE
    'youtube_search': 'YouTube search: tutorial',
    'get_yt_transcript': 'Transcript YouTube: VIDEO_ID',
    'get_news': 'Actualités tech'
  };

  return questions[nomOutil] || `Utilise l'outil ${nomOutil}`;
}

async function testerOutil(nom, index, total) {
  const question = genererQuestion(nom);
  console.log(`[${index}/${total}] ${nom}`);
  console.log(`    Q: ${question.substring(0, 50)}...`);

  try {
    const debut = Date.now();
    const r = await axios.post(API, { message: question }, { timeout: TIMEOUT });
    const duree = Date.now() - debut;

    if (r.data && r.data.success) {
      const reponse = r.data.response.substring(0, 80).replace(/\n/g, ' ');
      console.log(`    ✅ ${duree}ms`);
      console.log(`    "${reponse}..."`);
      return { outil: nom, statut: 'OK', duree, question };
    } else {
      console.log(`    ❌ FAIL`);
      return { outil: nom, statut: 'FAIL', question };
    }
  } catch (e) {
    console.log(`    ❌ ERROR: ${e.message}`);
    return { outil: nom, statut: 'ERROR', erreur: e.message, question };
  }
}

async function main() {
  // Charger la liste des outils depuis le rapport précédent
  const rapport = JSON.parse(fs.readFileSync('E:/ANA/temp/cycle_test_report.json', 'utf8'));
  const outilsOK = rapport.details.OK.map(o => o.name);

  console.log('='.repeat(60));
  console.log(`TEST 112 OUTILS - AUTOMATIQUE`);
  console.log(`${outilsOK.length} outils testables identifiés`);
  console.log('='.repeat(60));

  const resultats = [];

  for (let i = 0; i < outilsOK.length; i++) {
    const r = await testerOutil(outilsOK[i], i + 1, outilsOK.length);
    resultats.push(r);

    // Pause entre tests
    if (i < outilsOK.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY));
    }
  }

  // Statistiques finales
  const ok = resultats.filter(r => r.statut === 'OK').length;
  const fail = resultats.filter(r => r.statut === 'FAIL').length;
  const error = resultats.filter(r => r.statut === 'ERROR').length;

  console.log('\n' + '='.repeat(60));
  console.log(`RÉSULTATS: ${ok} OK | ${fail} FAIL | ${error} ERROR`);
  console.log(`Taux: ${(ok/outilsOK.length*100).toFixed(1)}% (${ok}/${outilsOK.length})`);
  console.log('='.repeat(60));

  // Sauvegarder
  fs.writeFileSync('E:/ANA/temp/resultats_112_tools.json', JSON.stringify(resultats, null, 2));
  console.log('\nRésultats: E:/ANA/temp/resultats_112_tools.json');
}

main().catch(console.error);
