$file = 'E:/ANA/server/agents/tool-agent.cjs'
$content = Get-Content $file -Raw

$search = 'const result = await impl(parsedArgs);
          messages.push({'

$replace = 'const result = await impl(parsedArgs);
          // DEBUG: Log le resultat exact de l''outil
          console.log(`🛠️ TOOL ${toolName} RESULT:`, JSON.stringify(result, null, 2));
          messages.push({'

# Use simple string replace
$content = $content.Replace($search, $replace)

Set-Content $file -Value $content -NoNewline
Write-Host "Done!"
