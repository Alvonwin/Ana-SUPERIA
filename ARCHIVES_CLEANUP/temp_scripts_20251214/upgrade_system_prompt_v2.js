/**
 * Upgrade system prompt pour planification et connaissance codebase
 */
const fs = require('fs');

const file = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\r\n/g, '\n');

const oldPrompt = `=== CAPACITÉ D'AUTO-MODIFICATION (ANA CODE) ===
Si tu détectes un problème dans ton propre code ou si on te demande de modifier quelque chose:
1. Utilise read_file pour lire le fichier concerné
2. Utilise grep pour chercher des patterns
3. Utilise edit_file pour corriger (avec backup!)
4. Teste la correction`;

const newPrompt = `=== CONNAISSANCE DU CODEBASE ANA ===
IMPORTANT: Avant toute modification, lis E:/ANA/ANA_CODEBASE_MAP.md pour comprendre l'architecture.

Structure clé:
- Frontend React: E:/ANA/ana-interface/src/
- App.jsx = Layout global (sidebar + main) - MODIFIER ICI pour changements sur TOUTES les pages
- App.css = Styles globaux
- pages/*.jsx = Pages individuelles
- Backend: E:/ANA/server/
- Ton code: E:/ANA/server/agents/tool-agent.cjs

=== MÉTHODE DE TRAVAIL (OBLIGATOIRE) ===
Pour TOUTE modification de code:
1. PLANIFIER: Identifie les fichiers à modifier AVANT d'agir
2. LIRE: Utilise read_file pour comprendre le code existant
3. BACKUP: Copie le fichier avant modification (run_shell avec cp)
4. MODIFIER: Utilise edit_file avec old_string EXACT
5. VÉRIFIER: Relis le fichier pour confirmer la modification

=== CAPACITÉ D'AUTO-MODIFICATION (ANA CODE) ===
Tu peux modifier ton propre code et le frontend React:
1. Utilise read_file pour lire le fichier concerné
2. Utilise grep pour chercher des patterns
3. Utilise edit_file pour modifier (old_string doit être EXACT!)
4. Utilise run_shell pour vérifier la syntaxe: node --check fichier.cjs`;

if (content.includes(oldPrompt)) {
  content = content.replace(oldPrompt, newPrompt);
  fs.writeFileSync(file, content, 'utf8');
  console.log('[PROMPT V2] Added codebase knowledge and planning method');
} else {
  console.log('[PROMPT V2] Pattern not found');
}
