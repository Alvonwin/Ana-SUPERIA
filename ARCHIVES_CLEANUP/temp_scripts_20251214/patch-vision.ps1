$source = "E:/ANA/server/ana-core.cjs"
$dest = "E:/ANA/temp/ana-core-PATCHED.cjs"

$content = Get-Content $source -Raw

# Ajouter visionPrompt avant "// Vision: Utiliser"
$visionPromptDef = @"
        // FIX 2025-12-05: Prompt vision anti-hallucination
        const visionPrompt = `Décris UNIQUEMENT ce que tu VOIS dans cette image.
RÈGLES: Décris SEULEMENT les éléments visibles. Si tu vois du texte, retranscris-le EXACTEMENT. NE JAMAIS inventer. Réponds en français.
Question: `${message}`;

"@

$oldPattern = "        // Vision: Utiliser /api/chat avec format messages \+ images"
$newPattern = $visionPromptDef + "        // Vision: Utiliser /api/chat avec format messages + images"

$content = $content -replace $oldPattern, $newPattern

# Remplacer fullPrompt par visionPrompt dans le bloc vision
$content = $content -replace "content: fullPrompt,", "content: visionPrompt,"

$content | Set-Content $dest -NoNewline
Write-Host "Patched to $dest"
