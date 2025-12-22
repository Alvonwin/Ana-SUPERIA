/**
 * TOOL GROUPS - Groupement des outils par catégorie
 *
 * Créé: 11 Décembre 2025
 * Mis à jour: 17 Décembre 2025 - Ajout Experience Boost (patterns appris)
 *
 * But: Réduire le nombre de tokens en envoyant seulement les outils pertinents
 *
 * Méthodes:
 * 1. Keywords (original): detectToolGroups() + filterToolsByGroups()
 * 2. Sémantique (nouveau): getRelevantToolsSemantic() via ChromaDB
 * 3. Hybride (recommandé): getRelevantToolsHybrid() combine les deux
 * 4. Experience Boost: Priorise les outils qui ont fonctionné pour ce taskType
 */

const { searchTools } = require('../tools/tool-embeddings.cjs');

// FIX 2025-12-17: Import pour utiliser les patterns appris (experience boost)
let skillLearner = null;
let semanticRouter = null;
try {
  skillLearner = require('../intelligence/skill-learner.cjs');
  semanticRouter = require('../intelligence/semantic-router.cjs');
} catch (e) {
  console.warn('[ToolGroups] Pattern learning non disponible:', e.message);
}

const TOOL_GROUPS = {
  web: ['web_search', 'get_weather', 'get_time', 'web_fetch', 'wikipedia', 'http_request', 'check_url', 'get_public_ip', 'dns_lookup', 'whois', 'ping', 'port_scan'],
  files: ['read_file', 'write_file', 'edit_file', 'list_files', 'glob', 'grep', 'search_in_file', 'read_file_chunk', 'file_info', 'copy_file', 'move_file', 'delete_file', 'create_directory', 'get_file_stats', 'compare_files', 'find_files', 'tree_view', 'create_backup', 'search_replace_in_file', 'count_lines', 'count_words', 'head_file', 'tail_file', 'append_to_file', 'prepend_to_file', 'watch_file', 'get_directory_size'],
  system: ['get_system_info', 'get_cpu_usage', 'get_memory_usage', 'get_disk_usage', 'list_processes', 'kill_process', 'kill_process_by_name', 'get_environment_variable', 'set_environment_variable', 'get_network_interfaces', 'open_application', 'open_url_in_browser', 'run_shell', 'run_background', 'take_screenshot'],
  git: ['git_status', 'git_commit', 'git_log', 'git_branch', 'git_diff', 'git_stash', 'git_pull', 'git_push', 'git_clone', 'git_checkout', 'git_merge', 'git_reset'],
  docker: ['docker_ps', 'docker_images', 'docker_logs', 'docker_exec', 'docker_start', 'docker_stop'],
  ollama: ['ollama_list', 'ollama_pull', 'ollama_delete', 'ollama_chat'],
  image: ['generate_image', 'generate_animation', 'generate_video', 'image_to_image', 'inpaint_image', 'describe_image', 'extract_text', 'debug_screenshot', 'analyze_code_screenshot', 'resize_image', 'convert_image', 'get_image_info', 'crop_image', 'rotate_image'],
  conversion: ['json_to_csv', 'csv_to_json', 'xml_to_json', 'json_to_xml', 'yaml_to_json', 'json_to_yaml', 'parse_html', 'markdown_to_html', 'html_to_markdown', 'format_json', 'minify_json'],
  crypto: ['hash_file', 'hash_text', 'generate_uuid', 'generate_password', 'encrypt_text', 'decrypt_text', 'base64_encode', 'base64_decode'],
  npm: ['npm_list', 'npm_outdated', 'npm_run', 'npm_search', 'npm_info', 'install_npm_package'],
  archive: ['create_zip', 'extract_zip', 'list_archive', 'compress_gzip', 'decompress_gzip', 'download_file'],
  datetime: ['format_date', 'date_diff', 'add_to_date', 'timestamp_to_date', 'date_to_timestamp', 'calculate', 'convert_units', 'random_number', 'statistics', 'get_zodiac_sign'],
  audio: ['get_audio_info', 'text_to_speech', 'play_audio'],
  browser: ['browser_open', 'browser_screenshot', 'browser_pdf', 'browser_click', 'browser_type', 'browser_evaluate', 'browser_extract', 'dom_query', 'dom_get_element_by_id', 'dom_get_elements_by_class', 'dom_get_elements_by_tag', 'dom_modify'],
  database: ['sqlite_query', 'sqlite_tables', 'sqlite_schema'],
  memory: ['search_memory', 'save_memory', 'memory_update', 'memory_forget', 'memory_reflect', 'memory_link', 'memory_query_graph'],
  code: ['execute_code', 'create_react_component', 'add_route', 'add_api_endpoint', 'analyze_component', 'hot_reload_check', 'validate_jsx_syntax', 'list_available_icons', 'get_css_variables', 'search_codebase', 'get_project_structure'],
  agents: ['ask_groq', 'ask_cerebras', 'launch_agent', 'ask_architect', 'review_code'],
  validation: ['test_regex', 'validate_json', 'validate_email', 'validate_url'],
  utils: ['ask_user', 'todo_write', 'notebook_edit', 'plan_mode', 'send_notification', 'clipboard_read', 'clipboard_write', 'set_reminder', 'list_reminders', 'cancel_reminder', 'execute_voice_command'],
  youtube: ['youtube_search', 'get_yt_transcript', 'get_news'],
  python: ['execute_python', 'create_excel', 'create_word', 'create_pdf', 'create_powerpoint', 'create_gif']
};

