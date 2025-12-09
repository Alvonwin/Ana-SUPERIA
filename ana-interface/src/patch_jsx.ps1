$file = 'E:/ANA/ana-interface/src/pages/FeedbackPage.jsx'
$content = Get-Content $file -Raw -Encoding UTF8

# 1. Add allPatterns state
$oldState = 'const [patterns, setPatterns] = useState([]);'
$newState = @'
const [patterns, setPatterns] = useState([]);
  const [allPatterns, setAllPatterns] = useState({ codePatterns: [], errorPatterns: [], avoid: [] });
'@
$content = $content -replace [regex]::Escape($oldState), $newState

# 2. Add fetch for allPatterns - replace the patterns fetch block
$oldFetch = @'
// Fetch patterns (anti-patterns learned)
      const patternsRes = await fetch(`${API_URL}/api/skills/intelligence`);
      const patternsData = await patternsRes.json();
      if (patternsData.success) {
        setPatterns(patternsData.patterns || {});
      }
'@
$newFetch = @'
// Fetch patterns (anti-patterns learned)
      const patternsRes = await fetch(`${API_URL}/api/skills/intelligence`);
      const patternsData = await patternsRes.json();
      if (patternsData.success) {
        setPatterns(patternsData.patterns || {});
      }

      // Fetch all patterns (good and bad)
      const allPatternsRes = await fetch(`${API_URL}/api/patterns/all`);
      const allPatternsData = await allPatternsRes.json();
      if (allPatternsData.success) {
        setAllPatterns({
          codePatterns: allPatternsData.codePatterns || [],
          errorPatterns: allPatternsData.errorPatterns || [],
          avoid: allPatternsData.avoid || []
        });
      }
'@
$content = $content -replace [regex]::Escape($oldFetch), $newFetch

# 3. Add new sections before Last Updated
$oldLastUpdated = @'
{/* Last Updated */}
          <div className="last-updated">
'@
$newSections = @'
{/* Good Patterns Section */}
          <div className="section">
            <div className="section-header">
              <h2>Bons Patterns Appris</h2>
              <span className="pattern-count">{allPatterns.codePatterns.length + allPatterns.errorPatterns.length} patterns</span>
            </div>
            <div className="patterns-list">
              {allPatterns.codePatterns.length === 0 && allPatterns.errorPatterns.length === 0 ? (
                <div className="empty-state">Aucun bon pattern appris</div>
              ) : (
                <>
                  {allPatterns.codePatterns.map((pattern, idx) => (
                    <div key={`code-${idx}`} className="pattern-item good">
                      <div className="pattern-type">Code Pattern</div>
                      <div className="pattern-content">{pattern.pattern || pattern}</div>
                      {pattern.context && <div className="pattern-rule">Contexte: {pattern.context}</div>}
                    </div>
                  ))}
                  {allPatterns.errorPatterns.map((pattern, idx) => (
                    <div key={`error-${idx}`} className="pattern-item good">
                      <div className="pattern-type">Error Fix</div>
                      <div className="pattern-content">{pattern.error || pattern}</div>
                      {pattern.solution && <div className="pattern-rule">Solution: {pattern.solution}</div>}
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
              <span className="pattern-count">{allPatterns.avoid.length} anti-patterns</span>
            </div>
            <div className="patterns-list">
              {allPatterns.avoid.length === 0 ? (
                <div className="empty-state">Aucun anti-pattern appris</div>
              ) : (
                allPatterns.avoid.map((pattern, idx) => (
                  <div key={`avoid-${idx}`} className="pattern-item bad">
                    <div className="pattern-type">{pattern.mistake_type || 'Anti-pattern'}</div>
                    <div className="pattern-content">{pattern.what_went_wrong || pattern.anti_pattern || pattern}</div>
                    {pattern.improvement_rule && <div className="pattern-rule">Regle: {pattern.improvement_rule}</div>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Last Updated */}
          <div className="last-updated">
'@
$content = $content -replace [regex]::Escape($oldLastUpdated), $newSections

Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host 'JSX patched successfully'
