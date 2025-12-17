/**
 * FIX 2025-12-16: Repair tool filtering in runToolAgentV2
 *
 * Problem: System prompt contains descriptions of ALL 189 tools
 * Solution: Filter tools FIRST, then build system prompt with only filtered tools
 */

const fs = require('fs');

// Read the file
let content = fs.readFileSync('agents/tool-agent.cjs', 'utf8');

// Pattern 1: System prompt creation (lines 7772-7775)
// Current code uses ALL TOOL_DEFINITIONS
const oldSystemPromptCode = `  // System prompt
  const toolNames = TOOL_DEFINITIONS.map(t => t.function.name).join(', ');
  // FIX 2025-12-14: Envoyer les descriptions d'outils, pas juste les noms
  const toolDescriptions = TOOL_DEFINITIONS.map(t => \`- \${t.function.name}: \${t.function.description}\`).join('\\n');
  const systemPrompt = options.systemPrompt ||`;

const newSystemPromptCode = `  // FIX 2025-12-16: Filter tools FIRST, then build system prompt with only filtered tools
  // This dramatically reduces context size (20 tools vs 189 tools)
  const { tools: filteredTools } = await getRelevantToolsHybrid(TOOL_DEFINITIONS, userMessage);
  console.log('[ToolAgentV2] Filtered to', filteredTools.length, 'tools for:', userMessage.substring(0, 40) + '...');

  // System prompt with FILTERED tools only
  const toolNames = filteredTools.map(t => t.function.name).join(', ');
  const toolDescriptions = filteredTools.map(t => \`- \${t.function.name}: \${t.function.description}\`).join('\\n');
  const systemPrompt = options.systemPrompt ||`;

// Pattern 2: Duplicate filtering in loop (line 7935)
const oldLoopCode = `      // Appel LLM via Orchestrateur avec fallback (recherche hybride)
      const { tools: filteredTools } = await getRelevantToolsHybrid(TOOL_DEFINITIONS, userMessage);
      const orchResult = await callWithFallback(contextMessages, filteredTools);`;

const newLoopCode = `      // Appel LLM via Orchestrateur - tools already filtered at start
      const orchResult = await callWithFallback(contextMessages, filteredTools);`;

// Apply fixes
let fixed = false;

if (content.includes(oldSystemPromptCode)) {
  content = content.replace(oldSystemPromptCode, newSystemPromptCode);
  console.log('✅ Fixed system prompt to use filtered tools');
  fixed = true;
} else {
  console.log('⚠️ System prompt pattern not found');
}

if (content.includes(oldLoopCode)) {
  content = content.replace(oldLoopCode, newLoopCode);
  console.log('✅ Removed duplicate filtering in loop');
  fixed = true;
} else {
  console.log('⚠️ Loop code pattern not found');
}

if (fixed) {
  fs.writeFileSync('agents/tool-agent.cjs', content);
  console.log('\n🎉 Fix applied successfully!');
  console.log('System prompt now uses 20 filtered tools instead of 189');
} else {
  console.log('\n❌ No fixes applied - patterns not found');
}
