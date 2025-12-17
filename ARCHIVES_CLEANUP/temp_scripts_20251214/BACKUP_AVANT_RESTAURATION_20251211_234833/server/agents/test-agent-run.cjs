/**
 * Test d'exécution réelle de CodingAgent
 * Tâche simple: lister le contenu d'un dossier
 */

const CodingAgent = require('./coding-agent.cjs');

async function testAgentRun() {
  console.log('='.repeat(60));
  console.log('🧪 TEST EXÉCUTION CODING AGENT');
  console.log('='.repeat(60));

  const agent = new CodingAgent({ dryRun: false });

  const task = "Liste les fichiers dans le dossier E:/ANA/server/agents et dis-moi combien il y en a.";

  console.log('\n📋 Tâche:', task);
  console.log('\n⏳ Exécution en cours...\n');

  const startTime = Date.now();

  try {
    const result = await agent.run(task, {
      workingDirectory: 'E:/ANA/server'
    });

    const elapsed = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSULTAT');
    console.log('='.repeat(60));
    console.log('Success:', result.success);
    console.log('Temps:', elapsed, 'ms');
    console.log('Itérations:', result.iterations);
    console.log('Actions:', result.actions?.length || 0);

    if (result.actions && result.actions.length > 0) {
      console.log('\n📝 Actions effectuées:');
      result.actions.forEach((a, i) => {
        console.log(`  ${i+1}. ${a.tool} - ${a.result?.success ? '✅' : '❌'}`);
      });
    }

    if (result.response) {
      console.log('\n💬 Réponse:');
      console.log(result.response.substring(0, 500));
    }

    if (result.error) {
      console.log('\n❌ Erreur:', result.error);
    }

    console.log('\n' + '='.repeat(60));
    console.log(result.success ? '✅ TEST RÉUSSI' : '❌ TEST ÉCHOUÉ');
    console.log('='.repeat(60));

  } catch(e) {
    console.error('\n❌ Exception:', e.message);
    console.error(e.stack);
  }
}

testAgentRun();
