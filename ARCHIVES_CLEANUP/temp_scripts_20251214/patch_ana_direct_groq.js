// Patch ana-direct.cjs pour utiliser Groq directement pour conversations simples
const fs = require('fs');
const path = 'E:/ANA/server/intelligence/ana-direct.cjs';

let content = fs.readFileSync(path, 'utf8');

// Ajouter import de Groq après les autres requires
const oldRequire = "const toolAgent = require('../agents/tool-agent.cjs');";
const newRequire = `const toolAgent = require('../agents/tool-agent.cjs');
const groqService = require('../services/groq-service.cjs');

// Messages simples qui n'ont pas besoin de tools
const SIMPLE_PATTERNS = [
  /^(bonjour|bonsoir|salut|coucou|hey|hello|hi)/i,
  /^(comment (vas|va|ça va|ca va))/i,
  /^(qui es[- ]?tu)/i,
  /^(merci|thanks)/i,
  /^(ok|d'accord|parfait|super)/i,
  /^(au revoir|bye|à bientôt|a bientot)/i
];

function isSimpleMessage(msg) {
  const trimmed = msg.trim();
  return SIMPLE_PATTERNS.some(p => p.test(trimmed)) || trimmed.length < 30;
}`;

content = content.replace(oldRequire, newRequire);

// Modifier processDirectly pour router vers Groq si message simple
const oldProcess = `async function processDirectly(message, options = {}) {
  console.log('[ANA-DIRECT] ═══════════════════════════════════════');
  console.log('[ANA-DIRECT] Traitement DIRECT (1 appel LLM)');
  console.log('[ANA-DIRECT] Message:', message.substring(0, 80));

  const startTime = Date.now();

  try {
    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 1: Appel DIRECT à Ana-superia-v6 (DeepSeek R1 8B) via tool-agent
    // ══════════════════════════════════════════════════════════════
    console.log('[ANA-DIRECT] Appel ana-superia-v6...');

    const result = await toolAgent.runToolAgentV2(message, {
      model: 'ana-superia-v6',
      sessionId: options.sessionId || 'chat_direct',
      context: options.memoryContext || '',
      timeoutMs: 120000  // 2 minutes max
    });`;

const newProcess = `async function processDirectly(message, options = {}) {
  console.log('[ANA-DIRECT] ═══════════════════════════════════════');
  console.log('[ANA-DIRECT] Traitement DIRECT');
  console.log('[ANA-DIRECT] Message:', message.substring(0, 80));

  const startTime = Date.now();

  try {
    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 0: Messages simples → Groq directement (pas besoin de tools)
    // ══════════════════════════════════════════════════════════════
    if (isSimpleMessage(message)) {
      console.log('[ANA-DIRECT] Message simple détecté → Groq direct');
      groqService.initialize();
      const groqResult = await groqService.chat(message, {
        conversationHistory: options.memoryContext ? [{ role: 'system', content: options.memoryContext }] : []
      });

      if (groqResult.success) {
        const duration = Date.now() - startTime;
        console.log('[ANA-DIRECT] Groq réponse en ' + duration + 'ms');
        return {
          success: true,
          response: cleanAsterisks(groqResult.response),
          model: 'groq-llama-3.3-70b',
          duration
        };
      }
      console.log('[ANA-DIRECT] Groq échec, fallback tool-agent');
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 1: Messages complexes → Tool-agent
    // ══════════════════════════════════════════════════════════════
    console.log('[ANA-DIRECT] Message complexe → tool-agent');

    const result = await toolAgent.runToolAgentV2(message, {
      model: 'ana-superia-v6',
      sessionId: options.sessionId || 'chat_direct',
      context: options.memoryContext || '',
      timeoutMs: 120000
    });`;

content = content.replace(oldProcess, newProcess);

fs.writeFileSync(path, content, 'utf8');
console.log('✓ ana-direct.cjs patché - Groq pour messages simples');
