const fs = require('fs');
const path = 'E:/ANA/ana-interface/src/pages/MemorySearchPage.css';

const content = fs.readFileSync(path, 'utf-8');

if (content.includes('3-TIER MEMORY SYSTEM')) {
  console.log('3-TIER MEMORY SYSTEM styles already exist - skipping');
  process.exit(0);
}

const newStyles = `

/* ===== 3-TIER MEMORY SYSTEM ===== */
.tiers-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.tier-card {
  background: #2c3e50;
  padding: 20px;
  border-radius: 12px;
  border-left: 4px solid;
  transition: all 0.2s;
}

.tier-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.tier-card.primary { border-color: #2ecc71; }
.tier-card.secondary { border-color: #3498db; }
.tier-card.tertiary { border-color: #9b59b6; }

.tier-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.tier-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tier-card.primary .tier-icon { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
.tier-card.secondary .tier-icon { background: rgba(52, 152, 219, 0.2); color: #3498db; }
.tier-card.tertiary .tier-icon { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }

.tier-title { font-size: 1.1em; font-weight: 600; color: #ecf0f1; }
.tier-subtitle { font-size: 0.8em; color: #95a5a6; }
.tier-stats { display: flex; flex-direction: column; gap: 8px; }
.tier-count { font-size: 2em; font-weight: 700; }

.tier-card.primary .tier-count { color: #2ecc71; }
.tier-card.secondary .tier-count { color: #3498db; }
.tier-card.tertiary .tier-count { color: #9b59b6; }

.tier-description { font-size: 0.85em; color: #95a5a6; }

/* ===== RESULT TIER BADGES ===== */
.result-tier-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
}

.result-tier-badge.primary { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
.result-tier-badge.secondary { background: rgba(52, 152, 219, 0.2); color: #3498db; }
.result-tier-badge.tertiary { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }

/* ===== SEARCH CONTROLS ===== */
.search-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 15px;
}

.filter-toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(52, 152, 219, 0.15);
  border: 1px solid #3498db;
  border-radius: 8px;
  color: #3498db;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-toggle-btn:hover, .filter-toggle-btn.active { background: #3498db; color: white; }
.filter-badge { background: #e74c3c; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; font-weight: 600; }

.sort-control { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.sort-control label { color: #95a5a6; font-size: 0.9em; }
.sort-select { padding: 8px 12px; background: rgba(255,255,255,0.1); border: 1px solid #4a5f7f; border-radius: 6px; color: #ecf0f1; cursor: pointer; }

/* ===== SUGGESTIONS DROPDOWN ===== */
.search-bar-container { position: relative; }
.suggestions-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #2c3e50; border: 1px solid #34495e; border-radius: 0 0 12px 12px; z-index: 100; margin-top: -5px; overflow: hidden; }
.suggestions-header { display: flex; align-items: center; gap: 8px; padding: 10px 15px; background: rgba(0,0,0,0.2); color: #95a5a6; font-size: 0.85em; }
.clear-history-btn { margin-left: auto; background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 0.85em; }
.suggestion-item { display: flex; align-items: center; gap: 10px; padding: 12px 15px; cursor: pointer; transition: background 0.2s; }
.suggestion-item:hover, .suggestion-item.selected { background: rgba(155, 89, 182, 0.2); }
.rotated { transform: rotate(180deg); }

/* ===== RESULTS HEADER ===== */
.results-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 20px; }
.results-header h3 { margin: 0; color: #ecf0f1; }
.results-query { color: #95a5a6; font-size: 0.9em; }

/* ===== LOADING SPINNER ===== */
.search-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #95a5a6; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(155, 89, 182, 0.2); border-top-color: #9b59b6; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) { .tiers-section { grid-template-columns: 1fr; } }
`;

const newContent = content + newStyles;
fs.writeFileSync(path, newContent, 'utf-8');
console.log('SUCCESS: 3-Tier Memory styles added to CSS');
