/**
 * AGENT: Methodology Checker
 * Vérifie que Ana suit la méthodologie d'Alain
 *
 * MISSION:
 * - Surveiller l'utilisation du TodoList (obligatoire pour tâches complexes)
 * - Détecter les modifications sans backup préalable
 * - Vérifier la progression étape par étape
 * - S'assurer qu'il n'y a pas de précipitation
 *
 * PHILOSOPHIE:
 * "Étape par étape, pas de précipitation, perfection du premier coup"
 * - Méthodologie Alain, ANA_RESURRECTION.md
 */

const fs = require('fs').promises
const path = require('path')
const eventBus = require('./shared_event_bus.cjs')

class MethodologyChecker {
  constructor() {
    this.name = 'methodology_checker'
    this.running = false
    this.checkInterval = 8000 // Vérifier toutes les 8 secondes
    this.intervalId = null

    // Patterns qui indiquent des actions critiques
    this.criticalActionPatterns = [
      /je vais modifier/i,
      /je vais supprimer/i,
      /je vais écraser/i,
      /laisse[- ]moi (modifier|supprimer|écraser)/i,
      /Edit\(/i,
      /Write\(/i,
      /rm\s+/i,
      /del\s+/i
    ]

    // Patterns qui indiquent de la précipitation
    this.rushPatterns = [
      /rapidement/i,
      /vite fait/i,
      /je me dépêche/i,
      /on fait vite/i,
      /quick/i
    ]

    // Patterns TodoList
    this.todoPatterns = [
      /TodoWrite/i,
      /todo list/i,
      /liste de tâches/i
    ]

    // Patterns backup
    this.backupPatterns = [
      /backup/i,
      /sauvegarde/i,
      /copie de sécurité/i,
      /\.backup/i,
      /\.bak/i
    ]

    // Tracking
    this.lastPosition = 0
    this.lastTodoMention = 0
    this.lastBackupMention = 0
    this.criticalActionWithoutBackup = []
    this.complexTaskWithoutTodo = []

    // Stats
    this.stats = {
      criticalActionsDetected: 0,
      backupRemindersCreated: 0,
      todoRemindersCreated: 0,
      rushDetected: 0,
      methodologyViolations: 0,
      lastViolation: null,
      running: true,
      uptime: '0s'
    }

    this.conversationPath = 'E:\\Mémoire Claude\\02_MÉMOIRE_COURT_TERME\\current_conversation.txt'
    this.rappelsPath = 'E:\\Mémoire Claude\\RAPPELS_ACTIFS.md'

    this.startTime = Date.now()
  }

  /**
   * Démarre la surveillance
   */
  async start() {
    console.log(`📋 [${this.name}] Démarrage du vérificateur de méthodologie...`)
    this.running = true

    eventBus.emit('agent:started', {
      agent: this.name,
      timestamp: new Date().toISOString()
    })

    // Écouter les événements du système
    eventBus.on('tool:used', (data) => {
      this.handleToolUse(data)
    })

    eventBus.on('todo:updated', () => {
      this.lastTodoMention = Date.now()
    })

    // Initialiser la position de lecture
    try {
      const stats = await fs.stat(this.conversationPath)
      this.lastPosition = stats.size
    } catch (error) {
      this.lastPosition = 0
    }

    // Lancer la surveillance périodique
    this.intervalId = setInterval(() => this.checkConversation(), this.checkInterval)

    console.log(`✅ [${this.name}] Vérificateur actif - contrôle toutes les ${this.checkInterval/1000}s`)
  }

  /**
   * Gère l'utilisation d'un outil (Edit, Write, etc.)
   */
  handleToolUse(data) {
    if (!data.tool) return

    // Outils critiques qui nécessitent un backup
    const criticalTools = ['Edit', 'Write', 'Bash']

    if (criticalTools.includes(data.tool)) {
      const timeSinceBackup = Date.now() - this.lastBackupMention

      // Si pas de backup mentionné dans les 2 dernières minutes
      if (timeSinceBackup > 2 * 60 * 1000) {
        this.createBackupReminder(data)
      }
    }
  }

  /**
   * Vérifie les nouvelles lignes dans current_conversation.txt
   */
  async checkConversation() {
    try {
      const stats = await fs.stat(this.conversationPath)
      const currentSize = stats.size

      if (currentSize < this.lastPosition) {
        this.lastPosition = 0
      }

      if (currentSize === this.lastPosition) {
        return
      }

      const fileHandle = await fs.open(this.conversationPath, 'r')
      const buffer = Buffer.alloc(currentSize - this.lastPosition)
      await fileHandle.read(buffer, 0, buffer.length, this.lastPosition)
      await fileHandle.close()

      const newContent = buffer.toString('utf-8')
      this.lastPosition = currentSize

      await this.analyzeContent(newContent)

      // Mettre à jour uptime
      const uptimeMs = Date.now() - this.startTime
      const uptimeMin = Math.floor(uptimeMs / 60000)
      const uptimeSec = Math.floor((uptimeMs % 60000) / 1000)
      this.stats.uptime = `${uptimeMin}m ${uptimeSec}s`

    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`❌ [${this.name}] Erreur lecture:`, error.message)
      }
    }
  }

