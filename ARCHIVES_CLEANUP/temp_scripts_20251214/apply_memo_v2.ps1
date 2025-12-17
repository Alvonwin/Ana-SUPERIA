$file = "E:\ANA\server\ana-core.cjs"
$backup = "E:\ANA\server\ana-core.cjs.backup_memo_v2_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Create backup
Copy-Item $file $backup
Write-Host "Backup created: $backup"

# Read file content
$content = Get-Content $file -Raw -Encoding UTF8

# ============================================================
# PATCH 1: Add personal facts functions at the TOP (after first require block)
# We target the line just after 'const axios = require('axios');'
# ============================================================
$insertAfter = "const axios = require('axios');"

$factsCode = @'
const axios = require('axios');

// === PERSONAL FACTS LOADER (for memory questions) ===
const PERSONAL_FACTS_PATH = require('path').join(__dirname, '..', 'memory', 'personal_facts.json');

function loadPersonalFacts() {
  try {
    if (require('fs').existsSync(PERSONAL_FACTS_PATH)) {
      const data = JSON.parse(require('fs').readFileSync(PERSONAL_FACTS_PATH, 'utf8'));
      return data.facts || {};
    }
  } catch (e) {
    console.log('[MEMO] Error loading personal facts:', e.message);
  }
  return {};
}

function buildMemoPersonalBlock() {
  const facts = loadPersonalFacts();
  if (Object.keys(facts).length === 0) return '';

  let block = '[MEMO_PERSONAL - FAITS IMPORTANTS SUR ALAIN - UTILISE CES INFOS!]\n';
  if (facts.voiture) block += '* VOITURE: ' + facts.voiture + '\n';
  if (facts.ville) block += '* VILLE: ' + facts.ville + '\n';
  if (facts.prenom) block += '* PRENOM: ' + facts.prenom + '\n';
  if (facts.pays) block += '* PAYS: ' + facts.pays + '\n';
  for (const [key, value] of Object.entries(facts)) {
    if (!['voiture', 'ville', 'prenom', 'pays'].includes(key)) {
      block += '* ' + key.toUpperCase() + ': ' + value + '\n';
    }
  }
  block += '[FIN MEMO_PERSONAL]\n\n';
  console.log('[MEMO] Personal facts block built:', block.length, 'chars');
  return block;
}
// === END PERSONAL FACTS LOADER ===
'@

if ($content.Contains($insertAfter) -and -not $content.Contains('PERSONAL_FACTS_PATH')) {
    Write-Host "Applying PATCH 1: Insert personal facts functions at top..."
    $content = $content.Replace($insertAfter, $factsCode)
    Write-Host "PATCH 1 SUCCESS"
} elseif ($content.Contains('PERSONAL_FACTS_PATH')) {
    Write-Host "PATCH 1: Functions already exist, skipping"
} else {
    Write-Host "PATCH 1 FAILED: Target not found"
}

# ============================================================
# PATCH 2: Replace the context building for memory tasks
# Target: The section that starts with "// Build optimized context with token budget"
# ============================================================
$oldContextBuild = @'
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

$newContextBuild = @'
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
        } else {
          // Non-memory tasks: use RAG context selection
          const contextResult = await contextSelector.buildContext(message, sources, {
            model: model,
            tokenBudget: 4000,
            diversitySources: true,
            minRelevance: 0.25
          });

          memoryContext = contextResult.context;
          contextStats = contextResult.stats;

          if (contextStats && contextStats.selectedCount > 0) {
            console.log('Context selected:', contextStats.selectedCount + '/' + contextStats.candidatesCount, 'items');
          }
        }
      } catch (contextError) {
        console.log('Context selection fallback:', contextError.message);
        memoryContext = memory.getContext();
      }
'@

if ($content.Contains('// Build optimized context with token budget')) {
    Write-Host "Applying PATCH 2: Replace context building for memory tasks..."
    $content = $content.Replace($oldContextBuild, $newContextBuild)
    Write-Host "PATCH 2 SUCCESS"
} else {
    Write-Host "PATCH 2 FAILED: Target not found (may already be patched)"
}

# Save the modified file
Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host ""
Write-Host "=========================================="
Write-Host "PATCHES APPLIED"
Write-Host "Backup: $backup"
Write-Host "=========================================="
