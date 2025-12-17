$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# 1. Ajouter import architect-agent (apres voiceParser)
$importSearch = "const voiceParser = require('../core/voice-command-parser.cjs');"
$importReplace = @'
const voiceParser = require('../core/voice-command-parser.cjs');
const architectAgent = require('./architect-agent.cjs');
'@
$content = $content.Replace($importSearch, $importReplace)

# 2. Ajouter ask_architect et review_code dans validToolNames
$validSearch = "'execute_voice_command'"
$validReplace = "'execute_voice_command', 'ask_architect', 'review_code'"
$content = $content.Replace($validSearch, $validReplace)

Set-Content $file -Value $content -NoNewline
Write-Host "Architect import and validToolNames added!"
