const fs = require('fs');
const path = 'E:/ANA/server/agents/tool-agent.cjs';

// Backup
const backup = path + '.backup_save_memory_' + Date.now();
fs.copyFileSync(path, backup);
console.log('Backup:', backup);

let content = fs.readFileSync(path, 'utf8');

// 1. Ajouter save_memory DEFINITION apres search_memory definition
const searchMemoryDefEnd = '// === EDIT FILE TOOL ===';
const saveMemoryDef = `// === SAVE MEMORY TOOL ===
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description: 'Sauvegarder une information importante en memoire pour m en souvenir plus tard. Utiliser quand Alain dit souviens-toi, retiens ca, n oublie pas.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'L information a memoriser.' },
          category: { type: 'string', description: 'Categorie du souvenir (fait, preference, projet, etc.)', default: 'general' }
        },
        required: ['content']
      }
    }
  },
  `;

if (!content.includes("name: 'save_memory'")) {
  content = content.replace(searchMemoryDefEnd, saveMemoryDef + searchMemoryDefEnd);
  console.log('Added save_memory definition');
} else {
  console.log('save_memory definition already exists');
}

// 2. Ajouter save_memory IMPLEMENTATION apres search_memory implementation
const searchMemoryImplEnd = '// === 10 NEW TOOL IMPLEMENTATIONS ===';
const saveMemoryImpl = `// === SAVE MEMORY IMPLEMENTATION ===
  async save_memory(args) {
    const { content, category = 'general' } = args;
    console.log('[ToolAgent] save_memory:', content.substring(0, 50));

    const fs = require('fs');
    const path = require('path');

    // Dossier de memoire Ana
    const memoryDir = 'E:/ANA/memory';
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }

    // Fichier de memoire principale
    const memoryFile = path.join(memoryDir, 'ana_memories.json');
    let memories = [];

    if (fs.existsSync(memoryFile)) {
      try {
        memories = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'));
      } catch (e) {
        memories = [];
      }
    }

    // Ajouter le nouveau souvenir
    const memory = {
      id: Date.now().toString(),
      content: content,
      category: category,
      timestamp: new Date().toISOString(),
      source: 'user_request'
    };

    memories.push(memory);

    // Sauvegarder
    fs.writeFileSync(memoryFile, JSON.stringify(memories, null, 2), 'utf-8');

    // Aussi ajouter au fichier de conversation
    const convFile = path.join(memoryDir, 'current_conversation_ana.txt');
    const line = '[MEMOIRE ' + new Date().toISOString() + '] [' + category + '] ' + content + '\\n';
    fs.appendFileSync(convFile, line, 'utf-8');

    return {
      success: true,
      message: 'J ai memorise: ' + content.substring(0, 100),
      id: memory.id,
      category: category
    };
  },

  `;

if (!content.includes('async save_memory(args)')) {
  content = content.replace(searchMemoryImplEnd, saveMemoryImpl + searchMemoryImplEnd);
  console.log('Added save_memory implementation');
} else {
  console.log('save_memory implementation already exists');
}

fs.writeFileSync(path, content, 'utf8');
console.log('File saved successfully');
