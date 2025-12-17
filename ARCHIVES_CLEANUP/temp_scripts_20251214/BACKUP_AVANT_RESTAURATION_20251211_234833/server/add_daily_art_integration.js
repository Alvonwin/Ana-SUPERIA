const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf-8');

// Add import after other services
const serviceImports = "const memoryCapture = require('./services/memory-capture.cjs');";
const newImport = serviceImports + "\nconst dailyArtGenerator = require('./services/daily-art-generator.cjs');";
content = content.replace(serviceImports, newImport);

// Add initialization in startServer function
const initMarker = "console.log('\\n✅ All validations passed\\n');";
const initCode = initMarker + `

  // Initialize Daily Art Generator
  console.log('🎨 Initializing Daily Art Generator...');
  dailyArtGenerator.initialize().then(result => {
    if (result.success) {
      console.log('✅ Daily Art Generator ready (8:00 AM schedule)');
    } else {
      console.error('⚠️ Daily Art Generator initialization failed');
    }
  });`;
content = content.replace(initMarker, initCode);

// Add API endpoints before "// ================== ANA TOOLS API"
const apiMarker = "// ================== ANA TOOLS API ==================";
const newEndpoints = `// ================== DAILY ART GENERATOR API ==================

// Get daily art generator status
app.get('/api/art/status', (req, res) => {
  try {
    const status = dailyArtGenerator.getStatus();
    res.json({
      success: true,
      ...status,
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

// Manually trigger art generation
app.post('/api/art/generate', async (req, res) => {
  try {
    console.log('🎨 Manual art generation requested');

    // Run generation asynchronously
    dailyArtGenerator.triggerManualGeneration().then(result => {
      console.log('Art generation result:', result);
    });

    res.json({
      success: true,
      message: 'Art generation started in background',
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

` + apiMarker;
content = content.replace(apiMarker, newEndpoints);

// Write updated file
fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ Daily Art Generator integrated successfully');
console.log('   - Import added');
console.log('   - Initialization added');
console.log('   - API endpoints added:');
console.log('     GET /api/art/status');
console.log('     POST /api/art/generate');