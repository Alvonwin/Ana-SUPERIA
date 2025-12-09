# Add tunnel URLs section to SettingsPage.jsx
$file = "E:\ANA\ana-interface\src\pages\SettingsPage.jsx"
$content = Get-Content $file -Raw -Encoding UTF8

# 1. Add state for tunnel URLs after shutdownConfirm state
$stateSearch = "const [shuttingDown, setShuttingDown] = useState(false);"
$stateNew = @"
const [shuttingDown, setShuttingDown] = useState(false);

  // Tunnel URLs state
  const [tunnelUrls, setTunnelUrls] = useState({ frontend: null, backend: null, generated: null });
"@
$content = $content.Replace($stateSearch, $stateNew)

# 2. Add useEffect to fetch tunnel URLs after the theme useEffect
$effectSearch = "}, [settings.theme]);"
$effectNew = @"
}, [settings.theme]);

  // Fetch tunnel URLs
  useEffect(() => {
    const fetchTunnelUrls = async () => {
      try {
        const response = await fetch(`+"`"+`${API_BASE}/api/tunnel-urls`+"`"+`);
        if (response.ok) {
          const data = await response.json();
          setTunnelUrls(data);
        }
      } catch (err) {
        console.warn('[SettingsPage] Tunnel URLs unavailable:', err.message);
      }
    };
    fetchTunnelUrls();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTunnelUrls, 30000);
    return () => clearInterval(interval);
  }, []);
"@
$content = $content.Replace($effectSearch, $effectNew)

# 3. Add tunnel URLs section before danger-zone
$sectionSearch = "{/* Danger Zone - Shutdown */}"
$sectionNew = @"
{/* Remote Access URLs */}
        {tunnelUrls.frontend && (
          <section className="settings-section tunnel-section">
            <h2>Acces Distant (Mobile)</h2>
            <p className="tunnel-info">Utilisez cette URL sur votre telephone pour acceder a Ana:</p>
            <div className="tunnel-url-box">
              <code>{tunnelUrls.frontend}</code>
              <button
                className="btn-copy"
                onClick={() => navigator.clipboard.writeText(tunnelUrls.frontend)}
              >
                Copier
              </button>
            </div>
            {tunnelUrls.generated && (
              <p className="tunnel-generated">Genere: {tunnelUrls.generated}</p>
            )}
          </section>
        )}

        {/* Danger Zone - Shutdown */}
"@
$content = $content.Replace($sectionSearch, $sectionNew)

Set-Content $file -Value $content -Encoding UTF8 -NoNewline
Write-Host "Section tunnel URLs ajoutee a SettingsPage.jsx" -ForegroundColor Green
