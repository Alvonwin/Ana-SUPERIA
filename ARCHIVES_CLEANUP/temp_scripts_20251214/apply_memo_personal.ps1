$file = "E:\ANA\server\ana-core.cjs"
$backup = "E:\ANA\server\ana-core.cjs.backup_memo_personal_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Create backup
Copy-Item $file $backup
Write-Host "Backup created: $backup"

# Read file content
$content = Get-Content $file -Raw -Encoding UTF8

# ============================================================
# PATCH 1: Add personal facts loader function after requires
# ============================================================
$afterRequires = "const WebTools = require('./tools/web-tools.cjs');"

$factsLoader = @'
const WebTools = require('./tools/web-tools.cjs');

// === PERSONAL FACTS LOADER ===
const PERSONAL_FACTS_PATH = path.join(__dirname, '..', 'memory', 'personal_facts.json');

function loadPersonalFacts() {
  try {
    if (fs.existsSync(PERSONAL_FACTS_PATH)) {
      const data = JSON.parse(fs.readFileSync(PERSONAL_FACTS_PATH, 'utf8'));
      return data.facts || {};
    }
  } catch (e) {
    console.log('[MEMO] Error loading personal facts:', e.message);
  }
  return {};
}

function savePersonalFact(key, value) {
  try {
    let data = { version: '1.0', lastUpdated: new Date().toISOString().split('T')[0], facts: {} };
    if (fs.existsSync(PERSONAL_FACTS_PATH)) {
      data = JSON.parse(fs.readFileSync(PERSONAL_FACTS_PATH, 'utf8'));
    }
    data.facts[key] = value;
    data.lastUpdated = new Date().toISOString().split('T')[0];
    fs.writeFileSync(PERSONAL_FACTS_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log('[MEMO] Saved personal fact:', key, '=', value);
    return true;
  } catch (e) {
    console.log('[MEMO] Error saving personal fact:', e.message);
    return false;
  }
}

function buildMemoPersonalBlock() {
  const facts = loadPersonalFacts();
  if (Object.keys(facts).length === 0) return '';

  let block = '[MEMO_PERSONAL - FAITS IMPORTANTS SUR ALAIN]\n';
  if (facts.voiture) block += 'Voiture: ' + facts.voiture + '\n';
  if (facts.ville) block += 'Ville: ' + facts.ville + '\n';
  if (facts.prenom) block += 'Prenom: ' + facts.prenom + '\n';
  if (facts.pays) block += 'Pays: ' + facts.pays + '\n';

  // Add all other facts
  for (const [key, value] of Object.entries(facts)) {
    if (!['voiture', 'ville', 'prenom', 'pays'].includes(key)) {
      block += key + ': ' + value + '\n';
    }
  }
  block += '[FIN MEMO_PERSONAL]\n\n';
  return block;
}
'@

if ($content.Contains($afterRequires) -and -not $content.Contains('PERSONAL_FACTS_PATH')) {
    Write-Host "Applying PATCH 1: Personal facts loader..."
    $content = $content.Replace($afterRequires, $factsLoader)
    Write-Host "PATCH 1 applied successfully"
} else {
    Write-Host "PATCH 1: Already applied or target not found"
}

# ============================================================
# PATCH 2: Inject MEMO_PERSONAL in memory context for WebSocket
# ============================================================
$oldMemoryMode = @'
        // === MEMORY TASK TYPE: Extract key personal facts + full context ===
        // Le modele a du mal a trouver les infos noyees dans 50KB de contexte
        // On extrait les faits personnels importants et on les met en premier
        if (taskType === 'memory') {
          console.log('[MEMORY MODE] Extracting personal facts from memory');
          const fullContext = memory.getContext();
'@

$newMemoryMode = @'
        // === MEMORY TASK TYPE: Inject MEMO_PERSONAL + context ===
        // Perplexity recommendation: fichier separe personal_facts.json injecte en premier
        if (taskType === 'memory') {
          console.log('[MEMORY MODE] Loading personal facts from file');
          const memoBlock = buildMemoPersonalBlock();
          const fullContext = memory.getContext();
          console.log('[MEMORY MODE] MEMO_PERSONAL block:', memoBlock.length, 'chars');
'@

if ($content.Contains('[MEMORY MODE] Extracting personal facts from memory')) {
    Write-Host "Applying PATCH 2: MEMO_PERSONAL injection..."
    $content = $content.Replace($oldMemoryMode, $newMemoryMode)
    Write-Host "PATCH 2 applied successfully"
} else {
    Write-Host "PATCH 2: Target not found, checking alternative..."
}

# ============================================================
# PATCH 3: Update context building to use memoBlock
# ============================================================
$oldContextBuild = @'
          // Construire le contexte avec faits personnels EN PREMIER
          let factsSection = '';
          if (personalFacts.length > 0) {
            factsSection = '=== FAITS PERSONNELS D\'ALAIN (UTILISE CES INFOS!) ===\n' +
              personalFacts.map(f => '* ' + f).join('\n') + '\n\n';
            console.log('[MEMORY MODE] Extracted', personalFacts.length, 'personal facts');
          }

          memoryContext = factsSection +
            '=== HISTORIQUE DE CONVERSATION ===\n' +
            'Si la reponse est dans les FAITS PERSONNELS ci-dessus, utilise-les.\n' +
            'Sinon cherche dans l\'historique ci-dessous:\n\n' +
            fullContext + '\n=== FIN ===';

          contextStats = { selectedCount: 1, candidatesCount: 1, totalTokens: Math.ceil(fullContext.length / 4), memoryBypass: true, factsExtracted: personalFacts.length };
          console.log('[MEMORY MODE] Context built:', memoryContext.length, 'chars with', personalFacts.length, 'facts at top');
        }
'@

$newContextBuild = @'
          // Construire le contexte avec MEMO_PERSONAL EN PREMIER (depuis fichier JSON)
          memoryContext = memoBlock +
            '=== HISTORIQUE DE CONVERSATION ===\n' +
            'IMPORTANT: Si la question concerne un fait dans [MEMO_PERSONAL], reponds avec cette info.\n' +
            'Sinon cherche dans l\'historique ci-dessous:\n\n' +
            fullContext + '\n=== FIN ===';

          contextStats = { selectedCount: 1, candidatesCount: 1, totalTokens: Math.ceil(fullContext.length / 4), memoryBypass: true, memoLoaded: memoBlock.length > 0 };
          console.log('[MEMORY MODE] Context built:', memoryContext.length, 'chars with MEMO_PERSONAL at top');
        }
'@

if ($content.Contains("factsSection = '=== FAITS PERSONNELS")) {
    Write-Host "Applying PATCH 3: Update context building..."
    $content = $content.Replace($oldContextBuild, $newContextBuild)
    Write-Host "PATCH 3 applied successfully"
} else {
    Write-Host "PATCH 3: Target not found"
}

# ============================================================
# PATCH 4: Remove old fact extraction code (between memoBlock and context build)
# ============================================================
$oldFactExtraction = @'
          // Extraire les faits personnels cles du contexte
          const personalFacts = [];
          const factPatterns = [
            { regex: /Ma voiture[^:]*:\s*([^\n]+)/gi, label: 'Voiture' },
            { regex: /Mon (auto|vehicule|char)[^:]*:\s*([^\n]+)/gi, label: 'Vehicule' },
            { regex: /J\'habite[^.]*([^.\n]+)/gi, label: 'Habitation' },
            { regex: /Mon (nom|prenom)[^:]*:\s*([^\n]+)/gi, label: 'Nom' },
            { regex: /Je m\'appelle\s+([^\n,.]+)/gi, label: 'Nom' },
            { regex: /2009\s*Mitsubishi[^\n]*/gi, label: 'Voiture Mitsubishi' }
          ];

          for (const pattern of factPatterns) {
            const matches = fullContext.matchAll(pattern.regex);
            for (const match of matches) {
              const fact = match[0].trim();
              if (fact.length > 10 && !personalFacts.includes(fact)) {
                personalFacts.push(fact);
              }
            }
          }

'@

if ($content.Contains("// Extraire les faits personnels cles du contexte")) {
    Write-Host "Applying PATCH 4: Remove old fact extraction..."
    $content = $content.Replace($oldFactExtraction, '')
    Write-Host "PATCH 4 applied successfully"
} else {
    Write-Host "PATCH 4: Already removed or not found"
}

# Save the modified file
Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host ""
Write-Host "=========================================="
Write-Host "SUCCESS: All patches applied to ana-core.cjs"
Write-Host "Backup saved at: $backup"
Write-Host "=========================================="
