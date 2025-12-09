// Patch to improve context instructions to force LLM to read and use them
const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched
if (content.includes('IMPORTANT: LIS ATTENTIVEMENT')) {
  console.log('ALREADY PATCHED: Force context read already present');
  process.exit(0);
}

// Find and replace the context instructions
const oldInstructions = `=== HISTORIQUE DES CONVERSATIONS (TU PEUX LIRE CES INFORMATIONS) ===
Tu as accès ci-dessous aux conversations récentes entre Alain et différentes IAs:
- ## Claude: = réponses de Claude Code
- ## Alain: = messages d'Alain
- ## Ana: = tes propres réponses précédentes

UTILISE ces informations pour répondre aux questions sur les conversations passées.`;

const newInstructions = `=== MÉMOIRE DE CONVERSATION ===
**IMPORTANT: LIS ATTENTIVEMENT L'HISTORIQUE CI-DESSOUS.**
Tu dois UTILISER ces informations pour répondre aux questions d'Alain.

FORMAT:
- ## Alain: = ce qu'Alain a dit
- ## Ana: = tes réponses précédentes (Ana = TOI)

Si Alain demande quelque chose qui est DANS cet historique, tu DOIS le trouver et répondre.
Par exemple: Si Alain a dit "Ma voiture c'est: Mitsubishi", tu SAIS que sa voiture est Mitsubishi.

HISTORIQUE:`;

if (!content.includes(oldInstructions)) {
  console.log('ERROR: Could not find old instructions');
  console.log('Looking for pattern...');

  // Try to find a variation
  if (content.includes('HISTORIQUE DES CONVERSATIONS')) {
    console.log('Found HISTORIQUE DES CONVERSATIONS - patching inline');
    content = content.replace(
      /=== HISTORIQUE DES CONVERSATIONS \(TU PEUX LIRE CES INFORMATIONS\) ===[^=]+UTILISE ces informations pour répondre aux questions sur les conversations passées\./s,
      newInstructions
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Patched with regex');
    process.exit(0);
  }

  console.log('ERROR: No matching pattern found');
  process.exit(1);
}

content = content.replace(oldInstructions, newInstructions);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Context instructions updated to force reading');
