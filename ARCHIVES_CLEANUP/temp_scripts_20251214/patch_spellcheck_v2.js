const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Pattern actuel
const oldPattern = `// Corrections forcées spécifiques (reconnaissance vocale)
    let corrected = text;

    // Anna → Ana (nom propre, forcer)
    corrected = corrected.replace(/\\bAnna\\b/gi, 'Ana');

    // Appliquer le spell checker français
    corrected = spellChecker.correctText(corrected);`;

// Nouveau code avec majuscule et point
const newPattern = `// Corrections forcées spécifiques (reconnaissance vocale)
    let corrected = text.trim();

    // Anna → Ana (nom propre, forcer)
    corrected = corrected.replace(/\\bAnna\\b/gi, 'Ana');

    // Appliquer le spell checker français
    corrected = spellChecker.correctText(corrected);

    // Majuscule en début de phrase
    if (corrected.length > 0) {
      corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    }

    // Point à la fin si pas de ponctuation finale
    if (corrected.length > 0 && !/[.!?]$/.test(corrected)) {
      corrected = corrected + '.';
    }`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('OK: Majuscule + point ajoutes au spellcheck');
} else if (content.includes('Majuscule en début de phrase')) {
  console.log('SKIP: Deja patche');
} else {
  console.log('ERROR: Pattern non trouve');
  // Debug
  console.log('Recherche du pattern Anna...');
  if (content.includes('Anna → Ana')) {
    console.log('Found: Anna → Ana');
  }
}
