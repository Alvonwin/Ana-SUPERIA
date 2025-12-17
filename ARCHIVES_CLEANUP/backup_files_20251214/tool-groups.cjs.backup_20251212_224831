/**
 * TOOL GROUPS - Groupement des outils par catégorie
 *
 * Créé: 11 Décembre 2025
 * But: Réduire le nombre de tokens en envoyant seulement les outils pertinents
 *
 * Problème résolu: 181 outils = 15,466 tokens, trop pour qwen3:8b
 * Solution: Envoyer seulement 10-20 outils par groupe = ~1,000 tokens
 */

const TOOL_GROUPS = {
  // Groupe WEB & API - recherche web, météo, heure
  web: [
    'web_search', 'get_weather', 'get_time', 'web_fetch',
    'wikipedia', 'http_request', 'check_url', 'get_public_ip',
    'dns_lookup', 'whois', 'ping'
  ],

  // Groupe FICHIERS - lecture, écriture, manipulation
  files: [
    'read_file', 'write_file', 'edit_file', 'list_files',
    'glob', 'grep', 'search_in_file', 'read_file_chunk',
    'file_info', 'copy_file', 'move_file', 'delete_file',
    'create_directory', 'get_file_stats', 'compare_files',
    'find_files', 'tree_view', 'create_backup',
    'search_replace_in_file', 'count_lines', 'count_words',
    'head_file', 'tail_file', 'append_to_file', 'prepend_to_file'
  ],

  // Groupe SYSTÈME - CPU, RAM, disque, processus
  system: [
    'get_system_info', 'get_cpu_usage', 'get_memory_usage',
    'get_disk_usage', 'list_processes', 'kill_process',
    'kill_process_by_name', 'get_environment_variable',
    'set_environment_variable', 'get_network_interfaces',
    'open_application', 'open_url_in_browser', 'run_shell',
    'run_background', 'take_screenshot'
  ],

  // Groupe GIT - gestion de version
  git: [
    'git_status', 'git_commit', 'git_log', 'git_branch',
    'git_diff', 'git_stash', 'git_pull', 'git_push',
    'git_clone', 'git_checkout', 'git_merge', 'git_reset'
  ],

  // Groupe DOCKER - containers
  docker: [
    'docker_ps', 'docker_images', 'docker_logs',
    'docker_exec', 'docker_start', 'docker_stop'
  ],

  // Groupe OLLAMA - modèles LLM locaux
  ollama: [
    'ollama_list', 'ollama_pull', 'ollama_delete', 'ollama_chat'
  ],

  // Groupe IMAGE - génération et manipulation d'images
  image: [
    'generate_image', 'generate_animation', 'generate_video',
    'image_to_image', 'inpaint_image', 'describe_image',
    'debug_screenshot', 'analyze_code_screenshot',
    'resize_image', 'convert_image', 'get_image_info',
    'crop_image', 'rotate_image'
  ],

  // Groupe CONVERSION - formats de données
  conversion: [
    'json_to_csv', 'csv_to_json', 'xml_to_json', 'json_to_xml',
    'yaml_to_json', 'json_to_yaml', 'parse_html',
    'markdown_to_html', 'html_to_markdown', 'format_json', 'minify_json'
  ],

  // Groupe CRYPTO - hash, encryption, UUID
  crypto: [
    'hash_file', 'hash_text', 'generate_uuid', 'generate_password',
    'encrypt_text', 'decrypt_text', 'base64_encode', 'base64_decode'
  ],

  // Groupe NPM - packages Node.js
  npm: [
    'npm_list', 'npm_outdated', 'npm_run', 'npm_search', 'npm_info',
    'install_npm_package'
  ],

  // Groupe ARCHIVE - compression/décompression
  archive: [
    'create_zip', 'extract_zip', 'list_archive',
    'compress_gzip', 'decompress_gzip', 'download_file'
  ],

  // Groupe DATE/MATH - calculs et dates
  datetime: [
    'format_date', 'date_diff', 'add_to_date',
    'timestamp_to_date', 'date_to_timestamp',
    'calculate', 'convert_units', 'random_number', 'statistics'
  ],

  // Groupe AUDIO - son et voix
  audio: [
    'get_audio_info', 'text_to_speech', 'play_audio'
  ],

  // Groupe BROWSER - automatisation navigateur
  browser: [
    'browser_open', 'browser_screenshot', 'browser_pdf',
    'browser_click', 'browser_type', 'browser_evaluate',
    'browser_extract', 'dom_query', 'dom_get_element_by_id',
    'dom_get_elements_by_class', 'dom_get_elements_by_tag', 'dom_modify'
  ],

  // Groupe DATABASE - SQLite
  database: [
    'sqlite_query', 'sqlite_tables', 'sqlite_schema'
  ],

  // Groupe MEMORY - mémoire Ana
  memory: [
    'search_memory', 'save_memory'
  ],

  // Groupe CODE - programmation et analyse
  code: [
    'execute_code', 'create_react_component', 'add_route',
    'add_api_endpoint', 'analyze_component', 'hot_reload_check',
    'validate_jsx_syntax', 'list_available_icons', 'get_css_variables',
    'search_codebase', 'get_project_structure'
  ],

  // Groupe AGENTS - sous-agents et architecture
  agents: [
    'ask_groq', 'ask_cerebras', 'launch_agent',
    'ask_architect', 'review_code'
  ],

  // Groupe VALIDATION - validation de données
  validation: [
    'test_regex', 'validate_json', 'validate_email', 'validate_url'
  ],

  // Groupe UTILS - utilitaires divers
  utils: [
    'ask_user', 'todo_write', 'notebook_edit', 'plan_mode',
    'send_notification', 'clipboard_read', 'clipboard_write',
    'set_reminder', 'list_reminders', 'cancel_reminder',
    'execute_voice_command'
  ],

  // Groupe YOUTUBE - vidéos
  youtube: [
    'youtube_search', 'get_yt_transcript', 'get_news'
  ]
};

