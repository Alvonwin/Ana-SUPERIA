import { useState, useEffect, useRef } from 'react';
import {
  IconPlay,
  IconPause,
  IconRefreshCw,
  IconDownload,
  IconTrash2,
  IconFileText,
  IconFilter
} from '../components/Icons';
import './LogsPage.css';
import { BACKEND_URL } from '../config';

const API_URL = BACKEND_URL;

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // all, info, warn, error
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const logsEndRef = useRef(null);
  const intervalRef = useRef(null);

  // Fetch logs from backend
  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Try to get logs from backend stats endpoint
      const response = await fetch(`${API_URL}/api/stats`);
      const data = await response.json();

      // Generate log entries from stats
      const now = new Date();
      const newLogs = [];

      // Add system status logs
      newLogs.push({
        id: Date.now(),
        timestamp: now.toISOString(),
        level: 'info',
        source: 'system',
        message: `LLM Stats - PHI3: ${data.llm_usage?.phi3 || 0}, DeepSeek: ${data.llm_usage?.deepseek || 0}`,
      });

      newLogs.push({
        id: Date.now() + 1,
        timestamp: now.toISOString(),
        level: 'info',
        source: 'memory',
        message: `Memory: ${data.memory?.sizeKB || 0} KB, ${data.memory?.lines || 0} lignes`,
      });

      if (data.active_model) {
        newLogs.push({
          id: Date.now() + 2,
          timestamp: now.toISOString(),
          level: 'info',
          source: 'llm',
          message: `Modèle actif: ${data.active_model}`,
        });
      }

      // Keep last 100 logs
      setLogs(prev => [...prev, ...newLogs].slice(-100));
    } catch (error) {
      setLogs(prev => [...prev, {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        level: 'error',
        source: 'frontend',
        message: `Erreur connexion backend: ${error.message}`,
      }].slice(-100));
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    fetchLogs(); // Initial fetch

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Download logs
  const downloadLogs = () => {
    const content = logs.map(log =>
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ana-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get level color
  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return '#e74c3c';
      case 'warn': return '#f39c12';
      case 'info': return '#3498db';
      case 'debug': return '#9b59b6';
      default: return '#888';
    }
  };

  // Count by level
  const countByLevel = (level) => logs.filter(l => l.level === level).length;

  return (
    <div className="logs-page">
      <div className="logs-header">
        <div className="logs-title">
          <IconFileText size={28} />
          <div>
            <h1>Logs Système</h1>
            <p className="subtitle">Surveillance en temps réel de Ana</p>
          </div>
        </div>

        <div className="logs-actions">
          <button
            className={`action-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Pause auto-refresh' : 'Start auto-refresh'}
          >
            {autoRefresh ? <IconPause size={16} /> : <IconPlay size={16} />}
          </button>
          <button className="action-btn" onClick={fetchLogs} disabled={loading} title="Rafraîchir">
            <IconRefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="action-btn" onClick={downloadLogs} title="Télécharger">
            <IconDownload size={16} />
          </button>
          <button className="action-btn danger" onClick={clearLogs} title="Effacer">
            <IconTrash2 size={16} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="logs-stats">
        <div className="stat-item">
          <span className="stat-count">{logs.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item" style={{ '--stat-color': '#3498db' }}>
          <span className="stat-count">{countByLevel('info')}</span>
          <span className="stat-label">Info</span>
        </div>
        <div className="stat-item" style={{ '--stat-color': '#f39c12' }}>
          <span className="stat-count">{countByLevel('warn')}</span>
          <span className="stat-label">Warn</span>
        </div>
        <div className="stat-item" style={{ '--stat-color': '#e74c3c' }}>
          <span className="stat-count">{countByLevel('error')}</span>
          <span className="stat-label">Error</span>
        </div>
      </div>

      {/* Filter */}
      <div className="logs-filter">
        <IconFilter />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tous les niveaux</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
        <span className="filter-status">
          {autoRefresh && <span className="live-indicator">LIVE</span>}
        </span>
      </div>

      {/* Logs viewer */}
      <div className="logs-viewer">
        {filteredLogs.length === 0 ? (
          <div className="logs-empty">
            <IconFileText size={48} />
            <p>Aucun log à afficher</p>
            <button onClick={fetchLogs}>Rafraîchir</button>
          </div>
        ) : (
          <div className="logs-list">
            {filteredLogs.map((log) => (
              <div key={log.id} className={`log-entry level-${log.level}`}>
                <span className="log-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className="log-level"
                  style={{ color: getLevelColor(log.level) }}
                >
                  [{log.level.toUpperCase()}]
                </span>
                <span className="log-source">[{log.source}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="logs-footer">
        <span>Auto-refresh: {autoRefresh ? '5s' : 'Off'}</span>
        <span>Logs path: E:\ANA\logs\</span>
      </div>
    </div>
  );
}

export default LogsPage;
