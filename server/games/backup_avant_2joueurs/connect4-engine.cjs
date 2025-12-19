/**
 * Connect 4 (Puissance 4) Engine for Ana
 */

const games = new Map();

const EMPTY = 0;
const PLAYER = 1;  // Rouge
const ANA = 2;     // Jaune

const ROWS = 6;
const COLS = 7;

function createBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
}

function newGame(sessionId) {
  const game = {
    board: createBoard(),
    currentPlayer: 'player',
    status: 'playing',
    winner: null,
    lastMove: null
  };
  games.set(sessionId, game);
  return { success: true, board: game.board, status: 'playing' };
}

function dropPiece(board, col, piece) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === EMPTY) {
      board[row][col] = piece;
      return row;
    }
  }
  return -1; // Colonne pleine
}

function checkWinner(board, lastRow, lastCol) {
  if (lastRow < 0) return null;
  const piece = board[lastRow][lastCol];
  if (!piece) return null;

  const directions = [[0,1], [1,0], [1,1], [1,-1]];

  for (const [dr, dc] of directions) {
    let count = 1;
    // Direction positive
    for (let i = 1; i < 4; i++) {
      const r = lastRow + dr * i;
      const c = lastCol + dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === piece) {
        count++;
      } else break;
    }
    // Direction négative
    for (let i = 1; i < 4; i++) {
      const r = lastRow - dr * i;
      const c = lastCol - dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === piece) {
        count++;
      } else break;
    }
    if (count >= 4) return piece;
  }

  // Match nul?
  if (board[0].every(cell => cell !== EMPTY)) return 'draw';
  return null;
}

function evaluateWindow(window, piece) {
  const opponent = piece === ANA ? PLAYER : ANA;
  const pieceCount = window.filter(c => c === piece).length;
  const emptyCount = window.filter(c => c === EMPTY).length;
  const oppCount = window.filter(c => c === opponent).length;

  if (pieceCount === 4) return 100;
  if (pieceCount === 3 && emptyCount === 1) return 5;
  if (pieceCount === 2 && emptyCount === 2) return 2;
  if (oppCount === 3 && emptyCount === 1) return -4;
  return 0;
}

function evaluateBoard(board) {
  let score = 0;

  // Centre
  const centerCol = Math.floor(COLS / 2);
  const centerCount = board.filter(row => row[centerCol] === ANA).length;
  score += centerCount * 3;

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
      score += evaluateWindow(window, ANA);
    }
  }

  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
      score += evaluateWindow(window, ANA);
    }
  }

  // Diagonales
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
      score += evaluateWindow(window, ANA);
    }
  }
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 3; c < COLS; c++) {
      const window = [board[r][c], board[r+1][c-1], board[r+2][c-2], board[r+3][c-3]];
      score += evaluateWindow(window, ANA);
    }
  }

  return score;
}

function getValidCols(board) {
  const cols = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === EMPTY) cols.push(c);
  }
  return cols;
}

function minimax(board, depth, alpha, beta, isMax) {
  const validCols = getValidCols(board);

  // Vérifier victoire
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c] !== EMPTY) {
        const winner = checkWinner(board, r, c);
        if (winner === ANA) return 10000;
        if (winner === PLAYER) return -10000;
        if (winner === 'draw') return 0;
        break;
      }
    }
  }

  if (depth === 0) return evaluateBoard(board);
  if (validCols.length === 0) return 0;

  if (isMax) {
    let value = -Infinity;
    for (const col of validCols) {
      const newBoard = board.map(r => [...r]);
      const row = dropPiece(newBoard, col, ANA);
      value = Math.max(value, minimax(newBoard, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const col of validCols) {
      const newBoard = board.map(r => [...r]);
      const row = dropPiece(newBoard, col, PLAYER);
      value = Math.min(value, minimax(newBoard, depth - 1, alpha, beta, true));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function anaPlay(game) {
  const board = game.board;
  const validCols = getValidCols(board);

  if (validCols.length === 0) return null;

  let bestCol = validCols[Math.floor(validCols.length / 2)];
  let bestScore = -Infinity;

  for (const col of validCols) {
    const newBoard = board.map(r => [...r]);
    const row = dropPiece(newBoard, col, ANA);
    const score = minimax(newBoard, 4, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }

  const row = dropPiece(board, bestCol, ANA);
  return { row, col: bestCol };
}

function play(sessionId, col) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };
  if (col < 0 || col >= COLS) return { success: false, error: "Colonne invalide (0-6)" };
  if (game.board[0][col] !== EMPTY) return { success: false, error: "Colonne pleine!" };

  // Coup du joueur
  const playerRow = dropPiece(game.board, col, PLAYER);

  let winner = checkWinner(game.board, playerRow, col);
  if (winner) {
    game.status = winner === 'draw' ? 'draw' : (winner === PLAYER ? 'player_wins' : 'ana_wins');
    game.winner = winner === 'draw' ? null : (winner === PLAYER ? 'player' : 'ana');
    return { success: true, board: game.board, status: game.status, winner: game.winner, gameOver: true };
  }

  // Ana joue
  const anaMove = anaPlay(game);

  if (anaMove) {
    winner = checkWinner(game.board, anaMove.row, anaMove.col);
    if (winner) {
      game.status = winner === 'draw' ? 'draw' : (winner === PLAYER ? 'player_wins' : 'ana_wins');
      game.winner = winner === 'draw' ? null : (winner === PLAYER ? 'player' : 'ana');
    }
  }

  return {
    success: true,
    board: game.board,
    playerMove: { row: playerRow, col },
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

module.exports = { newGame, play, getState, ROWS, COLS };
