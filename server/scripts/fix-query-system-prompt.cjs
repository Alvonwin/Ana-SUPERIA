/**
 * Script pour corriger la méthode query() qui n'envoie pas le system prompt à Ollama
 * BUG CRITIQUE: Le system prompt était chargé mais jamais utilisé!
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ana-core.cjs');

// Créer backup
const backupPath = filePath + '.backup_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.copyFileSync(filePath, backupPath);
console.log('✅ Backup créé:', backupPath);

// Lire le fichier
let content = fs.readFileSync(filePath, 'utf8');

// Pattern à chercher
const oldPattern = /const response = await axios\.post\(`\$\{OLLAMA_URL\}\/api\/generate`, \{\s*model: model,\s*prompt: prompt,\s*stream: streaming\s*\}/;

// Nouveau code
const newCode = `const response = await axios.post(\`\${OLLAMA_URL}/api/generate\`, {
        model: model,
        prompt: prompt,
        system: currentSystemPrompt,  // CRITIQUE: Injecter le system prompt!
        stream: streaming
      }`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ query() corrigé - System prompt sera maintenant envoyé à Ollama!');
  console.log('');
  console.log('⚠️  REDÉMARRER LE SERVEUR pour que le fix prenne effet!');
} else if (content.includes('system: currentSystemPrompt')) {
  console.log('ℹ️  Le fix est déjà appliqué');
} else {
  console.log('❌ Pattern non trouvé - vérifier manuellement ana-core.cjs ligne ~158');
}
