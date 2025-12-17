const fs = require('fs');

const filePath = 'E:/ANA/ana-interface/src/components/VoiceInput.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Verifier si deja patche
if (content.includes('correctSpelling')) {
  console.log('SKIP: Deja patche');
  process.exit(0);
}

// 1. Ajouter import apres VoiceInput.css
content = content.replace(
  "import './VoiceInput.css';",
  `import './VoiceInput.css';
import { BACKEND_URL } from '../config.js';

// Correction orthographique via backend (Anna -> Ana, etc.)
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
        console.log('Correction:', text, '->', data.corrected);
      }
      return data.corrected;
    }
  } catch (e) {
    console.warn('Spell check failed:', e.message);
  }
  return text;
}`
);
console.log('OK: Import et fonction ajoutes');

// 2. Modifier onresult pour etre async et utiliser correctSpelling
content = content.replace(
  'recognition.onresult = (event) => {',
  'recognition.onresult = async (event) => {'
);
console.log('OK: onresult -> async');

// 3. Modifier la ligne transcript pour utiliser correction
content = content.replace(
  "const transcript = event.results[0][0].transcript;",
  `const rawTranscript = event.results[0][0].transcript;
        const transcript = await correctSpelling(rawTranscript);`
);
console.log('OK: transcript avec correction');

// Sauvegarder
fs.writeFileSync(filePath, content, 'utf8');
console.log('DONE: VoiceInput.jsx patche avec succes');
