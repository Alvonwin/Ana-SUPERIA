$file = "E:/ANA/server/ana-core.cjs"
$content = Get-Content $file -Raw

$old = @"
        // FIX PERPLEXITY: Émettre model_selected pour l'interface
        socket.emit('chat:model_selected', {
          model: 'qwen2.5-coder:7b (Tool Agent)',
          reason: 'Tool agent (keywords)',
          provider: 'tools',
          taskType: 'tools'
        });

"@

$content = $content.Replace($old, "")
$content | Set-Content $file -NoNewline
Write-Host "Done - Removed premature QWEN emit"
