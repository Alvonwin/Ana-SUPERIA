/**
 * 💾 ANA MEMORY CAPTURE - Intégration avec Système Mémoire V3
 *
 * RÔLE: Capturer conversations Ana dans système mémoire existant
 * - V1: current_conversation.txt (flux continu avec ##Ana)
 * - V2: stages/stage_01/ (échanges structurés)
 * - V3: Orchestration et logging
 *
 * Date: 23 Novembre 2025
 * Système: Ana SUPERIA + V3 Memory Architecture
 */

const path = require('path');
const fs = require('fs');

// Import V1 and V2 handlers
const V1Handler = require(path.join('E:', 'Automation', 'Scripts', 'Python', 'hook_capture_v1_handler.js'));
const V2Handler = require(path.join('E:', 'Automation', 'Scripts', 'Python', 'hook_capture_v2_handler.js'));

class AnaMemoryCapture {
  constructor() {
    this.v1 = new V1Handler();
    this.v2 = new V2Handler();
    this.enabled = true;
    this.logPath = 'E:/Mémoire Claude/hook_capture_ana.log';

    // Initialize log file
    this.log('🚀 Ana Memory Capture initialized');
  }

  /**
   * Log to Ana-specific log file
   */
  log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;

    try {
      fs.appendFileSync(this.logPath, logLine, 'utf-8');
    } catch (error) {
      console.error('❌ Memory log error:', error.message);
    }
  }

  /**
   * Capture Ana conversation exchange
   * @param {Object} data - {userMessage, anaResponse, model, metadata}
   * @returns {Object} - {success, v1, v2, error}
   */
  async capture(data) {
    if (!this.enabled) {
      return { success: false, error: 'Memory capture disabled' };
    }

    const { userMessage, anaResponse, model, metadata = {} } = data;

    if (!userMessage || !anaResponse) {
      this.log('❌ Missing userMessage or anaResponse');
      return { success: false, error: 'Missing required fields' };
    }

    this.log(`📥 Capturing exchange: User(${userMessage.length} chars) + Ana(${anaResponse.length} chars)`);

    const results = { success: true, v1: null, v2: null };

    try {
      // ========== V1: Capture in current_conversation.txt ==========
      // Format: ##Alain and ##Ana (nouveau préfixe)

      // Capture user message
      const v1UserResult = await this.v1.capture({
        role: 'user',
        message: userMessage
      });

      // Capture Ana response with custom prefix ##Ana
      // Note: V1Handler uses hardcoded ##Claude, we need to override
      const anaPrefix = '## Ana:';
      const anaLine = `${anaPrefix} ${anaResponse}\n`;

      try {
        fs.appendFileSync('E:/Mémoire Claude/current_conversation.txt', anaLine, 'utf-8');
        results.v1 = {
          success: true,
          userBytes: v1UserResult.bytesWritten,
          anaBytes: Buffer.byteLength(anaLine, 'utf-8')
        };
        this.log(`✅ V1 captured: User(${v1UserResult.bytesWritten}B) + Ana(${results.v1.anaBytes}B)`);
      } catch (error) {
        results.v1 = { success: false, error: error.message };
        this.log(`❌ V1 Ana response failed: ${error.message}`);
      }

      // ========== V2: Capture in stages/stage_01/ ==========
      const v2Result = await this.v2.capture({
        userMessage,
        claudeResponse: anaResponse, // V2 expects 'claudeResponse' param
        metadata: {
          ...metadata,
          source: 'ana',
          model: model,
          timestamp: new Date().toISOString()
        }
      });

      results.v2 = v2Result;

      if (v2Result.success) {
        this.log(`✅ V2 captured: ${v2Result.exchangePath}`);
      } else {
        this.log(`❌ V2 failed: ${v2Result.error}`);
      }

      // ========== Log Consolidated Status ==========
      const v1Status = results.v1?.success ? '✅' : '❌';
      const v2Status = results.v2?.success ? '✅' : '❌';

      this.log(`[CONSOLIDATED] V1=${v1Status} | V2=${v2Status} | Model: ${model}`);

      // Determine overall success
      results.success = (results.v1?.success || false) || (results.v2?.success || false);

    } catch (error) {
      this.log(`❌ Capture error: ${error.message}`);
      results.success = false;
      results.error = error.message;
    }

    return results;
  }

  /**
   * Get capture statistics
   */
  getStats() {
    try {
      const v1Stats = this.v1.getStats();
      const v2Stats = this.v2.getStats ? this.v2.getStats() : {};

      return {
        enabled: this.enabled,
        v1: v1Stats,
        v2: v2Stats,
        logFile: this.logPath
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Enable/disable memory capture
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.log(`📝 Memory capture ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
module.exports = new AnaMemoryCapture();
