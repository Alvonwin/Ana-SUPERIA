/**
 * Chess Engine for Ana
 * Jeu d'échecs complet avec IA minimax
 */

const games = new Map();

// Pièces: 1-6 = joueur (blanc), 7-12 = Ana (noir)
const PIECES = {
  EMPTY: 0,
  W_KING: 1, W_QUEEN: 2, W_ROOK: 3, W_BISHOP: 4, W_KNIGHT: 5, W_PAWN: 6,
  B_KING: 7, B_QUEEN: 8, B_ROOK: 9, B_BISHOP: 10, B_KNIGHT: 11, B_PAWN: 12
};

const PIECE_SYMBOLS = {
  1: '♔', 2: '♕', 3: '♖', 4: '♗', 5: '♘', 6: '♙',
  7: '♚', 8: '♛', 9: '♜', 10: '♝', 11: '♞', 12: '♟'
};

const PIECE_VALUES = {
  1: 10000, 2: 900, 3: 500, 4: 330, 5: 320, 6: 100,
  7: 10000, 8: 900, 9: 500, 10: 330, 11: 320, 12: 100
};

function createInitialBoard() {
  return [
    [9, 11, 10, 8, 7, 10, 11, 9],   // Rangée 8 (noir)
    [12, 12, 12, 12, 12, 12, 12, 12], // Rangée 7 (pions noirs)
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [6, 6, 6, 6, 6, 6, 6, 6],       // Rangée 2 (pions blancs)
    [3, 5, 4, 2, 1, 4, 5, 3]        // Rangée 1 (blanc)
  ];
}

function isWhite(piece) { return piece >= 1 && piece <= 6; }
function isBlack(piece) { return piece >= 7 && piece <= 12; }
function isOwn(piece, isWhiteTurn) { return isWhiteTurn ? isWhite(piece) : isBlack(piece); }
function isEnemy(piece, isWhiteTurn) { return isWhiteTurn ? isBlack(piece) : isWhite(piece); }

function copyBoard(board) {
  return board.map(row => [...row]);
}

function findKing(board, white) {
  const king = white ? PIECES.W_KING : PIECES.B_KING;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) return { row: r, col: c };
    }
  }
  return null;
}

function isInCheck(board, white) {
  const kingPos = findKing(board, white);
  if (!kingPos) return false;

  // Vérifie si une pièce ennemie peut attaquer le roi
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (white ? isBlack(piece) : isWhite(piece)) {
        const moves = getPieceMoves(board, r, c, !white, null, true);
        if (moves.some(m => m.toRow === kingPos.row && m.toCol === kingPos.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

function getPieceMoves(board, row, col, isWhiteTurn, enPassant, skipCastling = false) {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const addMove = (toRow, toCol, special = null) => {
    if (toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8) {
      const target = board[toRow][toCol];
      if (target === 0 || isEnemy(target, isWhiteTurn)) {
        moves.push({ fromRow: row, fromCol: col, toRow, toCol, special });
      }
    }
  };

  const addSlidingMoves = (directions) => {
    for (const [dr, dc] of directions) {
      for (let i = 1; i < 8; i++) {
        const nr = row + dr * i;
        const nc = col + dc * i;
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
        const target = board[nr][nc];
        if (target === 0) {
          moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc });
        } else if (isEnemy(target, isWhiteTurn)) {
          moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc });
          break;
        } else {
          break;
        }
      }
    }
  };

  const pieceType = isWhite(piece) ? piece : piece - 6;

  switch (pieceType) {
    case 1: // Roi
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) addMove(row + dr, col + dc);
        }
      }
      // Roque (simplifié)
      if (!skipCastling) {
        // Le roque nécessite des vérifications supplémentaires dans le jeu réel
      }
      break;

    case 2: // Dame
      addSlidingMoves([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]);
      break;

    case 3: // Tour
      addSlidingMoves([[-1,0],[1,0],[0,-1],[0,1]]);
      break;

    case 4: // Fou
      addSlidingMoves([[-1,-1],[-1,1],[1,-1],[1,1]]);
      break;

    case 5: // Cavalier
      const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of knightMoves) {
        addMove(row + dr, col + dc);
      }
      break;

    case 6: // Pion
      const direction = isWhiteTurn ? -1 : 1;
      const startRow = isWhiteTurn ? 6 : 1;
      const promoteRow = isWhiteTurn ? 0 : 7;

      // Avancer
      if (board[row + direction]?.[col] === 0) {
        if (row + direction === promoteRow) {
          moves.push({ fromRow: row, fromCol: col, toRow: row + direction, toCol: col, special: 'promote' });
        } else {
          moves.push({ fromRow: row, fromCol: col, toRow: row + direction, toCol: col });
        }
        // Double pas depuis départ
        if (row === startRow && board[row + 2 * direction]?.[col] === 0) {
          moves.push({ fromRow: row, fromCol: col, toRow: row + 2 * direction, toCol: col, special: 'double' });
        }
      }

      // Captures diagonales
      for (const dc of [-1, 1]) {
        const nr = row + direction;
        const nc = col + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          if (isEnemy(board[nr][nc], isWhiteTurn)) {
            if (nr === promoteRow) {
              moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, special: 'promote' });
            } else {
              moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc });
            }
          }
          // En passant
          if (enPassant && enPassant.row === nr && enPassant.col === nc) {
            moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, special: 'enpassant' });
          }
        }
      }
      break;
  }

  return moves;
}

