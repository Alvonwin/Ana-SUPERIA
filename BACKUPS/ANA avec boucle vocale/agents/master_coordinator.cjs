const EventEmitter = require('events')
const eventBus = require('./shared_event_bus.cjs')

/**
 * 👑 MASTER COORDINATOR - Chef d'Orchestre Suprême
 *
 * Responsabilités:
 * - Vue stratégique globale du système
 * - Délégation intelligente aux managers
 * - Résolution de conflits inter-managers
 * - Priorisation des ressources système
 * - Décisions architecturales
 *
 * Philosophie:
 * "Je ne fais pas le travail. Je décide QUI le fait et COMMENT."
 */
class MasterCoordinator extends EventEmitter {
  constructor() {
    super()

    this.running = false
    this.managers = new Map() // Managers supervisés
    this.taskQueue = [] // File de tâches globales
    this.systemPriorities = {
      critical: [],
      high: [],
      medium: [],
      low: []
    }

    // Métriques de performance
    this.stats = {
      tasksReceived: 0,
      tasksDelegated: 0,
      tasksCompleted: 0,
      conflictsResolved: 0,
      decisionsStrategic: 0,
      startTime: null
    }

    console.log('👑 Master Coordinator initialisé')
  }

  /**
   * Démarre le Master Coordinator
   */
  async start() {
    if (this.running) {
      console.log('⚠️ Master Coordinator déjà démarré')
      return
    }

    this.running = true
    this.stats.startTime = Date.now()

    console.log('👑 Master Coordinator démarré')
    console.log('   - Vision stratégique: ACTIVE')
    console.log('   - Délégation intelligente: ACTIVE')
    console.log('   - Résolution conflits: ACTIVE')

    this.setupEventListeners()
    this.startStrategicThinking()

    eventBus.emit('master:started', {
      startTime: this.stats.startTime
    })
  }

  /**
   * Configure les listeners d'événements
   */
  setupEventListeners() {
    // Écouter les demandes de délégation des managers
    eventBus.on('manager:request_delegation', (data) => {
      this.handleManagerRequest(data)
    })

    // Écouter les conflits entre managers
    eventBus.on('manager:conflict', (data) => {
      this.resolveConflict(data)
    })

    // Écouter les événements critiques système
    eventBus.on('system:critical', (data) => {
      this.handleCriticalEvent(data)
    })

    // Écouter les rapports de managers
    eventBus.on('manager:report', (data) => {
      this.processManagerReport(data)
    })
  }

  /**
   * Boucle de pensée stratégique (toutes les 5 minutes)
   */
  startStrategicThinking() {
    this.strategicInterval = setInterval(() => {
      this.performStrategicAnalysis()
    }, 5 * 60 * 1000) // 5 minutes

    // Première analyse immédiate
    setTimeout(() => this.performStrategicAnalysis(), 10000) // 10s après démarrage
  }

  /**
   * Analyse stratégique du système
   */
  async performStrategicAnalysis() {
    console.log('👑 [Master] Analyse stratégique...')

    this.stats.decisionsStrategic++

    // 1. Collecter statut de tous les managers
    const managersStatus = this.getAllManagersStatus()

    // 2. Identifier les goulots d'étranglement
    const bottlenecks = this.identifyBottlenecks(managersStatus)

    // 3. Optimiser allocation ressources
    if (bottlenecks.length > 0) {
      console.log(`👑 [Master] ${bottlenecks.length} goulots détectés`)
      this.optimizeResources(bottlenecks)
    }

    // 4. Vérifier cohérence globale
    this.verifySystemCoherence()

    // 5. Planifier actions futures
    this.planStrategicActions()

    eventBus.emit('master:strategic_analysis_complete', {
      bottlenecks: bottlenecks.length,
      managers: managersStatus.length,
      timestamp: Date.now()
    })
  }

  /**
   * Enregistre un manager
   */
  registerManager(name, managerInstance) {
    this.managers.set(name, {
      instance: managerInstance,
      status: 'registered',
      domain: this.determineManagerDomain(name),
      load: 0,
      lastReport: null,
      registeredAt: Date.now()
    })

    console.log(`👑 [Master] Manager enregistré: ${name}`)
    eventBus.emit('master:manager_registered', { name })
  }

  /**
   * Détermine le domaine d'un manager
   */
  determineManagerDomain(name) {
    const domains = {
      'operations_manager': 'infrastructure',
      'cognitive_manager': 'consciousness',
      'knowledge_manager': 'documentation'
    }
    return domains[name] || 'unknown'
  }

  /**
   * Démarre un manager spécifique
   */
  async startManager(name) {
    const manager = this.managers.get(name)

    if (!manager) {
      console.error(`❌ [Master] Manager inconnu: ${name}`)
      return false
    }

    if (manager.status === 'running') {
      console.log(`⚠️ [Master] Manager ${name} déjà démarré`)
      return true
    }

    try {
      console.log(`🚀 [Master] Démarrage manager: ${name}`)

      if (typeof manager.instance.start === 'function') {
        await manager.instance.start()
      }

      manager.status = 'running'
      manager.startedAt = Date.now()

      eventBus.emit('master:manager_started', { name })
      return true
    } catch (error) {
      console.error(`❌ [Master] Erreur démarrage ${name}:`, error.message)
      manager.status = 'error'
      manager.error = error.message
      return false
    }
  }

