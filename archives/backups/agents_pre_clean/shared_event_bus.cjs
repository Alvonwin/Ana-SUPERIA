const EventEmitter = require('events')

/**
 * 🔗 SHARED EVENT BUS - Communication centrale pour tous les agents
 *
 * Permet à tous les agents de communiquer de façon décentralisée.
 * Tous les événements sont loggés et historisés pour analyse.
 */
class SharedEventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(50) // Support pour beaucoup d'agents
    this.logEvents = true
    this.eventHistory = []
    this.startTime = Date.now()

    console.log('🔗 SharedEventBus initialisé')
  }

  /**
   * Émet un événement avec logging automatique
   */
  emit(event, data) {
    if (this.logEvents) {
      const logEntry = {
        event,
        data,
        timestamp: new Date().toISOString(),
        timestampMs: Date.now()
      }

      this.eventHistory.push(logEntry)

      // Garder seulement les 100 derniers événements
      if (this.eventHistory.length > 100) {
        this.eventHistory.shift()
      }

      // Log console avec emoji selon type d'événement
      const emoji = this._getEmojiForEvent(event)
      console.log(`${emoji} [EventBus] ${event}`)
    }

    return super.emit(event, data)
  }

  /**
   * Événements typés pour mémoire
   */
  emitMemoryEvent(type, data) {
    this.emit(`memory:${type}`, data)
  }

  /**
   * Événements typés pour système
   */
  emitSystemEvent(type, data) {
    this.emit(`system:${type}`, data)
  }

  /**
   * Événements typés pour tâches
   */
  emitTaskEvent(type, data) {
    this.emit(`task:${type}`, data)
  }

  /**
   * Événements typés pour apprentissage
   */
  emitLearningEvent(type, data) {
    this.emit(`learning:${type}`, data)
  }

  /**
   * Événements typés pour synthèse
   */
  emitSynthesisEvent(type, data) {
    this.emit(`synthesis:${type}`, data)
  }

  /**
   * Récupère l'historique des N derniers événements
   */
  getHistory(limit = 10) {
    return this.eventHistory.slice(-limit)
  }

  /**
   * Récupère tous les événements d'un certain type
   */
  getEventsByType(eventType) {
    return this.eventHistory.filter(e => e.event.startsWith(eventType))
  }

  /**
   * Statistiques de l'event bus
   */
  getStats() {
    const now = Date.now()
    const uptimeMs = now - this.startTime

    // Compter événements par type
    const eventsByType = {}
    this.eventHistory.forEach(e => {
      const type = e.event.split(':')[0]
      eventsByType[type] = (eventsByType[type] || 0) + 1
    })

    return {
      uptime: this._formatUptime(uptimeMs),
      totalEvents: this.eventHistory.length,
      eventsByType,
      listeners: this.listenerCount('*') || 0
    }
  }

  /**
   * Nettoie l'historique
   */
  clearHistory() {
    this.eventHistory = []
    console.log('🧹 [EventBus] Historique nettoyé')
  }

  /**
   * Active/désactive le logging
   */
  setLogging(enabled) {
    this.logEvents = enabled
    console.log(`📝 [EventBus] Logging ${enabled ? 'activé' : 'désactivé'}`)
  }

  /**
   * Retourne emoji selon type d'événement
   */
  _getEmojiForEvent(event) {
    if (event.startsWith('memory:')) return '💾'
    if (event.startsWith('system:')) return '🔍'
    if (event.startsWith('task:')) return '📋'
    if (event.startsWith('learning:')) return '🎓'
    if (event.startsWith('synthesis:')) return '📝'
    if (event.startsWith('agent:')) return '🤖'
    return '🔔'
  }

  /**
   * Formate durée de fonctionnement
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
module.exports = new SharedEventBus()
