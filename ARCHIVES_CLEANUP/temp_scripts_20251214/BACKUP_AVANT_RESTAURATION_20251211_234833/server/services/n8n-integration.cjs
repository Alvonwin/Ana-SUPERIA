/**
 * n8n Integration Service - Workflow Automation Bridge
 *
 * ANA SUPERIA - Integration avec n8n pour automation
 *
 * Best Practices 2025:
 * - Webhooks pour event-driven automation
 * - HTTP requests pour scheduled tasks
 * - Error handling avec retry logic
 * - Production vs Test URL management
 *
 * Sources:
 * - https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
 * - https://dev.to/shieldstring/nodejs-to-n8n-a-developers-guide-to-smarter-workflow-automation-2bjc
 *
 * Date: 25 Novembre 2025
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class N8nIntegration {
  constructor(config = {}) {
    this.n8nUrl = config.n8nUrl || 'http://localhost:5678';
    this.timeout = config.timeout || 30000; // 30s
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000; // 1s
    this.webhooksPath = path.join('E:', 'ANA', 'automation_hub', 'webhooks');
    this.workflowsPath = path.join('E:', 'ANA', 'automation_hub', 'workflows');
    this.logPath = path.join('E:', 'ANA', 'logs', 'n8n_integration.log');

    // Registered webhooks
    this.webhooks = new Map();

    // Stats
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      retries: 0,
      lastCall: null
    };

    // Ensure directories exist
    this._ensureDirectories();
  }

  /**
   * Initialize n8n integration
   */
  async initialize() {
    this.log('Initializing n8n Integration...');

    // Check n8n health
    const health = await this.checkHealth();
    if (!health.healthy) {
      this.log(`n8n not responding: ${health.error}`, 'warn');
      return { success: false, error: health.error };
    }

    // Load saved webhooks
    await this._loadWebhooks();

    this.log(`n8n Integration initialized. ${this.webhooks.size} webhooks loaded.`);
    return {
      success: true,
      n8nUrl: this.n8nUrl,
      webhooksCount: this.webhooks.size
    };
  }

  /**
   * Check n8n health
   */
  async checkHealth() {
    try {
      // n8n health endpoint
      const response = await axios.get(`${this.n8nUrl}/healthz`, {
        timeout: 5000
      });
      return { healthy: true, status: response.status };
    } catch (error) {
      // Try alternative check - just access root
      try {
        await axios.get(this.n8nUrl, { timeout: 5000 });
        return { healthy: true, status: 'accessible' };
      } catch (e) {
        return { healthy: false, error: error.message };
      }
    }
  }

  /**
   * Trigger a webhook
   * @param {string} webhookPath - Webhook path (after /webhook/)
   * @param {Object} data - Payload to send
   * @param {Object} options - Additional options
   */
  async triggerWebhook(webhookPath, data = {}, options = {}) {
    const url = `${this.n8nUrl}/webhook/${webhookPath}`;
    const useTestUrl = options.test !== false; // Default to test URL

    this.stats.totalCalls++;
    this.stats.lastCall = new Date().toISOString();

    // Determine URL (test vs production)
    const finalUrl = useTestUrl
      ? `${this.n8nUrl}/webhook-test/${webhookPath}`
      : url;

    this.log(`Triggering webhook: ${finalUrl}`);

    // Retry logic
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(finalUrl, data, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          timeout: options.timeout || this.timeout
        });

        this.stats.successfulCalls++;
        this.log(`Webhook triggered successfully (attempt ${attempt})`);

        return {
          success: true,
          status: response.status,
          data: response.data,
          attempt
        };
      } catch (error) {
        lastError = error;
        this.stats.retries++;
        this.log(`Webhook failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`, 'warn');

        if (attempt < this.maxRetries) {
          await this._sleep(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    // All retries failed
    this.stats.failedCalls++;
    this.log(`Webhook failed after ${this.maxRetries} attempts: ${lastError.message}`, 'error');

    return {
      success: false,
      error: lastError.message,
      attempts: this.maxRetries
    };
  }

  /**
   * Register a webhook for tracking
   * @param {string} name - Webhook name
   * @param {string} path - Webhook path
   * @param {string} description - Description
   */
  registerWebhook(name, webhookPath, description = '') {
    this.webhooks.set(name, {
      path: webhookPath,
      description,
      registeredAt: new Date().toISOString(),
      callCount: 0
    });

    this._saveWebhooks();
    this.log(`Webhook registered: ${name} -> /webhook/${webhookPath}`);

    return { success: true, name, path: webhookPath };
  }

  /**
   * Get all registered webhooks
   */
  getWebhooks() {
    return Array.from(this.webhooks.entries()).map(([name, info]) => ({
      name,
      ...info
    }));
  }

  /**
   * Create a workflow file template
   * @param {string} name - Workflow name
   * @param {string} description - Description
   * @param {Array} triggers - Trigger configurations
   */
  async createWorkflowTemplate(name, description, triggers = []) {
    const workflow = {
      name,
      nodes: [],
      connections: {},
      active: false,
      settings: {
        executionOrder: 'v1'
      },
      meta: {
        instanceId: 'ana-local',
        description,
        createdBy: 'Ana SUPERIA',
        createdAt: new Date().toISOString()
      }
    };

    // Add webhook trigger if specified
    if (triggers.includes('webhook')) {
      workflow.nodes.push({
        parameters: {
          path: name.toLowerCase().replace(/\s+/g, '-'),
          options: {}
        },
        id: 'webhook-trigger',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        webhookId: `ana-${name.toLowerCase().replace(/\s+/g, '-')}`
      });
    }

    // Add schedule trigger if specified
    if (triggers.includes('schedule')) {
      workflow.nodes.push({
        parameters: {
          rule: {
            interval: [{ field: 'hours', hoursInterval: 1 }]
          }
        },
        id: 'schedule-trigger',
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        position: [250, 450]
      });
    }

    // Save workflow template
    const filename = `${name.toLowerCase().replace(/\s+/g, '_')}.json`;
    const filepath = path.join(this.workflowsPath, filename);

    fs.writeFileSync(filepath, JSON.stringify(workflow, null, 2), 'utf-8');
    this.log(`Workflow template created: ${filepath}`);

    return {
      success: true,
      name,
      filepath,
      triggerCount: workflow.nodes.length
    };
  }

  /**
   * Get predefined workflow templates for Ana
   */
  getAnaWorkflowTemplates() {
    return [
      {
        name: 'daily-art-generation',
        description: 'Génération quotidienne d\'art avec ComfyUI',
        triggers: ['schedule'],
        nodes: ['Schedule Trigger', 'HTTP Request (ComfyUI)', 'Save to Disk']
      },
      {
        name: 'code-analysis-diagram',
        description: 'Analyse de code et génération de diagrammes',
        triggers: ['webhook'],
        nodes: ['Webhook', 'Code Parser', 'Diagram Generator', 'Save File']
      },
      {
        name: 'memory-sync',
        description: 'Synchronisation mémoire vers ChromaDB',
        triggers: ['schedule', 'webhook'],
        nodes: ['Trigger', 'Read Memory', 'Embed Text', 'ChromaDB Insert']
      },
      {
        name: 'taaft-discovery',
        description: 'Découverte automatique d\'outils IA sur TAAFT',
        triggers: ['schedule'],
        nodes: ['Schedule', 'Web Scraper', 'AI Analysis', 'Save Results']
      },
      {
        name: 'error-notification',
        description: 'Notification des erreurs Ana',
        triggers: ['webhook'],
        nodes: ['Webhook', 'Format Error', 'Log to File', 'Optional: Email/Discord']
      }
    ];
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      webhooksCount: this.webhooks.size,
      n8nUrl: this.n8nUrl
    };
  }

  /**
   * Ensure directories exist
   */
  _ensureDirectories() {
    [this.webhooksPath, this.workflowsPath, path.dirname(this.logPath)].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Load saved webhooks
   */
  async _loadWebhooks() {
    const webhooksFile = path.join(this.webhooksPath, 'registered.json');
    if (fs.existsSync(webhooksFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(webhooksFile, 'utf-8'));
        this.webhooks = new Map(Object.entries(data));
      } catch (error) {
        this.log(`Failed to load webhooks: ${error.message}`, 'warn');
      }
    }
  }

  /**
   * Save webhooks to file
   */
  _saveWebhooks() {
    const webhooksFile = path.join(this.webhooksPath, 'registered.json');
    try {
      const data = Object.fromEntries(this.webhooks);
      fs.writeFileSync(webhooksFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      this.log(`Failed to save webhooks: ${error.message}`, 'warn');
    }
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [N8N] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    try {
      fs.appendFileSync(this.logPath, logMessage + '\n', 'utf-8');
    } catch (error) {
      // Silently fail
    }
  }
}

// Export singleton
const n8nIntegration = new N8nIntegration();
module.exports = n8nIntegration;
