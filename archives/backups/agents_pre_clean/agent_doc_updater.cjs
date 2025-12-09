const EventEmitter = require('events')
const eventBus = require('./shared_event_bus.cjs')
const fs = require('fs').promises
const path = require('path')

/**
 * 📝 DOC UPDATER - Agent de Transmission
 *
 * Rôle: Maintenir la documentation à jour automatiquement
 * Domaine: Documentation & Transmission de Connaissance
 * Manager: Knowledge Manager
 *
 * Responsabilités:
 * - Détecter changements système (nouveaux agents, features, code)
 * - Générer/mettre à jour pages HTML documentation
 * - Maintenir navigation et index
 * - Créer entrées changelog
 * - Garder MANUEL_UTILISATEUR_COMPLET.html à jour
 *
 * Philosophie:
 * "La connaissance n'existe que si elle est transmise.
 *  Je suis le pont entre ce que Claude crée et ce qu'Alain comprend."
 */
class DocUpdaterAgent extends EventEmitter {
  constructor() {
    super()

    this.running = false
    this.name = 'doc_updater'

    // Chemins documentation
    this.paths = {
      manuel: path.join('E:', 'Mémoire Claude', 'MANUEL_UTILISATEUR_COMPLET.html'),
      agentsDir: path.join('E:', 'Mémoire Claude', 'agents'),
      docsDir: path.join('E:', 'Mémoire Claude', '06_COMPÉTENCES'),
      indexDir: path.join('E:', 'Mémoire Claude', '04_INDEX_RAPIDE')
    }

    // État de la documentation
    this.documentation = {
      lastScan: null,
      agentsDetected: [],
      featuresDetected: [],
      pendingUpdates: [],
      changelogEntries: []
    }

    // Cache du manuel
    this.manuelCache = null
    this.lastManuelUpdate = null

    // Métriques
    this.stats = {
      scansPerformed: 0,
      updatesGenerated: 0,
      pagesCreated: 0,
      changelogEntries: 0,
      errorsEncountered: 0,
      startTime: null
    }

    console.log('📝 Doc Updater Agent initialisé')
  }

  /**
   * Démarre l'agent
   */
  async start() {
    if (this.running) {
      console.log('⚠️ Doc Updater déjà démarré')
      return
    }

    this.running = true
    this.stats.startTime = Date.now()

    console.log('📝 Doc Updater Agent démarré')
    console.log('   - Mission: Transmission de Connaissance')
    console.log('   - Cible: MANUEL_UTILISATEUR_COMPLET.html')

    this.setupEventListeners()
    this.startDocumentationWatch()

    // Scan initial après 30 secondes
    setTimeout(() => this.performSystemScan(), 30000)

    eventBus.emit('agent:started', {
      agent: this.name,
      type: 'documentation',
      timestamp: Date.now()
    })
  }

  /**
   * Configure les listeners
   */
  setupEventListeners() {
    // Ordres du Knowledge Manager
    eventBus.on('knowledge:request_doc_update', (data) => {
      this.handleUpdateRequest(data)
    })

    eventBus.on('knowledge:order_doc_update', (data) => {
      this.handleUpdateOrder(data)
    })

    // Événements système à documenter
    eventBus.on('agent:started', (data) => {
      this.detectNewAgent(data)
    })

    eventBus.on('manager:started', (data) => {
      this.detectNewManager(data)
    })

    eventBus.on('synthesis:created', (data) => {
      this.considerDocumentingSynthesis(data)
    })

    eventBus.on('research:completed', (data) => {
      this.considerDocumentingResearch(data)
    })

    eventBus.on('code:report_saved', (data) => {
      this.considerDocumentingCodeReport(data)
    })
  }

  /**
   * Démarre la surveillance documentation (toutes les heures)
   */
  startDocumentationWatch() {
    this.watchInterval = setInterval(() => {
      this.performSystemScan()
    }, 60 * 60 * 1000) // 1 heure
  }

