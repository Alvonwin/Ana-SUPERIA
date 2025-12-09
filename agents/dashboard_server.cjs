const express = require('express')
const path = require('path')
const eventBus = require('./shared_event_bus.cjs')
const coordinator = require('./agent_coordinator.cjs')

/**
 * 📊 DASHBOARD SERVER - Interface web pour monitoring des agents
 *
 * API:
 * - GET /api/status - État complet du système
 * - GET /api/events - Derniers événements
 * - GET /api/agents - Statut de tous les agents
 * - GET / - Interface HTML
 */

const app = express()
const PORT = 3336

// Stats globales
let recentEvents = []
let systemStartTime = Date.now()

// Capturer tous les événements
const originalEmit = eventBus.emit.bind(eventBus)
eventBus.emit = function(event, data) {
  // Ajouter à l'historique
  recentEvents.unshift({
    event,
    data,
    timestamp: new Date().toISOString(),
    timestampMs: Date.now()
  })

  // Garder seulement les 50 derniers
  if (recentEvents.length > 50) {
    recentEvents = recentEvents.slice(0, 50)
  }

  // Appeler la méthode originale
  return originalEmit(event, data)
}

// Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

/**
 * API: Status complet
 */
app.get('/api/status', (req, res) => {
  const stats = coordinator.getStats()
  const busStats = eventBus.getStats()
  const agentStatuses = coordinator.getAllAgentsStatus()

  res.json({
    system: {
      uptime: Date.now() - systemStartTime,
      uptimeFormatted: formatUptime(Date.now() - systemStartTime),
      timestamp: new Date().toISOString()
    },
    coordinator: stats,
    eventBus: busStats,
    agents: agentStatuses,
    health: determineHealth(stats, agentStatuses)
  })
})

/**
 * API: Derniers événements
 */
app.get('/api/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 10
  res.json({
    events: recentEvents.slice(0, limit),
    total: recentEvents.length
  })
})

/**
 * API: Statut des agents
 */
app.get('/api/agents', (req, res) => {
  const agentStatuses = coordinator.getAllAgentsStatus()
  res.json({
    agents: agentStatuses,
    count: Object.keys(agentStatuses).length
  })
})

/**
 * API: Statistiques EventBus
 */
app.get('/api/eventbus', (req, res) => {
  const stats = eventBus.getStats()
  res.json(stats)
})

/**
 * Page HTML principale
 */
app.get('/', (req, res) => {
  res.send(generateDashboardHTML())
})

/**
 * Détermine la santé globale du système
 */
function determineHealth(stats, agentStatuses) {
  const totalAgents = Object.keys(agentStatuses).length
  const runningAgents = Object.values(agentStatuses).filter(a => a.status === 'running').length

  return {
    status: runningAgents === totalAgents ? 'healthy' : 'degraded',
    allAgentsRunning: runningAgents === totalAgents,
    agentsCount: {
      total: totalAgents,
      running: runningAgents,
      stopped: totalAgents - runningAgents
    }
  }
}

/**
 * Formate la durée
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}j ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Génère le HTML du dashboard
 */
