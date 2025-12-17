/**
 * Checkers (Dames) Engine for Ana
 *
 * Règles internationales simplifiées:
 * - Plateau 8x8
 * - Pions se déplacent en diagonale vers l'avant
 * - Dames se déplacent en diagonale dans toutes directions
 * - Prises obligatoires
 * - Promotion en dame sur la dernière rangée
 */

// Constantes
const EMPTY = 0;
const PLAYER_PION = 1;      // Pion du joueur (Alain)
const PLAYER_DAME = 2;      // Dame du joueur
const ANA_PION = 3;         // Pion d'Ana
const ANA_DAME = 4;         // Dame d'Ana

const PIECE_NAMES = {
  [EMPTY]: '·',
  [PLAYER_PION]: '●',       // Noir pour le joueur
  [PLAYER_DAME]: '◆',
  [ANA_PION]: '○',          // Blanc pour Ana
  [ANA_DAME]: '◇'
};

// État des parties en cours (par session)
const games = new Map();

/**
 * Crée un nouveau plateau initial
 */
function createInitialBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(EMPTY));

  // Pions d'Ana (haut du plateau, rangées 0-2)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = ANA_PION;
      }
    }
  }

  // Pions du joueur (bas du plateau, rangées 5-7)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = PLAYER_PION;
      }
    }
  }

  return board;
}

/**
 * Démarre une nouvelle partie
 */
function newGame(sessionId, difficulty = 'normal') {
  const game = {
    board: createInitialBoard(),
    currentPlayer: 'player',  // Le joueur commence
    difficulty,               // easy, normal, hard
    history: [],
    capturedByPlayer: 0,
    capturedByAna: 0,
    status: 'playing',        // playing, player_wins, ana_wins, draw
    moveCount: 0,
    createdAt: new Date().toISOString()
  };

  games.set(sessionId, game);

  // Obtenir les coups légaux pour le joueur
  const legalMoves = getLegalMoves(game.board, true).map(m => m.notation);

  return {
    success: true,
    message: "Nouvelle partie commencée! Tu joues les noirs (●), je joue les blancs (○). À toi de jouer!",
    board: formatBoard(game.board),
    boardData: game.board,
    currentPlayer: 'player',
    status: 'playing',
    legalMoves: legalMoves
  };
}

/**
 * Formate le plateau en ASCII art
 */
function formatBoard(board) {
  let result = '    A   B   C   D   E   F   G   H\n';
  result += '  ┌───┬───┬───┬───┬───┬───┬───┬───┐\n';

  for (let row = 0; row < 8; row++) {
    result += `${8 - row} │`;
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      const bg = (row + col) % 2 === 0 ? ' ' : '░';
      const symbol = piece === EMPTY ? bg : PIECE_NAMES[piece];
      result += ` ${symbol} │`;
    }
    result += ` ${8 - row}\n`;

    if (row < 7) {
      result += '  ├───┼───┼───┼───┼───┼───┼───┼───┤\n';
    }
  }

  result += '  └───┴───┴───┴───┴───┴───┴───┴───┘\n';
  result += '    A   B   C   D   E   F   G   H\n';

  return result;
}

/**
 * Convertit notation (ex: "C3") en coordonnées [row, col]
 */
function parsePosition(pos) {
  if (!pos || pos.length < 2) return null;

  const col = pos.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
  const row = 8 - parseInt(pos[1]);                  // 8=0, 7=1, etc.

  if (col < 0 || col > 7 || row < 0 || row > 7 || isNaN(row)) {
    return null;
  }

  return [row, col];
}

/**
 * Convertit coordonnées en notation
 */
function toNotation(row, col) {
  return String.fromCharCode(65 + col) + (8 - row);
}

/**
 * Vérifie si une pièce appartient au joueur
 */
function isPlayerPiece(piece) {
  return piece === PLAYER_PION || piece === PLAYER_DAME;
}

/**
 * Vérifie si une pièce appartient à Ana
 */
function isAnaPiece(piece) {
  return piece === ANA_PION || piece === ANA_DAME;
}

/**
 * Vérifie si une pièce est une dame
 */
function isDame(piece) {
  return piece === PLAYER_DAME || piece === ANA_DAME;
}

/**
 * Obtient tous les mouvements légaux pour un joueur
 */
