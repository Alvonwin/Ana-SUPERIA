/**
 * Test 2: Lecture de fichier et analyse
 */
const CodingAgent = require('./coding-agent.cjs');

async function test() {
  console.log('='.repeat(60));
  console.log('🧪 TEST 2: LECTURE ET ANALYSE DE FICHIER');
  console.log('='.repeat(60));

  const agent = new CodingAgent({ dryRun: false });
  const task = "Lis le fichier E:/ANA/server/agents/test-agent.cjs et dis-moi combien de lignes il contient et quelles fonctions sont définies.";

  console.log('\n📋 Tâche:', task);
  console.log('\n⏳ En cours...\n');

  const result = await agent.run(task);

  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSULTAT');
  console.log('='.repeat(60));
  console.log('Success:', result.success);
  console.log('Temps:', result.elapsedMs, 'ms');
  console.log('Actions:', result.actions?.length || 0);

  if (result.actions) {
    result.actions.forEach((a, i) => {
      console.log(`  ${i+1}. ${a.tool} - ${a.result?.success ? '✅' : '❌'}`);
    });
  }

  if (result.response) {
    console.log('\n💬 Réponse:');
    console.log(result.response);
  }

  console.log('\n' + '='.repeat(60));
  console.log(result.success ? '✅ TEST RÉUSSI' : '❌ TEST ÉCHOUÉ');
  console.log('='.repeat(60));
}

test();
