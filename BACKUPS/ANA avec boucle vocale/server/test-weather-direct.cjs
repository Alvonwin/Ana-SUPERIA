/**
 * Test direct de WebTools.weather() - vérifie si les données sont correctes
 */
const WebTools = require('./tools/web-tools.cjs');

async function test() {
  console.log('=== TEST MÉTÉO DIRECT ===\n');
  console.log('Test 1: Longueuil (défaut)');

  try {
    const result = await WebTools.weather('Longueuil');
    if (result.success) {
      console.log('✅ SUCCÈS!');
      console.log('   Lieu:', result.location?.name);
      console.log('   Température:', result.current?.temperature);
      console.log('   Ressenti:', result.current?.feelsLike);
      console.log('   Conditions:', result.current?.description);
      console.log('\n   Données brutes:', JSON.stringify(result, null, 2).substring(0, 500));
    } else {
      console.log('❌ ÉCHEC:', result.error);
    }
  } catch (e) {
    console.log('❌ ERREUR:', e.message);
  }

  console.log('\n\nTest 2: Montreal');
  try {
    const result2 = await WebTools.weather('Montreal');
    if (result2.success) {
      console.log('✅ SUCCÈS!');
      console.log('   Lieu:', result2.location?.name);
      console.log('   Température:', result2.current?.temperature);
    } else {
      console.log('❌ ÉCHEC:', result2.error);
    }
  } catch (e) {
    console.log('❌ ERREUR:', e.message);
  }
}

test();
