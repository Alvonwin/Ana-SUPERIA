const fs = require('fs');

const filePath = 'E:/ANA/server/intelligence/ana-consciousness.cjs';
let content = fs.readFileSync(filePath, 'utf8');

const oldPattern = `    // PHASE 3: Talker
    const finalResponse = await talkerPhase(message, thinkerResult, expertResult, memoryContext);

    console.log('[CONSCIOUSNESS] ✅ Traitement terminé');`;

const newPattern = `    // PHASE 3: Talker (bypass si l'expert a déjà une réponse complète)
    let finalResponse;
    if (expertResult && typeof expertResult === 'string' && expertResult.length > 50) {
      // FIX 2025-12-13: Bypass Talker si l'expert a déjà fourni une réponse complète
      console.log('[CONSCIOUSNESS] ⚡ Bypass Talker - Expert a fourni réponse complète');
      finalResponse = expertResult;
    } else {
      finalResponse = await talkerPhase(message, thinkerResult, expertResult, memoryContext);
    }

    console.log('[CONSCIOUSNESS] ✅ Traitement terminé');`;

if (content.includes('Bypass Talker')) {
  console.log('SKIP: Already patched');
} else if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Bypass Talker patch applied');
} else {
  console.log('ERROR: Pattern not found');
}