  /**
   * Délègue une tâche complexe
   */
  async delegateTask(task) {
    console.log(`👑 [Master] Analyse tâche pour délégation: ${task.type}`)

    this.stats.tasksReceived++

    // 1. Analyser la complexité et le domaine
    const analysis = this.analyzeTask(task)

    // 2. Identifier le manager approprié
    const targetManager = this.selectManager(analysis)

    if (!targetManager) {
      console.log(`👑 [Master] Aucun manager approprié pour: ${task.type}`)
      return { success: false, reason: 'no_suitable_manager' }
    }

    // 3. Vérifier la charge du manager
    const manager = this.managers.get(targetManager)
    if (manager.load > 0.8) {
      console.log(`👑 [Master] Manager ${targetManager} surchargé, mise en queue`)
      this.queueTask(task, targetManager)
      return { success: true, queued: true, manager: targetManager }
    }

    // 4. Déléguer
    console.log(`👑 [Master] Délégation à: ${targetManager}`)
    this.stats.tasksDelegated++

    eventBus.emit('master:task_delegated', {
      task,
      manager: targetManager,
      timestamp: Date.now()
    })

    return { success: true, manager: targetManager }
  }

  /**
   * Analyse une tâche pour déterminer domaine et complexité
   */
  analyzeTask(task) {
    const { type, description, priority } = task

    // Règles de classification par domaine
    const domainRules = {
      infrastructure: ['memory', 'disk', 'system', 'monitoring', 'alert'],
      consciousness: ['emotion', 'learning', 'truth', 'belief', 'pattern'],
      documentation: ['doc', 'research', 'synthesis', 'code', 'knowledge']
    }

    let bestDomain = 'unknown'
    let maxScore = 0

    for (const [domain, keywords] of Object.entries(domainRules)) {
      const score = keywords.filter(kw =>
        type.toLowerCase().includes(kw) ||
        description?.toLowerCase().includes(kw)
      ).length

      if (score > maxScore) {
        maxScore = score
        bestDomain = domain
      }
    }

    return {
      domain: bestDomain,
      complexity: this.estimateComplexity(task),
      priority: priority || 'medium'
    }
  }

  /**
   * Estime la complexité d'une tâche
   */
  estimateComplexity(task) {
    let complexity = 0

    if (task.requiresMultipleAgents) complexity += 3
    if (task.estimatedTime > 3600) complexity += 2
    if (task.dependencies?.length > 0) complexity += task.dependencies.length
    if (task.criticalPath) complexity += 2

    if (complexity >= 5) return 'high'
    if (complexity >= 2) return 'medium'
    return 'low'
  }

  /**
   * Sélectionne le manager approprié
   */
  selectManager(analysis) {
    const { domain } = analysis

    const managersByDomain = {
      infrastructure: 'operations_manager',
      consciousness: 'cognitive_manager',
      documentation: 'knowledge_manager'
    }

    return managersByDomain[domain] || null
  }

  /**
   * Gère une demande d'un manager
   */
  handleManagerRequest(data) {
    const { manager, request, reason } = data

    console.log(`👑 [Master] Demande de ${manager}: ${request}`)

    // Exemples de demandes:
    // - Besoin de plus de ressources
    // - Demande d'arbitrage
    // - Besoin d'aide d'un autre manager

    switch (request) {
      case 'more_resources':
        this.allocateResources(manager, reason)
        break
      case 'arbitration':
        this.arbitrate(manager, reason)
        break
      case 'cross_manager_help':
        this.coordinateCrossManager(manager, reason)
        break
    }
  }

  /**
   * Résout un conflit entre managers
   */
  resolveConflict(data) {
    const { managers, issue, priority } = data

    console.log(`👑 [Master] CONFLIT détecté: ${issue}`)
    console.log(`   Parties: ${managers.join(', ')}`)

    this.stats.conflictsResolved++

    // Logique de résolution (simplifiée pour l'instant)
    // En vrai, ce serait beaucoup plus sophistiqué

    const decision = {
      resolution: 'priority_based',
      winner: this.selectPriorityManager(managers, priority),
      timestamp: Date.now()
    }

    console.log(`👑 [Master] Décision: ${decision.winner} a priorité`)

    eventBus.emit('master:conflict_resolved', {
      managers,
      decision,
      issue
    })
  }

  /**
   * Gère un événement critique
   */
  handleCriticalEvent(data) {
    console.log(`👑 [Master] 🔥 ÉVÉNEMENT CRITIQUE: ${data.type}`)

    // Décision immédiate - bypass managers si nécessaire
    this.systemPriorities.critical.push({
      event: data,
      timestamp: Date.now()
    })

    // Déclencher action immédiate appropriée
    eventBus.emit('master:critical_action', data)
  }

