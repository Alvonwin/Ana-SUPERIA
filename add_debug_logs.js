const fs = require('fs');
const file = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(file, 'utf8');

const searchPattern = `  // FIX 2025-12-15: Injection du contexte de conversation
  const contextMessages = [];

  // System prompt principal
  contextMessages.push({ role: 'system', content: systemPrompt });

  // Contexte de conversation (mémoire court/moyen terme)
  if (options.context) {`;

const replacement = `  // FIX 2025-12-15: Injection du contexte de conversation
  const contextMessages = [];

  // System prompt principal
  contextMessages.push({ role: 'system', content: systemPrompt });

  // DEBUG: Voir si contexte existe
  console.log(\`[DEBUG] options.context exists: \${!!options.context}, length: \${options.context ? options.context.length : 0}\`);
  if (options.context) {
    console.log(\`[DEBUG] Context preview: \${options.context.substring(0, 200)}...\`);
  }

  // Contexte de conversation (mémoire court/moyen terme)
  if (options.context) {
    console.log('[DEBUG] Context WILL BE INJECTED into messages');`;

if (content.includes(searchPattern)) {
  content = content.replace(searchPattern, replacement);

  // Ajouter aussi un log après l'injection
  content = content.replace(
    `    });
  }

  // Message utilisateur actuel`,
    `    });
    console.log('[DEBUG] Context injected successfully');
  } else {
    console.log('[DEBUG] NO CONTEXT - options.context is empty or undefined');
  }

  // Message utilisateur actuel`
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ Debug logs ajoutés');
} else {
  console.log('✗ Pattern non trouvé - déjà modifié?');
}
