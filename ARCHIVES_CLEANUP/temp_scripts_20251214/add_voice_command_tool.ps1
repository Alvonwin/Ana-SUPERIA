$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# 1. Ajouter import voice-command-parser (apres visionHandler)
$importSearch = "const visionHandler = new LlamaVisionHandler();"
$importReplace = @'
const visionHandler = new LlamaVisionHandler();
const voiceParser = require('../core/voice-command-parser.cjs');
'@
$content = $content.Replace($importSearch, $importReplace)

# 2. Ajouter execute_voice_command dans validToolNames
$validSearch = "'debug_screenshot', 'analyze_code_screenshot'"
$validReplace = "'debug_screenshot', 'analyze_code_screenshot', 'execute_voice_command'"
$content = $content.Replace($validSearch, $validReplace)

Set-Content $file -Value $content -NoNewline
Write-Host "Voice parser import and validToolNames added!"
