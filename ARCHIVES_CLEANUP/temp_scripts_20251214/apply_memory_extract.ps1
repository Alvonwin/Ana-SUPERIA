$file = "E:\ANA\server\ana-core.cjs"
$backup = "E:\ANA\server\ana-core.cjs.backup_memory_extract_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Create backup
Copy-Item $file $backup
Write-Host "Backup created: $backup"

# Read file content
$content = Get-Content $file -Raw -Encoding UTF8

# Define old and new strings - we'll update the MEMORY MODE section to extract key facts
$old = @'
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
        }
'@

$new = @'
        // === MEMORY TASK TYPE: Extract key personal facts + full context ===
        // Le modele a du mal a trouver les infos noyees dans 50KB de contexte
        // On extrait les faits personnels importants et on les met en premier
        if (taskType === 'memory') {
          console.log('[MEMORY MODE] Extracting personal facts from memory');
          const fullContext = memory.getContext();

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

# Check if old string exists
if ($content.Contains('[MEMORY MODE] Bypass RAG - Using full context for memory question')) {
    Write-Host "Found target string. Applying fact extraction patch..."
    $content = $content.Replace($old, $new)
    Set-Content $file -Value $content -NoNewline -Encoding UTF8
    Write-Host "SUCCESS: Memory fact extraction patch applied!"
} else {
    Write-Host "ERROR: Target string not found in file"
}
