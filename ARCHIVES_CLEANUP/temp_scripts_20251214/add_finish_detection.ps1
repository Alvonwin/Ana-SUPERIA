$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

$search = @'
        for (const block of jsonBlocks) {
          try {
            const parsed = JSON.parse(block);
            // Vérifier structure valide tool call (arguments peut être {})
            if (parsed.name && typeof parsed.arguments !== 'undefined' && TOOL_IMPLEMENTATIONS[parsed.name]) {
'@

$replace = @'
        for (const block of jsonBlocks) {
          try {
            const parsed = JSON.parse(block);

            // FINISH TOKEN DETECTION - Arrêt explicite demandé par le LLM
            if (parsed.type === 'FINISH') {
              console.log(`🏁 [ToolAgent] FINISH token détecté: ${parsed.summary || 'Tâche terminée'}`);
              return {
                success: true,
                finished: true,
                answer: parsed.summary || parsed.content || 'Tâche terminée avec succès.',
                messages: messages,
                loopsUsed: loopCount,
                model: model
              };
            }

            // Vérifier structure valide tool call (arguments peut être {})
            if (parsed.name && typeof parsed.arguments !== 'undefined' && TOOL_IMPLEMENTATIONS[parsed.name]) {
'@

$content = $content.Replace($search, $replace)
Set-Content $file -Value $content -NoNewline
Write-Host "FINISH token detection added!"