  /**
   * Scan complet du système pour changements
   */
  async performSystemScan() {
    console.log('📝 [DocUpdater] Scan système pour changements...')

    this.stats.scansPerformed++
    this.documentation.lastScan = Date.now()

    try {
      // 1. Scanner agents directory
      const agentFiles = await this.scanAgentsDirectory()

      // 2. Détecter nouveaux agents
      const newAgents = this.detectNewAgents(agentFiles)

      // 3. Détecter nouvelles features
      const newFeatures = await this.detectNewFeatures()

      // 4. Vérifier si manuel à jour
      const manuelNeedsUpdate = await this.checkManuelStatus()

      // 5. Si changements détectés, créer updates
      if (newAgents.length > 0 || newFeatures.length > 0 || manuelNeedsUpdate) {
        console.log(`📝 [DocUpdater] Changements détectés:`)
        console.log(`   - Nouveaux agents: ${newAgents.length}`)
        console.log(`   - Nouvelles features: ${newFeatures.length}`)
        console.log(`   - Manuel à jour: ${!manuelNeedsUpdate}`)

        await this.generateDocumentationUpdates({
          newAgents,
          newFeatures,
          manuelNeedsUpdate
        })
      }

      eventBus.emit('doc:scan_complete', {
        newAgents: newAgents.length,
        newFeatures: newFeatures.length,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('❌ [DocUpdater] Erreur scan:', error.message)
      this.stats.errorsEncountered++
    }
  }

  /**
   * Scanne le dossier agents
   */
  async scanAgentsDirectory() {
    try {
      const files = await fs.readdir(this.paths.agentsDir)

      const agentFiles = files.filter(f =>
        f.startsWith('agent_') && f.endsWith('.cjs') ||
        f.startsWith('manager_') && f.endsWith('.cjs') ||
        f === 'master_coordinator.cjs'
      )

      return agentFiles
    } catch (error) {
      console.error('❌ [DocUpdater] Erreur lecture agents dir:', error.message)
      return []
    }
  }

  /**
   * Détecte nouveaux agents
   */
  detectNewAgents(currentFiles) {
    const previousAgents = this.documentation.agentsDetected.map(a => a.file)
    const newAgents = []

    for (const file of currentFiles) {
      if (!previousAgents.includes(file)) {
        newAgents.push({
          file,
          detectedAt: Date.now(),
          type: this.determineAgentType(file)
        })

        // Ajouter au cache
        this.documentation.agentsDetected.push({
          file,
          detectedAt: Date.now()
        })
      }
    }

    return newAgents
  }

  /**
   * Détermine type d'agent
   */
  determineAgentType(filename) {
    if (filename === 'master_coordinator.cjs') return 'master'
    if (filename.startsWith('manager_')) return 'manager'
    if (filename.startsWith('agent_')) return 'agent'
    return 'unknown'
  }

  /**
   * Détecte nouvelles features
   */
  async detectNewFeatures() {
    // Pour l'instant: liste vide
    // En vrai, analyserait git commits, changelog files, etc.
    return []
  }

  /**
   * Vérifie statut du manuel
   */
  async checkManuelStatus() {
    try {
      const stats = await fs.stat(this.paths.manuel)
      const lastModified = stats.mtime.getTime()

      // Si manuel modifié il y a plus de 7 jours, probablement obsolète
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)

      if (lastModified < sevenDaysAgo) {
        console.log('📝 [DocUpdater] Manuel probablement obsolète (>7 jours)')
        return true
      }

      return false
    } catch (error) {
      console.log('📝 [DocUpdater] Manuel non trouvé, création nécessaire')
      return true
    }
  }

  /**
   * Génère mises à jour documentation
   */
  async generateDocumentationUpdates(changes) {
    console.log('📝 [DocUpdater] Génération mises à jour...')

    const updates = []

    // 1. Mettre à jour section agents
    if (changes.newAgents.length > 0) {
      const agentUpdate = await this.generateAgentSection(changes.newAgents)
      updates.push(agentUpdate)
    }

    // 2. Mettre à jour section features
    if (changes.newFeatures.length > 0) {
      const featureUpdate = await this.generateFeatureSection(changes.newFeatures)
      updates.push(featureUpdate)
    }

    // 3. Appliquer mises à jour au manuel
    for (const update of updates) {
      await this.applyUpdateToManuel(update)
    }

    // 4. Créer entrée changelog
    await this.createChangelogEntry({
      changes,
      updatesApplied: updates.length,
      timestamp: Date.now()
    })

    this.stats.updatesGenerated += updates.length

    eventBus.emit('doc:updated', {
      file: 'MANUEL_UTILISATEUR_COMPLET.html',
      updatesCount: updates.length,
      timestamp: Date.now()
    })

    console.log(`📝 [DocUpdater] ✅ ${updates.length} mises à jour appliquées`)
  }

  /**
   * Génère section agents
   */
  async generateAgentSection(newAgents) {
    const agentDescriptions = []

    for (const agent of newAgents) {
      // Lire fichier agent pour extraire description
      const description = await this.extractAgentDescription(agent.file)

      agentDescriptions.push({
        name: agent.file.replace(/\.cjs$/, '').replace(/_/g, ' '),
        type: agent.type,
        description,
        file: agent.file
      })
    }

    return {
      section: 'agents',
      content: this.formatAgentsHTML(agentDescriptions),
      timestamp: Date.now()
    }
  }

  /**
   * Extrait description d'un agent
   */
  async extractAgentDescription(filename) {
    try {
      const filepath = path.join(this.paths.agentsDir, filename)
      const content = await fs.readFile(filepath, 'utf-8')

      // Chercher commentaire header
      const headerMatch = content.match(/\/\*\*\s*(.*?)\*\//s)

      if (headerMatch) {
        const header = headerMatch[1]

        // Extraire lignes pertinentes
        const lines = header.split('\n')
          .map(l => l.replace(/^\s*\*\s?/, '').trim())
          .filter(l => l.length > 0)

        return {
          title: lines[0] || filename,
          role: lines.find(l => l.startsWith('Rôle:'))?.replace('Rôle:', '').trim(),
          domain: lines.find(l => l.startsWith('Domaine:'))?.replace('Domaine:', '').trim(),
          philosophy: lines.find(l => l.startsWith('Philosophie:'))?.replace('Philosophie:', '').trim()
        }
      }

      return {
        title: filename,
        role: 'Non documenté',
        domain: 'Non spécifié',
        philosophy: null
      }

    } catch (error) {
      console.error(`❌ [DocUpdater] Erreur extraction description ${filename}:`, error.message)
      return {
        title: filename,
        role: 'Erreur lecture',
        domain: 'Inconnu',
        philosophy: null
      }
    }
  }

  /**
   * Formate agents en HTML
   */
  formatAgentsHTML(agents) {
    let html = '<div class="agents-section">\n'
    html += '<h2>Agents Autonomes</h2>\n'

    // Grouper par type
    const byType = {
      master: agents.filter(a => a.type === 'master'),
      manager: agents.filter(a => a.type === 'manager'),
      agent: agents.filter(a => a.type === 'agent')
    }

    // Master Coordinator
    if (byType.master.length > 0) {
      html += '<h3>👑 Master Coordinator</h3>\n'
      for (const agent of byType.master) {
        html += this.formatAgentCard(agent)
      }
    }

    // Managers
    if (byType.manager.length > 0) {
      html += '<h3>🎯 Managers</h3>\n'
      for (const agent of byType.manager) {
        html += this.formatAgentCard(agent)
      }
    }

    // Agents
    if (byType.agent.length > 0) {
      html += '<h3>🤖 Agents Opérationnels</h3>\n'
      for (const agent of byType.agent) {
        html += this.formatAgentCard(agent)
      }
    }

    html += '</div>\n'
    return html
  }

  /**
   * Formate une carte agent
   */
  formatAgentCard(agent) {
    const { name, description } = agent

    let card = `<div class="agent-card">\n`
    card += `  <h4>${description.title}</h4>\n`

    if (description.role) {
      card += `  <p><strong>Rôle:</strong> ${description.role}</p>\n`
    }

    if (description.domain) {
      card += `  <p><strong>Domaine:</strong> ${description.domain}</p>\n`
    }

    if (description.philosophy) {
      card += `  <blockquote>${description.philosophy}</blockquote>\n`
    }

    card += `  <p class="agent-file"><em>Fichier: ${agent.file}</em></p>\n`
    card += `</div>\n`

    return card
  }

  /**
   * Génère section features
   */
  async generateFeatureSection(newFeatures) {
    return {
      section: 'features',
      content: '<div class="features-section"><!-- Nouvelles features --></div>',
      timestamp: Date.now()
    }
  }

  /**
   * Applique mise à jour au manuel
   */
  async applyUpdateToManuel(update) {
    try {
      // Lire manuel actuel
      let manuel = await this.readManuel()

      // Trouver section appropriée et insérer/remplacer
      const sectionMarker = `<!-- ${update.section}-section -->`

      if (manuel.includes(sectionMarker)) {
        // Remplacer section existante
        const regex = new RegExp(`${sectionMarker}[\\s\\S]*?<!-- /${update.section}-section -->`, 'g')
        manuel = manuel.replace(regex, `${sectionMarker}\n${update.content}\n<!-- /${update.section}-section -->`)
      } else {
        // Ajouter nouvelle section avant </body>
        manuel = manuel.replace('</body>',
          `${sectionMarker}\n${update.content}\n<!-- /${update.section}-section -->\n</body>`)
      }

      // Sauvegarder
      await fs.writeFile(this.paths.manuel, manuel, 'utf-8')

      console.log(`📝 [DocUpdater] Section "${update.section}" mise à jour`)

    } catch (error) {
      console.error('❌ [DocUpdater] Erreur application update:', error.message)
      this.stats.errorsEncountered++
    }
  }

  /**
   * Lit le manuel
   */
  async readManuel() {
    try {
      // Utiliser cache si disponible et récent
      if (this.manuelCache && this.lastManuelUpdate &&
          (Date.now() - this.lastManuelUpdate < 60000)) {
        return this.manuelCache
      }

      const content = await fs.readFile(this.paths.manuel, 'utf-8')

      this.manuelCache = content
      this.lastManuelUpdate = Date.now()

      return content

    } catch (error) {
      // Fichier n'existe pas, créer template
      console.log('📝 [DocUpdater] Création nouveau manuel...')
      return this.createManuelTemplate()
    }
  }

  /**
   * Crée template manuel
   */
  createManuelTemplate() {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manuel Utilisateur Complet - Claude Code</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 40px; }
    h3 { color: #555; }
    .agent-card {
      background: white;
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .agent-card h4 { margin-top: 0; color: #2980b9; }
    blockquote {
      border-left: 4px solid #3498db;
      padding-left: 20px;
      margin: 15px 0;
      font-style: italic;
      color: #555;
    }
    .agent-file { color: #999; font-size: 0.9em; }
    .update-info {
      background: #ecf0f1;
      padding: 10px;
      border-radius: 5px;
      margin: 20px 0;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <h1>📚 Manuel Utilisateur Complet - Claude Code</h1>

  <div class="update-info">
    <strong>Dernière mise à jour:</strong> ${new Date().toLocaleString('fr-FR')}
    <br>
    <em>Ce manuel est maintenu automatiquement par le Doc Updater Agent</em>
  </div>

  <!-- agents-section -->
  <!-- /agents-section -->

  <!-- features-section -->
  <!-- /features-section -->

  <hr>
  <p style="text-align: center; color: #999; margin-top: 40px;">
    <em>Généré automatiquement par le système d'agents autonomes Claude</em>
  </p>
</body>
</html>`
  }

  /**
   * Crée entrée changelog
   */
  async createChangelogEntry(data) {
    const entry = {
      timestamp: data.timestamp,
      date: new Date(data.timestamp).toISOString(),
      changes: data.changes,
      updatesApplied: data.updatesApplied
    }

    this.documentation.changelogEntries.push(entry)
    this.stats.changelogEntries++

    console.log('📝 [DocUpdater] Entrée changelog créée')
  }

  /**
   * Gère demande de mise à jour
   */
  handleUpdateRequest(data) {
    console.log('📝 [DocUpdater] Demande mise à jour reçue:', data.source)

    this.documentation.pendingUpdates.push({
      source: data.source,
      content: data.content,
      requestedAt: Date.now()
    })

    // Analyser si update justifiée
    eventBus.emit('doc:update_needed', {
      section: this.determineSection(data),
      reason: `Update depuis ${data.source}`
    })
  }

  /**
   * Gère ordre de mise à jour
   */
  async handleUpdateOrder(data) {
    console.log('📝 [DocUpdater] Ordre mise à jour:', data.section)

    // Exécuter immédiatement
    await this.performSystemScan()
  }

  /**
   * Détecte nouvel agent
   */
  detectNewAgent(data) {
    if (data.agent && !this.documentation.agentsDetected.find(a => a.file === data.agent + '.cjs')) {
      console.log(`📝 [DocUpdater] Nouvel agent détecté: ${data.agent}`)

      // Déclencher scan
      setTimeout(() => this.performSystemScan(), 5000)
    }
  }

  /**
   * Détecte nouveau manager
   */
  detectNewManager(data) {
    if (data.manager) {
      console.log(`📝 [DocUpdater] Nouveau manager détecté: ${data.manager}`)

      // Déclencher scan
      setTimeout(() => this.performSystemScan(), 5000)
    }
  }

  /**
   * Considère documenter synthèse
   */
  considerDocumentingSynthesis(data) {
    // Pour l'instant: pas de documentation auto des synthèses
    // Mais pourrait créer section "Dernières Synthèses"
  }

  /**
   * Considère documenter recherche
   */
  considerDocumentingResearch(data) {
    // Idem
  }

  /**
   * Considère documenter rapport code
   */
  considerDocumentingCodeReport(data) {
    // Idem
  }

  /**
   * Détermine section pour data
   */
  determineSection(data) {
    if (data.source === 'code_review') return 'code_quality'
    if (data.source === 'synthesis') return 'knowledge'
    return 'general'
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
      scans: this.stats.scansPerformed,
      updates: this.stats.updatesGenerated,
      pages: this.stats.pagesCreated,
      changelog: this.stats.changelogEntries,
      errors: this.stats.errorsEncountered,
      documentation: {
        agentsTracked: this.documentation.agentsDetected.length,
        pendingUpdates: this.documentation.pendingUpdates.length,
        lastScan: this.documentation.lastScan
          ? new Date(this.documentation.lastScan).toLocaleString('fr-FR')
          : 'jamais'
      }
    }
  }

  /**
   * Arrête l'agent
   */
  async stop() {
    if (!this.running) return

    console.log('📝 Doc Updater Agent arrêté')

    if (this.watchInterval) {
      clearInterval(this.watchInterval)
    }

    this.running = false

    eventBus.emit('agent:stopped', {
      agent: this.name,
      stats: this.getStats()
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
module.exports = new DocUpdaterAgent()
