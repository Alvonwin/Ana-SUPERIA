const fs = require('fs');

const filePath = 'E:/ANA/ana-interface/src/components/VoiceInput.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Ajouter import et fonction correctSpelling
const importPattern = `import { useState, useRef } from 'react';
import './VoiceInput.css';

function VoiceInput`;

const importReplacement = `import { useState, useRef } from 'react';
import './VoiceInput.css';
import { BACKEND_URL } from '../config.js';

// Correction orthographique via backend (Anna -> Ana, fautes de frappe, etc.)
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
        console.log('Correction orthographique:', text, '->', data.corrected);
      }
      return data.corrected;
    }
  } catch (error) {
    console.warn('Spell check failed, using original:', error.message);
  }
  return text;
}

function VoiceInput`;

if (content.includes(importPattern) && !content.includes('correctSpelling')) {
  content = content.replace(importPattern, importReplacement);
  console.log('OK: Import et fonction correctSpelling ajoutes');
} else if (content.includes('correctSpelling')) {
  console.log('SKIP: correctSpelling deja present');
} else {
  console.log('ERROR: Pattern import non trouve');
}

// 2. Modifier onresult pour utiliser la correction async
const onresultPattern = `recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('\u{1F4DD} Transcription:', transcript);

        if (onTranscript) {
          onTranscript(transcript);
        }

        setStatus('\u2705 Transcription compl\u00E8te');

        // Auto-submit apr\u00E8s transcription avec le transcript en param\u00E8tre direct
        if (onAutoSubmit) {
          console.log('\u{1F680} Auto-submit d\u00E9clench\u00E9 avec:', transcript);
          setTimeout(() => {
            onAutoSubmit(transcript);
          }, 200);
        }
      };`;

const onresultReplacement = `recognition.onresult = async (event) => {
        const rawTranscript = event.results[0][0].transcript;
        console.log('\u{1F4DD} Transcription brute:', rawTranscript);

        // Correction orthographique (Anna -> Ana, etc.)
        setStatus('\u{1F524} Correction orthographique...');
        const transcript = await correctSpelling(rawTranscript);

        if (onTranscript) {
          onTranscript(transcript);
        }

        setStatus('\u2705 Transcription corrig\u00E9e');

        // Auto-submit apres transcription avec le transcript corrige
        if (onAutoSubmit) {
          console.log('\u{1F680} Auto-submit avec texte corrige:', transcript);
          setTimeout(() => {
            onAutoSubmit(transcript);
          }, 200);
        }
      };`;

if (content.includes(onresultPattern)) {
  content = content.replace(onresultPattern, onresultReplacement);
  console.log('OK: onresult modifie pour correction async');
} else if (content.includes('correctSpelling(rawTranscript)')) {
  console.log('SKIP: onresult deja modifie');
} else {
  console.log('ERROR: Pattern onresult non trouve - verification manuelle requise');
}

// Sauvegarder
fs.writeFileSync(filePath, content, 'utf8');
console.log('DONE: VoiceInput.jsx patche');
