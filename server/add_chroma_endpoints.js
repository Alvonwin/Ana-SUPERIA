const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace the existing /api/memory/search endpoint with ChromaDB semantic search
const oldEndpoint = `// Search memory
app.post('/api/memory/search', (req, res) => {
  const { query } = req.body;
  const context = memory.getContext();

  // Simple search for now (ChromaDB integration coming)
  const lines = context.split('\\n');
  const results = lines.filter(line =>
    line.toLowerCase().includes(query.toLowerCase())
  );

  res.json({
    query: query,
    results: results,
    count: results.length
  });
});`;

const newEndpoint = `// Search memory - ChromaDB Semantic Search
app.post('/api/memory/search', async (req, res) => {
  const { query, nResults = 5, where } = req.body;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter required'
    });
  }

  try {
    // Use ChromaDB semantic search
    const searchResults = await memoryManager.search(query, nResults, where);

    res.json({
      success: true,
      query: searchResults.query,
      results: searchResults.results,
      count: searchResults.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ChromaDB Memory Stats
app.get('/api/memory/semantic/stats', async (req, res) => {
  try {
    const stats = await memoryManager.getStats();
    res.json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});`;

content = content.replace(oldEndpoint, newEndpoint);

// Write the updated content
fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ ChromaDB API endpoints added successfully');
console.log('   - POST /api/memory/search (semantic search)');
console.log('   - GET /api/memory/semantic/stats');
