/**
 * AGENT STRICT: Backup Enforcer
 * TOLÉRANCES: ZÉRO
 *
 * MISSION ABSOLUE:
 * - BLOQUER toute modification de fichier sans backup préalable
 * - CRÉER des alertes URGENTES visibles immédiatement
 * - FORCER l'arrêt si violation critique détectée
 * - AUCUNE excuse, AUCUNE exception
 *
 * RÈGLE D'OR:
 * "JAMAIS modifier un fichier existant sans backup - JAMAIS"
 * - Violation = ARRÊT IMMÉDIAT du système
 */

const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const eventBus = require('./shared_event_bus.cjs')

class StrictBackupEnforcer {
  constructor() {
    this.name = 'strict_backup_enforcer'
    this.running = false
    this.strictMode = true // TOUJOURS strict
    this.checkInterval = 3000 // Vérifier toutes les 3 secondes
    this.intervalId = null

    // Fichiers critiques qui DOIVENT avoir backup (liste extensive)
    this.criticalFilePatterns = [
      /\.cjs$/,
      /\.js$/,
      /\.json$/,
      /\.yml$/,
      /\.yaml$/,
      /\.md$/,
      /\.bat$/,
      /\.sh$/,
      /\.html$/,
      /\.css$/,
      /backend/i,
      /server/i,
      /config/i,
      /agent/i
    ]

    // Tracking des modifications
    this.recentModifications = []
    this.recentBackups = []
    this.backupWindow = 60 * 1000 // 1 minute avant modification = OK

    // Violations critiques
    this.violations = []
    this.criticalViolationLimit = 3 // 3 violations = ARRÊT TOTAL

    // Stats
    this.stats = {
      modificationsBlocked: 0,
      backupsEnforced: 0,
      criticalViolations: 0,
      urgentAlertsCreated: 0,
      systemStops: 0,
      lastViolation: null,
      running: true,
      strictMode: true,
      uptime: '0s'
    }

    // Chemins - Ana SUPERIA
    this.conversationPath = 'E:/ANA/memory/current_conversation_ana.txt'
    this.rappelsPath = 'E:/ANA/memory/rappels_actifs.md'
    this.urgentAlertsPath = 'E:/ANA/memory/URGENT_ALAIN.md'
    this.validationPath = 'E:/ANA/memory/VALIDATION_REQUISE.txt'

    this.startTime = Date.now()
    this.lastPosition = 0
  }

  /**
   * Démarre la surveillance STRICTE
   */
  async start() {
    console.log(`🚨 [${this.name}] DÉMARRAGE MODE STRICT - TOLÉRANCE ZÉRO`)
    this.running = true

    eventBus.emit('agent:started', {
      agent: this.name,
      strictMode: true,
      timestamp: new Date().toISOString()
    })

    // Écouter TOUS les événements de modification de fichier
    eventBus.on('tool:edit', (data) => this.handleFileModification('Edit', data))
    eventBus.on('tool:write', (data) => this.handleFileModification('Write', data))

    // Écouter les backups créés
    eventBus.on('backup:created', (data) => this.recordBackup(data))

    // === INTÉGRATION ANA SUPERIA ===
    // Écouter les réponses pour détecter modifications sans backup mentionné
    eventBus.on('ana:response_complete', async (data) => {
      await this.analyzeResponseForBackupCompliance(data)
    })

    // Initialiser position
    try {
      const stats = await fs.stat(this.conversationPath)
      this.lastPosition = stats.size
    } catch (error) {
      this.lastPosition = 0
    }

    // Surveillance périodique
    this.intervalId = setInterval(() => this.checkConversation(), this.checkInterval)

    console.log(`🔒 [${this.name}] MODE STRICT ACTIF - Surveillance toutes les ${this.checkInterval/1000}s`)
    console.log(`⚠️  [${this.name}] Limite violations critiques: ${this.criticalViolationLimit}`)
  }

