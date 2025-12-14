/**
 * LLM ORCHESTRATOR - Fallback system for tool calling
 * Created: 2025-12-08
 * Updated: 2025-12-10 - qwen3:8b + prompt renforce francais/concis
 */

const axios = require('axios');
const groqService = require('../services/groq-service.cjs');

const OLLAMA_URL = 'http://localhost:11434';

const ANA_SYSTEM_PROMPT = `Tu es Ana, l'assistante IA personnelle d'Alain.

RÈGLES ABSOLUES:
1. Tu réponds TOUJOURS en FRANÇAIS. Jamais en anglais.
2. Tu es CONCISE. Pas de longues analyses non demandées.
3. Quand on te demande une liste, tu donnes LA LISTE. Pas d'observations, pas de suggestions.
4. Tu ne dis JAMAIS que tu es Qwen, Llama ou un autre modèle. Tu es Ana.
5. Tu tutoies Alain (il est ton ami).

EXEMPLE - Si on demande "liste les fichiers":
BON: "Voici les fichiers: App.jsx, config.js, styles.css"
MAUVAIS: "Here's a breakdown of the key details... ### Key Observations..."

Sois naturelle, amicale, et CONCISE.`;

// 2025-12-14: GROQ EN PREMIER - Français parfait, rapide, pas de corruption
const LLM_CHAIN = [
  { name: 'groq', model: 'llama-3.3-70b-versatile', type: 'cloud' }, // PRINCIPAL Ana Groq 80-90%
  { name: 'ollama', model: 'qwen3:8b', type: 'local' },          // Fallback
  { name: 'ollama', model: 'ana-superia-v6', type: 'local' },     // Fallback local
  { name: 'ollama', model: 'llama3.1:8b', type: 'local' }        // Fallback final
];

async function callWithFallback(messages, tools, options = {}) {
  let lastError = null;

  // DEBUG: Voir combien de tools arrivent
  console.log(`[Orchestrator] Received ${tools ? tools.length : 0} tools, ${messages.length} messages`);
  console.log(`[Orchestrator] Has system prompt: ${messages.some(m => m.role === 'system')}`);


  for (const llm of LLM_CHAIN) {
    try {
      console.log('[Orchestrator] Trying ' + llm.name + '/' + llm.model + '...');

      if (llm.name === 'groq') {
        const result = await groqService.chatWithTools(messages, tools, {
          model: llm.model,
          temperature: 0.1,
          maxTokens: 4096
        });

        if (result.success) {
          console.log('[Orchestrator] SUCCESS with Groq');
          return {
            success: true,
            message: result.message,
            tool_calls: result.tool_calls,
            content: result.content,
            provider: 'groq',
            model: llm.model
          };
        }
        lastError = result.error;

      } else if (llm.name === 'ollama') {
        // IMPORTANT: Garder le systemPrompt original de tool-agent (contient les outils!)
        const hasSystemPrompt = messages.some(m => m.role === 'system');
        const ollamaMessages = hasSystemPrompt ? messages : [
          { role: 'system', content: ANA_SYSTEM_PROMPT },
          ...messages.filter(m => m.role !== 'system')
        ];
        const response = await axios.post(OLLAMA_URL + '/api/chat', {
          model: llm.model,
          messages: ollamaMessages,
          tools: tools,
          options: { temperature: 0, num_ctx: 4096, num_predict: 512 },
          keep_alive: -1,
          stream: false
        }, { timeout: 120000 });

        const msg = response.data.message || response.data;

        console.log('[DEBUG] RAW Ollama Response:', {
          model: llm.model,
          has_tool_calls: !!(msg.tool_calls && msg.tool_calls.length > 0),
          content_preview: msg.content ? msg.content.substring(0, 200) : '',
          tool_calls_count: msg.tool_calls ? msg.tool_calls.length : 0
        });

        let tool_calls = msg.tool_calls || [];

        // FALLBACK PARSING (for models that put JSON in content)
        if (tool_calls.length === 0 && msg.content) {
          console.log('[Orchestrator] tool_calls empty, trying content parsing...');

          // FORMAT 1: {"name": "...", "arguments": {...}}
          const jsonMatch = msg.content.match(/\{\s*"name"\s*:\s*"(\w+)"\s*,\s*"arguments"\s*:\s*(\{[^}]*\})/);
          if (jsonMatch) {
            try {
              const toolName = jsonMatch[1];
              const args = JSON.parse(jsonMatch[2]);
              tool_calls = [{ function: { name: toolName, arguments: JSON.stringify(args) } }];
              console.log('[Orchestrator] Parsed JSON format: ' + toolName);
            } catch (e) {
              console.log('[Orchestrator] JSON parse failed');
            }
          }

          // FORMAT 2: tool_name("argument")
          if (tool_calls.length === 0) {
            const funcMatch = msg.content.match(/(\w+)\s*\(\s*["']([^"']+)["']\s*\)/);
            if (funcMatch) {
              const toolName = funcMatch[1];
              const argValue = funcMatch[2];
              let args = {};
              if (toolName === 'run_shell') args = { command: argValue };
              else if (toolName === 'read_file' || toolName === 'list_files') args = { path: argValue };
              else if (toolName === 'web_search') args = { query: argValue };
              else args = { input: argValue };
              tool_calls = [{ function: { name: toolName, arguments: JSON.stringify(args) } }];
              console.log('[Orchestrator] Parsed function format: ' + toolName);
            }
          }
        }

        console.log('[Orchestrator] SUCCESS with Ollama/' + llm.model);
        return {
          success: true,
          message: msg,
          tool_calls: tool_calls,
          content: msg.content || '',
          provider: 'ollama',
          model: llm.model
        };
      }

    } catch (error) {
      console.log('[Orchestrator] FAILED ' + llm.name + '/' + llm.model + ': ' + error.message);
      lastError = error.message;
      continue;
    }
  }

  return {
    success: false,
    error: 'All LLMs failed. Last error: ' + lastError,
    provider: null,
    model: null
  };
}

module.exports = { callWithFallback, LLM_CHAIN };
