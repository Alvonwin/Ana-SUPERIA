const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(path, 'utf8');

// Ancien code search_memory (partie 1)
const oldSearchPart1 = `    // 1. Recherche dans le fichier de conversation Ana (texte simple)
    const conversationPath = 'E:/ANA/memory/current_conversation_ana.txt';`;

// Nouveau code avec ana_memories.json et personal_facts.json
const newSearchPart1 = `    // 0. Recherche dans ana_memories.json (souvenirs sauvegardés)
    const memoriesPath = 'E:/ANA/memory/ana_memories.json';
    if (fs.existsSync(memoriesPath)) {
      try {
        const memories = JSON.parse(fs.readFileSync(memoriesPath, 'utf-8'));
        const queryLower = query.toLowerCase();
        const memoryMatches = memories.filter(m =>
          m.content && m.content.toLowerCase().includes(queryLower)
        );
        if (memoryMatches.length > 0) {
          results.push({
            source: 'ana_memories',
            matchCount: memoryMatches.length,
            matches: memoryMatches.map(m => ({
              content: m.content,
              category: m.category,
              timestamp: m.timestamp
            }))
          });
        }
      } catch (err) {
        console.log(\`⚠️ [search_memory] ana_memories.json error: \${err.message}\`);
      }
    }

    // 0b. Recherche dans personal_facts.json (faits personnels Alain)
    const factsPath = 'E:/ANA/memory/personal_facts.json';
    if (fs.existsSync(factsPath)) {
      try {
        const factsData = JSON.parse(fs.readFileSync(factsPath, 'utf-8'));
        const queryLower = query.toLowerCase();
        const factMatches = [];

        // Chercher dans les faits
        if (factsData.facts) {
          for (const [key, value] of Object.entries(factsData.facts)) {
            if (key.toLowerCase().includes(queryLower) ||
                (typeof value === 'string' && value.toLowerCase().includes(queryLower))) {
              factMatches.push({ key, value });
            }
          }
        }

        if (factMatches.length > 0) {
          results.push({
            source: 'personal_facts',
            matchCount: factMatches.length,
            matches: factMatches
          });
        }
      } catch (err) {
        console.log(\`⚠️ [search_memory] personal_facts.json error: \${err.message}\`);
      }
    }

    // 1. Recherche dans le fichier de conversation Ana (texte simple)
    const conversationPath = 'E:/ANA/memory/current_conversation_ana.txt';`;

if (content.includes(oldSearchPart1)) {
  content = content.replace(oldSearchPart1, newSearchPart1);
  fs.writeFileSync(path, content);
  console.log('✓ search_memory corrigé - ajout ana_memories.json + personal_facts.json');
} else {
  console.log('⚠ Pattern non trouvé - vérifier manuellement');
}
