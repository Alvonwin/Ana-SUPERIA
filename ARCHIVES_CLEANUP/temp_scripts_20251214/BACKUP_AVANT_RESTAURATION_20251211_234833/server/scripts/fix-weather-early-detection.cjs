/**
 * FIX CRITIQUE: Déplacer la détection météo AVANT le bloc try/catch
 *
 * Problème: Si memoryManager ou skillLearner échoue, le code de météo n'est jamais exécuté
 * Solution: Détecter et récupérer la météo EN PREMIER, avant tout le reste
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ana-core.cjs');

// Backup
const backupPath = filePath + '.backup_early_weather_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.copyFileSync(filePath, backupPath);
console.log('✅ Backup créé:', backupPath);

let content = fs.readFileSync(filePath, 'utf8');

// Chercher où insérer la détection météo précoce
const insertAfter = `socket.emit('chat:model_selected', { model, reason });`;

const weatherEarlyDetection = `socket.emit('chat:model_selected', { model, reason });

      // === MÉTÉO EARLY DETECTION (AVANT tout le reste) ===
      // Détection météo en premier pour éviter qu'elle soit sautée par des erreurs
      let earlyWeatherData = null;
      const messageLower = message.toLowerCase();
      const weatherKeywords = ['météo', 'meteo', 'temps qu\\'il fait', 'température', 'pluie demain', 'fera-t-il', 'quel temps'];

      if (weatherKeywords.some(kw => messageLower.includes(kw))) {
        console.log('🌤️ Web Intelligence: Détection météo (early)');
        try {
          const WebTools = require('./tools/web-tools.cjs');
          // Patterns pour extraire la ville
          const locationPatterns = [
            /météo[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i,
            /temps[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i,
            /température[\\s]+(?:à|a|de|du|en|pour)[\\s]+([A-Z][\\w\\s-]+)/i
          ];
          let location = 'Longueuil'; // Défaut - Ana habite à Longueuil
          for (const pattern of locationPatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
              location = match[1].trim();
              break;
            }
          }
          console.log('🌤️ Météo pour:', location);
          const weatherData = await WebTools.weather(location);
          if (weatherData.success) {
            earlyWeatherData = \`[DONNÉES MÉTÉO EN TEMPS RÉEL - UTILISE CES DONNÉES POUR RÉPONDRE]
Lieu: \${weatherData.location.name}, \${weatherData.location.country}
Température actuelle: \${weatherData.current.temperature}
Température ressentie: \${weatherData.current.feelsLike}
Conditions: \${weatherData.current.description}
Humidité: \${weatherData.current.humidity}
Vent: \${weatherData.current.windSpeed}\`;
            console.log('✅ Météo récupérée:', weatherData.current.temperature);
            socket.emit('chat:web_search', { type: 'weather', location, success: true });
          }
        } catch (weatherError) {
          console.log('⚠️ Météo error (early):', weatherError.message);
        }
      }`;

if (content.includes(insertAfter) && !content.includes('earlyWeatherData')) {
  content = content.replace(insertAfter, weatherEarlyDetection);

  // Aussi modifier le code qui construit les messages pour inclure earlyWeatherData
  const oldMessages = `// Texte: Utiliser /api/chat avec messages structurés (best practice)
        const messages = [
          { role: 'system', content: currentSystemPrompt }
        ];`;

  const newMessages = `// Texte: Utiliser /api/chat avec messages structurés (best practice)
        const messages = [
          { role: 'system', content: currentSystemPrompt }
        ];

        // Ajouter données météo en temps réel si disponibles (PRIORITÉ HAUTE)
        if (earlyWeatherData) {
          messages.push({
            role: 'system',
            content: earlyWeatherData
          });
          console.log('📤 Données météo injectées dans le contexte LLM');
        }`;

  if (content.includes(oldMessages)) {
    content = content.replace(oldMessages, newMessages);
    console.log('✅ Injection météo dans messages LLM ajoutée');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Détection météo précoce ajoutée');
  console.log('');
  console.log('Maintenant la météo sera:');
  console.log('1. Détectée EN PREMIER (avant memoryManager, skillLearner)');
  console.log('2. Récupérée immédiatement via WebTools.weather()');
  console.log('3. Injectée dans le contexte LLM comme message système');
  console.log('');
  console.log('⚠️  REDÉMARRER LE SERVEUR!');
} else if (content.includes('earlyWeatherData')) {
  console.log('ℹ️ Le fix est déjà appliqué');
} else {
  console.log('❌ Pattern non trouvé - vérifier manuellement');
}
