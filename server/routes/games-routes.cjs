/**
 * Games API Routes
 * Endpoints pour tous les jeux avec Ana
 */

const express = require('express');
const router = express.Router();

// Engines
const checkersEngine = require('../games/checkers-engine.cjs');
const tictactoeEngine = require('../games/tictactoe-engine.cjs');
const connect4Engine = require('../games/connect4-engine.cjs');
const rpsEngine = require('../games/rps-engine.cjs');
const hangmanEngine = require('../games/hangman-engine.cjs');
const blackjackEngine = require('../games/blackjack-engine.cjs');
const memoryEngine = require('../games/memory-engine.cjs');
const nimEngine = require('../games/nim-engine.cjs');
const guessEngine = require('../games/guess-engine.cjs');
const chessEngine = require('../games/chess-engine.cjs');
const battleshipEngine = require('../games/battleship-engine.cjs');
const backgammonEngine = require('../games/backgammon-engine.cjs');
const { playCheckers } = require('../games/games-tools.cjs');

// Réactions génériques d'Ana
const REACTIONS = {
  win: ["Bravo! Tu m'as battue! 🎉", "GG! Bien joué! 🏆", "Tu es fort(e)! 👏"],
  lose: ["J'ai gagné! 😄", "Victoire pour moi! 🎯", "Une revanche? 😏"],
  tie: ["Match nul! 🤝", "Égalité parfaite!", "On recommence? 😊"],
  start: ["C'est parti! 🎮", "Allons-y! ✨", "Que le meilleur gagne! 🎯"],
  thinking: ["Hmm, laisse-moi réfléchir...", "Intéressant...", "Je calcule..."]
};

