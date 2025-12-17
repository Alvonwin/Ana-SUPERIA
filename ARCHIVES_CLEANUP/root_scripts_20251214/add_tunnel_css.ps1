# Add tunnel section CSS to SettingsPage.css
$file = "E:\ANA\ana-interface\src\pages\SettingsPage.css"
$content = Get-Content $file -Raw -Encoding UTF8

$tunnelCss = @"

/* Tunnel URLs Section */
.tunnel-section {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid #4a90d9;
}

.tunnel-info {
  color: var(--text-secondary, #888);
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.tunnel-url-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-color, #333);
}

.tunnel-url-box code {
  flex: 1;
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  color: #4ecdc4;
  word-break: break-all;
}

.btn-copy {
  padding: 0.4rem 0.8rem;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.2s;
}

.btn-copy:hover {
  background: #357abd;
}

.tunnel-generated {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary, #666);
}
"@

$content = $content + $tunnelCss
Set-Content $file -Value $content -Encoding UTF8 -NoNewline
Write-Host "CSS tunnel ajoute a SettingsPage.css" -ForegroundColor Green
