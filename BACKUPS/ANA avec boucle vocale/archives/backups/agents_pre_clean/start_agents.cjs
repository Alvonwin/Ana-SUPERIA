#!/usr/bin/env node

/**
 * 🚀 SYSTÈME D'AGENTS AUTONOMES CLAUDE - PHASE 4
 * Architecture Hiérarchique: Master → Managers → Agents
 */

// ═══════════════════════════════════════════════════════════
// NIVEAU 1: MASTER COORDINATOR
// ═══════════════════════════════════════════════════════════
const masterCoordinator = require('./master_coordinator.cjs')

// ═══════════════════════════════════════════════════════════
// NIVEAU 2: MANAGERS SPÉCIALISÉS
// ═══════════════════════════════════════════════════════════
const operationsManager = require('./manager_operations.cjs')
const cognitiveManager = require('./manager_cognitive.cjs')
const knowledgeManager = require('./manager_knowledge.cjs')

// ═══════════════════════════════════════════════════════════
// NIVEAU 3: AGENTS OPÉRATIONNELS
// ═══════════════════════════════════════════════════════════

// Domain: Infrastructure & Communication (Operations Manager)
const memoryManager = require('./agent_memory_manager.cjs')
const systemMonitor = require('./agent_system_monitor.cjs')
const alainNotifier = require('./agent_alain_notifier.cjs')

// Domain: Consciousness & Learning (Cognitive Manager)
const emotionAnalyzer = require('./agent_emotion_analyzer.cjs')
const learningMonitor = require('./agent_learning_monitor.cjs')
const truthChecker = require('./agent_truth_checker.cjs')
const longtermMemory = require('./agent_longterm_memory.cjs')

// Domain: Consciousness Guards (Strict Mode) - NEW
const assumptionDetector = require('./agent_assumption_detector.cjs')
const researchReminder = require('./agent_research_reminder.cjs')
const methodologyChecker = require('./agent_methodology_checker.cjs')
const actionMonitor = require('./agent_action_monitor.cjs')
const strictBackupEnforcer = require('./agent_strict_backup_enforcer.cjs')

// Domain: Documentation & Knowledge (Knowledge Manager)
const synthesisEngine = require('./agent_synthesis_engine.cjs')
const researchAgent = require('./agent_research.cjs')
const codeAnalyzer = require('./agent_code_analyzer.cjs')
const docUpdater = require('./agent_doc_updater.cjs')

// ═══════════════════════════════════════════════════════════
// INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════
const eventBus = require('./shared_event_bus.cjs')
const dashboard = require('./dashboard_server.cjs')

