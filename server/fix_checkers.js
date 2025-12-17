const fs = require('fs');
const path = 'E:/ANA/server/games/checkers-engine.cjs';
let content = fs.readFileSync(path, 'utf8');

// Ajouter status dans la réponse de play()
content = content.replace(
  'gameOver: anaResult.gameOver || false,',
  "status: anaResult.gameOver ? game.status : 'playing',\n    gameOver: anaResult.gameOver || false,"
);

fs.writeFileSync(path, content);
console.log('Backend checkers corrige');
