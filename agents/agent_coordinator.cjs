const eventBus = require('./shared_event_bus.cjs')

/**
 * 🎯 AGENT COORDINATOR - Chef d'orchestre des agents
 *
 * Responsabilités:
 * - Gérer le cycle de vie de tous les agents
 * - Déléguer tâches aux agents spécialisés
 * - Coordonner communication inter-agents
 * - Monitorer état global du système
 * - Décider stratégie d'exécution
 */
class AgentCoordinator {
  constructor() {
    this.running = false
    this.agents = new Map()
    this.tasks = []
    this.taskHistory = []

    // Stats
    this.stats = {
      tasksReceived: 0,
      tasksDelegated: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      startTime: null
    }

    console.log('🎯 Agent Coordinator initialisé')
  }

  /**
   * Démarre le coordinator
   */
  async start() {
    if (this.running) {
      console.log('⚠️ Agent Coordinator déjà démarré')
      return
    }

    this.running = true
    this.stats.startTime = Date.now()

    console.log('🎯 Agent Coordinator démarré')
    console.log('   - Écoute des événements système')
    console.log('   - Délégation intelligente activée')

    // Écouter les événements de tâches
    this.setupEventListeners()

    eventBus.emit('agent:coordinator:started', {
      startTime: this.stats.startTime
    })
  }

  /**
   * Configure les listeners d'événements
   */
  setupEventListeners() {
    // Événements mémoire critiques
    eventBus.on('memory:size_critical', (data) => {
      console.log('⚠️ [Coordinator] Mémoire critique détectée')
      this.handleMemoryCritical(data)
    })

    // Événements système critiques
    eventBus.on('system:service_down', (data) => {
      console.log('⚠️ [Coordinator] Service down détecté:', data.service)
      this.handleServiceDown(data)
    })

    eventBus.on('system:disk_low', (data) => {
      console.log('⚠️ [Coordinator] Espace disque faible')
      this.handleDiskLow(data)
    })

    // Événements de tâches
    eventBus.on('task:created', (data) => {
      this.handleTaskCreated(data)
    })

    eventBus.on('task:completed', (data) => {
      this.handleTaskCompleted(data)
    })

    eventBus.on('task:failed', (data) => {
      this.handleTaskFailed(data)
    })

    // Événements agents cognitifs
    eventBus.on('emotion:analysis_complete', (data) => {
      console.log('🎭 [Coordinator] Analyse émotionnelle complète:', data)
    })

    eventBus.on('learning:lessons_extracted', (data) => {
      console.log('📚 [Coordinator] Leçons extraites:', data)
    })

    eventBus.on('memory:monthly_consolidated', (data) => {
      console.log('🧠 [Coordinator] Mémoire mensuelle consolidée:', data)
    })

    eventBus.on('truth:mismatches_found', (data) => {
      console.log('⚠️ [Coordinator] Assertions incorrectes détectées:', data)
    })

    eventBus.on('truth:alert_created', (data) => {
      console.log('✅ [Coordinator] Alerte vérité créée:', data)
    })

    eventBus.on('synthesis:created', (data) => {
      console.log('📝 [Coordinator] Synthèse hebdomadaire créée:', data)
    })

    eventBus.on('synthesis:saved', (data) => {
      console.log('💾 [Coordinator] Synthèse sauvegardée:', data)
    })

    eventBus.on('research:gaps_detected', (data) => {
      console.log(`🔍 [Coordinator] ${data.count} gaps de connaissance détectés`)
    })

    eventBus.on('research:completed', (data) => {
      console.log('✅ [Coordinator] Recherche complétée:', data)
    })

    eventBus.on('research:saved', (data) => {
      console.log('💾 [Coordinator] Rapport de recherche sauvegardé:', data)
    })

    eventBus.on('code:analysis_started', (data) => {
      console.log('🔬 [Coordinator] Analyse de code démarrée:', data)
    })

    eventBus.on('code:issues_found', (data) => {
      console.log('⚠️ [Coordinator] Issues de code trouvées:', data)
    })

    eventBus.on('code:report_saved', (data) => {
      console.log('💾 [Coordinator] Rapport code review sauvegardé:', data)
    })

    eventBus.on('notification:created', (data) => {
      console.log('🔔 [Coordinator] Notification créée:', data.title)
    })

    eventBus.on('notification:urgent', (data) => {
      console.log('🚨 [Coordinator] NOTIFICATION URGENTE:', data.title)
    })
  }

