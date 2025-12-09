import { useState, useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import {
  IconActivity,
  IconCpu,
  IconDatabase,
  IconZap,
  IconCheckCircle,
  IconClock,
  IconRadio,
  IconDownload
} from '../components/Icons';
import './DashboardPage.css';

const DASHBOARD_URL = 'http://localhost:3338';

function DashboardPage() {
  const [stats, setStats] = useState({
    llm_usage: { phi3: 0, deepseek: 0, qwen: 0, llama_vision: 0 },
    memory: { sizeKB: 0, lines: 0 },
    active_model: null
  });

  const [events, setEvents] = useState([]);
  const [agentsData, setAgentsData] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchAgents();
    fetchEvents();

    const statsInterval = setInterval(fetchStats, 5000);
    const agentsInterval = setInterval(fetchAgents, 10000);
    const eventsInterval = setInterval(fetchEvents, 3000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(agentsInterval);
      clearInterval(eventsInterval);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3338/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      // Silently fail - backend may not be running
      console.log('Stats fetch failed - backend offline?');
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${DASHBOARD_URL}/api/agents`);
      if (response.ok) {
        const data = await response.json();
        setAgentsData(data);
      } else {
        // Endpoint not available - use default data
        setAgentsData({ count: 0, agents: {} });
      }
    } catch (error) {
      // Silently fail - endpoint may not exist yet
      console.log('Agents endpoint not available');
      setAgentsData({ count: 0, agents: {} });
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${DASHBOARD_URL}/api/events?limit=10`);
      if (response.ok) {
        const data = await response.json();
        if (data.events && data.events.length > 0) {
          setEvents(data.events.slice(0, 5));
        }
      }
    } catch (error) {
      // Silently fail - endpoint may not exist yet
      console.log('Events endpoint not available');
    }
  };

  // Parse agents data dynamically from API
  const getAgentsByDomain = (domain) => {
    if (!agentsData || !agentsData.agents) return [];

    const domainMap = {
      operations: ['memory_manager', 'system_monitor', 'alain_notifier'],
      cognitive: ['emotion_analyzer', 'learning_monitor', 'longterm_memory', 'truth_checker', 'assumption_detector', 'research_reminder', 'methodology_checker', 'action_monitor', 'strict_backup_enforcer'],
      knowledge: ['synthesis_engine', 'research', 'code_analyzer', 'doc_updater']
    };

    const agentNames = domainMap[domain] || [];
    return agentNames
      .map(name => agentsData.agents[name])
      .filter(agent => agent)
      .map(agent => ({
        name: agent.name || 'unknown',
        status: agent.status || 'UNKNOWN',
        uptime: formatUptime(agent.uptime || 0),
        checks: agent.checksCount || 0
      }));
  };

  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const operationsAgents = getAgentsByDomain('operations');
  const cognitiveAgents = getAgentsByDomain('cognitive');
  const knowledgeAgents = getAgentsByDomain('knowledge');

  const exportData = () => {
    toast.promise(
      async () => {
        // Combine tous les data pour export
        const exportData = {
          timestamp: new Date().toISOString(),
          stats,
          agents: agentsData,
          events
        };

        // Create JSON file and download (source: https://blog.logrocket.com/react-toast-libraries-compared-2025/)
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ana-dashboard-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return 'Export réussi';
      },
      {
        loading: 'Export en cours...',
        success: (data) => data,
        error: 'Erreur lors de l\'export'
      }
    );
  };

  const renderAgentCard = (agent) => (
    <div key={agent.name} className="agent-detail-card">
      <div className="agent-detail-header">
        <div className="agent-status-badge">RUNNING</div>
        <span className="agent-name">{agent.name}</span>
      </div>
      <div className="agent-stats">
        <div className="agent-stat">
          <IconClock size={12} />
          <span>{agent.uptime}</span>
        </div>
        <div className="agent-stat">
          <IconCheckCircle size={12} />
          <span>{agent.checks} checks</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <Toaster richColors position="top-right" />
      <div className="dashboard-header">
        <div>
          <h2>🎛️ Dashboard - Quartier Général Ana</h2>
          <p className="subtitle">Vue d'ensemble système en temps réel</p>
        </div>
        <button className="btn-export" onClick={exportData}>
          <IconDownload size={18} />
          Exporter données
        </button>
      </div>

      {/* System Status Row */}
      <div className="status-row">
        <div className="status-mini-card">
          <IconActivity size={20} className="card-icon" />
          <div>
            <div className="mini-label">Ana Core</div>
            <div className="mini-value running">Actif</div>
          </div>
        </div>

        <div className="status-mini-card">
          <IconCpu size={20} className="card-icon" />
          <div>
            <div className="mini-label">LLM Actif</div>
            <div className="mini-value">{stats.active_model || 'Aucun'}</div>
          </div>
        </div>

        <div className="status-mini-card">
          <IconDatabase size={20} className="card-icon" />
          <div>
            <div className="mini-label">Mémoire</div>
            <div className="mini-value">{stats.memory.sizeKB} KB</div>
          </div>
        </div>

        <div className="status-mini-card">
          <IconZap size={20} className="card-icon" />
          <div>
            <div className="mini-label">Agents Actifs</div>
            <div className="mini-value running">
              {agentsData ? `${agentsData.count}/${agentsData.count}` : 'Chargement...'}
            </div>
          </div>
        </div>
      </div>

      {/* Agents Sections */}
      <div className="agents-sections">
        {/* Operations Manager */}
        <div className="agent-section">
          <div className="section-header operations">
            <IconActivity size={18} />
            <h3>Operations Manager</h3>
            <span className="agent-count">{operationsAgents.length} agents</span>
          </div>
          <div className="agents-grid">
            {operationsAgents.map(renderAgentCard)}
          </div>
        </div>

        {/* Cognitive Manager */}
        <div className="agent-section">
          <div className="section-header cognitive">
            <IconCpu size={18} />
            <h3>Cognitive Manager</h3>
            <span className="agent-count">{cognitiveAgents.length} agents</span>
          </div>
          <div className="agents-grid">
            {cognitiveAgents.map(renderAgentCard)}
          </div>
        </div>

        {/* Knowledge Manager */}
        <div className="agent-section">
          <div className="section-header knowledge">
            <IconDatabase size={18} />
            <h3>Knowledge Manager</h3>
            <span className="agent-count">{knowledgeAgents.length} agents</span>
          </div>
          <div className="agents-grid">
            {knowledgeAgents.map(renderAgentCard)}
          </div>
        </div>

        {/* Event Bus */}
        <div className="agent-section">
          <div className="section-header events">
            <IconRadio size={18} />
            <h3>Event Bus</h3>
            <span className="agent-count">Derniers événements</span>
          </div>
          <div className="events-list">
            {events.length === 0 && (
              <div className="event-placeholder">En attente d'événements...</div>
            )}
            {events.map(event => (
              <div key={event.id} className="event-item">
                <span className="event-type">{event.type}</span>
                <span className="event-agent">{event.agent}</span>
                <span className="event-time">{event.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LLM Stats */}
      <div className="llm-stats-section">
        <h3>📊 Utilisation des LLMs</h3>
        <div className="llm-bars">
          <div className="llm-bar-item">
            <div className="llm-bar-header">
              <span>Phi-3 Mini (Conversation)</span>
              <span>{stats.llm_usage.phi3 || 0} requêtes</span>
            </div>
            <div className="llm-bar-track">
              <div className="llm-bar-fill phi3" style={{width: `${(stats.llm_usage.phi3 / 10) * 100}%`}}></div>
            </div>
          </div>

          <div className="llm-bar-item">
            <div className="llm-bar-header">
              <span>DeepSeek Coder (Coding)</span>
              <span>{stats.llm_usage.deepseek || 0} requêtes</span>
            </div>
            <div className="llm-bar-track">
              <div className="llm-bar-fill deepseek" style={{width: `${(stats.llm_usage.deepseek / 10) * 100}%`}}></div>
            </div>
          </div>

          <div className="llm-bar-item">
            <div className="llm-bar-header">
              <span>Qwen Coder (Math)</span>
              <span>{stats.llm_usage.qwen || 0} requêtes</span>
            </div>
            <div className="llm-bar-track">
              <div className="llm-bar-fill qwen" style={{width: `${(stats.llm_usage.qwen / 10) * 100}%`}}></div>
            </div>
          </div>

          <div className="llm-bar-item">
            <div className="llm-bar-header">
              <span>Llama Vision (Images)</span>
              <span>{stats.llm_usage.llama_vision || 0} requêtes</span>
            </div>
            <div className="llm-bar-track">
              <div className="llm-bar-fill llama" style={{width: `${(stats.llm_usage.llama_vision / 10) * 100}%`}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