// Keywords pour détecter le groupe nécessaire
const GROUP_KEYWORDS = {
  web: ['météo', 'meteo', 'weather', 'température', 'heure', 'date', 'time', 'chercher', 'recherche', 'search', 'web', 'internet', 'wiki', 'wikipedia', 'ping', 'ip', 'dns', 'whois'],
  files: ['fichier', 'file', 'lire', 'read', 'écrire', 'write', 'éditer', 'edit', 'dossier', 'folder', 'directory', 'liste', 'list', 'glob', 'grep', 'chercher dans', 'copier', 'copy', 'déplacer', 'move', 'supprimer', 'delete', 'backup', 'arbre', 'tree'],
  system: ['cpu', 'mémoire', 'memory', 'ram', 'disque', 'disk', 'processus', 'process', 'système', 'system', 'variable', 'env', 'réseau', 'network', 'ouvrir', 'open', 'application', 'screenshot', 'capture'],
  git: ['git', 'commit', 'branch', 'branche', 'diff', 'stash', 'pull', 'push', 'clone', 'checkout', 'merge', 'reset', 'version'],
  docker: ['docker', 'container', 'conteneur', 'image docker'],
  ollama: ['ollama', 'modèle', 'model', 'llm local', 'pull model'],
  image: ['image', 'photo', 'générer image', 'generate image', 'animation', 'vidéo', 'video', 'inpaint', 'décrire image', 'describe', 'resize', 'crop', 'rotate'],
  conversion: ['convertir', 'convert', 'json', 'csv', 'xml', 'yaml', 'html', 'markdown', 'format', 'minify'],
  crypto: ['hash', 'uuid', 'password', 'mot de passe', 'encrypt', 'decrypt', 'chiffrer', 'base64'],
  npm: ['npm', 'package', 'node module', 'installer', 'install'],
  archive: ['zip', 'archive', 'compress', 'extract', 'gzip', 'télécharger', 'download'],
  datetime: ['date', 'heure', 'time', 'calculer', 'calculate', 'convertir unité', 'convert unit', 'statistique', 'random', 'aléatoire'],
  audio: ['audio', 'son', 'sound', 'voix', 'voice', 'parler', 'speak', 'tts'],
  browser: ['navigateur', 'browser', 'page web', 'webpage', 'click', 'cliquer', 'dom', 'html element'],
  database: ['sqlite', 'database', 'base de données', 'sql', 'table'],
  memory: ['mémoire ana', 'souvenir', 'rappelle', 'remember', 'chercher mémoire', 'sauver mémoire'],
  code: ['code', 'react', 'composant', 'component', 'route', 'api', 'endpoint', 'jsx', 'css', 'icon', 'analyser code'],
  agents: ['groq', 'cerebras', 'agent', 'architecte', 'architect', 'review', 'révision'],
  validation: ['valider', 'validate', 'regex', 'email', 'url'],
  utils: ['notification', 'clipboard', 'presse-papier', 'rappel', 'reminder', 'todo', 'plan', 'voice command'],
  youtube: ['youtube', 'vidéo youtube', 'transcript', 'news', 'actualité']
};

/**
 * Détecte le(s) groupe(s) d'outils nécessaires selon la requête
 * @param {string} query - La requête utilisateur
 * @returns {string[]} - Liste des groupes détectés
 */
function detectToolGroups(query) {
  const queryLower = query.toLowerCase();
  const detectedGroups = new Set();

  for (const [group, keywords] of Object.entries(GROUP_KEYWORDS)) {
    for (const keyword of keywords) {
      if (queryLower.includes(keyword)) {
        detectedGroups.add(group);
        break;
      }
    }
  }

  // Si aucun groupe détecté, retourner les groupes les plus courants
  if (detectedGroups.size === 0) {
    return ['web', 'files', 'system'];
  }

  return Array.from(detectedGroups);
}

/**
 * Filtre les outils pour ne garder que ceux des groupes spécifiés
 * @param {Array} allTools - Tous les outils (TOOL_DEFINITIONS)
 * @param {string[]} groups - Groupes à inclure
 * @returns {Array} - Outils filtrés
 */
function filterToolsByGroups(allTools, groups) {
  // Collecter tous les noms d'outils des groupes demandés
  const allowedToolNames = new Set();

  for (const group of groups) {
    const toolNames = TOOL_GROUPS[group] || [];
    toolNames.forEach(name => allowedToolNames.add(name));
  }

  // Filtrer les définitions d'outils
  return allTools.filter(tool => {
    const toolName = tool.function?.name || tool.name;
    return allowedToolNames.has(toolName);
  });
}

/**
 * Obtient les outils pertinents pour une requête
 * @param {Array} allTools - Tous les outils
 * @param {string} query - La requête utilisateur
 * @returns {Object} - { tools: Array, groups: string[] }
 */
function getRelevantTools(allTools, query) {
  const groups = detectToolGroups(query);
  const tools = filterToolsByGroups(allTools, groups);

  console.log(`[ToolGroups] Query: "${query.substring(0, 50)}..."`);
  console.log(`[ToolGroups] Detected groups: ${groups.join(', ')}`);
  console.log(`[ToolGroups] Filtered tools: ${allTools.length} → ${tools.length}`);

  return { tools, groups };
}

module.exports = {
  TOOL_GROUPS,
  GROUP_KEYWORDS,
  detectToolGroups,
  filterToolsByGroups,
  getRelevantTools
};
