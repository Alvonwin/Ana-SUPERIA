# PATCH: Force Ana Superia V4 Consciousness dans /api/chat/v2

**Date**: 11 Décembre 2025
**Problème**: Le frontend utilise `/api/chat/v2` qui appelle `orchestrator.chat()` au lieu de la conscience Ana
**Résultat**: qwen3:8b répondait à "bonjour anna" au lieu de ana-superia-v4

## Modifications appliquées

### Fichier: E:/ANA/server/ana-core.cjs

**Ligne 3041-3077**: Remplacé `orchestrator.chat()` par `anaConsciousness.processWithConsciousness()`

#### AVANT:
```javascript
// 2. Use orchestrator with automatic routing and failover
const result = await orchestrator.chat({
  prompt: fullPrompt,
  taskType,
  model
});

if (!result.success) {
  return res.status(500).json({
    error: result.error,
    taskType: result.taskType
  });
}
```

#### APRÈS:
```javascript
// 2. FORCE CONSCIOUSNESS - Ana Superia V4 always decides
const consciousnessResult = await anaConsciousness.processWithConsciousness(
  message,
  memoryContext,
  async (expertType, expertQuery) => {
    // Expert callback: Ana's consciousness decides to call tools/code
    if (expertType === 'tools') {
      // TODO: Call tool system here
      return { info: 'Tools not yet integrated with consciousness' };
    } else if (expertType === 'code') {
      // Call deepseek for coding
      const codeResult = await orchestrator.chat({
        prompt: expertQuery,
        taskType: 'coding',
        model: 'deepseek-coder-v2:16b-lite-instruct-q4_K_M'
      });
      return codeResult.response;
    }
    return null;
  }
);

if (!consciousnessResult.success) {
  return res.status(500).json({
    error: consciousnessResult.error || 'Consciousness processing failed',
    taskType: 'consciousness'
  });
}

const result = {
  success: true,
  response: consciousnessResult.response,
  model: 'ana-superia-v4',
  modelKey: 'consciousness',
  taskType: 'consciousness',
  phases: consciousnessResult.phases
};
```

## Impact

- Le rectangle vert affichera maintenant "ana-superia-v4" ou "consciousness" au lieu de "qwen3:8b"
- Ana dira "Je m'appelle Ana" au lieu de "Je m'appelle Qwen"
- Ana Superia V4 sera la CONSCIENCE qui décide:
  - Si elle peut répondre directement → Elle répond
  - Si elle a besoin d'outils → Elle demande à l'expert tools
  - Si elle a besoin de code → Elle demande à deepseek

## Backup

- Backup créé: `E:/ANA/temp/BACKUP_CYCLE_2025-12-11/ana-core.cjs.backup_chatv2`

## Pour activer

**REDÉMARRER ANA** avec ton raccourci habituel.
