/**
 * Test du flux météo APRÈS le fix
 */
const WebTools = require('./tools/web-tools.cjs');

async function testWeatherFlow(message) {
  console.log('=== TEST FLUX MÉTÉO (APRÈS FIX) ===');
  console.log('Message:', message);
  console.log('');

  const webKeywords = {
    weather: ['météo', 'meteo', 'temps qu\'il fait', 'température', 'pluie demain', 'fera-t-il', 'quel temps']
  };

  const messageLower = message.toLowerCase();

  const detected = webKeywords.weather.some(kw => messageLower.includes(kw));
  if (!detected) {
    console.log('❌ Aucun keyword météo détecté!');
    return;
  }
  console.log('✅ Keyword météo détecté');

  // Nouveaux patterns améliorés
  const locationPatterns = [
    /météo[\s]+(?:à|a|de|du|en|pour)[\s]+([A-Z][\w\s-]+)/i,
    /temps[\s]+(?:à|a|de|du|en|pour)[\s]+([A-Z][\w\s-]+)/i,
    /température[\s]+(?:à|a|de|du|en|pour)[\s]+([A-Z][\w\s-]+)/i,
    /(?:à|a|de|du|en|pour)[\s]+([A-Z][\w\s-]+)[\s]*\?/i
  ];

  let location = 'Longueuil'; // Nouveau défaut!
  for (const pattern of locationPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      location = match[1].trim();
      console.log(`   Location extraite: "${location}"`);
      break;
    }
  }
  console.log('   Location finale:', location);

  console.log('\nAppel WebTools.weather("' + location + '")...');
  try {
    const weatherData = await WebTools.weather(location);
    if (weatherData.success) {
      console.log('');
      console.log('✅ RÉSULTAT:');
      console.log('   Lieu:', weatherData.location.name, '-', weatherData.location.country);
      console.log('   🌡️  Température:', weatherData.current.temperature);
      console.log('   🥶 Ressenti:', weatherData.current.feelsLike);
      console.log('   ☁️  Conditions:', weatherData.current.description);
    } else {
      console.log('❌ Échec:', weatherData.error);
    }
  } catch (e) {
    console.log('❌ Erreur:', e.message);
  }
}

// Test
testWeatherFlow("bonjour Anna quelle température fait-il présentement à l'extérieur");
