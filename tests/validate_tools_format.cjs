/**
 * VALIDATION FORMAT OUTILS - Phase 4 du plan
 *
 * Verifie que toutes les definitions d'outils respectent le format OpenAI
 * requis par Cerebras.
 *
 * Date: 16 decembre 2025
 */

const { TOOL_DEFINITIONS } = require('../server/agents/tool-agent.cjs');

console.log('===========================================');
console.log(' VALIDATION FORMAT OUTILS');
console.log('===========================================\n');

let passed = 0;
let failed = 0;
const errors = [];

function validateToolFormat(tool, index) {
  const toolErrors = [];
  const name = tool.function?.name || tool.name || `tool_${index}`;

  // 1. Verifier type: 'function'
  if (tool.type !== 'function') {
    toolErrors.push(`Missing or invalid type (expected 'function', got '${tool.type}')`);
  }

  // 2. Verifier function.name existe
  if (!tool.function?.name) {
    toolErrors.push('Missing function.name');
  }

  // 3. Verifier function.name <= 64 caracteres
  if (tool.function?.name && tool.function.name.length > 64) {
    toolErrors.push(`function.name too long: ${tool.function.name.length} chars (max 64)`);
  }

  // 4. Verifier function.description existe
  if (!tool.function?.description) {
    toolErrors.push('Missing function.description');
  }

  // 5. Verifier parameters.type = 'object'
  if (tool.function?.parameters) {
    if (tool.function.parameters.type !== 'object') {
      toolErrors.push(`parameters.type should be 'object', got '${tool.function.parameters.type}'`);
    }

    // 6. Verifier properties existe
    if (!tool.function.parameters.properties) {
      toolErrors.push('Missing parameters.properties');
    }

    // 7. Verifier required est un array
    if (tool.function.parameters.required && !Array.isArray(tool.function.parameters.required)) {
      toolErrors.push('parameters.required should be an array');
    }

    // 8. Verifier chaque parametre
    const props = tool.function.parameters.properties || {};
    for (const [paramName, paramDef] of Object.entries(props)) {
      if (!paramDef.type) {
        toolErrors.push(`Parameter '${paramName}' missing type`);
      }
    }
  }

  return { name, errors: toolErrors };
}

// Valider tous les outils
console.log(`Validating ${TOOL_DEFINITIONS.length} tools...\n`);

for (let i = 0; i < TOOL_DEFINITIONS.length; i++) {
  const tool = TOOL_DEFINITIONS[i];
  const result = validateToolFormat(tool, i);

  if (result.errors.length === 0) {
    passed++;
  } else {
    failed++;
    errors.push({
      index: i,
      name: result.name,
      errors: result.errors
    });
    console.log(`FAIL: ${result.name}`);
    result.errors.forEach(err => console.log(`  - ${err}`));
  }
}

// Resume
console.log('\n===========================================');
console.log(` RESUME: ${passed}/${TOOL_DEFINITIONS.length} outils valides`);
console.log('===========================================');

if (failed > 0) {
  console.log(`\n${failed} outils avec erreurs:`);
  errors.forEach(e => {
    console.log(`\n[${e.index}] ${e.name}:`);
    e.errors.forEach(err => console.log(`  - ${err}`));
  });
}

// Statistiques supplementaires
console.log('\n--- Statistiques ---');
const toolNames = TOOL_DEFINITIONS.map(t => t.function?.name).filter(Boolean);
const uniqueNames = new Set(toolNames);
console.log(`Noms uniques: ${uniqueNames.size}/${toolNames.length}`);

const longNames = toolNames.filter(n => n && n.length > 50);
if (longNames.length > 0) {
  console.log(`Noms longs (>50 chars): ${longNames.join(', ')}`);
}

// Verifier doublons
const duplicates = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);
if (duplicates.length > 0) {
  console.log(`Doublons: ${[...new Set(duplicates)].join(', ')}`);
}

process.exit(failed > 0 ? 1 : 0);
