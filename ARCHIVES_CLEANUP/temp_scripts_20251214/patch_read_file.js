const fs = require('fs');
const path = 'E:/ANA/server/ana-core.cjs';

let content = fs.readFileSync(path, 'utf8');

// Chercher le bloc à remplacer
const oldCode = `const result = await TOOL_IMPLEMENTATIONS[toolName]({});`;

const newCode = `// Extraire les paramètres selon l'outil
                  let params = {};
                  // Pour read_file: extraire le chemin après "lire" ou "pour"
                  if (toolName === 'read_file') {
                    const pathMatch = expertQuery.match(/(?:lire|pour)\s+([A-Za-z]:[\\/][^\s]+|\/[^\s]+)/i);
                    if (pathMatch) {
                      params.path = pathMatch[1].replace(/\\/g, '/');
                      console.log(\`📂 [SOCKET-CONSCIOUSNESS] read_file path: \${params.path}\`);
                    }
                  }
                  // Pour list_files: extraire le dossier
                  else if (toolName === 'list_files') {
                    const pathMatch = expertQuery.match(/(?:lister|dans)\s+([A-Za-z]:[\\/][^\s]+|\/[^\s]+)/i);
                    if (pathMatch) {
                      params.directory = pathMatch[1].replace(/\\/g, '/');
                    }
                  }
                  // Pour ping: extraire l'hôte
                  else if (toolName === 'ping') {
                    const hostMatch = expertQuery.match(/(?:ping|tester)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                    if (hostMatch) {
                      params.host = hostMatch[1];
                    }
                  }
                  // Pour generate_password: extraire la longueur
                  else if (toolName === 'generate_password') {
                    const lengthMatch = expertQuery.match(/(\d+)\s*(?:caractères|chars|length)/i);
                    if (lengthMatch) {
                      params.length = parseInt(lengthMatch[1]);
                    }
                  }
                  const result = await TOOL_IMPLEMENTATIONS[toolName](params);`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(path, content);
  console.log('PATCH APPLIED: read_file now extracts path parameter');
} else {
  console.log('ERROR: Old code not found. Already patched?');
}
