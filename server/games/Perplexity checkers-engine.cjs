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
    legalMoves
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
  const row = 8 - parseInt(pos[1], 10);             // 8=0, 7=1, etc.

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

    // Dames: déplacement sur plusieurs cases
    if (isDame(piece)) {
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
          break;
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
 * Support capture longue distance pour les dames
 */
function findCaptures(board, row, col, forPlayer, piece) {
  const captures = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  for (const [dr, dc] of directions) {
    if (isDame(piece)) {
      // DAME: scanner toute la diagonale pour trouver un ennemi
      let scanRow = row + dr;
      let scanCol = col + dc;

      while (scanRow >= 0 && scanRow < 8 && scanCol >= 0 && scanCol < 8) {
        const scannedPiece = board[scanRow][scanCol];

        if (scannedPiece !== EMPTY) {
          const isEnemy = forPlayer ? isAnaPiece(scannedPiece) : isPlayerPiece(scannedPiece);

          if (isEnemy) {
            // Cases d'atterrissage possibles APRÈS l'ennemi
            let landRow = scanRow + dr;
            let landCol = scanCol + dc;

            while (landRow >= 0 && landRow < 8 && landCol >= 0 && landCol < 8 && board[landRow][landCol] === EMPTY) {
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
          // Ami ou ennemi rencontré: on stoppe dans cette direction
          break;
        }

        scanRow += dr;
        scanCol += dc;
      }
    } else {
      // PION: capture à distance 1
      const jumpRow = row + dr;
      const jumpCol = col + dc;
      const landRow = row + 2 * dr;
      const landCol = col + 2 * dc;

      if (landRow >= 0 && landRow < 8 && landCol >= 0 && landCol < 8 &&
          jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
        const jumpPiece = board[jumpRow][jumpCol];
        const isEnemy = forPlayer ? isAnaPiece(jumpPiece) : isPlayerPiece(jumpPiece);

        if (isEnemy && board[landRow][landCol] === EMPTY) {
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
 * Applique un mouvement simple pour le joueur (API legacy)
 * Retourne un objet move complet (comme les autres)
 */
function applyMove(game, moveNotation) {
  const board = game.board;

  const isCapture = moveNotation.includes('x');
  const parts = moveNotation.split(isCapture ?
