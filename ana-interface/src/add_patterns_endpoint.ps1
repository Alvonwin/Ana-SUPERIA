$file = 'E:/ANA/server/ana-core.cjs'
$content = Get-Content $file -Raw -Encoding UTF8

$newEndpoint = @'

// GET /api/patterns/all - Get all learned patterns (good and bad)
app.get('/api/patterns/all', async (req, res) => {
  try {
    const patternsPath = path.join('E:', 'ANA', 'knowledge', 'learned', 'patterns.json');
    const data = await fs.promises.readFile(patternsPath, 'utf-8');
    const patterns = JSON.parse(data);
    res.json({
      success: true,
      codePatterns: patterns.codePatterns || [],
      errorPatterns: patterns.errorPatterns || [],
      avoid: patterns.avoid || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] GET /api/patterns/all error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Extract skills from conversation
'@

$content = $content -replace '// Extract skills from conversation', $newEndpoint
Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host 'Endpoint added successfully'
