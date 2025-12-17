$file = "E:\ANA\server\ana-core.cjs"
$backup = "E:\ANA\server\ana-core.cjs.backup_memory_bypass_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Create backup
Copy-Item $file $backup
Write-Host "Backup created: $backup"

# Read file content
$content = Get-Content $file -Raw -Encoding UTF8

# Define old and new strings
$old = @'
        // Build optimized context with token budget
        const contextResult = await contextSelector.buildContext(message, sources, {
          model: model,
          tokenBudget: 4000,  // Reserve tokens for context
          diversitySources: true,
          minRelevance: 0.25
        });

        memoryContext = contextResult.context;
        contextStats = contextResult.stats;

        if (contextStats && contextStats.selectedCount > 0) {
          console.log(`?? Context selected: ${contextStats.selectedCount}/${contextStats.candidatesCount} items (${contextStats.totalTokens} tokens)`);
        }
      } catch (contextError) {
        // Fallback to simple memory context
        console.log('?? Context selection fallback:', contextError.message);
        memoryContext = memory.getContext();
      }
'@

$new = @'
        // === MEMORY TASK TYPE: Bypass RAG, use full context (Perplexity recommendation) ===
        // Le RAG filtre trop agressivement les faits personnels (ex: voiture Mitsubishi)
        // Pour taskType='memory', on utilise le contexte complet comme le REST API
        if (taskType === 'memory') {
          console.log('[MEMORY MODE] Bypass RAG - Using full context for memory question');
          const fullContext = memory.getContext();

          // Formater avec instructions claires (comme REST API ligne 1488-1505)
          memoryContext = '=== MEMOIRE DE CONVERSATION ===\n' +
            '**IMPORTANT: LIS ATTENTIVEMENT L\'HISTORIQUE CI-DESSOUS.**\n' +
            'Tu dois UTILISER ces informations pour repondre aux questions d\'Alain.\n\n' +
            'FORMAT:\n' +
            '- ## Alain: = ce qu\'Alain a dit\n' +
            '- ## Ana: = tes reponses precedentes (Ana = TOI)\n\n' +
            'Si Alain demande quelque chose qui est DANS cet historique, tu DOIS le trouver et repondre.\n' +
            'Par exemple: Si Alain a dit "Ma voiture c\'est: Mitsubishi", tu SAIS que sa voiture est Mitsubishi.\n\n' +
            'HISTORIQUE:\n\n' + fullContext + '\n=== FIN DE L\'HISTORIQUE ===';

          contextStats = { selectedCount: 1, candidatesCount: 1, totalTokens: Math.ceil(fullContext.length / 4), memoryBypass: true };
          console.log('[MEMORY MODE] Full context loaded:', fullContext.length, 'chars');
        } else {
          // Build optimized context with token budget (for non-memory tasks)
          const contextResult = await contextSelector.buildContext(message, sources, {
            model: model,
            tokenBudget: 4000,  // Reserve tokens for context
            diversitySources: true,
            minRelevance: 0.25
          });

          memoryContext = contextResult.context;
          contextStats = contextResult.stats;

          if (contextStats && contextStats.selectedCount > 0) {
            console.log('Context selected:', contextStats.selectedCount + '/' + contextStats.candidatesCount, 'items (' + contextStats.totalTokens + ' tokens)');
          }
        }
      } catch (contextError) {
        // Fallback to simple memory context
        console.log('Context selection fallback:', contextError.message);
        memoryContext = memory.getContext();
      }
'@

# Check if old string exists
if ($content.Contains('// Build optimized context with token budget')) {
    Write-Host "Found target string. Applying patch..."
    $content = $content.Replace($old, $new)
    Set-Content $file -Value $content -NoNewline -Encoding UTF8
    Write-Host "SUCCESS: Memory bypass patch applied!"
} else {
    Write-Host "ERROR: Target string not found in file"
}