function randomReaction(type) {
  const arr = REACTIONS[type];
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==================== CHECKERS ====================
router.get('/checkers/state', async (req, res) => {
  try {
    const result = await playCheckers({ action: 'state' }, req.query.session || 'default');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/checkers/new', async (req, res) => {
  try {
    const result = await playCheckers({ action: 'new', difficulty: req.body.difficulty }, req.body.session || 'default');
    const state = checkersEngine.getGameState(req.body.session || 'default');
    result.legalMoves = state.legalMoves;
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/checkers/play', async (req, res) => {
  try {
    const result = await playCheckers({ action: 'play', move: req.body.move }, req.body.session || 'default');
    if (result.success && !result.gameOver) {
      const state = checkersEngine.getGameState(req.body.session || 'default');
      result.legalMoves = state.legalMoves;
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/checkers/hint', async (req, res) => {
  try {
    const result = await playCheckers({ action: 'hint' }, req.query.session || 'default');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== TIC-TAC-TOE ====================
router.post('/tictactoe/new', (req, res) => {
  try {
    const result = tictactoeEngine.newGame(req.body.session || 'default');
    result.reaction = randomReaction('start');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/tictactoe/play', (req, res) => {
  try {
    const { row, col } = req.body;
    const result = tictactoeEngine.play(req.body.session || 'default', row, col);
    if (result.gameOver) {
      result.reaction = result.winner === 'player' ? randomReaction('win') :
                        result.winner === 'ana' ? randomReaction('lose') : randomReaction('tie');
    } else if (result.anaMove) {
      result.reaction = randomReaction('thinking');
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/tictactoe/state', (req, res) => {
  try {
    res.json(tictactoeEngine.getState(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== CONNECT 4 ====================
router.post('/connect4/new', (req, res) => {
  try {
    const result = connect4Engine.newGame(req.body.session || 'default');
    result.reaction = randomReaction('start');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/connect4/play', (req, res) => {
  try {
    const result = connect4Engine.play(req.body.session || 'default', req.body.col);
    if (result.gameOver) {
      result.reaction = result.winner === 'player' ? randomReaction('win') :
                        result.winner === 'ana' ? randomReaction('lose') : randomReaction('tie');
    } else if (result.anaMove) {
      result.reaction = randomReaction('thinking');
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/connect4/state', (req, res) => {
  try {
    res.json(connect4Engine.getState(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== ROCK-PAPER-SCISSORS ====================
router.post('/rps/new', (req, res) => {
  try {
    const result = rpsEngine.newGame(req.body.session || 'default');
    result.reaction = "Pierre, Feuille ou Ciseaux? 🎯";
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rps/play', (req, res) => {
  try {
    const result = rpsEngine.play(req.body.session || 'default', req.body.choice);
    if (result.success) {
      if (result.winner === 'player') {
        result.reaction = `${result.anaName} contre ${result.playerName}... Tu gagnes! 😅`;
      } else if (result.winner === 'ana') {
        result.reaction = `${result.anaName} contre ${result.playerName}... Je gagne! 😄`;
      } else {
        result.reaction = `${result.anaName} contre ${result.playerName}... Égalité! 🤝`;
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/rps/state', (req, res) => {
  try {
    res.json(rpsEngine.getState(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== HANGMAN ====================
router.post('/hangman/new', (req, res) => {
  try {
    const result = hangmanEngine.newGame(req.body.session || 'default', req.body.category);
    result.reaction = `J'ai choisi un mot de la catégorie "${result.category}"! ${result.wordLength} lettres. À toi! 🎯`;
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/hangman/guess', (req, res) => {
  try {
    const result = hangmanEngine.guess(req.body.session || 'default', req.body.letter);
    if (result.success) {
      if (result.gameOver) {
        result.reaction = result.winner === 'player' ?
          `Bravo! C'était "${result.word}"! 🎉` :
          `Perdu! Le mot était "${result.word}" 😅`;
      } else if (result.correct) {
        result.reaction = `Oui! Il y a des "${result.letter}"! 👍`;
      } else {
        result.reaction = `Non, pas de "${result.letter}"... ${result.errorsLeft} erreurs restantes! 😬`;
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/hangman/state', (req, res) => {
  try {
    res.json(hangmanEngine.getState(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/hangman/categories', (req, res) => {
  res.json({ categories: hangmanEngine.getCategories() });
});

// ==================== BLACKJACK ====================
router.post('/blackjack/new', (req, res) => {
  try {
    const result = blackjackEngine.newGame(req.body.session || 'default');
    result.reaction = result.isBlackjack ?
      "Blackjack! Tu as 21! 🎉" :
      `Tu as ${result.playerScore}. Hit ou Stand? 🃏`;
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/blackjack/hit', (req, res) => {
  try {
    const result = blackjackEngine.hit(req.body.session || 'default');
    if (result.success) {
      if (result.gameOver) {
        result.reaction = `Tu as tiré ${result.card} et tu as ${result.playerScore}... Bust! Je gagne! 😄`;
      } else {
        result.reaction = `${result.card}! Tu as ${result.playerScore}. Encore? 🃏`;
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/blackjack/stand', (req, res) => {
  try {
    const result = blackjackEngine.stand(req.body.session || 'default');
    if (result.success) {
      if (result.winner === 'player') {
        result.reaction = `J'ai ${result.anaScore}. Tu gagnes avec ${result.playerScore}! 🎉`;
      } else if (result.winner === 'ana') {
        result.reaction = `J'ai ${result.anaScore}. Je gagne! 😄`;
      } else {
        result.reaction = `Égalité à ${result.playerScore}! 🤝`;
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/blackjack/state', (req, res) => {
  try {
    res.json(blackjackEngine.getState(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== MEMORY ====================
router.post('/memory/new', (req, res) => {
  try {
    const result = memoryEngine.newGame(req.body.session || 'default', req.body.theme, req.body.size || 4);
    result.reaction = `Memory ${result.size}x${result.size} avec le thème ${result.theme}! Trouve les ${result.totalPairs} paires! 🎯`;
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/memory/flip', (req, res) => {
  try {
    const result = memoryEngine.flip(req.body.session || 'default', req.body.cardId);
    if (result.success) {
      if (result.action === 'match') {
        result.reaction = "Bien joué, une paire! 👏";
      } else if (result.action === 'no_match') {
        result.reaction = "Pas de match... À mon tour! 😏";
      }
      if (result.gameOver) {
        result.reaction = result.status === 'player_wins' ? "Tu as gagné! 🎉" :
                          result.status === 'ana_wins' ? "J'ai gagné! 😄" : "Égalité! 🤝";
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/memory/state', (req, res) => {
  try {
    res.json(memoryEngine.getState(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== NIM ====================
router.post('/nim/new', (req, res) => {
  try {
    const piles = req.body.piles || [3, 5, 7];
    const result = nimEngine.newGame(req.body.session || 'default', piles);
    result.reaction = `Nim avec ${result.piles.length} piles: ${result.piles.join(', ')} bâtonnets. Celui qui prend le dernier perd! 🎯`;
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/nim/play', (req, res) => {
  try {
    const result = nimEngine.play(req.body.session || 'default', req.body.pile, req.body.take);
    if (result.success) {
      if (result.gameOver) {
        result.reaction = result.winner === 'player' ?
          "J'ai pris le dernier! Tu gagnes! 🎉" :
          "Tu as pris le dernier... Je gagne! 😄";
      } else if (result.anaMove) {
        result.reaction = `Je prends ${result.anaMove.take} de la pile ${result.anaMove.pile + 1}. À toi! 🎯`;
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/nim/state', (req, res) => {
  try {
    res.json(nimEngine.getState(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== GUESS THE NUMBER ====================
router.post('/guess/new', (req, res) => {
  try {
    const max = req.body.max || 100;
    const result = guessEngine.newGame(req.body.session || 'default', max);
    result.reaction = result.message;
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/guess/try', (req, res) => {
  try {
    const result = guessEngine.guess(req.body.session || 'default', req.body.number);
    if (result.success) {
      if (result.correct) {
        result.reaction = `🎉 Bravo! C'était bien ${result.secret}! Tu as trouvé en ${result.attempts} essais!`;
      } else {
        result.reaction = result.message;
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/guess/giveup', (req, res) => {
  try {
    const result = guessEngine.giveUp(req.body.session || 'default');
    if (result.success) {
      result.reaction = `Le nombre était ${result.secret}. Tu as essayé ${result.attempts} fois! 😊`;
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/guess/state', (req, res) => {
  try {
    res.json(guessEngine.getState(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== CHESS ====================
router.post('/chess/new', (req, res) => {
  try {
    const result = chessEngine.newGame(req.body.session || 'default', req.body.difficulty || 'normal');
    result.reaction = `Échecs! ${req.body.difficulty === 'hard' ? 'Mode difficile!' : 'Que le meilleur gagne!'} Tu joues les blancs. ♔`;
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/chess/play', (req, res) => {
  try {
    const result = chessEngine.play(req.body.session || 'default', req.body.move);
    if (result.success) {
      if (result.gameOver) {
        if (result.status === 'player_wins') {
          result.reaction = "Échec et mat! Tu m'as battue! 🎉";
        } else if (result.status === 'ana_wins') {
          result.reaction = "Échec et mat! J'ai gagné! ♛";
        } else {
          result.reaction = "Pat! Match nul! 🤝";
        }
      } else if (result.inCheck) {
        result.reaction = `${result.anaMove}... Échec! 👑`;
      } else if (result.anaCaptured) {
        result.reaction = `Je joue ${result.anaMove} et prends ta ${result.anaCaptured}! 😏`;
      } else {
        result.reaction = `Je joue ${result.anaMove}. À toi! ♟`;
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/chess/state', (req, res) => {
  try {
    res.json(chessEngine.getState(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/chess/hint', (req, res) => {
  try {
    const result = chessEngine.getHint(req.query.session || 'default');
    if (result.success) {
      result.reaction = `Je te suggère ${result.hint} 💡`;
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== BATTLESHIP ====================
router.post('/battleship/new', (req, res) => {
  try {
    const result = battleshipEngine.newGame(req.body.session || 'default');
    result.reaction = "Bataille Navale! 🚢 Place tes 5 bateaux. Commence par le Porte-avions (5 cases). Donne une coordonnée (ex: A1) et l'orientation (horizontal/vertical).";
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/battleship/place', (req, res) => {
  try {
    // Support both: horizontal (boolean from frontend) and orientation (string legacy)
    const horizontal = req.body.horizontal !== undefined
      ? (req.body.horizontal === true || req.body.horizontal === 'true')
      : (req.body.orientation !== 'vertical' && req.body.orientation !== 'v');
    const result = battleshipEngine.placePlayerShip(req.body.session || 'default', req.body.coord, horizontal);
    if (result.success) {
      if (result.phase === 'battle') {
        result.reaction = "Parfait! Tous tes bateaux sont en place! 🎯 À l'attaque! Donne une coordonnée pour tirer (ex: E5)";
      } else {
        result.reaction = `${result.placed.ship} placé en ${result.placed.positions.join('-')}! 📍 Place maintenant le ${result.currentShip.name}.`;
      }
    } else {
      result.reaction = `Hmm, impossible de placer là... ${result.error}`;
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/battleship/fire', (req, res) => {
  try {
    const result = battleshipEngine.fire(req.body.session || 'default', req.body.coord);
    if (result.success) {
      let reaction = '';
      // Tir du joueur
      if (result.playerShot.hit) {
        if (result.playerShot.sunk) {
          reaction = `💥 COULÉ! Tu as coulé mon ${result.playerShot.shipName}! `;
        } else {
          reaction = `💥 Touché! `;
        }
      } else {
        reaction = `💦 À l'eau... `;
      }
      // Tir d'Ana
      if (result.anaShot) {
        if (result.anaShot.hit) {
          if (result.anaShot.sunk) {
            reaction += `Mon tour: ${result.anaShot.coord}... COULÉ! J'ai coulé ton ${result.anaShot.shipName}! 😄`;
          } else {
            reaction += `Mon tour: ${result.anaShot.coord}... Touché! 😏`;
          }
        } else {
          reaction += `Mon tour: ${result.anaShot.coord}... Raté! 😅`;
        }
      }
      // Fin de partie
      if (result.gameOver) {
        if (result.winner === 'player') {
          reaction = `🎉 VICTOIRE! Tu as coulé toute ma flotte! Précision: ${result.stats.player.accuracy}%`;
        } else {
          reaction = `🚢 J'ai gagné! Toute ta flotte est coulée! Ma précision: ${result.stats.ana.accuracy}%`;
        }
      }
      result.reaction = reaction;
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/battleship/state', (req, res) => {
  try {
    res.json(battleshipEngine.getState(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ==================== BACKGAMMON ====================
router.post('/backgammon/new', (req, res) => {
  try {
    const result = backgammonEngine.newGame(req.body.session || 'default');
    result.reaction = "Backgammon! Tu joues les blancs (positifs). Lance les dés pour commencer! 🎲";
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/backgammon/roll', (req, res) => {
  try {
    const result = backgammonEngine.roll(req.body.session || 'default');
    if (result.success) {
      if (result.anaDice && result.anaMoves) {
        result.reaction = "Ana a lancé " + result.anaDice.join('+') + " et joué " + result.anaMoves.length + " coups. À toi de lancer! 🎲";
      } else {
        result.reaction = "Tu as lancé " + result.dice.join('+') + "! Choisis tes mouvements. 🎯";
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/backgammon/move', (req, res) => {
  try {
    const { from, to, die } = req.body;
    const result = backgammonEngine.move(req.body.session || 'default', from, to, die);
    if (result.success) {
      if (result.phase === 'gameover') {
        result.reaction = result.winner === 'white' ? "Bravo! Tu as gagné! 🎉" : "Ana a gagné! 😄";
      } else if (result.anaMoves && result.anaMoves.length > 0) {
        result.reaction = "Bien joué! Ana a lancé et fait " + result.anaMoves.length + " mouvements. À toi! 🎲";
      } else if (result.movesLeft && result.movesLeft.length > 0) {
        result.reaction = "OK! Il te reste " + result.movesLeft.length + " dé(s): " + result.movesLeft.join('+') + " 🎯";
      } else {
        result.reaction = "Tour terminé! Lance les dés. 🎲";
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/backgammon/state', (req, res) => {
  try {
    res.json(backgammonEngine.getGame(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/backgammon/reset', (req, res) => {
  try {
    const result = backgammonEngine.resetGame(req.body.session || 'default');
    result.reaction = "Nouvelle partie! Lance les dés pour commencer! 🎲";
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== GAMES LIST ====================
router.get('/list', (req, res) => {
  res.json({
    games: [
      { id: 'checkers', name: 'Dames', description: 'Joue aux dames contre Ana!', icon: '🎮', available: true },
      { id: 'tictactoe', name: 'Morpion', description: 'Le classique tic-tac-toe', icon: '⭕', available: true },
      { id: 'connect4', name: 'Puissance 4', description: 'Aligne 4 jetons!', icon: '🔴', available: true },
      { id: 'rps', name: 'Pierre-Feuille-Ciseaux', description: 'Le jeu de mains!', icon: '✊', available: true },
      { id: 'hangman', name: 'Pendu', description: 'Devine le mot!', icon: '🔤', available: true },
      { id: 'blackjack', name: 'Blackjack', description: 'Atteins 21!', icon: '🃏', available: true },
      { id: 'memory', name: 'Memory', description: 'Trouve les paires!', icon: '🧠', available: true },
      { id: 'nim', name: 'Nim', description: 'Jeu de stratégie mathématique', icon: '🔢', available: true },
      { id: 'guess', name: 'Devinette', description: 'Trouve le nombre secret!', icon: '🎯', available: true },
      { id: 'chess', name: 'Échecs', description: 'Le roi des jeux!', icon: '♟', available: true },
      { id: 'battleship', name: 'Bataille Navale', description: 'Coule la flotte ennemie!', icon: '🚢', available: true },
      { id: 'backgammon', name: 'Backgammon', description: 'Le classique jeu de des!', icon: '🎲', available: true }
    ]
  });
});

module.exports = router;
