import { useState, useEffect } from 'react';
import {
  IconRefreshCw,
  IconThumbsUp,
  IconThumbsDown,
  IconActivity,
  IconFilter
} from '../components/Icons';
import './FeedbackPage.css';
import { BACKEND_URL } from '../config';

const API_URL = BACKEND_URL;

function FeedbackPage() {
  const [stats, setStats] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [allPatterns, setAllPatterns] = useState({ codePatterns: [], errorPatterns: [], avoid: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [modalType, setModalType] = useState('codePatterns'); // 'codePatterns', 'errorPatterns', 'avoid'
  const [editIndex, setEditIndex] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await fetch(`${API_URL}/api/feedback/stats`);
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData);

      const patternsRes = await fetch(`${API_URL}/api/skills/intelligence`);
      const patternsData = await patternsRes.json();
      if (patternsData.success) setPatterns(patternsData.patterns || {});

      const allPatternsRes = await fetch(`${API_URL}/api/patterns/all`);
      const allPatternsData = await allPatternsRes.json();
      if (allPatternsData.success) {
        setAllPatterns({
          codePatterns: allPatternsData.codePatterns || [],
          errorPatterns: allPatternsData.errorPatterns || [],
          avoid: allPatternsData.avoid || []
        });
      }
    } catch (error) {
      console.error('Error fetching feedback data:', error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-CA') + ' ' + date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  };

  const getFilteredRecent = () => {
    if (!stats?.recent) return [];
    if (filter === 'all') return stats.recent;
    return stats.recent.filter(fb => fb.type === filter);
  };

  // Modal functions
  const openAddModal = (type) => {
    setModalMode('add');
    setModalType(type);
    setEditIndex(null);
    setFormData(getEmptyForm(type));
    setShowModal(true);
  };

  const openEditModal = (type, index, pattern) => {
    setModalMode('edit');
    setModalType(type);
    setEditIndex(index);
    setFormData({ ...pattern });
    setShowModal(true);
  };

  const getEmptyForm = (type) => {
    if (type === 'codePatterns') return { name: '', pattern: '', usage: '' };
    if (type === 'errorPatterns') return { error_type: '', cause: '', fix: '' };
    if (type === 'avoid') return { mistake_type: '', what_went_wrong: '', improvement_rule: '', anti_pattern: '' };
    return {};
  };

  const handleSave = async () => {
    try {
      if (modalMode === 'add') {
        const res = await fetch(`${API_URL}/api/patterns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: modalType, pattern: formData })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        const res = await fetch(`${API_URL}/api/patterns`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: modalType, index: editIndex, pattern: formData })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  const handleDelete = async (type, index) => {
    if (!confirm('Supprimer ce pattern?')) return;
    try {
      const res = await fetch(`${API_URL}/api/patterns`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, index })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      fetchData();
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  const renderModal = () => {
    if (!showModal) return null;

    const getFields = () => {
      if (modalType === 'codePatterns') {
        return [
          { key: 'name', label: 'Nom', type: 'input' },
          { key: 'pattern', label: 'Pattern (code)', type: 'textarea' },
          { key: 'usage', label: 'Usage', type: 'input' }
        ];
      }
      if (modalType === 'errorPatterns') {
        return [
          { key: 'error_type', label: 'Type d\'erreur', type: 'input' },
          { key: 'cause', label: 'Cause', type: 'textarea' },
          { key: 'fix', label: 'Solution', type: 'textarea' }
        ];
      }
      if (modalType === 'avoid') {
        return [
          { key: 'mistake_type', label: 'Type d\'erreur', type: 'input' },
          { key: 'what_went_wrong', label: 'Probleme', type: 'textarea' },
          { key: 'improvement_rule', label: 'Regle d\'amelioration', type: 'textarea' },
          { key: 'anti_pattern', label: 'Exemple a eviter', type: 'textarea' }
        ];
      }
      return [];
    };

    const title = modalMode === 'add' ? 'Ajouter' : 'Modifier';
    const typeLabel = modalType === 'codePatterns' ? 'Code Pattern' : modalType === 'errorPatterns' ? 'Error Pattern' : 'Anti-pattern';

    return (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{title} {typeLabel}</h3>
            <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
          </div>
          <div className="modal-form">
            {getFields().map(field => (
              <div key={field.key} className="form-group">
                <label>{field.label}</label>
                {field.type === 'input' ? (
                  <input
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                  />
                ) : (
                  <textarea
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Sauvegarder</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="feedback-page">
      {renderModal()}

      <div className="page-header">
        <h1>Feedback & Apprentissage</h1>
        <button className="refresh-btn" onClick={fetchData} disabled={loading}>
          <IconRefreshCw size={18} className={loading ? 'spinning' : ''} />
          Actualiser
        </button>
      </div>

      {loading && !stats ? (
        <div className="loading-state">Chargement...</div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="stats-grid">
            <div className="stat-card positive">
              <div className="stat-icon"><IconThumbsUp size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{stats?.positive || 0}</div>
                <div className="stat-label">Positifs</div>
              </div>
            </div>
            <div className="stat-card negative">
              <div className="stat-icon"><IconThumbsDown size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{stats?.negative || 0}</div>
                <div className="stat-label">Negatifs</div>
              </div>
            </div>
            <div className="stat-card rate">
              <div className="stat-icon"><IconActivity size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{stats?.positiveRate || 0}%</div>
                <div className="stat-label">Taux positif</div>
              </div>
            </div>
            <div className="stat-card patterns">
              <div className="stat-icon"><IconFilter size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{patterns?.avoid || 0}</div>
                <div className="stat-label">Anti-patterns appris</div>
              </div>
            </div>
          </div>

          {/* By Model */}
          {stats?.byModel && Object.keys(stats.byModel).length > 0 && (
            <div className="section">
              <h2>Par Modele LLM</h2>
              <div className="model-grid">
                {Object.entries(stats.byModel).map(([model, counts]) => (
                  <div key={model} className="model-card">
                    <div className="model-name">{model}</div>
                    <div className="model-stats">
                      <span className="positive-count">+{counts.positive || 0}</span>
                      <span className="negative-count">-{counts.negative || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By Source */}
          {stats?.bySource && Object.keys(stats.bySource).length > 0 && (
            <div className="section">
              <h2>Par Source</h2>
              <div className="source-grid">
                {Object.entries(stats.bySource).map(([source, counts]) => (
                  <div key={source} className="source-card">
                    <div className="source-name">{source}</div>
                    <div className="source-stats">
                      <span className="positive-count">+{counts.positive || 0}</span>
                      <span className="negative-count">-{counts.negative || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Feedback */}
          <div className="section">
            <div className="section-header">
              <h2>Feedback Recent</h2>
              <div className="filter-buttons">
                <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tous</button>
                <button className={filter === 'positive' ? 'active' : ''} onClick={() => setFilter('positive')}>Positifs</button>
                <button className={filter === 'negative' ? 'active' : ''} onClick={() => setFilter('negative')}>Negatifs</button>
              </div>
            </div>
            <div className="feedback-list">
              {getFilteredRecent().length === 0 ? (
                <div className="empty-state">Aucun feedback pour ce filtre</div>
              ) : (
                getFilteredRecent().map((fb, idx) => (
                  <div key={fb.id || idx} className={`feedback-item ${fb.type}`}>
                    <div className="feedback-icon">
                      {fb.type === 'positive' ? <IconThumbsUp size={16} /> : <IconThumbsDown size={16} />}
                    </div>
                    <div className="feedback-content">
                      <div className="feedback-meta">
                        <span className="feedback-time">{formatDate(fb.timestamp)}</span>
                        {fb.llmModel && <span className="feedback-model">{fb.llmModel}</span>}
                        {fb.source && <span className="feedback-source">{fb.source}</span>}
                      </div>
                      {fb.question && <div className="feedback-question">Q: {fb.question.substring(0, 100)}...</div>}
                      {fb.comment && <div className="feedback-comment">{fb.comment}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Good Patterns Section */}
          <div className="section">
            <div className="section-header">
              <h2>Bons Patterns Appris</h2>
              <div>
                <span className="pattern-count">{allPatterns.codePatterns.length + allPatterns.errorPatterns.length} patterns</span>
                <button className="btn-add" onClick={() => openAddModal('codePatterns')}>+ Code</button>
                <button className="btn-add" style={{marginLeft: '0.5rem', background: '#3b82f6'}} onClick={() => openAddModal('errorPatterns')}>+ Error</button>
              </div>
            </div>
            <div className="patterns-list">
              {allPatterns.codePatterns.length === 0 && allPatterns.errorPatterns.length === 0 ? (
                <div className="empty-state">Aucun bon pattern appris</div>
              ) : (
                <>
                  {allPatterns.codePatterns.map((pattern, idx) => (
                    <div key={`code-${idx}`} className="pattern-item good">
                      <div className="pattern-type">{pattern.name || 'Code Pattern'}</div>
                      <div className="pattern-content">{pattern.pattern || String(pattern)}</div>
                      {pattern.usage && <div className="pattern-rule">Usage: {pattern.usage}</div>}
                      <div className="pattern-actions">
                        <button className="btn-edit" onClick={() => openEditModal('codePatterns', idx, pattern)}>Modifier</button>
                        <button className="btn-delete" onClick={() => handleDelete('codePatterns', idx)}>Supprimer</button>
                      </div>
                    </div>
                  ))}
                  {allPatterns.errorPatterns.map((pattern, idx) => (
                    <div key={`error-${idx}`} className="pattern-item good">
                      <div className="pattern-type">{pattern.error_type || 'Error Fix'}</div>
                      <div className="pattern-content">{pattern.cause || String(pattern)}</div>
                      {pattern.fix && <div className="pattern-rule">Fix: {pattern.fix}</div>}
                      <div className="pattern-actions">
                        <button className="btn-edit" onClick={() => openEditModal('errorPatterns', idx, pattern)}>Modifier</button>
                        <button className="btn-delete" onClick={() => handleDelete('errorPatterns', idx)}>Supprimer</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Anti-patterns Section */}
          <div className="section">
            <div className="section-header">
              <h2>Anti-patterns Appris</h2>
              <div>
                <span className="pattern-count">{allPatterns.avoid.length} anti-patterns</span>
                <button className="btn-add" style={{background: '#ef4444'}} onClick={() => openAddModal('avoid')}>+ Anti-pattern</button>
              </div>
            </div>
            <div className="patterns-list">
              {allPatterns.avoid.length === 0 ? (
                <div className="empty-state">Aucun anti-pattern appris</div>
              ) : (
                allPatterns.avoid.map((pattern, idx) => (
                  <div key={`avoid-${idx}`} className="pattern-item bad">
                    <div className="pattern-type">{pattern.mistake_type || 'Anti-pattern'}</div>
                    <div className="pattern-content">{pattern.what_went_wrong || pattern.anti_pattern || String(pattern)}</div>
                    {pattern.improvement_rule && <div className="pattern-rule">Regle: {pattern.improvement_rule}</div>}
                    <div className="pattern-actions">
                      <button className="btn-edit" onClick={() => openEditModal('avoid', idx, pattern)}>Modifier</button>
                      <button className="btn-delete" onClick={() => handleDelete('avoid', idx)}>Supprimer</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Last Updated */}
          <div className="last-updated">
            Derniere mise a jour: {formatDate(stats?.lastUpdated)}
          </div>
        </>
      )}
    </div>
  );
}

export default FeedbackPage;