  /**
   * Enregistre un agent
   */
  registerAgent(name, agentInstance) {
    this.agents.set(name, {
      instance: agentInstance,
      status: 'registered',
      registeredAt: Date.now()
    })

    console.log(`📝 [Coordinator] Agent enregistré: ${name}`)
    eventBus.emit('agent:registered', { name })
  }

  /**
   * Marque un agent comme running (déjà démarré ailleurs)
   */
  markAsRunning(name) {
    const agent = this.agents.get(name)

    if (!agent) {
      console.error(`❌ [Coordinator] Agent inconnu: ${name}`)
      return false
    }

    if (agent.status === 'running') {
      console.log(`⚠️ [Coordinator] Agent ${name} déjà marqué running`)
      return true
    }

    agent.status = 'running'
    agent.startedAt = Date.now()

    console.log(`✅ [Coordinator] Agent ${name} marqué comme running`)
    eventBus.emit('agent:started', { name })
    return true
  }

  /**
   * Démarre un agent spécifique
   */
  async startAgent(name) {
    const agent = this.agents.get(name)

    if (!agent) {
      console.error(`❌ [Coordinator] Agent inconnu: ${name}`)
      return false
    }

    if (agent.status === 'running') {
      console.log(`⚠️ [Coordinator] Agent ${name} déjà démarré`)
      return true
    }

    try {
      console.log(`🚀 [Coordinator] Démarrage agent: ${name}`)

      if (typeof agent.instance.start === 'function') {
        await agent.instance.start()
      }

      agent.status = 'running'
      agent.startedAt = Date.now()

      eventBus.emit('agent:started', { name })
      return true
    } catch (error) {
      console.error(`❌ [Coordinator] Erreur démarrage ${name}:`, error.message)
      agent.status = 'error'
      agent.error = error.message
      return false
    }
  }

  /**
   * Arrête un agent spécifique
   */
  async stopAgent(name) {
    const agent = this.agents.get(name)

    if (!agent) {
      console.error(`❌ [Coordinator] Agent inconnu: ${name}`)
      return false
    }

    if (agent.status !== 'running') {
      console.log(`⚠️ [Coordinator] Agent ${name} pas en cours d'exécution`)
      return true
    }

    try {
      console.log(`⏹️ [Coordinator] Arrêt agent: ${name}`)

      if (typeof agent.instance.stop === 'function') {
        await agent.instance.stop()
      }

      agent.status = 'stopped'
      agent.stoppedAt = Date.now()

      eventBus.emit('agent:stopped', { name })
      return true
    } catch (error) {
      console.error(`❌ [Coordinator] Erreur arrêt ${name}:`, error.message)
      return false
    }
  }

  /**
   * Récupère le statut d'un agent
   */
  getAgentStatus(name) {
    const agent = this.agents.get(name)

    if (!agent) {
      return null
    }

    let stats = {}
    if (typeof agent.instance.getStats === 'function') {
      stats = agent.instance.getStats()
    }

    return {
      name,
      status: agent.status,
      registeredAt: agent.registeredAt,
      startedAt: agent.startedAt,
      stats
    }
  }

  /**
   * Récupère le statut de tous les agents
   */
  getAllAgentsStatus() {
    const statuses = {}

    for (const [name] of this.agents) {
      statuses[name] = this.getAgentStatus(name)
    }

    return statuses
  }

  /**
   * Analyse une tâche pour déterminer si délégation nécessaire
   */
  analyzeTask(task) {
    const { type, complexity, estimatedLines } = task

    // Critères de délégation
    const analysis = {
      shouldDelegate: false,
      targetAgent: null,
      reason: ''
    }

    // Tâche triviale -> Ana direct
    if (complexity === 'trivial') {
      analysis.reason = 'Tâche triviale, Ana direct'
      return analysis
    }

    // Recherche mémoire -> Memory Manager ou Research Agent
    if (type === 'memory_search') {
      analysis.shouldDelegate = true
      analysis.targetAgent = 'research'
      analysis.reason = 'Recherche dans mémoire'
      return analysis
    }

    // Code volumineux -> Code Agent
    if (type === 'code' && estimatedLines > 500) {
      analysis.shouldDelegate = true
      analysis.targetAgent = 'code'
      analysis.reason = `Code volumineux (${estimatedLines} lignes)`
      return analysis
    }

    // Synthèse -> Synthesis Engine
    if (type === 'synthesis') {
      analysis.shouldDelegate = true
      analysis.targetAgent = 'synthesis'
      analysis.reason = 'Création de synthèse'
      return analysis
    }

    return analysis
  }

