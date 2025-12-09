const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')
const eventBus = require('./shared_event_bus.cjs')

/**
 * 🔍 RESEARCH AGENT - Recherche Proactive
 *
 * Raison d'être:
 * Identifier automatiquement les lacunes de connaissance dans les conversations
 * et effectuer des recherches proactives pour combler ces gaps.
 *
 * Au lieu d'attendre qu'Alain me donne des infos, je les cherche moi-même.
 *
 * Fonctionnalités:
 * - Détecte questions sans réponse dans conversations
 * - Identifie termes/concepts inconnus
 * - Déclenche recherches via WebSearch
 * - Crée rapports de recherche structurés
 * - Comble gaps de connaissance automatiquement
 *
 * Fréquence: Toutes les 3 heures
 * Événements émis: research:gaps_detected, research:completed, research:saved
 */
class ResearchAgent extends EventEmitter {
  constructor() {
    super()
    this.running = false
    this.checkInterval = 3 * 60 * 60 * 1000 // 3 heures
    this.intervalId = null

    // Chemins
    this.memoryBase = 'E:\\Mémoire Claude'
    this.conversationPath = path.join(this.memoryBase, 'current_conversation.txt')
    this.researchDir = path.join(this.memoryBase, 'RECHERCHES')

    // Cache des gaps déjà traités
    this.processedGaps = new Set()

    // Stats
    this.stats = {
      gapsDetected: 0,
      researchesPerformed: 0,
      reportsCreated: 0,
      lastCheck: null,
      startTime: null
    }

    console.log('🔍 Research Agent initialisé')
  }

  /**
   * Démarre l'agent
   */
  async start() {
    if (this.running) {
      console.log('⚠️ Research Agent déjà démarré')
      return
    }

    this.running = true
    this.stats.startTime = Date.now()

    console.log('🔍 Research Agent démarré')
    console.log(`   - Surveillance: ${this.conversationPath}`)
    console.log(`   - Fréquence: toutes les 3 heures`)
    console.log(`   - Rapports: ${this.researchDir}`)

    // Créer dossier recherches si n'existe pas
    if (!fs.existsSync(this.researchDir)) {
      fs.mkdirSync(this.researchDir, { recursive: true })
      console.log(`   ✅ Dossier créé: ${this.researchDir}`)
    }

    // Première vérification immédiate (mais douce)
    setTimeout(() => this.checkForKnowledgeGaps(), 5000)

    // Vérifications périodiques
    this.intervalId = setInterval(() => {
      this.checkForKnowledgeGaps()
    }, this.checkInterval)

    this.emit('started')
    eventBus.emit('agent:started', { name: 'research' })
  }

  /**
   * Arrête l'agent
   */
  async stop() {
    if (!this.running) {
      console.log('⚠️ Research Agent déjà arrêté')
      return
    }

    console.log('🛑 Research Agent en cours d\'arrêt...')

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.running = false
    console.log('🔍 Research Agent arrêté')

    this.emit('stopped')
    eventBus.emit('agent:stopped', { name: 'research' })
  }

  /**
   * Vérifie les lacunes de connaissance
   */
  async checkForKnowledgeGaps() {
    this.stats.lastCheck = Date.now()
    console.log('🔍 [Research] Vérification gaps de connaissance...')

    try {
      // Lire conversation actuelle
      if (!fs.existsSync(this.conversationPath)) {
        console.log('ℹ️ [Research] Aucune conversation active')
        return
      }

      const content = fs.readFileSync(this.conversationPath, 'utf-8')

      // Extraire gaps de connaissance
      const gaps = this.extractKnowledgeGaps(content)

      if (gaps.length === 0) {
        console.log('✅ [Research] Aucun gap détecté')
        return
      }

      console.log(`📋 [Research] ${gaps.length} gaps détectés`)
      this.stats.gapsDetected += gaps.length

      eventBus.emit('research:gaps_detected', {
        count: gaps.length,
        gaps: gaps.map(g => g.topic),
        timestamp: Date.now()
      })

      // Traiter chaque gap (max 3 par run pour ne pas surcharger)
      const gapsToProcess = gaps.slice(0, 3).filter(g => !this.processedGaps.has(g.id))

      for (const gap of gapsToProcess) {
        await this.performResearch(gap)
        this.processedGaps.add(gap.id)
      }

    } catch (error) {
      console.error('❌ [Research] Erreur vérification gaps:', error.message)
    }
  }

