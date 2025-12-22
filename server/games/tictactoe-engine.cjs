/**
 * Tic-Tac-Toe (Morpion) Engine for Ana
 * Supporte mode vsAna et vsHuman (2 joueurs)
 */

const games = new Map();

const EMPTY = 0;
const PLAYER1 = 1;  // X (Joueur 1)
const PLAYER2 = 2;  // O (Ana ou Joueur 2)

const SYMBOLS = { [EMPTY]: ' ', [PLAYER1]: 'X', [PLAYER2]: 'O' };

/**
 * Démarre une nouvelle partie
 * @param {string} sessionId - ID de session
 * @param {string} mode - 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
 */
function newGame(sessionId, mode = 'vsAna') {
  const game = {
    board: [[0,0,0], [0,0,0], [0,0,0]],
    currentPlayer: 'player1',
    mode,  // 'vsAna' ou 'vsHuman'
    status: 'playing',
    winner: null
  };
  games.set(sessionId, game);

  const message = mode === 'vsHuman'
    ? "Partie 2 joueurs! Joueur 1 (X) vs Joueur 2 (O). Joueur 1 commence!"
    : "Morpion! Tu joues les X, je joue les O. À toi!";

  return {
    success: true,
    board: game.board,
    status: 'playing',
    mode,
    currentPlayer: 'player1',
    message
  };
}

function checkWinner(board) {
  // Lignes
  for (let i = 0; i < 3; i++) {
    if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
      return board[i][0];
    }
  }
  // Colonnes
  for (let i = 0; i < 3; i++) {
    if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
      return board[0][i];
    }
  }
  // Diagonales
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0];
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2];
  }
  // Match nul?
  const isFull = board.every(row => row.every(cell => cell !== EMPTY));
  if (isFull) return 'draw';
  return null;
}

function getEmptyCells(board) {
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c] === EMPTY) cells.push([r, c]);
    }
  }
  return cells;
}

function minimax(board, isAna, alpha, beta) {
  const winner = checkWinner(board);
  if (winner === PLAYER2) return 10;
  if (winner === PLAYER1) return -10;
  if (winner === 'draw') return 0;

  const cells = getEmptyCells(board);

  if (isAna) {
    let best = -Infinity;
    for (const [r, c] of cells) {
      board[r][c] = PLAYER2;
      best = Math.max(best, minimax(board, false, alpha, beta));
      board[r][c] = EMPTY;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of cells) {
      board[r][c] = PLAYER1;
      best = Math.min(best, minimax(board, true, alpha, beta));
      board[r][c] = EMPTY;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function anaPlay(game) {
  const board = game.board;
  const cells = getEmptyCells(board);

  if (cells.length === 0) return null;

  // 20% chance de jouer aléatoire pour ne pas être invincible
  if (Math.random() < 0.2) {
    const [r, c] = cells[Math.floor(Math.random() * cells.length)];
    board[r][c] = PLAYER2;
    return { row: r, col: c };
  }

  let bestScore = -Infinity;
  let bestMove = cells[0];

  for (const [r, c] of cells) {
    board[r][c] = PLAYER2;
    const score = minimax(board, false, -Infinity, Infinity);
    board[r][c] = EMPTY;
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }

  board[bestMove[0]][bestMove[1]] = PLAYER2;
  return { row: bestMove[0], col: bestMove[1] };
}

/**
 * Joue un coup
 * Supporte mode vsAna et vsHuman (2 joueurs)
 */
function play(sessionId, row, col) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };
  if (row < 0 || row > 2 || col < 0 || col > 2) return { success: false, error: "Position invalide (0-2)" };
  if (game.board[row][col] !== EMPTY) return { success: false, error: "Case déjà occupée!" };

  // Déterminer quelle pièce placer selon le joueur courant
  const isPlayer1Turn = game.currentPlayer === 'player1';
  const pieceToPlace = isPlayer1Turn ? PLAYER1 : PLAYER2;

  // Placer la pièce
  game.board[row][col] = pieceToPlace;

  // Vérifier victoire
  let winner = checkWinner(game.board);
  if (winner) {
    if (winner === 'draw') {
      game.status = 'draw';
      game.winner = null;
    } else {
      if (game.mode === 'vsHuman') {
        const winnerPlayer = winner === PLAYER1 ? 'player1' : 'player2';
        game.status = winnerPlayer + '_wins';
        game.winner = winnerPlayer;
      } else {
        // Mode vsAna: 'player' ou 'ana' pour la route
        game.status = winner === PLAYER1 ? 'player_wins' : 'ana_wins';
        game.winner = winner === PLAYER1 ? 'player' : 'ana';
      }
    }

    const winMessage = game.mode === 'vsHuman'
      ? (winner === 'draw' ? "Match nul!" : `${game.winner === 'player1' ? 'Joueur 1' : 'Joueur 2'} gagne!`)
      : (winner === 'draw' ? "Match nul!" : (winner === PLAYER1 ? "Tu as gagné!" : "J'ai gagné!"));

    return {
      success: true,
      board: game.board,
      status: game.status,
      winner: game.winner,
      gameOver: true,
      mode: game.mode,
      message: winMessage
    };
  }

  // MODE 2 JOUEURS : alterner les tours
  if (game.mode === 'vsHuman') {
    game.currentPlayer = isPlayer1Turn ? 'player2' : 'player1';
    return {
      success: true,
      board: game.board,
      playerMove: { row, col },
      status: 'playing',
      gameOver: false,
      mode: 'vsHuman',
      currentPlayer: game.currentPlayer,
      message: `Au tour de ${game.currentPlayer === 'player1' ? 'Joueur 1 (X)' : 'Joueur 2 (O)'}`
    };
  }

  // MODE VS ANA : Ana joue automatiquement
  const anaMove = anaPlay(game);

  winner = checkWinner(game.board);
  if (winner) {
    if (winner === 'draw') {
      game.status = 'draw';
      game.winner = null;
    } else {
      game.status = winner === PLAYER1 ? 'player_wins' : 'ana_wins';
      game.winner = winner === PLAYER1 ? 'player' : 'ana';
    }
  }

  game.currentPlayer = 'player1';

  return {
    success: true,
    board: game.board,
    playerMove: { row, col },
    anaMove,
    status: game.status,
    winner: game.winner,
    gameOver: !!winner,
    mode: 'vsAna',
    currentPlayer: 'player1'
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };
  return { exists: true, ...game };
}

module.exports = { newGame, play, getState, SYMBOLS };
