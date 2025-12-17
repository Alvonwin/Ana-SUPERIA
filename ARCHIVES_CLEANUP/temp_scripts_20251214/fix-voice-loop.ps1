$file = "E:/ANA/ana-interface/src/pages/ChatPage.jsx"
$content = Get-Content $file -Raw

$old = @"
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Envoyer via socket
"@

$new = @"
    // Ajouter message Ana vide avec streaming:true
    const anaMsg = {
      id: Date.now() + 1,
      sender: 'ana',
      text: '',
      timestamp: new Date(),
      streaming: true
    };

    setMessages(prev => [...prev, userMsg, anaMsg]);
    setIsLoading(true);

    // Envoyer via socket
"@

$content = $content.Replace($old, $new)
$content | Set-Content $file -NoNewline
Write-Host "Fix applied to handleVoiceLoopTranscript"