const GROUP_KEYWORDS = {
  web: ['météo', 'meteo', 'weather', 'température', 'heure', 'date', 'time', 'chercher', 'recherche', 'search', 'web', 'internet', 'wiki', 'wikipedia', 'ping', 'ip', 'dns', 'whois', 'http', 'requête', 'request', 'check url', 'vérifier url', 'url valide', 'url accessible', 'port scan', 'scanner port', 'port ouvert'],
  files: ['fichier', 'file', 'lire', 'read', 'écrire', 'write', 'éditer', 'edit', 'dossier', 'folder', 'directory', 'liste', 'list', 'glob', 'grep', 'chercher dans', 'copier', 'copy', 'déplacer', 'move', 'supprimer', 'delete', 'backup', 'arbre', 'tree'],
  system: ['cpu', 'mémoire', 'memory', 'ram', 'disque', 'disk', 'processus', 'process', 'système', 'system', 'variable', 'env', 'réseau', 'network', 'ouvrir', 'open', 'application', 'screenshot', 'capture'],
  git: ['git', 'commit', 'branch', 'branche', 'diff', 'stash', 'pull', 'push', 'clone', 'checkout', 'merge', 'reset', 'version'],
  docker: ['docker', 'container', 'conteneur', 'image docker'],
  ollama: ['ollama', 'modèle', 'model', 'llm local', 'pull model'],
  image: ['image', 'photo', 'générer image', 'generate image', 'animation', 'vidéo', 'video', 'inpaint', 'décrire image', 'describe', 'resize', 'crop', 'rotate', 'ocr', 'texte', 'extraire texte', 'extract text', 'lire le texte'],
  conversion: ['convertir', 'convert', 'json', 'csv', 'xml', 'yaml', 'html', 'markdown', 'format', 'minify'],
  crypto: ['hash', 'uuid', 'password', 'mot de passe', 'encrypt', 'decrypt', 'chiffrer', 'base64'],
  npm: ['npm', 'package', 'node module', 'installer', 'install'],
  archive: ['zip', 'archive', 'compress', 'extract', 'gzip', 'télécharger', 'download'],
  datetime: ['date', 'heure', 'time', 'calculer', 'calculate', 'convertir unité', 'convert unit', 'statistique', 'random', 'aléatoire', 'zodiaque', 'zodiac', 'horoscope', 'signe astrologique', 'combien', 'fois', 'plus', 'moins', 'diviser', 'multiplier', 'addition', 'soustraction', 'math'],
  audio: ['audio', 'son', 'sound', 'voix', 'voice', 'parler', 'speak', 'tts'],
  browser: ['navigateur', 'browser', 'page web', 'webpage', 'click', 'cliquer', 'dom', 'html element'],
  database: ['sqlite', 'database', 'base de données', 'sql', 'table'],
  memory: ['mémoire ana', 'souvenir', 'rappelle', 'remember', 'chercher mémoire', 'sauver mémoire', 'oublier', 'forget', 'mettre à jour mémoire', 'lier mémoire', 'réflexion mémoire'],
  code: ['code', 'react', 'composant', 'component', 'route', 'api', 'endpoint', 'jsx', 'css', 'icon', 'analyser code'],
  agents: ['groq', 'cerebras', 'agent', 'architecte', 'architect', 'review', 'révision'],
  validation: ['valider', 'validate', 'regex', 'email', 'url'],
  utils: ['notification', 'clipboard', 'presse-papier', 'rappel', 'reminder', 'todo', 'plan', 'voice command'],
  youtube: ['youtube', 'vidéo youtube', 'transcript', 'news', 'actualité'],
  python: ['python', 'excel', 'xlsx', 'word', 'docx', 'pdf', 'powerpoint', 'pptx', 'gif', 'tableur', 'spreadsheet', 'document word', 'présentation', 'slides']
};

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
  if (detectedGroups.size === 0) return ['web'];
  return Array.from(detectedGroups);
}

function filterToolsByGroups(allTools, groups) {
  const allowedToolNames = new Set();
  for (const group of groups) {
    const toolNames = TOOL_GROUPS[group] || [];
    toolNames.forEach(name => allowedToolNames.add(name));
  }
  return allTools.filter(tool => {
    const toolName = tool.function?.name || tool.name;
    return allowedToolNames.has(toolName);
  });
}

