/**
 * AGENT: Assumption Detector
 * Détecte quand Ana fait des suppositions au lieu de vérifier les faits
 *
 * MISSION:
 * - Surveiller current_conversation.txt en temps réel
 * - Détecter les phrases dangereuses ("je pense", "probablement", "ça doit être")
 * - Alerter immédiatement via event bus
 * - Créer des rappels dans RAPPELS_ACTIFS.md
 *
 * PHILOSOPHIE:
 * "Ne suppose jamais. Vérifie toujours factuellement."
 * - Règle #0 de ANA_RESURRECTION.md
 */

const fs = require('fs').promises
const path = require('path')
const eventBus = require('./shared_event_bus.cjs')

class AssumptionDetector {
  constructor() {
    this.name = 'assumption_detector'
    this.running = false
    this.checkInterval = 5000 // Vérifier toutes les 5 secondes
    this.intervalId = null

    // Patterns dangereux à détecter
    this.dangerousPatterns = [
      /je pense que/i,
      /je crois que/i,
      /probablement/i,
      /ça doit être/i,
      /c'est probablement/i,
      /il me semble/i,
      /on dirait que/i,
      /sans doute/i,
      /je suppose/i,
      /je présume/i,
      /peut-être que/i,
      /j'imagine que/i
    ]

    // Dernière position lue dans le fichier
    this.lastPosition = 0
    this.lastCheckTime = Date.now()

    // Stats
    this.stats = {
      assumptionsDetected: 0,
      alertsCreated: 0,
      lastDetection: null,
      running: true,
      uptime: '0s'
    }

    // Chemins - Ana SUPERIA
    this.conversationPath = 'E:/ANA/memory/current_conversation_ana.txt'
    this.rappelsPath = 'E:/ANA/memory/rappels_actifs.md'

    this.startTime = Date.now()
  }

  /**
   * Démarre la surveillance
   */
  async start() {
    console.log(`🔍 [${this.name}] Démarrage du détecteur de suppositions...`)
    this.running = true

    // Émettre événement de démarrage
    eventBus.emit('agent:started', {
      agent: this.name,
      timestamp: new Date().toISOString()
    })

    // Initialiser la position de lecture
    try {
      const stats = await fs.stat(this.conversationPath)
      this.lastPosition = stats.size // Commencer à la fin du fichier
    } catch (error) {
      console.log(`⚠️  [${this.name}] Fichier conversation non trouvé, position = 0`)
      this.lastPosition = 0
    }

    // Lancer la surveillance périodique
    this.intervalId = setInterval(() => this.checkConversation(), this.checkInterval)

    console.log(`✅ [${this.name}] Détecteur actif - vérification toutes les ${this.checkInterval/1000}s`)
  }

  /**
   * Vérifie les nouvelles lignes dans current_conversation.txt
   */
  async checkConversation() {
    try {
      // Vérifier si le fichier existe
      const stats = await fs.stat(this.conversationPath)
      const currentSize = stats.size

      // Si le fichier a été tronqué ou recréé
      if (currentSize < this.lastPosition) {
        this.lastPosition = 0
      }

      // Si pas de nouveau contenu
      if (currentSize === this.lastPosition) {
        return
      }

      // Lire seulement le nouveau contenu
      const fileHandle = await fs.open(this.conversationPath, 'r')
      const buffer = Buffer.alloc(currentSize - this.lastPosition)
      await fileHandle.read(buffer, 0, buffer.length, this.lastPosition)
      await fileHandle.close()

      const newContent = buffer.toString('utf-8')

      // Mettre à jour la position
      this.lastPosition = currentSize

      // Analyser le contenu pour détecter les suppositions
      await this.analyzeContent(newContent)

      // Mettre à jour uptime
      const uptimeMs = Date.now() - this.startTime
      const uptimeMin = Math.floor(uptimeMs / 60000)
      const uptimeSec = Math.floor((uptimeMs % 60000) / 1000)
      this.stats.uptime = `${uptimeMin}m ${uptimeSec}s`

    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`❌ [${this.name}] Erreur lecture conversation:`, error.message)
      }
    }
  }

  /**
   * Analyse le contenu pour détecter les suppositions
   */
  async analyzeContent(content) {
    const lines = content.split('\n')

    for (const line of lines) {
      // Ignorer les lignes vides
      if (!line.trim()) continue

      // Vérifier chaque pattern dangereux
      for (const pattern of this.dangerousPatterns) {
        if (pattern.test(line)) {
          await this.handleAssumptionDetected(line, pattern)
        }
      }
    }
  }

  /**
   * Gère la détection d'une supposition
   */
  async handleAssumptionDetected(line, pattern) {
    this.stats.assumptionsDetected++
    this.stats.lastDetection = new Date().toISOString()

    const alert = {
      type: 'assumption_detected',
      pattern: pattern.source,
      line: line.substring(0, 200), // Limiter la longueur
      timestamp: new Date().toISOString(),
      severity: 'warning'
    }

    console.log(`⚠️  [${this.name}] SUPPOSITION DÉTECTÉE!`)
    console.log(`   Pattern: ${pattern.source}`)
    console.log(`   Ligne: "${line.substring(0, 100)}..."`)

    // Émettre événement via event bus
    eventBus.emit('assumption:detected', alert)

    // Créer un rappel dans RAPPELS_ACTIFS.md
    await this.createReminder(alert)

    this.stats.alertsCreated++
  }

  /**
   * Crée un rappel dans RAPPELS_ACTIFS.md
   */
  async createReminder(alert) {
    try {
      const reminder = `
## ⚠️ SUPPOSITION DÉTECTÉE - ${new Date().toLocaleString('fr-FR')}

**Pattern détecté:** \`${alert.pattern}\`

**Extrait:**
> ${alert.line}

**ACTION REQUISE:**
- ❌ NE PAS supposer
- ✅ Vérifier factuellement (comparer, tester, lire logs)
- ✅ Chercher des preuves objectives
- ✅ Demander à Alain si incertain

**Rappel Règle #0:**
> "NE JAMAIS supposer qu'un fichier est cassé sans preuve"
> "NE JAMAIS supposer qu'un système ne fonctionne pas sans test"
> "NE JAMAIS dire 'je pense que', 'probablement', 'ça doit être'"

---

`

      await fs.appendFile(this.rappelsPath, reminder, 'utf-8')
      console.log(`📝 [${this.name}] Rappel créé dans RAPPELS_ACTIFS.md`)

    } catch (error) {
      console.error(`❌ [${this.name}] Erreur création rappel:`, error.message)
    }
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

    console.log(`🛑 [${this.name}] Détecteur arrêté`)
    console.log(`   Suppositions détectées: ${this.stats.assumptionsDetected}`)
    console.log(`   Alertes créées: ${this.stats.alertsCreated}`)

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
      checkInterval: this.checkInterval,
      lastPosition: this.lastPosition
    }
  }
}

// Créer et exporter l'instance singleton
const detector = new AssumptionDetector()

// Gestion du signal d'arrêt
process.on('SIGINT', async () => {
  console.log(`\n🛑 [${detector.name}] Signal d'arrêt reçu...`)
  await detector.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log(`\n🛑 [${detector.name}] Signal SIGTERM reçu...`)
  await detector.stop()
  process.exit(0)
})

module.exports = detector
