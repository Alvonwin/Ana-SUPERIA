/**
 * Tic-Tac-Toe (Morpion) Engine for Ana
 */

const games = new Map();

const EMPTY = 0;
const PLAYER = 1;  // X
const ANA = 2;     // O

const SYMBOLS = { [EMPTY]: ' ', [PLAYER]: 'X', [ANA]: 'O' };

function newGame(sessionId) {
  const game = {
    board: [[0,0,0], [0,0,0], [0,0,0]],
    currentPlayer: 'player',
    status: 'playing',
    winner: null
  };
  games.set(sessionId, game);
  return { success: true, board: game.board, status: 'playing' };
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
  if (winner === ANA) return 10;
  if (winner === PLAYER) return -10;
  if (winner === 'draw') return 0;

  const cells = getEmptyCells(board);

  if (isAna) {
    let best = -Infinity;
    for (const [r, c] of cells) {
      board[r][c] = ANA;
      best = Math.max(best, minimax(board, false, alpha, beta));
      board[r][c] = EMPTY;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of cells) {
      board[r][c] = PLAYER;
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
    board[r][c] = ANA;
    return { row: r, col: c };
  }

  let bestScore = -Infinity;
  let bestMove = cells[0];

  for (const [r, c] of cells) {
    board[r][c] = ANA;
    const score = minimax(board, false, -Infinity, Infinity);
    board[r][c] = EMPTY;
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }

  board[bestMove[0]][bestMove[1]] = ANA;
  return { row: bestMove[0], col: bestMove[1] };
}

function play(sessionId, row, col) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };
  if (row < 0 || row > 2 || col < 0 || col > 2) return { success: false, error: "Position invalide (0-2)" };
  if (game.board[row][col] !== EMPTY) return { success: false, error: "Case déjà occupée!" };

  // Coup du joueur
  game.board[row][col] = PLAYER;

  let winner = checkWinner(game.board);
  if (winner) {
    game.status = winner === 'draw' ? 'draw' : (winner === PLAYER ? 'player_wins' : 'ana_wins');
    game.winner = winner === 'draw' ? null : (winner === PLAYER ? 'player' : 'ana');
    return { success: true, board: game.board, status: game.status, winner: game.winner, gameOver: true };
  }

  // Ana joue
  const anaMove = anaPlay(game);

  winner = checkWinner(game.board);
  if (winner) {
    game.status = winner === 'draw' ? 'draw' : (winner === PLAYER ? 'player_wins' : 'ana_wins');
    game.winner = winner === 'draw' ? null : (winner === PLAYER ? 'player' : 'ana');
  }

  return {
    success: true,
    board: game.board,
    playerMove: { row, col },
    anaMove,
    status: game.status,
    winner: game.winner,
    gameOver: !!winner
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };
  return { exists: true, ...game };
}

module.exports = { newGame, play, getState, SYMBOLS };
