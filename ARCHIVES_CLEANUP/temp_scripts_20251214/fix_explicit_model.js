const fs = require('fs');
const path = 'E:/ANA/server/ana-core.cjs';

// Backup
const backup = path + '.backup_explicit_model_' + Date.now();
fs.copyFileSync(path, backup);
console.log('Backup:', backup);

let content = fs.readFileSync(path, 'utf8');

// Le pattern à chercher - on cherche l'extraction des params et le routing
const oldCode = `app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message requis' });
  }

  try {
    // 1. Choose best LLM
    const { model, reason } = router.classifyTask(message, context || {});`;

const newCode = `app.post('/api/chat', async (req, res) => {
  const { message, context, model: requestedModel } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message requis' });
  }

  try {
    // 1. Choose best LLM - RESPECT explicit model from request if provided
    let model, reason;
    if (requestedModel) {
      // User/test explicitly requested a model - use it directly
      model = requestedModel;
      reason = 'Modele explicite: ' + requestedModel;
      console.log('[EXPLICIT MODEL] Using requested model:', model);
    } else {
      // Auto-routing based on message content
      const routing = router.classifyTask(message, context || {});
      model = routing.model;
      reason = routing.reason;
    }`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(path, content, 'utf8');
  console.log('SUCCESS: Explicit model support added to /api/chat');
} else {
  // Essayer de trouver avec regex plus flexible
  console.log('Pattern exact not found, trying regex...');

  // Chercher le pattern approximatif
  const regexPattern = /app\.post\('\/api\/chat',\s*async\s*\(req,\s*res\)\s*=>\s*\{\s*const\s*\{\s*message,\s*context\s*\}\s*=\s*req\.body;/;

  if (regexPattern.test(content)) {
    content = content.replace(regexPattern,
      `app.post('/api/chat', async (req, res) => {
  const { message, context, model: requestedModel } = req.body;`);

    // Chercher et remplacer aussi le routing
    const routingPattern = /\/\/ 1\. Choose best LLM\s*\n\s*const \{ model, reason \} = router\.classifyTask\(message, context \|\| \{\}\);/;

    if (routingPattern.test(content)) {
      content = content.replace(routingPattern,
        `// 1. Choose best LLM - RESPECT explicit model from request if provided
    let model, reason;
    if (requestedModel) {
      model = requestedModel;
      reason = 'Modele explicite: ' + requestedModel;
      console.log('[EXPLICIT MODEL] Using requested model:', model);
    } else {
      const routing = router.classifyTask(message, context || {});
      model = routing.model;
      reason = routing.reason;
    }`);

      fs.writeFileSync(path, content, 'utf8');
      console.log('SUCCESS: Explicit model support added via regex');
    } else {
      console.log('Routing pattern not found');
    }
  } else {
    console.log('API chat pattern not found - checking if already patched...');
    if (content.includes('requestedModel')) {
      console.log('Already patched!');
    }
  }
}
