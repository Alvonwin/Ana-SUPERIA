$file = "E:\ANA\server\ana-core.cjs"
$backup = "E:\ANA\server\ana-core.cjs.backup_memo_system_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

Copy-Item $file $backup
Write-Host "Backup: $backup"

$content = Get-Content $file -Raw -Encoding UTF8

# Find and replace the MEMORY MODE section to use system message
$old = @'
        // === MEMORY TASK: Use MEMO_PERSONAL + full context ===
        if (taskType === 'memory') {
          console.log('[MEMORY MODE] Building context with personal facts at top');
          const memoBlock = buildMemoPersonalBlock();
          const fullContext = memory.getContext();

          memoryContext = memoBlock +
            '=== HISTORIQUE DE CONVERSATION ===\n' +
            'INSTRUCTION: Reponds en utilisant les faits dans [MEMO_PERSONAL] ci-dessus.\n' +
            'Si la reponse est dans MEMO_PERSONAL, utilise-la directement.\n\n' +
            fullContext + '\n=== FIN ===';

          contextStats = { selectedCount: 1, candidatesCount: 1, totalTokens: Math.ceil(fullContext.length / 4), memoLoaded: true };
          console.log('[MEMORY MODE] Context built:', memoryContext.length, 'chars, memo:', memoBlock.length, 'chars');
        }
'@

$new = @'
        // === MEMORY TASK: MEMO as separate system message (Perplexity fix) ===
        if (taskType === 'memory') {
          console.log('[MEMORY MODE] Using MEMO as separate system message');
          const memoBlock = buildMemoPersonalBlock();
          // Limit history to 10KB to give more weight to MEMO
          let fullContext = memory.getContext();
          if (fullContext.length > 10000) {
            fullContext = fullContext.slice(-10000);
            const firstMarker = fullContext.search(/^##/m);
            if (firstMarker > 0) fullContext = fullContext.slice(firstMarker);
            console.log('[MEMORY MODE] History limited to 10KB');
          }

          // Store MEMO separately - will be injected as system message later
          memoryContext = '__MEMO_SYSTEM__' + memoBlock + '__END_MEMO__' + fullContext;

          contextStats = { selectedCount: 1, candidatesCount: 1, totalTokens: Math.ceil(fullContext.length / 4), memoLoaded: true, memoAsSystem: true };
          console.log('[MEMORY MODE] MEMO:', memoBlock.length, 'chars, History:', fullContext.length, 'chars');
        }
'@

if ($content.Contains('[MEMORY MODE] Building context with personal facts at top')) {
    Write-Host "PATCH 1: Updating MEMORY MODE section..."
    $content = $content.Replace($old, $new)
    Write-Host "PATCH 1 SUCCESS"
} else {
    Write-Host "PATCH 1: Target not found"
}

# Find the messages array building section and add MEMO as system message
$oldMessages = @'
        // Message actuel de l'utilisateur
        messages.push({ role: 'user', content: message });
'@

$newMessages = @'
        // Check if MEMO should be injected as separate system message (for memory tasks)
        if (memoryContext && memoryContext.startsWith('__MEMO_SYSTEM__')) {
          const memoEnd = memoryContext.indexOf('__END_MEMO__');
          if (memoEnd > 0) {
            const memoContent = memoryContext.slice(15, memoEnd); // Remove __MEMO_SYSTEM__ prefix
            const historyContent = memoryContext.slice(memoEnd + 12); // Remove __END_MEMO__

            // MEMO as high-priority system message
            messages.push({
              role: 'system',
              content: 'MEMOIRE PERSONNELLE D\'ALAIN - TU DOIS UTILISER CES INFORMATIONS:\n' + memoContent + '\nQUAND ON TE DEMANDE UNE INFO CI-DESSUS, REPONDS AVEC!'
            });

            // History as context
            if (historyContent.trim()) {
              messages.push({
                role: 'system',
                content: 'Historique recent:\n' + historyContent.slice(0, 5000)
              });
            }
            console.log('[MEMO] Injected as separate system message');
          }
        }

        // Message actuel de l'utilisateur
        messages.push({ role: 'user', content: message });
'@

if ($content.Contains('// Message actuel de l''utilisateur') -and $content.Contains("messages.push({ role: 'user', content: message });")) {
    Write-Host "PATCH 2: Adding MEMO system message injection..."
    $content = $content.Replace($oldMessages, $newMessages)
    Write-Host "PATCH 2 SUCCESS"
} else {
    Write-Host "PATCH 2: Target not found"
}

Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host "DONE"
