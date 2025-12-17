/**
 * TEST SYNTAX - Phase 2 du plan d'integration
 *
 * Valide que tous les modules se chargent sans erreur
 * et que les outils ont des definitions/implementations coherentes
 */

const path = require('path');

console.log('===========================================');
console.log(' TESTS SYNTAXE/IMPORT - Phase 2');
console.log('===========================================\n');

let passed = 0;
let failed = 0;
const errors = [];

// Test 1: Chargement tool-agent.cjs
console.log('[Test 1] Chargement tool-agent.cjs...');
try {
  const toolAgent = require('../server/agents/tool-agent.cjs');
  if (toolAgent.TOOL_DEFINITIONS && toolAgent.TOOL_IMPLEMENTATIONS) {
    console.log('  OK - Module charge');
    passed++;
  } else {
    throw new Error('TOOL_DEFINITIONS ou TOOL_IMPLEMENTATIONS manquant');
  }
} catch (err) {
  console.log('  FAILED -', err.message);
  errors.push({ test: 'tool-agent.cjs', error: err.message });
  failed++;
}

// Test 2: Chargement tool-groups.cjs
console.log('[Test 2] Chargement tool-groups.cjs...');
try {
  const toolGroups = require('../server/core/tool-groups.cjs');
  if (toolGroups.TOOL_GROUPS && toolGroups.GROUP_KEYWORDS) {
    console.log('  OK - Module charge');
    passed++;
  } else {
    throw new Error('TOOL_GROUPS ou GROUP_KEYWORDS manquant');
  }
} catch (err) {
  console.log('  FAILED -', err.message);
  errors.push({ test: 'tool-groups.cjs', error: err.message });
  failed++;
}

// Test 3: Chargement tool-embeddings.cjs
console.log('[Test 3] Chargement tool-embeddings.cjs...');
try {
  const toolEmbeddings = require('../server/tools/tool-embeddings.cjs');
  if (toolEmbeddings.indexAllTools && toolEmbeddings.searchTools) {
    console.log('  OK - Module charge');
    passed++;
  } else {
    throw new Error('indexAllTools ou searchTools manquant');
  }
} catch (err) {
  console.log('  FAILED -', err.message);
  errors.push({ test: 'tool-embeddings.cjs', error: err.message });
  failed++;
}

// Test 4: Verification du nombre d'outils
console.log('[Test 4] Verification nombre outils (attendu: 189)...');
try {
  const { TOOL_DEFINITIONS } = require('../server/agents/tool-agent.cjs');
  if (TOOL_DEFINITIONS.length === 189) {
    console.log(`  OK - ${TOOL_DEFINITIONS.length} outils`);
    passed++;
  } else {
    throw new Error(`Attendu 189, trouve ${TOOL_DEFINITIONS.length}`);
  }
} catch (err) {
  console.log('  FAILED -', err.message);
  errors.push({ test: 'nombre outils', error: err.message });
  failed++;
}

// Test 5: Correspondance definitions/implementations
console.log('[Test 5] Correspondance definitions/implementations...');
try {
  const { TOOL_DEFINITIONS, TOOL_IMPLEMENTATIONS } = require('../server/agents/tool-agent.cjs');

  const defNames = TOOL_DEFINITIONS.map(t => t.function?.name || t.name);
  const implNames = Object.keys(TOOL_IMPLEMENTATIONS);

  const missingImpl = defNames.filter(n => !implNames.includes(n));
  const missingDef = implNames.filter(n => !defNames.includes(n));

  if (missingImpl.length === 0 && missingDef.length === 0) {
    console.log('  OK - Correspondance parfaite');
    passed++;
  } else {
    let msg = '';
    if (missingImpl.length > 0) msg += `Sans impl: ${missingImpl.join(', ')}. `;
    if (missingDef.length > 0) msg += `Sans def: ${missingDef.join(', ')}`;
    throw new Error(msg);
  }
} catch (err) {
  console.log('  FAILED -', err.message);
  errors.push({ test: 'correspondance', error: err.message });
  failed++;
}

// Test 6: Pas de doublons
console.log('[Test 6] Verification absence de doublons...');
try {
  const { TOOL_DEFINITIONS } = require('../server/agents/tool-agent.cjs');
  const names = TOOL_DEFINITIONS.map(t => t.function?.name || t.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);

  if (duplicates.length === 0) {
    console.log('  OK - Pas de doublons');
    passed++;
  } else {
    throw new Error(`Doublons: ${[...new Set(duplicates)].join(', ')}`);
  }
} catch (err) {
  console.log('  FAILED -', err.message);
  errors.push({ test: 'doublons', error: err.message });
  failed++;
}

// Test 7: Structure des definitions
console.log('[Test 7] Structure des definitions...');
try {
  const { TOOL_DEFINITIONS } = require('../server/agents/tool-agent.cjs');
  const invalid = [];

  for (const tool of TOOL_DEFINITIONS) {
    const name = tool.function?.name || tool.name;
    if (!tool.type) invalid.push(`${name}: type manquant`);
    if (!tool.function) invalid.push(`${name}: function manquant`);
    if (!tool.function?.name) invalid.push(`${name}: name manquant`);
    if (!tool.function?.description) invalid.push(`${name}: description manquant`);
  }

  if (invalid.length === 0) {
    console.log('  OK - Toutes les definitions sont valides');
    passed++;
  } else {
    throw new Error(invalid.slice(0, 5).join('; ') + (invalid.length > 5 ? `... (+${invalid.length - 5})` : ''));
  }
} catch (err) {
  console.log('  FAILED -', err.message);
  errors.push({ test: 'structure', error: err.message });
  failed++;
}

// Test 8: Implementations sont des fonctions
console.log('[Test 8] Implementations sont des fonctions...');
try {
  const { TOOL_IMPLEMENTATIONS } = require('../server/agents/tool-agent.cjs');
  const notFunctions = [];

  for (const [name, impl] of Object.entries(TOOL_IMPLEMENTATIONS)) {
    if (typeof impl !== 'function') {
      notFunctions.push(name);
    }
  }

  if (notFunctions.length === 0) {
    console.log('  OK - Toutes les implementations sont des fonctions');
    passed++;
  } else {
    throw new Error(`Non-fonctions: ${notFunctions.join(', ')}`);
  }
} catch (err) {
  console.log('  FAILED -', err.message);
  errors.push({ test: 'fonctions', error: err.message });
  failed++;
}

// Resume
console.log('\n===========================================');
console.log(` RESULTATS: ${passed}/${passed + failed} tests passes`);
console.log('===========================================');

if (errors.length > 0) {
  console.log('\nErreurs:');
  errors.forEach(e => console.log(`  - ${e.test}: ${e.error}`));
}

// Code de sortie
process.exit(failed > 0 ? 1 : 0);