  /**
   * Délègue une tâche à un agent
   */
  async delegateTask(task, targetAgent) {
    console.log(`📋 [Coordinator] Délégation tâche vers: ${targetAgent}`)

    const agent = this.agents.get(targetAgent)

    if (!agent) {
      console.error(`❌ [Coordinator] Agent cible inconnu: ${targetAgent}`)
      return {
        success: false,
        error: 'Agent inconnu'
      }
    }

    if (agent.status !== 'running') {
      console.log(`🚀 [Coordinator] Démarrage agent ${targetAgent}`)
      await this.startAgent(targetAgent)
    }

    try {
      this.stats.tasksDelegated++

      eventBus.emitTaskEvent('delegated', {
        task,
        targetAgent,
        timestamp: Date.now()
      })

      // Simuler exécution (en réalité l'agent exécuterait la tâche)
      return {
        success: true,
        targetAgent,
        task
      }
    } catch (error) {
      console.error(`❌ [Coordinator] Erreur délégation:`, error.message)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Gère événement mémoire critique
   */
  async handleMemoryCritical(data) {
    console.log('🔥 [Coordinator] ACTION: Archivage mémoire critique')

    // Le Memory Manager le gère déjà automatiquement
    // Mais on peut coordonner d'autres actions

    eventBus.emit('coordinator:action', {
      type: 'memory_critical_handled',
      data
    })
  }

  /**
   * Gère événement service down
   */
  async handleServiceDown(data) {
    const { service } = data

    console.log(`🔧 [Coordinator] Tentative auto-récupération: ${service}`)

    // Ici on pourrait implémenter auto-restart
    // Pour l'instant, juste alerter

    eventBus.emit('coordinator:alert', {
      type: 'service_down',
      service,
      action: 'manual_intervention_needed'
    })
  }

  /**
   * Gère événement disque faible
   */
  async handleDiskLow(data) {
    console.log('💾 [Coordinator] Disque faible - demande nettoyage')

    // Demander au Memory Manager de nettoyer
    eventBus.emit('memory:cleanup_requested', data)
  }

  /**
   * Gère création de tâche
   */
  handleTaskCreated(data) {
    this.stats.tasksReceived++
    this.tasks.push({
      ...data,
      status: 'pending',
      createdAt: Date.now()
    })
  }

  /**
   * Gère complétion de tâche
   */
  handleTaskCompleted(data) {
    this.stats.tasksCompleted++

    const task = this.tasks.find(t => t.id === data.taskId)
    if (task) {
      task.status = 'completed'
      task.completedAt = Date.now()
      this.taskHistory.push(task)
    }
  }

  /**
   * Gère échec de tâche
   */
  handleTaskFailed(data) {
    this.stats.tasksFailed++

    const task = this.tasks.find(t => t.id === data.taskId)
    if (task) {
      task.status = 'failed'
      task.failedAt = Date.now()
      task.error = data.error
      this.taskHistory.push(task)
    }
  }

  /**
   * Récupère les statistiques du coordinator
   */
  getStats() {
    const uptime = this.stats.startTime
      ? Date.now() - this.stats.startTime
      : 0

    return {
      running: this.running,
      uptime: this._formatUptime(uptime),
      agents: {
        total: this.agents.size,
        running: Array.from(this.agents.values()).filter(a => a.status === 'running').length
      },
      tasks: {
        received: this.stats.tasksReceived,
        delegated: this.stats.tasksDelegated,
        completed: this.stats.tasksCompleted,
        failed: this.stats.tasksFailed,
        pending: this.tasks.filter(t => t.status === 'pending').length
      }
    }
  }

  /**
   * Arrête le coordinator et tous les agents
   */
  async stop() {
    if (!this.running) {
      console.log('⚠️ Agent Coordinator déjà arrêté')
      return
    }

    console.log('🛑 [Coordinator] Arrêt de tous les agents...')

    // Arrêter tous les agents
    for (const [name] of this.agents) {
      await this.stopAgent(name)
    }

    this.running = false
    console.log('🎯 Agent Coordinator arrêté')

    const finalStats = this.getStats()
    console.log('📊 Stats finales:', finalStats)

    eventBus.emit('agent:coordinator:stopped', finalStats)
  }

  /**
   * Formate durée
   */
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
module.exports = new AgentCoordinator()
