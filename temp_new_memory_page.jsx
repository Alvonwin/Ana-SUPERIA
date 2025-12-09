import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { IconSearch, IconFilter, IconCalendar, IconFileText, IconX, IconChevronDown, IconClock, IconTag, IconBrain, IconDatabase, IconArchive } from '../components/Icons';
import './MemorySearchPage.css';

const BACKEND_URL = 'http://localhost:3338';
const SEARCH_HISTORY_KEY = 'ana_search_history';
const MAX_HISTORY = 20;

/**
 * Ana SUPERIA - Memory Search Page v2
 * 3-Tier Memory System Visualization
 */
function MemorySearchPage() {
  // Tier stats
  const [tierStats, setTierStats] = useState({
    primary: { count: 0, description: 'Session' },
    secondary: { count: 0, description: 'Recent 48h' },
    tertiary: { count: 0, description: 'Archives' }
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [includePrimary, setIncludePrimary] = useState(true);
  const [includeSecondary, setIncludeSecondary] = useState(true);
  const [includeTertiary, setIncludeTertiary] = useState(true);
  const [sortBy, setSortBy] = useState('relevance');

  // Modal
  const [showFullConversation, setShowFullConversation] = useState(false);
  const [fullConversationContent, setFullConversationContent] = useState('');
  const [fullConversationSource, setFullConversationSource] = useState('');
  const [isLoadingFull, setIsLoadingFull] = useState(false);

  const searchInputRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    fetchTierStats();
    try {
      const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
      setSearchHistory(history);
    } catch (e) {
      console.error('Failed to load search history:', e);
    }
  }, []);

  const fetchTierStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/memory/tiered/stats`);
      const data = await response.json();
      if (data.success && data.tiers) {
        setTierStats(data.tiers);
      }
    } catch (error) {
      console.error('Tier stats error:', error);
    }
  };

  const saveToHistory = useCallback((query) => {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return searchHistory.slice(0, 5);
    return searchHistory.filter(h => h.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
  }, [searchQuery, searchHistory]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    const timer = setTimeout(() => performSearch(), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, includePrimary, includeSecondary, includeTertiary]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/memory/tiered/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          limit: 20,
          includePrimary,
          includeSecondary,
          includeTertiary
        })
      });

      const data = await response.json();
      let processedResults = data.results || [];

      if (sortBy === 'date_desc') {
        processedResults.sort((a, b) => new Date(b.metadata?.timestamp || 0) - new Date(a.metadata?.timestamp || 0));
      } else if (sortBy === 'date_asc') {
        processedResults.sort((a, b) => new Date(a.metadata?.timestamp || 0) - new Date(b.metadata?.timestamp || 0));
      }

      setResults(processedResults);
      saveToHistory(searchQuery);
      fetchTierStats(); // Refresh stats after search
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setShowSuggestions(false);
    performSearch();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') handleSearchSubmit(e);
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          setSearchQuery(suggestions[selectedSuggestionIndex]);
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        }
        handleSearchSubmit(e);
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    searchInputRef.current?.focus();
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  const fetchFullConversation = async (result) => {
    const source = result.metadata?.source || result.source;
    if (!source) {
      alert('Source non disponible');
      return;
    }
    setIsLoadingFull(true);
    setFullConversationSource(source);
    try {
      const response = await fetch(`${BACKEND_URL}/api/file/read?filepath=${encodeURIComponent(source)}`);
      const data = await response.json();
      if (data.success && data.content) {
        setFullConversationContent(data.content);
        setShowFullConversation(true);
      } else {
        alert(data.error || 'Erreur lecture fichier');
      }
    } catch (error) {
      alert('Erreur connexion serveur');
    } finally {
      setIsLoadingFull(false);
    }
  };

  const highlightText = (text, query) => {
    if (!query.trim() || !text) return text;
    const terms = query.split(/\s+/).filter(t => t.length > 1);
    if (terms.length === 0) return text;
    const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = String(text).split(regex);
    return parts.map((part, i) =>
      terms.some(t => part.toLowerCase() === t.toLowerCase())
        ? <mark key={i} className="search-highlight">{part}</mark>
        : part
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date inconnue';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'primary': return <IconBrain size={16} />;
      case 'secondary': return <IconDatabase size={16} />;
      case 'tertiary': return <IconArchive size={16} />;
      default: return <IconFileText size={16} />;
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (!includePrimary) count++;
    if (!includeSecondary) count++;
    if (!includeTertiary) count++;
    return count;
  }, [includePrimary, includeSecondary, includeTertiary]);

  return (
    <div className="memory-search-page">
      {/* Header */}
      <div className="search-header">
        <h2>Recherche Memoire</h2>
        <p className="subtitle">Systeme 3 tiers: Session / Recent / Archives</p>
      </div>

      {/* 3-Tier Stats */}
      <div className="tiers-section">
        <div className="tier-card primary">
          <div className="tier-header">
            <div className="tier-icon"><IconBrain size={20} /></div>
            <div>
              <div className="tier-title">Primary</div>
              <div className="tier-subtitle">Session courante</div>
            </div>
          </div>
          <div className="tier-stats">
            <div className="tier-count">{tierStats.primary?.count || 0}</div>
            <div className="tier-description">{tierStats.primary?.description || 'Memoire RAM'}</div>
          </div>
        </div>

        <div className="tier-card secondary">
          <div className="tier-header">
            <div className="tier-icon"><IconDatabase size={20} /></div>
            <div>
              <div className="tier-title">Secondary</div>
              <div className="tier-subtitle">Dernieres 48h</div>
            </div>
          </div>
          <div className="tier-stats">
            <div className="tier-count">{tierStats.secondary?.count || 0}</div>
            <div className="tier-description">{tierStats.secondary?.description || 'ChromaDB recent'}</div>
          </div>
        </div>

        <div className="tier-card tertiary">
          <div className="tier-header">
            <div className="tier-icon"><IconArchive size={20} /></div>
            <div>
              <div className="tier-title">Tertiary</div>
              <div className="tier-subtitle">Archives</div>
            </div>
          </div>
          <div className="tier-stats">
            <div className="tier-count">{tierStats.tertiary?.count || 0}</div>
            <div className="tier-description">{tierStats.tertiary?.description || 'Archives compressees'}</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <form className="search-section" onSubmit={handleSearchSubmit}>
        <div className="search-bar-container">
          <IconSearch className="search-icon" size={20} />
          <input
            ref={searchInputRef}
            type="text"
            className="search-input-large"
            placeholder="Cherche dans les 3 tiers de memoire..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); setSelectedSuggestionIndex(-1); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          <button type="submit" className="btn-search" disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? 'Recherche...' : 'Rechercher'}
          </button>

          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              <div className="suggestions-header">
                <IconClock size={14} /><span>Recherches recentes</span>
                {searchHistory.length > 0 && <button type="button" className="clear-history-btn" onClick={clearHistory}>Effacer</button>}
              </div>
              {suggestions.map((suggestion, index) => (
                <div key={index} className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                  onMouseDown={() => selectSuggestion(suggestion)} onMouseEnter={() => setSelectedSuggestionIndex(index)}>
                  <IconSearch size={14} /><span>{highlightText(suggestion, searchQuery)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Controls */}
        <div className="search-controls">
          <button type="button" className={`filter-toggle-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <IconFilter size={16} /> Tiers {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
            <IconChevronDown size={14} className={showFilters ? 'rotated' : ''} />
          </button>

          <div className="sort-control">
            <label>Trier:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
              <option value="relevance">Pertinence</option>
              <option value="date_desc">Plus recent</option>
              <option value="date_asc">Plus ancien</option>
            </select>
          </div>
        </div>

        {/* Tier Filters */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <label className="filter-label"><IconBrain size={14} /> Primary (Session)</label>
              <button type="button" className={`tag-btn ${includePrimary ? 'active' : ''}`} onClick={() => setIncludePrimary(!includePrimary)}>
                {includePrimary ? 'Inclus' : 'Exclus'}
              </button>
            </div>
            <div className="filter-group">
              <label className="filter-label"><IconDatabase size={14} /> Secondary (48h)</label>
              <button type="button" className={`tag-btn ${includeSecondary ? 'active' : ''}`} onClick={() => setIncludeSecondary(!includeSecondary)}>
                {includeSecondary ? 'Inclus' : 'Exclus'}
              </button>
            </div>
            <div className="filter-group">
              <label className="filter-label"><IconArchive size={14} /> Tertiary (Archives)</label>
              <button type="button" className={`tag-btn ${includeTertiary ? 'active' : ''}`} onClick={() => setIncludeTertiary(!includeTertiary)}>
                {includeTertiary ? 'Inclus' : 'Exclus'}
              </button>
            </div>
            <button type="button" className="clear-filters-btn" onClick={() => { setIncludePrimary(true); setIncludeSecondary(true); setIncludeTertiary(true); }}>
              <IconX size={14} /> Inclure tous les tiers
            </button>
          </div>
        )}
      </form>

      {/* Results */}
      <div className="results-section">
        {isSearching && (
          <div className="search-loading"><div className="loading-spinner"></div><p>Recherche en cours...</p></div>
        )}

        {!isSearching && results.length === 0 && (
          <div className="no-results">
            <IconSearch size={48} opacity={0.3} />
            <p>{searchQuery.trim() ? `Aucun resultat pour "${searchQuery}"` : 'Lance une recherche pour explorer la memoire'}</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <>
            <div className="results-header">
              <h3>{results.length} resultat{results.length > 1 ? 's' : ''}</h3>
              <span className="results-query">pour "{searchQuery}"</span>
            </div>

            <div className="results-list">
              {results.map((result, index) => (
                <article key={result.id || index} className="result-card">
                  <header className="result-header">
                    <div className="result-meta">
                      {getTierIcon(result.tier)}
                      <span className={`result-tier-badge ${result.tier || 'unknown'}`}>{result.tier || 'Unknown'}</span>
                      <time className="result-date">{formatDate(result.metadata?.timestamp)}</time>
                      {result.metadata?.model && <span className="result-type">{result.metadata.model}</span>}
                    </div>
                    {result.distance !== undefined && (
                      <div className="result-relevance">
                        <span className="relevance-score">{Math.round((1 - result.distance) * 100)}%</span>
                      </div>
                    )}
                  </header>

                  <div className="result-content">
                    {highlightText(result.document || result.content || result.text || JSON.stringify(result), searchQuery)}
                  </div>

                  <footer className="result-footer">
                    <div className="result-footer-left">
                      <span className="result-index">#{index + 1}</span>
                      {result.metadata?.source && <span className="result-source">{result.metadata.source.split('/').pop()}</span>}
                    </div>
                    {result.metadata?.source && (
                      <button className="btn-view-full" onClick={() => fetchFullConversation(result)}>Voir complet</button>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showFullConversation && (
        <div className="full-conversation-modal">
          <div className="modal-overlay" onClick={() => setShowFullConversation(false)} />
          <div className="modal-content">
            <header className="modal-header">
              <h3>Conversation complete</h3>
              <span className="modal-source">{fullConversationSource}</span>
              <button className="modal-close-btn" onClick={() => setShowFullConversation(false)}><IconX size={20} /></button>
            </header>
            <div className="modal-body">
              {isLoadingFull ? (
                <div className="modal-loading"><div className="loading-spinner"></div><p>Chargement...</p></div>
              ) : (
                <pre className="conversation-content">{fullConversationContent}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemorySearchPage;
