const eventBus = require('./shared_event_bus.cjs')
const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)

/**
 * 🔍 AGENT SYSTEM MONITOR - Surveillance santé système ARCHON
 *
 * Responsabilités:
 * - Vérifier services (Vite, Backend, Voice, Ollama)
 * - Monitorer usage disque E:
 * - Détecter problèmes critiques
 * - Créer rapports santé
 * - Alertes automatiques
 */
class SystemMonitor {
  constructor() {
    this.running = false
    this.checkInterval = 60000 // 1 minute
    this.diskCheckInterval = 300000 // 5 minutes
    this.criticalDiskGB = 10 // Alerte si < 10GB

    // Services à surveiller
    this.services = {
      vite: { ports: [5173, 5174], name: 'Vite Dev Server' },
      backend: { ports: [3334], name: 'Backend API' },
      voice: { ports: [5000], name: 'Voice Platform' },
      ollama: { ports: [11434], name: 'Ollama' }
    }

    // État actuel
    this.state = {
      services: {},
      disk: {},
      lastCheck: null,
      checksPerformed: 0
    }

    console.log('🔍 System Monitor initialisé')
  }

  /**
   * Démarre le monitoring
   */
  async start() {
    if (this.running) {
      console.log('⚠️ System Monitor déjà démarré')
      return
    }

    this.running = true
    console.log('🔍 System Monitor démarré')
    console.log('   - Services surveillés:', Object.keys(this.services).join(', '))
    console.log(`   - Check toutes les ${this.checkInterval / 1000}s`)

    eventBus.emit('agent:system_monitor:started', {
      services: Object.keys(this.services),
      checkInterval: this.checkInterval
    })

    // Lancer boucles de monitoring
    this.serviceMonitorLoop()
    this.diskMonitorLoop()
  }

  /**
   * Boucle de surveillance des services
   */
  async serviceMonitorLoop() {
    while (this.running) {
      try {
        await this.checkAllServices()
        this.state.checksPerformed++
        this.state.lastCheck = new Date().toISOString()
      } catch (error) {
        console.error('❌ [SystemMonitor] Erreur check services:', error.message)
        eventBus.emit('agent:system_monitor:error', {
          type: 'service_check',
          error: error.message
        })
      }

      await this.sleep(this.checkInterval)
    }
  }

  /**
   * Boucle de surveillance du disque
   */
  async diskMonitorLoop() {
    while (this.running) {
      try {
        await this.checkDiskSpace()
      } catch (error) {
        console.error('❌ [SystemMonitor] Erreur check disque:', error.message)
      }

      await this.sleep(this.diskCheckInterval)
    }
  }

  /**
   * Vérifie tous les services
   */
  async checkAllServices() {
    const results = {}

    for (const [serviceName, config] of Object.entries(this.services)) {
      const status = await this.checkService(serviceName, config)
      results[serviceName] = status

      // Émettre événement si changement d'état
      const previousState = this.state.services[serviceName]
      if (previousState && previousState.running !== status.running) {
        if (status.running) {
          console.log(`✅ [SystemMonitor] ${config.name} est UP`)
          eventBus.emitSystemEvent('service_up', {
            service: serviceName,
            port: status.port
          })
        } else {
          console.log(`❌ [SystemMonitor] ${config.name} est DOWN`)
          eventBus.emitSystemEvent('service_down', {
            service: serviceName,
            ports: config.ports
          })
        }
      }
    }

    this.state.services = results

    // Rapport périodique (toutes les 10 checks)
    if (this.state.checksPerformed % 10 === 0) {
      const summary = this.getServicesSummary()
      eventBus.emitSystemEvent('health_check', summary)
    }

    return results
  }

  /**
   * Vérifie un service spécifique
   */
  async checkService(serviceName, config) {
    const { ports, name } = config

    // Essayer chaque port
    for (const port of ports) {
      const isRunning = await this.checkPort(port)

      if (isRunning) {
        return {
          running: true,
          port,
          name,
          checkedAt: new Date().toISOString()
        }
      }
    }

    return {
      running: false,
      ports,
      name,
      checkedAt: new Date().toISOString()
    }
  }

