/**
 * ANA MEMORY CAPTURE V2 - Système Mémoire Dédié Ana
 *
 * RÔLE: Capturer conversations Ana dans son propre espace mémoire
 * - Fichier texte: E:\ANA\memory\current_conversation_ana.txt
 * - Stages structurés: E:\ANA\memory\stages\stage_01\
 * - Logs: E:\ANA\memory\logs\capture_ana.log
 * - Intégration: TieredMemory (PRIMARY + SECONDARY)
 *
 * Date: 3 Décembre 2025
 * Version: 2.0 - Mémoire dédiée Ana
 * Auteur: Claude (pour Alain)
 *
 * IMPORTANT: Ce fichier est NOUVEAU et n'affecte pas l'ancien memory-capture.cjs
 */

const path = require('path');
const fs = require('fs');

// ========== CHEMINS DÉDIÉS ANA ==========
const ANA_MEMORY_BASE = 'E:/ANA/memory';
const ANA_CONVERSATION_FILE = path.join(ANA_MEMORY_BASE, 'current_conversation_ana.txt');
const ANA_STAGES_PATH = path.join(ANA_MEMORY_BASE, 'stages', 'stage_01');
const ANA_LOG_FILE = path.join(ANA_MEMORY_BASE, 'logs', 'capture_ana.log');

class AnaMemoryCaptureV2 {
  constructor() {
    this.enabled = true;
    this.conversationPath = ANA_CONVERSATION_FILE;
    this.stagesPath = ANA_STAGES_PATH;
    this.logPath = ANA_LOG_FILE;

    // Stats
    this.stats = {
      totalCaptures: 0,
      successfulCaptures: 0,
      failedCaptures: 0,
      lastCaptureTime: null
    };

    // Vérifier que les dossiers existent
    this.ensureDirectories();

    this.log('🚀 Ana Memory Capture V2 initialized');
    this.log(`📁 Conversation: ${this.conversationPath}`);
    this.log(`📁 Stages: ${this.stagesPath}`);
  }

  /**
   * S'assurer que tous les dossiers existent
   */
  ensureDirectories() {
    const dirs = [
      ANA_MEMORY_BASE,
      path.join(ANA_MEMORY_BASE, 'stages'),
      ANA_STAGES_PATH,
      path.join(ANA_MEMORY_BASE, 'logs')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 [AnaMemoryV2] Created: ${dir}`);
        } catch (error) {
          console.error(`❌ [AnaMemoryV2] Failed to create ${dir}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Log avec timestamp
   */
  log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;

    // Console
    console.log(`[AnaMemoryV2] ${message}`);

    // Fichier log
    try {
      fs.appendFileSync(this.logPath, logLine, 'utf-8');
    } catch (error) {
      console.error('❌ Memory log error:', error.message);
    }
  }

  /**
   * Capturer un échange de conversation
   * @param {Object} data - {userMessage, anaResponse, model, metadata}
   * @returns {Object} - {success, text: {}, stage: {}, tiered: {}}
   */
  async capture(data) {
    if (!this.enabled) {
      return { success: false, error: 'Memory capture disabled' };
    }

    const { userMessage, anaResponse, model, metadata = {} } = data;
    this.stats.totalCaptures++;

    // Validation
    if (!userMessage || !anaResponse) {
      this.log('❌ Missing userMessage or anaResponse');
      this.stats.failedCaptures++;
      return { success: false, error: 'Missing required fields' };
    }

    this.log(`📥 Capturing: Alain(${userMessage.length} chars) + Ana(${anaResponse.length} chars)`);

    const results = {
      success: true,
      text: null,
      stage: null,
      tiered: null,
      timestamp: new Date().toISOString()
    };

    // ========== 1. CAPTURE TEXTE (current_conversation_ana.txt) ==========
    try {
      const textEntry = `## Alain: ${userMessage}\n## Ana: ${anaResponse}\n\n`;
      fs.appendFileSync(this.conversationPath, textEntry, 'utf-8');

      results.text = {
        success: true,
        bytes: Buffer.byteLength(textEntry, 'utf-8'),
        file: this.conversationPath
      };
      this.log(`✅ Text captured: ${results.text.bytes} bytes`);
    } catch (error) {
      results.text = { success: false, error: error.message };
      this.log(`❌ Text capture failed: ${error.message}`);
    }

    // ========== 2. CAPTURE STAGE (fichier markdown structuré) ==========
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exchangeFilename = `exchange_${timestamp}.md`;
      const exchangePath = path.join(this.stagesPath, exchangeFilename);

      const stageContent = `# Exchange ${new Date().toISOString()}

## Alain
${userMessage}

## Ana
${anaResponse}

---
**Metadata:**
- Model: ${model || 'unknown'}
- Timestamp: ${new Date().toISOString()}
- Source: ana-memory-v2
${metadata.tools ? `- Tools: ${JSON.stringify(metadata.tools)}` : ''}
`;

      fs.writeFileSync(exchangePath, stageContent, 'utf-8');

      results.stage = {
        success: true,
        file: exchangePath,
        filename: exchangeFilename
      };
      this.log(`✅ Stage captured: ${exchangeFilename}`);
    } catch (error) {
      results.stage = { success: false, error: error.message };
      this.log(`❌ Stage capture failed: ${error.message}`);
    }

    // ========== 3. INTÉGRATION TIERED MEMORY (optionnel) ==========
    try {
      // Tenter d'alimenter TieredMemory si disponible
      const TieredMemory = require('../memory/tiered-memory.cjs');

      if (TieredMemory && TieredMemory.initialized) {
        const entry = TieredMemory.addToPrimary({
          userMessage,
          anaResponse,
          model: model || 'unknown'
        });

        results.tiered = {
          success: true,
          entryId: entry?.id,
          tier: 'primary'
        };
        this.log(`✅ TieredMemory: Added to PRIMARY (${entry?.id})`);
      } else {
        results.tiered = { success: false, error: 'TieredMemory not initialized' };
        this.log(`⚠️ TieredMemory: Not initialized, skipping`);
      }
    } catch (error) {
      results.tiered = { success: false, error: error.message };
      // Ce n'est pas critique, on continue
      this.log(`⚠️ TieredMemory integration skipped: ${error.message}`);
    }

    // ========== RÉSULTAT FINAL ==========
    const textOk = results.text?.success || false;
    const stageOk = results.stage?.success || false;

    results.success = textOk || stageOk;

    if (results.success) {
      this.stats.successfulCaptures++;
      this.stats.lastCaptureTime = new Date().toISOString();
    } else {
      this.stats.failedCaptures++;
    }

    const statusText = results.text?.success ? '✅' : '❌';
    const statusStage = results.stage?.success ? '✅' : '❌';
    const statusTiered = results.tiered?.success ? '✅' : '⚠️';

    this.log(`[RESULT] Text=${statusText} | Stage=${statusStage} | Tiered=${statusTiered} | Model: ${model}`);

    return results;
  }

