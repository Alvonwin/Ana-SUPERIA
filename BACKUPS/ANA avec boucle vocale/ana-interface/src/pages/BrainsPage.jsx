import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import './BrainsPage.css';

const API_URL = 'http://localhost:3338';

function BrainsPage() {
  const [brains, setBrains] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBrain, setSelectedBrain] = useState(null);
  const [testMessage, setTestMessage] = useState('Bonjour! Comment ca va?');
  const [testResponse, setTestResponse] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchBrains();
  }, []);

  const fetchBrains = async () => {
    try {
      const response = await fetch(`${API_URL}/api/brains/status`);
      const data = await response.json();
      if (data.success) {
        setBrains(data.brains);
      }
    } catch (error) {
      toast.error('Erreur de connexion au backend');
    } finally {
      setLoading(false);
    }
  };

  const testBrain = async (provider, model) => {
    setTesting(true);
    setTestResponse(null);

    try {
      let endpoint;
      let body;

      if (provider === 'ollama') {
        endpoint = `${API_URL}/api/chat`;
        body = { message: testMessage };
      } else if (provider === 'groq') {
        endpoint = `${API_URL}/api/groq/chat`;
        body = { message: testMessage, model };
      } else if (provider === 'cerebras') {
        endpoint = `${API_URL}/api/cerebras/chat`;
        body = { message: testMessage, model };
      }

      const startTime = Date.now();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (data.success || data.response) {
        setTestResponse({
          text: data.response,
          latency,
          model: data.model || model,
          provider
        });
        toast.success(`Reponse en ${latency}ms!`);
      } else {
        toast.error(data.error || 'Erreur de test');
      }
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'ollama': return '🦙';
      case 'groq': return '🚀';
      case 'cerebras': return '⚡';
      default: return '🧠';
    }
  };

  const getProviderColor = (provider) => {
    switch (provider) {
      case 'ollama': return '#8b5cf6';
      case 'groq': return '#f97316';
      case 'cerebras': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="brains-page">
        <div className="loading">Chargement des cerveaux...</div>
      </div>
    );
  }

  return (
    <div className="brains-page">
      <header className="brains-header">
        <h1>🧠 Cerveaux Ana</h1>
        <p>12 modeles IA disponibles - Local + Cloud</p>
        <button className="refresh-btn" onClick={fetchBrains}>
          Rafraichir
        </button>
      </header>

      <div className="brains-grid">
        {brains && Object.entries(brains).map(([provider, info]) => (
          <div
            key={provider}
            className={`brain-card ${info.status === 'online' ? 'online' : 'offline'}`}
            style={{ '--provider-color': getProviderColor(provider) }}
          >
            <div className="brain-header">
              <span className="brain-icon">{getProviderIcon(provider)}</span>
              <div className="brain-info">
                <h2>{provider.toUpperCase()}</h2>
                <span className={`status-badge ${info.status}`}>
                  {info.status === 'online' ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
              <span className="brain-type">{info.type}</span>
            </div>

            {info.speed && (
              <div className="brain-speed">
                Vitesse: {info.speed}
              </div>
            )}

            <div className="brain-models">
              <h3>Modeles ({info.models?.length || 0})</h3>
              <div className="models-list">
                {info.models?.map((model, idx) => (
                  <button
                    key={idx}
                    className={`model-chip ${selectedBrain?.model === model ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedBrain({ provider, model });
                      toast.info(`Modele selectionne: ${model}`);
                    }}
                    disabled={info.status !== 'online'}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>

            {info.status === 'online' && info.models?.length > 0 && (
              <button
                className="test-btn"
                onClick={() => testBrain(provider, info.models[0])}
                disabled={testing}
              >
                {testing ? 'Test en cours...' : 'Tester ce cerveau'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="test-section">
        <h2>Zone de Test</h2>
        <div className="test-input">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Message de test..."
          />
          {selectedBrain && (
            <button
              className="send-test-btn"
              onClick={() => testBrain(selectedBrain.provider, selectedBrain.model)}
              disabled={testing}
            >
              Envoyer a {selectedBrain.model}
            </button>
          )}
        </div>

        {testResponse && (
          <div className="test-response">
            <div className="response-header">
              <span>{getProviderIcon(testResponse.provider)} {testResponse.model}</span>
              <span className="latency">{testResponse.latency}ms</span>
            </div>
            <div className="response-text">
              {testResponse.text}
            </div>
          </div>
        )}
      </div>

      <div className="brains-summary">
        <h2>Resume</h2>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-value">
              {brains ? Object.values(brains).reduce((acc, b) => acc + (b.models?.length || 0), 0) : 0}
            </span>
            <span className="stat-label">Modeles Total</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {brains ? Object.values(brains).filter(b => b.status === 'online').length : 0}
            </span>
            <span className="stat-label">Providers Actifs</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {brains ? Object.values(brains).filter(b => b.type === 'local').length : 0}
            </span>
            <span className="stat-label">Local</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {brains ? Object.values(brains).filter(b => b.type === 'cloud').length : 0}
            </span>
            <span className="stat-label">Cloud</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrainsPage;
