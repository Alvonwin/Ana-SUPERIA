#!/usr/bin/env node

/**
 * 🚀 START AGENTS - Lanceur principal de l'écosystème d'agents
 *
 * Ce script démarre tous les agents autonomes qui vont tourner en continu
 * pour assister Claude dans sa gestion de la mémoire et du système.
 */

const coordinator = require('./agent_coordinator.cjs')
const memoryManager = require('./agent_memory_manager.cjs')
const systemMonitor = require('./agent_system_monitor.cjs')
const eventBus = require('./shared_event_bus.cjs')
const dashboard = require('./dashboard_server.cjs')

// Couleurs console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

/**
 * Démarre tous les agents de manière séquentielle
 */
async function startAllAgents() {
  console.clear()
  log('═══════════════════════════════════════════════════════════', 'bright')
  log('         🤖 ÉCOSYSTÈME D\'AGENTS AUTONOMES CLAUDE          ', 'bright')
  log('═══════════════════════════════════════════════════════════', 'bright')
  console.log()

  try {
    // Enregistrer les agents dans le coordinator
    log('📝 Enregistrement des agents...', 'blue')
    coordinator.registerAgent('memory_manager', memoryManager)
    coordinator.registerAgent('system_monitor', systemMonitor)
    console.log()

    // Démarrer le coordinator
    log('🎯 Démarrage Agent Coordinator...', 'yellow')
    await coordinator.start()
    console.log()

    // Démarrer Memory Manager
    log('💾 Démarrage Memory Manager...', 'yellow')
    await coordinator.startAgent('memory_manager')
    console.log()

    // Démarrer System Monitor
    log('🔍 Démarrage System Monitor...', 'yellow')
    await coordinator.startAgent('system_monitor')
    console.log()
    // Démarrer Dashboard    log('📊 Démarrage Dashboard Server...', 'yellow')    await dashboard.start()    console.log()

    // Succès!
    log('═══════════════════════════════════════════════════════════', 'green')
    log('         ✅ TOUS LES AGENTS SONT OPÉRATIONNELS!            ', 'green')
    log('═══════════════════════════════════════════════════════════', 'green')
    console.log()

    // Afficher status
    displayStatus()

    // Configurer gestion arrêt propre
    setupGracefulShutdown()

  } catch (error) {
    log('═══════════════════════════════════════════════════════════', 'red')
    log(`         ❌ ERREUR DÉMARRAGE: ${error.message}             `, 'red')
    log('═══════════════════════════════════════════════════════════', 'red')
    console.error(error)
    process.exit(1)
  }
}

/**
 * Affiche le statut de tous les agents
 */
function displayStatus() {
  const stats = coordinator.getStats()

  log('📊 STATUT DU SYSTÈME:', 'bright')
  console.log()
  log(`   🤖 Agents actifs: ${stats.agents.running}/${stats.agents.total}`, 'green')
  log(`   ⏱️  Temps de fonctionnement: ${stats.uptime}`, 'blue')
  log(`   📋 Tâches traitées: ${stats.tasks.completed}`, 'blue')
  console.log()

  log('🔧 AGENTS EN COURS:', 'bright')
  const agentStatuses = coordinator.getAllAgentsStatus()

  for (const [name, status] of Object.entries(agentStatuses)) {
    const emoji = status.status === 'running' ? '✅' : '⚪'
    const statusText = status.status === 'running' ? 'RUNNING' : status.status.toUpperCase()
    log(`   ${emoji} ${name}: ${statusText}`, status.status === 'running' ? 'green' : 'yellow')
  }

  console.log()
  log('📡 EVENT BUS:', 'bright')
  const busStats = eventBus.getStats()
  log(`   📨 Événements: ${busStats.totalEvents}`, 'blue')
  log(`   ⏰ Temps de fonctionnement: ${busStats.uptime}`, 'blue')
  console.log()

  log('💡 COMMANDES:', 'bright')
  log('   - Ctrl+C: Arrêt propre de tous les agents', 'yellow')
  log('   - Le système tourne maintenant en continu...', 'yellow')
  console.log()
  log('───────────────────────────────────────────────────────────', 'bright')
}

/**
 * Configure l'arrêt propre sur Ctrl+C
 */
function setupGracefulShutdown() {
  let shuttingDown = false

  const shutdown = async (signal) => {
    if (shuttingDown) {
      log('\n⚠️  Arrêt forcé...', 'red')
      process.exit(1)
    }

    shuttingDown = true

    console.log()
    log('═══════════════════════════════════════════════════════════', 'yellow')
    log(`         🛑 ARRÊT DEMANDÉ (${signal})                      `, 'yellow')
    log('═══════════════════════════════════════════════════════════', 'yellow')
    console.log()

    try {
      log('⏹️  Arrêt des agents en cours...', 'yellow')

      // Arrêter tous les agents via coordinator
      await coordinator.stop()

      console.log()
      log('═══════════════════════════════════════════════════════════', 'green')
      log('         ✅ ARRÊT PROPRE TERMINÉ                          ', 'green')
      log('═══════════════════════════════════════════════════════════', 'green')
      console.log()

      // Afficher stats finales
      const finalStats = coordinator.getStats()
      log('📊 STATISTIQUES FINALES:', 'bright')
      log(`   Tâches reçues: ${finalStats.tasks.received}`, 'blue')
      log(`   Tâches complétées: ${finalStats.tasks.completed}`, 'green')
      log(`   Tâches échouées: ${finalStats.tasks.failed}`, 'red')
      log(`   Durée totale: ${finalStats.uptime}`, 'blue')
      console.log()

      process.exit(0)
    } catch (error) {
      log(`❌ Erreur lors de l'arrêt: ${error.message}`, 'red')
      process.exit(1)
    }
  }

  // Gérer Ctrl+C
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Gérer kill
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  // Gérer erreurs non capturées
  process.on('uncaughtException', (error) => {
    log('═══════════════════════════════════════════════════════════', 'red')
    log('         ❌ ERREUR NON CAPTURÉE                           ', 'red')
    log('═══════════════════════════════════════════════════════════', 'red')
    console.error(error)
    shutdown('uncaughtException')
  })

  process.on('unhandledRejection', (reason, promise) => {
    log('═══════════════════════════════════════════════════════════', 'red')
    log('         ❌ PROMESSE REJETÉE NON GÉRÉE                     ', 'red')
    log('═══════════════════════════════════════════════════════════', 'red')
    console.error('Raison:', reason)
    shutdown('unhandledRejection')
  })
}

/**
 * Affiche événements en temps réel (optionnel - pour debug)
 */
function setupLiveEventDisplay() {
  // Écouter tous les événements importants
  const importantEvents = [
    'memory:size_critical',
    'memory:archived',
    'system:service_down',
    'system:service_up',
    'system:disk_low',
    'task:delegated',
    'task:completed'
  ]

  importantEvents.forEach(event => {
    eventBus.on(event, (data) => {
      const timestamp = new Date().toLocaleTimeString('fr-FR')
      log(`[${timestamp}] ${event}`, 'blue')
    })
  })
}

// Démarrer le système
if (require.main === module) {
  startAllAgents().catch(error => {
    console.error('Erreur fatale:', error)
    process.exit(1)
  })
}

module.exports = {
  startAllAgents,
  coordinator,
  memoryManager,
  systemMonitor,
  eventBus
}