  /**
   * Rechercher dans la mémoire texte (grep simple)
   * @param {string} query - Texte à rechercher
   * @param {number} limit - Nombre max de résultats
   * @returns {Object} - {success, matches: []}
   */
  searchText(query, limit = 10) {
    try {
      if (!fs.existsSync(this.conversationPath)) {
        return { success: false, error: 'Conversation file not found', matches: [] };
      }

      const content = fs.readFileSync(this.conversationPath, 'utf-8');
      const lines = content.split('\n');
      const queryLower = query.toLowerCase();
      const matches = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(queryLower)) {
          // Inclure contexte (2 lignes avant, 2 après)
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length, i + 3);
          const context = lines.slice(start, end).join('\n');

          matches.push({
            lineNumber: i + 1,
            line: lines[i],
            context: context.substring(0, 500)
          });

          if (matches.length >= limit) break;
        }
      }

      this.log(`🔍 Search "${query}": ${matches.length} match(es)`);

      return {
        success: true,
        query,
        matchCount: matches.length,
        matches
      };
    } catch (error) {
      this.log(`❌ Search error: ${error.message}`);
      return { success: false, error: error.message, matches: [] };
    }
  }

  /**
   * Obtenir les statistiques de capture
   */
  getStats() {
    let conversationSize = 0;
    let stageCount = 0;

    try {
      if (fs.existsSync(this.conversationPath)) {
        conversationSize = fs.statSync(this.conversationPath).size;
      }
    } catch (e) {}

    try {
      if (fs.existsSync(this.stagesPath)) {
        stageCount = fs.readdirSync(this.stagesPath).filter(f => f.endsWith('.md')).length;
      }
    } catch (e) {}

    return {
      enabled: this.enabled,
      version: '2.0',
      paths: {
        conversation: this.conversationPath,
        stages: this.stagesPath,
        log: this.logPath
      },
      stats: {
        ...this.stats,
        conversationSizeBytes: conversationSize,
        conversationSizeKB: (conversationSize / 1024).toFixed(2),
        stageFilesCount: stageCount
      }
    };
  }

  /**
   * Activer/désactiver la capture
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.log(`📝 Memory capture ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Lire les N derniers échanges
   */
  getRecentExchanges(count = 5) {
    try {
      if (!fs.existsSync(this.conversationPath)) {
        return { success: false, exchanges: [] };
      }

      const content = fs.readFileSync(this.conversationPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      // Trouver les blocs ## Alain: ... ## Ana: ...
      const exchanges = [];
      let currentAlain = null;

      for (const line of lines) {
        if (line.startsWith('## Alain:')) {
          currentAlain = line.replace('## Alain:', '').trim();
        } else if (line.startsWith('## Ana:') && currentAlain) {
          exchanges.push({
            alain: currentAlain,
            ana: line.replace('## Ana:', '').trim()
          });
          currentAlain = null;
        }
      }

      return {
        success: true,
        total: exchanges.length,
        exchanges: exchanges.slice(-count)
      };
    } catch (error) {
      return { success: false, error: error.message, exchanges: [] };
    }
  }
}

// Export singleton
module.exports = new AnaMemoryCaptureV2();
