const fs = require('fs');
const file = 'E:/ANA/server/agents/tool-agent.cjs.backup_20251204_avant_fix_glob';
let content = fs.readFileSync(file, 'utf-8');

// Nouveau glob (Node.js natif, fonctionne sur Windows)
const newGlob = `  async glob(args) {
    const { pattern, path: searchPath = 'E:/ANA' } = args;
    console.log(\`🔧 [ToolAgent] glob: "\${pattern}" in "\${searchPath}"\`);
    const fs = require('fs');
    const pathModule = require('path');

    function globToRegex(glob) {
      const escaped = glob
        .replace(/[.+^${}()|[\\]\\\\]/g, '\\\\$&')
        .replace(/\\*/g, '.*')
        .replace(/\\?/g, '.');
      return new RegExp(escaped, 'i');
    }

    function walkDir(dir, regex, results = [], depth = 0) {
      if (depth > 10 || results.length >= 50) return results;
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
      } catch (e) { }
      return results;
    }

    try {
      const normalizedPath = searchPath.replace(/\\\\/g, '/');
      if (!fs.existsSync(normalizedPath)) {
        return { success: false, error: \`Dossier non trouvé: \${normalizedPath}\`, files: [] };
      }
      const regex = globToRegex(pattern);
      const files = walkDir(normalizedPath, regex);
      return { success: true, files, count: files.length, pattern, searchPath: normalizedPath };
    } catch (err) {
      return { success: false, error: err.message, files: [] };
    }
  },`;

// Nouveau grep (Node.js natif)
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
            matches.push(\`\${filePath.replace(/\\\\/g, '/')}:\${idx + 1}:\${line.substring(0, 200)}\`);
          }
        });
      } catch (e) { }
    }

    function walkDir(dir, depth = 0) {
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
      } catch (e) { }
    }

    try {
      const normalizedPath = searchPath.replace(/\\\\/g, '/');
      const stat = fs.statSync(normalizedPath);
      if (stat.isFile()) {
        searchFile(normalizedPath);
      } else {
        walkDir(normalizedPath);
      }
      return { success: true, matches, count: matches.length };
    } catch (err) {
      return { success: false, error: err.message, matches: [] };
    }
  },`;

// Remplacer glob
const oldGlobRegex = /async glob\(args\)[\s\S]*?return \{ success: false, error: err\.message, files: \[\] \};\s*\}\s*\},/;
content = content.replace(oldGlobRegex, newGlob);

// Remplacer grep
const oldGrepRegex = /async grep\(args\)[\s\S]*?return \{ success: false, error: err\.message, matches: \[\] \};\s*\}\s*\},/;
content = content.replace(oldGrepRegex, newGrep);

fs.writeFileSync(file, content);
console.log('✅ glob et grep corrigés dans backup');
