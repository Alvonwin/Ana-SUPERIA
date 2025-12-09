const EventEmitter = require('events')
const eventBus = require('./shared_event_bus.cjs')
const fs = require('fs').promises
const path = require('path')

/**
 * 📚 KNOWLEDGE MANAGER - Gardien de la Connaissance
 *
 * Domaine: Documentation & Connaissance
 * Supervise: Synthesis Engine, Research Agent, Code Analyzer, Doc Updater
 *
 * Responsabilités:
 * - Orchestrer: Recherche → Synthèse → Documentation
 * - Maintenir qualité et cohérence documentation
 * - Coordonner mise à jour manuel utilisateur
 * - Gérer cycle de vie de la connaissance
 * - Éviter fragmentation/duplication
 *
 * Philosophie:
 * "La connaissance n'a de valeur que si elle est accessible,
 *  organisée, et maintenue à jour."
 */
class KnowledgeManager extends EventEmitter {
  constructor() {
    super()

    this.running = false
    this.agents = new Map()

    // État de la connaissance
    this.knowledge = {
      gapsIdentified: [],
      synthesisCreated: [],
      documentationUpdates: [],
      codeReviews: []
    }

    // Cycle de connaissance
    this.knowledgeCycles = []

    // Métriques
    this.stats = {
      cyclesCompleted: 0,
      docsUpdated: 0,
      gapsResolved: 0,
      qualityIssuesFixed: 0,
      coherenceChecks: 0,
      startTime: null
    }

    console.log('📚 Knowledge Manager initialisé')
  }

  /**
   * Démarre le manager
   */
  async start() {
    if (this.running) {
      console.log('⚠️ Knowledge Manager déjà démarré')
      return
    }

    this.running = true
    this.stats.startTime = Date.now()

    console.log('📚 Knowledge Manager démarré')
    console.log('   - Domaine: Documentation & Connaissance')
    console.log('   - Mission: Maintenir connaissance accessible et à jour')

    this.setupEventListeners()
    this.startKnowledgeMaintenance()

    eventBus.emit('manager:started', {
      manager: 'knowledge',
      domain: 'documentation',
      timestamp: Date.now()
    })
  }

  /**
   * Configure les listeners
   */
  setupEventListeners() {
    // Événements Research Agent
    eventBus.on('research:gaps_detected', (data) => {
      this.handleGapsDetected(data)
    })

    eventBus.on('research:completed', (data) => {
      this.handleResearchCompleted(data)
    })

    // Événements Synthesis Engine
    eventBus.on('synthesis:created', (data) => {
      this.handleSynthesisCreated(data)
    })

    // Événements Code Analyzer
    eventBus.on('code:issues_found', (data) => {
      this.handleCodeIssues(data)
    })

    eventBus.on('code:report_saved', (data) => {
      this.handleCodeReportSaved(data)
    })

    // Événements Doc Updater
    eventBus.on('doc:update_needed', (data) => {
      this.handleDocUpdateNeeded(data)
    })

    eventBus.on('doc:updated', (data) => {
      this.handleDocUpdated(data)
    })
  }

  /**
   * Démarre la maintenance de connaissance (toutes les heures)
   */
  startKnowledgeMaintenance() {
    this.maintenanceInterval = setInterval(() => {
      this.performKnowledgeMaintenance()
    }, 60 * 60 * 1000) // 1 heure

    // Premier check après 5 minutes
    setTimeout(() => this.performKnowledgeMaintenance(), 5 * 60 * 1000)
  }

  /**
   * Effectue maintenance de la connaissance
   */
  async performKnowledgeMaintenance() {
    console.log('📚 [Knowledge] Maintenance de la connaissance...')

    this.stats.coherenceChecks++

    // 1. Vérifier cohérence documentation
    const coherenceIssues = await this.checkDocumentationCoherence()

    // 2. Identifier duplications
    const duplications = await this.findDuplications()

    // 3. Détecter documentation obsolète
    const obsolete = await this.detectObsoleteDocumentation()

    // 4. Prendre actions correctives
    if (coherenceIssues.length > 0 || duplications.length > 0 || obsolete.length > 0) {
      this.planCorrectiveActions({
        coherenceIssues,
        duplications,
        obsolete
      })
    }

    // 5. Rapporter au Master
    this.reportToMaster({
      coherenceIssues: coherenceIssues.length,
      duplications: duplications.length,
      obsolete: obsolete.length
    })
  }

