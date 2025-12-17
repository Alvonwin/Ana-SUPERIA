$file = 'E:/ANA/server/core/llm-orchestrator.cjs'
$content = Get-Content $file -Raw

# Changer l'ordre: llama3.1:8b en premier
$content = $content -replace "{ name: 'groq', model: 'llama-3.3-70b-versatile', type: 'cloud' },\r?\n  { name: 'ollama', model: 'llama3.1:8b', type: 'local' },", "{ name: 'ollama', model: 'llama3.1:8b', type: 'local' },`n  { name: 'groq', model: 'llama-3.3-70b-versatile', type: 'cloud' },"

Set-Content $file -Value $content -NoNewline
Write-Host "LLM order changed: llama3.1:8b is now first!"
