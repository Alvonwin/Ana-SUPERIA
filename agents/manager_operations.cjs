const EventEmitter = require('events')
const eventBus = require('./shared_event_bus.cjs')

/**
 * 🎯 OPERATIONS MANAGER - Gardien de l'Infrastructure
 *
 * Domaine: Infrastructure & Communication
 * Supervise: Memory Manager, System Monitor, Alain Notifier
 *
 * Responsabilités:
 * - Optimiser gestion mémoire/disque
 * - Coordonner surveillance système
 * - Prioriser notifications à Alain
 * - Équilibrer: archivage vs alertes vs performance
 *
 * Philosophie:
 * "L'infrastructure doit être invisible quand ça marche,
 *  et immédiatement visible quand ça casse."
 */
class OperationsManager extends EventEmitter {
  constructor() {
    super()

    this.running = false
    this.agents = new Map() // Agents supervisés
    this.systemHealth = {
      memory: 'unknown',
      disk: 'unknown',
      services: 'unknown'
    }

    // Métriques
    this.stats = {
      archivesOrdered: 0,
      alertsEscalated: 0,
      optimizationsPerformed: 0,
      resourceConflictsResolved: 0,
      startTime: null
    }

    console.log('🎯 Operations Manager initialisé')
  }

  /**
   * Démarre le manager
   */
  async start() {
    if (this.running) {
      console.log('⚠️ Operations Manager déjà démarré')
      return
    }

    this.running = true
    this.stats.startTime = Date.now()

    console.log('🎯 Operations Manager démarré')
    console.log('   - Domaine: Infrastructure & Communication')
    console.log('   - Agents supervisés: 3')

    this.setupEventListeners()
    this.startMonitoring()

    eventBus.emit('manager:started', {
      manager: 'operations',
      domain: 'infrastructure',
      timestamp: Date.now()
    })
  }

  /**
   * Configure les listeners
   */
  setupEventListeners() {
    // Événements Memory Manager
    eventBus.on('memory:size_warning', (data) => {
      this.handleMemoryWarning(data)
    })

    eventBus.on('memory:size_critical', (data) => {
      this.handleMemoryCritical(data)
    })

    // Événements System Monitor
    eventBus.on('system:service_down', (data) => {
      this.handleServiceDown(data)
    })

    eventBus.on('system:disk_low', (data) => {
      this.handleDiskLow(data)
    })

    // Événements Alain Notifier
    eventBus.on('notification:urgent', (data) => {
      this.handleUrgentNotification(data)
    })
  }

  /**
   * Démarre la boucle de monitoring (toutes les 2 minutes)
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck()
    }, 2 * 60 * 1000) // 2 minutes

    // Premier check immédiat
    setTimeout(() => this.performHealthCheck(), 5000)
  }

  /**
   * Effectue un check de santé global
   */
  async performHealthCheck() {
    console.log('🎯 [Operations] Health check...')

    // Collecter statut des 3 agents
    const memoryStatus = await this.checkAgentHealth('memory_manager')
    const systemStatus = await this.checkAgentHealth('system_monitor')
    const notifierStatus = await this.checkAgentHealth('alain_notifier')

    // Analyser santé globale
    const overallHealth = this.analyzeOverallHealth({
      memory: memoryStatus,
      system: systemStatus,
      notifier: notifierStatus
    })

    // Prendre décisions si nécessaire
    if (overallHealth !== 'healthy') {
      this.takeCorrectiveAction(overallHealth)
    }

    // Rapporter au Master
    this.reportToMaster({
      health: overallHealth,
      agents: { memoryStatus, systemStatus, notifierStatus },
      load: this.calculateLoad()
    })
  }

  /**
   * Gère warning mémoire
   */
  handleMemoryWarning(data) {
    console.log('🎯 [Operations] Mémoire en warning:', data.file, data.sizeMB + 'MB')

    // Décision: faut-il archiver maintenant ou attendre?
    const shouldArchive = this.shouldTriggerArchive(data)

    if (shouldArchive) {
      console.log('🎯 [Operations] Ordre d\'archivage préventif')
      this.stats.archivesOrdered++

      eventBus.emit('operations:order_archive', {
        file: data.file,
        reason: 'preventive',
        priority: 'medium'
      })
    }
  }

  /**
   * Gère mémoire critique
   */
  handleMemoryCritical(data) {
    console.log('🔥 [Operations] MÉMOIRE CRITIQUE:', data.file)

    // Action immédiate!
    this.stats.archivesOrdered++

    eventBus.emit('operations:order_archive', {
      file: data.file,
      reason: 'critical',
      priority: 'high'
    })

    // Escalader au Master si vraiment critique
    if (data.sizeMB > 1000) { // > 1GB
      this.escalateToMaster({
        type: 'memory_critical',
        file: data.file,
        sizeMB: data.sizeMB
      })
    }

    // Notifier Alain via Alain Notifier
    eventBus.emit('operations:notify_alain', {
      level: 'important',
      title: 'Mémoire critique archivée',
      message: `Fichier ${data.file} (${data.sizeMB}MB) archivé automatiquement.`
    })
  }

