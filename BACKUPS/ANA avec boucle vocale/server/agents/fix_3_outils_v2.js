const fs = require('fs');

// Fichier source
const source = 'E:/ANA/server/agents/tool-agent.cjs';
const backup = 'E:/ANA/server/agents/tool-agent.cjs.backup_20251204_v2';

console.log('📖 Backup du fichier original...');
fs.copyFileSync(source, backup);
console.log('✅ Backup créé:', backup);

console.log('📖 Lecture du fichier source...');
let content = fs.readFileSync(source, 'utf-8');
let modified = false;

// === FIX 1: ask_groq ===
// Pattern plus flexible avec regex
const askGroqPattern = /(async ask_groq\(args\) \{\s*const \{ question,)/;
if (askGroqPattern.test(content) && !content.includes('const q = question || prompt')) {
  content = content.replace(
    /async ask_groq\(args\) \{\s*const \{ question, model = 'llama-3\.1-70b-versatile' \} = args;\s*console\.log\(`🔧 \[ToolAgent\] ask_groq: "\$\{question\.substring\(0, 50\)\}\.\.\."`\);\s*const groqService = require\('\.\.\/services\/groq-service\.cjs'\);\s*const result = await groqService\.chat\(question, \{ model \}\);/,
    `async ask_groq(args) {
    const { question, prompt, model = 'llama-3.1-70b-versatile' } = args;
    const q = question || prompt || '';
    if (!q) {
      return { success: false, error: 'Paramètre question ou prompt requis', provider: 'groq' };
    }
    console.log(\`🔧 [ToolAgent] ask_groq: "\${q.substring(0, 50)}..."\`);
    const groqService = require('../services/groq-service.cjs');
    const result = await groqService.chat(q, { model });`
  );
  console.log('✅ ask_groq corrigé');
  modified = true;
} else if (content.includes('const q = question || prompt')) {
  console.log('⚠️ ask_groq: déjà corrigé');
} else {
  console.log('❌ ask_groq: pattern non trouvé');
}

// === FIX 2: ask_cerebras ===
const askCerebrasPattern = /(async ask_cerebras\(args\) \{\s*const \{ question,)/;
if (askCerebrasPattern.test(content) && !content.includes("// Fixed cerebras")) {
  content = content.replace(
    /async ask_cerebras\(args\) \{\s*const \{ question, model = 'llama3\.1-8b' \} = args;\s*console\.log\(`🔧 \[ToolAgent\] ask_cerebras: "\$\{question\.substring\(0, 50\)\}\.\.\."`\);\s*const cerebrasService = require\('\.\.\/services\/cerebras-service\.cjs'\);\s*const result = await cerebrasService\.chat\(question, \{ model \}\);/,
    `async ask_cerebras(args) {
    const { question, prompt, model = 'llama3.1-8b' } = args;
    const q = question || prompt || '';
    if (!q) {
      return { success: false, error: 'Paramètre question ou prompt requis', provider: 'cerebras' };
    }
    console.log(\`🔧 [ToolAgent] ask_cerebras: "\${q.substring(0, 50)}..."\`);
    const cerebrasService = require('../services/cerebras-service.cjs');
    const result = await cerebrasService.chat(q, { model });`
  );
  console.log('✅ ask_cerebras corrigé');
  modified = true;
} else {
  console.log('⚠️ ask_cerebras: déjà corrigé ou pattern non trouvé');
}

// === FIX 3: todo_write ===
const todoWritePattern = /(async todo_write\(args\) \{\s*const \{ action, task, task_id \} = args;)/;
if (todoWritePattern.test(content) && !content.includes('todos && Array.isArray(todos)')) {
  content = content.replace(
    /async todo_write\(args\) \{\s*const \{ action, task, task_id \} = args;\s*console\.log\(`🔧 \[ToolAgent\] todo_write: \$\{action\}`\);/,
    `async todo_write(args) {
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

    console.log(\`🔧 [ToolAgent] todo_write: \${action}\`);`
  );
  console.log('✅ todo_write corrigé');
  modified = true;
} else if (content.includes('todos && Array.isArray(todos)')) {
  console.log('⚠️ todo_write: déjà corrigé');
} else {
  console.log('❌ todo_write: pattern non trouvé');
}

if (modified) {
  fs.writeFileSync(source, content, 'utf-8');
  console.log('✅ Fichier modifié écrit');

  // Vérifier la syntaxe
  console.log('\n🔍 Vérification de la syntaxe...');
  try {
    delete require.cache[require.resolve(source)];
    require(source);
    console.log('✅ Syntaxe valide - Module charge correctement!');
    console.log('\n🎉 SUCCÈS: Les outils ont été corrigés!');
  } catch (e) {
    console.log('❌ Erreur de syntaxe:', e.message);
    console.log('\n⚠️ Restauration du backup...');
    fs.copyFileSync(backup, source);
    console.log('✅ Fichier restauré depuis le backup');
  }
} else {
  console.log('\n⚠️ Aucune modification nécessaire');
}
