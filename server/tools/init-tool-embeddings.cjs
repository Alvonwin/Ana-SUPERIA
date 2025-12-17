/**
 * INIT TOOL EMBEDDINGS - Script d'initialisation
 *
 * Execute une seule fois pour indexer les 188 outils dans ChromaDB.
 * Prerequis: ChromaDB doit tourner sur port 8000, Ollama sur 11434.
 *
 * Usage: node init-tool-embeddings.cjs
 */

const { toolEmbeddings } = require('./tool-embeddings.cjs');
const { TOOL_DEFINITIONS } = require('../agents/tool-agent.cjs');

async function main() {
  console.log('===========================================');
  console.log(' SEMANTIC TOOL DISCOVERY - Initialisation');
  console.log('===========================================');
  console.log('');

  // Verifier prerequisites
  console.log('[1/3] Verification des services...');

  try {
    // Test ChromaDB (v2 API)
    const chromaTest = await fetch('http://localhost:8000/api/v2/heartbeat');
    if (!chromaTest.ok) throw new Error('ChromaDB not responding');
    console.log('  - ChromaDB: OK (port 8000)');
  } catch (error) {
    console.error('  - ChromaDB: ERREUR - ' + error.message);
    console.error('');
    console.error('Lancez ChromaDB avec: chroma run --path E:\\ANA\\server\\memory\\chroma_data');
    process.exit(1);
  }

  try {
    // Test Ollama
    const ollamaTest = await fetch('http://localhost:11434/api/tags');
    if (!ollamaTest.ok) throw new Error('Ollama not responding');
    console.log('  - Ollama: OK (port 11434)');
  } catch (error) {
    console.error('  - Ollama: ERREUR - ' + error.message);
    console.error('');
    console.error('Lancez Ollama et assurez-vous que nomic-embed-text est installe.');
    process.exit(1);
  }

  console.log('');

  // Verifier les outils
  console.log('[2/3] Verification des outils...');
  console.log('  - Outils trouves: ' + TOOL_DEFINITIONS.length);

  console.log('');
  console.log('[3/3] Indexation des outils...');
  console.log('');

  const startTime = Date.now();
  const result = await toolEmbeddings.indexAllTools(TOOL_DEFINITIONS);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  if (result.success) {
    console.log('');
    console.log('Resultat:');
    console.log('  - Outils indexes: ' + result.toolsCount);
    console.log('  - Entries totales: ' + result.entriesCount + ' (outils + parametres)');
    console.log('  - Duree: ' + duration + ' secondes');
    console.log('');
    console.log('===========================================');
    console.log(' SUCCES - Ana peut maintenant utiliser');
    console.log(' la recherche semantique pour ses outils!');
    console.log('===========================================');
  } else {
    console.error('');
    console.error('ERREUR: ' + result.error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
