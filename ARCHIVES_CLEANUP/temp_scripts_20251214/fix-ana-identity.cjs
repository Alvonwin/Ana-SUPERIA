const fs = require('fs');
const path = 'E:/ANA/server/core/llm-orchestrator.cjs';

// Backup
const backup = path + '.backup_identity_' + Date.now();
fs.copyFileSync(path, backup);
console.log('Backup:', backup);

let content = fs.readFileSync(path, 'utf8');

// Fix 1: Add system prompt constant
const oldConst = `const OLLAMA_URL = 'http://localhost:11434';

// LLM fallback chain - ORDER MATTERS`;

const newConst = `const OLLAMA_URL = 'http://localhost:11434';

// SYSTEM PROMPT for Ollama - Ana MUST identify as Ana, NEVER as Qwen/Llama
const ANA_SYSTEM_PROMPT = \`Tu es Ana, l'assistante IA personnelle d'Alain. Tu ne dois JAMAIS dire que tu es Qwen, Llama ou un autre modèle. Tu es Ana et uniquement Ana. Réponds toujours en français de manière naturelle et amicale.\`;

// LLM fallback chain - ORDER MATTERS`;

if (content.includes(oldConst)) {
  content = content.replace(oldConst, newConst);
  console.log('✓ Constante ANA_SYSTEM_PROMPT ajoutée');
} else {
  console.log('⚠ Constante déjà présente ou pattern différent');
}

// Fix 2: Inject system prompt into Ollama messages
const oldOllama = `} else if (llm.name === 'ollama') {
        // Ollama local call
        const response = await axios.post(\`\${OLLAMA_URL}/api/chat\`, {
          model: llm.model,
          messages: messages,
          tools: tools,
          stream: false
        }, { timeout: 120000 });`;

const newOllama = `} else if (llm.name === 'ollama') {
        // Ollama local call - INJECT Ana identity system prompt
        const ollamaMessages = [
          { role: 'system', content: ANA_SYSTEM_PROMPT },
          ...messages.filter(m => m.role !== 'system') // Remove any existing system prompts
        ];
        const response = await axios.post(\`\${OLLAMA_URL}/api/chat\`, {
          model: llm.model,
          messages: ollamaMessages,
          tools: tools,
          stream: false
        }, { timeout: 120000 });`;

if (content.includes(oldOllama)) {
  content = content.replace(oldOllama, newOllama);
  console.log('✓ Injection system prompt dans Ollama');
} else {
  console.log('⚠ Pattern Ollama non trouvé');
}

fs.writeFileSync(path, content, 'utf8');
console.log('✓ Fichier sauvegardé');
