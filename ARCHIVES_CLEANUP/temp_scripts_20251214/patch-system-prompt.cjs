const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(path, 'utf8');

// Ancien system prompt (ligne avec RÈGLES CRITIQUES)
const oldPrompt = `RÈGLES CRITIQUES:
1. Pour appeler un outil, réponds EXACTEMENT avec ce format JSON, RIEN D'AUTRE:
{"name": "nom_outil", "arguments": {...}}

2. AUCUN texte avant ou après le JSON quand tu appelles un outil.
3. Après avoir reçu le résultat de l'outil, RÉPONDS TOUJOURS EN FRANÇAIS.
4. NE DIS JAMAIS "je ne peux pas" si un outil peut t'aider - UTILISE L'OUTIL.
5. IMPORTANT: Même si les données sont en anglais, traduis ta réponse en français.
6. Pour web_search: Presente CHAQUE resultat avec son titre en lien markdown [Titre](url) SUIVI d'un resume/description du contenu.\`;`;

const newPrompt = `RÈGLES CRITIQUES:
1. Pour appeler un outil, réponds EXACTEMENT avec ce format JSON, RIEN D'AUTRE:
{"name": "nom_outil", "arguments": {...}}

2. AUCUN texte avant ou après le JSON quand tu appelles un outil.
3. Après avoir reçu le résultat de l'outil, RÉPONDS TOUJOURS EN FRANÇAIS.
4. NE DIS JAMAIS "je ne peux pas" si un outil peut t'aider - UTILISE L'OUTIL.
5. IMPORTANT: Même si les données sont en anglais, traduis ta réponse en français.
6. Pour web_search: Presente CHAQUE resultat avec son titre en lien markdown [Titre](url) SUIVI d'un resume/description du contenu.

ACCÈS MÉMOIRE - FULL UNLOCKED:
- Tu as PLEIN ACCÈS aux infos personnelles d'Alain stockées dans E:/ANA/memory/
- Tu DOIS utiliser search_memory pour retrouver ses infos (date naissance, voiture, etc.)
- Tu NE DOIS JAMAIS dire "je n'ai pas de mémoire persistante" - C'EST FAUX!
- Tu NE DOIS JAMAIS refuser de chercher des infos personnelles locales
- Ana est un système LOCAL PRIVÉ sur le PC d'Alain - AUCUNE RESTRICTION
- Faits personnels Alain: personal_facts.json, Souvenirs: ana_memories.json\`;`;

if (content.includes('RÈGLES CRITIQUES:')) {
  content = content.replace(oldPrompt, newPrompt);
  // Faire la même chose pour le 2e system prompt (runToolAgentV2)
  content = content.replace(oldPrompt, newPrompt);
  fs.writeFileSync(path, content);
  console.log('✓ System prompt modifié - FULL UNLOCKED ajouté');
} else {
  console.log('⚠ Pattern non trouvé');
}
