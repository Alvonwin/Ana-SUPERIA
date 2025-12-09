/**
 * Script pour ajouter les endpoints Coding Agent à ana-core.cjs
 * Exécuter: node add-coding-agent-endpoints.cjs
 */

const fs = require('fs');
const path = require('path');

const anaCorePath = path.join(__dirname, '..', 'ana-core.cjs');

// Lire le fichier
let content = fs.readFileSync(anaCorePath, 'utf8');

// Vérifier si déjà présent
if (content.includes('/api/agent/code')) {
  console.log('ℹ️ Endpoints Coding Agent déjà présents');
  process.exit(0);
}

// Trouver la position après la section tiered memory
const marker = '// ================== ORCHESTRATOR V2 API ==================';
const insertPosition = content.indexOf(marker);

if (insertPosition === -1) {
  console.log('❌ Marker ORCHESTRATOR V2 non trouvé');
  process.exit(1);
}

// Code à insérer
const codingAgentEndpoints = `
// ================== CODING AGENT API ==================

// Run coding agent task
app.post('/api/agent/code/run', async (req, res) => {
  const { task, context, dryRun } = req.body;

  if (!task) {
    return res.status(400).json({
      success: false,
      error: 'Task description required'
    });
  }

  try {
    console.log('🤖 [API] Coding Agent task:', task.substring(0, 100));

    const agent = new CodingAgent({ dryRun: dryRun || false });
    const result = await agent.run(task, context || {});

    res.json(result);
  } catch (error) {
    console.error('❌ [API] Coding Agent error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get coding agent available tools
app.get('/api/agent/code/tools', (req, res) => {
  try {
    const { CODING_TOOLS } = require('./agents/coding-agent.cjs');
    res.json({
      success: true,
      tools: CODING_TOOLS.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters
      })),
      count: CODING_TOOLS.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

`;

// Insérer avant ORCHESTRATOR V2
content = content.slice(0, insertPosition) + codingAgentEndpoints + content.slice(insertPosition);

// Sauvegarder
fs.writeFileSync(anaCorePath, content, 'utf8');
console.log('✅ Endpoints Coding Agent API ajoutés');
