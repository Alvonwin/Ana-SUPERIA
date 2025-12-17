// Patch script to improve context formatting for dual-context memory
// Ajoute des instructions claires pour que le LLM comprenne qu'il a accès au contexte
const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched
if (content.includes('HISTORIQUE DES CONVERSATIONS')) {
  console.log('ALREADY PATCHED: Context format instructions already present');
  process.exit(0);
}

// Find the fullPrompt construction and improve it
const oldFullPrompt = `const fullPrompt = memoryContext ? \`\${memoryContext}\\n\\nAlain: \${message}\` : message;`;

const newFullPrompt = `// Formatter le contexte avec des instructions claires pour le LLM
    const contextInstructions = memoryContext ? \`
=== HISTORIQUE DES CONVERSATIONS (TU PEUX LIRE CES INFORMATIONS) ===
Tu as accès ci-dessous aux conversations récentes entre Alain et différentes IAs:
- ## Claude: = réponses de Claude Code
- ## Alain: = messages d'Alain
- ## Ana: = tes propres réponses précédentes

UTILISE ces informations pour répondre aux questions sur les conversations passées.

\${memoryContext}
=== FIN DE L'HISTORIQUE ===

\` : '';
    const fullPrompt = contextInstructions + \`Alain: \${message}\`;`;

if (!content.includes(oldFullPrompt)) {
  console.log('ERROR: Could not find fullPrompt construction pattern');
  console.log('Looking for alternative pattern...');

  // Try with different quoting
  const altPattern = /const fullPrompt = memoryContext \? `\$\{memoryContext\}\\n\\nAlain: \$\{message\}` : message;/;
  if (altPattern.test(content)) {
    content = content.replace(altPattern, newFullPrompt);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Context formatting improved (alt pattern)');
    process.exit(0);
  }

  console.log('ERROR: No matching pattern found');
  process.exit(1);
}

content = content.replace(oldFullPrompt, newFullPrompt);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Context formatting improved with clear instructions');
