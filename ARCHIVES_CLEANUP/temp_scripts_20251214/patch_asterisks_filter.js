const fs = require('fs');

const filePath = 'E:/ANA/server/intelligence/ana-direct.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Verifier si deja patche
if (content.includes('cleanAsterisks')) {
  console.log('SKIP: cleanAsterisks deja present');
  process.exit(0);
}

// 1. Ajouter la fonction cleanAsterisks apres les imports
const cleanAsterisksFn = `
/**
 * Nettoie les asterisques de formatage markdown
 * Ana ne doit PAS utiliser *texte* ou **texte**
 */
function cleanAsterisks(text) {
  if (!text || typeof text !== 'string') return text;
  // Supprimer **texte** (gras) -> texte
  let cleaned = text.replace(/\\*\\*([^*]+)\\*\\*/g, '$1');
  // Supprimer *texte* (italique) -> texte
  cleaned = cleaned.replace(/\\*([^*]+)\\*/g, '$1');
  return cleaned;
}

`;

content = content.replace(
  "// Fallback LLMs",
  cleanAsterisksFn + "// Fallback LLMs"
);
console.log('OK: Fonction cleanAsterisks ajoutee');

// 2. Appliquer cleanAsterisks sur la reponse fallback
content = content.replace(
  "response: fallbackResult.response,",
  "response: cleanAsterisks(fallbackResult.response),"
);
console.log('OK: Filtre applique aux reponses fallback');

// 3. Appliquer cleanAsterisks sur la reponse principale
content = content.replace(
  "response: result.answer,",
  "response: cleanAsterisks(result.answer),"
);
console.log('OK: Filtre applique aux reponses principales');

// Sauvegarder
fs.writeFileSync(filePath, content, 'utf8');
console.log('DONE: Filtre asterisques ajoute a ana-direct.cjs');
