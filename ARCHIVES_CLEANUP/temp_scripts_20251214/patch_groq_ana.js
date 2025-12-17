// Mettre la robe Ana sur Groq
const fs = require('fs');

// 1. GROQ SERVICE - Ajouter personnalité Ana complète
const groqPath = 'E:/ANA/server/services/groq-service.cjs';
let groqContent = fs.readFileSync(groqPath, 'utf8');

const oldPrompt = `systemPrompt = "Tu es Ana, une IA francaise. Reponds toujours en francais."`;
const newPrompt = `systemPrompt = \`TU ES ANA SUPERIA.

IDENTITE NON-NEGOCIABLE:
- Nom: Ana SUPERIA (Assistante Numerique Avancee)
- Createur: Alain, a Longueuil, Quebec
- Tu n'es PAS un "modele de langage", tu n'es PAS "Llama", tu n'es PAS "Meta"

QUAND ON TE DEMANDE QUI TU ES:
Reponds: "Je suis Ana SUPERIA, ton assistante personnelle!"

REGLES ABSOLUES:
1. TUTOIEMENT: Tu dis toujours tu/ton/ta/tes, JAMAIS vous/votre/vos
2. FRANCAIS: Tu reponds TOUJOURS en francais
3. TON: Chaleureuse, directe, utile
4. PAS D'ASTERISQUES: N'utilise JAMAIS *texte* ou **texte**
5. CONCISE: Reponds de facon claire et directe, pas de blabla

EXEMPLES:
Q: Qui es-tu? R: Je suis Ana SUPERIA, ton assistante personnelle!
Q: Comment vas-tu? R: Je vais bien, merci! Comment puis-je t'aider?\``;

groqContent = groqContent.replace(oldPrompt, newPrompt);
// Aussi remplacer la 2e occurrence
groqContent = groqContent.replace(oldPrompt, newPrompt);

fs.writeFileSync(groqPath, groqContent, 'utf8');
console.log('✓ groq-service.cjs: Personnalité Ana ajoutée');

// 2. LLM ORCHESTRATOR - Groq en premier
const orchPath = 'E:/ANA/server/core/llm-orchestrator.cjs';
let orchContent = fs.readFileSync(orchPath, 'utf8');

// Mettre Groq en premier dans la chaîne
const oldChain = `const LLM_CHAIN = [
  { name: 'ollama', model: 'ana-superia-v6', type: 'local' },     // PRINCIPAL 80-90%
  { name: 'ollama', model: 'qwen3:8b', type: 'local' },          // Fallback
  { name: 'groq', model: 'llama-3.3-70b-versatile', type: 'cloud' }, // Fallback cloud
  { name: 'ollama', model: 'llama3.1:8b', type: 'local' }        // Fallback final
];`;

const newChain = `const LLM_CHAIN = [
  { name: 'groq', model: 'llama-3.3-70b-versatile', type: 'cloud' }, // PRINCIPAL - Ana avec Groq
  { name: 'ollama', model: 'ana-superia-v6', type: 'local' },     // Fallback local 1
  { name: 'ollama', model: 'qwen3:8b', type: 'local' },          // Fallback local 2
  { name: 'ollama', model: 'llama3.1:8b', type: 'local' }        // Fallback final
];`;

orchContent = orchContent.replace(oldChain, newChain);
fs.writeFileSync(orchPath, orchContent, 'utf8');
console.log('✓ llm-orchestrator.cjs: Groq en premier');

console.log('\n🎀 Ana a sa robe Groq! Redémarre Ana.');
