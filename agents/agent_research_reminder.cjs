/**
 * AGENT: Research Reminder
 * Rappelle à Ana de faire des recherches web avant d'agir
 *
 * MISSION:
 * - Détecter quand Ana s'apprête à modifier du code ou des configs
 * - Vérifier si elle a fait une recherche web récemment
 * - Suggérer des recherches Perplexity si nécessaire
 * - Créer des rappels pour les technologies inconnues
 *
 * PHILOSOPHIE:
 * "Tu fais sans savoir? C'est interdit!!!"
 * "Il y a le web ou formule la situation et tes questions pour Perplexity ici."
 * - Alain, 17 novembre 2025
 */

const fs = require('fs').promises
const path = require('path')
const eventBus = require('./shared_event_bus.cjs')

class ResearchReminder {
  constructor() {
    this.name = 'research_reminder'
    this.running = false
    this.checkInterval = 10000 // Vérifier toutes les 10 secondes
    this.intervalId = null

    // Technologies/concepts qui devraient déclencher une recherche
    this.technicalKeywords = [
      'ngrok', 'docker', 'kubernetes', 'nginx', 'apache',
      'webpack', 'vite', 'rollup', 'babel', 'typescript',
      'react', 'vue', 'angular', 'svelte', 'nextjs',
      'oauth', 'jwt', 'cors', 'ssl', 'tls', 'https',
      'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
      'aws', 'azure', 'gcp', 'cloudflare', 'vercel',
      'git', 'github', 'gitlab', 'bitbucket',
      'linux', 'windows', 'macos', 'ubuntu', 'debian'
    ]

    // Patterns qui indiquent une action technique
    this.actionPatterns = [
      /je vais modifier/i,
      /je vais créer/i,
      /je vais éditer/i,
      /laisse[- ]moi (modifier|créer|éditer|changer)/i,
      /il faut (modifier|créer|éditer|changer)/i,
      /je dois (modifier|créer|éditer|changer)/i,
      /on va (modifier|créer|éditer|changer)/i
    ]

    // Dernière position lue
    this.lastPosition = 0
    this.lastCheckTime = Date.now()

    // Historique des recherches récentes (5 dernières minutes)
    this.recentSearches = []
    this.searchWindowMs = 5 * 60 * 1000 // 5 minutes

    // Stats
    this.stats = {
      remindersCreated: 0,
      technicalActionsDetected: 0,
      searchesSuggested: 0,
      lastReminder: null,
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
    console.log(`🔬 [${this.name}] Démarrage du rappel de recherche...`)
    this.running = true

    eventBus.emit('agent:started', {
      agent: this.name,
      timestamp: new Date().toISOString()
    })

    // Écouter les événements de recherche
    eventBus.on('web_search:performed', (data) => {
      this.recordSearch(data)
    })

    // === INTÉGRATION ANA SUPERIA ===
    // Écouter les messages utilisateur pour détecter besoins de recherche
    eventBus.on('ana:message_received', async (data) => {
      await this.analyzeMessageForResearchNeeds(data.message || '')
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

    console.log(`✅ [${this.name}] Rappel actif - vérification toutes les ${this.checkInterval/1000}s`)
  }

  /**
   * Enregistre qu'une recherche a été faite
   */
  recordSearch(data) {
    this.recentSearches.push({
      timestamp: Date.now(),
      query: data.query || 'unknown',
      topic: data.topic || 'unknown'
    })

    // Nettoyer les recherches trop anciennes
    const cutoff = Date.now() - this.searchWindowMs
    this.recentSearches = this.recentSearches.filter(s => s.timestamp > cutoff)

    console.log(`📚 [${this.name}] Recherche enregistrée: "${data.query}"`)
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
   * Analyse un message utilisateur pour détecter besoins de recherche (Ana SUPERIA)
   */
  async analyzeMessageForResearchNeeds(message) {
    // Vérifier si des keywords techniques sont mentionnés
    const mentionedKeywords = this.technicalKeywords.filter(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    )

    if (mentionedKeywords.length > 0) {
      // Vérifier si une recherche a été faite récemment sur ces sujets
      const hasRecentResearch = this.recentSearches.some(search =>
        mentionedKeywords.some(kw =>
          search.query.toLowerCase().includes(kw.toLowerCase())
        )
      )

      if (!hasRecentResearch) {
        // Émettre insight pour Ana
        eventBus.emit('agent:insight', {
          agent: 'research_reminder',
          insight: `🔍 Technologies mentionnées: ${mentionedKeywords.join(', ')}. Considère une recherche web avant d'agir!`,
          keywords: mentionedKeywords,
          timestamp: new Date().toISOString()
        })
      }
    }
  }

  /**
   * Analyse le contenu pour détecter les actions techniques
   */
  async analyzeContent(content) {
    const lines = content.split('\n')

    for (const line of lines) {
      if (!line.trim()) continue

      // Vérifier si c'est une action technique
      const isAction = this.actionPatterns.some(pattern => pattern.test(line))

      if (isAction) {
        this.stats.technicalActionsDetected++

        // Vérifier si des keywords techniques sont mentionnés
        const mentionedKeywords = this.technicalKeywords.filter(keyword =>
          line.toLowerCase().includes(keyword.toLowerCase())
        )

        if (mentionedKeywords.length > 0) {
          await this.checkIfResearchNeeded(line, mentionedKeywords)
        }
      }
    }
  }

  /**
   * Vérifie si une recherche a été faite récemment sur ces sujets
   */
  async checkIfResearchNeeded(line, keywords) {
    // Vérifier si une recherche récente couvre ces mots-clés
    const hasRecentResearch = this.recentSearches.some(search =>
      keywords.some(kw =>
        search.query.toLowerCase().includes(kw.toLowerCase()) ||
        search.topic.toLowerCase().includes(kw.toLowerCase())
      )
    )

    if (!hasRecentResearch) {
      await this.createResearchReminder(line, keywords)
    }
  }

  /**
   * Crée un rappel de recherche
   */
  async createResearchReminder(line, keywords) {
    this.stats.remindersCreated++
    this.stats.searchesSuggested++
    this.stats.lastReminder = new Date().toISOString()

    const alert = {
      type: 'research_needed',
      keywords: keywords,
      line: line.substring(0, 200),
      timestamp: new Date().toISOString(),
      severity: 'info'
    }

    console.log(`📖 [${this.name}] RECHERCHE SUGGÉRÉE!`)
    console.log(`   Keywords: ${keywords.join(', ')}`)

    eventBus.emit('research:suggested', alert)

    // === ÉMETTRE INSIGHT POUR ANA ===
    eventBus.emit('agent:insight', {
      agent: 'research_reminder',
      insight: `📚 AVANT de modifier ${keywords[0]}: fais une recherche web! "Tu fais sans savoir? C'est interdit!"`,
      keywords: keywords,
      severity: 'high',
      timestamp: new Date().toISOString()
    })

    try {
      const reminder = `
## 📚 RECHERCHE WEB SUGGÉRÉE - ${new Date().toLocaleString('fr-FR')}

**Technologies mentionnées:** \`${keywords.join(', ')}\`

**Contexte:**
> ${line}

**RECOMMANDATION:**
Avant de modifier du code ou des configurations concernant **${keywords[0]}**, considère:

1. 🔍 **Recherche Perplexity/Web:**
   - "How does ${keywords[0]} work in 2025?"
   - "${keywords[0]} best practices ${new Date().getFullYear()}"
   - "${keywords[0]} common issues and solutions"

2. 📖 **Documentation officielle:**
   - Consulter la doc officielle de ${keywords[0]}

3. ✅ **Vérification factuelle:**
   - Tester l'état actuel du système
   - Lire les logs
   - Comparer avec une version qui fonctionne

**Rappel d'Alain:**
> "Tu fais sans savoir? C'est interdit!!!"
> "Il y a le web ou formule la situation et tes questions pour Perplexity ici."

---

`

      await fs.appendFile(this.rappelsPath, reminder, 'utf-8')
      console.log(`📝 [${this.name}] Rappel de recherche créé`)

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

    console.log(`🛑 [${this.name}] Rappel arrêté`)
    console.log(`   Actions techniques détectées: ${this.stats.technicalActionsDetected}`)
    console.log(`   Recherches suggérées: ${this.stats.searchesSuggested}`)

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
      recentSearchesCount: this.recentSearches.length
    }
  }
}

// Créer et exporter l'instance singleton
const reminder = new ResearchReminder()

// Gestion du signal d'arrêt
process.on('SIGINT', async () => {
  await reminder.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await reminder.stop()
  process.exit(0)
})

module.exports = reminder
