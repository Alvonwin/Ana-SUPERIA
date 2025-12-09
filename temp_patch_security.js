const fs = require('fs');
const path = 'E:/ANA/server/middleware/security.cjs';
let content = fs.readFileSync(path, 'utf-8');

if (content.includes('dangerousBackslashes')) {
  console.log('ALREADY PATCHED');
  process.exit(0);
}

// Remplacer le regex qui bloque tous les backslashes
// par deux regex séparés (solution Perplexity)
const oldRegex = /const shellMetaChars = \/\[;&\|`\$\(\)\{\}\[\]<>\\\\!\]\|&&\|\\|\\|\//;
const newCode = `// 1) Métacaractères shell dangereux (SANS backslash global - permet chemins Windows)
    const shellMetaChars = /[;&|\`$(){}\\[\\]<>!]|&&|\\|\\|/;

    // 2) Backslashes dangereux uniquement (séquences d'échappement)
    const dangerousBackslashes = /\\\\(?:n|r|t|b|f|v|0|x[0-9A-Fa-f]{2})/`;

// Remplacer l'ancien regex
content = content.replace(
  /const shellMetaChars = \/\[;&\|`\$\(\)\{\}\[\]<>\\\\!\]\|&&\|\\\\?\|\\\\?\|\//,
  newCode
);

// Remplacer le test
content = content.replace(
  'if (shellMetaChars.test(command)) {',
  'if (shellMetaChars.test(command) || dangerousBackslashes.test(command)) {'
);

fs.writeFileSync(path, content, 'utf-8');
console.log('SUCCESS: security.cjs patched with Perplexity solution');