  /**
   * Traite un rapport de manager
   */
  processManagerReport(data) {
    const { manager, report } = data

    const managerData = this.managers.get(manager)
    if (managerData) {
      managerData.lastReport = report
      managerData.load = report.load || 0
    }
  }

  /**
   * Identifie les goulots d'étranglement
   */
  identifyBottlenecks(managersStatus) {
    const bottlenecks = []

    for (const status of managersStatus) {
      if (status.load > 0.8) {
        bottlenecks.push({
          manager: status.name,
          load: status.load,
          reason: 'high_load'
        })
      }

      if (status.queueLength > 10) {
        bottlenecks.push({
          manager: status.name,
          queueLength: status.queueLength,
          reason: 'queue_overflow'
        })
      }
    }

    return bottlenecks
  }

  /**
   * Optimise l'allocation de ressources
   */
  optimizeResources(bottlenecks) {
    for (const bottleneck of bottlenecks) {
      console.log(`👑 [Master] Optimisation: ${bottleneck.manager}`)

      // Ici on pourrait:
      // - Redistribuer tâches à d'autres managers
      // - Ajuster priorités
      // - Temporairement augmenter ressources

      eventBus.emit('master:resource_optimization', {
        manager: bottleneck.manager,
        action: 'redistribute_load'
      })
    }
  }

  /**
   * Vérifie la cohérence globale du système
   */
  verifySystemCoherence() {
    // Vérifier que tous les managers communiquent bien
    // Vérifier pas de boucles infinies
    // Vérifier pas de deadlocks

    console.log('👑 [Master] Vérification cohérence système...')
  }

  /**
   * Planifie des actions stratégiques
   */
  planStrategicActions() {
    // Analyser tendances long terme
    // Planifier évolutions futures
    // Optimisations préventives

    console.log('👑 [Master] Planification stratégique...')
  }

  /**
   * Récupère le statut de tous les managers
   */
  getAllManagersStatus() {
    const statuses = []

    for (const [name, manager] of this.managers) {
      statuses.push({
        name,
        status: manager.status,
        domain: manager.domain,
        load: manager.load,
        lastReport: manager.lastReport
      })
    }

    return statuses
  }

  /**
   * Récupère les statistiques du Master Coordinator
   */
  getStats() {
    const uptime = this.stats.startTime
      ? Date.now() - this.stats.startTime
      : 0

    return {
      running: this.running,
      uptime: this._formatUptime(uptime),
      managers: {
        total: this.managers.size,
        running: Array.from(this.managers.values()).filter(m => m.status === 'running').length
      },
      tasks: {
        received: this.stats.tasksReceived,
        delegated: this.stats.tasksDelegated,
        completed: this.stats.tasksCompleted
      },
      governance: {
        conflictsResolved: this.stats.conflictsResolved,
        strategicDecisions: this.stats.decisionsStrategic
      }
    }
  }

  /**
   * Arrête le Master Coordinator
   */
  async stop() {
    if (!this.running) {
      console.log('⚠️ Master Coordinator déjà arrêté')
      return
    }

    console.log('👑 [Master] Arrêt de tous les managers...')

    // Arrêter la boucle stratégique
    if (this.strategicInterval) {
      clearInterval(this.strategicInterval)
    }

    // Arrêter tous les managers
    for (const [name] of this.managers) {
      await this.stopManager(name)
    }

    this.running = false
    console.log('👑 Master Coordinator arrêté')

    const finalStats = this.getStats()
    console.log('📊 Stats finales Master:', finalStats)

    eventBus.emit('master:stopped', finalStats)
  }

  /**
   * Arrête un manager spécifique
   */
  async stopManager(name) {
    const manager = this.managers.get(name)

    if (!manager || manager.status !== 'running') {
      return
    }

    try {
      if (typeof manager.instance.stop === 'function') {
        await manager.instance.stop()
      }

      manager.status = 'stopped'
      manager.stoppedAt = Date.now()

      eventBus.emit('master:manager_stopped', { name })
    } catch (error) {
      console.error(`❌ [Master] Erreur arrêt ${name}:`, error.message)
    }
  }

  /**
   * Helpers
   */
  queueTask(task, manager) {
    this.taskQueue.push({ task, manager, queuedAt: Date.now() })
  }

  selectPriorityManager(managers, priority) {
    // Pour l'instant, simple: premier dans la liste
    // En vrai, analyserait load, domaine, etc.
    return managers[0]
  }

  allocateResources(manager, reason) {
    console.log(`👑 [Master] Allocation ressources à ${manager}`)
    eventBus.emit('master:resources_allocated', { manager, reason })
  }

  arbitrate(manager, reason) {
    console.log(`👑 [Master] Arbitrage pour ${manager}`)
    eventBus.emit('master:arbitration', { manager, reason })
  }

  coordinateCrossManager(manager, reason) {
    console.log(`👑 [Master] Coordination cross-manager depuis ${manager}`)
    eventBus.emit('master:cross_coordination', { manager, reason })
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
module.exports = new MasterCoordinator()
