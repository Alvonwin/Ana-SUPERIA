$file = "E:/ANA/server/agents/tool-agent.cjs"
$content = Get-Content $file -Raw

$old = "6. Pour web_search: INCLUS TOUJOURS les URLs des sources en format markdown [Titre](url).``;"
$new = "6. Pour web_search: Presente CHAQUE resultat avec son titre en lien markdown [Titre](url) SUIVI d'un resume/description du contenu.``;"

$content = $content -replace [regex]::Escape($old), $new
$content | Set-Content $file -NoNewline
Write-Host "Done - Rule 6 updated with description requirement"