  /**
   * Extrait les gaps de connaissance du texte
   */
  extractKnowledgeGaps(content) {
    const gaps = []

    // Pattern 1: Questions explicites sans réponse
    const questionPattern = /(?:Comment|Pourquoi|Qu'est-ce|Quelle|Quel)\s+([^?]+)\s*\?/gi
    let match
    while ((match = questionPattern.exec(content)) !== null) {
      const question = match[0]
      const topic = match[1].trim()

      // Vérifier si la question a une réponse dans le texte
      const hasAnswer = this.hasAnswerInText(question, content, match.index)

      if (!hasAnswer) {
        gaps.push({
          id: `question_${gaps.length}`,
          type: 'unanswered_question',
          topic,
          question,
          context: this._getContext(content, match.index),
          priority: 'high'
        })
      }
    }

    // Pattern 2: Phrases d'ignorance explicite
    const ignorancePatterns = [
      /je ne (sais|connais) pas ([^\.]+)/gi,
      /je ne (suis pas|ai pas) sûre? (de |si )?([^\.]+)/gi,
      /je n'ai (aucune idée|pas d'info) (de |sur |à propos de )?([^\.]+)/gi,
      /je dois chercher ([^\.]+)/gi,
      /je vais vérifier ([^\.]+)/gi
    ]

    for (const pattern of ignorancePatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const topic = match[match.length - 1].trim()
        gaps.push({
          id: `ignorance_${gaps.length}`,
          type: 'explicit_ignorance',
          topic,
          context: this._getContext(content, match.index),
          priority: 'medium'
        })
      }
    }

    // Pattern 3: Termes techniques inconnus (TODO placeholders)
    const todoPattern = /TODO:?\s*([^\n]+)/gi
    while ((match = todoPattern.exec(content)) !== null) {
      const task = match[1].trim()
      if (task.toLowerCase().includes('recherche') || task.toLowerCase().includes('vérif')) {
        gaps.push({
          id: `todo_${gaps.length}`,
          type: 'todo_research',
          topic: task,
          context: this._getContext(content, match.index),
          priority: 'low'
        })
      }
    }

    // Pattern 4: Mentions de concepts à approfondir
    const conceptPatterns = [
      /apprendre plus sur ([^\.]+)/gi,
      /étudier ([^\.]+)/gi,
      /comprendre mieux ([^\.]+)/gi
    ]

