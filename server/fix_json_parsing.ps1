$file = 'E:/ANA/server/intelligence/skill-learner.cjs'
$content = Get-Content $file -Raw

# Ajout de la fonction cleanJsonString apres la ligne SKILLS_DIR
$cleanFunc = @"

/**
 * Nettoie les caracteres de controle invalides dans une chaine JSON
 * Fix pour: Bad control character in string literal
 * Garde newline, carriage return, tab qui sont valides en JSON
 */
function cleanJsonString(str) {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}
"@

$content = $content -replace "(const SKILLS_DIR[^;]+;)", "`$1`n$cleanFunc"

# Modifier les 2 lignes de parsing JSON
$content = $content -replace 'const parsed = JSON\.parse\(jsonMatch\[0\]\);', 'const parsed = JSON.parse(cleanJsonString(jsonMatch[0]));'
$content = $content -replace 'const learning = JSON\.parse\(jsonMatch\[0\]\);', 'const learning = JSON.parse(cleanJsonString(jsonMatch[0]));'

Set-Content $file -Value $content -NoNewline
Write-Host 'Fix applied successfully'
