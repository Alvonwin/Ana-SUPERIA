/**
 * Script pour appliquer OPTIM 2 - Lazy maintenance
 */
const fs = require('fs');

const file = 'E:/ANA/temp/tiered-memory-optimized.cjs';
let content = fs.readFileSync(file, 'utf8');

const old = `      // Run maintenance on startup
      await this.runMaintenance();`;

const replacement = `      // PERF OPTIM 2025-12-08: Lazy maintenance - defer 30s after startup
      // Gain estime: 500ms-1s au demarrage
      setTimeout(() => {
        this.runMaintenance().catch(err => {
          console.log('[TieredMemory] Background maintenance error:', err.message);
        });
      }, 30000);  // 30 seconds delay`;

if (content.includes(old)) {
  content = content.replace(old, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('[OPTIM 2] Lazy maintenance - APPLIED');
} else {
  console.log('[OPTIM 2] Pattern not found in file');
}