  /**
   * Vérifie si un port est ouvert (Windows)
   */
  async checkPort(port) {
    try {
      // Sur Windows, utiliser netstat
      const { stdout } = await execPromise(`netstat -ano | findstr :${port}`)

      // Si on trouve le port, c'est qu'il est utilisé
      return stdout.trim().length > 0
    } catch (error) {
      // Si netstat échoue ou ne trouve rien, le port n'est pas utilisé
      return false
    }
  }

  /**
   * Vérifie l'espace disque E:
   */
  async checkDiskSpace() {
    try {
      // Sur Windows, utiliser wmic
      const { stdout } = await execPromise('wmic logicaldisk where "DeviceID=\'E:\'" get FreeSpace,Size')

      const lines = stdout.trim().split('\n')
      if (lines.length < 2) {
        console.warn('⚠️ [SystemMonitor] Impossible de lire disque E:')
        return null
      }

      const values = lines[1].trim().split(/\s+/)
      if (values.length < 2) {
        return null
      }

      const freeSpace = parseInt(values[0], 10)
      const totalSpace = parseInt(values[1], 10)

      const diskInfo = {
        freeGB: Math.round(freeSpace / (1024 ** 3)),
        totalGB: Math.round(totalSpace / (1024 ** 3)),
        usedGB: Math.round((totalSpace - freeSpace) / (1024 ** 3)),
        percentFree: Math.round((freeSpace / totalSpace) * 100),
        checkedAt: new Date().toISOString()
      }

      this.state.disk = diskInfo

      // Alerte si critique
      if (diskInfo.freeGB < this.criticalDiskGB) {
        console.log(`⚠️ [SystemMonitor] Espace disque critique: ${diskInfo.freeGB}GB`)
        eventBus.emitSystemEvent('disk_low', diskInfo)
      }

      // Log périodique
      if (this.state.checksPerformed % 5 === 0) {
        console.log(`💾 [SystemMonitor] Disque E: ${diskInfo.freeGB}GB libres (${diskInfo.percentFree}%)`)
      }

      return diskInfo
    } catch (error) {
      console.error('❌ [SystemMonitor] Erreur check disque:', error.message)
      return null
    }
  }

  /**
   * Résumé de l'état des services
   */
  getServicesSummary() {
    const total = Object.keys(this.services).length
    const running = Object.values(this.state.services).filter(s => s.running).length
    const down = total - running

    return {
      total,
      running,
      down,
      services: this.state.services,
      disk: this.state.disk,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Récupère l'état complet du système
   */
  getSystemHealth() {
    const summary = this.getServicesSummary()

    return {
      ...summary,
      healthy: summary.down === 0 && (this.state.disk.freeGB || 999) > this.criticalDiskGB,
      checksPerformed: this.state.checksPerformed,
      lastCheck: this.state.lastCheck
    }
  }

  /**
   * Récupère les statistiques
   */
  getStats() {
    return {
      running: this.running,
      checksPerformed: this.state.checksPerformed,
      lastCheck: this.state.lastCheck,
      services: this.state.services,
      disk: this.state.disk
    }
  }

  /**
   * Arrête le monitoring
   */
  async stop() {
    if (!this.running) {
      console.log('⚠️ System Monitor déjà arrêté')
      return
    }

    this.running = false
    console.log('🔍 System Monitor arrêté')

    const finalStats = this.getStats()
    console.log('📊 Stats finales:', {
      checksPerformed: finalStats.checksPerformed,
      lastCheck: finalStats.lastCheck
    })

    eventBus.emit('agent:system_monitor:stopped', finalStats)
  }

  /**
   * Utilitaire: sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export instance singleton
module.exports = new SystemMonitor()
