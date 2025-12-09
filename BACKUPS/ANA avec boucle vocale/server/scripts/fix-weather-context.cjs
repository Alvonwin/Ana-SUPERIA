/**
 * Fix: Passer les données météo/web directement au LLM de manière explicite
 *
 * Problème: Les données météo sont mélangées dans le "contexte mémoire" et le LLM les ignore
 * Solution: Ajouter un message système spécifique pour les données en temps réel
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ana-core.cjs');

// Backup
const backupPath = filePath + '.backup_weather_fix_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.copyFileSync(filePath, backupPath);
console.log('✅ Backup créé:', backupPath);

let content = fs.readFileSync(filePath, 'utf8');

// Chercher le pattern où on construit les messages
const oldPattern = `// Texte: Utiliser /api/chat avec messages structurés (best practice)
        const messages = [
          { role: 'system', content: currentSystemPrompt }
        ];

        // Ajouter contexte mémoire comme messages précédents si disponible
        if (memoryContext) {
          messages.push({ role: 'assistant', content: \`Contexte de nos conversations précédentes:\\n\${memoryContext}\` });
        }

        // Message actuel de l'utilisateur
        messages.push({ role: 'user', content: message });`;

const newPattern = `// Texte: Utiliser /api/chat avec messages structurés (best practice)
        const messages = [
          { role: 'system', content: currentSystemPrompt }
        ];

        // Ajouter contexte mémoire (conversation history)
        if (memoryContext) {
          // Séparer les données temps réel (météo, web) du contexte historique
          const realtimeDataMatch = memoryContext.match(/\\[DONNÉES MÉTÉO EN TEMPS RÉEL\\][\\s\\S]*?(?=\\[|$)/);
          const webSearchMatch = memoryContext.match(/\\[RÉSULTATS RECHERCHE WEB\\][\\s\\S]*?(?=\\[|$)/);

          // Si données temps réel, les mettre en premier comme instruction
          if (realtimeDataMatch || webSearchMatch) {
            let realtimeContext = '';
            if (realtimeDataMatch) realtimeContext += realtimeDataMatch[0].trim() + '\\n';
            if (webSearchMatch) realtimeContext += webSearchMatch[0].trim();

            messages.push({
              role: 'system',
              content: \`DONNÉES EN TEMPS RÉEL (utilise ces informations pour répondre):\\n\${realtimeContext}\`
            });
          }

          // Le reste du contexte comme historique
          const cleanContext = memoryContext
            .replace(/\\[DONNÉES MÉTÉO EN TEMPS RÉEL\\][\\s\\S]*?(?=\\[|$)/, '')
            .replace(/\\[RÉSULTATS RECHERCHE WEB\\][\\s\\S]*?(?=\\[|$)/, '')
            .trim();

          if (cleanContext) {
            messages.push({ role: 'assistant', content: \`Contexte de nos conversations précédentes:\\n\${cleanContext}\` });
          }
        }

        // Message actuel de l'utilisateur
        messages.push({ role: 'user', content: message });`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fix appliqué: Les données météo/web seront maintenant passées explicitement au LLM');
  console.log('');
  console.log('Changements:');
  console.log('- Données temps réel (météo, web) séparées du contexte historique');
  console.log('- Passées comme message système avec instruction "utilise ces informations"');
  console.log('- Le LLM comprendra maintenant qu\'il doit utiliser ces données');
  console.log('');
  console.log('⚠️  REDÉMARRER LE SERVEUR pour activer le fix!');
} else {
  console.log('⚠️ Pattern exact non trouvé - tentative de fix alternatif...');

  // Vérifier si déjà fixé
  if (content.includes('DONNÉES EN TEMPS RÉEL (utilise ces informations')) {
    console.log('ℹ️ Le fix est déjà appliqué!');
  } else {
    console.log('❌ Impossible d\'appliquer le fix automatiquement');
    console.log('   Vérifier manuellement ana-core.cjs autour de la ligne 3113');
  }
}
