/**
 * Script pour mettre à jour le modèle dans coding-agent.cjs
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'coding-agent.cjs');
let content = fs.readFileSync(filePath, 'utf8');

// Remplacer le modèle
const oldModel = "model: 'deepseek-coder-v2:16b-lite-instruct-q4_K_M'";
const newModel = "model: 'qwen2.5:latest',  // Supporte le tool-calling natif Ollama";

if (content.includes(oldModel)) {
  content = content.replace(oldModel, newModel);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Modèle mis à jour: qwen2.5:latest');
} else {
  console.log('ℹ️ Modèle déjà mis à jour ou non trouvé');
}
