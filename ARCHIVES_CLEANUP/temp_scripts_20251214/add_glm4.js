/**
 * Ajouter GLM-4-32B à ana-core.cjs
 */
const fs = require('fs');

const file = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\r\n/g, '\n');

const old = `  // === FRENCH TUTOIEMENT MODEL (8 Dec 2025) ===
  FRENCH: 'ana-french-tutoiement'                  // French with forced tutoiement
};`;

const replacement = `  // === FRENCH TUTOIEMENT MODEL (8 Dec 2025) ===
  FRENCH: 'ana-french-tutoiement',                 // French with forced tutoiement
  // === GLM-4-32B - ANA CODE (8 Dec 2025) ===
  // Expert tool calling + coding - Parité Claude Code
  GLM4: 'mychen76/GLM-4-32B-cline-roocode:Q4'      // 32B, tool calling natif, coding expert
};`;

if (content.includes(old)) {
  content = content.replace(old, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('[CONFIG] GLM-4-32B added to LLMS');
} else {
  console.log('[CONFIG] Pattern not found');
  // Try alternative
  if (content.includes("FRENCH: 'ana-french-tutoiement'")) {
    console.log('Found FRENCH line, trying alternative...');
  }
}
