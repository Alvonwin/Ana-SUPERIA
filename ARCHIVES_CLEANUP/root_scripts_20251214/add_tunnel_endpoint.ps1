# Add tunnel-urls endpoint to ana-core.cjs
$file = "E:\ANA\server\ana-core.cjs"
$content = Get-Content $file -Raw -Encoding UTF8

$search = "// ==================== SHUTDOWN ENDPOINT ===================="
$newCode = @"
// ==================== TUNNEL URLS ENDPOINT ====================
// Retourne les URLs Cloudflare pour l'acces distant - 07 Dec 2025
app.get('/api/tunnel-urls', (req, res) => {
  const fs = require('fs');
  const urlsPath = path.join(__dirname, 'tunnel_urls.json');

  try {
    if (fs.existsSync(urlsPath)) {
      const data = JSON.parse(fs.readFileSync(urlsPath, 'utf8'));
      res.json(data);
    } else {
      res.json({
        frontend: null,
        backend: null,
        generated: null,
        message: 'Tunnels pas encore demarres'
      });
    }
  } catch (err) {
    console.error('[TUNNEL-URLS] Erreur:', err.message);
    res.status(500).json({ error: 'Erreur lecture URLs' });
  }
});

// ==================== SHUTDOWN ENDPOINT ====================
"@

if ($content -match "TUNNEL URLS ENDPOINT") {
    Write-Host "Endpoint deja present" -ForegroundColor Yellow
} else {
    $content = $content.Replace($search, $newCode)
    Set-Content $file -Value $content -Encoding UTF8 -NoNewline
    Write-Host "Endpoint tunnel-urls ajoute" -ForegroundColor Green
}