function generateDashboardHTML() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Agents Ana</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      padding: 20px;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      color: white;
      text-align: center;
      margin-bottom: 30px;
      font-size: 2.5em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .card {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transition: transform 0.3s ease;
    }

    .card:hover {
      transform: translateY(-5px);
    }

    .card h2 {
      color: #667eea;
      margin-bottom: 15px;
      font-size: 1.5em;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: bold;
      margin-left: 10px;
    }

    .status-healthy {
      background: #4ade80;
      color: white;
    }

    .status-degraded {
      background: #fb923c;
      color: white;
    }

    .status-down {
      background: #ef4444;
      color: white;
    }

    .agent-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      margin: 8px 0;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }

    .agent-running {
      border-left-color: #4ade80;
    }

    .agent-stopped {
      border-left-color: #ef4444;
    }

    .event-item {
      padding: 10px;
      margin: 8px 0;
      background: #f1f5f9;
      border-radius: 8px;
      font-size: 0.9em;
      border-left: 3px solid #667eea;
    }

    .event-timestamp {
      color: #64748b;
      font-size: 0.85em;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .stat-label {
      color: #64748b;
      font-weight: 500;
    }

    .stat-value {
      color: #1e293b;
      font-weight: bold;
    }

    .refresh-info {
      text-align: center;
      color: white;
      margin-top: 20px;
      font-size: 0.9em;
      opacity: 0.9;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .live-indicator {
      display: inline-block;
      width: 10px;
      height: 10px;
      background: #4ade80;
      border-radius: 50%;
      margin-right: 8px;
      animation: pulse 2s infinite;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 Dashboard Agents Autonomes Ana</h1>

    <div class="grid">
      <!-- Santé du système -->
      <div class="card">
        <h2>🏥 Santé du Système</h2>
        <div id="system-health">
          <div class="stat-row">
            <span class="stat-label">Statut</span>
            <span class="stat-value">Chargement...</span>
          </div>
        </div>
      </div>

      <!-- Architecture -->
      <div class="card" style="grid-column: 1 / -1;">
        <h2>🏗️ Architecture Hiérarchique - Phase 4</h2>
        <div id="agents-list">
          Chargement...
        </div>
      </div>

      <!-- Event Bus -->
      <div class="card">
        <h2>📡 Event Bus</h2>
        <div id="eventbus-stats">
          Chargement...
        </div>
      </div>
    </div>

    <!-- Événements récents -->
    <div class="card">
      <h2>📋 Événements Récents <span class="live-indicator"></span></h2>
      <div id="events-list">
        Chargement...
      </div>
    </div>

    <div class="refresh-info">
      Actualisation automatique toutes les 2 secondes
    </div>
  </div>

  <script>
    // Refresh automatique
    async function refreshDashboard() {
      try {
        // Récupérer status
        const statusRes = await fetch('/api/status')
        const status = await statusRes.json()

        // Récupérer événements
        const eventsRes = await fetch('/api/events?limit=15')
        const events = await eventsRes.json()

        // Mettre à jour l'interface
        updateSystemHealth(status)
        updateAgentsList(status.agents)
        updateEventBusStats(status.eventBus)
        updateEventsList(events.events)

      } catch (error) {
        console.error('Erreur refresh:', error)
      }
    }

    function updateSystemHealth(status) {
      const health = status.health
      const statusClass = health.status === 'healthy' ? 'status-healthy' : 'status-degraded'

      const html = \`
        <div class="stat-row">
          <span class="stat-label">Statut</span>
          <span class="stat-value">
            <span class="status-badge \${statusClass}">
              \${health.status === 'healthy' ? '✅ HEALTHY' : '⚠️ DEGRADED'}
            </span>
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Uptime</span>
          <span class="stat-value">\${status.system.uptimeFormatted}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Agents</span>
          <span class="stat-value">\${health.agentsCount.running}/\${health.agentsCount.total} actifs</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Tâches complétées</span>
          <span class="stat-value">\${status.coordinator.tasks.completed}</span>
        </div>
      \`

      document.getElementById('system-health').innerHTML = html
    }

    function updateAgentsList(agents) {
      // Map emojis et descriptions pour chaque agent
      const agentInfo = {
        'memory_manager': { emoji: '💾', desc: 'Gestion mémoire', manager: 'Operations' },
        'system_monitor': { emoji: '🔍', desc: 'Monitoring système', manager: 'Operations' },
        'alain_notifier': { emoji: '🔔', desc: 'Notifications proactives', manager: 'Operations' },
        'emotion_analyzer': { emoji: '🎭', desc: 'Patterns émotionnels', manager: 'Cognitive' },
        'learning_monitor': { emoji: '📚', desc: 'Extraction leçons', manager: 'Cognitive' },
        'longterm_memory': { emoji: '🧠', desc: 'Mémoire autobiographique', manager: 'Cognitive' },
        'truth_checker': { emoji: '✅', desc: 'Vérification assertions', manager: 'Cognitive' },
        'assumption_detector': { emoji: '⚠️', desc: '🚨 STRICT: Détecte suppositions', manager: 'Cognitive' },
        'research_reminder': { emoji: '🔍', desc: '🚨 STRICT: Exige recherche web', manager: 'Cognitive' },
        'methodology_checker': { emoji: '📋', desc: '🚨 STRICT: Force méthodologie', manager: 'Cognitive' },
        'action_monitor': { emoji: '👁️', desc: '🚨 STRICT: Surveille actions répétées', manager: 'Cognitive' },
        'strict_backup_enforcer': { emoji: '🚨', desc: '🚨 STRICT: Bloque sans backup', manager: 'Cognitive' },
        'synthesis_engine': { emoji: '📝', desc: 'Synthèses hebdomadaires', manager: 'Knowledge' },
        'research': { emoji: '🔍', desc: 'Recherche gaps', manager: 'Knowledge' },
        'code_analyzer': { emoji: '🔬', desc: 'Analyse code qualité', manager: 'Knowledge' },
        'doc_updater': { emoji: '📝', desc: 'Mise à jour documentation', manager: 'Knowledge' }
      }

      // Grouper agents par manager
      const byManager = {
        'Operations': [],
        'Cognitive': [],
        'Knowledge': []
      }

      Object.entries(agents).forEach(([name, agent]) => {
        const info = agentInfo[name] || { emoji: '🤖', desc: 'Agent', manager: 'Unknown' }
        const manager = info.manager || 'Unknown'

        if (!byManager[manager]) byManager[manager] = []
        byManager[manager].push({ name, agent, info })
      })

      // Générer HTML hiérarchique
      let html = ''

      // Operations Manager
      if (byManager['Operations'].length > 0) {
        html += '<div style="margin-bottom: 20px;">'
        html += '<div style="background: #3b82f6; color: white; padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; font-weight: bold;">🎯 Operations Manager</div>'

        byManager['Operations'].forEach(({ name, agent, info }) => {
          html += renderAgent(name, agent, info)
        })
        html += '</div>'
      }

      // Cognitive Manager
      if (byManager['Cognitive'].length > 0) {
        html += '<div style="margin-bottom: 20px;">'
        html += '<div style="background: #8b5cf6; color: white; padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; font-weight: bold;">🧠 Cognitive Manager</div>'

        byManager['Cognitive'].forEach(({ name, agent, info }) => {
          html += renderAgent(name, agent, info)
        })
        html += '</div>'
      }

      // Knowledge Manager
      if (byManager['Knowledge'].length > 0) {
        html += '<div style="margin-bottom: 20px;">'
        html += '<div style="background: #10b981; color: white; padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; font-weight: bold;">📚 Knowledge Manager</div>'

        byManager['Knowledge'].forEach(({ name, agent, info }) => {
          html += renderAgent(name, agent, info)
        })
        html += '</div>'
      }

      document.getElementById('agents-list').innerHTML = html || '<p>Aucun agent</p>'
    }

    function renderAgent(name, agent, info) {
      const statusClass = agent.status === 'running' ? 'agent-running' : 'agent-stopped'
      const statusEmoji = agent.status === 'running' ? '✅' : '⚪'

      // Extraire statistiques intéressantes
      let statsText = ''
      if (agent.stats) {
        if (agent.stats.checksPerformed) statsText = \`Checks: \${agent.stats.checksPerformed}\`
        else if (agent.stats.filesAnalyzed) statsText = \`Fichiers: \${agent.stats.filesAnalyzed}\`
        else if (agent.stats.notificationsCreated) statsText = \`Notifs: \${agent.stats.notificationsCreated}\`
        else if (agent.stats.gapsDetected) statsText = \`Gaps: \${agent.stats.gapsDetected}\`
        else if (agent.stats.reportsCreated) statsText = \`Rapports: \${agent.stats.reportsCreated}\`
        else if (agent.stats.scansPerformed) statsText = \`Scans: \${agent.stats.scansPerformed}\`
        else if (agent.stats.assumptionsDetected) statsText = \`⚠️ Suppositions: \${agent.stats.assumptionsDetected}\`
        else if (agent.stats.researchRemindersCreated) statsText = \`🔍 Rappels: \${agent.stats.researchRemindersCreated}\`
        else if (agent.stats.methodologyViolations) statsText = \`📋 Violations: \${agent.stats.methodologyViolations}\`
        else if (agent.stats.repeatedActionsDetected) statsText = \`👁️ Répétitions: \${agent.stats.repeatedActionsDetected}\`
        else if (agent.stats.criticalViolations !== undefined) statsText = \`🚨 Violations: \${agent.stats.criticalViolations}/\${agent.stats.criticalViolationLimit || 3}\`
        else statsText = \`Uptime: \${agent.stats.uptime || 'N/A'}\`
      }

      return \`
        <div class="agent-item \${statusClass}" style="margin-left: 20px;">
          <div>
            <strong>\${info.emoji} \${name}</strong>
            <div style="font-size: 0.85em; color: #64748b; margin-top: 4px;">
              \${info.desc} • \${statsText || 'Status: ' + agent.status}
            </div>
          </div>
          <span class="status-badge \${agent.status === 'running' ? 'status-healthy' : 'status-down'}">
            \${statusEmoji} \${agent.status.toUpperCase()}
          </span>
        </div>
      \`
    }

    function updateEventBusStats(stats) {
      const html = \`
        <div class="stat-row">
          <span class="stat-label">Événements totaux</span>
          <span class="stat-value">\${stats.totalEvents}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Uptime</span>
          <span class="stat-value">\${stats.uptime}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Types d'événements</span>
          <span class="stat-value">\${Object.keys(stats.eventsByType || {}).length}</span>
        </div>
      \`

      document.getElementById('eventbus-stats').innerHTML = html
    }

    function updateEventsList(events) {
      const html = events.map(event => {
        const time = new Date(event.timestamp).toLocaleTimeString('fr-FR')
        const emoji = getEmojiForEvent(event.event)

        return \`
          <div class="event-item">
            <div>\${emoji} <strong>\${event.event}</strong></div>
            <div class="event-timestamp">\${time}</div>
          </div>
        \`
      }).join('')

      document.getElementById('events-list').innerHTML = html || '<p>Aucun événement</p>'
    }

    function getEmojiForEvent(event) {
      if (event.startsWith('memory:')) return '💾'
      if (event.startsWith('system:')) return '🔍'
      if (event.startsWith('task:')) return '📋'
      if (event.startsWith('learning:')) return '📚'
      if (event.startsWith('emotion:')) return '🎭'
      if (event.startsWith('synthesis:')) return '📝'
      if (event.startsWith('research:')) return '🔍'
      if (event.startsWith('truth:')) return '✅'
      if (event.startsWith('code:')) return '🔬'
      if (event.startsWith('notification:')) return '🔔'
      if (event.startsWith('assumption:')) return '⚠️'
      if (event.startsWith('methodology:')) return '📋'
      if (event.startsWith('action:')) return '👁️'
      if (event.startsWith('backup:')) return '🚨'
      if (event.startsWith('agent:')) return '🤖'
      return '🔔'
    }

    // Refresh initial
    refreshDashboard()

    // Refresh toutes les 2 secondes
    setInterval(refreshDashboard, 2000)
  </script>
</body>
</html>
  `
}

/**
 * Démarre le serveur
 */
function start() {
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`📊 Dashboard Server démarré`)
      console.log(`   🌐 http://localhost:${PORT}`)
      console.log(`   📡 API: http://localhost:${PORT}/api/status`)

      eventBus.emit('dashboard:started', { port: PORT })
      resolve(server)
    })
  })
}

/**
 * Arrête le serveur
 */
function stop() {
  console.log('📊 Dashboard Server arrêté')
  eventBus.emit('dashboard:stopped', {})
}

module.exports = {
  start,
  stop,
  app
}

// Si exécuté directement
if (require.main === module) {
  start().catch(console.error)
}