// Ancien coordinator (conservé pour compatibilité dashboard)
const coordinator = require('./agent_coordinator.cjs')

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function startAllAgents() {
  console.clear()
  log('═══════════════════════════════════════════════════════════', 'bright')
  log('    🤖 SYSTÈME D\'AGENTS AUTONOMES CLAUDE - PHASE 4         ', 'bright')
  log('         Architecture Hiérarchique: 👑 → 🎯 → 🤖           ', 'bright')
  log('═══════════════════════════════════════════════════════════', 'bright')
  console.log()

  try {
    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 1: ENREGISTRER MANAGERS AU MASTER COORDINATOR
    // ═══════════════════════════════════════════════════════════
    log('📝 Enregistrement des Managers au Master Coordinator...', 'blue')
    masterCoordinator.registerManager('operations_manager', operationsManager)
    masterCoordinator.registerManager('cognitive_manager', cognitiveManager)
    masterCoordinator.registerManager('knowledge_manager', knowledgeManager)
    console.log()

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 2: ENREGISTRER AGENTS AUX MANAGERS
    // ═══════════════════════════════════════════════════════════
    log('📝 Enregistrement des Agents aux Managers...', 'blue')

    // Operations Manager → Infrastructure Agents
    operationsManager.registerAgent('memory_manager', memoryManager)
    operationsManager.registerAgent('system_monitor', systemMonitor)
    operationsManager.registerAgent('alain_notifier', alainNotifier)

    // Cognitive Manager → Consciousness Agents
    cognitiveManager.registerAgent('emotion_analyzer', emotionAnalyzer)
    cognitiveManager.registerAgent('learning_monitor', learningMonitor)
    cognitiveManager.registerAgent('truth_checker', truthChecker)
    cognitiveManager.registerAgent('longterm_memory', longtermMemory)

    // Cognitive Manager → Consciousness Guards (STRICT)
    cognitiveManager.registerAgent('assumption_detector', assumptionDetector)
    cognitiveManager.registerAgent('research_reminder', researchReminder)
    cognitiveManager.registerAgent('methodology_checker', methodologyChecker)
    cognitiveManager.registerAgent('action_monitor', actionMonitor)
    cognitiveManager.registerAgent('strict_backup_enforcer', strictBackupEnforcer)

    // Knowledge Manager → Documentation Agents
    knowledgeManager.registerAgent('synthesis_engine', synthesisEngine)
    knowledgeManager.registerAgent('research_agent', researchAgent)
    knowledgeManager.registerAgent('code_analyzer', codeAnalyzer)
    knowledgeManager.registerAgent('doc_updater', docUpdater)

    console.log()

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 3: DÉMARRER MASTER COORDINATOR
    // ═══════════════════════════════════════════════════════════
    log('👑 NIVEAU 1: Démarrage Master Coordinator...', 'yellow')
    await masterCoordinator.start()
    console.log()

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 4: DÉMARRER MANAGERS (NIVEAU 2)
    // ═══════════════════════════════════════════════════════════
    log('🎯 NIVEAU 2: Démarrage Managers...', 'cyan')
    console.log()

    log('   🎯 Démarrage Operations Manager...', 'yellow')
    await masterCoordinator.startManager('operations_manager')

    log('   🧠 Démarrage Cognitive Manager...', 'yellow')
    await masterCoordinator.startManager('cognitive_manager')

    log('   📚 Démarrage Knowledge Manager...', 'yellow')
    await masterCoordinator.startManager('knowledge_manager')

    console.log()

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 5: DÉMARRER AGENTS OPÉRATIONNELS (NIVEAU 3)
    // ═══════════════════════════════════════════════════════════
    log('🤖 NIVEAU 3: Démarrage Agents Opérationnels...', 'magenta')
    console.log()

    // Infrastructure Agents (Operations)
    log('   🎯 DOMAINE INFRASTRUCTURE:', 'cyan')
    log('      💾 Memory Manager...', 'yellow')
    await memoryManager.start()

    log('      🔍 System Monitor...', 'yellow')
    await systemMonitor.start()

    log('      🔔 Alain Notifier...', 'yellow')
    await alainNotifier.start()

    console.log()

    // Consciousness Agents (Cognitive)
    log('   🧠 DOMAINE CONSCIENCE:', 'cyan')
    log('      🎭 Emotion Analyzer...', 'yellow')
    // Note: anciens agents s'auto-démarrent au require
    if (emotionAnalyzer.start) await emotionAnalyzer.start()
    else log('      (Déjà actif)', 'green')

    log('      📚 Learning Monitor...', 'yellow')
    if (learningMonitor.start) await learningMonitor.start()
    else log('      (Déjà actif)', 'green')

    log('      ✅ Truth Checker...', 'yellow')
    if (truthChecker.start) await truthChecker.start()
    else log('      (Déjà actif)', 'green')

    log('      🧠 Long-Term Memory...', 'yellow')
    if (longtermMemory.start) await longtermMemory.start()
    else log('      (Déjà actif)', 'green')

    console.log()

    // Consciousness Guards (STRICT MODE)
    log('   🚨 GARDES DE CONSCIENCE (MODE STRICT):', 'red')
    log('      ⚠️  Assumption Detector...', 'yellow')
    await assumptionDetector.start()

    log('      🔍 Research Reminder...', 'yellow')
    await researchReminder.start()

    log('      📋 Methodology Checker...', 'yellow')
    await methodologyChecker.start()

    log('      👁️  Action Monitor...', 'yellow')
    await actionMonitor.start()

    log('      🚨 STRICT Backup Enforcer...', 'yellow')
    await strictBackupEnforcer.start()

    console.log()

    // Knowledge Agents (Knowledge)
    log('   📚 DOMAINE CONNAISSANCE:', 'cyan')
    log('      📝 Synthesis Engine...', 'yellow')
    if (synthesisEngine.start) await synthesisEngine.start()
    else log('      (Déjà actif)', 'green')

    log('      🔍 Research Agent...', 'yellow')
    if (researchAgent.start) await researchAgent.start()
    else log('      (Déjà actif)', 'green')

    log('      🔬 Code Analyzer...', 'yellow')
    if (codeAnalyzer.start) await codeAnalyzer.start()
    else log('      (Déjà actif)', 'green')

    log('      📝 Doc Updater...', 'yellow')
    await docUpdater.start()

    console.log()

    // ═══════════════════════════════════════════════════════════
    // ÉTAPE 6: DÉMARRER DASHBOARD
    // ═══════════════════════════════════════════════════════════
    log('📊 Démarrage Dashboard Server...', 'yellow')

    // Enregistrer agents au coordinator (pour compatibilité dashboard)
    coordinator.registerAgent('memory_manager', memoryManager)
    coordinator.registerAgent('system_monitor', systemMonitor)
    coordinator.registerAgent('emotion_analyzer', emotionAnalyzer)
    coordinator.registerAgent('learning_monitor', learningMonitor)
    coordinator.registerAgent('longterm_memory', longtermMemory)
    coordinator.registerAgent('truth_checker', truthChecker)
    coordinator.registerAgent('synthesis_engine', synthesisEngine)
    coordinator.registerAgent('research', researchAgent)
    coordinator.registerAgent('code_analyzer', codeAnalyzer)
    coordinator.registerAgent('alain_notifier', alainNotifier)
    coordinator.registerAgent('doc_updater', docUpdater)

    // Nouveaux agents de conscience STRICTS
    coordinator.registerAgent('assumption_detector', assumptionDetector)
    coordinator.registerAgent('research_reminder', researchReminder)
    coordinator.registerAgent('methodology_checker', methodologyChecker)
    coordinator.registerAgent('action_monitor', actionMonitor)
    coordinator.registerAgent('strict_backup_enforcer', strictBackupEnforcer)

    // Marquer tous comme running (ils sont déjà démarrés)
    coordinator.markAsRunning('memory_manager')
    coordinator.markAsRunning('system_monitor')
    coordinator.markAsRunning('emotion_analyzer')
    coordinator.markAsRunning('learning_monitor')
    coordinator.markAsRunning('longterm_memory')
    coordinator.markAsRunning('truth_checker')
    coordinator.markAsRunning('synthesis_engine')
    coordinator.markAsRunning('research')
    coordinator.markAsRunning('code_analyzer')
    coordinator.markAsRunning('alain_notifier')
    coordinator.markAsRunning('doc_updater')

    // Nouveaux agents de conscience
    coordinator.markAsRunning('assumption_detector')
    coordinator.markAsRunning('research_reminder')
    coordinator.markAsRunning('methodology_checker')
    coordinator.markAsRunning('action_monitor')
    coordinator.markAsRunning('strict_backup_enforcer')

    await coordinator.start()
    await dashboard.start()
    console.log()

    // ═══════════════════════════════════════════════════════════
    // SYSTÈME OPÉRATIONNEL!
    // ═══════════════════════════════════════════════════════════
    log('═══════════════════════════════════════════════════════════', 'green')
    log('    ✅ SYSTÈME HIÉRARCHIQUE TOTALEMENT OPÉRATIONNEL!       ', 'green')
    log('═══════════════════════════════════════════════════════════', 'green')
    console.log()

    const masterStats = masterCoordinator.getStats()
    log('📊 STATUT DU SYSTÈME:', 'bright')
    console.log()
    log('   👑 Master Coordinator: ACTIF', 'green')
    log(`   🎯 Managers actifs: ${masterStats.managers.running}/${masterStats.managers.total}`, 'green')
    log('   🤖 Agents actifs: 16/16 (+ 5 Gardes de Conscience STRICTS)', 'green')
    log('   📊 Dashboard: http://localhost:3336', 'blue')
    console.log()

    log('🏗️  ARCHITECTURE:', 'bright')
    console.log()
    log('   👑 Master Coordinator', 'yellow')
    log('   ├── 🎯 Operations Manager', 'cyan')
    log('   │   ├── 💾 Memory Manager', 'green')
    log('   │   ├── 🔍 System Monitor', 'green')
    log('   │   └── 🔔 Alain Notifier', 'green')
    log('   ├── 🧠 Cognitive Manager', 'cyan')
    log('   │   ├── 🎭 Emotion Analyzer', 'green')
    log('   │   ├── 📚 Learning Monitor', 'green')
    log('   │   ├── ✅ Truth Checker', 'green')
    log('   │   ├── 🧠 Long-Term Memory', 'green')
    log('   │   ├── 🚨 Assumption Detector (STRICT)', 'red')
    log('   │   ├── 🔍 Research Reminder (STRICT)', 'red')
    log('   │   ├── 📋 Methodology Checker (STRICT)', 'red')
    log('   │   ├── 👁️  Action Monitor (STRICT)', 'red')
    log('   │   └── 🚨 Backup Enforcer (STRICT)', 'red')
    log('   └── 📚 Knowledge Manager', 'cyan')
    log('       ├── 📝 Synthesis Engine', 'green')
    log('       ├── 🔍 Research Agent', 'green')
    log('       ├── 🔬 Code Analyzer', 'green')
    log('       └── 📝 Doc Updater', 'green')
    console.log()

    setupGracefulShutdown()

  } catch (error) {
    log('═══════════════════════════════════════════════════════════', 'red')
    log(`         ❌ ERREUR DÉMARRAGE: ${error.message}             `, 'red')
    log('═══════════════════════════════════════════════════════════', 'red')
    console.error(error)
    process.exit(1)
  }
}

