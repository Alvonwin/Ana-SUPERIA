import { useState, useEffect } from 'react';
import { IconSettings, IconMoon, IconSun, IconVolume2, IconBrain, IconBell, IconSave, IconRotateCcw, IconPower } from '../components/Icons';
import './SettingsPage.css';

// Default settings (same as backend)
const DEFAULT_SETTINGS = {
  theme: 'dark',
  ttsEnabled: true,
  ttsVoice: '',
  defaultLLM: 'auto',
  notifications: true,
  autoScroll: true,
  streamingEnabled: true
};

// API Base URL
const API_BASE = 'http://localhost:3338';

function SettingsPage() {
  // Single unified settings state (Fix #6 - 30-Nov-2025)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Available voices for TTS
  const [availableVoices, setAvailableVoices] = useState([]);

  // Shutdown state
  const [shutdownConfirm, setShutdownConfirm] = useState(false);
  const [shuttingDown, setShuttingDown] = useState(false);
  const [restarting, setRestarting] = useState(false);

  // Tunnel URLs state - 07 Dec 2025
  const [tunnelUrls, setTunnelUrls] = useState({ frontend: null, backend: null, generated: null });
  const [copied, setCopied] = useState(false);

  // Load settings from API on mount
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/settings`);

        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          // Cache to localStorage as fallback
          localStorage.setItem('ana_settings_cache', JSON.stringify(data));
        } else {
          throw new Error(`API returned ${response.status}`);
        }
      } catch (err) {
        console.warn('[SettingsPage] API unavailable, using localStorage fallback:', err.message);
        // Fallback to localStorage cache
        const cached = localStorage.getItem('ana_settings_cache');
        if (cached) {
          try {
            setSettings(JSON.parse(cached));
          } catch {
            setSettings(DEFAULT_SETTINGS);
          }
        }
        setError('Mode hors-ligne: paramètres locaux utilisés');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Load tunnel URLs on mount - 07 Dec 2025
  useEffect(() => {
    const loadTunnelUrls = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/tunnel-urls`);
        if (response.ok) {
          const data = await response.json();
          setTunnelUrls(data);
        }
      } catch (err) {
        console.warn('[SettingsPage] Tunnel URLs unavailable:', err.message);
      }
    };
    loadTunnelUrls();
    const interval = setInterval(loadTunnelUrls, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load available TTS voices
  useEffect(() => {
    const loadVoices = () => {
      if (!window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
      setAvailableVoices(frenchVoices.length > 0 ? frenchVoices : voices.slice(0, 10));
    };

    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Update a single setting
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Copy URL to clipboard - 07 Dec 2025
  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Save settings to API
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        // Update localStorage cache
        localStorage.setItem('ana_settings_cache', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `API returned ${response.status}`);
      }
    } catch (err) {
      console.error('[SettingsPage] Save error:', err.message);
      // Fallback: save to localStorage only
      localStorage.setItem('ana_settings_cache', JSON.stringify(settings));
      setError('Sauvegardé localement (serveur inaccessible)');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (confirm('Réinitialiser tous les paramètres par défaut?')) {
      setSettings(DEFAULT_SETTINGS);

      // Also save reset to API
      try {
        await fetch(`${API_BASE}/api/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(DEFAULT_SETTINGS)
        });
        localStorage.setItem('ana_settings_cache', JSON.stringify(DEFAULT_SETTINGS));
      } catch (err) {
        console.warn('[SettingsPage] Reset save error:', err.message);
        localStorage.setItem('ana_settings_cache', JSON.stringify(DEFAULT_SETTINGS));
      }
    }
  };

  // Shutdown Ana - 07 Dec 2025
  const handleShutdown = async () => {
    if (!shutdownConfirm) {
      // Premier clic: demander confirmation
      setShutdownConfirm(true);
      // Reset après 5 secondes si pas de confirmation
      setTimeout(() => setShutdownConfirm(false), 5000);
      return;
    }

    // Deuxième clic: confirmer et fermer
    setShuttingDown(true);
    try {
      await fetch(`${API_BASE}/api/shutdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      // Le serveur va se fermer, on ne peut plus rien faire
    } catch (err) {
      // Erreur attendue car le serveur se ferme
      console.log('[SettingsPage] Shutdown initiated');
    }
  };

  const cancelShutdown = () => {
    setShutdownConfirm(false);
  };

    // Restart Ana - 16 Dec 2025
  const handleRestart = async () => {
    setRestarting(true);
    try {
      await fetch(`${API_BASE}/api/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.log('[SettingsPage] Restart initiated');
    }
  };

  const llmOptions = [
    { value: 'auto', label: 'Automatique (recommandé)', desc: 'Ana choisit le meilleur LLM' },
    { value: 'phi3', label: 'Phi-3 Mini', desc: 'Conversation rapide' },
    { value: 'deepseek', label: 'DeepSeek-Coder', desc: 'Code et programmation' },
    
    { value: 'llama_vision', label: 'Llama Vision', desc: 'Images et vision' },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-header">
          <IconSettings size={32} />
          <div>
            <h1>Paramètres</h1>
            <p className="subtitle">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <IconSettings size={32} />
        <div>
          <h1>Paramètres</h1>
          <p className="subtitle">Configuration de Ana SUPERIA</p>
        </div>
      </div>

      {/* Error/warning banner */}
      {error && (
        <div className="settings-warning">
          {error}
        </div>
      )}

      <div className="settings-content">
        {/* Remote Access - Tunnel URLs - 07 Dec 2025 */}
        {tunnelUrls.frontend && (
          <section className="settings-section tunnel-section">
            <h2>Acces Distant (Mobile)</h2>
            <p className="tunnel-info">Utilisez cette URL sur votre telephone pour acceder a Ana:</p>
            <div className="tunnel-url-box">
              <code>{tunnelUrls.frontend}</code>
              <button
                className="btn-copy"
                onClick={() => copyToClipboard(tunnelUrls.frontend)}
              >
                {copied ? "Copie!" : "Copier"}
              </button>
            </div>
            {tunnelUrls.generated && (
              <p className="tunnel-generated">Genere le: {tunnelUrls.generated}</p>
            )}
          </section>
        )}

        {/* Appearance */}
        <section className="settings-section">
          <h2><IconSun size={20} /> Apparence</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label>Thème</label>
              <span className="setting-desc">Choisir le mode d'affichage</span>
            </div>
            <div className="setting-control">
              <button
                className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
                onClick={() => updateSetting('theme', 'light')}
              >
                <IconSun size={16} /> Clair
              </button>
              <button
                className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                onClick={() => updateSetting('theme', 'dark')}
              >
                <IconMoon size={16} /> Sombre
              </button>
            </div>
          </div>
        </section>

        {/* Voice */}
        <section className="settings-section">
          <h2><IconVolume2 size={20} /> Voix & Audio</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label>Synthèse vocale (TTS)</label>
              <span className="setting-desc">Ana lit ses réponses à voix haute</span>
            </div>
            <div className="setting-control">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.ttsEnabled}
                  onChange={(e) => updateSetting('ttsEnabled', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {settings.ttsEnabled && (
            <div className="setting-item">
              <div className="setting-info">
                <label>Voix TTS</label>
                <span className="setting-desc">Sélectionner la voix de synthèse</span>
              </div>
              <div className="setting-control">
                <select
                  value={settings.ttsVoice}
                  onChange={(e) => updateSetting('ttsVoice', e.target.value)}
                >
                  <option value="">Voix par défaut</option>
                  {availableVoices.map((voice, i) => (
                    <option key={i} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* LLM */}
        <section className="settings-section">
          <h2><IconBrain size={20} /> Intelligence (LLM)</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label>Modèle par défaut</label>
              <span className="setting-desc">LLM utilisé pour les requêtes</span>
            </div>
            <div className="setting-control">
              <select
                value={settings.defaultLLM}
                onChange={(e) => updateSetting('defaultLLM', e.target.value)}
              >
                {llmOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label>Streaming</label>
              <span className="setting-desc">Afficher les réponses en temps réel</span>
            </div>
            <div className="setting-control">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.streamingEnabled}
                  onChange={(e) => updateSetting('streamingEnabled', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="settings-section">
          <h2><IconBell size={20} /> Notifications</h2>

          <div className="setting-item">
            <div className="setting-info">
              <label>Notifications système</label>
              <span className="setting-desc">Alertes et messages importants</span>
            </div>
            <div className="setting-control">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => updateSetting('notifications', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label>Auto-scroll</label>
              <span className="setting-desc">Défiler automatiquement vers les nouveaux messages</span>
            </div>
            <div className="setting-control">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.autoScroll}
                  onChange={(e) => updateSetting('autoScroll', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="settings-actions">
          <button className="btn-reset" onClick={handleReset}>
            <IconRotateCcw size={16} /> Réinitialiser
          </button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            <IconSave size={16} /> {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé!' : 'Sauvegarder'}
          </button>
        </div>

        {/* Info */}
        <div className="settings-info-box">
          <p>Les paramètres sont synchronisés avec le serveur Ana et mis en cache localement.</p>
          <p><strong>Version:</strong> Ana SUPERIA v1.0.0</p>
        </div>

        {/* Danger Zone - Shutdown */}
        <div className="danger-zone">
          <h3><IconPower size={20} /> Zone Système</h3>
          <p>Arrêter proprement tous les processus Ana (Backend, ChromaDB, Tunnels, Agents).</p>

          {shuttingDown || restarting ? (
            <div className="shutdown-message">
              <span className="spinner"></span> {restarting ? 'Ana redémarre...' : "Ana s'arrête..."} Veuillez patienter.
            </div>
          ) : (
            <div className="shutdown-actions">
              <button
                className="btn-restart"
                onClick={handleRestart}
                disabled={shuttingDown || restarting}
              >
                <IconRotateCcw size={16} />
                Redémarrer Ana
              </button>
              <button
                className={`btn-shutdown ${shutdownConfirm ? 'confirming' : ''}`}
                onClick={handleShutdown}
                disabled={shuttingDown || restarting}
              >
                <IconPower size={16} />
                {shutdownConfirm ? 'Confirmer l\'arrêt' : 'Fermer Ana'}
              </button>
              {shutdownConfirm && (
                <button className="btn-cancel" onClick={cancelShutdown}>
                  Annuler
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
