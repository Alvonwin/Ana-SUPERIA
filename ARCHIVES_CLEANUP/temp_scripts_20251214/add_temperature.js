/**
 * Ajouter température 0.15 et num_ctx 32768 pour tool calling fiable
 */
const fs = require('fs');

const file = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\r\n/g, '\n');

const old = `        options: {
          repeat_penalty: 1.2,      // Pénalise les répétitions (best practice anti-loop)
          frequency_penalty: 0.5,    // Réduit les mots fréquemment utilisés
          presence_penalty: 0.3      // Encourage la diversité
        }`;

const replacement = `        options: {
          temperature: 0.15,         // Tool calling précis (recommandé 2025)
          num_ctx: 32768,            // Grand contexte pour code
          repeat_penalty: 1.2,       // Pénalise les répétitions
          frequency_penalty: 0.5,    // Réduit les mots fréquents
          presence_penalty: 0.3      // Encourage la diversité
        }`;

if (content.includes(old)) {
  content = content.replace(old, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('[OPTIONS] Added temperature: 0.15, num_ctx: 32768');
} else {
  console.log('[OPTIONS] Pattern not found');
}
