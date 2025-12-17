const fs = require('fs');

// PATCH 1: Ajouter mots-clés au routing dans ana-core.cjs
const anaCorePath = 'E:/ANA/server/ana-core.cjs';
let anaCoreContent = fs.readFileSync(anaCorePath, 'utf8');

// Vérifier si les nouveaux mots-clés sont déjà là
if (!anaCoreContent.includes("'rappelle toi de'")) {
  const oldKeywords = `      'retiens', 'mémorise', 'memorise', 'sauvegarde', 'note ceci', 'enregistre ceci', 'noublie pas',
      'rappelle-toi de', 'souviens-toi de'`;

  const newKeywords = `      'retiens', 'mémorise', 'memorise', 'sauvegarde', 'note ceci', 'enregistre ceci', 'noublie pas',
      'rappelle-toi de', 'souviens-toi de', 'rappelle toi de', 'tu te souviens de', 'te souviens-tu de',
      'date de naissance', 'ma naissance', 'mon anniversaire'`;

  if (anaCoreContent.includes(oldKeywords)) {
    anaCoreContent = anaCoreContent.replace(oldKeywords, newKeywords);
    fs.writeFileSync(anaCorePath, anaCoreContent);
    console.log('✓ Mots-clés mémoire ajoutés au routing ana-core.cjs');
  } else {
    console.log('⚠ Pattern mots-clés non trouvé dans ana-core.cjs');
  }
} else {
  console.log('✓ Mots-clés déjà présents dans ana-core.cjs');
}

// PATCH 2: Vérifier/corriger search_memory dans tool-agent.cjs
const toolAgentPath = 'E:/ANA/server/agents/tool-agent.cjs';
let toolAgentContent = fs.readFileSync(toolAgentPath, 'utf8');

// Chercher l'implémentation de search_memory
const searchMemoryMatch = toolAgentContent.match(/search_memory['"]\s*:\s*async.*?(\{[\s\S]*?\n\s*\})\s*,?\s*\n/);
if (searchMemoryMatch) {
  console.log('✓ search_memory trouvé dans tool-agent.cjs');

  // Vérifier si ana_memories.json est déjà inclus
  if (!toolAgentContent.includes('ana_memories.json')) {
    console.log('⚠ ana_memories.json non inclus dans search_memory - correction nécessaire');
  } else {
    console.log('✓ ana_memories.json déjà inclus');
  }
} else {
  console.log('⚠ search_memory non trouvé - recherche pattern alternatif...');
}

// Afficher les fichiers mémoire existants
console.log('\n--- Fichiers mémoire existants ---');
const memoryDir = 'E:/ANA/memory';
if (fs.existsSync(memoryDir)) {
  const files = fs.readdirSync(memoryDir);
  files.forEach(f => console.log('  ' + f));
}

console.log('\n--- Contenu ana_memories.json ---');
const memoriesPath = 'E:/ANA/memory/ana_memories.json';
if (fs.existsSync(memoriesPath)) {
  console.log(fs.readFileSync(memoriesPath, 'utf8'));
}

console.log('\n--- Contenu personal_facts.json ---');
const factsPath = 'E:/ANA/memory/personal_facts.json';
if (fs.existsSync(factsPath)) {
  console.log(fs.readFileSync(factsPath, 'utf8'));
}
