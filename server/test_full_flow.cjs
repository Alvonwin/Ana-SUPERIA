// Test complet du flux vision
const toolAgent = require('./agents/tool-agent.cjs');

async function test() {
  console.log('=== Test du flux complet ===\n');

  const message = 'Extraire le texte de cette image C:\\Users\\niwno\\Desktop\\Ana\\Photos\\334.jpg';
  console.log('Message:', message);

  try {
    const result = await toolAgent.runToolAgentV2(message, {
      model: 'llama-3.3-70b',
      timeoutMs: 120000
    });

    console.log('\n=== Résultat ===');
    console.log('Success:', result.success);
    console.log('Answer:', result.answer?.substring(0, 500));
    if (result.error) console.log('Error:', result.error);
  } catch (e) {
    console.error('Exception:', e.message);
  }
}

test();