  /**
   * Gère gaps de connaissance détectés
   */
  handleGapsDetected(data) {
    console.log(`📚 [Knowledge] ${data.count} gaps détectés`)

    // Ajouter à la liste des gaps
    for (const gap of data.gaps) {
      this.knowledge.gapsIdentified.push({
        gap,
        detectedAt: Date.now(),
        status: 'pending_research'
      })
    }

    // Démarrer un cycle de connaissance
    this.startKnowledgeCycle({
      trigger: 'gaps_detected',
      gaps: data.gaps
    })
  }

  /**
   * Gère recherche complétée
   */
  handleResearchCompleted(data) {
    console.log('📚 [Knowledge] Recherche complétée:', data.topic)

    // Marquer gap comme résolu
    const gap = this.knowledge.gapsIdentified.find(g => g.gap === data.topic)
    if (gap) {
      gap.status = 'researched'
      gap.researchedAt = Date.now()
      this.stats.gapsResolved++
    }

    // Prochaine étape: demander synthèse si nécessaire
    if (this.shouldSynthesize(data)) {
      this.requestSynthesis(data)
    }
  }

  /**
   * Gère synthèse créée
   */
  handleSynthesisCreated(data) {
    console.log('📚 [Knowledge] Synthèse créée:', data.theme)

    this.knowledge.synthesisCreated.push({
      theme: data.theme,
      filepath: data.filepath,
      createdAt: Date.now()
    })

    // Prochaine étape: mettre à jour documentation
    this.requestDocumentationUpdate({
      source: 'synthesis',
      content: data
    })
  }

  /**
   * Gère issues de code trouvées
   */
  handleCodeIssues(data) {
    console.log(`📚 [Knowledge] ${data.issueCount} issues de code détectées`)

    // Analyser: faut-il documenter ces patterns?
    const shouldDocument = this.shouldDocumentCodeIssues(data)

    if (shouldDocument) {
      this.requestDocumentationUpdate({
        source: 'code_review',
        content: data
      })
    }
  }

  /**
   * Gère rapport de code sauvegardé
   */
  handleCodeReportSaved(data) {
    console.log('📚 [Knowledge] Rapport code review sauvegardé')

    this.knowledge.codeReviews.push({
      filepath: data.filepath,
      fileCount: data.fileCount,
      createdAt: Date.now()
    })
  }

  /**
   * Gère besoin de mise à jour doc
   */
  handleDocUpdateNeeded(data) {
    console.log('📚 [Knowledge] Mise à jour doc nécessaire:', data.section)

    this.knowledge.documentationUpdates.push({
      section: data.section,
      reason: data.reason,
      requestedAt: Date.now(),
      status: 'pending'
    })

    // Déléguer au Doc Updater
    eventBus.emit('knowledge:order_doc_update', data)
  }

  /**
   * Gère doc mise à jour
   */
  handleDocUpdated(data) {
    console.log('📚 [Knowledge] Doc mise à jour:', data.file)

    this.stats.docsUpdated++

    // Marquer comme complété
    const update = this.knowledge.documentationUpdates.find(u =>
      u.section === data.section && u.status === 'pending'
    )

    if (update) {
      update.status = 'completed'
      update.completedAt = Date.now()
    }

    // Vérifier si cycle de connaissance complété
    this.checkKnowledgeCycleCompletion()
  }

  /**
   * Démarre un cycle de connaissance
   */
  startKnowledgeCycle(trigger) {
    console.log('📚 [Knowledge] Nouveau cycle démarré:', trigger.trigger)

    const cycle = {
      id: Date.now(),
      trigger,
      startedAt: Date.now(),
      stages: {
        research: { status: 'pending' },
        synthesis: { status: 'pending' },
        documentation: { status: 'pending' }
      },
      status: 'in_progress'
    }

    this.knowledgeCycles.push(cycle)

    // Orchestrer les étapes
    this.orchestrateCycle(cycle)
  }

  /**
   * Orchestre un cycle de connaissance
   */
  orchestrateCycle(cycle) {
    // Le cycle est déjà démarré par les agents
    // On surveille juste la progression

    console.log('📚 [Knowledge] Orchestration cycle:', cycle.id)
  }

