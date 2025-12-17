const fs = require('fs');

const file = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Trouver runToolAgentV2
let inRunToolAgentV2 = false;
let systemPromptLineIndex = -1;
let endOfPromptLineIndex = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Détecter début de runToolAgentV2
  if (line.includes('async function runToolAgentV2(')) {
    inRunToolAgentV2 = true;
    console.log(`Trouvé runToolAgentV2 à la ligne ${i + 1}`);
    continue;
  }

  // Si on est dans runToolAgentV2
  if (inRunToolAgentV2) {
    // Trouver la ligne "const systemPrompt = options.systemPrompt ||"
    if (line.includes('const systemPrompt = options.systemPrompt ||') && systemPromptLineIndex === -1) {
      systemPromptLineIndex = i;
      console.log(`Trouvé systemPrompt à la ligne ${i + 1}`);

      // Insérer le contextPrefix AVANT cette ligne
      lines.splice(i, 0,
        '',
        '  // FIX 2025-12-15: Inclure contexte mémoire proactif',
        '  const contextPrefix = options.context ? `[CONTEXTE MÉMOIRE]\\n${options.context}\\n\\n` : \'\';',
        ''
      );

      // Modifier la ligne systemPrompt (maintenant décalée de 4 lignes)
      lines[i + 4] = '  const systemPrompt = options.systemPrompt || (contextPrefix +';

      // Chercher la fin du template literal dans cette fonction
      for (let j = i + 5; j < lines.length; j++) {
        // Détecter fin du template: ligne qui contient `;` seul ou après un backtick
        if (lines[j].trim() === '\`;' || lines[j].includes('- memory_query_graph: Interroger mes relations pour faire des connexions`;')) {
          endOfPromptLineIndex = j;
          console.log(`Trouvé fin du systemPrompt à la ligne ${j + 1}`);
          // Remplacer `; par `);
          lines[j] = lines[j].replace('`;', '`);');
          break;
        }

        // Si on rencontre une autre fonction, arrêter
        if (lines[j].includes('async function ') || lines[j].includes('function ')) {
          console.log('Autre fonction rencontrée, arrêt de la recherche');
          break;
        }
      }

      break; // On a terminé
    }
  }
}

if (systemPromptLineIndex !== -1 && endOfPromptLineIndex !== -1) {
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('✓ Context proactif ajouté au systemPrompt de runToolAgentV2');
} else {
  console.log('✗ Modification non effectuée');
  console.log(`systemPromptLineIndex: ${systemPromptLineIndex}, endOfPromptLineIndex: ${endOfPromptLineIndex}`);
}
