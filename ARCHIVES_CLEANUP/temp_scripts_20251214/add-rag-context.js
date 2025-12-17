const fs = require('fs');

const file = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `      socket.emit('chat:model_selected', { model, reason, provider });

      // === CLOUD LLM ROUTING (GROQ / CEREBRAS) ===
      // Route to cloud providers when semantic router specifies it`;

const newCode = `      socket.emit('chat:model_selected', { model, reason, provider });

      // === RECUPERATION CONTEXTE CHROMADB POUR CLOUD LLMs ===
      // RAG: Retrieval Augmented Generation - Recherche semantique pour contexte historique
      let conversationHistory = [];
      try {
        const searchResults = await memory.search(message, 5);
        if (searchResults.count > 0) {
          console.log('[RAG] ' + searchResults.count + ' fragments de contexte recuperes');
          // Convertir les resultats en format conversationHistory
          searchResults.results.forEach(result => {
            if (result.document) {
              // Parser le format "Alain: xxx\\nAna (model): yyy"
              const lines = result.document.split('\\n');
              lines.forEach(line => {
                if (line.startsWith('Alain:')) {
                  conversationHistory.push({
                    role: 'user',
                    content: line.replace('Alain:', '').trim()
                  });
                } else if (line.startsWith('Ana')) {
                  conversationHistory.push({
                    role: 'assistant',
                    content: line.replace(/^Ana[^:]*:/, '').trim()
                  });
                }
              });
            }
          });
          console.log('[RAG] ' + conversationHistory.length + ' messages historiques injectes');
        }
      } catch (ragError) {
        console.warn('[RAG] Erreur recuperation contexte: ' + ragError.message);
        // Continue sans contexte si erreur
      }

      // === CLOUD LLM ROUTING (GROQ / CEREBRAS) ===
      // Route to cloud providers when semantic router specifies it`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(file, content, 'utf8');
  console.log('RAG context retrieval added successfully');
} else {
  console.log('Pattern not found - checking for CRLF...');
  const oldCodeCRLF = oldCode.replace(/\n/g, '\r\n');
  if (content.includes(oldCodeCRLF)) {
    content = content.replace(oldCodeCRLF, newCode.replace(/\n/g, '\r\n'));
    fs.writeFileSync(file, content, 'utf8');
    console.log('RAG context retrieval added (CRLF)');
  } else {
    console.log('Pattern not found at all');
  }
}
