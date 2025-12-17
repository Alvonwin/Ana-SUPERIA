const fs = require('fs');
const path = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `      'requête http', 'http get', 'http post', 'httpbin', 'transcris', 'transcription', 'sous-titres'
    ];`;

const newCode = `      'requête http', 'http get', 'http post', 'httpbin', 'transcris', 'transcription', 'sous-titres',
      // Mémoire - DOIT passer par tools pour save_memory/search_memory
      'retiens', 'mémorise', 'memorise', 'sauvegarde', 'note ceci', 'enregistre ceci', 'noublie pas',
      'rappelle-toi de', 'souviens-toi de'
    ];`;

if (content.includes("'transcris', 'transcription', 'sous-titres'\n    ];")) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(path, content);
  console.log('Keywords mémoire ajoutés au routing tools');
} else {
  console.log('Code non trouvé ou déjà modifié');
}
