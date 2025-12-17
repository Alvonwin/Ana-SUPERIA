$file = 'E:/ANA/server/ana-core.cjs'
$content = Get-Content $file -Raw

$search = @'
    const msgLower = message.toLowerCase();

    // TOOLS tasks - PRIORITY routing to ToolAgent (EXPANDED 2025-12-08)
'@

$replace = @'
    const msgLower = message.toLowerCase();

    // BYPASS DIRECT pour questions d'heure (evite hallucination LLM)
    const timeKeywords = ['quelle heure', 'heure est-il', 'heure actuelle', 'l\'heure'];
    if (timeKeywords.some(kw => msgLower.includes(kw))) {
      return { model: 'time_bypass', reason: 'Question heure - bypass direct' };
    }

    // TOOLS tasks - PRIORITY routing to ToolAgent (EXPANDED 2025-12-08)
'@

$content = $content.Replace($search, $replace)
Set-Content $file -Value $content -NoNewline
Write-Host "Time bypass ajoute dans classifyTask!"