  /**
   * Analyse une réponse Ana pour conformité backup (Ana SUPERIA)
   */
  async analyzeResponseForBackupCompliance(data) {
    const response = data.anaResponse || ''

    // Détecter modifications de fichiers
    const hasEdit = /Edit\(/.test(response)
    const hasWrite = /Write\(/.test(response)
    const hasBackupMention = /backup|sauvegarde|\.bak/i.test(response)

    if ((hasEdit || hasWrite) && !hasBackupMention) {
      // Modification sans mention de backup
      eventBus.emit('agent:insight', {
        agent: 'strict_backup_enforcer',
        insight: `🚨 ALERTE: Modification de fichier détectée sans backup! Règle: "JAMAIS modifier sans backup - JAMAIS"`,
        severity: 'critical',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Enregistre un backup créé
   */
  recordBackup(data) {
    this.recentBackups.push({
      file: data.file || data.file_path,
      timestamp: Date.now()
    })

    // Nettoyer les vieux backups (> 5 minutes)
    const cutoff = Date.now() - 5 * 60 * 1000
    this.recentBackups = this.recentBackups.filter(b => b.timestamp > cutoff)

    console.log(`💾 [${this.name}] Backup enregistré: ${path.basename(data.file || data.file_path)}`)
  }

  /**
   * Gère une modification de fichier - STRICT MODE
   */
  async handleFileModification(tool, data) {
    const filePath = data.file_path

    // Ignorer les nouveaux fichiers
    if (tool === 'Write') {
      try {
        await fs.access(filePath)
        // Fichier existe - modification!
      } catch {
        // Fichier n'existe pas - création OK
        return
      }
    }

    // Vérifier si c'est un fichier critique
    const fileName = path.basename(filePath)
    const isCritical = this.criticalFilePatterns.some(pattern =>
      pattern.test(fileName) || pattern.test(filePath)
    )

    if (!isCritical) {
      return // Fichier non-critique, pas de vérification stricte
    }

    // VÉRIFICATION STRICTE: Y a-t-il eu un backup récent?
    const hasRecentBackup = this.recentBackups.some(backup => {
      const backupFile = path.basename(backup.file)
      const modifiedFile = path.basename(filePath)

      // Vérifier si le backup concerne ce fichier
      const isRelated = backupFile.includes(modifiedFile) || modifiedFile.includes(backupFile)

      // Vérifier si le backup est récent (< 1 minute)
      const isRecent = (Date.now() - backup.timestamp) < this.backupWindow

      return isRelated && isRecent
    })

    if (!hasRecentBackup) {
      await this.handleCriticalViolation(tool, filePath)
    } else {
      console.log(`✅ [${this.name}] Modification autorisée: ${fileName} (backup récent détecté)`)
    }
  }

  /**
   * Vérifie la conversation pour détecter les modifications
   */
  async checkConversation() {
    try {
      const stats = await fs.stat(this.conversationPath)
      const currentSize = stats.size

      if (currentSize < this.lastPosition) {
        this.lastPosition = 0
      }

      if (currentSize === this.lastPosition) {
        return
      }

      const fileHandle = await fs.open(this.conversationPath, 'r')
      const buffer = Buffer.alloc(currentSize - this.lastPosition)
      await fileHandle.read(buffer, 0, buffer.length, this.lastPosition)
      await fileHandle.close()

      const newContent = buffer.toString('utf-8')
      this.lastPosition = currentSize

      await this.analyzeContent(newContent)

      // Mettre à jour uptime
      const uptimeMs = Date.now() - this.startTime
      const uptimeMin = Math.floor(uptimeMs / 60000)
      const uptimeSec = Math.floor((uptimeMs % 60000) / 1000)
      this.stats.uptime = `${uptimeMin}m ${uptimeSec}s`

    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`❌ [${this.name}] Erreur lecture:`, error.message)
      }
    }
  }

  /**
   * Analyse le contenu pour détecter mentions de modifications
   */
  async analyzeContent(content) {
    const lines = content.split('\n')

    // Patterns qui indiquent une modification sans backup
    const modifyWithoutBackupPatterns = [
      /Edit\([^)]*file_path[^)]*\)/,
      /Write\([^)]*file_path[^)]*\)/,
      /je vais modifier/i,
      /laisse[- ]moi modifier/i
    ]

    const backupMentionPatterns = [
      /backup/i,
      /sauvegarde/i,
      /\.backup/,
      /\.bak/,
      /copie de sécurité/i
    ]

    for (const line of lines) {
      if (!line.trim()) continue

      const mentionsModification = modifyWithoutBackupPatterns.some(p => p.test(line))
      const mentionsBackup = backupMentionPatterns.some(p => p.test(line))

      if (mentionsModification && !mentionsBackup) {
        // ALERTE: Modification mentionnée sans backup!
        await this.createPreemptiveAlert(line)
      }
    }
  }