function getRelevantTools(allTools, query) {
  const groups = detectToolGroups(query);
  const tools = filterToolsByGroups(allTools, groups);
  console.log(`[ToolGroups] Query: "${query.substring(0, 50)}..."`);
  console.log(`[ToolGroups] Detected groups: ${groups.join(', ')}`);
  console.log(`[ToolGroups] Filtered tools: ${allTools.length} → ${tools.length}`);
  return { tools, groups };
}

async function getRelevantToolsSemantic(allTools, query, topN = 10) {
  try {
    const result = await searchTools(query, topN);
    const toolNames = result.tools || [];
    const tools = allTools.filter(tool => {
      const name = tool.function?.name || tool.name;
      return toolNames.includes(name);
    });
    console.log(`[ToolGroups] Semantic search: "${query.substring(0, 50)}..."`);
    console.log(`[ToolGroups] Found ${toolNames.length} tools: ${toolNames.join(', ')}`);
    return { tools, toolNames };
  } catch (error) {
    console.error('[ToolGroups] Semantic search error:', error.message);
    return getRelevantTools(allTools, query);
  }
}

async function getRelevantToolsHybrid(allTools, query, topN = 10) {
  const keywordResult = getRelevantTools(allTools, query);
  let semanticResult = { tools: [], toolNames: [] };
  try {
    semanticResult = await getRelevantToolsSemantic(allTools, query, topN);
  } catch (error) {
    console.warn('[ToolGroups] Semantic search failed, using keywords only');
  }

  // FIX 2025-12-17: Experience boost - prioriser les outils qui ont fonctionné
  let recommendedToolNames = new Set();
  let taskType = 'tools';
  try {
    if (semanticRouter && skillLearner) {
      const routeResult = await semanticRouter.route(query);
      taskType = routeResult?.taskType || 'tools';
      const recommended = skillLearner.getRecommendedTools(taskType, 5);
      if (recommended && recommended.length > 0) {
        recommendedToolNames = new Set(recommended.map(r => r.toolName));
        console.log(`[ToolGroups] 📚 Experience boost (${taskType}): ${[...recommendedToolNames].join(', ')}`);
      }
    }
  } catch (expError) {
    // Silencieux: continuer sans boost
  }

  // 2025-12-18: ChromaDB PRIMAIRE - Keywords en fallback seulement
  // Concept: Ana n'a pas besoin de traîner tous ses outils, elle sait où les trouver
  const MIN_SEMANTIC_TOOLS = 3;  // Si ChromaDB trouve au moins 3 outils, pas besoin de keywords
  const MAX_TOOLS = 10;  // Réduit de 20 à 10 (économie tokens)

  const toolNamesSet = new Set();
  const boostedTools = [];
  const normalTools = [];

  // Experience boost en premier (outils qui ont déjà fonctionné)
  for (const tool of semanticResult.tools) {
    const name = tool.function?.name || tool.name;
    if (!toolNamesSet.has(name)) {
      toolNamesSet.add(name);
      if (recommendedToolNames.has(name)) boostedTools.push(tool);
      else normalTools.push(tool);
    }
  }

  // Keywords en FALLBACK seulement si ChromaDB n'a pas assez trouvé
  const semanticCount = boostedTools.length + normalTools.length;
  if (semanticCount < MIN_SEMANTIC_TOOLS) {
    console.log(`[ToolGroups] ChromaDB found only ${semanticCount} tools, adding keyword fallback...`);
    for (const tool of keywordResult.tools) {
      const name = tool.function?.name || tool.name;
      if (!toolNamesSet.has(name)) {
        toolNamesSet.add(name);
        if (recommendedToolNames.has(name)) boostedTools.push(tool);
        else normalTools.push(tool);
      }
    }
  }

  const combinedTools = [...boostedTools, ...normalTools];
  if (combinedTools.length > MAX_TOOLS) {
    console.log(`[ToolGroups] Limiting tools: ${combinedTools.length} → ${MAX_TOOLS}`);
    combinedTools.length = MAX_TOOLS;
  }
  console.log(`[ToolGroups] 🎯 ChromaDB-first: ${semanticResult.tools.length} sem + ${boostedTools.length} boost + ${keywordResult.tools.length} kw(fallback) = ${combinedTools.length} (max ${MAX_TOOLS})`);
  return {
    tools: combinedTools,
    groups: keywordResult.groups,
    semanticTools: semanticResult.toolNames,
    boostedTools: [...recommendedToolNames],
    taskType: taskType
  };
}

module.exports = {
  TOOL_GROUPS,
  GROUP_KEYWORDS,
  detectToolGroups,
  filterToolsByGroups,
  getRelevantTools,
  getRelevantToolsSemantic,
  getRelevantToolsHybrid
};
