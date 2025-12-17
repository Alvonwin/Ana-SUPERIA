$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

# 1. Ajouter import LlamaVisionHandler (apres BashTools)
$importSearch = "const BashTools = require('../tools/bash-tools.cjs');"
$importReplace = @'
const BashTools = require('../tools/bash-tools.cjs');
const LlamaVisionHandler = require('../../intelligence/vision/llama_vision_handler.cjs');
const visionHandler = new LlamaVisionHandler();
'@
$content = $content.Replace($importSearch, $importReplace)

# 2. Ajouter describe_image et debug_screenshot dans validToolNames
$validSearch = "'generate_animation', 'generate_video', 'image_to_image', 'inpaint_image'"
$validReplace = "'generate_animation', 'generate_video', 'image_to_image', 'inpaint_image', 'debug_screenshot', 'analyze_code_screenshot'"
$content = $content.Replace($validSearch, $validReplace)

Set-Content $file -Value $content -NoNewline
Write-Host "Vision imports and validToolNames added!"
