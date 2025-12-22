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
 * @param {string} sessionId - ID de session
 * @param {string} difficulty - Difficulté (easy, normal, hard)
 * @param {string} mode - Mode de jeu: 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
 */
function newGame(sessionId, difficulty = 'normal', mode = 'vsAna') {
  const game = {
    board: createInitialBoard(),
    currentPlayer: 'player1',  // Joueur 1 commence (noirs ●)
    difficulty,                // easy, normal, hard
    mode,                      // 'vsAna' ou 'vsHuman'
    history: [],
    capturedByPlayer: 0,
    capturedByAna: 0,
    status: 'playing',         // playing, player1_wins, player2_wins, draw
    moveCount: 0,
    createdAt: new Date().toISOString()
  };

  games.set(sessionId, game);

  // Obtenir les coups légaux pour le joueur 1
  const legalMoves = getLegalMoves(game.board, true).map(m => m.notation);

  const message = mode === 'vsHuman'
    ? "Partie 2 joueurs! Joueur 1 (●) vs Joueur 2 (○). Joueur 1 commence!"
    : "Nouvelle partie! Tu joues les noirs (●), je joue les blancs (○). À toi de jouer!";

  return {
    success: true,
    message,
    board: formatBoard(game.board),
    boardData: game.board,
    currentPlayer: 'player1',
    mode,
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
    let newRow = row + dr;
    let newCol = col + dc;

    // FIX 2025-12-19: Les dames peuvent se déplacer de plusieurs cases
    if (isDame(piece)) {
      // Dame: continuer dans la direction jusqu'à obstacle
      while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        if (board[newRow][newCol] === EMPTY) {
          moves.push({
            from: [row, col],
            to: [newRow, newCol],
            captures: [],
            notation: `${toNotation(row, col)}-${toNotation(newRow, newCol)}`
          });
          newRow += dr;
          newCol += dc;
        } else {
          break; // Case occupée, arrêter
        }
      }
    } else {
      // Pion normal: une seule case
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
  }

  return moves;
}

/**
 * Trouve les captures possibles pour une pièce
 * FIX 2025-12-19: Support capture longue distance pour les dames
 */
