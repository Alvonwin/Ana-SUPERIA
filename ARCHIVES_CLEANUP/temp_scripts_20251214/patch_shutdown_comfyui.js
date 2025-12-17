const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Verifier si deja present
if (content.includes("'ComfyUI'")) {
  console.log('SKIP: ComfyUI deja dans shutdown');
  process.exit(0);
}

// Ajouter ComfyUI au shutdown
content = content.replace(
  "await killByPort(3336, 'Agents');",
  "await killByPort(3336, 'Agents');\n    await killByPort(8188, 'ComfyUI');"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('DONE: ComfyUI (port 8188) ajoute au shutdown');