  /**
   * Gère service down
   */
  handleServiceDown(data) {
    console.log('🔥 [Operations] SERVICE DOWN:', data.service)

    this.stats.alertsEscalated++

    // Déterminer criticité
    const critical = this.isCriticalService(data.service)

    if (critical) {
      // Escalader immédiatement au Master
      this.escalateToMaster({
        type: 'critical_service_down',
        service: data.service
      })

      // Alert urgente à Alain
      eventBus.emit('operations:notify_alain', {
        level: 'urgent',
        title: `🔥 Service critique DOWN: ${data.service}`,
        message: 'Action requise immédiatement!',
        action: 'Redémarrer le service'
      })
    } else {
      // Notification normale
      eventBus.emit('operations:notify_alain', {
        level: 'important',
        title: `Service down: ${data.service}`,
        message: 'Vérifier si redémarrage nécessaire'
      })
    }
  }

  /**
   * Gère disque faible
   */
  handleDiskLow(data) {
    console.log('🎯 [Operations] Disque faible:', data.percentFree + '%')

    // Analyser: peut-on nettoyer?
    const cleanupPossible = this.analyzeCleanupOpportunities()

    if (cleanupPossible) {
      console.log('🎯 [Operations] Nettoyage automatique déclenché')
      this.stats.optimizationsPerformed++

      eventBus.emit('operations:order_cleanup', {
        reason: 'disk_low',
        targets: ['temp_files', 'old_archives']
      })
    }

    // Si vraiment bas, notifier Alain
    if (data.percentFree < 10) {
      eventBus.emit('operations:notify_alain', {
        level: 'urgent',
        title: 'Disque presque plein!',
        message: `Seulement ${data.percentFree}% libre sur disque E:`
      })
    }
  }

  /**
   * Gère notification urgente
   */
  handleUrgentNotification(data) {
    console.log('🎯 [Operations] Notification urgente interceptée:', data.title)

    // Vérifier pas de spam
    // Coordonner avec autres managers si nécessaire
  }

  /**
   * Détermine si archivage nécessaire
   */
  shouldTriggerArchive(data) {
    // Logique simple pour l'instant:
    // - Si > 400MB en warning, archiver préventivement
    // - Considérer aussi: fréquence d'accès, importance fichier, etc.

    return data.sizeMB > 400
  }

  /**
   * Détermine si service est critique
   */
  isCriticalService(service) {
    const criticalServices = ['vite', 'backend', 'ollama']
    return criticalServices.includes(service)
  }

  /**
   * Analyse opportunités de nettoyage
   */
  analyzeCleanupOpportunities() {
    // Pour l'instant: toujours possible
    // En vrai: analyserait fichiers temp, vieux logs, etc.
    return true
  }

  /**
   * Escalade au Master Coordinator
   */
  escalateToMaster(issue) {
    console.log('🎯 [Operations] Escalade au Master:', issue.type)

    this.stats.alertsEscalated++

    eventBus.emit('manager:escalate', {
      manager: 'operations',
      issue
    })
  }

  /**
   * Rapporte au Master
   */
  reportToMaster(report) {
    eventBus.emit('manager:report', {
      manager: 'operations',
      report
    })
  }

  /**
   * Vérifie santé d'un agent
   */
  async checkAgentHealth(agentName) {
    // Simulé pour l'instant
    // En vrai: interrogerait l'agent via event bus
    return {
      status: 'healthy',
      lastCheck: new Date().toISOString()
    }
  }

  /**
   * Analyse santé globale
   */
  analyzeOverallHealth(status) {
    const healths = Object.values(status)
    const unhealthy = healths.filter(h => h.status !== 'healthy')

    if (unhealthy.length === 0) return 'healthy'
    if (unhealthy.length < healths.length / 2) return 'degraded'
    return 'critical'
  }

  /**
   * Calcule la charge actuelle
   */
  calculateLoad() {
    // Basé sur: nombre d'événements récents, taille queues, etc.
    // Simplifié pour l'instant
    return Math.random() * 0.5 // 0-50% charge
  }

  /**
   * Prend action corrective
   */
  takeCorrectiveAction(healthStatus) {
    console.log(`🎯 [Operations] Action corrective pour santé: ${healthStatus}`)

    if (healthStatus === 'critical') {
      this.escalateToMaster({
        type: 'infrastructure_critical',
        health: healthStatus
      })
    }

    this.stats.optimizationsPerformed++
  }

  /**
   * Enregistre un agent
   */
  registerAgent(name, instance) {
    this.agents.set(name, {
      instance,
      registeredAt: Date.now()
    })

    console.log(`🎯 [Operations] Agent enregistré: ${name}`)
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
      domain: 'infrastructure',
      agents: this.agents.size,
      performance: {
        archivesOrdered: this.stats.archivesOrdered,
        alertsEscalated: this.stats.alertsEscalated,
        optimizationsPerformed: this.stats.optimizationsPerformed,
        conflictsResolved: this.stats.resourceConflictsResolved
      },
      systemHealth: this.systemHealth
    }
  }

  /**
   * Arrête le manager
   */
  async stop() {
    if (!this.running) return

    console.log('🎯 Operations Manager arrêté')

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.running = false

    eventBus.emit('manager:stopped', {
      manager: 'operations'
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
module.exports = new OperationsManager()
