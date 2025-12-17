const fs = require('fs');

// 1. Ameliorer description outil dans tool-agent.cjs
const toolAgentPath = 'E:/ANA/server/agents/tool-agent.cjs';
let toolAgent = fs.readFileSync(toolAgentPath, 'utf8');

toolAgent = toolAgent.replace(
  "description: 'Determiner le signe astrologique a partir d une date de naissance.',",
  "description: 'Determiner le signe astrologique. UTILISE CET OUTIL si on te demande un signe astrologique et que tu connais la date de naissance de la personne. Parametre: day/month OU date.',"
);

fs.writeFileSync(toolAgentPath, toolAgent, 'utf8');
console.log('OK: Description outil amelioree');

// 2. Ajouter instruction dans Modelfile
const modelfilePath = 'E:/ANA/temp/Modelfile-v4-fixed';
let modelfile = fs.readFileSync(modelfilePath, 'utf8');

// Verifier si deja present
if (modelfile.includes('get_zodiac_sign')) {
  console.log('SKIP: Instruction zodiac deja dans Modelfile');
} else {
  // Ajouter apres "=== EXEMPLES ==="
  modelfile = modelfile.replace(
    '=== EXEMPLES ===',
    `=== REGLES OUTILS ===

SIGNE ASTROLOGIQUE: Si on te demande un signe astrologique et que tu CONNAIS la date de naissance, utilise IMMEDIATEMENT l'outil get_zodiac_sign avec cette date. Ne dis JAMAIS "je ne sais pas" si tu as la date!

=== EXEMPLES ===`
  );

  fs.writeFileSync(modelfilePath, modelfile, 'utf8');
  console.log('OK: Instruction ajoutee au Modelfile');
}

console.log('DONE: Les 2 ameliorations appliquees');
console.log('NOTE: Recreer le modele avec: ollama create ana-superia-v4 -f E:/ANA/temp/Modelfile-v4-fixed');
