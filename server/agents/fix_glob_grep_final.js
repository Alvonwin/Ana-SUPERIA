const fs = require('fs');

// Fichier source et destination
const source = 'E:/ANA/server/agents/tool-agent.cjs.backup__glob';
const dest = 'E:/ANA/server/agents/tool-agent.cjs.fixed';

console.log('📖 Lecture du fichier backup...');
let content = fs.readFileSync(source, 'utf-8');

// Nouveau code glob (Node.js natif, fonctionne sur Windows)
const newGlob = `  async glob(args) {
    const { pattern, path: searchPath = 'E:/ANA' } = args;
    console.log(\`🔧 [ToolAgent] glob: "\${pattern}" in "\${searchPath}"\`);
    const fs = require('fs');
    const pathModule = require('path');

    function globToRegex(glob) {
      let escaped = glob.replace(/\\./g, '\\\\.').replace(/\\*/g, '.*').replace(/\\?/g, '.');
      return new RegExp(escaped, 'i');
    }

    function walkDir(dir, regex, results, depth) {
      if (depth > 10 || results.length >= 50) return;
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (results.length >= 50) break;
          const fullPath = pathModule.join(dir, item.name);
          if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
            walkDir(fullPath, regex, results, depth + 1);
          } else if (item.isFile() && regex.test(item.name)) {
            results.push(fullPath.replace(/\\\\/g, '/'));
          }
        }
      } catch (e) { /* ignore permission errors */ }
    }

    try {
      const normalizedPath = searchPath.replace(/\\\\/g, '/');
      if (!fs.existsSync(normalizedPath)) {
        return { success: false, error: 'Dossier non trouvé: ' + normalizedPath, files: [] };
      }
      const regex = globToRegex(pattern);
      const files = [];
      walkDir(normalizedPath, regex, files, 0);
      return { success: true, files, count: files.length, pattern, searchPath: normalizedPath };
    } catch (err) {
      return { success: false, error: err.message, files: [] };
    }
  },`;

// Nouveau code grep (Node.js natif, fonctionne sur Windows)
const newGrep = `  async grep(args) {
    const { pattern, path: searchPath = 'E:/ANA', glob: fileGlob, ignore_case = false } = args;
    console.log(\`🔧 [ToolAgent] grep: "\${pattern}" in "\${searchPath}"\`);
    const fs = require('fs');
    const pathModule = require('path');
    const matches = [];

    const regex = new RegExp(pattern, ignore_case ? 'gi' : 'g');
    const fileRegex = fileGlob ? new RegExp(fileGlob.replace(/\\*/g, '.*').replace(/\\?/g, '.'), 'i') : null;

    function searchFile(filePath) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\\n');
        lines.forEach((line, idx) => {
          if (regex.test(line)) {
            matches.push(filePath.replace(/\\\\/g, '/') + ':' + (idx + 1) + ':' + line.substring(0, 200));
          }
        });
      } catch (e) { /* ignore binary/permission errors */ }
    }

    function walkDir(dir, depth) {
      if (depth > 10 || matches.length >= 30) return;
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (matches.length >= 30) break;
          const fullPath = pathModule.join(dir, item.name);
          if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
            walkDir(fullPath, depth + 1);
          } else if (item.isFile()) {
            if (!fileRegex || fileRegex.test(item.name)) {
              searchFile(fullPath);
            }
          }
        }
      } catch (e) { /* ignore permission errors */ }
    }

    try {
      const normalizedPath = searchPath.replace(/\\\\/g, '/');
      const stat = fs.statSync(normalizedPath);
      if (stat.isFile()) {
        searchFile(normalizedPath);
      } else {
        walkDir(normalizedPath, 0);
      }
      return { success: true, matches, count: matches.length };
    } catch (err) {
      return { success: false, error: err.message, matches: [] };
    }
  },`;

// Ancien code glob à remplacer (lignes 636-649)
const oldGlobStart = '  async glob(args) {\n    const { pattern, path: searchPath = \'E:/ANA\' } = args;\n    console.log(`🔧 [ToolAgent] glob:';
const oldGlobEnd = 'return { success: false, error: err.message, files: [] };\n    }\n  },';

// Ancien code grep à remplacer (lignes 651-668)
const oldGrepStart = '  async grep(args) {\n    const { pattern, path: searchPath = \'E:/ANA\', glob: fileGlob, ignore_case = false } = args;';
const oldGrepEnd = 'return { success: false, error: err.message, matches: [] };\n    }\n  },';

// Trouver et remplacer glob
const globStartIdx = content.indexOf('  async glob(args) {');
const globEndSearch = content.indexOf('return { success: false, error: err.message, files: [] };', globStartIdx);
const globEndIdx = content.indexOf('},', globEndSearch) + 2;

if (globStartIdx !== -1 && globEndIdx !== -1) {
  const oldGlob = content.substring(globStartIdx, globEndIdx);
  content = content.replace(oldGlob, newGlob);
  console.log('✅ glob remplacé');
} else {
  console.log('❌ glob non trouvé');
}

// Trouver et remplacer grep
const grepStartIdx = content.indexOf('  async grep(args) {');
const grepEndSearch = content.indexOf('return { success: false, error: err.message, matches: [] };', grepStartIdx);
const grepEndIdx = content.indexOf('},', grepEndSearch) + 2;

if (grepStartIdx !== -1 && grepEndIdx !== -1) {
  const oldGrep = content.substring(grepStartIdx, grepEndIdx);
  content = content.replace(oldGrep, newGrep);
  console.log('✅ grep remplacé');
} else {
  console.log('❌ grep non trouvé');
}

// Écrire le fichier corrigé
fs.writeFileSync(dest, content, 'utf-8');
console.log('✅ Fichier corrigé écrit:', dest);

// Vérifier la syntaxe
try {
  require(dest);
  console.log('✅ Syntaxe valide - Module charge correctement');
} catch (e) {
  console.log('❌ Erreur de syntaxe:', e.message);
}
