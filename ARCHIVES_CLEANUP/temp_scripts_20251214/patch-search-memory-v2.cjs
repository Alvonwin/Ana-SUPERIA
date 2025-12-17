const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';

// Backup first
const backupPath = path + '.backup_' + Date.now();
fs.copyFileSync(path, backupPath);
console.log(`✓ Backup créé: ${backupPath}`);

let content = fs.readFileSync(path, 'utf8');

// Ancien code de recherche dans personal_facts (lignes 929-935)
const oldFactSearch = `        // Chercher dans les faits
        if (factsData.facts) {
          for (const [key, value] of Object.entries(factsData.facts)) {
            if (key.toLowerCase().includes(queryLower) ||
                (typeof value === 'string' && value.toLowerCase().includes(queryLower))) {
              factMatches.push({ key, value });
            }
          }
        }`;

// Nouveau code avec matching amélioré (underscore = espace, synonymes)
const newFactSearch = `        // Chercher dans les faits avec matching intelligent
        if (factsData.facts) {
          // Normaliser: "date de naissance" -> "date_de_naissance" et vice-versa
          const normalizeForMatch = (str) => str.toLowerCase().replace(/[_ ]/g, '');
          const queryNorm = normalizeForMatch(query);

          // Synonymes courants
          const synonyms = {
            'anniversaire': ['naissance', 'date_naissance', 'birthday'],
            'naissance': ['anniversaire', 'date_naissance', 'birthday'],
            'voiture': ['auto', 'vehicule', 'car'],
            'auto': ['voiture', 'vehicule', 'car']
          };

          for (const [key, value] of Object.entries(factsData.facts)) {
            const keyNorm = normalizeForMatch(key);
            const valueNorm = typeof value === 'string' ? normalizeForMatch(value) : '';

            // Match direct (normalisé)
            let matched = keyNorm.includes(queryNorm) || queryNorm.includes(keyNorm) || valueNorm.includes(queryNorm);

            // Match par synonymes
            if (!matched) {
              const queryWords = query.toLowerCase().split(/[_ ]/);
              for (const word of queryWords) {
                if (synonyms[word]) {
                  for (const syn of synonyms[word]) {
                    if (keyNorm.includes(normalizeForMatch(syn))) {
                      matched = true;
                      break;
                    }
                  }
                }
                if (matched) break;
              }
            }

            if (matched) {
              factMatches.push({ key, value });
            }
          }
        }`;

if (content.includes('// Chercher dans les faits')) {
  content = content.replace(oldFactSearch, newFactSearch);
  fs.writeFileSync(path, content);
  console.log('✓ search_memory amélioré avec matching intelligent');
} else {
  console.log('⚠ Pattern non trouvé - fichier peut-être déjà modifié?');
}
