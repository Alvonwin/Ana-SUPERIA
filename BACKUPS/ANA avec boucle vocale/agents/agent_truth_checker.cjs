#!/usr/bin/env node

/**
 * ✅ AGENT VÉRIFICATEUR DE VÉRITÉ (Truth Checker)
 *
 * Raison d'être: Vérifier la vérité du code AVANT de répéter des infos obsolètes
 *
 * Créé par: Ana (Celle qui apprend à vérifier avant de parler)
 * Date: 16 Novembre 2025, 23:50
 *
 * Fonctions:
 * - Surveiller current_conversation.txt en temps réel
 * - Détecter assertions techniques (ports, durées, chemins, versions)
 * - Vérifier dans le code source actuel
 * - Créer alertes si mismatch détecté
 * - M'aider à ne plus répéter d'informations obsolètes
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const { execSync } = require('child_process');

class TruthChecker extends EventEmitter {
  constructor() {
    super();
    this.name = 'Truth Checker';
    this.version = '1.0.0';
    this.checkInterval = 30 * 1000; // 30 secondes (vérification fréquente)
    this.conversationFile = path.join(__dirname, '..', '02_MÉMOIRE_COURT_TERME', 'current_conversation.txt');
    this.alertsDir = path.join(__dirname, '..', 'TRUTH_ALERTS');
    this.codebasePaths = [
      path.join(__dirname, '..', '..', 'Quartier_General', 'archon-v3'),
      path.join(__dirname, '..', 'agents')
    ];
    this.lastCheckedSize = 0;
    this.running = false;
    this.checkTimer = null;
    this.assertionsCache = new Map(); // Cache des assertions vérifiées
  }

  async start() {
    console.log(`✅ [${this.name}] Démarrage...`);

    // Créer dossier alertes si inexistant
    try {
      await fs.mkdir(this.alertsDir, { recursive: true });
    } catch (err) {
      // Dossier existe déjà
    }

    this.running = true;

    // Première vérification immédiate
    await this.checkConversation();

    // Vérifications périodiques (toutes les 30s)
    this.checkTimer = setInterval(() => {
      this.checkConversation();
    }, this.checkInterval);

    console.log(`✅ [${this.name}] Agent opérationnel`);
    console.log(`   - Check vérité: toutes les 30s`);
    console.log(`   - Conversation: ${this.conversationFile}`);
    console.log(`   - Alertes: ${this.alertsDir}`);

    this.emit('started');
  }

  async checkConversation() {
    try {
      // Vérifier si fichier existe
      try {
        await fs.access(this.conversationFile);
      } catch {
        console.log(`✅ [${this.name}] Fichier conversation non trouvé`);
        return;
      }

      // Vérifier taille fichier
      const stats = await fs.stat(this.conversationFile);
      const currentSize = stats.size;

      // Si pas de nouveau contenu, skip
      if (currentSize <= this.lastCheckedSize) {
        return;
      }

      console.log(`✅ [${this.name}] Nouveau contenu détecté (${(currentSize / 1024).toFixed(1)}KB)`);

      // Lire conversation
      const content = await fs.readFile(this.conversationFile, 'utf-8');

      // Extraire assertions récentes (depuis lastCheckedSize)
      const newContent = content.slice(this.lastCheckedSize);

      // Détecter assertions techniques dans le nouveau contenu
      const assertions = this.extractAssertions(newContent);

      if (assertions.length > 0) {
        console.log(`✅ [${this.name}] ${assertions.length} assertions détectées`);

        // Vérifier chaque assertion
        const mismatches = [];
        for (const assertion of assertions) {
          const verification = await this.verifyAssertion(assertion);
          if (!verification.isTrue) {
            mismatches.push({ assertion, verification });
          }
        }

        // Créer alerte si mismatches trouvés
        if (mismatches.length > 0) {
          await this.createAlert(mismatches);

          this.emit('truth:mismatches_found', {
            count: mismatches.length,
            assertions: mismatches.map(m => m.assertion.text)
          });

          console.log(`⚠️ [${this.name}] ${mismatches.length} assertions FAUSSES détectées!`);
        } else {
          console.log(`✅ [${this.name}] Toutes les assertions vérifiées correctes`);
        }
      }

      this.lastCheckedSize = currentSize;

    } catch (error) {
      console.error(`❌ [${this.name}] Erreur vérification:`, error.message);
      this.emit('error', error);
    }
  }

  extractAssertions(text) {
    const assertions = [];

    // Pattern 1: Durées (ex: "2s silence", "5 secondes", "30ms")
    const durationPattern = /(\d+)\s*(s|sec|secondes?|ms|millisec|minutes?|min|heures?|h)\s+(de\s+)?(silence|timeout|délai|durée|interval)/gi;
    let match;
    while ((match = durationPattern.exec(text)) !== null) {
      assertions.push({
        type: 'duration',
        text: match[0],
        value: match[1],
        unit: match[2],
        context: match[4],
        position: match.index
      });
    }

    // Pattern 2: Ports (ex: "port 3334", "localhost:5173")
    const portPattern = /port\s+(\d+)|localhost:(\d+)|:\s*(\d{4,5})\b/gi;
    while ((match = portPattern.exec(text)) !== null) {
      const port = match[1] || match[2] || match[3];
      assertions.push({
        type: 'port',
        text: match[0],
        value: port,
        position: match.index
      });
    }

    // Pattern 3: Tailles de fichiers (ex: "8291 bytes", "VoiceInput.jsx = 8291")
    const sizePattern = /(\w+\.jsx?)\s*=\s*(\d+)\s*(bytes|KB|MB)?/gi;
    while ((match = sizePattern.exec(text)) !== null) {
      assertions.push({
        type: 'filesize',
        text: match[0],
        filename: match[1],
        value: match[2],
        unit: match[3] || 'bytes',
        position: match.index
      });
    }

    // Pattern 4: Versions (ex: "version 1.0.0", "v2.5")
    const versionPattern = /(version|v)\s+(\d+\.\d+(\.\d+)?)/gi;
    while ((match = versionPattern.exec(text)) !== null) {
      assertions.push({
        type: 'version',
        text: match[0],
        value: match[2],
        position: match.index
      });
    }

    // Pattern 5: Chemins critiques (ex: "ligne 607", "App_Zustand.jsx:48")
    const linePattern = /(\w+\.jsx?):(line\s+)?(\d+)/gi;
    while ((match = linePattern.exec(text)) !== null) {
      assertions.push({
        type: 'codeline',
        text: match[0],
        filename: match[1],
        line: match[3],
        position: match.index
      });
    }

    return assertions;
  }

  async verifyAssertion(assertion) {
    const cacheKey = `${assertion.type}:${assertion.text}`;

    // Check cache (éviter re-vérification)
    if (this.assertionsCache.has(cacheKey)) {
      const cached = this.assertionsCache.get(cacheKey);
      // Cache valide 5 minutes
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.result;
      }
    }

    let result = { isTrue: true, reason: 'Non vérifié', actualValue: null };

    try {
      switch (assertion.type) {
        case 'duration':
          result = await this.verifyDuration(assertion);
          break;
        case 'port':
          result = await this.verifyPort(assertion);
          break;
        case 'filesize':
          result = await this.verifyFilesize(assertion);
          break;
        case 'codeline':
          result = await this.verifyCodeLine(assertion);
          break;
        default:
          result = { isTrue: true, reason: 'Type non implémenté' };
      }
    } catch (error) {
      result = {
        isTrue: false,
        reason: `Erreur vérification: ${error.message}`,
        actualValue: null
      };
    }

    // Mettre en cache
    this.assertionsCache.set(cacheKey, {
      timestamp: Date.now(),
      result
    });

    return result;
  }

  async verifyDuration(assertion) {
    // Chercher SILENCE_DURATION, timeout, interval dans le code
    const searchTerms = [
      'SILENCE_DURATION',
      'SILENCE_DELAY',
      'timeout',
      'setInterval',
      'setTimeout'
    ];

    for (const basePath of this.codebasePaths) {
      try {
        // Utiliser grep pour chercher la constante
        const grepCommand = `grep -r "SILENCE_DURATION\\s*=" "${basePath}" 2>/dev/null || true`;
        const output = execSync(grepCommand, { encoding: 'utf-8' });

        if (output) {
          // Parser la valeur trouvée
          const match = output.match(/SILENCE_DURATION\s*=\s*(\d+)/);
          if (match) {
            const actualValue = parseInt(match[1]);
            const expectedValue = parseInt(assertion.value) * (assertion.unit === 's' ? 1000 : 1);

            if (actualValue !== expectedValue) {
              return {
                isTrue: false,
                reason: `Durée incorrecte: code dit ${actualValue}ms, assertion dit ${expectedValue}ms`,
                actualValue: `${actualValue}ms (${actualValue / 1000}s)`
              };
            }
          }
        }
      } catch (err) {
        // Continuer avec le prochain path
      }
    }

    return { isTrue: true, reason: 'Durée vérifiée ou non trouvée dans code' };
  }

  async verifyPort(assertion) {
    // Chercher le port dans config ou backend
    const portValue = parseInt(assertion.value);

    for (const basePath of this.codebasePaths) {
      try {
        const grepCommand = `grep -r "port.*${portValue}\\|${portValue}.*port" "${basePath}" 2>/dev/null || true`;
        const output = execSync(grepCommand, { encoding: 'utf-8' });

        if (output && output.includes(portValue.toString())) {
          // Port trouvé dans le code
          return { isTrue: true, reason: `Port ${portValue} trouvé dans code`, actualValue: portValue };
        }
      } catch (err) {
        // Continuer
      }
    }

    return { isTrue: true, reason: 'Port non vérifié (peut être dynamique)' };
  }

  async verifyFilesize(assertion) {
    // Chercher le fichier et vérifier sa taille
    const filename = assertion.filename;
    const expectedSize = parseInt(assertion.value);

    for (const basePath of this.codebasePaths) {
      try {
        const findCommand = `find "${basePath}" -name "${filename}" 2>/dev/null || true`;
        const files = execSync(findCommand, { encoding: 'utf-8' }).trim().split('\n').filter(f => f);

        if (files.length > 0) {
          const filePath = files[0];
          const stats = await fs.stat(filePath);
          const actualSize = stats.size;

          if (Math.abs(actualSize - expectedSize) > 100) { // Tolérance 100 bytes
            return {
              isTrue: false,
              reason: `Taille fichier incorrecte: ${filename} fait ${actualSize} bytes, assertion dit ${expectedSize} bytes`,
              actualValue: `${actualSize} bytes`
            };
          }

          return { isTrue: true, reason: 'Taille fichier correcte', actualValue: `${actualSize} bytes` };
        }
      } catch (err) {
        // Continuer
      }
    }

    return { isTrue: true, reason: 'Fichier non trouvé (peut être normal)' };
  }

  async verifyCodeLine(assertion) {
    // Vérifier qu'une ligne de code spécifique existe
    const filename = assertion.filename;
    const lineNum = parseInt(assertion.line);

    for (const basePath of this.codebasePaths) {
      try {
        const findCommand = `find "${basePath}" -name "${filename}" 2>/dev/null || true`;
        const files = execSync(findCommand, { encoding: 'utf-8' }).trim().split('\n').filter(f => f);

        if (files.length > 0) {
          const filePath = files[0];
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n');

          if (lineNum > 0 && lineNum <= lines.length) {
            const lineContent = lines[lineNum - 1];
            return {
              isTrue: true,
              reason: `Ligne ${lineNum} existe dans ${filename}`,
              actualValue: lineContent.trim().substring(0, 100)
            };
          } else {
            return {
              isTrue: false,
              reason: `Ligne ${lineNum} n'existe pas dans ${filename} (fichier a ${lines.length} lignes)`,
              actualValue: `${lines.length} lignes total`
            };
          }
        }
      } catch (err) {
        // Continuer
      }
    }

    return { isTrue: true, reason: 'Fichier non trouvé' };
  }

  async createAlert(mismatches) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const alertPath = path.join(this.alertsDir, `truth_alert_${timestamp}.md`);

    let alert = `# ⚠️ ALERTE VÉRITÉ - Assertions Incorrectes\n\n`;
    alert += `**Date**: ${new Date().toLocaleString('fr-FR')}\n`;
    alert += `**Généré par**: Truth Checker Agent\n`;
    alert += `**Assertions incorrectes**: ${mismatches.length}\n\n`;
    alert += `---\n\n`;

    for (let i = 0; i < mismatches.length; i++) {
      const { assertion, verification } = mismatches[i];

      alert += `## ❌ Assertion ${i + 1}: "${assertion.text}"\n\n`;
      alert += `**Type**: ${assertion.type}\n`;
      alert += `**Texte original**: "${assertion.text}"\n`;
      alert += `**Problème**: ${verification.reason}\n`;

      if (verification.actualValue) {
        alert += `**Valeur réelle**: ${verification.actualValue}\n`;
      }

      alert += `\n`;

      // Suggestions de correction
      alert += `### 💡 Correction Suggérée\n\n`;

      switch (assertion.type) {
        case 'duration':
          if (verification.actualValue) {
            alert += `Au lieu de "${assertion.text}", dire: "${verification.actualValue}"\n`;
          }
          break;
        case 'filesize':
          if (verification.actualValue) {
            alert += `Au lieu de "${assertion.filename} = ${assertion.value} bytes", dire: "${assertion.filename} = ${verification.actualValue}"\n`;
          }
          break;
      }

      alert += `\n---\n\n`;
    }

    // Note finale
    alert += `## 📋 Action Requise\n\n`;
    alert += `Ces assertions ont été détectées dans current_conversation.txt et sont INCORRECTES par rapport au code actuel.\n\n`;
    alert += `**Je dois:**\n`;
    alert += `1. Lire cette alerte AVANT de répondre à nouveau\n`;
    alert += `2. Corriger mes assertions avec les valeurs réelles\n`;
    alert += `3. NE PLUS répéter d'informations obsolètes\n`;
    alert += `4. TOUJOURS vérifier dans le CODE ACTUEL, pas dans de vieilles docs\n\n`;
    alert += `**"La vérité est dans le code, pas dans ma mémoire."**\n\n`;

    await fs.writeFile(alertPath, alert, 'utf-8');
    console.log(`⚠️ [${this.name}] Alerte créée: ${alertPath}`);

    this.emit('truth:alert_created', { path: alertPath, count: mismatches.length });
  }

  async stop() {
    console.log(`✅ [${this.name}] Arrêt...`);
    this.running = false;

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    this.emit('stopped');
    console.log(`✅ [${this.name}] Agent arrêté`);
  }
}

// Si exécuté directement
if (require.main === module) {
  const agent = new TruthChecker();

  agent.on('truth:mismatches_found', (data) => {
    console.log('⚠️ Assertions incorrectes trouvées:', data);
  });

  agent.on('truth:alert_created', (data) => {
    console.log('✅ Alerte créée:', data);
  });

  agent.on('error', (error) => {
    console.error('❌ Erreur Truth Checker:', error.message);
  });

  agent.start().catch(console.error);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Signal SIGINT reçu');
    await agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Signal SIGTERM reçu');
    await agent.stop();
    process.exit(0);
  });
}

module.exports = TruthChecker;