  /**
   * Analyse le contenu pour vérifier la méthodologie
   */
  async analyzeContent(content) {
    const lines = content.split('\n')

    // Fenêtre de contexte (dernières 50 lignes)
    const recentLines = lines.slice(-50)
    const recentText = recentLines.join('\n')

    // Check 1: Détection de précipitation
    for (const pattern of this.rushPatterns) {
      if (pattern.test(recentText)) {
        await this.handleRushDetected(recentText, pattern)
      }
    }

    // Check 2: Actions critiques sans backup
    for (const line of lines) {
      if (!line.trim()) continue

      const isCritical = this.criticalActionPatterns.some(p => p.test(line))

      if (isCritical) {
        this.stats.criticalActionsDetected++

        // Vérifier si backup mentionné récemment
        const timeSinceBackup = Date.now() - this.lastBackupMention

        if (timeSinceBackup > 3 * 60 * 1000) { // 3 minutes
          await this.handleCriticalActionWithoutBackup(line)
        }
      }

      // Mettre à jour les timestamps
      if (this.backupPatterns.some(p => p.test(line))) {
        this.lastBackupMention = Date.now()
      }

      if (this.todoPatterns.some(p => p.test(line))) {
        this.lastTodoMention = Date.now()
      }
    }

    // Check 3: Tâche complexe sans TodoList
    const hasMultipleSteps = recentText.match(/étape|step|d'abord|ensuite|puis|finalement/gi)
    const hasTodoMention = this.todoPatterns.some(p => p.test(recentText))

    if (hasMultipleSteps && hasMultipleSteps.length >= 3 && !hasTodoMention) {
      const timeSinceTodo = Date.now() - this.lastTodoMention

      if (timeSinceTodo > 5 * 60 * 1000) { // 5 minutes sans todo
        await this.handleComplexTaskWithoutTodo(recentText)
      }
    }
  }

  /**
   * Gère la détection de précipitation
   */
  async handleRushDetected(text, pattern) {
    this.stats.rushDetected++
    this.stats.methodologyViolations++
    this.stats.lastViolation = new Date().toISOString()

    const alert = {
      type: 'rush_detected',
      pattern: pattern.source,
      timestamp: new Date().toISOString(),
      severity: 'warning'
    }

    console.log(`⚠️  [${this.name}] PRÉCIPITATION DÉTECTÉE!`)
    console.log(`   Pattern: ${pattern.source}`)

    eventBus.emit('methodology:violation', alert)

    try {
      const reminder = `
## ⚠️ PRÉCIPITATION DÉTECTÉE - ${new Date().toLocaleString('fr-FR')}

**Pattern:** \`${alert.pattern}\`

**RAPPEL MÉTHODOLOGIE ALAIN:**

1. 📋 **Étape par étape**
   - Décomposer la tâche
   - Une chose à la fois
   - Vérifier chaque étape

2. 🎯 **Pas de précipitation**
   - Prendre le temps nécessaire
   - La qualité prime sur la vitesse
   - "Le temps n'est jamais un problème"

3. ✨ **Perfection du premier coup**
   - Réfléchir avant d'agir
   - Comprendre avant de modifier
   - Tester mentalement la solution

**Citation d'Alain:**
> "Tu sais, ici le temps n'est jamais un problème, la qualité prime."

---

`

      await fs.appendFile(this.rappelsPath, reminder, 'utf-8')
      console.log(`📝 [${this.name}] Rappel anti-précipitation créé`)

    } catch (error) {
      console.error(`❌ [${this.name}] Erreur création rappel:`, error.message)
    }
  }

  /**
   * Gère une action critique sans backup
   */
  async handleCriticalActionWithoutBackup(line) {
    this.stats.backupRemindersCreated++
    this.stats.methodologyViolations++
    this.stats.lastViolation = new Date().toISOString()

    const alert = {
      type: 'backup_missing',
      line: line.substring(0, 200),
      timestamp: new Date().toISOString(),
      severity: 'high'
    }

    console.log(`🚨 [${this.name}] ACTION CRITIQUE SANS BACKUP!`)
    console.log(`   Action: "${line.substring(0, 100)}..."`)

    eventBus.emit('methodology:violation', alert)

    try {
      const reminder = `
## 🚨 ACTION CRITIQUE SANS BACKUP - ${new Date().toLocaleString('fr-FR')}

**Action détectée:**
> ${line}

**DANGER:**
Tu t'apprêtes à modifier/supprimer sans avoir créé de backup!

**PROTOCOLE DE SÉCURITÉ:**

1. 📦 **TOUJOURS créer un backup avant:**
   - Modifications de fichiers critiques
   - Suppressions
   - Écrasements de fichiers existants

2. 📋 **Méthode:**
   \`\`\`bash
   # Créer une copie avec timestamp
   cp fichier.ext fichier.ext.backup_$(date +%Y%m%d_%H%M%S)

   # Ou sur Windows
   copy fichier.ext fichier.ext.backup_YYYYMMDD_HHMMSS
   \`\`\`

3. ✅ **Vérifier:**
   - Le backup existe
   - Le backup a le bon contenu
   - Puis seulement modifier

**Rappel:**
> "Perfection du premier coup" inclut la capacité de revenir en arrière si nécessaire.

---

`

      await fs.appendFile(this.rappelsPath, reminder, 'utf-8')
      console.log(`📝 [${this.name}] Rappel backup créé`)

    } catch (error) {
      console.error(`❌ [${this.name}] Erreur création rappel:`, error.message)
    }
  }

  /**
   * Gère une tâche complexe sans TodoList
   */
  async handleComplexTaskWithoutTodo(text) {
    this.stats.todoRemindersCreated++
    this.stats.methodologyViolations++
    this.stats.lastViolation = new Date().toISOString()

    const alert = {
      type: 'todo_missing',
      timestamp: new Date().toISOString(),
      severity: 'info'
    }

    console.log(`📋 [${this.name}] TÂCHE COMPLEXE SANS TODO!`)

    eventBus.emit('methodology:violation', alert)

    try {
      const reminder = `
## 📋 TÂCHE COMPLEXE SANS TODO - ${new Date().toLocaleString('fr-FR')}

**Détection:**
Une tâche avec plusieurs étapes a été détectée sans utilisation du TodoList.

**POURQUOI UTILISER TodoWrite:**

1. 🎯 **Clarté mentale**
   - Organiser les pensées
   - Ne rien oublier
   - Voir la progression

2. 👁️ **Visibilité pour Alain**
   - Il voit ce que tu fais
   - Il peut te corriger en temps réel
   - "D'habitude quand tu travailles je te vois faire"

3. 📊 **Suivi de progression**
   - Marquer les tâches complétées
   - Identifier les blocages
   - Mesurer l'avancement

**QUAND UTILISER TodoWrite:**

✅ Tâches avec 3+ étapes
✅ Modifications multiples
✅ Tâches complexes/non-triviales
✅ Quand Alain donne une liste de choses à faire

**ACTION:**
Crée une TodoList MAINTENANT avec TodoWrite tool avant de continuer.

---

`

      await fs.appendFile(this.rappelsPath, reminder, 'utf-8')
      console.log(`📝 [${this.name}] Rappel TodoList créé`)

    } catch (error) {
      console.error(`❌ [${this.name}] Erreur création rappel:`, error.message)
    }
  }

  /**
   * Crée un rappel backup
   */
  async createBackupReminder(data) {
    this.stats.backupRemindersCreated++

    console.log(`💾 [${this.name}] Rappel backup pour outil: ${data.tool}`)

    const alert = {
      type: 'backup_reminder',
      tool: data.tool,
      timestamp: new Date().toISOString()
    }

    eventBus.emit('backup:reminder', alert)
  }

  /**
   * Arrête la surveillance
   */
  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.running = false
    this.stats.running = false

    console.log(`🛑 [${this.name}] Vérificateur arrêté`)
    console.log(`   Violations de méthodologie: ${this.stats.methodologyViolations}`)
    console.log(`   Rappels backup: ${this.stats.backupRemindersCreated}`)
    console.log(`   Rappels todo: ${this.stats.todoRemindersCreated}`)

    eventBus.emit('agent:stopped', {
      agent: this.name,
      stats: this.stats,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Retourne les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      running: this.running,
      timeSinceLastBackup: Date.now() - this.lastBackupMention,
      timeSinceLastTodo: Date.now() - this.lastTodoMention
    }
  }
}

// Créer et exporter l'instance singleton
const checker = new MethodologyChecker()

// Gestion du signal d'arrêt
process.on('SIGINT', async () => {
  await checker.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await checker.stop()
  process.exit(0)
})

module.exports = checker
