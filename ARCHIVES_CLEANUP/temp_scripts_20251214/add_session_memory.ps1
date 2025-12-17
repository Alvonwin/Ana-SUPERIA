# Script pour ajouter la memoire de session courte a ana-core.cjs
$file = 'E:/ANA/server/ana-core.cjs'
$content = Get-Content $file -Raw -Encoding UTF8

# 1. Modifier le constructeur de MemoryManager
$oldConstructor = @'
class MemoryManager {
  constructor() {
    this.contextPath = path.join(MEMORY_PATH, 'current_conversation.txt');
    this.anaContextPath = 'E:/ANA/memory/current_conversation_ana.txt';
    this.currentContext = '';
    this.loadContext();
  }
'@

$newConstructor = @'
class MemoryManager {
  constructor() {
    this.contextPath = path.join(MEMORY_PATH, 'current_conversation.txt');
    this.anaContextPath = 'E:/ANA/memory/current_conversation_ana.txt';
    this.currentContext = '';
    // SESSION MEMORY: Buffer RAM des 20 derniers messages (priorite maximale)
    this.sessionMessages = [];
    this.MAX_SESSION_MESSAGES = 20; // Grande capacite avec petit buffer
    this.loadContext();
    console.log('[MEMORY] Session buffer initialise: max', this.MAX_SESSION_MESSAGES, 'messages');
  }
'@

$content = $content.Replace($oldConstructor, $newConstructor)

# 2. Modifier appendToContext pour aussi ajouter au buffer session
$oldAppend = @'
  appendToContext(text) {
    this.currentContext += '\n' + text;
    this.saveContext();
  }
'@

$newAppend = @'
  appendToContext(text) {
    this.currentContext += '\n' + text;
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

    const sessionText = this.sessionMessages.map(m => m.text).join('\n');
    return sessionText;
  }

  // Efface le buffer de session (pour nouvelle conversation)
  clearSession() {
    this.sessionMessages = [];
    console.log('[SESSION] Buffer efface');
  }
'@

$content = $content.Replace($oldAppend, $newAppend)

Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host "Session memory added to MemoryManager!"
