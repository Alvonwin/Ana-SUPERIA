const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';

// Backup first
const backup = path + '.backup_' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '_parser_fix';
fs.copyFileSync(path, backup);
console.log('Backup:', backup);

let content = fs.readFileSync(path, 'utf8');

const oldFunc = `/**
 * FIX 2025-12-03: Extraction robuste de JSON tool calls
 * L'ancienne regex ne gérait pas les objets vides {} dans arguments
 * Cette méthode compte les parenthèses pour trouver les blocs JSON valides
 */
function findToolCallJSON(content) {
  const results = [];
  let startIdx = 0;

  // Trouver toutes les positions de '{' et essayer de parser
  while ((startIdx = content.indexOf('{', startIdx)) !== -1) {
    // Trouver le '}' correspondant en comptant la profondeur
    let depth = 0;
    let endIdx = startIdx;

    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }

    if (depth === 0 && endIdx > startIdx) {
      const candidate = content.substring(startIdx, endIdx + 1);
      try {
        const parsed = JSON.parse(candidate);
        // Vérifier que c'est un tool call valide
        if (parsed.name && typeof parsed.arguments !== 'undefined') {
          results.push(candidate);
        }
      } catch (e) {
        // Pas du JSON valide, continuer
      }
    }
    startIdx++;
  }

  return results;
}`;

const newFunc = `/**
 * FIX 2025-12-08: Parse tool calls - supports multiple LLM formats
 * - Standard JSON: {"name": "tool", "arguments": {...}}
 * - GLM-4 format: "tool_name\\n{}" or "tool_name\\n{args}"
 * - Tool name alone: "get_time" (for no-arg tools)
 */
function findToolCallJSON(content) {
  const results = [];

  // Liste des outils valides
  const validToolNames = [
    'web_search', 'get_weather', 'get_time', 'read_file', 'write_file',
    'list_files', 'run_shell', 'edit_file', 'grep', 'save_memory',
    'search_memory', 'ask_groq', 'ask_cerebras', 'execute_code',
    'http_request', 'json_parse', 'generate_image', 'describe_image',
    'research_topic', 'youtube_search', 'get_yt_transcript',
    'get_news', 'wikipedia_search', 'convert_units'
  ];

  // FORMAT 1: GLM-4 style "tool_name\\n{args}"
  for (const toolName of validToolNames) {
    // Pattern: tool_name suivi de newline et JSON object
    const glm4Regex = new RegExp(toolName + '\\\\s*\\\\n\\\\s*(\\\\{[\\\\s\\\\S]*?\\\\})', 'g');
    let match;
    while ((match = glm4Regex.exec(content)) !== null) {
      try {
        const args = JSON.parse(match[1]);
        const toolCall = JSON.stringify({ name: toolName, arguments: args });
        if (!results.includes(toolCall)) {
          results.push(toolCall);
          console.log(\`[Parser] GLM-4 format: \${toolName}\`);
        }
      } catch (e) {
        const toolCall = JSON.stringify({ name: toolName, arguments: {} });
        if (!results.includes(toolCall)) {
          results.push(toolCall);
          console.log(\`[Parser] GLM-4 format (empty): \${toolName}\`);
        }
      }
    }

    // Pattern: tool_name seul (pas suivi de JSON)
    const soloRegex = new RegExp('(?:^|\\\\n)\\\\s*' + toolName + '\\\\s*(?:\\\\n|$)', 'g');
    while ((match = soloRegex.exec(content)) !== null) {
      const toolCall = JSON.stringify({ name: toolName, arguments: {} });
      if (!results.includes(toolCall)) {
        results.push(toolCall);
        console.log(\`[Parser] Solo tool: \${toolName}\`);
      }
    }
  }

  // FORMAT 2: Standard JSON {"name": "...", "arguments": {...}}
  let startIdx = 0;
  while ((startIdx = content.indexOf('{', startIdx)) !== -1) {
    let depth = 0;
    let endIdx = startIdx;

    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }

    if (depth === 0 && endIdx > startIdx) {
      const candidate = content.substring(startIdx, endIdx + 1);
      try {
        const parsed = JSON.parse(candidate);
        if (parsed.name && typeof parsed.arguments !== 'undefined') {
          if (!results.includes(candidate)) {
            results.push(candidate);
          }
        }
      } catch (e) {
        // Pas du JSON valide
      }
    }
    startIdx++;
  }

  return results;
}`;

// Normaliser les line endings
content = content.replace(/\r\n/g, '\n');
const normalizedOld = oldFunc.replace(/\r\n/g, '\n');

if (content.includes(normalizedOld)) {
  content = content.replace(normalizedOld, newFunc);
  fs.writeFileSync(path, content, 'utf8');
  console.log('SUCCESS: Parser updated with GLM-4 support');
} else {
  console.log('ERROR: Old function not found - may already be updated');
  // Check if already updated
  if (content.includes('GLM-4 format')) {
    console.log('Already updated!');
  }
}
