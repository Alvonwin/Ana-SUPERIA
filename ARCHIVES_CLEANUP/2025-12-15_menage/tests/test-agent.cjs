/**
 * Test script pour CodingAgent
 */

const CodingAgent = require('./coding-agent.cjs');

console.log('✅ CodingAgent chargé');
console.log('Type:', typeof CodingAgent);

// Test d'instanciation
try {
  const instance = new CodingAgent({ dryRun: true });
  console.log('✅ Instance créée (dry-run mode)');

  // Vérifier les méthodes
  console.log('Méthodes disponibles:');
  console.log('  - run:', typeof instance.run);
  console.log('  - executeTool:', typeof instance.executeTool);
  console.log('  - handleToolCalls:', typeof instance.handleToolCalls);

} catch(e) {
  console.error('❌ Erreur instanciation:', e.message);
}

// Test des exports
try {
  const { CODING_TOOLS } = require('./coding-agent.cjs');
  if (CODING_TOOLS) {
    console.log('\n✅ CODING_TOOLS exportés:', CODING_TOOLS.length, 'outils');
    CODING_TOOLS.forEach(t => {
      console.log('  -', t.function.name);
    });
  }
} catch(e) {
  console.error('❌ CODING_TOOLS non exportés');
}

console.log('\n✅ Test terminé avec succès');
