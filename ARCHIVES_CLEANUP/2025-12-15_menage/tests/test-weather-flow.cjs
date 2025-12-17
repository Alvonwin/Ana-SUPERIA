/**
 * Test du flux complet de détection météo
 * Simule exactement ce que fait le handler chat:message
 */
const WebTools = require('./tools/web-tools.cjs');

async function testWeatherFlow(message) {
  console.log('=== TEST FLUX MÉTÉO ===');
  console.log('Message:', message);
  console.log('');

  // 1. Détection keywords (exactement comme dans ana-core.cjs)
  const webKeywords = {
    weather: ['météo', 'meteo', 'temps qu\'il fait', 'température', 'pluie demain', 'fera-t-il', 'quel temps']
  };

  const messageLower = message.toLowerCase();
  console.log('1. Message lowercase:', messageLower);

  const detected = webKeywords.weather.some(kw => {
    const found = messageLower.includes(kw);
    if (found) console.log(`   ✅ Keyword trouvé: "${kw}"`);
    return found;
  });

  if (!detected) {
    console.log('❌ Aucun keyword météo détecté!');
    return;
  }

  console.log('\n2. 🌤️ Web Intelligence: Détection météo');

  // 2. Extraction location (exactement comme dans ana-core.cjs)
  const locationPatterns = [
    /météo[\s]+(?:à|a|de|du|en)?[\s]*([\w\s-]+)/i,
    /temps[\s]+(?:à|a|de|du|en)?[\s]*([\w\s-]+)/i,
    /température[\s]+(?:à|a|de|du|en)?[\s]*([\w\s-]+)/i
  ];

  let location = 'Montreal'; // Default
  for (const pattern of locationPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      location = match[1].trim();
      console.log(`   Location extraite: "${location}"`);
      break;
    }
  }
  console.log('   Location finale:', location);

  // 3. Appel WebTools
  console.log('\n3. Appel WebTools.weather()...');
  try {
    const weatherData = await WebTools.weather(location);

    if (weatherData.success) {
      console.log('   ✅ Données reçues!');

      // 4. Construction du contexte (exactement comme dans ana-core.cjs)
      const weatherContext = `[DONNÉES MÉTÉO EN TEMPS RÉEL]
Lieu: ${weatherData.location.name}, ${weatherData.location.country}
Température: ${weatherData.current.temperature} (ressenti: ${weatherData.current.feelsLike})
Conditions: ${weatherData.current.description}
Humidité: ${weatherData.current.humidity}
Vent: ${weatherData.current.windSpeed} ${weatherData.current.windDirection}`;

      console.log('\n4. Contexte généré pour le LLM:');
      console.log('─'.repeat(50));
      console.log(weatherContext);
      console.log('─'.repeat(50));

      // 5. Ce qui devrait être envoyé au LLM (après mon fix #3)
      console.log('\n5. Message système pour le LLM:');
      console.log('─'.repeat(50));
      console.log(`DONNÉES EN TEMPS RÉEL (utilise ces informations pour répondre):
${weatherContext}`);
      console.log('─'.repeat(50));

      console.log('\n✅ FLUX COMPLET OK - Le LLM devrait répondre avec ces données!');
    } else {
      console.log('   ❌ Échec:', weatherData.error);
    }
  } catch (e) {
    console.log('   ❌ Erreur:', e.message);
  }
}

// Test avec le message d'Alain
testWeatherFlow("bonjour Anna quelle température fait-il présentement à l'extérieur");
