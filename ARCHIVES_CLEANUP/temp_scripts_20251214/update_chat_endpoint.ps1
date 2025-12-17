# Script pour modifier le /api/chat et utiliser la session memory en priorite
$file = 'E:/ANA/server/ana-core.cjs'
$content = Get-Content $file -Raw -Encoding UTF8

# Trouver et remplacer la section contextInstructions
$oldContext = @'
    // Formatter le contexte avec des instructions claires pour le LLM
    const contextInstructions = (memoryContext || chromaMemories) ? `
=== M�MOIRE DE CONVERSATION ===
**IMPORTANT: LIS ATTENTIVEMENT L'HISTORIQUE CI-DESSOUS.**
Tu dois UTILISER ces informations pour r�pondre aux questions d'Alain.

FORMAT:
- ## Alain: = ce qu'Alain a dit
- ## Ana: = tes r�ponses pr�c�dentes (Ana = TOI)

Si Alain demande quelque chose qui est DANS cet historique, tu DOIS le trouver et r�pondre.
Par exemple: Si Alain a dit "Ma voiture c'est: Mitsubishi", tu SAIS que sa voiture est Mitsubishi.

HISTORIQUE:

${memoryContext}
${chromaMemories}
=== FIN DE L'HISTORIQUE ===

` : '';
    const fullPrompt = contextInstructions + `Alain: ${message}`;
'@

$newContext = @'
    // SESSION CONTEXT: Les 20 derniers messages (PRIORITE MAXIMALE)
    const sessionContext = memory.getSessionContext();

    // Formatter le contexte avec instructions claires - SESSION EN PREMIER
    let contextInstructions = '';

    // 1. Session courte (priorite maximale - toujours visible)
    if (sessionContext) {
      contextInstructions += `
=== CONVERSATION EN COURS (TU DOIS LIRE CECI EN PREMIER!) ===
**CRITIQUE: Voici les derniers echanges. Tu DOIS te souvenir de TOUT ce qui est dit ici.**
Si Alain te pose une question sur quelque chose dit dans cette session, LA REPONSE EST ICI.

${sessionContext}
=== FIN CONVERSATION EN COURS ===

`;
    }

    // 2. Memoire long terme (contexte supplementaire)
    if (memoryContext || chromaMemories) {
      contextInstructions += `
=== MEMOIRE LONG TERME ===
Historique des conversations precedentes:

${memoryContext}
${chromaMemories}
=== FIN MEMOIRE ===

`;
    }

    const fullPrompt = contextInstructions + `Alain: ${message}`;
'@

$content = $content.Replace($oldContext, $newContext)

Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host "Chat endpoint updated with session priority!"
