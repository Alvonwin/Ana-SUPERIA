/**
 * Script pour ajouter la memoire de session courte a ana-core.cjs
 * Modification atomique et fiable
 */
const fs = require('fs');

const FILE = 'E:/ANA/server/ana-core.cjs';

// Lire le fichier
let content = fs.readFileSync(FILE, 'utf8');

// 1. Modifier le constructeur MemoryManager
const oldConstructor = `class MemoryManager {
  constructor() {
    this.contextPath = path.join(MEMORY_PATH, 'current_conversation.txt');
    this.anaContextPath = 'E:/ANA/memory/current_conversation_ana.txt';
    this.currentContext = '';
    this.loadContext();
  }`;

const newConstructor = `class MemoryManager {
  constructor() {
    this.contextPath = path.join(MEMORY_PATH, 'current_conversation.txt');
    this.anaContextPath = 'E:/ANA/memory/current_conversation_ana.txt';
    this.currentContext = '';
    // SESSION MEMORY: Buffer RAM des 20 derniers messages (priorite maximale)
    this.sessionMessages = [];
    this.MAX_SESSION_MESSAGES = 20; // Grande capacite, petit buffer
    this.loadContext();
    console.log('[MEMORY] Session buffer initialise: max', this.MAX_SESSION_MESSAGES, 'messages');
  }`;

if (content.includes('this.sessionMessages')) {
  console.log('Session memory deja presente!');
} else if (content.includes(oldConstructor)) {
  content = content.replace(oldConstructor, newConstructor);
  console.log('Constructeur modifie avec session buffer');
} else {
  console.log('ERREUR: Constructeur non trouve, modification manuelle requise');
  process.exit(1);
}

// 2. Modifier appendToContext
const oldAppend = `  appendToContext(text) {
    this.currentContext += '\\n' + text;
    this.saveContext();
  }`;

const newAppend = `  appendToContext(text) {
    this.currentContext += '\\n' + text;
    this.saveContext();

    // Ajouter au buffer de session (priorite maximale)
    this.sessionMessages.push({
      text: text,
      timestamp: Date.now()
    });
    // Garder seulement les N derniers messages
    if (this.sessionMessages.length > this.MAX_SESSION_MESSAGES) {
      this.sessionMessages.shift();
    }
    console.log('[SESSION] Buffer:', this.sessionMessages.length, '/', this.MAX_SESSION_MESSAGES, 'messages');
  }

  // Retourne les derniers messages de la session en cours (RAM)
  getSessionContext() {
    if (this.sessionMessages.length === 0) return '';
    const sessionText = this.sessionMessages.map(m => m.text).join('\\n');
    return sessionText;
  }

  // Efface le buffer de session (pour nouvelle conversation)
  clearSession() {
    this.sessionMessages = [];
    console.log('[SESSION] Buffer efface');
  }`;

if (content.includes('getSessionContext')) {
  console.log('getSessionContext deja present');
} else if (content.includes(oldAppend)) {
  content = content.replace(oldAppend, newAppend);
  console.log('appendToContext modifie avec session buffer');
} else {
  console.log('ERREUR: appendToContext non trouve');
  process.exit(1);
}

// 3. Modifier le /api/chat pour utiliser session context
const oldContext = `    // Formatter le contexte avec des instructions claires pour le LLM
    const contextInstructions = (memoryContext || chromaMemories) ? \`
=== MÉMOIRE DE CONVERSATION ===`;

const newContext = `    // SESSION CONTEXT: Les 20 derniers messages (PRIORITE MAXIMALE)
    const sessionContext = memory.getSessionContext();

    // Formatter le contexte - SESSION EN PREMIER
    let contextInstructions = '';

    // 1. Session courte (priorite maximale - toujours visible)
    if (sessionContext) {
      contextInstructions += \`
=== CONVERSATION EN COURS (TU DOIS LIRE CECI EN PREMIER!) ===
**CRITIQUE: Voici les derniers echanges. Tu DOIS te souvenir de TOUT ce qui est dit ici.**
Si Alain te pose une question sur quelque chose dit dans cette session, LA REPONSE EST ICI.

\${sessionContext}
=== FIN CONVERSATION EN COURS ===

\`;
    }

    // 2. Memoire long terme (contexte supplementaire)
    const contextInstructionsOld = (memoryContext || chromaMemories) ? \`
=== MÉMOIRE DE CONVERSATION ===`;

if (content.includes('getSessionContext()')) {
  console.log('Session context deja utilise dans /api/chat');
} else if (content.includes(oldContext)) {
  content = content.replace(oldContext, newContext);
  console.log('/api/chat modifie pour utiliser session context');
} else {
  // Essayer une autre variante
  const oldContextAlt = `    // Formatter le contexte avec des instructions claires pour le LLM`;
  if (content.includes(oldContextAlt)) {
    console.log('Variante trouvee, insertion manuelle requise');
  } else {
    console.log('ATTENTION: Section /api/chat non trouvee, insertion manuelle requise');
  }
}

// Sauvegarder
fs.writeFileSync(FILE, content, 'utf8');
console.log('Fichier sauvegarde avec succes!');
