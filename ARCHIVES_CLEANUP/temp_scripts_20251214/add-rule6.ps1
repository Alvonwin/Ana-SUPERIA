$file = "E:/ANA/server/agents/tool-agent.cjs"
$content = Get-Content $file -Raw

$old = "5. IMPORTANT: Même si les données sont en anglais, traduis ta réponse en français.``;"
$new = "5. IMPORTANT: Même si les données sont en anglais, traduis ta réponse en français.`n6. Pour web_search: INCLUS TOUJOURS les URLs des sources en format markdown [Titre](url).``;"

$content = $content -replace [regex]::Escape($old), $new
$content | Set-Content $file -NoNewline
Write-Host "Done - Rule 6 added"
