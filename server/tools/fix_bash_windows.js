/**
 * Script pour fixer le support des commandes Windows dans bash-tools.cjs
 */
const fs = require('fs');
const path = require('path');

const bashToolsPath = path.join(__dirname, 'bash-tools.cjs');

// Lire le fichier
let content = fs.readFileSync(bashToolsPath, 'utf-8');

// Vérifier si déjà corrigé
if (content.includes('// Sur Windows, utiliser cmd.exe')) {
  console.log('bash-tools.cjs déjà corrigé!');
  process.exit(0);
}

// Pattern à remplacer
const oldCode = `  /**
   * Spawn avec timeout
   */
  static spawnWithTimeout(command, args, options = {}) {
    const { timeout, cwd } = options;

    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: cwd,
        shell: processManager.shouldUseShell(command)
      });`;

const newCode = `  /**
   * Spawn avec timeout
   * Sur Windows, les commandes internes (dir, del, etc.) nécessitent cmd.exe /c
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
      });`;

if (!content.includes(oldCode)) {
  console.log('Pattern non trouvé - le fichier a peut-être été modifié');
  console.log('Essai avec remplacement regex...');

  // Essayer avec regex
  const regex = /static spawnWithTimeout\(command, args, options = \{\}\) \{[\s\S]*?const child = spawn\(command, args, \{[\s\S]*?shell: processManager\.shouldUseShell\(command\)[\s\S]*?\}\);/;

  if (regex.test(content)) {
    content = content.replace(regex, `static spawnWithTimeout(command, args, options = {}) {
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
      });`);

    fs.writeFileSync(bashToolsPath, content, 'utf-8');
    console.log('bash-tools.cjs corrigé avec regex!');
  } else {
    console.log('ERREUR: Pattern non trouvé même avec regex');
    process.exit(1);
  }
} else {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(bashToolsPath, content, 'utf-8');
  console.log('bash-tools.cjs corrigé!');
}
