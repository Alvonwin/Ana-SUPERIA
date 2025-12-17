/**
 * Ana Bash Tools
 * Exécution sécurisée de commandes système
 * Architecture: spawn() + BackgroundProcessManager
 */

const { spawn } = require('child_process');
const path = require('path');
const Security = require('../middleware/security.cjs');
const config = require('../config/tools-config.cjs');

// Manager pour processus background
class BackgroundProcessManager {
  constructor() {
    this.processes = new Map();
    this.nextId = 1;

    // Cleanup automatique toutes les 5 minutes
    setInterval(() => this.cleanupFinished(), 300000);
  }

  spawn(command, args, options = {}) {
    const bashId = `bash_${this.nextId++}`;
    const child = spawn(command, args, {
      ...options,
      shell: this.shouldUseShell(command)
    });

    const processInfo = {
      id: bashId,
      command: command,
      args: args,
      pid: child.pid,
      startTime: Date.now(),
      stdout: [],
      stderr: [],
      exitCode: null,
      running: true,
      process: child
    };

    // Collecter stdout avec timestamps
    child.stdout.on('data', (data) => {
      processInfo.stdout.push({
        timestamp: Date.now(),
        data: data.toString()
      });
    });

    // Collecter stderr avec timestamps
    child.stderr.on('data', (data) => {
      processInfo.stderr.push({
        timestamp: Date.now(),
        data: data.toString()
      });
    });

    // Processus terminé
    child.on('close', (code) => {
      processInfo.exitCode = code;
      processInfo.running = false;
      processInfo.endTime = Date.now();
    });

    // Erreur spawn
    child.on('error', (error) => {
      processInfo.error = error.message;
      processInfo.running = false;
      processInfo.endTime = Date.now();
    });

    this.processes.set(bashId, processInfo);
    return { bashId, pid: child.pid };
  }

  getOutput(bashId, sinceTimestamp = 0) {
    const proc = this.processes.get(bashId);
    if (!proc) {
      throw new Error(`Process ${bashId} not found`);
    }

    // Filtrer nouveau output seulement
    const newStdout = proc.stdout.filter(
      line => line.timestamp > sinceTimestamp
    );
    const newStderr = proc.stderr.filter(
      line => line.timestamp > sinceTimestamp
    );

    return {
      bashId: bashId,
      stdout: newStdout.map(l => l.data).join(''),
      stderr: newStderr.map(l => l.data).join(''),
      running: proc.running,
      exitCode: proc.exitCode,
      error: proc.error || null,
      pid: proc.pid
    };
  }

  kill(bashId, signal = 'SIGTERM') {
    const proc = this.processes.get(bashId);
    if (!proc) {
      throw new Error(`Process ${bashId} not found`);
    }
    if (!proc.running) {
      throw new Error(`Process ${bashId} already terminated`);
    }

    try {
      proc.process.kill(signal);

      // Si SIGTERM, fallback SIGKILL après 5s
      if (signal === 'SIGTERM') {
        setTimeout(() => {
          if (proc.running) {
            proc.process.kill('SIGKILL');
          }
        }, 5000);
      }

      return { killed: true, signal: signal };
    } catch (error) {
      throw new Error(`Failed to kill process: ${error.message}`);
    }
  }

