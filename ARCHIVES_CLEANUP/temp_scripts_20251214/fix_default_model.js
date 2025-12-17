/**
 * Changer DEFAULT_MODEL vers GLM-4-32B
 */
const fs = require('fs');

const file = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(file, 'utf8');

const old = "const DEFAULT_MODEL = 'qwen2.5-coder:7b';";
const replacement = "const DEFAULT_MODEL = 'mychen76/GLM-4-32B-cline-roocode:Q4';  // GLM-4 pour parité Claude Code";

if (content.includes(old)) {
  content = content.replace(old, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('[MODEL] Changed DEFAULT_MODEL to GLM-4-32B');
} else {
  console.log('[MODEL] Pattern not found');
}
