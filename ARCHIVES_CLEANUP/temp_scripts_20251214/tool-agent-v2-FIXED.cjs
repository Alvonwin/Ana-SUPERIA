/**
 * Tool Agent - Agent avec Tool Calling pour Ana
 * FIX 2025-12-05: DIR fiable, System prompt amélioré
 */

const axios = require('axios');
const WebTools = require('../tools/web-tools.cjs');
const FileTools = require('../tools/file-tools.cjs');
const BashTools = require('../tools/bash-tools.cjs');

const OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen2.5-coder:7b';

function findToolCallJSON(content) {
  const results = [];
  let startIdx = 0;
  while ((startIdx = content.indexOf('{', startIdx)) !== -1) {
    let depth = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }
    if (depth === 0 && endIdx > startIdx) {
      const candidate = content.substring(startIdx, endIdx + 1);
      try {
        const parsed = JSON.parse(candidate);
        if (parsed.name && typeof parsed.arguments !== 'undefined') {
          results.push(candidate);
        }
      } catch (e) {}
    }
    startIdx++;
  }
  return results;
}

// TOOL_DEFINITIONS - meme contenu que original
const TOOL_DEFINITIONS = [
  { type: 'function', function: { name: 'web_search', description: 'Recherche web', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'get_weather', description: 'Meteo', parameters: { type: 'object', properties: { location: { type: 'string' } }, required: ['location'] } } },
  { type: 'function', function: { name: 'get_time', description: 'Heure', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'list_files', description: 'Lister fichiers', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'run_shell', description: 'Commande shell', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } } },
  { type: 'function', function: { name: 'ask_groq', description: 'Demander a Groq', parameters: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] } } },
  { type: 'function', function: { name: 'ask_cerebras', description: 'Demander a Cerebras', parameters: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] } } }
];

const TOOL_IMPLEMENTATIONS = {
  async run_shell(args) {
    const { command, timeout } = args;
    console.log('[ToolAgent] run_shell:', command);
    // FIX: dir utilise fs.readdir
    const dirMatch = command.match(/^dir\s+(.+)$/i);
    if (dirMatch) {
      const dirPath = dirMatch[1].replace(/["']/g, '').replace(/\//g, '\\').trim();
      console.log('[ToolAgent] Redirection dir -> FileTools.list');
      const res = await FileTools.list(dirPath, { recursive: false, details: true });
      if (res.success) {
        const output = res.entries.map(e => e.name).join('\n');
        return { success: true, stdout: output, count: res.count };
      }
      return res;
    }
    return await BashTools.execute(command, { timeout: timeout || 10000 });
  }
};

console.log('tool-agent-v2-FIXED loaded - DIR fix applied');
module.exports = { TOOL_DEFINITIONS, TOOL_IMPLEMENTATIONS };
