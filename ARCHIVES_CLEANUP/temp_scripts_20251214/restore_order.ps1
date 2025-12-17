$file = 'E:/ANA/server/core/llm-orchestrator.cjs'
$content = Get-Content $file -Raw

# Remettre Groq en premier
$content = $content -replace "{ name: 'ollama', model: 'llama3.1:8b', type: 'local' },\r?\n  { name: 'groq', model: 'llama-3.3-70b-versatile', type: 'cloud' },", "{ name: 'groq', model: 'llama-3.3-70b-versatile', type: 'cloud' },`n  { name: 'ollama', model: 'llama3.1:8b', type: 'local' },"

Set-Content $file -Value $content -NoNewline
Write-Host "Ordre restaure: Groq -> llama3.1 -> qwen3"
