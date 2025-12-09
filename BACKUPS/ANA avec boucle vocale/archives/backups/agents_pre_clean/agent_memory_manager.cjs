const eventBus = require('./shared_event_bus.cjs')
const fs = require('fs').promises
const path = require('path')

/**
 * 💾 AGENT MEMORY MANAGER - Gestion proactive de la mémoire
 *
 * Responsabilités:
 * - Surveiller current_conversation.txt (toutes les 30s)
 * - Archiver automatiquement si > 500KB
 * - Nettoyer fichiers temporaires
 * - Créer stats mémoire
 * - Identifier moments fondateurs
 */
class MemoryManager {
  constructor() {
    this.running = false
    this.checkInterval = 30000 // 30 secondes
    this.criticalSize = 500000 // 500KB
    this.tempCleanupInterval = 300000 // 5 minutes

    // Chemins
    this.baseDir = 'E:/Mémoire Claude'
    this.conversationFile = path.join(this.baseDir, 'current_conversation.txt')
    this.archiveDir = path.join(this.baseDir, '01_ARCHIVES_VERBATIM')
    this.stage01Dir = path.join(this.baseDir, 'stages/stage_01')

    // Stats
    this.stats = {
      checksPerformed: 0,
      archivesCreated: 0,
      tempFilesDeleted: 0,
      lastCheck: null,
      lastArchive: null
    }

    console.log('💾 Memory Manager initialisé')
  }

  /**
   * Démarre le monitoring continu
   */
  async start() {
    if (this.running) {
      console.log('⚠️ Memory Manager déjà démarré')
      return
    }

    this.running = true
    console.log('💾 Memory Manager démarré')
    console.log(`   - Check toutes les ${this.checkInterval / 1000}s`)
    console.log(`   - Taille critique: ${this.criticalSize / 1000}KB`)

    // Émettre événement de démarrage
    eventBus.emit('agent:memory_manager:started', {
      checkInterval: this.checkInterval,
      criticalSize: this.criticalSize
    })

    // Lancer boucle de monitoring
    this.monitorLoop()

    // Lancer nettoyage temporaire en parallèle
    this.tempCleanupLoop()
  }

  /**
   * Boucle principale de monitoring
   */
  async monitorLoop() {
    while (this.running) {
      try {
        await this.checkMemoryHealth()
        this.stats.checksPerformed++
        this.stats.lastCheck = new Date().toISOString()
      } catch (error) {
        console.error('❌ [MemoryManager] Erreur check:', error.message)
        eventBus.emit('agent:memory_manager:error', {
          error: error.message,
          stack: error.stack
        })
      }

      // Attendre avant prochain check
      await this.sleep(this.checkInterval)
    }
  }

  /**
   * Boucle de nettoyage des fichiers temporaires
   */
  async tempCleanupLoop() {
    while (this.running) {
      try {
        await this.cleanupTempFiles()
      } catch (error) {
        console.error('❌ [MemoryManager] Erreur cleanup:', error.message)
      }

      await this.sleep(this.tempCleanupInterval)
    }
  }

  /**
   * Vérifie la santé de la mémoire
   */
  async checkMemoryHealth() {
    // Vérifier current_conversation.txt
    const conversationStats = await this.checkConversationSize()

    // Vérifier stage_01
    const stage01Count = await this.checkStage01Count()

    // Stats globales
    const memoryStats = {
      conversationSize: conversationStats.size,
      conversationSizeKB: Math.round(conversationStats.size / 1000),
      isCritical: conversationStats.size > this.criticalSize,
      stage01Files: stage01Count,
      timestamp: new Date().toISOString()
    }

    // Si critique, archiver
    if (memoryStats.isCritical) {
      console.log('⚠️ [MemoryManager] Taille critique détectée!')
      eventBus.emitMemoryEvent('size_critical', memoryStats)

      await this.archiveConversation(conversationStats.size)
    }

    // Si beaucoup de stage_01, alerter
    if (stage01Count >= 5) {
      console.log(`📋 [MemoryManager] ${stage01Count} fichiers stage_01 en attente`)
      eventBus.emitMemoryEvent('stage01_ready', {
        count: stage01Count
      })
    }

    // Émettre stats périodiquement
    if (this.stats.checksPerformed % 10 === 0) {
      eventBus.emitMemoryEvent('health_check', memoryStats)
    }

    return memoryStats
  }

