$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

$search = @'
        for (const block of jsonBlocks) {
          try {
            const parsed = JSON.parse(block);
            if (parsed.name && typeof parsed.arguments !== 'undefined' && TOOL_IMPLEMENTATIONS[parsed.name]) {
              toolCalls.push({
                function: {
                  name: parsed.name,
                  arguments: parsed.arguments || parsed.args || {}
                }
'@

$replace = @'
        for (const block of jsonBlocks) {
          try {
            const parsed = JSON.parse(block);

            // FINISH TOKEN DETECTION V2 - Arrêt explicite demandé par le LLM
            if (parsed.type === 'FINISH') {
              console.log(`🏁 [ToolAgentV2] FINISH token détecté: ${parsed.summary || 'Tâche terminée'}`);
              loopController.stop('finish_token');
              return {
                success: true,
                finished: true,
                answer: parsed.summary || parsed.content || 'Tâche terminée avec succès.',
                messages: messages,
                stats: loopController.getStats()
              };
            }

            if (parsed.name && typeof parsed.arguments !== 'undefined' && TOOL_IMPLEMENTATIONS[parsed.name]) {
              toolCalls.push({
                function: {
                  name: parsed.name,
                  arguments: parsed.arguments || parsed.args || {}
                }
'@

$content = $content.Replace($search, $replace)
Set-Content $file -Value $content -NoNewline
Write-Host "FINISH token detection V2 added!"
