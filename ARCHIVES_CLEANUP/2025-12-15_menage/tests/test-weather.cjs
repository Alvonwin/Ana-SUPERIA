const axios = require('axios');

async function test() {
  console.log('Test 1: User-Agent Ana');
  try {
    const r1 = await axios.get('https://wttr.in/Montreal?format=j1', {
      timeout: 15000,
      headers: { 'User-Agent': 'Ana-SUPERIA/1.0 (AI Assistant; +https://ana.local)' }
    });
    console.log('SUCCESS:', r1.data.current_condition[0].temp_C + '°C');
  } catch (e) {
    console.log('FAIL:', e.message);
  }

  console.log('\nTest 2: User-Agent curl');
  try {
    const r2 = await axios.get('https://wttr.in/Montreal?format=j1', {
      timeout: 15000,
      headers: { 'User-Agent': 'curl/7.68.0' }
    });
    console.log('SUCCESS:', r2.data.current_condition[0].temp_C + '°C');
  } catch (e) {
    console.log('FAIL:', e.message);
  }

  console.log('\nTest 3: No User-Agent');
  try {
    const r3 = await axios.get('https://wttr.in/Montreal?format=j1', {
      timeout: 15000
    });
    console.log('SUCCESS:', r3.data.current_condition[0].temp_C + '°C');
  } catch (e) {
    console.log('FAIL:', e.message);
  }
}

test();
