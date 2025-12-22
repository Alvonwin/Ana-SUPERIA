// Test de extractPathFromMessage
const message = 'Extraire le texte de cette image C:\\Users\\niwno\\Desktop\\Ana\\Photos\\334.jpg';

function extractPathFromMessage(msg) {
  if (!msg) return null;

  // Pattern pour chemins Windows: C:\...\file.ext
  const windowsPathPattern = /[A-Za-z]:\\[^\s"'<>|*?]+\.[a-zA-Z0-9]+/g;

  const matches = msg.match(windowsPathPattern);
  if (matches && matches.length > 0) {
    return matches[0];
  }

  return null;
}

const extracted = extractPathFromMessage(message);
console.log('Message:', message);
console.log('Extracted path:', extracted);

// Test avec chemin corrompu
const corruptedPath = 'C:Users/iwno/Desktop/Ana/Photos/Ü.jpg';
console.log('\nCorrupted path from LLM:', corruptedPath);
console.log('Original path extracted:', extracted);
console.log('Should use original:', extracted !== corruptedPath);