function getAllLegalMoves(board, isWhiteTurn, enPassant) {
  const moves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (isOwn(board[r][c], isWhiteTurn)) {
        const pieceMoves = getPieceMoves(board, r, c, isWhiteTurn, enPassant);
        for (const move of pieceMoves) {
          // Vérifie que le coup ne met pas en échec
          const testBoard = copyBoard(board);
          applyMoveToBoard(testBoard, move);
          if (!isInCheck(testBoard, isWhiteTurn)) {
            moves.push(move);
          }
        }
      }
    }
  }

  return moves;
}

function applyMoveToBoard(board, move) {
  const piece = board[move.fromRow][move.fromCol];
  board[move.toRow][move.toCol] = piece;
  board[move.fromRow][move.fromCol] = 0;

  if (move.special === 'enpassant') {
    const capturedRow = move.fromRow;
    board[capturedRow][move.toCol] = 0;
  }

  if (move.special === 'promote') {
    // Promotion en dame par défaut
    board[move.toRow][move.toCol] = isWhite(piece) ? PIECES.W_QUEEN : PIECES.B_QUEEN;
  }
}

function evaluateBoard(board) {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece === 0) continue;

      const value = PIECE_VALUES[piece];
      // Bonus position centrale pour certaines pièces
      const centerBonus = (3.5 - Math.abs(c - 3.5)) * 5 + (3.5 - Math.abs(r - 3.5)) * 5;

      if (isWhite(piece)) {
        score += value + centerBonus;
      } else {
        score -= value + centerBonus;
      }
    }
  }

  return score;
}

function minimax(board, depth, alpha, beta, maximizing, enPassant) {
  const moves = getAllLegalMoves(board, maximizing, enPassant);

  if (depth === 0 || moves.length === 0) {
    return { score: evaluateBoard(board) };
  }

  let bestMove = null;

  if (maximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const newBoard = copyBoard(board);
      applyMoveToBoard(newBoard, move);

      const newEnPassant = move.special === 'double' ?
        { row: (move.fromRow + move.toRow) / 2, col: move.toCol } : null;

      const result = minimax(newBoard, depth - 1, alpha, beta, false, newEnPassant);

      if (result.score > maxScore) {
        maxScore = result.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, result.score);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      const newBoard = copyBoard(board);
      applyMoveToBoard(newBoard, move);

      const newEnPassant = move.special === 'double' ?
        { row: (move.fromRow + move.toRow) / 2, col: move.toCol } : null;

      const result = minimax(newBoard, depth - 1, alpha, beta, true, newEnPassant);

      if (result.score < minScore) {
        minScore = result.score;
        bestMove = move;
      }
      beta = Math.min(beta, result.score);
      if (beta <= alpha) break;
    }
    return { score: minScore, move: bestMove };
  }
}

function toNotation(row, col) {
  return String.fromCharCode(97 + col) + (8 - row);
}

function fromNotation(notation) {
  if (!notation || notation.length < 2) return null;
  const col = notation.charCodeAt(0) - 97;
  const row = 8 - parseInt(notation[1]);
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;
  return { row, col };
}

function formatMove(move) {
  return toNotation(move.fromRow, move.fromCol) + '-' + toNotation(move.toRow, move.toCol);
}

function newGame(sessionId, difficulty = 'normal') {
  const depths = { easy: 1, normal: 2, hard: 3 };

  const game = {
    board: createInitialBoard(),
    isWhiteTurn: true,
    status: 'playing',
    difficulty,
    depth: depths[difficulty] || 2,
    enPassant: null,
    moves: []
  };

  games.set(sessionId, game);

  return {
    success: true,
    board: game.board,
    boardDisplay: game.board.map(row => row.map(p => PIECE_SYMBOLS[p] || '')),
    isWhiteTurn: true,
    status: 'playing',
    legalMoves: getAllLegalMoves(game.board, true, null).map(formatMove)
  };
}

