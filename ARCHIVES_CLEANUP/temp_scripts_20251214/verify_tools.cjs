/**
 * Script de vérification des outils Ana
 */
const ta = require('../server/agents/tool-agent.cjs');

const defs = ta.TOOL_DEFINITIONS || [];
const impls = Object.keys(ta.TOOL_IMPLEMENTATIONS || {});

console.log('=== VÉRIFICATION OUTILS ANA ===\n');
console.log('Définitions TOOL_DEFINITIONS:', defs.length);
console.log('Implémentations TOOL_IMPLEMENTATIONS:', impls.length);

const defNames = defs.map(d => d.function.name);

// Chercher les écarts
const missing = defNames.filter(n => !impls.includes(n));
const extra = impls.filter(n => !defNames.includes(n));

if (missing.length) {
  console.log('\n⚠️  DÉFINIS mais PAS implémentés:', missing);
}

if (extra.length) {
  console.log('\n⚠️  IMPLÉMENTÉS mais PAS définis:', extra);
}

if (missing.length === 0 && extra.length === 0 && defs.length === impls.length) {
  console.log('\n✅ PARFAIT - ' + defs.length + ' outils définis ET implémentés');
} else {
  console.log('\n❌ ÉCART DÉTECTÉ');
}

// Lister par catégorie
console.log('\n=== LISTE PAR CATÉGORIE ===\n');
const categories = {};
defNames.forEach(name => {
  let cat = 'AUTRES';
  if (name.includes('git')) cat = 'GIT';
  else if (name.includes('image') || name.includes('screenshot') || name.includes('describe')) cat = 'VISION';
  else if (name.includes('voice')) cat = 'VOICE';
  else if (name.includes('architect') || name === 'review_code') cat = 'ARCHITECT';
  else if (name.includes('codebase') || name.includes('project_structure')) cat = 'RAG';
  else if (name.includes('memory')) cat = 'MÉMOIRE';
  else if (name.includes('generate') || name.includes('inpaint')) cat = 'GÉNÉRATION';
  else if (name.includes('file') || name.includes('edit') || name.includes('grep') || name.includes('glob') || name === 'list_files') cat = 'FICHIERS';
  else if (name.includes('web') || name.includes('weather') || name.includes('http') || name.includes('wikipedia') || name === 'get_yt_transcript') cat = 'WEB';
  else if (name.includes('code') || name.includes('shell') || name.includes('groq') || name.includes('cerebras')) cat = 'CODE';

  if (!categories[cat]) categories[cat] = [];
  categories[cat].push(name);
});

for (const [cat, tools] of Object.entries(categories).sort()) {
  console.log(cat + ' (' + tools.length + '):', tools.join(', '));
}
