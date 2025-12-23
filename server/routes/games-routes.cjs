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
const scrabbleEngine = require('../games/scrabble-engine.cjs');
const definitionMysteryEngine = require('../games/definition-mystery-engine.cjs');
const motusEngine = require('../games/motus-engine.cjs');
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
    // mode: 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
    const result = await playCheckers({
      action: 'new',
      difficulty: req.body.difficulty,
      mode: req.body.mode || 'vsAna'
    }, req.body.session || 'default');
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

// DEBUG 2025-12-19: Test des mouvements de dame
router.get('/checkers/test-dame', (req, res) => {
  try {
    const result = checkersEngine.testDameMoves();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DEBUG 2025-12-19: Test des captures longue distance
router.get('/checkers/test-capture', (req, res) => {
  try {
    const result = checkersEngine.testDameCaptures();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== TIC-TAC-TOE ====================
router.post('/tictactoe/new', (req, res) => {
  try {
    // mode: 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
    const result = tictactoeEngine.newGame(req.body.session || 'default', req.body.mode || 'vsAna');
    result.reaction = result.mode === 'vsHuman'
      ? "Partie 2 joueurs! Joueur 1 (X) commence! 🎮"
      : randomReaction('start');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/tictactoe/play', (req, res) => {
  try {
    const { row, col } = req.body;
    const result = tictactoeEngine.play(req.body.session || 'default', row, col);
    if (result.gameOver) {
      result.reaction = (['player', 'player1', 'player2'].includes(result.winner)) ? randomReaction('win') :
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
    // mode: 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
    const result = connect4Engine.newGame(req.body.session || 'default', req.body.mode || 'vsAna');
    result.reaction = result.mode === 'vsHuman'
      ? "Partie 2 joueurs! Joueur 1 (Rouge) commence! 🎮"
      : randomReaction('start');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/connect4/play', (req, res) => {
  try {
    const result = connect4Engine.play(req.body.session || 'default', req.body.col);
    if (result.gameOver) {
      if (result.mode === 'vsHuman') {
        result.reaction = result.winner === 'player1' ? "Joueur 1 gagne! 🎉" :
                          result.winner === 'player2' ? "Joueur 2 gagne! 🎉" : randomReaction('tie');
      } else {
        result.reaction = (['player', 'player1', 'player2'].includes(result.winner)) ? randomReaction('win') :
                          result.winner === 'ana' ? randomReaction('lose') : randomReaction('tie');
      }
    } else if (result.mode === 'vsHuman') {
      result.reaction = result.message;
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
    const { session = 'default', mode = 'vsAna' } = req.body;
    const result = rpsEngine.newGame(session, mode);
    result.reaction = mode === 'vsHuman'
      ? "Shifumi 2 joueurs! J1: fais ton choix (caché)"
      : "Pierre, Feuille ou Ciseaux? 🎯";
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rps/play', (req, res) => {
  try {
    const result = rpsEngine.play(req.body.session || 'default', req.body.choice);
    if (result.success) {
      if (result.mode === 'vsHuman') {
        if (result.phase === 'player2') {
          result.reaction = "J1 a choisi! Passe l'écran à J2.";
        } else if (result.phase === 'reveal') {
          if (result.winner === 'player1') {
            result.reaction = `${result.player1Name} vs ${result.player2Name}: J1 gagne!`;
          } else if (result.winner === 'player2') {
            result.reaction = `${result.player1Name} vs ${result.player2Name}: J2 gagne!`;
          } else {
            result.reaction = `${result.player1Name} vs ${result.player2Name}: Égalité!`;
          }
        }
      } else {
        if (['player', 'player1', 'player2'].includes(result.winner)) {
          result.reaction = `${result.anaName} contre ${result.playerName}... Tu gagnes! 😅`;
        } else if (result.winner === 'ana') {
          result.reaction = `${result.anaName} contre ${result.playerName}... Je gagne! 😄`;
        } else {
          result.reaction = `${result.anaName} contre ${result.playerName}... Égalité! 🤝`;
        }
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
    const { session = 'default', category, mode = 'vsAna' } = req.body;
    const result = hangmanEngine.newGame(session, category, mode);

    if (mode === 'vsHuman') {
      result.reaction = "Pendu 2 joueurs! J1: Entre un mot secret.";
    } else {
      // Message avec la catégorie thématique comme indice
      result.reaction = `J'ai choisi un mot! Catégorie: ${result.category}. ${result.wordLength} lettres. À toi! 🎯`;
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/hangman/setword', (req, res) => {
  try {
    const result = hangmanEngine.setWord(req.body.session || 'default', req.body.word);
    if (result.success) {
      result.reaction = `Mot de ${result.wordLength} lettres enregistré! Passe l'écran à J2.`;
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/hangman/guess', (req, res) => {
  try {
    const result = hangmanEngine.guess(req.body.session || 'default', req.body.letter);
    if (result.success) {
      if (result.gameOver) {
        if (result.mode === 'vsHuman') {
          result.reaction = result.winner === 'player2'
            ? `J2 gagne! C'était "${result.word}"! 🎉`
            : `J1 gagne! Le mot était "${result.word}"`;
        } else {
          result.reaction = (['player', 'player1', 'player2'].includes(result.winner)) ?
            `Bravo! C'était "${result.word}"! 🎉` :
            `Perdu! Le mot était "${result.word}" 😅`;
        }
      } else if (result.correct) {
        result.reaction = `Oui! La lettre ${result.letter} est dans le mot! 👍`;
      } else {
        result.reaction = `Non, pas de ${result.letter}... ${result.errorsLeft} erreur${result.errorsLeft > 1 ? 's' : ''} restante${result.errorsLeft > 1 ? 's' : ''}! 😬`;
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
    const { session = 'default', mode = 'vsAna' } = req.body;
    const result = blackjackEngine.newGame(session, mode);

    if (mode === 'vsHuman') {
      result.reaction = `J1: ${result.player1Score}, J2: ${result.player2Score}. Joueur 1 joue!`;
    } else {
      result.reaction = result.isBlackjack ?
        "Blackjack! Tu as 21! 🎉" :
        `Tu as ${result.playerScore}. Hit ou Stand? 🃏`;
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/blackjack/hit', (req, res) => {
  try {
    const result = blackjackEngine.hit(req.body.session || 'default');
    if (result.success) {
      if (result.mode === 'vsHuman') {
        if (result.gameOver) {
          result.reaction = `Partie terminée! Ana: ${result.anaScore}`;
        } else if (result.message) {
          result.reaction = result.message;
        } else {
          const player = result.currentPlayer === 'player1' ? 'J1' : 'J2';
          const score = result.currentPlayer === 'player1' ? result.player1Score : result.player2Score;
          result.reaction = `${result.card}! ${player}: ${score}. Encore?`;
        }
      } else {
        if (result.gameOver) {
          result.reaction = `Tu as tiré ${result.card} et tu as ${result.playerScore}... Bust! Je gagne! 😄`;
        } else {
          result.reaction = `${result.card}! Tu as ${result.playerScore}. Encore? 🃏`;
        }
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/blackjack/stand', (req, res) => {
  try {
    const result = blackjackEngine.stand(req.body.session || 'default');
    if (result.success) {
      if (result.mode === 'vsHuman') {
        if (result.gameOver) {
          const p1 = result.player1Result === 'win' ? '✅' : result.player1Result === 'push' ? '🤝' : '❌';
          const p2 = result.player2Result === 'win' ? '✅' : result.player2Result === 'push' ? '🤝' : '❌';
          result.reaction = `Ana: ${result.anaScore}. J1 ${p1}, J2 ${p2}`;
        } else if (result.message) {
          result.reaction = result.message;
        }
      } else {
        if (['player', 'player1', 'player2'].includes(result.winner)) {
          result.reaction = `J'ai ${result.anaScore}. Tu gagnes avec ${result.playerScore}! 🎉`;
        } else if (result.winner === 'ana') {
          result.reaction = `J'ai ${result.anaScore}. Je gagne! 😄`;
        } else {
          result.reaction = `Égalité à ${result.playerScore}! 🤝`;
        }
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
    // mode: 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
    const result = memoryEngine.newGame(req.body.session || 'default', req.body.theme, req.body.size || 4, req.body.mode || 'vsAna');
    result.reaction = result.mode === 'vsHuman'
      ? `Memory 2 joueurs ${result.size}x${result.size}! Trouvez les ${result.totalPairs} paires! 🎮`
      : `Memory ${result.size}x${result.size} avec le thème ${result.theme}! Trouve les ${result.totalPairs} paires! 🎯`;
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/memory/flip', (req, res) => {
  try {
    const result = memoryEngine.flip(req.body.session || 'default', req.body.cardId);
    if (result.success) {
      if (result.mode === 'vsHuman') {
        // Mode 2 joueurs
        if (result.action === 'match') {
          result.reaction = result.message || `Paire trouvée! ${result.currentPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'} rejoue! 👏`;
        } else if (result.action === 'no_match') {
          result.reaction = result.message || `Au tour de ${result.currentPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'}!`;
        }
        if (result.gameOver) {
          result.reaction = result.status === 'player1_wins' ? "Joueur 1 gagne! 🎉" :
                            result.status === 'player2_wins' ? "Joueur 2 gagne! 🎉" : "Égalité! 🤝";
        }
      } else {
        // Mode vs Ana
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
    // mode: 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
    // Signature: newGame(sessionId, difficulty, mode, piles)
    const result = nimEngine.newGame(req.body.session || 'default', 'normal', req.body.mode || 'vsAna', piles);
    result.reaction = result.mode === 'vsHuman'
      ? `Partie 2 joueurs! ${result.piles.length} piles: ${result.piles.join(', ')}. Celui qui prend le dernier perd! 🎮`
      : `Nim avec ${result.piles.length} piles: ${result.piles.join(', ')} bâtonnets. Celui qui prend le dernier perd! 🎯`;
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/nim/play', (req, res) => {
  try {
    const result = nimEngine.play(req.body.session || 'default', req.body.pile, req.body.take);
    if (result.success) {
      if (result.gameOver) {
        if (result.mode === 'vsHuman') {
          result.reaction = result.message || `${result.winner === 'player1' ? 'Joueur 1' : 'Joueur 2'} gagne! 🎉`;
        } else {
          result.reaction = (['player', 'player1', 'player2'].includes(result.winner)) ?
            "J'ai pris le dernier! Tu gagnes! 🎉" :
            "Tu as pris le dernier... Je gagne! 😄";
        }
      } else if (result.mode === 'vsHuman') {
        result.reaction = result.message;
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
    // mode: 'vsAna' (défaut) ou 'vsHuman' (J1 choisit le nombre, J2 devine)
    const mode = req.body.mode || 'vsAna';
    const result = guessEngine.newGame(req.body.session || 'default', max, mode);
    if (result.success) {
      if (mode === 'vsHuman' && result.phase === 'setup') {
        result.reaction = `Devinette 2 joueurs! Joueur 1: Entre un nombre secret entre 1 et ${max}!`;
      } else {
        result.reaction = result.message;
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Route pour que J1 définisse le nombre secret en mode vsHuman
router.post('/guess/setnumber', (req, res) => {
  try {
    const result = guessEngine.setNumber(req.body.session || 'default', req.body.number);
    if (result.success) {
      result.reaction = "Nombre enregistré! Passe l'écran à Joueur 2. 🎯";
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/guess/try', (req, res) => {
  try {
    const result = guessEngine.guess(req.body.session || 'default', req.body.number);
    if (result.success) {
      if (result.correct) {
        if (result.mode === 'vsHuman') {
          result.reaction = `🎉 Joueur 2 a trouvé! C'était ${result.secret}! Trouvé en ${result.attempts} essais!`;
        } else {
          result.reaction = `🎉 Bravo! C'était bien ${result.secret}! Tu as trouvé en ${result.attempts} essais!`;
        }
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
      if (result.mode === 'vsHuman') {
        result.reaction = `Joueur 2 abandonne! Le nombre de Joueur 1 était ${result.secret}. Joueur 1 gagne! 🏆`;
      } else {
        result.reaction = `Le nombre était ${result.secret}. Tu as essayé ${result.attempts} fois! 😊`;
      }
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
    // mode: 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
    const result = chessEngine.newGame(req.body.session || 'default', req.body.difficulty || 'normal', req.body.mode || 'vsAna');
    result.reaction = result.mode === 'vsHuman'
      ? "Échecs 2 joueurs! Joueur 1 (Blancs) vs Joueur 2 (Noirs). Joueur 1 commence! ♔"
      : `Échecs! ${req.body.difficulty === 'hard' ? 'Mode difficile!' : 'Que le meilleur gagne!'} Tu joues les blancs. ♔`;
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/chess/play', (req, res) => {
  try {
    const result = chessEngine.play(req.body.session || 'default', req.body.move);
    if (result.success) {
      if (result.gameOver) {
        if (result.mode === 'vsHuman') {
          if (result.status === 'player1_wins') {
            result.reaction = "Échec et mat! Joueur 1 gagne! 🎉";
          } else if (result.status === 'player2_wins') {
            result.reaction = "Échec et mat! Joueur 2 gagne! 🎉";
          } else {
            result.reaction = "Pat! Match nul! 🤝";
          }
        } else {
          if (result.status === 'player_wins') {
            result.reaction = "Échec et mat! Tu m'as battue! 🎉";
          } else if (result.status === 'ana_wins') {
            result.reaction = "Échec et mat! J'ai gagné! ♛";
          } else {
            result.reaction = "Pat! Match nul! 🤝";
          }
        }
      } else if (result.mode === 'vsHuman') {
        result.reaction = result.message || `Au tour de ${result.currentPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'}`;
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
    const { session = 'default', mode = 'vsAna' } = req.body;
    const result = battleshipEngine.newGame(session, mode);

    if (mode === 'vsHuman') {
      result.reaction = "Bataille Navale 2 joueurs! Joueur 1 place ses bateaux. Commence par le Porte-avions (5 cases).";
    } else {
      result.reaction = "Bataille Navale! 🚢 Place tes 5 bateaux. Commence par le Porte-avions (5 cases). Donne une coordonnée (ex: A1) et l'orientation (horizontal/vertical).";
    }
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
      if (result.mode === 'vsHuman') {
        if (result.phase === 'battle') {
          result.reaction = "Tous les bateaux sont placés! La bataille commence! Joueur 1 tire en premier.";
        } else if (result.phase === 'placement2') {
          result.reaction = `Joueur 1 terminé! Passe l'écran à Joueur 2.`;
        } else {
          result.reaction = `${result.placed.ship} placé! Place le ${result.currentShip.name}.`;
        }
      } else {
        if (result.phase === 'battle') {
          result.reaction = "Parfait! Tous tes bateaux sont en place! 🎯 À l'attaque! Donne une coordonnée pour tirer (ex: E5)";
        } else {
          result.reaction = `${result.placed.ship} placé en ${result.placed.positions.join('-')}! 📍 Place maintenant le ${result.currentShip.name}.`;
        }
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
      // Mode vsHuman
      if (result.mode === 'vsHuman') {
        if (result.gameOver) {
          result.reaction = `🎉 ${result.winner === 'player1' ? 'Joueur 1' : 'Joueur 2'} gagne!`;
        } else {
          result.reaction = result.message;
        }
      } else {
        // Mode vsAna
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
          if (['player', 'player1', 'player2'].includes(result.winner)) {
            reaction = `🎉 VICTOIRE! Tu as coulé toute ma flotte! Précision: ${result.stats.player.accuracy}%`;
          } else {
            reaction = `🚢 J'ai gagné! Toute ta flotte est coulée! Ma précision: ${result.stats.ana.accuracy}%`;
          }
        }
        result.reaction = reaction;
      }
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
    // mode: 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
    const result = backgammonEngine.newGame(req.body.session || 'default', req.body.mode || 'vsAna');
    result.reaction = result.mode === 'vsHuman'
      ? "Backgammon 2 joueurs! Joueur 1 (Blancs) vs Joueur 2 (Noirs). Joueur 1 lance les dés! 🎲"
      : "Backgammon! Tu joues les blancs (positifs). Lance les dés pour commencer! 🎲";
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/backgammon/roll', (req, res) => {
  try {
    const result = backgammonEngine.roll(req.body.session || 'default');
    if (result.success) {
      if (result.mode === 'vsHuman') {
        if (result.message) {
          result.reaction = result.message;
        } else {
          result.reaction = `${result.playerTurn === 'player1' ? 'Joueur 1' : 'Joueur 2'} a lancé ${result.dice.join('+')}! 🎯`;
        }
      } else if (result.anaDice && result.anaMoves) {
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
        if (result.mode === 'vsHuman') {
          result.reaction = result.winner === 'player1' ? "Joueur 1 gagne! 🎉" : "Joueur 2 gagne! 🎉";
        } else {
          result.reaction = result.winner === 'white' ? "Bravo! Tu as gagné! 🎉" : "Ana a gagné! 😄";
        }
      } else if (result.mode === 'vsHuman') {
        result.reaction = result.message || `Au tour de ${result.playerTurn === 'player1' ? 'Joueur 1' : 'Joueur 2'}!`;
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

// ==================== SCRABBLE ====================
router.post('/scrabble/new', (req, res) => {
  try {
    const { session = 'default', mode = 'vsAna' } = req.body;
    const result = scrabbleEngine.newGame(session, mode);
    result.reaction = mode === 'vsHuman'
      ? "Scrabble 2 joueurs! Joueur 1 commence. Place tes lettres! 🎯"
      : "Scrabble! Place ton premier mot en passant par le centre. À toi! 📝";
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/scrabble/play', (req, res) => {
  try {
    const { session = 'default', tiles } = req.body;
    const result = scrabbleEngine.playMove(session, 'player1', tiles);
    if (result.success) {
      if (result.wordsPlayed && result.wordsPlayed.length > 0) {
        const words = result.wordsPlayed.map(w => w.word).join(', ');
        result.reaction = `+${result.pointsScored} pts! Mots: ${words} 📝`;
      }
      if (result.anaMove) {
        if (result.anaMove.type === 'play') {
          result.reaction += ` Ana joue: ${result.anaMove.words.join(', ')} (+${result.anaMove.score} pts)`;
        } else {
          result.reaction += ' Ana passe son tour.';
        }
      }
      if (result.status === 'finished') {
        const winner = result.winner === 'player1' ? 'Tu gagnes' :
                       result.winner === 'player2' ? 'Ana gagne' : 'Égalité';
        result.reaction = `🏆 Partie terminée! ${winner}! Score: ${result.scores.player1}-${result.scores.player2}`;
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/scrabble/pass', (req, res) => {
  try {
    const { session = 'default' } = req.body;
    const result = scrabbleEngine.pass(session, 'player1');
    if (result.success) {
      result.reaction = 'Tu passes ton tour.';
      if (result.anaMove && result.anaMove.type === 'play') {
        result.reaction += ` Ana joue: ${result.anaMove.words.join(', ')} (+${result.anaMove.score} pts)`;
      } else if (result.anaMove) {
        result.reaction += ' Ana passe aussi.';
      }
      if (result.status === 'finished') {
        result.reaction = `🏆 Partie terminée! 2 passes consécutifs.`;
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/scrabble/exchange', (req, res) => {
  try {
    const { session = 'default', tiles } = req.body;
    const result = scrabbleEngine.exchangeTiles(session, 'player1', tiles);
    if (result.success) {
      result.reaction = `${tiles.length} tuile(s) échangée(s)! 🔄`;
      if (result.anaMove && result.anaMove.type === 'play') {
        result.reaction += ` Ana joue: ${result.anaMove.words.join(', ')} (+${result.anaMove.score} pts)`;
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/scrabble/state', (req, res) => {
  try {
    res.json(scrabbleEngine.getState(req.query.session || 'default', 'player1'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/scrabble/letters', (req, res) => {
  try {
    res.json({ values: scrabbleEngine.getLetterValues() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== DEFINITION MYSTERY ====================
router.get('/definition-mystery/state', (req, res) => {
  try {
    const result = definitionMysteryEngine.getState(req.query.session || 'default');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/definition-mystery/new', (req, res) => {
  try {
    const result = definitionMysteryEngine.newGame(req.body.session || 'default');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/definition-mystery/guess', (req, res) => {
  try {
    const { session = 'default', answer } = req.body;
    const result = definitionMysteryEngine.guess(session, answer);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/definition-mystery/next-clue', (req, res) => {
  try {
    const result = definitionMysteryEngine.nextClue(req.body.session || 'default');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/definition-mystery/reveal', (req, res) => {
  try {
    const result = definitionMysteryEngine.reveal(req.body.session || 'default');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/definition-mystery/new-round', (req, res) => {
  try {
    const result = definitionMysteryEngine.newRound(req.body.session || 'default');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== MOTUS ====================
router.post('/motus/new', (req, res) => {
  try {
    const { session = 'default', wordLength = 6, mode = 'vsAna', customWord } = req.body;
    const result = motusEngine.newGame(session, wordLength, mode, customWord);
    result.reaction = `🟩 MOTUS! Trouve le mot de ${result.wordLength} lettres commençant par ${result.firstLetter}!`;
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/motus/guess', (req, res) => {
  try {
    const { session = 'default', word } = req.body;
    if (!word) {
      return res.status(400).json({ error: 'Le mot est requis' });
    }
    const result = motusEngine.guess(session, word);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/motus/state', (req, res) => {
  try {
    const result = motusEngine.getState(req.query.session || 'default');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/motus/abandon', (req, res) => {
  try {
    const result = motusEngine.abandon(req.body.session || 'default');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/motus/hint', (req, res) => {
  try {
    const result = motusEngine.getHint(req.body.session || 'default');
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
      { id: 'backgammon', name: 'Backgammon', description: 'Le classique jeu de des!', icon: '🎲', available: true },
      { id: 'scrabble', name: 'Scrabble', description: 'Le roi des jeux de mots!', icon: '🔠', available: true },
      { id: 'definition-mystery', name: 'Définition Mystère', description: 'Devine le mot à partir des indices d\'Ana!', icon: '🔮', available: true },
      { id: 'motus', name: 'Motus', description: 'Trouve le mot en 6 essais!', icon: '🟩', available: true }
    ]
  });
});

module.exports = router;
const boggleEngine = require('../games/boggle-engine.cjs');

// ==================== BOGGLE ====================
router.post('/boggle/new', (req, res) => {
  try {
    const result = boggleEngine.newGame(req.body.session || 'default');
    result.reaction = "Boggle ! Trouve des mots dans la grille !";
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/boggle/guess', (req, res) => {
  try {
    const { session = 'default', word } = req.body;
    const result = boggleEngine.guess(session, word);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/boggle/state', (req, res) => {
  try {
    res.json(boggleEngine.getState(req.query.session || 'default'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/list', (req, res) => {
  res.json({
    games: [
      // ...
      { id: 'boggle', name: 'Boggle', description: 'Trouve des mots dans la grille!', icon: '🔠', available: true }
    ]
  });
});