function findCaptures(board, row, col, forPlayer, piece) {
  const captures = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  for (const [dr, dc] of directions) {
    if (isDame(piece)) {
      // DAME: Scanner toute la diagonale pour trouver un ennemi
      let scanRow = row + dr;
      let scanCol = col + dc;

      // Avancer jusqu'à trouver quelque chose
      while (scanRow >= 0 && scanRow < 8 && scanCol >= 0 && scanCol < 8) {
        const scannedPiece = board[scanRow][scanCol];

        if (scannedPiece !== EMPTY) {
          // Trouvé une pièce - est-ce un ennemi?
          const isEnemy = forPlayer ? isAnaPiece(scannedPiece) : isPlayerPiece(scannedPiece);

          if (isEnemy) {
            // Vérifier toutes les cases vides APRÈS l'ennemi
            let landRow = scanRow + dr;
            let landCol = scanCol + dc;

            while (landRow >= 0 && landRow < 8 && landCol >= 0 && landCol < 8 && board[landRow][landCol] === EMPTY) {
              // Capture possible! Vérifier captures en chaîne
              const newBoard = board.map(r => [...r]);
              newBoard[landRow][landCol] = piece;
              newBoard[row][col] = EMPTY;
              newBoard[scanRow][scanCol] = EMPTY;

              const chainCaptures = findCaptures(newBoard, landRow, landCol, forPlayer, piece);

              if (chainCaptures.length > 0) {
                for (const chain of chainCaptures) {
                  captures.push({
                    from: [row, col],
                    to: chain.to,
                    captures: [[scanRow, scanCol], ...chain.captures],
                    notation: `${toNotation(row, col)}x${chain.notation.split('x').pop()}`
                  });
                }
              } else {
                captures.push({
                  from: [row, col],
                  to: [landRow, landCol],
                  captures: [[scanRow, scanCol]],
                  notation: `${toNotation(row, col)}x${toNotation(landRow, landCol)}`
                });
              }

              landRow += dr;
              landCol += dc;
            }
          }
          // Pièce trouvée (ami ou ennemi), arrêter le scan dans cette direction
          break;
        }

        scanRow += dr;
        scanCol += dc;
      }
    } else {
      // PION NORMAL: Capture à distance 1 seulement
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
 * Supporte mode vsAna et vsHuman (2 joueurs)
 */
function play(sessionId, moveNotation) {
  const game = games.get(sessionId);

  if (!game) {
    return { success: false, error: "Aucune partie en cours. Dis 'nouvelle partie' pour commencer!" };
  }

  if (game.status !== 'playing') {
    return { success: false, error: "La partie est terminée. Dis 'nouvelle partie' pour rejouer!" };
  }

  // Compatibilité: accepter 'player' comme 'player1'
  const isPlayer1Turn = game.currentPlayer === 'player1' || game.currentPlayer === 'player';
  const isPlayer2Turn = game.currentPlayer === 'player2' || game.currentPlayer === 'ana';

  // En mode vsAna, seul player1 peut jouer via cette fonction
  if (game.mode === 'vsAna' && !isPlayer1Turn) {
    return { success: false, error: "Ce n'est pas ton tour!" };
  }

  // Déterminer qui joue (pour les pièces)
  const forPlayer1 = isPlayer1Turn;

  // Appliquer le coup
  const result = applyMoveGeneric(game, moveNotation, forPlayer1);

  if (!result.success) {
    return result;
  }

  // Mettre à jour les captures
  if (forPlayer1) {
    game.capturedByPlayer = (game.capturedByPlayer || 0) + result.capturesCount;
  } else {
    game.capturedByAna = (game.capturedByAna || 0) + result.capturesCount;
  }

  // Vérifier si l'adversaire peut encore jouer
  const opponentMoves = getLegalMoves(game.board, !forPlayer1);
  if (opponentMoves.length === 0) {
    const winner = forPlayer1 ? 'player1' : 'player2';
    game.status = winner + '_wins';
    const winMessage = game.mode === 'vsHuman'
      ? `${forPlayer1 ? 'Joueur 1' : 'Joueur 2'} gagne! 🎉`
      : (forPlayer1 ? "Tu m'as battue! Bien joué! 🎉" : "Je gagne! Meilleure chance la prochaine fois! 😊");

    return {
      success: true,
      move: result.move,
      board: formatBoard(game.board),
      boardData: game.board,
      gameOver: true,
      winner,
      status: game.status,
      message: winMessage,
      mode: game.mode,
      currentPlayer: null,
      score: { player: game.capturedByPlayer || 0, ana: game.capturedByAna || 0 },
      legalMoves: []
    };
  }

  // MODE 2 JOUEURS: Passer à l'autre joueur
  if (game.mode === 'vsHuman') {
    game.currentPlayer = forPlayer1 ? 'player2' : 'player1';
    const nextMoves = getLegalMoves(game.board, !forPlayer1).map(m => m.notation);

    return {
      success: true,
      move: result.move,
      board: formatBoard(game.board),
      boardData: game.board,
      status: 'playing',
      gameOver: false,
      mode: 'vsHuman',
      currentPlayer: game.currentPlayer,
      message: `Au tour de ${game.currentPlayer === 'player1' ? 'Joueur 1 (●)' : 'Joueur 2 (○)'}`,
      score: { player: game.capturedByPlayer || 0, ana: game.capturedByAna || 0 },
      legalMoves: nextMoves
    };
  }

  // MODE VS ANA: Ana joue automatiquement
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
    mode: 'vsAna',
    currentPlayer: 'player1',
    score: { player: game.capturedByPlayer || 0, ana: game.capturedByAna || 0 },
    legalMoves: newLegalMoves
  };
}

/**
 * Applique un mouvement générique (pour player1 ou player2)
 */
function applyMoveGeneric(game, moveNotation, forPlayer1) {
  const board = game.board;

  // Parser le mouvement
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

  // Vérifier que c'est bien un pion du bon joueur
  const piece = board[from[0]][from[1]];
  const isOwnPiece = forPlayer1 ? isPlayerPiece(piece) : isAnaPiece(piece);

  if (!isOwnPiece) {
    return { success: false, error: forPlayer1 ? "Ce n'est pas ton pion!" : "Ce n'est pas le pion du Joueur 2!" };
  }

  // Obtenir les mouvements légaux
  const legalMoves = getLegalMoves(board, forPlayer1);
  const move = legalMoves.find(m =>
    m.from[0] === from[0] && m.from[1] === from[1] &&
    m.to[0] === to[0] && m.to[1] === to[1]
  );

  if (!move) {
    const pieceMoves = legalMoves.filter(m => m.from[0] === from[0] && m.from[1] === from[1]);
    if (pieceMoves.length > 0) {
      const options = pieceMoves.map(m => m.notation).join(', ');
      return { success: false, error: `Mouvement illégal. Coups possibles: ${options}` };
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
  }

  // Promotion en dame
  if (forPlayer1 && to[0] === 0 && piece === PLAYER_PION) {
    board[to[0]][to[1]] = PLAYER_DAME;
  } else if (!forPlayer1 && to[0] === 7 && piece === ANA_PION) {
    board[to[0]][to[1]] = ANA_DAME;
  }

  game.history.push({
    player: forPlayer1 ? 'player1' : 'player2',
    move: move.notation,
    captures: move.captures.length
  });

  game.moveCount++;

  return { success: true, move: move.notation, capturesCount: move.captures.length };
}

/**
 * Obtient l'état actuel de la partie
 */
function getGameState(sessionId) {
  const game = games.get(sessionId);

  if (!game) {
    return { exists: false };
  }

  // Déterminer les coups légaux selon le joueur courant
  const isPlayer1Turn = game.currentPlayer === 'player1' || game.currentPlayer === 'player';
  const legalMoves = getLegalMoves(game.board, isPlayer1Turn).map(m => m.notation);

  return {
    exists: true,
    board: formatBoard(game.board),
    boardData: game.board,
    currentPlayer: game.currentPlayer,
    mode: game.mode || 'vsAna',
    status: game.status,
    score: { player: game.capturedByPlayer || 0, ana: game.capturedByAna || 0 },
    moveCount: game.moveCount,
    history: game.history,
    legalMoves
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

// DEBUG 2025-12-19: Test des mouvements de dame
function testDameMoves() {
  // Créer un plateau vide avec une seule dame du joueur en E4
  const board = Array(8).fill(null).map(() => Array(8).fill(EMPTY));
  board[4][4] = PLAYER_DAME;  // E4 = [4][4]

  const moves = getLegalMoves(board, true);
  return {
    board: formatBoard(board),
    piece: board[4][4],
    isDame: isDame(board[4][4]),
    constants: { EMPTY, PLAYER_PION, PLAYER_DAME, ANA_PION, ANA_DAME },
    movesCount: moves.length,
    moves: moves.map(m => m.notation)
  };
}

// DEBUG 2025-12-19: Test des captures longue distance
function testDameCaptures() {
  // Dame en A1, ennemi en C3, cases vides après
  const board = Array(8).fill(null).map(() => Array(8).fill(EMPTY));
  board[7][0] = PLAYER_DAME;  // A1 = [7][0]
  board[5][2] = ANA_PION;     // C3 = [5][2] - ennemi à 2 cases

  const moves = getLegalMoves(board, true);
  const captures = moves.filter(m => m.captures && m.captures.length > 0);

  return {
    board: formatBoard(board),
    damePosition: 'A1',
    enemyPosition: 'C3',
    totalMoves: moves.length,
    capturesCount: captures.length,
    captures: captures.map(m => m.notation),
    allMoves: moves.map(m => m.notation)
  };
}

module.exports = {
  newGame,
  play,
  getGameState,
  getHint,
  formatBoard,
  PIECE_NAMES,
  testDameMoves,     // DEBUG
  testDameCaptures   // DEBUG
};
