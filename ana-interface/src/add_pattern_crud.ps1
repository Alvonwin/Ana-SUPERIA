$file = 'E:/ANA/server/ana-core.cjs'
$content = Get-Content $file -Raw -Encoding UTF8

$newEndpoints = @'

// POST /api/patterns - Add a new pattern
app.post('/api/patterns', async (req, res) => {
  try {
    const { type, pattern } = req.body; // type: 'codePatterns', 'errorPatterns', 'avoid'
    if (!type || !pattern) {
      return res.status(400).json({ success: false, error: 'type and pattern required' });
    }
    const patternsPath = path.join('E:', 'ANA', 'knowledge', 'learned', 'patterns.json');
    const data = JSON.parse(await fs.promises.readFile(patternsPath, 'utf-8'));
    if (!data[type]) data[type] = [];
    data[type].push(pattern);
    data.lastUpdated = new Date().toISOString();
    await fs.promises.writeFile(patternsPath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true, message: 'Pattern added', count: data[type].length });
  } catch (error) {
    console.error('[API] POST /api/patterns error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/patterns - Update a pattern
app.put('/api/patterns', async (req, res) => {
  try {
    const { type, index, pattern } = req.body;
    if (!type || index === undefined || !pattern) {
      return res.status(400).json({ success: false, error: 'type, index and pattern required' });
    }
    const patternsPath = path.join('E:', 'ANA', 'knowledge', 'learned', 'patterns.json');
    const data = JSON.parse(await fs.promises.readFile(patternsPath, 'utf-8'));
    if (!data[type] || !data[type][index]) {
      return res.status(404).json({ success: false, error: 'Pattern not found' });
    }
    data[type][index] = pattern;
    data.lastUpdated = new Date().toISOString();
    await fs.promises.writeFile(patternsPath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true, message: 'Pattern updated' });
  } catch (error) {
    console.error('[API] PUT /api/patterns error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/patterns - Delete a pattern
app.delete('/api/patterns', async (req, res) => {
  try {
    const { type, index } = req.body;
    if (!type || index === undefined) {
      return res.status(400).json({ success: false, error: 'type and index required' });
    }
    const patternsPath = path.join('E:', 'ANA', 'knowledge', 'learned', 'patterns.json');
    const data = JSON.parse(await fs.promises.readFile(patternsPath, 'utf-8'));
    if (!data[type] || !data[type][index]) {
      return res.status(404).json({ success: false, error: 'Pattern not found' });
    }
    data[type].splice(index, 1);
    data.lastUpdated = new Date().toISOString();
    await fs.promises.writeFile(patternsPath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true, message: 'Pattern deleted', count: data[type].length });
  } catch (error) {
    console.error('[API] DELETE /api/patterns error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Extract skills from conversation
'@

$content = $content -replace '// Extract skills from conversation', $newEndpoints
Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host 'CRUD endpoints added successfully'