function getLegalMoves(board, forPlayer = true) {
  const moves = [];
  const captures = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      const isOwn = forPlayer ? isPlayerPiece(piece) : isAnaPiece(piece);

      if (!isOwn) continue;

      const pieceMoves = getPieceMoves(board, row, col, forPlayer);

      for (const move of pieceMoves) {
        if (move.captures.length > 0) {
          captures.push(move);
        } else {
          moves.push(move);
        }
      }
    }
  }

  // Prises obligatoires: si des captures existent, seules elles sont légales
  return captures.length > 0 ? captures : moves;
}

/**
 * Obtient les mouvements pour une pièce spécifique
 */
function getPieceMoves(board, row, col, forPlayer) {
  const piece = board[row][col];
  const moves = [];

  // Directions possibles
  let directions;
  if (isDame(piece)) {
    directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]]; // Toutes directions
  } else if (forPlayer) {
    directions = [[-1, -1], [-1, 1]]; // Vers le haut pour le joueur
  } else {
    directions = [[1, -1], [1, 1]];   // Vers le bas pour Ana
  }

  // Chercher les captures d'abord
  const captures = findCaptures(board, row, col, forPlayer, piece);
  if (captures.length > 0) {
    return captures;
  }

  // Mouvements simples
  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
      if (board[newRow][newCol] === EMPTY) {
        moves.push({
          from: [row, col],
          to: [newRow, newCol],
          captures: [],
          notation: `${toNotation(row, col)}-${toNotation(newRow, newCol)}`
        });
      }
    }
  }

  return moves;
}

/**
 * Trouve les captures possibles pour une pièce
 */
function findCaptures(board, row, col, forPlayer, piece) {
  const captures = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  for (const [dr, dc] of directions) {
    const jumpRow = row + dr;
    const jumpCol = col + dc;
    const landRow = row + 2 * dr;
    const landCol = col + 2 * dc;

    if (landRow >= 0 && landRow < 8 && landCol >= 0 && landCol < 8) {
      const jumpPiece = board[jumpRow][jumpCol];
      const isEnemy = forPlayer ? isAnaPiece(jumpPiece) : isPlayerPiece(jumpPiece);

      if (isEnemy && board[landRow][landCol] === EMPTY) {
        // Vérifier captures en chaîne
        const newBoard = board.map(r => [...r]);
        newBoard[landRow][landCol] = piece;
        newBoard[row][col] = EMPTY;
        newBoard[jumpRow][jumpCol] = EMPTY;

        const chainCaptures = findCaptures(newBoard, landRow, landCol, forPlayer, piece);

        if (chainCaptures.length > 0) {
          for (const chain of chainCaptures) {
            captures.push({
              from: [row, col],
              to: chain.to,
              captures: [[jumpRow, jumpCol], ...chain.captures],
              notation: `${toNotation(row, col)}x${chain.notation.split('x').pop()}`
            });
          }
        } else {
          captures.push({
            from: [row, col],
            to: [landRow, landCol],
            captures: [[jumpRow, jumpCol]],
            notation: `${toNotation(row, col)}x${toNotation(landRow, landCol)}`
          });
        }
      }
    }
  }

  return captures;
}

/**
 * Applique un mouvement
 */
