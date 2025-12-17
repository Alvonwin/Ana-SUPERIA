$file = "E:/ANA/ana-interface/src/pages/ChatPage.jsx"
$content = Get-Content $file -Raw

# Pattern plus simple - juste remplacer la ligne setMessages
$pattern = "setMessages\(prev => \[\.\.\\.prev, userMsg\]\);"

$replacement = @"
// Ajouter message Ana vide avec streaming:true
    const anaMsg = {
      id: Date.now() + 1,
      sender: 'ana',
      text: '',
      timestamp: new Date(),
      streaming: true
    };

    setMessages(prev => [...prev, userMsg, anaMsg]);
"@

$content = $content -replace $pattern, $replacement
$content | Set-Content $file -NoNewline
Write-Host "Fix applied"
