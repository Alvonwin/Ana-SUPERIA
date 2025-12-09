import { useState, useEffect } from 'react';
import { IconPlay, IconSquare, IconRefreshCw, IconDownload, IconUpload, IconZap } from '../components/Icons';
import { toast, Toaster } from 'sonner';
import './n8nPage.css';

// Proxy via backend Ana pour éviter CORS
const N8N_URL = 'http://localhost:3338/api/n8n'; // Proxy vers n8n:5678

function N8nPage() {
  const [workflows, setWorkflows] = useState([]);
  const [activeWorkflows, setActiveWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkN8nConnection();
    loadWorkflows();
    loadExecutions();

    const interval = setInterval(() => {
      loadExecutions();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Check if n8n is running via proxy
  const checkN8nConnection = async () => {
    console.log('[n8n] checkN8nConnection start');
    try {
      const response = await fetch(`${N8N_URL}/rest/settings`);
      console.log('[n8n] settings status:', response.status);

      if (response.ok) {
        setIsConnected(true);
        toast.success('n8n connecté');
      } else {
        console.log('[n8n] response not ok:', response.status);
        setIsConnected(false);
        toast.error(`n8n erreur: ${response.status}`);
      }
    } catch (error) {
      console.error('[n8n] fetch error:', error);
      setIsConnected(false);
      toast.error('n8n non disponible. Vérifie que n8n tourne sur port 5678');
    }
  };

  // Source: https://community.n8n.io/t/react-integration-do-we-have-any-integration-document-or-sample-app-available-for-react-n8n/10228
  const loadWorkflows = async () => {
    console.log('[n8n] loadWorkflows start');
    try {
      const response = await fetch(`${N8N_URL}/rest/workflows`);
      console.log('[n8n] workflows status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[n8n] workflows data:', data);
        setWorkflows(data.data || []);
        setActiveWorkflows(data.data?.filter(w => w.active) || []);
      }
    } catch (error) {
      console.error('[n8n] Error loading workflows:', error);
    }
  };

  const loadExecutions = async () => {
    console.log('[n8n] loadExecutions start');
    try {
      const response = await fetch(`${N8N_URL}/rest/executions?limit=10`);
      console.log('[n8n] executions status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[n8n] executions data:', data);
        setExecutions(data.data || []);
      }
    } catch (error) {
      console.error('[n8n] Error loading executions:', error);
    }
  };

  const triggerWorkflow = async (workflowId) => {
    toast.loading('Lancement workflow...', { id: 'trigger' });
    try {
      const response = await fetch(`${N8N_URL}/rest/workflows/${workflowId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast.success('Workflow lancé !', { id: 'trigger' });
        loadWorkflows();
      } else {
        toast.error('Erreur lancement workflow', { id: 'trigger' });
      }
    } catch (error) {
      toast.error('Erreur: ' + error.message, { id: 'trigger' });
    }
  };

  const stopWorkflow = async (workflowId) => {
    try {
      const response = await fetch(`${N8N_URL}/rest/workflows/${workflowId}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast.success('Workflow arrêté');
        loadWorkflows();
      }
    } catch (error) {
      toast.error('Erreur arrêt workflow');
    }
  };

  // Import workflow from JSON file
  const importWorkflow = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const workflow = JSON.parse(text);

      const response = await fetch(`${N8N_URL}/rest/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      });

      if (response.ok) {
        toast.success(`Workflow "${workflow.name}" importé`);
        loadWorkflows();
      }
    } catch (error) {
      toast.error('Erreur import: ' + error.message);
    }
  };

  const openN8nEditor = () => {
    // Ouvrir n8n directement (pas le proxy)
    window.open('http://localhost:5678', '_blank');
    toast.success('Ouverture n8n dans nouvel onglet');
  };

  return (
    <div className="n8n-page">
      <Toaster richColors position="top-right" />

      <div className="n8n-header">
        <div>
          <h2>⚡ n8n - Automation Workflows</h2>
          <p className="subtitle">Automatise Ana avec 400+ intégrations</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={openN8nEditor}>
            <IconZap size={18} />
            Ouvrir n8n Editor
          </button>
          <label className="btn-secondary">
            <IconUpload size={18} />
            Importer Workflow
            <input
              type="file"
              accept=".json"
              onChange={importWorkflow}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="n8n-content">
        {/* Connection Status */}
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot"></div>
          {isConnected ? 'Connecté à n8n' : 'n8n non disponible'}
        </div>

        {/* Workflows Grid */}
        <div className="workflows-section">
          <h3>📋 Workflows ({workflows.length})</h3>
          <div className="workflows-grid">
            {!isConnected ? (
              <div className="empty-state empty-state-warning">
                <h4>⚠️ n8n non connecté</h4>
                <p>Lance n8n pour voir tes workflows d'automatisation.</p>
                <div className="empty-state-instructions">
                  <p><strong>Pour démarrer n8n:</strong></p>
                  <code>npx n8n start</code>
                  <p>ou via Docker:</p>
                  <code>docker run -p 5678:5678 n8nio/n8n</code>
                </div>
                <button className="btn-primary" onClick={checkN8nConnection}>
                  🔄 Réessayer la connexion
                </button>
              </div>
            ) : workflows.length === 0 ? (
              <div className="empty-state">
                <h4>📂 Aucun workflow</h4>
                <p>Crée ton premier workflow dans l'éditeur n8n ou importe un fichier JSON.</p>
                <div className="empty-state-actions">
                  <button className="btn-primary" onClick={openN8nEditor}>
                    ✨ Créer dans l'éditeur
                  </button>
                </div>
              </div>
            ) : (
              workflows.map((workflow) => (
                <div key={workflow.id} className="workflow-card">
                  <div className="workflow-header">
                    <h4>{workflow.name}</h4>
                    <span className={`status-badge ${workflow.active ? 'active' : 'inactive'}`}>
                      {workflow.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="workflow-info">
                    <span>{workflow.nodes?.length || 0} nodes</span>
                    <span>Modifié: {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="workflow-actions">
                    {workflow.active ? (
                      <button className="btn-stop" onClick={() => stopWorkflow(workflow.id)}>
                        <IconSquare size={16} />
                        Arrêter
                      </button>
                    ) : (
                      <button className="btn-start" onClick={() => triggerWorkflow(workflow.id)}>
                        <IconPlay size={16} />
                        Activer
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Executions */}
        <div className="executions-section">
          <h3>🔄 Exécutions Récentes</h3>
          <div className="executions-list">
            {executions.length === 0 ? (
              <div className="empty-state">
                <p>Aucune exécution récente</p>
              </div>
            ) : (
              executions.map((exec) => (
                <div key={exec.id} className="execution-item">
                  <div className={`exec-status ${exec.finished ? 'success' : 'running'}`}>
                    {exec.finished ? '✓' : '⏳'}
                  </div>
                  <div className="exec-info">
                    <strong>{exec.workflowData?.name || 'Workflow'}</strong>
                    <span className="exec-time">
                      {new Date(exec.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="exec-duration">
                    {exec.finished && exec.stoppedAt
                      ? `${Math.round((new Date(exec.stoppedAt) - new Date(exec.startedAt)) / 1000)}s`
                      : 'En cours...'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Templates */}
        <div className="templates-section">
          <h3>📦 Templates Rapides</h3>
          <div className="templates-grid">
            <div className="template-card">
              <h4>🤖 Agents Monitor</h4>
              <p>Surveillance continue des 17 agents Ana</p>
              <button className="btn-template">Installer</button>
            </div>
            <div className="template-card">
              <h4>📧 Email Alerts</h4>
              <p>Notifications par email sur événements critiques</p>
              <button className="btn-template">Installer</button>
            </div>
            <div className="template-card">
              <h4>💾 Backup Auto</h4>
              <p>Sauvegarde automatique de la mémoire Ana</p>
              <button className="btn-template">Installer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default N8nPage;