function applyMove(game, moveNotation) {
  const board = game.board;

  // Parser le mouvement (ex: "C3-D4" ou "C3xE5")
  const isCapture = moveNotation.includes('x');
  const parts = moveNotation.split(isCapture ? 'x' : '-');

  if (parts.length !== 2) {
    return { success: false, error: "Format invalide. Utilise 'C3-D4' ou 'C3xE5'" };
  }

  const from = parsePosition(parts[0].trim());
  const to = parsePosition(parts[1].trim());

  if (!from || !to) {
    return { success: false, error: "Position invalide. Utilise des lettres A-H et chiffres 1-8" };
  }

  // Vérifier que c'est bien un pion du joueur
  const piece = board[from[0]][from[1]];
  if (!isPlayerPiece(piece)) {
    return { success: false, error: "Ce n'est pas ton pion!" };
  }

  // Obtenir les mouvements légaux
  const legalMoves = getLegalMoves(board, true);
  const move = legalMoves.find(m =>
    m.from[0] === from[0] && m.from[1] === from[1] &&
    m.to[0] === to[0] && m.to[1] === to[1]
  );

  if (!move) {
    // Donner un indice
    const pieceMoves = legalMoves.filter(m => m.from[0] === from[0] && m.from[1] === from[1]);
    if (pieceMoves.length > 0) {
      const options = pieceMoves.map(m => m.notation).join(', ');
      return { success: false, error: `Mouvement illégal. Coups possibles pour ce pion: ${options}` };
    }

    if (legalMoves.some(m => m.captures.length > 0)) {
      return { success: false, error: "Tu dois capturer! Une prise est obligatoire." };
    }

    return { success: false, error: "Mouvement illégal." };
  }

  // Appliquer le mouvement
  board[to[0]][to[1]] = piece;
  board[from[0]][from[1]] = EMPTY;

  // Retirer les pièces capturées
  for (const [cr, cc] of move.captures) {
    board[cr][cc] = EMPTY;
    game.capturedByPlayer++;
  }

  // Promotion en dame
  if (to[0] === 0 && piece === PLAYER_PION) {
    board[to[0]][to[1]] = PLAYER_DAME;
  }

  game.history.push({
    player: 'player',
    move: move.notation,
    captures: move.captures.length
  });

  game.moveCount++;

  return { success: true, move };
}

/**
 * Ana joue son coup (IA)
 */
function anaPlay(game) {
  const difficulty = game.difficulty;
  const legalMoves = getLegalMoves(game.board, false);

  if (legalMoves.length === 0) {
    game.status = 'player_wins';
    return {
      success: true,
      gameOver: true,
      winner: 'player',
      message: "Je n'ai plus de coups possibles... Tu as gagné! 🎉"
    };
  }

  let selectedMove;

  if (difficulty === 'easy') {
    // Facile: coup aléatoire
    selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  } else if (difficulty === 'hard') {
    // Difficile: minimax avec profondeur 4
    selectedMove = findBestMove(game.board, 4);
  } else {
    // Normal: minimax avec profondeur 2, parfois aléatoire
    if (Math.random() < 0.2) {
      selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    } else {
      selectedMove = findBestMove(game.board, 2);
    }
  }

  // Appliquer le coup d'Ana
  const board = game.board;
  const piece = board[selectedMove.from[0]][selectedMove.from[1]];

  board[selectedMove.to[0]][selectedMove.to[1]] = piece;
  board[selectedMove.from[0]][selectedMove.from[1]] = EMPTY;

  for (const [cr, cc] of selectedMove.captures) {
    board[cr][cc] = EMPTY;
    game.capturedByAna++;
  }

  // Promotion
  if (selectedMove.to[0] === 7 && piece === ANA_PION) {
    board[selectedMove.to[0]][selectedMove.to[1]] = ANA_DAME;
  }

  game.history.push({
    player: 'ana',
    move: selectedMove.notation,
    captures: selectedMove.captures.length
  });

  game.moveCount++;
  game.currentPlayer = 'player';

  // Vérifier fin de partie
  const playerMoves = getLegalMoves(board, true);
  if (playerMoves.length === 0) {
    game.status = 'ana_wins';
    return {
      success: true,
      move: selectedMove,
      gameOver: true,
      winner: 'ana',
      message: "Tu n'as plus de coups possibles... J'ai gagné! 😄"
    };
  }

  return {
    success: true,
    move: selectedMove,
    gameOver: false
  };
}

/**
 * Minimax avec alpha-beta pruning
 */
