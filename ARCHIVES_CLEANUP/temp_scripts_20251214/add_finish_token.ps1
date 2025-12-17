$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

$search = @'
6. Pour web_search: Presente CHAQUE resultat avec son titre en lien markdown [Titre](url) SUIVI d'un resume/description du contenu.

ACCÈS MÉMOIRE - FULL UNLOCKED:
'@

$replace = @'
6. Pour web_search: Presente CHAQUE resultat avec son titre en lien markdown [Titre](url) SUIVI d'un resume/description du contenu.
7. QUAND TU AS TERMINÉ une tâche complexe (multi-étapes), signale la fin avec: {"type": "FINISH", "summary": "Ce que tu as accompli"}

ACCÈS MÉMOIRE - FULL UNLOCKED:
'@

$content = $content.Replace($search, $replace)
Set-Content $file -Value $content -NoNewline
Write-Host "FINISH token instruction added to system prompts!"
