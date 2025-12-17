const fs = require('fs');
const path = 'E:/ANA/server/middleware/security.cjs';
let content = fs.readFileSync(path, 'utf-8');

if (content.includes('dangerousBackslashes')) {
  console.log('ALREADY PATCHED');
  process.exit(0);
}

// Solution Perplexity exacte:
// 1. Nouveau regex shellMetaChars SANS backslash
// 2. Nouveau regex dangerousBackslashes pour séquences d'échappement
// 3. Test combiné

const oldBlock = `    // FIX: Détecter caractères d'injection shell AVANT tout
    const shellMetaChars = /[;&|\`$(){}[\\]<>\\\\!]|&&|\\|\\|/;
    if (shellMetaChars.test(command)) {
      return {
        allowed: false,
        reason: 'SECURITY: Caractères shell dangereux détectés (;, &, |, \`, $, etc.)'
      };
    }`;

const newBlock = `    // FIX: Détecter caractères d'injection shell AVANT tout
    // 1) Métacaractères shell dangereux (SANS backslash global - permet chemins Windows)
    const shellMetaChars = /[;&|\`$(){}[\\]<>!]|&&|\\|\\|/;

    // 2) Backslashes dangereux uniquement (séquences d'échappement)
    const dangerousBackslashes = /\\\\(?:n|r|t|b|f|v|0|x[0-9A-Fa-f]{2})/;

    if (shellMetaChars.test(command) || dangerousBackslashes.test(command)) {
      return {
        allowed: false,
        reason: 'SECURITY: Caractères shell dangereux détectés (;, &, |, \`, $, etc.)'
      };
    }`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(path, content, 'utf-8');
  console.log('SUCCESS: security.cjs patched correctly');
} else {
  console.log('ERROR: Could not find old block to replace');
  console.log('Trying alternative...');

  // Alternative: remplacer ligne par ligne
  content = content.replace(
    /const shellMetaChars = \/\[;&\|`\$\(\)\{\}\[\\\]<>\\\\!\]\|&&\|\\|\\|\//,
    `// 1) Métacaractères shell dangereux (SANS backslash global - permet chemins Windows)
    const shellMetaChars = /[;&|\`$(){}[\\]<>!]|&&|\\|\\|/;

    // 2) Backslashes dangereux uniquement (séquences d'échappement)
    const dangerousBackslashes = /\\\\(?:n|r|t|b|f|v|0|x[0-9A-Fa-f]{2})/`
  );

  content = content.replace(
    'if (shellMetaChars.test(command)) {',
    'if (shellMetaChars.test(command) || dangerousBackslashes.test(command)) {'
  );

  fs.writeFileSync(path, content, 'utf-8');
  console.log('SUCCESS with alternative method');
}
