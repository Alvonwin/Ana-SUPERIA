$file = 'E:/ANA/ana-interface/src/pages/FeedbackPage.jsx'
$content = Get-Content $file -Raw -Encoding UTF8

$old = @'
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
'@

$new = @'
                  {allPatterns.codePatterns.map((pattern, idx) => (
                    <div key={`code-${idx}`} className="pattern-item good">
                      <div className="pattern-type">{pattern.name || 'Code Pattern'}</div>
                      <div className="pattern-content">{pattern.pattern || String(pattern)}</div>
                      {pattern.usage && <div className="pattern-rule">Usage: {pattern.usage}</div>}
                    </div>
                  ))}
                  {allPatterns.errorPatterns.map((pattern, idx) => (
                    <div key={`error-${idx}`} className="pattern-item good">
                      <div className="pattern-type">{pattern.error_type || 'Error Fix'}</div>
                      <div className="pattern-content">{pattern.cause || String(pattern)}</div>
                      {pattern.fix && <div className="pattern-rule">Fix: {pattern.fix}</div>}
                    </div>
                  ))}
'@

$content = $content -replace [regex]::Escape($old), $new
Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host 'Patterns display fixed'
