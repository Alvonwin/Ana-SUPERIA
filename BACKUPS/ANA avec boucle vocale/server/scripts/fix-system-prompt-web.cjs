/**
 * Script pour corriger les capacités web dans le system prompt
 */
const fs = require('fs');
const path = require('path');

const promptPath = path.join(__dirname, '..', 'config', 'system-prompt.json');

// Lire le fichier
const data = JSON.parse(fs.readFileSync(promptPath, 'utf8'));
let prompt = data.prompt;

// Ancienne ligne à remplacer
const oldLine = "Naviguer librement sur le web en temps réel (tu ne consultes pas Internet par toi‑même).";

// Nouvelle section avec les vraies capacités
const newLine = `Rechercher sur Internet: quand ALAIN demande des informations actuelles (météo, actualités, définitions, faits), le système effectue automatiquement une recherche web via DuckDuckGo et te fournit les résultats. Tu peux donc répondre "Oui, je peux rechercher sur internet" quand on te le demande.`;

if (prompt.includes(oldLine)) {
  prompt = prompt.replace(oldLine, newLine);
  data.prompt = prompt;
  data.lastModified = new Date().toISOString();

  // Sauvegarder
  fs.writeFileSync(promptPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ System prompt mis à jour avec les capacités web');
  console.log('   Ancienne ligne supprimée');
  console.log('   Nouvelle capacité ajoutée: Recherche Internet');
} else {
  console.log('ℹ️ Ligne déjà modifiée ou non trouvée');
}