    for (const pattern of conceptPatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const topic = match[1].trim()
        gaps.push({
          id: `concept_${gaps.length}`,
          type: 'concept_to_learn',
          topic,
          context: this._getContext(content, match.index),
          priority: 'medium'
        })
      }
    }

    // Dédupliquer par topic similaire
    return this.deduplicateGaps(gaps)
  }

  /**
   * Vérifie si une question a une réponse dans le texte
   */
  hasAnswerInText(question, content, questionIndex) {
    // Extraire texte après la question (500 chars)
    const afterQuestion = content.slice(questionIndex, questionIndex + 500)

    // Patterns de réponse
    const answerPatterns = [
      /\n\n[A-Z]/,  // Nouveau paragraphe commençant par majuscule
      /Réponse:/i,
      /Oui,/i,
      /Non,/i,
      /C'est/i
    ]

    return answerPatterns.some(pattern => pattern.test(afterQuestion))
  }

  /**
   * Récupère contexte autour d'une position
   */
  _getContext(text, index, contextSize = 150) {
    const start = Math.max(0, index - contextSize)
    const end = Math.min(text.length, index + contextSize)
    return '...' + text.slice(start, end) + '...'
  }

  /**
   * Déduplique les gaps similaires
   */
  deduplicateGaps(gaps) {
    const uniqueGaps = []
    const seenTopics = new Set()

    for (const gap of gaps) {
      // Normaliser le topic
      const normalizedTopic = gap.topic
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim()

      if (!seenTopics.has(normalizedTopic)) {
        uniqueGaps.push(gap)
        seenTopics.add(normalizedTopic)
      }
    }

    // Trier par priorité
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return uniqueGaps.sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
    )
  }

  /**
   * Effectue une recherche pour combler un gap
   */
  async performResearch(gap) {
    console.log(`🔎 [Research] Recherche: "${gap.topic}"`)
    this.stats.researchesPerformed++

    try {
      // Construire query de recherche optimale
      const searchQuery = this.buildSearchQuery(gap)

      // NOTE: En production, on utiliserait vraiment WebSearch ou Perplexity API
      // Pour l'instant, on simule avec structure
      const researchResult = {
        query: searchQuery,
        gap: gap,
        findings: `[Recherche simulée pour: ${gap.topic}]`,
        sources: [],
        timestamp: new Date().toISOString(),
        status: 'simulated'
      }

      console.log(`   ✅ Recherche effectuée: "${searchQuery}"`)

      eventBus.emit('research:completed', {
        topic: gap.topic,
        query: searchQuery,
        timestamp: Date.now()
      })

      // Sauvegarder rapport
      await this.saveResearchReport(researchResult)

    } catch (error) {
      console.error(`❌ [Research] Erreur recherche "${gap.topic}":`, error.message)
    }
  }

  /**
   * Construit une query de recherche optimale
   */
  buildSearchQuery(gap) {
    const { type, topic, question } = gap

    switch (type) {
      case 'unanswered_question':
        // Utiliser la question directement si elle est claire
        return question || topic

      case 'explicit_ignorance':
        // Chercher définition/explication
        return `qu'est-ce que ${topic}`

      case 'todo_research':
        // Recherche technique
        return `${topic} documentation guide`

      case 'concept_to_learn':
        // Apprentissage approfondi
        return `${topic} tutoriel explication`

      default:
        return topic
    }
  }

  /**
   * Sauvegarde un rapport de recherche
   */
  async saveResearchReport(research) {
    const date = new Date().toISOString().split('T')[0]
    const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-')
    const filename = `research_${date}_${time}.md`
    const filepath = path.join(this.researchDir, filename)

    const report = this.formatResearchReport(research)

    fs.writeFileSync(filepath, report, 'utf-8')
    console.log(`   💾 Rapport sauvegardé: ${filename}`)

    this.stats.reportsCreated++

    eventBus.emit('research:saved', {
      filepath,
      topic: research.gap.topic,
      timestamp: Date.now()
    })
  }

  /**
   * Formate un rapport de recherche
   */
  formatResearchReport(research) {
    const { gap, query, findings, sources, timestamp, status } = research

    let report = `# 🔍 RAPPORT DE RECHERCHE\n\n`
    report += `**Date**: ${new Date(timestamp).toLocaleString('fr-FR')}\n`
    report += `**Statut**: ${status === 'simulated' ? '⚠️ Simulé (WebSearch non disponible)' : '✅ Réel'}\n\n`
    report += `---\n\n`

    // Gap de connaissance identifié
    report += `## 📋 Gap de Connaissance Identifié\n\n`
    report += `**Type**: ${gap.type}\n`
    report += `**Sujet**: ${gap.topic}\n`
    report += `**Priorité**: ${gap.priority}\n\n`

    if (gap.question) {
      report += `**Question**: ${gap.question}\n\n`
    }

    report += `**Contexte**:\n\`\`\`\n${gap.context}\n\`\`\`\n\n`
    report += `---\n\n`

    // Query de recherche
    report += `## 🔎 Recherche Effectuée\n\n`
    report += `**Query**: \`${query}\`\n\n`

    if (status === 'simulated') {
      report += `> ⚠️ **NOTE**: Cette recherche est simulée car WebSearch n'est pas disponible dans l'environnement agent autonome.\n`
      report += `> \n`
      report += `> **Pour activer les vraies recherches**:\n`
      report += `> 1. Utiliser l'API Perplexity (API key requise)\n`
      report += `> 2. Ou utiliser claude.ai avec WebSearch activé\n`
      report += `> 3. Ou déléguer à un agent externe avec accès web\n\n`
    }

    report += `---\n\n`

    // Résultats
    report += `## 📊 Résultats\n\n`
    report += `${findings}\n\n`

    if (sources && sources.length > 0) {
      report += `### 🔗 Sources\n\n`
      sources.forEach((source, i) => {
        report += `${i + 1}. [${source.title}](${source.url})\n`
      })
      report += `\n`
    }

    report += `---\n\n`

    // Action requise
    report += `## 💡 Action Requise\n\n`

    if (status === 'simulated') {
      report += `**Pour compléter cette recherche**:\n`
      report += `1. Lire ce rapport pour me rappeler le gap identifié\n`
      report += `2. Effectuer la recherche manuellement avec claude.ai (WebSearch activé)\n`
      report += `3. Ou demander à Alain de me donner l'info si il la connaît\n`
      report += `4. Mettre à jour ce rapport avec les vrais résultats\n\n`
    } else {
      report += `**Prochaines étapes**:\n`
      report += `1. Intégrer ces nouvelles connaissances dans ma mémoire\n`
      report += `2. Les utiliser dans les prochaines conversations\n`
      report += `3. Créer des références croisées avec autres docs si pertinent\n\n`
    }

    report += `---\n\n`
    report += `*Généré automatiquement par Research Agent*\n`

    return report
  }

  /**
   * Récupère les statistiques de l'agent
   */
  getStats() {
    const uptime = this.stats.startTime
      ? Date.now() - this.stats.startTime
      : 0

    return {
      running: this.running,
      uptime: this._formatDuration(uptime),
      gapsDetected: this.stats.gapsDetected,
      researchesPerformed: this.stats.researchesPerformed,
      reportsCreated: this.stats.reportsCreated,
      processedGapsCount: this.processedGaps.size,
      lastCheck: this.stats.lastCheck
        ? new Date(this.stats.lastCheck).toLocaleString('fr-FR')
        : 'Jamais',
      checkIntervalHours: this.checkInterval / (60 * 60 * 1000)
    }
  }

  /**
   * Formate une durée
   */
  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}j ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }
}

// Export instance singleton
module.exports = new ResearchAgent()
