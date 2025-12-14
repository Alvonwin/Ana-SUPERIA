/**
 * Script pour corriger la conversion des paths Windows dans bash-tools.cjs
 * Best practice: Convertir / en \ pour les commandes Windows cmd.exe
 */
const fs = require('fs');
const path = require('path');

const bashToolsPath = path.join(__dirname, 'bash-tools.cjs');

console.log('=== APPLICATION DU FIX WINDOWS PATH ===');
console.log('Fichier:', bashToolsPath);

// Lire le fichier
let content = fs.readFileSync(bashToolsPath, 'utf-8');

// Vérifier si déjà corrigé
if (content.includes('const windowsArgs = args.map(arg => arg.replace')) {
  console.log('Le fix est déjà appliqué!');
  process.exit(0);
}

// Pattern à remplacer
const oldCode = `        if (shellCommands.includes(command.toLowerCase())) {
          // Reconstruire la commande complète pour cmd.exe
          const fullCommand = [command, ...args].join(' ');
          actualCommand = 'cmd.exe';
          actualArgs = ['/c', fullCommand];
        }`;

const newCode = `        if (shellCommands.includes(command.toLowerCase())) {
          // Reconstruire la commande complète pour cmd.exe
          // Convertir forward slashes en backslashes pour Windows (best practice)
          const windowsArgs = args.map(arg => arg.replace(/\\//g, '\\\\'));
          const fullCommand = [command, ...windowsArgs].join(' ');
          actualCommand = 'cmd.exe';
          actualArgs = ['/c', fullCommand];
        }`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(bashToolsPath, content, 'utf-8');
  console.log('Fix appliqué avec succès!');
  console.log('');
  console.log('Modification effectuée:');
  console.log('- Ajout de: const windowsArgs = args.map(arg => arg.replace(/\\//g, "\\\\"));');
  console.log('- Les paths comme E:/ANA seront convertis en E:\\ANA');
} else {
  console.log('ERREUR: Pattern non trouvé dans le fichier.');
  console.log('Le fichier a peut-être été modifié manuellement.');
  process.exit(1);
}
