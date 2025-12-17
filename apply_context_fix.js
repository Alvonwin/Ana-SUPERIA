const fs = require('fs');

const file = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(file, 'utf8');

// Pattern à chercher (exactement comme dans le fichier)
const searchPattern = `  // FIX 2025-12-14: Envoyer les descriptions d'outils, pas juste les noms
  const toolDescriptions = TOOL_DEFINITIONS.map(t => \`- \${t.function.name}: \${t.function.description}\`).join('\\n');
  const systemPrompt = options.systemPrompt ||
    \`Tu es Ana, l'assistante IA personnelle d'Alain à Longueuil, Québec.`;

// Remplacement avec le contextPrefix ajouté
const replacement = `  // FIX 2025-12-14: Envoyer les descriptions d'outils, pas juste les noms
  const toolDescriptions = TOOL_DEFINITIONS.map(t => \`- \${t.function.name}: \${t.function.description}\`).join('\\n');

  // FIX 2025-12-15: Inclure contexte mémoire proactif dans systemPrompt
  const contextPrefix = options.context ? \`[CONTEXTE MÉMOIRE]\\n\${options.context}\\n\\n\` : '';

  const systemPrompt = options.systemPrompt || (contextPrefix +
    \`Tu es Ana, l'assistante IA personnelle d'Alain à Longueuil, Québec.`;

if (content.includes(searchPattern)) {
  content = content.replace(searchPattern, replacement);

  // Maintenant il faut fermer la parenthèse à la fin du template literal
  // Chercher la fin du systemPrompt (le `;` qui termine)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const systemPrompt = options.systemPrompt || (contextPrefix +')) {
      // Chercher le \`; qui termine le template
      for (let j = i + 1; j < lines.length && j < i + 100; j++) {
        if (lines[j].trim() === '\`;') {
          lines[j] = '\`);';
          content = lines.join('\n');
          break;
        }
      }
      break;
    }
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ Context proactif ajouté au systemPrompt');
} else {
  console.log('✗ Pattern de recherche non trouvé');
  console.log('Vérifier si le fix est déjà appliqué ou si le format a changé');
}
