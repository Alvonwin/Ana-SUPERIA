$file = 'E:/ANA/server/intelligence/semantic-router.cjs'
$content = Get-Content $file -Raw

# Replace CONVERSATION task type to use French model
$content = $content -replace "preferredModel: 'llama-3.3-70b-versatile',", "preferredModel: 'ana-french-tutoiement',"
$content = $content -replace "provider: 'groq'  // GROQ for fast French responses", "provider: 'ollama'  // LOCAL for French tutoiement"

Set-Content $file -Value $content -NoNewline

Write-Host "Done - semantic-router.cjs updated to use ana-french-tutoiement for conversation"