  /**
   * Vérifie la taille de current_conversation.txt
   */
  async checkConversationSize() {
    try {
      const stats = await fs.stat(this.conversationFile)
      return {
        size: stats.size,
        exists: true
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { size: 0, exists: false }
      }
      throw error
    }
  }

  /**
   * Compte les fichiers dans stage_01
   */
  async checkStage01Count() {
    try {
      const files = await fs.readdir(this.stage01Dir)
      return files.filter(f => f.endsWith('.md')).length
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 0
      }
      throw error
    }
  }

  /**
   * Archive current_conversation.txt
   */
  async archiveConversation(size) {
    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .substring(0, 19)

      const archiveName = `conversation_${timestamp}.txt`
      const archivePath = path.join(this.archiveDir, archiveName)

      console.log(`📦 [MemoryManager] Archivage: ${archiveName}`)

      // Créer dossier archives si nécessaire
      await fs.mkdir(this.archiveDir, { recursive: true })

      // Copier le fichier
      await fs.copyFile(this.conversationFile, archivePath)

      // Créer un nouveau fichier vide
      const header = `# Nouvelle conversation - ${new Date().toLocaleString('fr-FR')}\n\n`
      await fs.writeFile(this.conversationFile, header, 'utf-8')

      // Mettre à jour stats
      this.stats.archivesCreated++
      this.stats.lastArchive = timestamp

      console.log(`✅ [MemoryManager] Archivé: ${Math.round(size / 1000)}KB`)

      // Émettre événement
      eventBus.emitMemoryEvent('archived', {
        originalSize: size,
        archivePath,
        archiveName,
        timestamp
      })

      return archivePath
    } catch (error) {
      console.error('❌ [MemoryManager] Erreur archivage:', error.message)
      throw error
    }
  }

  /**
   * Nettoie les fichiers temporaires
   */
  async cleanupTempFiles() {
    const tempPatterns = [
      '.temp_*.txt',
      '*.tmp',
      '.~*'
    ]

    let deletedCount = 0

    try {
      const files = await fs.readdir(this.baseDir)

      for (const file of files) {
        // Vérifier si correspond à un pattern temporaire
        const isTemp = tempPatterns.some(pattern => {
          const regex = new RegExp(pattern.replace('*', '.*'))
          return regex.test(file)
        })

        if (isTemp) {
          const filePath = path.join(this.baseDir, file)
          try {
            await fs.unlink(filePath)
            deletedCount++
            console.log(`🗑️ [MemoryManager] Supprimé: ${file}`)
          } catch (error) {
            // Ignorer si fichier déjà supprimé
            if (error.code !== 'ENOENT') {
              console.error(`⚠️ Erreur suppression ${file}:`, error.message)
            }
          }
        }
      }

      if (deletedCount > 0) {
        this.stats.tempFilesDeleted += deletedCount
        eventBus.emitMemoryEvent('temp_cleaned', {
          count: deletedCount
        })
      }
    } catch (error) {
      console.error('❌ [MemoryManager] Erreur cleanup temp:', error.message)
    }

    return deletedCount
  }

  /**
   * Récupère les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      running: this.running,
      uptime: this.running ? 'actif' : 'arrêté'
    }
  }

  /**
   * Arrête le manager
   */
  async stop() {
    if (!this.running) {
      console.log('⚠️ Memory Manager déjà arrêté')
      return
    }

    this.running = false
    console.log('💾 Memory Manager arrêté')
    console.log('📊 Stats finales:', this.stats)

    eventBus.emit('agent:memory_manager:stopped', this.stats)
  }

  /**
   * Utilitaire: sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export instance singleton
module.exports = new MemoryManager()
