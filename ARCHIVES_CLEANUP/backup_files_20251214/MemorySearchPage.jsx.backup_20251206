import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { IconSearch, IconFilter, IconCalendar, IconFileText, IconX, IconChevronDown, IconClock, IconTag } from '../components/Icons';
import './MemorySearchPage.css';

const BACKEND_URL = 'http://localhost:3338';

// Storage keys
const SEARCH_HISTORY_KEY = 'ana_search_history';
const MAX_HISTORY = 20;

/**
 * Ana SUPERIA - Memory Search Page
 *
 * Modern search interface with:
 * - Native HTML5 date inputs (no heavy dependencies)
 * - Search term highlighting in results
 * - Sorting (relevance, date asc/desc)
 * - Tag-based filtering
 * - Autocomplete from search history
 * - Debounced search
 *
 * Best practices 2025:
 * - No external date picker dependencies
 * - LocalStorage for search history
 * - Virtual scrolling ready (results)
 * - Accessible keyboard navigation
 */
function MemorySearchPage() {
  // Core search state
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [memoryStats, setMemoryStats] = useState({ totalConv: 0, sizeGB: '0', indexCount: 0 });

  // Search history & autocomplete
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [activeTags, setActiveTags] = useState([]);
  const [searchDirectory, setSearchDirectory] = useState('all');

  // Sorting
  const [sortBy, setSortBy] = useState('relevance');

  // Full conversation modal
  const [showFullConversation, setShowFullConversation] = useState(false);
  const [fullConversationContent, setFullConversationContent] = useState('');
  const [fullConversationSource, setFullConversationSource] = useState('');
  const [isLoadingFull, setIsLoadingFull] = useState(false); // relevance, date_asc, date_desc

  // Refs
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Available tags for filtering
  const availableTags = useMemo(() => [
    'code', 'conversation', 'analyse', 'bug', 'feature', 'documentation',
    'urgent', 'résolu', 'en-cours', 'claude', 'ana', 'archon'
  ], []);

  // Available directories for search
  const searchDirectories = useMemo(() => [
    { value: 'all', label: 'Tous les répertoires', path: null },
    { value: 'drive_c', label: 'Lecteur C:/', path: 'C:/' },
    { value: 'drive_d', label: 'Lecteur D:/', path: 'D:/' },
    { value: 'drive_e', label: 'Lecteur E:/', path: 'E:/' },
    { value: 'memoire', label: 'Mémoire Claude', path: 'E:/Mémoire Claude' },
    { value: 'ana', label: 'Projet Ana', path: 'E:/ANA' },
    { value: 'archives', label: 'Archives', path: 'E:/Mémoire Claude/01_ARCHIVES_VERBATIM' },
    { value: 'syntheses', label: 'Synthèses', path: 'E:/Mémoire Claude/02_SYNTHESES_ACTIVES' },
    { value: 'metamemoire', label: 'Métamémoire', path: 'E:/Mémoire Claude/03_METAMEMOIRE' },
    { value: 'projets', label: 'Projets', path: 'E:/Mémoire Claude/07_PROJETS' },
  ], []);

  // Load search history on mount
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
      setSearchHistory(history);
    } catch (e) {
      console.error('Failed to load search history:', e);
    }
    fetchMemoryStats();
  }, []);

  // Save search to history
  const saveToHistory = useCallback((query) => {
    if (!query.trim()) return;

    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return searchHistory.slice(0, 5);
    return searchHistory.filter(h =>
      h.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [searchQuery, searchHistory]);

  const fetchMemoryStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stats`);
      const data = await response.json();
      setMemoryStats({
        totalConv: Math.floor(data.memory?.lines / 50) || 0,
        sizeGB: (data.memory?.sizeKB / (1024 * 1024)).toFixed(2),
        indexCount: data.memory?.lines || 0
      });
    } catch (error) {
      console.error('Memory stats fetch error:', error);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;

    const timer = setTimeout(() => {
      performSearch();
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, dateFrom, dateTo, selectedType, selectedProject, activeTags, sortBy, searchDirectory]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Get the selected directory path
      const selectedDir = searchDirectories.find(d => d.value === searchDirectory);

      const response = await fetch(`${BACKEND_URL}/api/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          directory: selectedDir?.path || null,
          filters: {
            startDate: dateFrom,
            endDate: dateTo,
            type: selectedType !== 'all' ? selectedType : undefined,
            project: selectedProject !== 'all' ? selectedProject : undefined,
            tags: activeTags.length > 0 ? activeTags : undefined
          },
          sort: sortBy
        })
      });

      const data = await response.json();
      let processedResults = data.results || [];

      // Client-side sorting if backend doesn't support it
      if (sortBy === 'date_asc') {
        processedResults.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      } else if (sortBy === 'date_desc') {
        processedResults.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      }

      setResults(processedResults);
      saveToHistory(searchQuery);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search form submit
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setShowSuggestions(false);
    performSearch();
  };

  // Keyboard navigation for suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') handleSearchSubmit(e);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
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

  // Select suggestion
  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    searchInputRef.current?.focus();
  };

  // Toggle tag
  const toggleTag = (tag) => {
    setActiveTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    setDateFrom(d.toISOString().split('T')[0]);
    setDateTo(new Date().toISOString().split('T')[0]);
    setSelectedType('all');
    setSelectedProject('all');
    setActiveTags([]);
    setSortBy('relevance');
    setSearchDirectory('all');
  };

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  // Fetch full conversation content
  const fetchFullConversation = async (result) => {
    const source = result.metadata?.source || result.source;
    if (!source) {
      alert('Source du fichier non disponible');
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
        alert(data.error || 'Erreur lors de la lecture du fichier');
      }
    } catch (error) {
      console.error('Error fetching full conversation:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setIsLoadingFull(false);
    }
  };

  // Highlight search terms in text
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

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date inconnue';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchDirectory !== 'all') count++;
    if (selectedType !== 'all') count++;
    if (selectedProject !== 'all') count++;
    if (activeTags.length > 0) count += activeTags.length;
    return count;
  }, [searchDirectory, selectedType, selectedProject, activeTags]);

  return (
    <div className="memory-search-page">
      {/* Header */}
      <div className="search-header">
        <h2>Recherche Mémoire</h2>
        <p className="subtitle">Ana se souvient de TOUT. Cherche dans toutes tes conversations.</p>
      </div>

      {/* Search Bar */}
      <form className="search-section" onSubmit={handleSearchSubmit}>
        <div className="search-bar-container">
          <IconSearch className="search-icon" size={20} />
          <input
            ref={searchInputRef}
            type="text"
            className="search-input-large"
            placeholder="Cherche dans la mémoire d'Ana..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedSuggestionIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
          />
          <button
            type="submit"
            className="btn-search"
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? 'Recherche...' : 'Rechercher'}
          </button>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown" ref={suggestionsRef}>
              <div className="suggestions-header">
                <IconClock size={14} />
                <span>Recherches récentes</span>
                {searchHistory.length > 0 && (
                  <button
                    type="button"
                    className="clear-history-btn"
                    onClick={clearHistory}
                  >
                    Effacer
                  </button>
                )}
              </div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                  onMouseDown={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setSelectedSuggestionIndex(index)}
                >
                  <IconSearch size={14} />
                  <span>{highlightText(suggestion, searchQuery)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Toggle & Sort */}
        <div className="search-controls">
          <button
            type="button"
            className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <IconFilter size={16} />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="filter-badge">{activeFiltersCount}</span>
            )}
            <IconChevronDown size={14} className={showFilters ? 'rotated' : ''} />
          </button>

          <div className="sort-control">
            <label htmlFor="sort-select">Trier par:</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="relevance">Pertinence</option>
              <option value="date_desc">Plus récent</option>
              <option value="date_asc">Plus ancien</option>
            </select>
          </div>
        </div>

        {/* Expanded Filters Panel */}
        {showFilters && (
          <div className="filters-panel">
            {/* Directory Selection */}
            <div className="filter-group">
              <label className="filter-label">
                <IconFileText size={14} />
                Répertoire
              </label>
              <select
                value={searchDirectory}
                onChange={(e) => setSearchDirectory(e.target.value)}
                className="filter-select"
              >
                {searchDirectories.map((dir) => (
                  <option key={dir.value} value={dir.value}>
                    {dir.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range - Native HTML5 */}
            <div className="filter-group">
              <label className="filter-label">
                <IconCalendar size={14} />
                Période
              </label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="date-input"
                  max={dateTo}
                />
                <span className="date-separator">→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="date-input"
                  min={dateFrom}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="filter-group">
              <label className="filter-label">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tous les types</option>
                <option value="conversation">Conversations</option>
                <option value="code">Code</option>
                <option value="document">Documents</option>
                <option value="note">Notes</option>
              </select>
            </div>

            {/* Project Filter */}
            <div className="filter-group">
              <label className="filter-label">Projet</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tous les projets</option>
                <option value="ana">Ana SUPERIA</option>
                <option value="archon">Archon</option>
                <option value="claude">Claude Memory</option>
                <option value="other">Autres</option>
              </select>
            </div>

            {/* Tags */}
            <div className="filter-group filter-group-full">
              <label className="filter-label">
                <IconTag size={14} />
                Tags
              </label>
              <div className="tags-container">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-btn ${activeTags.includes(tag) ? 'active' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <button
              type="button"
              className="clear-filters-btn"
              onClick={clearFilters}
            >
              <IconX size={14} />
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </form>

      {/* Stats Section */}
      <div className="stats-section">
        <div className="stat-card">
          <span className="stat-label">Conversations</span>
          <span className="stat-value">{memoryStats.totalConv.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Taille</span>
          <span className="stat-value">{memoryStats.sizeGB} GB</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lignes indexées</span>
          <span className="stat-value">{memoryStats.indexCount.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Résultats</span>
          <span className="stat-value">{results.length}</span>
        </div>
      </div>

      {/* Results Section */}
      <div className="results-section">
        {/* Loading State */}
        {isSearching && (
          <div className="search-loading">
            <div className="loading-spinner"></div>
            <p>Recherche en cours...</p>
          </div>
        )}

        {/* Empty State */}
        {!isSearching && results.length === 0 && (
          <div className="no-results">
            <IconSearch size={48} opacity={0.3} />
            <p>
              {searchQuery.trim()
                ? `Aucun résultat pour "${searchQuery}"`
                : 'Lance une recherche pour explorer la mémoire d\'Ana'}
            </p>
            {searchQuery.trim() && (
              <span className="no-results-hint">
                Essaie d'autres termes ou ajuste les filtres
              </span>
            )}
          </div>
        )}

        {/* Results List */}
        {!isSearching && results.length > 0 && (
          <>
            <div className="results-header">
              <h3>{results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}</h3>
              <span className="results-query">pour "{searchQuery}"</span>
            </div>

            <div className="results-list">
              {results.map((result, index) => (
                <article key={result.id || index} className="result-card">
                  <header className="result-header">
                    <div className="result-meta">
                      <IconFileText size={16} />
                      <time className="result-date">
                        {formatDate(result.date || result.timestamp || result.metadata?.timestamp)}
                      </time>
                      {result.type && (
                        <span className={`result-type type-${result.type}`}>
                          {result.type}
                        </span>
                      )}
                      {result.project && (
                        <span className="result-project">
                          {result.project}
                        </span>
                      )}
                    </div>
                    {result.relevance !== undefined && (
                      <div className="result-relevance">
                        <span className="relevance-score">
                          {Math.round((result.relevance || 0) * 100)}%
                        </span>
                        <span className="relevance-label">pertinence</span>
                      </div>
                    )}
                  </header>

                  <div className="result-content">
                    {highlightText(
                      typeof result === 'string'
                        ? result
                        : result.content || result.text || result.snippet || JSON.stringify(result),
                      searchQuery
                    )}
                  </div>

                  {result.tags && result.tags.length > 0 && (
                    <div className="result-tags">
                      {result.tags.map((tag, i) => (
                        <span key={i} className="result-tag">{tag}</span>
                      ))}
                    </div>
                  )}

                  <footer className="result-footer">
                    <div className="result-footer-left">
                      <span className="result-index">#{index + 1}</span>
                      {(result.metadata?.source || result.source) && (
                        <span className="result-source" title={result.metadata?.source || result.source}>
                          {(result.metadata?.filename || (result.metadata?.source || result.source).split('/').pop())}
                        </span>
                      )}
                    </div>
                    <button
                      className="btn-view-full"
                      onClick={() => fetchFullConversation(result)}
                    >
                      Voir la conversation complète
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Full Conversation Modal */}
      {showFullConversation && (
        <div className="full-conversation-modal">
          <div className="modal-overlay" onClick={() => setShowFullConversation(false)} />
          <div className="modal-content">
            <header className="modal-header">
              <h3>Conversation complète</h3>
              <span className="modal-source">{fullConversationSource}</span>
              <button
                className="modal-close-btn"
                onClick={() => setShowFullConversation(false)}
              >
                <IconX size={20} />
              </button>
            </header>
            <div className="modal-body">
              {isLoadingFull ? (
                <div className="modal-loading">
                  <div className="loading-spinner"></div>
                  <p>Chargement...</p>
                </div>
              ) : (
                <pre className="conversation-content">
                  {fullConversationContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemorySearchPage;