function findBestMove(board, depth) {
  const legalMoves = getLegalMoves(board, false);
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    const newBoard = simulateMove(board, move);
    const score = minimax(newBoard, depth - 1, -Infinity, Infinity, true);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function simulateMove(board, move) {
  const newBoard = board.map(r => [...r]);
  const piece = newBoard[move.from[0]][move.from[1]];

  newBoard[move.to[0]][move.to[1]] = piece;
  newBoard[move.from[0]][move.from[1]] = EMPTY;

  for (const [cr, cc] of move.captures) {
    newBoard[cr][cc] = EMPTY;
  }

  // Promotion
  if (move.to[0] === 7 && piece === ANA_PION) {
    newBoard[move.to[0]][move.to[1]] = ANA_DAME;
  }
  if (move.to[0] === 0 && piece === PLAYER_PION) {
    newBoard[move.to[0]][move.to[1]] = PLAYER_DAME;
  }

  return newBoard;
}

function minimax(board, depth, alpha, beta, isMaximizing) {
  if (depth === 0) {
    return evaluateBoard(board);
  }

  const moves = getLegalMoves(board, isMaximizing);

  if (moves.length === 0) {
    return isMaximizing ? -1000 : 1000;
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = simulateMove(board, move);
      const eval_ = minimax(newBoard, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = simulateMove(board, move);
      const eval_ = minimax(newBoard, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function evaluateBoard(board) {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];

      if (piece === ANA_PION) score += 10 + row; // Bonus pour avancer
      else if (piece === ANA_DAME) score += 30;
      else if (piece === PLAYER_PION) score -= 10 + (7 - row);
      else if (piece === PLAYER_DAME) score -= 30;
    }
  }

  return score;
}

/**
 * Joue un coup (entrée principale)
 */
function play(sessionId, moveNotation) {
  const game = games.get(sessionId);

  if (!game) {
    return { success: false, error: "Aucune partie en cours. Dis 'nouvelle partie' pour commencer!" };
  }

  if (game.status !== 'playing') {
    return { success: false, error: "La partie est terminée. Dis 'nouvelle partie' pour rejouer!" };
  }

  if (game.currentPlayer !== 'player') {
    return { success: false, error: "Ce n'est pas ton tour!" };
  }

  // Appliquer le coup du joueur
  const result = applyMove(game, moveNotation);

  if (!result.success) {
    return result;
  }

  // Vérifier si le joueur a gagné
  const anaMoves = getLegalMoves(game.board, false);
  if (anaMoves.length === 0) {
    game.status = 'player_wins';
    return {
      success: true,
      playerMove: result.move,
      board: formatBoard(game.board),
      boardData: game.board,
      gameOver: true,
      winner: 'player',
      status: 'player_wins',
      message: "Je n'ai plus de pions... Tu m'as battue! Bien joué! 🎉",
      score: { player: game.capturedByPlayer, ana: game.capturedByAna },
      legalMoves: []
    };
  }

  // Ana joue
  game.currentPlayer = 'ana';
  const anaResult = anaPlay(game);

  // Obtenir les nouveaux coups légaux pour le joueur
  const newLegalMoves = getLegalMoves(game.board, true).map(m => m.notation);

  return {
    success: true,
    playerMove: result.move,
    anaMove: anaResult.move,
    board: formatBoard(game.board),
    boardData: game.board,
    status: anaResult.gameOver ? game.status : 'playing',
    gameOver: anaResult.gameOver || false,
    winner: anaResult.winner || null,
    message: anaResult.message || null,
    currentPlayer: 'player',
    score: { player: game.capturedByPlayer, ana: game.capturedByAna },
    legalMoves: newLegalMoves
  };
}

/**
 * Obtient l'état actuel de la partie
 */
function getGameState(sessionId) {
  const game = games.get(sessionId);

  if (!game) {
    return { exists: false };
  }

  return {
    exists: true,
    board: formatBoard(game.board),
    boardData: game.board,
    currentPlayer: game.currentPlayer,
    status: game.status,
    score: { player: game.capturedByPlayer, ana: game.capturedByAna },
    moveCount: game.moveCount,
    history: game.history,
    legalMoves: getLegalMoves(game.board, true).map(m => m.notation)
  };
}

/**
 * Obtient un indice
 */
function getHint(sessionId) {
  const game = games.get(sessionId);

  if (!game) {
    return { success: false, error: "Aucune partie en cours." };
  }

  const legalMoves = getLegalMoves(game.board, true);

  if (legalMoves.length === 0) {
    return { success: false, error: "Aucun coup possible!" };
  }

  // Donner le meilleur coup selon minimax
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    const newBoard = simulateMove(game.board, move);
    const score = -evaluateBoard(newBoard); // Inverser pour le joueur
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return {
    success: true,
    hint: bestMove.notation,
    allMoves: legalMoves.map(m => m.notation)
  };
}

module.exports = {
  newGame,
  play,
  getGameState,
  getHint,
  formatBoard,
  PIECE_NAMES
};
