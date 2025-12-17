const fs = require('fs');

const file = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(file, 'utf8');

// Pattern à rechercher (dans runToolAgentV2)
const searchPattern = `GESTION INTELLIGENTE DE MA MÉMOIRE (Self-Editing):
- memory_update: Si une info change (Alain change de voiture, nouvelle adresse) → mettre à jour
- memory_forget: Si une info est obsolète ou incorrecte → proposer d'oublier (demande permission)
- memory_reflect: Pour analyser ce que je sais, trouver patterns et contradictions
- memory_link: Créer des relations entre concepts (Alain --aime--> jeux)
- memory_query_graph: Interroger mes relations pour faire des connexions\`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  console.log(\`🤖 [ToolAgentV2] Démarrage - Message: "\${userMessage.substring(0, 50)}..."\`);`;

// Remplacement avec injection du contexte
const replacement = `GESTION INTELLIGENTE DE MA MÉMOIRE (Self-Editing):
- memory_update: Si une info change (Alain change de voiture, nouvelle adresse) → mettre à jour
- memory_forget: Si une info est obsolète ou incorrecte → proposer d'oublier (demande permission)
- memory_reflect: Pour analyser ce que je sais, trouver patterns et contradictions
- memory_link: Créer des relations entre concepts (Alain --aime--> jeux)
- memory_query_graph: Interroger mes relations pour faire des connexions\`;

  // FIX 2025-12-15: Injection du contexte de conversation
  const contextMessages = [];

  // System prompt principal
  contextMessages.push({ role: 'system', content: systemPrompt });

  // Contexte de conversation (mémoire court/moyen terme)
  if (options.context) {
    contextMessages.push({
      role: 'system',
      content: \`[CONTEXTE DE CONVERSATION]\\n\${options.context}\\n[FIN CONTEXTE]\`
    });
  }

  // Message utilisateur actuel
  contextMessages.push({ role: 'user', content: userMessage });

  const messages = contextMessages;

  console.log(\`🤖 [ToolAgentV2] Démarrage - Message: "\${userMessage.substring(0, 50)}..."\`);`;

if (content.includes(searchPattern)) {
  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ Contexte de conversation injecté dans tool-agent.cjs');
} else {
  console.log('✗ Pattern non trouvé - Vérifier si déjà appliqué');
}
