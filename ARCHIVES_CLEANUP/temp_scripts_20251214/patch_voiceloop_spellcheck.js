const fs = require('fs');

const filePath = 'E:/ANA/ana-interface/src/components/VoiceLoopButton.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Verifier si deja patche
if (content.includes('correctSpelling')) {
  console.log('SKIP: Deja patche');
  process.exit(0);
}

// 1. Ajouter import BACKEND_URL apres les imports existants
content = content.replace(
  "import { IconMic, IconMicOff } from './Icons';",
  `import { IconMic, IconMicOff } from './Icons';
import { BACKEND_URL } from '../config.js';

// Correction orthographique via backend (Anna -> Ana, majuscule, point)
async function correctSpelling(text) {
  try {
    const response = await fetch(\`\${BACKEND_URL}/api/spellcheck\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    if (data.success && data.corrected) {
      if (data.changed) {
        console.log('Correction ortho:', text, '->', data.corrected);
      }
      return data.corrected;
    }
  } catch (e) {
    console.warn('Spell check failed:', e.message);
  }
  return text;
}`
);
console.log('OK: Import et fonction correctSpelling ajoutes');

// 2. Modifier l'appel onTranscript pour utiliser la correction
// Le handler doit devenir async
content = content.replace(
  "console.log('🎤 Transcript final:', trimmed);\n          onTranscript(trimmed);",
  `// Correction orthographique avant envoi
          const corrected = await correctSpelling(trimmed);
          console.log('🎤 Transcript final (corrigé):', corrected);
          onTranscript(corrected);`
);
console.log('OK: onTranscript avec correction');

// 3. Rendre le handler onresult async
content = content.replace(
  "recognition.onresult = (event) => {",
  "recognition.onresult = async (event) => {"
);
console.log('OK: onresult -> async');

// Sauvegarder
fs.writeFileSync(filePath, content, 'utf8');
console.log('DONE: VoiceLoopButton.jsx patche');
