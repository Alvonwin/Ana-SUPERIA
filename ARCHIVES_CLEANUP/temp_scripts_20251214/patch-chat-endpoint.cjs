const fs = require('fs');

const f = 'E:/ANA/server/ana-core.cjs';
let c = fs.readFileSync(f, 'utf8');

if (c.includes('// TOOLS routing - call ToolAgent directly')) {
  console.log('ALREADY PATCHED');
  process.exit(0);
}

// Find the pattern where we need to insert tools handling (with CRLF)
const oldCode = "// 3. Query LLM\r\n    globalDetector.setQuestion(message, 'chat_main'); // Enregistre la question pour analyser le type\r\n    let response = await router.query(model, fullPrompt, false);";

const newCode = `// 3. Query LLM (or ToolAgent)
    globalDetector.setQuestion(message, 'chat_main'); // Enregistre la question pour analyser le type

    let response;

    // TOOLS routing - call ToolAgent directly
    if (model === 'tools') {
      console.log('🛠 [TOOLS] Routing to ToolAgent for:', message.substring(0, 50));
      try {
        const toolResult = await toolAgent.runToolAgentV2(message, {
          sessionId: req.body.sessionId || 'chat_main',
          context: memoryContext
        });
        if (toolResult.success) {
          response = { response: toolResult.answer };
          console.log('✅ [TOOLS] ToolAgent succeeded');
        } else {
          console.log('⚠️ [TOOLS] ToolAgent failed, falling back to LLM');
          response = await router.query(LLMS.FRENCH, fullPrompt, false);
        }
      } catch (toolError) {
        console.error('❌ [TOOLS] ToolAgent error:', toolError.message);
        response = await router.query(LLMS.FRENCH, fullPrompt, false);
      }
    } else {
      response = await router.query(model, fullPrompt, false);
    }`.replace(/\n/g, '\r\n');

if (!c.includes(oldCode)) {
  console.log('ERROR: Pattern not found');
  process.exit(1);
}

c = c.replace(oldCode, newCode);
fs.writeFileSync(f, c, 'utf8');
console.log('PATCH APPLIED: ToolAgent routing in /api/chat');
