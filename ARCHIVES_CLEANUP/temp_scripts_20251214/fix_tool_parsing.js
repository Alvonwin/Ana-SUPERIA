/**
 * Fix: Ajouter parsing du format GLM-4 "tool_name\n{args}"
 * GLM-4 génère: "get_time\n{}" au lieu de {"name": "get_time", "arguments": {}}
 */
const fs = require('fs');

const file = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\r\n/g, '\n');

// Le code actuel de findToolCallJSON
const oldParser = `function findToolCallJSON(content) {
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

// Nouveau parser avec support du format GLM-4
const newParser = `/**
 * Parse tool calls from LLM response
 * Supports multiple formats:
 * 1. Standard: {"name": "tool", "arguments": {...}}
 * 2. GLM-4 format: "tool_name\\n{args}" or "tool_name\\n{}"
 * 3. Simple: "tool_name" alone (for tools without args)
 */
function findToolCallJSON(content) {
  const results = [];

  // Liste des noms d'outils valides (sera remplie dynamiquement)
  const validTools = TOOL_DEFINITIONS ? TOOL_DEFINITIONS.map(t => t.function.name) : [
    'web_search', 'get_weather', 'get_time', 'read_file', 'write_file',
    'list_files', 'run_shell', 'edit_file', 'grep', 'save_memory',
    'search_memory', 'ask_groq', 'ask_cerebras', 'execute_code',
    'http_request', 'json_parse', 'generate_image', 'describe_image',
    'research_topic', 'youtube_search', 'get_yt_transcript',
    'get_news', 'wikipedia_search', 'convert_units'
  ];

  // FORMAT 1: GLM-4 style "tool_name\\n{args}" ou "tool_name\\n{}"
  for (const toolName of validTools) {
    // Pattern: tool_name suivi de newline et JSON
    const glm4Pattern = new RegExp(toolName + '\\\\s*\\n\\\\s*(\\\\{[^}]*\\\\})', 'g');
    let match;
    while ((match = glm4Pattern.exec(content)) !== null) {
      try {
        const args = JSON.parse(match[1]);
        results.push(JSON.stringify({ name: toolName, arguments: args }));
        console.log(\`🔍 [Parser] GLM-4 format detected: \${toolName}\`);
      } catch (e) {
        // Args invalides, essayer avec {}
        results.push(JSON.stringify({ name: toolName, arguments: {} }));
        console.log(\`🔍 [Parser] GLM-4 format (empty args): \${toolName}\`);
      }
    }

    // Pattern: tool_name seul sur une ligne (pour outils sans args)
    const soloPattern = new RegExp('^\\\\s*' + toolName + '\\\\s*$', 'gm');
    while ((match = soloPattern.exec(content)) !== null) {
      results.push(JSON.stringify({ name: toolName, arguments: {} }));
      console.log(\`🔍 [Parser] Solo tool name detected: \${toolName}\`);
    }
  }

  // FORMAT 2: Standard JSON {"name": "tool", "arguments": {...}}
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
          // Éviter les doublons
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

if (content.includes(oldParser)) {
  content = content.replace(oldParser, newParser);
  fs.writeFileSync(file, content, 'utf8');
  console.log('[PARSER] ✅ Updated findToolCallJSON with GLM-4 format support');
} else {
  console.log('[PARSER] ❌ Pattern not found - checking if already updated...');
  if (content.includes('GLM-4 format detected')) {
    console.log('[PARSER] Already updated!');
  } else {
    console.log('[PARSER] Manual update needed');
  }
}