  /**
   * Vérifie si cycle complété
   */
  checkKnowledgeCycleCompletion() {
    for (const cycle of this.knowledgeCycles) {
      if (cycle.status !== 'in_progress') continue

      // Vérifier si toutes les étapes complètes
      const allComplete = Object.values(cycle.stages).every(
        stage => stage.status === 'completed'
      )

      if (allComplete) {
        cycle.status = 'completed'
        cycle.completedAt = Date.now()
        this.stats.cyclesCompleted++

        console.log('📚 [Knowledge] ✅ Cycle complété:', cycle.id)

        eventBus.emit('knowledge:cycle_completed', cycle)
      }
    }
  }

  /**
   * Demande synthèse
   */
  requestSynthesis(data) {
    console.log('📚 [Knowledge] Demande de synthèse pour:', data.topic)

    eventBus.emit('knowledge:request_synthesis', {
      topic: data.topic,
      basedOn: data
    })
  }

  /**
   * Demande mise à jour documentation
   */
  requestDocumentationUpdate(request) {
    console.log('📚 [Knowledge] Demande mise à jour doc depuis:', request.source)

    eventBus.emit('knowledge:request_doc_update', request)
  }

  /**
   * Vérifie cohérence documentation
   */
  async checkDocumentationCoherence() {
    // Vérifier:
    // - Pas de contradictions entre documents
    // - Références croisées valides
    // - Structure organisationnelle claire

    // Simplifié pour l'instant
    return []
  }

  /**
   * Trouve duplications
   */
  async findDuplications() {
    // Identifier contenu dupliqué dans différents docs
    // Simplifié pour l'instant
    return []
  }

  /**
   * Détecte documentation obsolète
   */
  async detectObsoleteDocumentation() {
    // Chercher docs qui ne correspondent plus au code actuel
    // Simplifié pour l'instant
    return []
  }

  /**
   * Planifie actions correctives
   */
  planCorrectiveActions(issues) {
    console.log('📚 [Knowledge] Planification actions correctives')

    this.stats.qualityIssuesFixed += issues.coherenceIssues.length +
                                     issues.duplications.length +
                                     issues.obsolete.length

    // Pour chaque type d'issue, créer plan d'action
    // Déléguer au Doc Updater
  }

  /**
   * Détermine si synthèse nécessaire
   */
  shouldSynthesize(data) {
    // Pour l'instant: toujours synthétiser recherches
    return true
  }

  /**
   * Détermine si issues de code doivent être documentées
   */
  shouldDocumentCodeIssues(data) {
    // Si beaucoup d'issues ou patterns récurrents
    return data.issueCount > 10
  }

  /**
   * Rapporte au Master
   */
  reportToMaster(report) {
    eventBus.emit('manager:report', {
      manager: 'knowledge',
      report
    })
  }

  /**
   * Enregistre un agent
   */
  registerAgent(name, instance) {
    this.agents.set(name, {
      instance,
      registeredAt: Date.now()
    })

    console.log(`📚 [Knowledge] Agent enregistré: ${name}`)
  }

  /**
   * Récupère statistiques
   */
  getStats() {
    const uptime = this.stats.startTime
      ? Date.now() - this.stats.startTime
      : 0

    return {
      running: this.running,
      uptime: this._formatUptime(uptime),
      domain: 'documentation',
      agents: this.agents.size,
      knowledge: {
        cyclesCompleted: this.stats.cyclesCompleted,
        gapsResolved: this.stats.gapsResolved,
        docsUpdated: this.stats.docsUpdated,
        activeCycles: this.knowledgeCycles.filter(c => c.status === 'in_progress').length
      },
      quality: {
        coherenceChecks: this.stats.coherenceChecks,
        issuesFixed: this.stats.qualityIssuesFixed
      }
    }
  }

  /**
   * Arrête le manager
   */
  async stop() {
    if (!this.running) return

    console.log('📚 Knowledge Manager arrêté')

    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval)
    }

    this.running = false

    eventBus.emit('manager:stopped', {
      manager: 'knowledge'
    })
  }

  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }
}

// Export instance singleton
module.exports = new KnowledgeManager()