function play(sessionId, moveStr) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };
  if (!game.isWhiteTurn) return { success: false, error: "Ce n'est pas ton tour" };

  // Parser le coup: e2-e4 ou e2e4
  const parts = moveStr.toLowerCase().replace(/[^a-h1-8]/g, '');
  if (parts.length < 4) return { success: false, error: "Format invalide. Ex: e2-e4" };

  const from = fromNotation(parts.slice(0, 2));
  const to = fromNotation(parts.slice(2, 4));

  if (!from || !to) return { success: false, error: "Coordonnées invalides" };

  const legalMoves = getAllLegalMoves(game.board, true, game.enPassant);
  const move = legalMoves.find(m =>
    m.fromRow === from.row && m.fromCol === from.col &&
    m.toRow === to.row && m.toCol === to.col
  );

  if (!move) return { success: false, error: "Coup illégal" };

  // Appliquer le coup du joueur
  const capturedPiece = game.board[move.toRow][move.toCol];
  applyMoveToBoard(game.board, move);
  game.moves.push(formatMove(move));

  // Mettre à jour en passant
  game.enPassant = move.special === 'double' ?
    { row: (move.fromRow + move.toRow) / 2, col: move.toCol } : null;

  // Vérifier échec/mat contre Ana
  const anaInCheck = isInCheck(game.board, false);
  const anaLegalMoves = getAllLegalMoves(game.board, false, game.enPassant);

  if (anaLegalMoves.length === 0) {
    game.status = anaInCheck ? 'player_wins' : 'stalemate';
    game.isWhiteTurn = false;

    return {
      success: true,
      playerMove: formatMove(move),
      captured: capturedPiece ? PIECE_SYMBOLS[capturedPiece] : null,
      board: game.board,
      boardDisplay: game.board.map(row => row.map(p => PIECE_SYMBOLS[p] || '')),
      status: game.status,
      gameOver: true,
      inCheck: anaInCheck
    };
  }

  // Tour d'Ana
  game.isWhiteTurn = false;

  const result = minimax(game.board, game.depth, -Infinity, Infinity, false, game.enPassant);

  if (!result.move) {
    game.status = 'stalemate';
    return {
      success: true,
      playerMove: formatMove(move),
      board: game.board,
      boardDisplay: game.board.map(row => row.map(p => PIECE_SYMBOLS[p] || '')),
      status: 'stalemate',
      gameOver: true
    };
  }

  const anaCaptured = game.board[result.move.toRow][result.move.toCol];
  applyMoveToBoard(game.board, result.move);
  game.moves.push(formatMove(result.move));

  game.enPassant = result.move.special === 'double' ?
    { row: (result.move.fromRow + result.move.toRow) / 2, col: result.move.toCol } : null;

  game.isWhiteTurn = true;

  // Vérifier échec/mat contre le joueur
  const playerInCheck = isInCheck(game.board, true);
  const playerLegalMoves = getAllLegalMoves(game.board, true, game.enPassant);

  if (playerLegalMoves.length === 0) {
    game.status = playerInCheck ? 'ana_wins' : 'stalemate';
  }

  return {
    success: true,
    playerMove: formatMove(move),
    playerCaptured: capturedPiece ? PIECE_SYMBOLS[capturedPiece] : null,
    anaMove: formatMove(result.move),
    anaCaptured: anaCaptured ? PIECE_SYMBOLS[anaCaptured] : null,
    board: game.board,
    boardDisplay: game.board.map(row => row.map(p => PIECE_SYMBOLS[p] || '')),
    status: game.status,
    isWhiteTurn: true,
    legalMoves: playerLegalMoves.map(formatMove),
    inCheck: playerInCheck,
    gameOver: game.status !== 'playing'
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };

  const legalMoves = game.isWhiteTurn ?
    getAllLegalMoves(game.board, true, game.enPassant).map(formatMove) : [];

  return {
    exists: true,
    board: game.board,
    boardDisplay: game.board.map(row => row.map(p => PIECE_SYMBOLS[p] || '')),
    isWhiteTurn: game.isWhiteTurn,
    status: game.status,
    legalMoves,
    inCheck: isInCheck(game.board, game.isWhiteTurn),
    moves: game.moves
  };
}

function getHint(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie" };
  if (!game.isWhiteTurn) return { success: false, error: "Ce n'est pas ton tour" };

  const result = minimax(game.board, game.depth, -Infinity, Infinity, true, game.enPassant);

  if (result.move) {
    return { success: true, hint: formatMove(result.move) };
  }
  return { success: false, error: "Aucun coup disponible" };
}

module.exports = { newGame, play, getState, getHint, PIECE_SYMBOLS };
