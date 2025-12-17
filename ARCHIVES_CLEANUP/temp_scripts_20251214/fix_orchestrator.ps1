$file = 'E:/ANA/server/core/llm-orchestrator.cjs'
$content = Get-Content $file -Raw

$old = @'
/**
 * Call LLM with automatic fallback
 * Tries each provider in order until one succeeds
 */
async function callWithFallback(messages, tools, options = {}) {
  let lastError = null;

  for (const llm of LLM_CHAIN) {
'@

$new = @'
/**
 * Call LLM with automatic fallback
 * Tries each provider in order until one succeeds
 * @param {Object} options - { forceLocal: boolean } - Skip cloud LLMs if true
 */
async function callWithFallback(messages, tools, options = {}) {
  let lastError = null;

  // Si forceLocal=true, sauter Groq et aller direct sur Ollama local
  const chain = options.forceLocal
    ? LLM_CHAIN.filter(llm => llm.type === 'local')
    : LLM_CHAIN;

  for (const llm of chain) {
'@

$content = $content.Replace($old, $new)
Set-Content $file -Value $content -NoNewline
Write-Host "Orchestrator updated!"