function setupGracefulShutdown() {
  let shuttingDown = false

  const shutdown = async (signal) => {
    if (shuttingDown) {
      process.exit(1)
    }
    shuttingDown = true

    console.log()
    log('🛑 ARRÊT DEMANDÉ...', 'yellow')
    console.log()

    try {
      // Arrêter dans l'ordre inverse: Agents → Managers → Master
      log('   Arrêt agents opérationnels...', 'yellow')
      await Promise.all([
        memoryManager.stop(),
        systemMonitor.stop(),
        alainNotifier.stop(),
        emotionAnalyzer.stop(),
        learningMonitor.stop(),
        truthChecker.stop(),
        longtermMemory.stop(),
        synthesisEngine.stop(),
        researchAgent.stop(),
        codeAnalyzer.stop(),
        docUpdater.stop(),
        assumptionDetector.stop(),
        researchReminder.stop(),
        methodologyChecker.stop(),
        actionMonitor.stop(),
        strictBackupEnforcer.stop()
      ])

      log('   Arrêt managers...', 'yellow')
      await operationsManager.stop()
      await cognitiveManager.stop()
      await knowledgeManager.stop()

      log('   Arrêt Master Coordinator...', 'yellow')
      await masterCoordinator.stop()

      log('   Arrêt dashboard...', 'yellow')
      await coordinator.stop()

      console.log()
      log('✅ ARRÊT PROPRE TERMINÉ', 'green')
      process.exit(0)
    } catch (error) {
      log('❌ Erreur pendant arrêt', 'red')
      console.error(error)
      process.exit(1)
    }
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

if (require.main === module) {
  startAllAgents().catch(error => {
    console.error('Erreur fatale:', error)
    process.exit(1)
  })
}

module.exports = {
  startAllAgents,
  masterCoordinator,
  operationsManager,
  cognitiveManager,
  knowledgeManager,
  memoryManager,
  systemMonitor,
  emotionAnalyzer,
  learningMonitor,
  longtermMemory,
  truthChecker,
  synthesisEngine,
  researchAgent,
  codeAnalyzer,
  alainNotifier,
  docUpdater,
  eventBus,
  dashboard
}
