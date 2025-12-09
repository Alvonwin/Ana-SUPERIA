#!/usr/bin/env node
/**
 * 🏗️ SYSTÈME DE MÉMOIRE PYRAMIDALE - Le Spot SUP
 *
 * Créé par: Alain + Claude
 * Date: 2025-10-30
 *
 * Fonctionnalités:
 * 1. Auto-save échanges (Étage 1)
 * 2. Auto-résumé 5→1 (résumé intelligent, pas compression)
 * 3. Propagation pyramidale (Étages 2-N)
 * 4. Lecture intelligente (mot-clé "mémoire")
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  BASE_PATH: 'E:/Mémoire Claude/stages',
  SUMMARY_RATIO: 5, // 5 entrées → 1 résumé intelligent
  MAX_STAGES: 999, // Pas de limite d'étages - seulement limite d'espace
  SPACE_LIMIT_GB: 500
};

// Classe principale
class PyramidalMemorySystem {
  constructor() {
    this.sessionId = Date.now().toString();
    this.exchangeCount = 0;
  }

  /**
   * 💾 Sauvegarder un échange (Étage 1)
   */
  async saveExchange(userMessage, claudeResponse, actions = [], filesModified = []) {
    this.exchangeCount++;

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `exchange_${timestamp}.md`;
    const filepath = path.join(CONFIG.BASE_PATH, 'stage_01', filename);

    const content = `# Échange #${this.exchangeCount}
**Date**: ${new Date().toISOString()}
**Session**: ${this.sessionId}

## Alain
${userMessage}

## Claude
${claudeResponse}

## Actions effectuées
${actions.length > 0 ? actions.map(a => `- ${a}`).join('\n') : '- Aucune'}

## Fichiers modifiés
${filesModified.length > 0 ? filesModified.map(f => `- ${f}`).join('\n') : '- Aucun'}

## Métadonnées
- Exchange count: ${this.exchangeCount}
- Stage: 1 (raw)
- Timestamp: ${Date.now()}
`;

    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`💾 Échange #${this.exchangeCount} sauvegardé (Étage 1)`);

    // MODIFICATION V3: Ne plus auto-archiver (V3 décide quand)
    // await this.checkCompressionNeeded(1);

    return filepath;
  }

  /**
   * 📊 Vérifier si résumé nécessaire
   */
  async checkCompressionNeeded(stage) {
    const stagePath = path.join(CONFIG.BASE_PATH, `stage_${String(stage).padStart(2, '0')}`);

    if (!fs.existsSync(stagePath)) {
      return false;
    }

    const files = fs.readdirSync(stagePath)
      .filter(f => f.startsWith('exchange_') || f.startsWith('summary_'));

    if (files.length >= CONFIG.SUMMARY_RATIO) {
      console.log(`📊 ${files.length} entrées à l'Étage ${stage} → Résumé déclenché`);
      await this.compressStage(stage);
      return true;
    }

    return false;
  }

  /**
   * 📝 Résumer un étage (5→1) - VERSION HYBRIDE
   *
   * JUSTIFICATION MODIFICATION:
   * - Stage 1: JAMAIS supprimer (archives verbatim permanentes)
   * - Stage 2+: Archiver au lieu de supprimer (préservation 100%)
   * - Créer liens résumés → originaux (traçabilité complète)
   * - Conforme architecture V2 organique
   */
  async compressStage(stage) {
    const stagePath = path.join(CONFIG.BASE_PATH, `stage_${String(stage).padStart(2, '0')}`);
    const files = fs.readdirSync(stagePath)
      .filter(f => f.startsWith('exchange_') || f.startsWith('summary_'))
      .sort()
      .slice(0, CONFIG.SUMMARY_RATIO);

    // Lire les 5 fichiers
    const contents = files.map(f => {
      const filepath = path.join(stagePath, f);
      return fs.readFileSync(filepath, 'utf-8');
    });

    // Créer résumé intelligent avec métadonnées de traçabilité
    const summary = this.createSummary(contents, stage, files);

    // Sauvegarder résumé à l'étage supérieur
    const nextStage = stage + 1;
    const nextStagePath = path.join(CONFIG.BASE_PATH, `stage_${String(nextStage).padStart(2, '0')}`);

    if (!fs.existsSync(nextStagePath)) {
      fs.mkdirSync(nextStagePath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const summaryFilename = `summary_${timestamp}.md`;
    const summaryFilepath = path.join(nextStagePath, summaryFilename);

    fs.writeFileSync(summaryFilepath, summary, 'utf-8');
    console.log(`⬆️ Résumé créé (Étage ${stage} → Étage ${nextStage})`);

    // MODIFICATION CRITIQUE: Archiver au lieu de supprimer
    // JUSTIFICATION:
    // - Stage 1 = Mémoire vive/court terme → JAMAIS supprimer
    // - Stage 2+ = Déjà résumés → Archiver pour préservation
    // - Permet remontée au verbatim si nécessaire
    // - Conforme philosophie V2: "Aucune compression destructive"

    if (stage === 1) {
      // Stage 1: CONSERVATION TOTALE - Archiver dans 01_ARCHIVES_VERBATIM
      const archivePath = path.join(CONFIG.BASE_PATH, '../01_ARCHIVES_VERBATIM/par_date');
      const archiveDatePath = this.getArchiveDatePath(archivePath);

      if (!fs.existsSync(archiveDatePath)) {
        fs.mkdirSync(archiveDatePath, { recursive: true });
      }

      files.forEach(f => {
        const sourceFile = path.join(stagePath, f);
        const archiveFile = path.join(archiveDatePath, f);

        // Copier vers archives (pas déplacer - double sécurité)
        fs.copyFileSync(sourceFile, archiveFile);

        // Puis supprimer de stage_01 pour éviter accumulation infinie
        // JUSTIFICATION: L'original est préservé dans archives verbatim
        fs.unlinkSync(sourceFile);
      });

      console.log(`📦 ${files.length} fichiers archivés (Étage ${stage} → Archives Verbatim)`);

    } else {
      // Stage 2+: Archiver résumés dans dossier archives du stage
      const archiveStagePath = path.join(stagePath, 'archives');

      if (!fs.existsSync(archiveStagePath)) {
        fs.mkdirSync(archiveStagePath, { recursive: true });
      }

      files.forEach(f => {
        const sourceFile = path.join(stagePath, f);
        const archiveFile = path.join(archiveStagePath, f);

        // Déplacer vers archives du même stage
        fs.renameSync(sourceFile, archiveFile);
      });

      console.log(`📦 ${files.length} résumés archivés (Étage ${stage}/archives/)`);
    }

    // Propager vers étages supérieurs
    await this.checkCompressionNeeded(nextStage);
  }

  /**
   * 🗓️ Obtenir chemin d'archivage par date
   * JUSTIFICATION: Organisation temporelle pour navigation facile
   */
  getArchiveDatePath(basePath) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return path.join(basePath, `${year}/${month}_${this.getMonthName(now.getMonth())}/${day}`);
  }

  /**
   * 📅 Obtenir nom du mois en français
   */
  getMonthName(monthIndex) {
    const months = [
      'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'
    ];
    return months[monthIndex];
  }

  /**
   * 📝 Créer un résumé INTELLIGENT - VERSION HYBRIDE
   *
   * JUSTIFICATION MODIFICATIONS:
   * - Ajout paramètre 'sourceFiles' pour traçabilité
   * - Ajout section "Fichiers sources" avec liens vers originaux
   * - Permet remontée au verbatim depuis n'importe quel résumé
   * - Conforme architecture V2: multi-indexation et préservation
   */
  createSummary(contents, stage, sourceFiles = []) {
    const timestamp = new Date().toISOString();
    const allText = contents.join('\n\n---\n\n');

    // Compter les échanges couverts
    const exchangeNumbers = allText.match(/Échange #(\d+)/g) || [];
    const minExchange = exchangeNumbers.length > 0
      ? Math.min(...exchangeNumbers.map(e => parseInt(e.match(/\d+/)[0])))
      : '?';
    const maxExchange = exchangeNumbers.length > 0
      ? Math.max(...exchangeNumbers.map(e => parseInt(e.match(/\d+/)[0])))
      : '?';

    // Extraire les échanges individuels pour analyse
    const exchanges = this.parseExchanges(contents);

    // Synthétiser les informations clés
    const summary = this.synthesizeExchanges(exchanges);

    // NOUVEAU: Générer chemin d'archives pour traçabilité
    const archiveLocation = stage === 1
      ? this.getArchiveDatePath('01_ARCHIVES_VERBATIM/par_date')
      : `stages/stage_${String(stage).padStart(2, '0')}/archives`;

    return `# Résumé Étage ${stage + 1}
**Date création**: ${timestamp}
**Couvre**: Échanges #${minExchange} à #${maxExchange}
**Nombre d'entrées**: ${contents.length}

## Contenu résumé

${summary.narrative}

## Actions effectuées
${summary.actions.length > 0 ? summary.actions.map(a => `- ${a}`).join('\n') : '- Aucune action significative'}

## Fichiers modifiés
${summary.filesModified.length > 0 ? summary.filesModified.map(f => `- ${f}`).join('\n') : '- Aucun fichier modifié'}

## Décisions techniques
${summary.decisions.length > 0 ? summary.decisions.map(d => `- ${d}`).join('\n') : '- Aucune décision technique notable'}

## Contexte
${summary.context}

---

## 🔗 Fichiers sources (traçabilité)
${sourceFiles.length > 0 ? sourceFiles.map(f => `- \`${archiveLocation}/${f}\``).join('\n') : '- Aucun fichier source'}

**IMPORTANT**: Les fichiers originaux sont préservés dans les archives.
Pour consulter le verbatim complet, voir: \`E:/Mémoire Claude/${archiveLocation}/\`

---

## Métadonnées
- Source stage: ${stage}
- Target stage: ${stage + 1}
- Summary ratio: ${CONFIG.SUMMARY_RATIO}:1
- Archive location: ${archiveLocation}
- Created: ${Date.now()}
- Preservation: 100% (archives verbatim)
`;
  }

  /**
   * 🔍 Parser les échanges individuels
   */
  parseExchanges(contents) {
    return contents.map(content => {
      const exchange = {
        number: null,
        date: null,
        user: '',
        claude: '',
        actions: [],
        filesModified: []
      };

      // Extraire numéro d'échange
      const exchangeMatch = content.match(/Échange #(\d+)/);
      if (exchangeMatch) exchange.number = parseInt(exchangeMatch[1]);

      // Extraire date
      const dateMatch = content.match(/\*\*Date\*\*: (.+)/);
      if (dateMatch) exchange.date = dateMatch[1];

      // Extraire message utilisateur
      const userMatch = content.match(/## Alain\n([\s\S]*?)\n\n## Claude/);
      if (userMatch) exchange.user = userMatch[1].trim();

      // Extraire réponse Claude
      const claudeMatch = content.match(/## Claude\n([\s\S]*?)\n\n## Actions/);
      if (claudeMatch) exchange.claude = claudeMatch[1].trim();

      // Extraire actions
      const actionsMatch = content.match(/## Actions effectuées\n([\s\S]*?)\n\n## Fichiers/);
      if (actionsMatch) {
        const actionsText = actionsMatch[1];
        exchange.actions = actionsText
          .split('\n')
          .filter(line => line.startsWith('- ') && !line.includes('Aucun'))
          .map(line => line.replace(/^- /, '').trim());
      }

      // Extraire fichiers modifiés
      const filesMatch = content.match(/## Fichiers modifiés\n([\s\S]*?)\n\n## Métadonnées/);
      if (filesMatch) {
        const filesText = filesMatch[1];
        exchange.filesModified = filesText
          .split('\n')
          .filter(line => line.startsWith('- ') && !line.includes('Aucun'))
          .map(line => line.replace(/^- /, '').trim());
      }

      return exchange;
    });
  }

  /**
   * 🧠 Synthétiser les échanges en résumé intelligent
   */
  synthesizeExchanges(exchanges) {
    const result = {
      narrative: '',
      actions: [],
      filesModified: [],
      decisions: [],
      context: ''
    };

    // Collecter toutes les actions uniques
    const allActions = new Set();
    const allFiles = new Set();
    const themes = [];

    exchanges.forEach(ex => {
      // Actions
      ex.actions.forEach(action => {
        if (action && action.length > 3) allActions.add(action);
      });

      // Fichiers
      ex.filesModified.forEach(file => {
        if (file && file.length > 3) allFiles.add(file);
      });

      // Identifier les thèmes principaux
      const userLower = ex.user.toLowerCase();
      const claudeLower = ex.claude.toLowerCase();

      if (userLower.includes('erreur') || userLower.includes('fix') || userLower.includes('bug')) {
        themes.push('correction d\'erreur');
      }
      if (userLower.includes('ajoute') || userLower.includes('crée') || userLower.includes('nouveau')) {
        themes.push('ajout de fonctionnalité');
      }
      if (userLower.includes('modifie') || userLower.includes('change') || userLower.includes('update')) {
        themes.push('modification');
      }
      if (userLower.includes('script') || userLower.includes('automation')) {
        themes.push('automatisation');
      }
      if (userLower.includes('valide') || userLower.includes('test')) {
        themes.push('validation');
      }
      if (userLower.includes('bouton') || userLower.includes('ui') || userLower.includes('interface')) {
        themes.push('interface utilisateur');
      }
    });

    // Créer narrative
    const uniqueThemes = [...new Set(themes)];
    const themeCount = exchanges.length;

    if (uniqueThemes.length > 0) {
      result.narrative = `Au cours de ${themeCount} échange${themeCount > 1 ? 's' : ''}, les travaux ont porté sur: ${uniqueThemes.join(', ')}.\n\n`;
    }

    // Ajouter contexte des échanges
    const contextParts = [];
    exchanges.forEach((ex, idx) => {
      if (ex.user && ex.user.length > 10) {
        const shortUser = ex.user.substring(0, 150);
        const shortClaude = ex.claude.substring(0, 150);
        contextParts.push(`\n**Échange #${ex.number || idx + 1}**\nAlain: ${shortUser}${ex.user.length > 150 ? '...' : ''}\nClaude: ${shortClaude}${ex.claude.length > 150 ? '...' : ''}`);
      }
    });

    result.narrative += contextParts.join('\n');

    // Convertir Sets en Arrays
    result.actions = Array.from(allActions);
    result.filesModified = Array.from(allFiles);

    // Extraire décisions techniques (fichiers modifiés = décisions)
    if (result.filesModified.length > 0) {
      result.decisions.push(`Modification de ${result.filesModified.length} fichier${result.filesModified.length > 1 ? 's' : ''}`);
    }

    // Contexte global
    result.context = `Cette série d'échanges fait partie de l'évolution du projet. ${result.actions.length} action${result.actions.length > 1 ? 's' : ''} effectuée${result.actions.length > 1 ? 's' : ''}.`;

    return result;
  }

  /**
   * 📖 Charger mémoire (pour mot-clé "mémoire")
   */
  async loadMemory() {
    console.log('\n🧠 CHARGEMENT MÉMOIRE PYRAMIDALE...\n');

    const memory = {
      longTerm: null,
      stages: []
    };

    // 1. Charger LONG_TERM
    const longTermPath = path.join(CONFIG.BASE_PATH, '../LONG_TERM.md');
    if (fs.existsSync(longTermPath)) {
      memory.longTerm = fs.readFileSync(longTermPath, 'utf-8');
      console.log('✅ LONG_TERM.md chargé');
    }

    // 2. Charger étages (du sommet vers la base)
    for (let stage = CONFIG.MAX_STAGES; stage >= 1; stage--) {
      const stagePath = path.join(CONFIG.BASE_PATH, `stage_${String(stage).padStart(2, '0')}`);

      if (!fs.existsSync(stagePath)) continue;

      const files = fs.readdirSync(stagePath)
        .filter(f => f.startsWith('exchange_') || f.startsWith('summary_'))
        .sort()
        .reverse() // Plus récents en premier
        .slice(0, 10); // Limiter à 10 entrées max par étage

      if (files.length > 0) {
        memory.stages.push({
          stage,
          files: files.map(f => ({
            name: f,
            content: fs.readFileSync(path.join(stagePath, f), 'utf-8')
          }))
        });

        console.log(`✅ Étage ${stage}: ${files.length} entrées chargées`);
      }
    }

    console.log(`\n🎯 Mémoire chargée: ${memory.stages.length} étages actifs\n`);

    return memory;
  }

  /**
   * 📊 Statistiques système
   */
  getStats() {
    const stats = {
      stages: [],
      totalFiles: 0,
      totalSize: 0
    };

    for (let stage = 1; stage <= CONFIG.MAX_STAGES; stage++) {
      const stagePath = path.join(CONFIG.BASE_PATH, `stage_${String(stage).padStart(2, '0')}`);

      if (!fs.existsSync(stagePath)) continue;

      const files = fs.readdirSync(stagePath);
      const size = files.reduce((acc, f) => {
        const filepath = path.join(stagePath, f);
        return acc + fs.statSync(filepath).size;
      }, 0);

      stats.stages.push({
        stage,
        fileCount: files.length,
        sizeKB: Math.round(size / 1024)
      });

      stats.totalFiles += files.length;
      stats.totalSize += size;
    }

    return stats;
  }
}

// Export
module.exports = PyramidalMemorySystem;

// CLI usage
if (require.main === module) {
  const system = new PyramidalMemorySystem();

  const command = process.argv[2];

  switch (command) {
    case 'save':
      const user = process.argv[3] || 'Test message';
      const claude = process.argv[4] || 'Test response';
      system.saveExchange(user, claude, ['Test action'], ['test.js']);
      break;

    case 'load':
      system.loadMemory().then(memory => {
        console.log(JSON.stringify(memory, null, 2));
      });
      break;

    case 'stats':
      console.log(JSON.stringify(system.getStats(), null, 2));
      break;

    default:
      console.log(`
Usage:
  node memory_system.js save "user message" "claude response"
  node memory_system.js load
  node memory_system.js stats
      `);
  }
}
