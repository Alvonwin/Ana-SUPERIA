$file = 'E:/ANA/server/ana-core.cjs'
$content = Get-Content $file -Raw

$search = @'
    // TOOLS routing - call ToolAgent directly
    if (model === 'tools') {
'@

$replace = @'
    // TIME BYPASS - Retourne heure directement sans LLM
    if (model === 'time_bypass') {
      console.log('⏰ [TIME_BYPASS] Reponse directe heure');
      const now = new Date();
      const options = {
        timeZone: 'America/Montreal',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      const heureLocale = now.toLocaleString('fr-CA', options);
      response = { response: `Il est ${heureLocale}.` };
    }
    // TOOLS routing - call ToolAgent directly
    else if (model === 'tools') {
'@

$content = $content.Replace($search, $replace)
Set-Content $file -Value $content -NoNewline
Write-Host "Time bypass handler ajoute!"
