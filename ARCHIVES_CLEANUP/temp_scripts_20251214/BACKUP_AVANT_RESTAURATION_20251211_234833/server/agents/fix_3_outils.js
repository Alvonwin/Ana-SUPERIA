const fs = require('fs');

// Fichier source et destination
const source = 'E:/ANA/server/agents/tool-agent.cjs';
const backup = 'E:/ANA/server/agents/tool-agent.cjs.backup_20251204_avant_fix_3_outils';

console.log('📖 Backup du fichier original...');
fs.copyFileSync(source, backup);
console.log('✅ Backup créé:', backup);

console.log('📖 Lecture du fichier source...');
let content = fs.readFileSync(source, 'utf-8');

// === FIX 1: ask_groq ===
// Ancien code:
// async ask_groq(args) {
//   const { question, model = 'llama-3.1-70b-versatile' } = args;
//   console.log(`🔧 [ToolAgent] ask_groq: "${question.substring(0, 50)}..."`);
//   const groqService = require('../services/groq-service.cjs');
//   const result = await groqService.chat(question, { model });

const oldAskGroq = `async ask_groq(args) {
    const { question, model = 'llama-3.1-70b-versatile' } = args;
    console.log(\`🔧 [ToolAgent] ask_groq: "\${question.substring(0, 50)}..."\`);
    const groqService = require('../services/groq-service.cjs');
    const result = await groqService.chat(question, { model });`;

const newAskGroq = `async ask_groq(args) {
    const { question, prompt, model = 'llama-3.1-70b-versatile' } = args;
    const q = question || prompt || '';
    if (!q) {
      return { success: false, error: 'Paramètre question ou prompt requis', provider: 'groq' };
    }
    console.log(\`🔧 [ToolAgent] ask_groq: "\${q.substring(0, 50)}..."\`);
    const groqService = require('../services/groq-service.cjs');
    const result = await groqService.chat(q, { model });`;

if (content.includes(oldAskGroq)) {
  content = content.replace(oldAskGroq, newAskGroq);
  console.log('✅ ask_groq corrigé - accepte maintenant question OU prompt');
} else {
  console.log('⚠️ ask_groq: pattern non trouvé (peut-être déjà corrigé)');
}

// === FIX 2: ask_cerebras ===
const oldAskCerebras = `async ask_cerebras(args) {
    const { question, model = 'llama3.1-8b' } = args;
    console.log(\`🔧 [ToolAgent] ask_cerebras: "\${question.substring(0, 50)}..."\`);
    const cerebrasService = require('../services/cerebras-service.cjs');
    const result = await cerebrasService.chat(question, { model });`;

const newAskCerebras = `async ask_cerebras(args) {
    const { question, prompt, model = 'llama3.1-8b' } = args;
    const q = question || prompt || '';
    if (!q) {
      return { success: false, error: 'Paramètre question ou prompt requis', provider: 'cerebras' };
    }
    console.log(\`🔧 [ToolAgent] ask_cerebras: "\${q.substring(0, 50)}..."\`);
    const cerebrasService = require('../services/cerebras-service.cjs');
    const result = await cerebrasService.chat(q, { model });`;

if (content.includes(oldAskCerebras)) {
  content = content.replace(oldAskCerebras, newAskCerebras);
  console.log('✅ ask_cerebras corrigé - accepte maintenant question OU prompt');
} else {
  console.log('⚠️ ask_cerebras: pattern non trouvé (peut-être déjà corrigé)');
}

// === FIX 3: todo_write ===
// On ajoute le support pour le format { todos: [...] } en plus de { action, task, task_id }
const oldTodoWrite = `async todo_write(args) {
    const { action, task, task_id } = args;
    console.log(\`🔧 [ToolAgent] todo_write: \${action}\`);`;

const newTodoWrite = `async todo_write(args) {
    const { action, task, task_id, todos } = args;

    // Support du format todos array (comme Claude Code)
    if (todos && Array.isArray(todos)) {
      console.log(\`🔧 [ToolAgent] todo_write: mise à jour de \${todos.length} tâches\`);
      const fs = require('fs');
      const todoPath = 'E:/ANA/memory/ana_todos.json';
      const formattedTodos = todos.map((t, i) => ({
        id: Date.now() + i,
        task: t.content || t.task || t.description || 'Sans titre',
        status: t.status || 'pending',
        activeForm: t.activeForm || '',
        created: new Date().toISOString()
      }));
      fs.writeFileSync(todoPath, JSON.stringify(formattedTodos, null, 2));
      return { success: true, message: \`\${todos.length} tâches enregistrées\`, todos: formattedTodos };
    }

    console.log(\`🔧 [ToolAgent] todo_write: \${action}\`);`;

if (content.includes(oldTodoWrite)) {
  content = content.replace(oldTodoWrite, newTodoWrite);
  console.log('✅ todo_write corrigé - accepte maintenant le format todos array');
} else {
  console.log('⚠️ todo_write: pattern non trouvé (peut-être déjà corrigé)');
}

// Écrire le fichier corrigé
fs.writeFileSync(source, content, 'utf-8');
console.log('✅ Fichier corrigé écrit:', source);

// Vérifier la syntaxe
console.log('\n🔍 Vérification de la syntaxe...');
try {
  delete require.cache[require.resolve(source)];
  require(source);
  console.log('✅ Syntaxe valide - Module charge correctement!');
  console.log('\n🎉 SUCCÈS: Les 3 outils ont été corrigés!');
} catch (e) {
  console.log('❌ Erreur de syntaxe:', e.message);
  console.log('\n⚠️ Restauration du backup...');
  fs.copyFileSync(backup, source);
  console.log('✅ Fichier restauré depuis le backup');
}
