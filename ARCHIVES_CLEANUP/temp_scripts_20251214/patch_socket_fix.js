const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `      try {
        // Émettre le modèle actif à l'interface (dynamique, pas hardcodé)
        socket.emit('chat:model_selected', {
          model: anaConsciousness.CONSCIOUSNESS_MODEL || 'ana-superia-v5',
          reason: 'Conscience Supérieure'
        });`;

const newCode = `      try {
        // Émettre le modèle actif à l'interface (dynamique, pas hardcodé)
        // FIX 2025-12-13: Vérifier que socket existe avant emit (HTTP requests n'ont pas socket)
        if (typeof socket !== 'undefined' && socket && socket.emit) {
          socket.emit('chat:model_selected', {
            model: anaConsciousness.CONSCIOUSNESS_MODEL || 'ana-superia-v5',
            reason: 'Conscience Supérieure'
          });
        }`;

if (content.includes('FIX 2025-12-13: Vérifier que socket existe')) {
  console.log('SKIP: Socket fix already applied');
} else if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Socket fix applied!');
} else {
  console.log('ERROR: Old code not found');
}
