import { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconPlay,
  IconPause,
  IconRefreshCw,
  IconDownload,
  IconTrash2,
  IconFileText,
  IconFilter,
  IconSearch,
  IconAlertTriangle,
  IconInfo,
  IconAlertCircle,
  IconBug
} from '../components/Icons';
import './LogsPage.css';
import { BACKEND_URL } from '../config';

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, info: 0, warn: 0, error: 0, debug: 0 });
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit] = useState(200);
  const [logFile, setLogFile] = useState('');
  const logsEndRef = useRef(null);
  const intervalRef = useRef(null);

  // Sources disponibles
  const SOURCES = ['all', 'system', 'llm', 'memory', 'tools', 'agents', 'games', 'api', 'websocket'];
  const LEVELS = ['all', 'debug', 'info', 'warn', 'error'];
  const INTERVALS = [
    { value: 2000, label: '2s' },
    { value: 5000, label: '5s' },
    { value: 10000, label: '10s' },
    { value: 30000, label: '30s' },
    { value: 0, label: 'Off' }
  ];

  // Fetch real logs from backend
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        level: levelFilter,
        source: sourceFilter
      });

      const response = await fetch(`${BACKEND_URL}/api/logs?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || data.error);
      }

      // Ajouter un ID unique si pas présent
      const logsWithIds = (data.items || []).map((log, index) => ({
        ...log,
        id: log.id || `${log.time || Date.now()}-${index}`
      }));

      setLogs(logsWithIds);
      setStats(data.stats || { total: logsWithIds.length, info: 0, warn: 0, error: 0, debug: 0 });
      setLogFile(data.logFile || '');

    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err.message);
      // Garder les anciens logs en cas d'erreur
    } finally {
      setLoading(false);
    }
  }, [limit, levelFilter, sourceFilter]);

  // Auto-refresh setup
  useEffect(() => {
    fetchLogs();

    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchLogs, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchLogs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoRefresh) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoRefresh]);

  // Filter logs by search query (client-side)
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (log.message && log.message.toLowerCase().includes(query)) ||
      (log.source && log.source.toLowerCase().includes(query)) ||
      (log.level && log.level.toLowerCase().includes(query))
    );
  });

  // Clear logs (frontend only)
  const clearLogs = () => {
    setLogs([]);
    setStats({ total: 0, info: 0, warn: 0, error: 0, debug: 0 });
  };

  // Download logs as JSON or TXT
  const downloadLogs = (format = 'json') => {
    let content, filename, type;

    if (format === 'json') {
      content = JSON.stringify(filteredLogs, null, 2);
      filename = `ana-logs-${new Date().toISOString().split('T')[0]}.json`;
      type = 'application/json';
    } else {
      content = filteredLogs.map(log =>
        `[${log.time || log.timestamp}] [${(log.level || 'info').toUpperCase()}] [${log.source || 'system'}] ${log.message}`
      ).join('\n');
      filename = `ana-logs-${new Date().toISOString().split('T')[0]}.txt`;
      type = 'text/plain';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get level icon
  const getLevelIcon = (level) => {
    switch (level) {
      case 'error': return <IconAlertCircle size={14} />;
      case 'warn': return <IconAlertTriangle size={14} />;
      case 'info': return <IconInfo size={14} />;
      case 'debug': return <IconBug size={14} />;
      default: return null;
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--:--';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="logs-page">
      <div className="logs-header">
        <div className="logs-title">
          <IconFileText size={28} />
          <div>
            <h1>Logs Systeme</h1>
            <p className="subtitle">Logs en temps reel de ana-core.log</p>
          </div>
        </div>

        <div className="logs-actions">
          <button
            className={`action-btn ${autoRefresh && refreshInterval > 0 ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Pause auto-refresh' : 'Start auto-refresh'}
          >
            {autoRefresh && refreshInterval > 0 ? <IconPause size={16} /> : <IconPlay size={16} />}
          </button>
          <button
            className="action-btn"
            onClick={fetchLogs}
            disabled={loading}
            title="Rafraichir"
          >
            <IconRefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <div className="download-group">
            <button className="action-btn" onClick={() => downloadLogs('json')} title="JSON">
              <IconDownload size={16} />
            </button>
          </div>
          <button className="action-btn danger" onClick={clearLogs} title="Effacer">
            <IconTrash2 size={16} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="logs-error">
          <IconAlertTriangle size={16} />
          <span>Erreur: {error}</span>
          <button onClick={fetchLogs}>Reessayer</button>
        </div>
      )}

      {/* Stats bar */}
      <div className="logs-stats">
        <div className="stat-item total">
          <span className="stat-count">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item debug">
          <span className="stat-count">{stats.debug}</span>
          <span className="stat-label">Debug</span>
        </div>
        <div className="stat-item info">
          <span className="stat-count">{stats.info}</span>
          <span className="stat-label">Info</span>
        </div>
        <div className="stat-item warn">
          <span className="stat-count">{stats.warn}</span>
          <span className="stat-label">Warn</span>
        </div>
        <div className="stat-item error">
          <span className="stat-count">{stats.error}</span>
          <span className="stat-label">Error</span>
        </div>
      </div>

      {/* Filters */}
      <div className="logs-filters">
        <div className="filter-group">
          <IconFilter size={16} />
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            {LEVELS.map(level => (
              <option key={level} value={level}>
                {level === 'all' ? 'Tous niveaux' : level.charAt(0).toUpperCase() + level.slice(1)}
              </option>
            ))}
          </select>

          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            {SOURCES.map(source => (
              <option key={source} value={source}>
                {source === 'all' ? 'Toutes sources' : source}
              </option>
            ))}
          </select>
        </div>

        <div className="search-group">
          <IconSearch size={16} />
          <input
            type="text"
            placeholder="Rechercher dans les logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="refresh-group">
          <span className="refresh-label">Refresh:</span>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            {INTERVALS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {autoRefresh && refreshInterval > 0 && (
            <span className="live-indicator">LIVE</span>
          )}
        </div>
      </div>

      {/* Logs viewer */}
      <div className="logs-viewer">
        {filteredLogs.length === 0 ? (
          <div className="logs-empty">
            <IconFileText size={48} />
            <p>{loading ? 'Chargement...' : 'Aucun log a afficher'}</p>
            {!loading && <button onClick={fetchLogs}>Rafraichir</button>}
          </div>
        ) : (
          <div className="logs-list">
            {filteredLogs.map((log) => (
              <div key={log.id} className={`log-entry level-${log.level || 'info'}`}>
                <span className="log-timestamp">
                  {formatTime(log.time || log.timestamp)}
                </span>
                <span className={`log-level ${log.level || 'info'}`}>
                  {getLevelIcon(log.level)}
                  <span>{(log.level || 'info').toUpperCase()}</span>
                </span>
                <span className="log-source">{log.source || 'system'}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="logs-footer">
        <span>Affichage: {filteredLogs.length} / {stats.total} logs</span>
        <span>Limite: {limit}</span>
        <span className="log-path" title={logFile}>{logFile || 'E:\\ANA\\server\\logs\\ana-core.log'}</span>
      </div>
    </div>
  );
}

export default LogsPage;
