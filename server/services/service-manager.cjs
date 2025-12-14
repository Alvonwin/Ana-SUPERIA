/**
 * ANA SERVICE MANAGER
 *
 * Gestion du cycle de vie des services Ana avec lazy loading
 * - Agents autonomes (17 agents)
 * - ComfyUI (génération d'images)
 * - n8n (workflows automation)
 *
 * Best Practices 2025:
 * - Graceful shutdown avec SIGTERM
 * - Process monitoring avec health checks
 * - Auto-restart sur crash
 * - Logging structuré
 */

const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

class ServiceManager {
  constructor() {
    this.services = {
      agents: {
        name: 'Ana Agents',
        process: null,
        status: 'stopped',
        command: 'node',
        args: ['start_agents.cjs'],
        cwd: 'E:\\ANA\\agents',
        port: 3336, // Dashboard server port - pour détecter si agents déjà démarrés par START_ANA.bat
        healthCheck: 'http://localhost:3336/api/agents',
        autoRestart: false, // Désactivé car START_ANA.bat démarre les agents
        restartAttempts: 0,
        maxRestarts: 3
      },
      comfyui: {
        name: 'ComfyUI',
        process: null,
        status: 'stopped',
        command: 'cmd',
        args: ['/c', 'run_nvidia_gpu.bat'],
        cwd: 'E:\\AI_Tools\\ComfyUI',
        port: 8188,
        healthCheck: 'http://localhost:8188/system_stats',
        autoRestart: false,
        restartAttempts: 0,
        maxRestarts: 1
      },
      n8n: {
        name: 'n8n',
        process: null,
        status: 'stopped',
        command: 'cmd',
        args: ['/c', 'n8n', 'start'],
        cwd: 'E:\\ANA',
        port: 5678,
        healthCheck: 'http://localhost:5678/rest/active',
        autoRestart: false,
        restartAttempts: 0,
        maxRestarts: 1
      }
    };

    this.setupGracefulShutdown();
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n[Service Manager] Received ${signal}, shutting down gracefully...`);
      await this.stopAll();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Start a service
   */
  async start(serviceName) {
    const service = this.services[serviceName];
    if (!service) {
      throw new Error(`Service inconnu: ${serviceName}`);
    }

    if (service.status === 'running') {
      return { success: true, message: `${service.name} est déjà actif` };
    }

    if (service.status === 'starting') {
      return { success: false, message: `${service.name} est en cours de démarrage` };
    }

    // IMPORTANT: Check if service is already running externally (started outside Ana)
    // This prevents trying to start a service that's already using the port
    if (service.port) {
      console.log(`[Service Manager] Checking if ${service.name} is already running on port ${service.port}...`);
      const isAlreadyRunning = await this.checkPortInUse(service.port);
      if (isAlreadyRunning) {
        console.log(`[Service Manager] ✅ ${service.name} is already running externally on port ${service.port}`);
        service.status = 'running';
        service.pid = 'external';
        return { success: true, message: `${service.name} détecté sur port ${service.port}`, pid: 'external' };
      }
    }

    console.log(`[Service Manager] Démarrage ${service.name}...`);
    service.status = 'starting';

    try {
      // Spawn process
      const childProcess = spawn(service.command, service.args, {
        cwd: service.cwd,
        stdio: 'pipe',
        shell: true,
        detached: false
      });

      service.process = childProcess;
      service.pid = childProcess.pid;

      // Handle stdout
      childProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          console.log(`[${service.name}] ${message}`);
        }
      });

      // Handle stderr
      childProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message && !message.includes('DeprecationWarning')) {
          console.error(`[${service.name}] ERROR: ${message}`);
        }
      });

      // Handle exit
      childProcess.on('exit', (code, signal) => {
        console.log(`[${service.name}] Process exited with code ${code}, signal ${signal}`);
        service.status = 'stopped';
        service.process = null;
        service.pid = null;

        // Auto-restart logic
        if (service.autoRestart && code !== 0 && service.restartAttempts < service.maxRestarts) {
          service.restartAttempts++;
          console.log(`[${service.name}] Auto-restart attempt ${service.restartAttempts}/${service.maxRestarts}`);
          setTimeout(() => this.start(serviceName), 5000);
        }
      });

      // Handle errors
      childProcess.on('error', (error) => {
        console.error(`[${service.name}] Failed to start:`, error.message);
        service.status = 'error';
        service.process = null;
      });

      // Wait for service to be ready
      const isReady = await this.waitForService(service, 30000);

      if (isReady) {
        service.status = 'running';
        service.restartAttempts = 0;
        console.log(`[Service Manager] ✅ ${service.name} is running (PID: ${service.pid})`);
        return {
          success: true,
          message: `${service.name} démarré avec succès`,
          pid: service.pid
        };
      } else {
        service.status = 'error';
        console.error(`[Service Manager] ❌ ${service.name} failed health check`);
        return {
          success: false,
          message: `${service.name} n'a pas passé le health check`
        };
      }

    } catch (error) {
      service.status = 'error';
      console.error(`[Service Manager] Error starting ${service.name}:`, error.message);
      return {
        success: false,
        message: `Erreur lors du démarrage: ${error.message}`
      };
    }
  }

  /**
   * Stop a service
   */
  async stop(serviceName) {
    const service = this.services[serviceName];
    if (!service) {
      throw new Error(`Service inconnu: ${serviceName}`);
    }

    if (service.status === 'stopped') {
      return { success: true, message: `${service.name} est déjà arrêté` };
    }

    console.log(`[Service Manager] Arrêt ${service.name}...`);

    try {
      if (service.process) {
        // Disable auto-restart before killing
        const originalAutoRestart = service.autoRestart;
        service.autoRestart = false;

        // Send SIGTERM for graceful shutdown
        service.process.kill('SIGTERM');

        // Wait 5 seconds, then force kill if still running
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (service.process) {
              console.log(`[Service Manager] Force killing ${service.name}...`);
              service.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);

          service.process.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        service.autoRestart = originalAutoRestart;
        service.status = 'stopped';
        service.process = null;
        service.pid = null;

        console.log(`[Service Manager] ✅ ${service.name} stopped`);
        return { success: true, message: `${service.name} arrêté avec succès` };
      }

      return { success: true, message: `${service.name} était déjà arrêté` };

    } catch (error) {
      console.error(`[Service Manager] Error stopping ${service.name}:`, error.message);
      return {
        success: false,
        message: `Erreur lors de l'arrêt: ${error.message}`
      };
    }
  }

  /**
   * Get status of all services
   */
  getStatus() {
    const status = {};
    for (const [key, service] of Object.entries(this.services)) {
      status[key] = {
        name: service.name,
        status: service.status,
        pid: service.pid,
        port: service.port,
        restartAttempts: service.restartAttempts
      };
    }
    return status;
  }

  /**
   * Wait for service to be ready via health check
   */
  async waitForService(service, timeout = 30000) {
    if (!service.healthCheck) {
      // No health check, wait 5 seconds and assume ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    }

    const startTime = Date.now();
    const interval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(service.healthCheck, { timeout: 2000 });
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return false;
  }

  /**
   * Stop all services
   */
  async stopAll() {
    console.log('[Service Manager] Stopping all services...');
    const promises = Object.keys(this.services).map(name => this.stop(name));
    await Promise.all(promises);
    console.log('[Service Manager] All services stopped');
  }

  /**
   * Check if a service is running
   */
  isRunning(serviceName) {
    const service = this.services[serviceName];
    return service && service.status === 'running';
  }

  /**
   * Check if a port is in use (service running externally)
   * Uses HTTP request - if anything responds, port is in use
   */
  async checkPortInUse(port) {
    try {
      const response = await axios.get(`http://localhost:${port}/`, {
        timeout: 2000,
        validateStatus: () => true // Accept any status code (even 401, 404)
      });
      console.log(`[Service Manager] Port ${port} responded with status ${response.status}`);
      return true; // Something is running
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return false; // Nothing running
      }
      // Other errors (timeout, etc) - assume something is there
      console.log(`[Service Manager] Port ${port} check error: ${error.code || error.message}`);
      return true;
    }
  }
}

module.exports = ServiceManager;
