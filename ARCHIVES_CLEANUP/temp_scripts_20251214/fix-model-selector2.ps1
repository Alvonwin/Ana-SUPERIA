$file = "E:/ANA/server/ana-core.cjs"
$content = Get-Content $file -Raw

# Chercher et supprimer le bloc avec regex
$pattern = "        // FIX PERPLEXITY: Émettre model_selected pour l'interface\r?\n        socket\.emit\('chat:model_selected', \{\r?\n          model: 'qwen2\.5-coder:7b \(Tool Agent\)',\r?\n          reason: 'Tool agent \(keywords\)',\r?\n          provider: 'tools',\r?\n          taskType: 'tools'\r?\n        \}\);\r?\n\r?\n"

$content = $content -replace $pattern, ""
$content | Set-Content $file -NoNewline
Write-Host "Done - Removed premature QWEN emit via regex"
