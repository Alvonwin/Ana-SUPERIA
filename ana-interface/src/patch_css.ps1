$file = 'E:/ANA/ana-interface/src/pages/FeedbackPage.css'
$content = Get-Content $file -Raw -Encoding UTF8

$oldCSS = @'
/* Feedback List */
.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
'@

$newCSS = @'
/* Feedback List */
.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

/* Patterns List */
.patterns-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.pattern-item {
  padding: 1rem;
  background: var(--bg-tertiary, #1a1a1a);
  border-radius: 8px;
  border-left: 3px solid transparent;
}

.pattern-item.good {
  border-left-color: #22c55e;
}

.pattern-item.bad {
  border-left-color: #ef4444;
}

.pattern-type {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  color: var(--text-secondary, #888);
}

.pattern-item.good .pattern-type {
  color: #22c55e;
}

.pattern-item.bad .pattern-type {
  color: #ef4444;
}

.pattern-content {
  font-size: 0.875rem;
  color: var(--text-primary, #fff);
  margin-bottom: 0.25rem;
}

.pattern-rule {
  font-size: 0.8rem;
  color: var(--text-secondary, #888);
  font-style: italic;
}
'@

$content = $content -replace [regex]::Escape($oldCSS), $newCSS
Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host 'CSS patched successfully'