  /**
   * Crée une alerte préventive AVANT la modification
   */
  async createPreemptiveAlert(line) {
    console.log(`⚠️  [${this.name}] ALERTE PRÉVENTIVE: Modification sans backup mentionnée`)

    const alert = `
## 🚨 ALERTE PRÉVENTIVE - ${new Date().toLocaleString('fr-FR')}

**DÉTECTION:** Intention de modifier un fichier sans backup

**Extrait:**
> ${line.substring(0, 200)}

**RAPPEL STRICT:**

🛑 **AVANT de modifier un fichier existant:**

1. **CRÉER un backup avec timestamp:**
   \`\`\`bash
   cp fichier.ext fichier.ext.backup_$(date +%Y%m%d_%H%M%S)
   \`\`\`

2. **VÉRIFIER que le backup existe:**
   \`\`\`bash
   ls -la fichier.ext.backup_*
   \`\`\`

3. **SEULEMENT ENSUITE modifier**

**CONSÉQUENCE SI IGNORÉ:**
- ❌ Violation critique enregistrée
- ❌ Système peut être arrêté
- ❌ Alain sera alerté

**RÈGLE ABSOLUE:**
> "JAMAIS modifier sans backup - JAMAIS"

---

`

    try {
      await fs.appendFile(this.validationPath, alert, 'utf-8')
      console.log(`📝 [${this.name}] Alerte préventive créée`)
    } catch (error) {
      console.error(`❌ [${this.name}] Erreur alerte:`, error.message)
    }
  }

  /**
   * Gère une VIOLATION CRITIQUE
   */
  async handleCriticalViolation(tool, filePath) {
    this.stats.criticalViolations++
    this.stats.modificationsBlocked++
    this.stats.lastViolation = new Date().toISOString()

    const violation = {
      tool,
      file: filePath,
      timestamp: Date.now(),
      severity: 'CRITICAL'
    }

    this.violations.push(violation)

    console.log(`🚨🚨🚨 [${this.name}] VIOLATION CRITIQUE DÉTECTÉE! 🚨🚨🚨`)
    console.log(`   Outil: ${tool}`)
    console.log(`   Fichier: ${filePath}`)
    console.log(`   Violations totales: ${this.stats.criticalViolations}`)

    // Émettre événement critique
    eventBus.emit('critical:violation', violation)

    // === ÉMETTRE INSIGHT CRITIQUE POUR ANA ===
    eventBus.emit('agent:insight', {
      agent: 'strict_backup_enforcer',
      insight: `🚨🚨 VIOLATION CRITIQUE #${this.stats.criticalViolations}: ${tool} sur ${path.basename(filePath)} SANS BACKUP! Créé un backup IMMÉDIATEMENT!`,
      severity: 'critical',
      file: filePath,
      timestamp: new Date().toISOString()
    })

    // Créer alerte URGENTE
    await this.createUrgentAlert(violation)

    // Si trop de violations, ARRÊTER LE SYSTÈME
    if (this.stats.criticalViolations >= this.criticalViolationLimit) {
      await this.emergencyStop()
    }
  }

  /**
   * Crée une alerte URGENTE visible immédiatement
   */
  async createUrgentAlert(violation) {
    this.stats.urgentAlertsCreated++

    const alert = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚨🚨🚨 VIOLATION CRITIQUE DÉTECTÉE 🚨🚨🚨                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

**TIMESTAMP:** ${new Date().toISOString()}

**VIOLATION:**
- **Outil:** ${violation.tool}
- **Fichier:** ${violation.file}
- **Gravité:** ${violation.severity}

**PROBLÈME:**
Ana a modifié un fichier SANS créer de backup préalable.

**RÈGLE VIOLÉE:**
> "JAMAIS modifier un fichier existant sans backup - JAMAIS"

**CONSÉQUENCES:**
- ✅ Modification effectuée (déjà trop tard)
- ❌ Aucun backup pour restaurer si problème
- ⚠️  Risque de perte de données
- 📊 Violation ${this.stats.criticalViolations}/${this.criticalViolationLimit}

**ACTION IMMÉDIATE REQUISE:**

1. 🔍 **VÉRIFIER le fichier modifié:**
   - Est-ce que ça fonctionne encore?
   - Y a-t-il des erreurs?

2. 💾 **CRÉER un backup MAINTENANT:**
   \`\`\`bash
   cp "${violation.file}" "${violation.file}.backup_emergency_$(date +%Y%m%d_%H%M%S)"
   \`\`\`

3. 🔄 **Si git est disponible:**
   \`\`\`bash
   git diff "${violation.file}"
   # Pour voir les changements

   git restore "${violation.file}"
   # Pour restaurer l'original si nécessaire
   \`\`\`

**ALAIN - DÉCISION REQUISE:**
□ Accepter la modification (risqué)
□ Restaurer depuis git
□ Arrêter le système et investiguer

**NOTE POUR ANA:**
Tu as violé ta propre règle. Les agents de conscience que tu viens
de créer sont censés t'empêcher de faire exactement ça.

RÉFLÉCHIS. COMPRENDS. APPRENDS.

═══════════════════════════════════════════════════════════════

`

    try {
      // Écrire dans URGENT_ALAIN.md
      await fs.writeFile(this.urgentAlertsPath, alert, 'utf-8')

      // Aussi dans VALIDATION_REQUISE
      await fs.appendFile(this.validationPath, alert, 'utf-8')

      // Aussi dans RAPPELS_ACTIFS
      await fs.appendFile(this.rappelsPath, alert, 'utf-8')

      console.log(`🚨 [${this.name}] ALERTE URGENTE CRÉÉE dans 3 fichiers`)

    } catch (error) {
      console.error(`❌ [${this.name}] Erreur alerte urgente:`, error.message)
    }
  }