  cleanupFinished() {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, proc] of this.processes.entries()) {
      // Supprimer processus terminés depuis > 5 min
      if (!proc.running && now - proc.endTime > 300000) {
        this.processes.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} finished background processes`);
    }
  }

  shouldUseShell(command) {
    // Sur Windows, certaines commandes nécessitent shell
    if (process.platform === 'win32') {
      const shellCommands = ['dir', 'del', 'type', 'copy', 'move', 'cd'];
      return shellCommands.includes(command.toLowerCase());
    }
    return false;
  }

  listProcesses() {
    return Array.from(this.processes.values()).map(p => ({
      id: p.id,
      command: p.command,
      args: p.args,
      pid: p.pid,
      running: p.running,
      exitCode: p.exitCode,
      startTime: p.startTime,
      duration: p.endTime ? p.endTime - p.startTime : Date.now() - p.startTime
    }));
  }
}

// Instance globale
const processManager = new BackgroundProcessManager();

class BashTools {
  /**
   * Exécuter commande avec timeout (bloquante)
   * @param {string} command - Commande à exécuter
   * @param {object} options - { timeout, cwd }
   * @returns {object} { success, stdout, stderr, exitCode }
   */
  static async execute(command, options = {}) {
    const {
      timeout = config.MAX_BASH_TIMEOUT || 120000,
      cwd = process.cwd()
    } = options;

    try {
      // Validation sécurité
      const validation = Security.isCommandAllowed(command);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      // Parser commande et arguments
      const parts = this.parseCommand(command);
      const cmd = parts[0];
      const args = parts.slice(1);

      return await this.spawnWithTimeout(cmd, args, { timeout, cwd });

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXEC_ERROR',
          message: error.message,
          command: command
        }
      };
    }
  }

  /**
   * Spawn avec timeout
   */
  static spawnWithTimeout(command, args, options = {}) {
    const { timeout, cwd } = options;

    return new Promise((resolve) => {
      // Sur Windows, utiliser cmd.exe pour les commandes internes
      let actualCommand = command;
      let actualArgs = args;

      if (process.platform === 'win32') {
        const shellCommands = ['dir', 'del', 'type', 'copy', 'move', 'cd', 'cls', 'echo', 'set', 'path', 'md', 'mkdir', 'rd', 'rmdir', 'ren', 'rename'];
        if (shellCommands.includes(command.toLowerCase())) {
          // Reconstruire la commande complète pour cmd.exe
          const fullCommand = [command, ...args].join(' ');
          actualCommand = 'cmd.exe';
          actualArgs = ['/c', fullCommand];
        }
      }

      const child = spawn(actualCommand, actualArgs, {
        cwd: cwd,
        shell: false  // On gère nous-mêmes via cmd.exe
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Timer timeout
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');

        // Force kill après 5s
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, timeout);

      // Collecter stdout
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collecter stderr
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Processus terminé
      child.on('close', (code) => {
        clearTimeout(timer);

        if (timedOut) {
          resolve({
            success: false,
            error: {
              code: 'TIMEOUT',
              message: `Command timed out after ${timeout}ms`,
              stdout: stdout,
              stderr: stderr
            }
          });
        } else {
          resolve({
            success: code === 0,
            stdout: stdout,
            stderr: stderr,
            exitCode: code,
            duration: Date.now() - child.spawnArgs?.startTime || 0
          });
        }
      });

      // Erreur spawn
      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          success: false,
          error: {
            code: 'SPAWN_ERROR',
            message: error.message
          }
        });
      });
    });
  }

  /**
   * Lancer processus background
   * @param {string} command - Commande
   * @param {object} options - { cwd }
   * @returns {object} { success, bashId, pid }
   */
  static async spawnBackground(command, options = {}) {
    const { cwd = process.cwd() } = options;

    try {
      // Validation sécurité
      const validation = Security.isCommandAllowed(command);
      if (!validation.allowed) {
        throw new Error(validation.reason);
      }

      // Parser commande
      const parts = this.parseCommand(command);
      const cmd = parts[0];
      const args = parts.slice(1);

      // Spawn
      const { bashId, pid } = processManager.spawn(cmd, args, { cwd });

      return {
        success: true,
        bashId: bashId,
        pid: pid,
        command: command
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SPAWN_ERROR',
          message: error.message,
          command: command
        }
      };
    }
  }

  /**
   * Récupérer output d'un processus background
   * @param {string} bashId - ID du processus
   * @param {number} sinceTimestamp - Timestamp depuis dernier fetch
   * @returns {object} { success, stdout, stderr, running, exitCode }
   */
  static getOutput(bashId, sinceTimestamp = 0) {
    try {
      const output = processManager.getOutput(bashId, sinceTimestamp);
      return {
        success: true,
        ...output
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          bashId: bashId
        }
      };
    }
  }

  /**
   * Tuer un processus background
   * @param {string} bashId - ID du processus
   * @param {string} signal - Signal (SIGTERM ou SIGKILL)
   * @returns {object} { success, killed }
   */
  static killProcess(bashId, signal = 'SIGTERM') {
    try {
      const result = processManager.kill(bashId, signal);
      return {
        success: true,
        bashId: bashId,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'KILL_ERROR',
          message: error.message,
          bashId: bashId
        }
      };
    }
  }

  /**
   * Lister tous les processus background
   * @returns {object} { success, processes }
   */
  static listProcesses() {
    return {
      success: true,
      processes: processManager.listProcesses(),
      count: processManager.processes.size
    };
  }

  /**
   * Parser commande string en array [cmd, ...args]
   * Gère quotes et escaping basique
   */
  static parseCommand(command) {
    const parts = [];
    let current = '';
    let inQuote = false;
    let quoteChar = null;

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuote) {
        inQuote = false;
        quoteChar = null;
      } else if (char === ' ' && !inQuote) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }
}

module.exports = BashTools;
