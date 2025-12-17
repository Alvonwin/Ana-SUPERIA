const fs = require('fs');
let content = fs.readFileSync('E:/ANA/server/ana-core.cjs', 'utf8');
const oldCode = `    } else {
      // Auto-routing based on message content
      const routing = router.classifyTask(message, context || {});
      model = routing.model;
      reason = routing.reason;
    }
    router.activeModel = model;
    router.updateStats(model);`;
const newCode = `    } else {
      // FORCE CONSCIOUSNESS
      model = 'consciousness';
      reason = 'Ana Superia V4 Conscience';
    }
    router.activeModel = model || 'consciousness';
    router.updateStats(model || 'consciousness');`;
fs.copyFileSync('E:/ANA/server/ana-core.cjs', 'E:/ANA/temp/BACKUP_CYCLE_2025-12-11/ana-core.cjs.backup_consciousness');
content = content.replace(oldCode, newCode);
fs.writeFileSync('E:/ANA/server/ana-core.cjs', content, 'utf8');
console.log('Done');
