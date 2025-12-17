const fs = require('fs');

// Backup
fs.copyFileSync(
  'E:/ANA/server/ana-core.cjs',
  'E:/ANA/temp/BACKUP_CYCLE_2025-12-11/ana-core.cjs.backup_chatv2'
);

let content = fs.readFileSync('E:/ANA/server/ana-core.cjs', 'utf8');

// OLD CODE: orchestrator.chat (lines 3041-3053)
const oldCode = `    // 2. Use orchestrator with automatic routing and failover
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
    }`;

// NEW CODE: Ana consciousness with expert callback
const newCode = `    // 2. FORCE CONSCIOUSNESS - Ana Superia V4 always decides
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
    };`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('E:/ANA/server/ana-core.cjs', content, 'utf8');
console.log('✅ /api/chat/v2 modifié pour utiliser Ana Consciousness');
