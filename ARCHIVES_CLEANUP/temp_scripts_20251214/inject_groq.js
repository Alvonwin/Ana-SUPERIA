// Inject Groq bypass for simple messages
const fs = require('fs');
const path = 'E:/ANA/server/intelligence/ana-direct.cjs';

let content = fs.readFileSync(path, 'utf8');

// Injection point: after "try {"
const injection = `
    // ══ GROQ BYPASS pour messages simples ══
    if (isSimpleMessage(message)) {
      console.log('[ANA-DIRECT] Simple → Groq');
      const groqSvc = require('../services/groq-service.cjs');
      groqSvc.initialize();
      const gr = await groqSvc.chat(message);
      if (gr.success) {
        console.log('[ANA-DIRECT] Groq OK');
        return { success: true, response: cleanAsterisks(gr.response), model: 'groq', duration: Date.now() - startTime };
      }
    }
    // ══ FIN GROQ BYPASS ══

`;

// Find the try block and inject after it
content = content.replace(
  /(try \{[\r\n]+)(\s*\/\/ ═+[\r\n]+\s*\/\/ ÉTAPE 1)/,
  '$1' + injection + '$2'
);

fs.writeFileSync(path, content, 'utf8');
console.log('✓ Groq bypass injecté');

// Verify
const check = fs.readFileSync(path, 'utf8');
if (check.includes('GROQ BYPASS')) {
  console.log('✓ Vérification OK');
} else {
  console.log('✗ Injection échouée');
}
