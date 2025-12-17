const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(path, 'utf8');

// Modification 1: Premier appel axios (avec options repeat_penalty)
const oldCode1 = `      const response = await axios.post(\`\${OLLAMA_URL}/api/chat\`, {
        model: model,
        messages: messages,
        tools: TOOL_DEFINITIONS,
        stream: false,
        options: {
          repeat_penalty: 1.2,      // Pénalise les répétitions (best practice anti-loop)
          frequency_penalty: 0.5,    // Réduit les mots fréquemment utilisés
          presence_penalty: 0.3      // Encourage la diversité
        }
      });

      const msg = response.data.message || response.data;
      let toolCalls = msg.tool_calls || [];`;

const newCode1 = `      // Appel LLM via Orchestrateur avec fallback (Groq -> llama3.1 -> qwen3)
      const orchResult = await callWithFallback(messages, TOOL_DEFINITIONS);
      if (!orchResult.success) {
        throw new Error(orchResult.error || 'LLM orchestrator failed');
      }
      console.log(\`[ToolAgent] Provider: \${orchResult.provider}/\${orchResult.model}\`);

      const msg = orchResult.message;
      let toolCalls = orchResult.tool_calls || [];`;

if (content.includes('repeat_penalty: 1.2')) {
  content = content.replace(oldCode1, newCode1);
  console.log('Modification 1 appliquee');
} else {
  console.log('Modification 1: code non trouve ou deja modifie');
}

// Modification 2: Deuxieme appel axios (dans runToolAgentV2, sans options)
const oldCode2 = `      // Appel LLM
      const response = await axios.post(\`\${OLLAMA_URL}/api/chat\`, {
        model: model,
        messages: contextMessages,
        tools: TOOL_DEFINITIONS,
        stream: false
      });

      const msg = response.data.message || response.data;
      let toolCalls = msg.tool_calls || [];`;

const newCode2 = `      // Appel LLM via Orchestrateur avec fallback (Groq -> llama3.1 -> qwen3)
      const orchResult = await callWithFallback(contextMessages, TOOL_DEFINITIONS);
      if (!orchResult.success) {
        throw new Error(orchResult.error || 'LLM orchestrator failed');
      }
      console.log(\`[ToolAgent V2] Provider: \${orchResult.provider}/\${orchResult.model}\`);

      const msg = orchResult.message;
      let toolCalls = orchResult.tool_calls || [];`;

if (content.includes('messages: contextMessages,')) {
  content = content.replace(oldCode2, newCode2);
  console.log('Modification 2 appliquee');
} else {
  console.log('Modification 2: code non trouve ou deja modifie');
}

fs.writeFileSync(path, content);
console.log('Fichier sauvegarde');
