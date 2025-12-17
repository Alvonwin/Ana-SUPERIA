const fs = require('fs');

const filePath = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(filePath, 'utf8');

const oldList = `  // Liste des outils valides
  const validToolNames = [
    'web_search', 'get_weather', 'get_time', 'read_file', 'write_file',
    'list_files', 'run_shell', 'edit_file', 'grep', 'save_memory',
    'search_memory', 'ask_groq', 'ask_cerebras', 'execute_code',
    'http_request', 'json_parse', 'generate_image', 'describe_image',
    'research_topic', 'youtube_search', 'get_yt_transcript',
    'get_news', 'wikipedia_search', 'convert_units',
    'generate_animation', 'generate_video', 'image_to_image', 'inpaint_image', 'debug_screenshot', 'analyze_code_screenshot', 'execute_voice_command', 'ask_architect', 'review_code'
  ];`;

// Liste complète des 181 outils
const newList = `  // Liste des outils valides - TOUS LES 181 OUTILS (FIX 2025-12-13)
  const validToolNames = [
    // WEB (11)
    'web_search', 'get_weather', 'get_time', 'web_fetch', 'wikipedia', 'http_request', 'check_url', 'get_public_ip', 'dns_lookup', 'whois', 'ping',
    // FILES (25)
    'read_file', 'write_file', 'edit_file', 'list_files', 'glob', 'grep', 'search_in_file', 'read_file_chunk', 'file_info', 'copy_file', 'move_file', 'delete_file', 'create_directory', 'get_file_stats', 'compare_files', 'find_files', 'tree_view', 'create_backup', 'search_replace_in_file', 'count_lines', 'count_words', 'head_file', 'tail_file', 'append_to_file', 'prepend_to_file',
    // SYSTEM (15)
    'get_system_info', 'get_cpu_usage', 'get_memory_usage', 'get_disk_usage', 'list_processes', 'kill_process', 'kill_process_by_name', 'get_environment_variable', 'set_environment_variable', 'get_network_interfaces', 'open_application', 'open_url_in_browser', 'run_shell', 'run_background', 'take_screenshot',
    // GIT (12)
    'git_status', 'git_commit', 'git_log', 'git_branch', 'git_diff', 'git_stash', 'git_pull', 'git_push', 'git_clone', 'git_checkout', 'git_merge', 'git_reset',
    // DOCKER (6)
    'docker_ps', 'docker_images', 'docker_logs', 'docker_exec', 'docker_start', 'docker_stop',
    // OLLAMA (4)
    'ollama_list', 'ollama_pull', 'ollama_delete', 'ollama_chat',
    // IMAGE (13)
    'generate_image', 'generate_animation', 'generate_video', 'image_to_image', 'inpaint_image', 'describe_image', 'debug_screenshot', 'analyze_code_screenshot', 'resize_image', 'convert_image', 'get_image_info', 'crop_image', 'rotate_image',
    // CONVERSION (11)
    'json_to_csv', 'csv_to_json', 'xml_to_json', 'json_to_xml', 'yaml_to_json', 'json_to_yaml', 'parse_html', 'markdown_to_html', 'html_to_markdown', 'format_json', 'minify_json',
    // CRYPTO (8)
    'hash_file', 'hash_text', 'generate_uuid', 'generate_password', 'encrypt_text', 'decrypt_text', 'base64_encode', 'base64_decode',
    // NPM (6)
    'npm_list', 'npm_outdated', 'npm_run', 'npm_search', 'npm_info', 'install_npm_package',
    // ARCHIVE (6)
    'create_zip', 'extract_zip', 'list_archive', 'compress_gzip', 'decompress_gzip', 'download_file',
    // DATE/MATH (9)
    'format_date', 'date_diff', 'add_to_date', 'timestamp_to_date', 'date_to_timestamp', 'calculate', 'convert_units', 'random_number', 'statistics',
    // AUDIO (3)
    'get_audio_info', 'text_to_speech', 'play_audio',
    // BROWSER (12)
    'browser_open', 'browser_screenshot', 'browser_pdf', 'browser_click', 'browser_type', 'browser_evaluate', 'browser_extract', 'dom_query', 'dom_get_element_by_id', 'dom_get_elements_by_class', 'dom_get_elements_by_tag', 'dom_modify',
    // DATABASE (3)
    'sqlite_query', 'sqlite_tables', 'sqlite_schema',
    // MEMORY (2)
    'search_memory', 'save_memory',
    // CODE (11)
    'execute_code', 'create_react_component', 'add_route', 'add_api_endpoint', 'analyze_component', 'hot_reload_check', 'validate_jsx_syntax', 'list_available_icons', 'get_css_variables', 'search_codebase', 'get_project_structure',
    // AGENTS (5)
    'ask_groq', 'ask_cerebras', 'launch_agent', 'ask_architect', 'review_code',
    // VALIDATION (4)
    'test_regex', 'validate_json', 'validate_email', 'validate_url',
    // UTILS (11)
    'ask_user', 'todo_write', 'notebook_edit', 'plan_mode', 'send_notification', 'clipboard_read', 'clipboard_write', 'set_reminder', 'list_reminders', 'cancel_reminder', 'execute_voice_command',
    // YOUTUBE (3)
    'youtube_search', 'get_yt_transcript', 'get_news'
  ];`;

if (content.includes('TOUS LES 181 OUTILS')) {
  console.log('SKIP: Already patched');
} else if (content.includes(oldList)) {
  content = content.replace(oldList, newList);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Added all 181 tools to validToolNames!');
} else {
  console.log('ERROR: Old list not found');
}