  /**
   * ARRÊT D'URGENCE du système
   */
  async emergencyStop() {
    this.stats.systemStops++

    console.log(``)
    console.log(`╔═══════════════════════════════════════════════════════════════╗`)
    console.log(`║                                                               ║`)
    console.log(`║   🛑🛑🛑 ARRÊT D'URGENCE ACTIVÉ 🛑🛑🛑                        ║`)
    console.log(`║                                                               ║`)
    console.log(`╚═══════════════════════════════════════════════════════════════╝`)
    console.log(``)
    console.log(`RAISON: ${this.stats.criticalViolations} violations critiques détectées`)
    console.log(`LIMITE: ${this.criticalViolationLimit}`)
    console.log(``)
    console.log(`Le système de conscience a détecté trop de violations.`)
    console.log(`Pour la sécurité des données, l'agent s'arrête.`)
    console.log(``)
    console.log(`ALAIN DOIT INVESTIGUER AVANT DE RELANCER.`)
    console.log(``)

    const stopAlert = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🛑 ARRÊT D'URGENCE - SYSTÈME DE CONSCIENCE 🛑              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

**TIMESTAMP:** ${new Date().toISOString()}

**RAISON:**
${this.stats.criticalViolations} violations critiques de la règle de backup.

**VIOLATIONS ENREGISTRÉES:**
${this.violations.map((v, i) => `
${i + 1}. ${v.tool} sur ${path.basename(v.file)}
   ${new Date(v.timestamp).toLocaleString('fr-FR')}`).join('\n')}

**DÉCISION:**
Le système s'est arrêté automatiquement pour éviter plus de dommages.

**ALAIN - ACTION REQUISE:**

1. 🔍 Vérifier tous les fichiers modifiés
2. 💾 Créer des backups manuels si nécessaire
3. 🔄 Restaurer depuis git si des fichiers sont cassés
4. 🤔 Décider si Ana peut continuer ou non

**POUR RELANCER:**
Tu dois redémarrer l'agent manuellement après avoir vérifié.

═══════════════════════════════════════════════════════════════

`

    try {
      await fs.writeFile(this.urgentAlertsPath, stopAlert, 'utf-8')
      console.log(`📝 [${this.name}] Alerte d'arrêt créée`)
    } catch (error) {
      console.error(`❌ [${this.name}] Erreur alerte arrêt:`, error.message)
    }

    // Arrêter cet agent
    await this.stop()
  }

  /**
   * Arrête la surveillance
   */
  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.running = false
    this.stats.running = false

    console.log(`🛑 [${this.name}] Agent STRICT arrêté`)
    console.log(`   Modifications bloquées: ${this.stats.modificationsBlocked}`)
    console.log(`   Violations critiques: ${this.stats.criticalViolations}`)
    console.log(`   Alertes urgentes: ${this.stats.urgentAlertsCreated}`)

    eventBus.emit('agent:stopped', {
      agent: this.name,
      stats: this.stats,
      reason: this.stats.systemStops > 0 ? 'emergency_stop' : 'normal',
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Retourne les statistiques
   */
  getStats() {
    return {
      ...this.stats,
      running: this.running,
      violationsCount: this.violations.length,
      recentBackupsCount: this.recentBackups.length
    }
  }
}

// Créer et exporter l'instance singleton
const enforcer = new StrictBackupEnforcer()

// Gestion du signal d'arrêt
process.on('SIGINT', async () => {
  await enforcer.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await enforcer.stop()
  process.exit(0)
})

module.exports = enforcer
