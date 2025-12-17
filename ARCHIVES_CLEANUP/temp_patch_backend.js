const fs = require('fs');
const path = 'E:/ANA/server/ana-core.cjs';

const content = fs.readFileSync(path, 'utf-8');

const searchMarker = '// VRAM Manager Stats\napp.get(\'/api/vram/stats\',';

const newEndpoints = `// ================== TIERED MEMORY API (3-Tier System) ==================

// Get tiered memory stats (all 3 tiers)
app.get('/api/memory/tiered/stats', async (req, res) => {
  try {
    if (!tieredMemory.initialized) {
      await tieredMemory.initialize();
    }

    const stats = tieredMemory.getStats();
    const secondaryCount = await tieredMemory.getCollectionCount(tieredMemory.secondaryCollection);
    const tertiaryCount = await tieredMemory.getCollectionCount(tieredMemory.tertiaryCollection);

    res.json({
      success: true,
      tiers: {
        primary: {
          count: tieredMemory.primary.exchanges.length,
          maxSize: tieredMemory.primary.maxSize,
          sessionStart: tieredMemory.primary.sessionStart,
          description: 'Memoire de session (RAM)'
        },
        secondary: {
          count: secondaryCount,
          description: 'Memoire recente (ChromaDB, 48h)'
        },
        tertiary: {
          count: tertiaryCount,
          description: 'Archives compressees (ChromaDB)'
        }
      },
      hits: stats.hits,
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

// Search across all 3 memory tiers
app.post('/api/memory/tiered/search', async (req, res) => {
  try {
    const { query, limit = 10, includePrimary = true, includeSecondary = true, includeTertiary = true } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query required' });
    }

    if (!tieredMemory.initialized) {
      await tieredMemory.initialize();
    }

    const results = await tieredMemory.search(query, {
      includePrimary,
      includeSecondary,
      includeTertiary,
      limit
    });

    res.json({
      success: true,
      query,
      results,
      count: results.length,
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

// Get primary memory (current session)
app.get('/api/memory/tiered/primary', (req, res) => {
  try {
    const context = tieredMemory.getPrimaryContext();
    const exchanges = tieredMemory.primary.exchanges;

    res.json({
      success: true,
      exchanges: exchanges.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        userMessage: e.userMessage,
        anaResponse: e.anaResponse?.substring(0, 500) + (e.anaResponse?.length > 500 ? '...' : ''),
        model: e.model
      })),
      count: exchanges.length,
      sessionStart: tieredMemory.primary.sessionStart,
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

// Run tiered memory maintenance
app.post('/api/memory/tiered/maintenance', async (req, res) => {
  try {
    if (!tieredMemory.initialized) {
      await tieredMemory.initialize();
    }

    const result = await tieredMemory.runMaintenance();

    res.json({
      success: true,
      ...result,
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

// VRAM Manager Stats
app.get('/api/vram/stats',`;

if (content.includes('// ================== TIERED MEMORY API')) {
  console.log('TIERED MEMORY API already exists - skipping');
  process.exit(0);
}

if (!content.includes(searchMarker)) {
  console.log('ERROR: Could not find VRAM Manager marker');
  process.exit(1);
}

const newContent = content.replace(searchMarker, newEndpoints);
fs.writeFileSync(path, newContent, 'utf-8');
console.log('SUCCESS: Tiered Memory API endpoints added to ana-core.cjs');
