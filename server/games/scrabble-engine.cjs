/**
 * Scrabble Engine for Ana
 * Jeu de Scrabble complet avec règles françaises
 * Supporte mode vsAna et vsHuman (2 joueurs)
 */

const games = new Map();
let dictionaryService = null;
let dictionaryLoaded = false;

// Charger le service de dictionnaire
async function initDictionary() {
  if (dictionaryLoaded) return;
  try {
    dictionaryService = require('../services/dictionary-service.cjs');
    await dictionaryService.load();
    dictionaryLoaded = true;
    console.log('[Scrabble] Dictionnaire chargé:', dictionaryService.getStats());
  } catch (error) {
    console.error('[Scrabble] Erreur chargement dictionnaire:', error.message);
  }
}
initDictionary();

// ==================== CONSTANTES ====================

const BOARD_SIZE = 15;

// Distribution des lettres françaises (102 tuiles total)
const LETTER_DISTRIBUTION = {
  'A': { count: 9, points: 1 },
  'B': { count: 2, points: 3 },
  'C': { count: 2, points: 3 },
  'D': { count: 3, points: 2 },
  'E': { count: 15, points: 1 },
  'F': { count: 2, points: 4 },
  'G': { count: 2, points: 2 },
  'H': { count: 2, points: 4 },
  'I': { count: 8, points: 1 },
  'J': { count: 1, points: 8 },
  'K': { count: 1, points: 10 },
  'L': { count: 5, points: 1 },
  'M': { count: 3, points: 2 },
  'N': { count: 6, points: 1 },
  'O': { count: 6, points: 1 },
  'P': { count: 2, points: 3 },
  'Q': { count: 1, points: 8 },
  'R': { count: 6, points: 1 },
  'S': { count: 6, points: 1 },
  'T': { count: 6, points: 1 },
  'U': { count: 6, points: 1 },
  'V': { count: 2, points: 4 },
  'W': { count: 1, points: 10 },
  'X': { count: 1, points: 10 },
  'Y': { count: 1, points: 10 },
  'Z': { count: 1, points: 10 },
  '*': { count: 2, points: 0 }  // Jokers (blancs)
};

// Types de cases spéciales
const CELL_TYPES = {
  NORMAL: 'normal',
  DOUBLE_LETTER: 'dl',
  TRIPLE_LETTER: 'tl',
  DOUBLE_WORD: 'dw',
  TRIPLE_WORD: 'tw',
  CENTER: 'center'
};

// Positions des cases spéciales (plateau standard 15x15)
const SPECIAL_CELLS = {
  // Triple Word (coins et croix)
  tw: [
    [0,0], [0,7], [0,14],
    [7,0], [7,14],
    [14,0], [14,7], [14,14]
  ],
  // Double Word (diagonales)
  dw: [
    [1,1], [2,2], [3,3], [4,4],
    [1,13], [2,12], [3,11], [4,10],
    [13,1], [12,2], [11,3], [10,4],
    [13,13], [12,12], [11,11], [10,10]
  ],
  // Triple Letter
  tl: [
    [1,5], [1,9],
    [5,1], [5,5], [5,9], [5,13],
    [9,1], [9,5], [9,9], [9,13],
    [13,5], [13,9]
  ],
  // Double Letter
  dl: [
    [0,3], [0,11],
    [2,6], [2,8],
    [3,0], [3,7], [3,14],
    [6,2], [6,6], [6,8], [6,12],
    [7,3], [7,11],
    [8,2], [8,6], [8,8], [8,12],
    [11,0], [11,7], [11,14],
    [12,6], [12,8],
    [14,3], [14,11]
  ],
  // Centre
  center: [[7,7]]
};

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Crée un plateau vide avec les cases spéciales
 */
function createBoard() {
  const board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      board[row][col] = {
        letter: null,
        isBlank: false,      // Si c'est un joker utilisé comme cette lettre
        type: getCellType(row, col),
        locked: false        // true une fois qu'une lettre est définitivement placée
      };
    }
  }
  return board;
}

/**
 * Détermine le type d'une case
 */
function getCellType(row, col) {
  for (const [type, positions] of Object.entries(SPECIAL_CELLS)) {
    if (positions.some(([r, c]) => r === row && c === col)) {
      return type === 'center' ? CELL_TYPES.CENTER : type;
    }
  }
  return CELL_TYPES.NORMAL;
}

/**
 * Crée le sac de tuiles
 */
function createTileBag() {
  const bag = [];
  for (const [letter, info] of Object.entries(LETTER_DISTRIBUTION)) {
    for (let i = 0; i < info.count; i++) {
      bag.push({ letter, points: info.points, isBlank: letter === '*' });
    }
  }
  // Mélanger le sac
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/**
 * Pioche des tuiles du sac
 */
function drawTiles(bag, count) {
  const drawn = [];
  for (let i = 0; i < count && bag.length > 0; i++) {
    drawn.push(bag.pop());
  }
  return drawn;
}

/**
 * Obtient les points d'une lettre
 */
function getLetterPoints(letter) {
  if (!letter || letter === '*') return 0;
  return LETTER_DISTRIBUTION[letter.toUpperCase()]?.points || 0;
}

/**
 * Vérifie si un mot existe dans le dictionnaire
 */
function isValidWord(word) {
  if (!word || word.length < 2) return false;
  if (!dictionaryLoaded || !dictionaryService) {
    // Fallback: accepter tous les mots si le dictionnaire n'est pas chargé
    console.warn('[Scrabble] Dictionnaire non disponible, mot accepté:', word);
    return true;
  }
  return dictionaryService.wordExists(word.toLowerCase());
}

/**
 * Normalise un mot (enlève accents pour la comparaison)
 */
function normalizeWord(word) {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

// ==================== LOGIQUE DE JEU ====================

/**
 * Nouvelle partie
 */
function newGame(sessionId, mode = 'vsAna') {
  const bag = createTileBag();
  const board = createBoard();

  const player1Rack = drawTiles(bag, 7);
  const player2Rack = mode === 'vsAna' ? drawTiles(bag, 7) : drawTiles(bag, 7);

  const game = {
    mode,
    board,
    bag,
    players: {
      player1: {
        rack: player1Rack,
        score: 0,
        name: 'Joueur 1'
      },
      player2: {
        rack: player2Rack,
        score: 0,
        name: mode === 'vsAna' ? 'Ana' : 'Joueur 2'
      }
    },
    currentPlayer: 'player1',
    turnNumber: 1,
    consecutivePasses: 0,
    lastMove: null,
    status: 'playing',
    winner: null,
    moveHistory: []
  };

  games.set(sessionId, game);

  return formatGameState(game, 'player1');
}

/**
 * Formate l'état du jeu pour le client
 */
function formatGameState(game, viewAs = 'player1') {
  const opponent = viewAs === 'player1' ? 'player2' : 'player1';

  return {
    success: true,
    mode: game.mode,
    board: game.board.map(row => row.map(cell => ({
      letter: cell.letter,
      type: cell.type,
      locked: cell.locked,
      isBlank: cell.isBlank
    }))),
    rack: game.players[viewAs].rack,
    opponentRackCount: game.players[opponent].rack.length,
    scores: {
      player1: game.players.player1.score,
      player2: game.players.player2.score
    },
    playerNames: {
      player1: game.players.player1.name,
      player2: game.players.player2.name
    },
    currentPlayer: game.currentPlayer,
    isMyTurn: game.currentPlayer === viewAs,
    turnNumber: game.turnNumber,
    tilesRemaining: game.bag.length,
    status: game.status,
    winner: game.winner,
    lastMove: game.lastMove
  };
}

/**
 * Jouer un coup
 * @param {string} sessionId
 * @param {string} player - 'player1' ou 'player2'
 * @param {Array} tiles - [{letter, row, col, isBlank, blankLetter}]
 */
function playMove(sessionId, player, tiles) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };
  if (game.currentPlayer !== player) return { success: false, error: "Ce n'est pas ton tour" };

  // Valider le placement
  const validation = validatePlacement(game, tiles);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Calculer le score
  const scoreResult = calculateScore(game, tiles, validation.words);

  // Appliquer le coup
  applyMove(game, player, tiles, scoreResult);

  // Piocher de nouvelles tuiles
  const drawnTiles = drawTiles(game.bag, tiles.length);
  game.players[player].rack.push(...drawnTiles);

  // Vérifier fin de partie
  checkGameEnd(game);

  // Changer de joueur
  if (game.status === 'playing') {
    game.currentPlayer = player === 'player1' ? 'player2' : 'player1';
    game.turnNumber++;
    game.consecutivePasses = 0;
  }

  // Si c'est le tour d'Ana et mode vsAna
  let anaMove = null;
  if (game.mode === 'vsAna' && game.currentPlayer === 'player2' && game.status === 'playing') {
    anaMove = playAnaMove(game);
  }

  return {
    ...formatGameState(game, player),
    wordsPlayed: validation.words,
    pointsScored: scoreResult.total,
    tilesDrawn: drawnTiles.length,
    anaMove
  };
}

/**
 * Valide le placement des tuiles
 */
function validatePlacement(game, tiles) {
  if (!tiles || tiles.length === 0) {
    return { valid: false, error: "Aucune tuile placée" };
  }

  // Vérifier que toutes les positions sont valides et libres
  for (const tile of tiles) {
    if (tile.row < 0 || tile.row >= BOARD_SIZE || tile.col < 0 || tile.col >= BOARD_SIZE) {
      return { valid: false, error: "Position hors du plateau" };
    }
    if (game.board[tile.row][tile.col].letter !== null) {
      return { valid: false, error: "Case déjà occupée" };
    }
  }

  // Vérifier que les tuiles sont alignées (même ligne ou même colonne)
  const rows = [...new Set(tiles.map(t => t.row))];
  const cols = [...new Set(tiles.map(t => t.col))];

  const isHorizontal = rows.length === 1;
  const isVertical = cols.length === 1;

  if (!isHorizontal && !isVertical) {
    return { valid: false, error: "Les tuiles doivent être alignées" };
  }

  // Vérifier la continuité (pas de trous, sauf si cases déjà remplies)
  const direction = isHorizontal ? 'horizontal' : 'vertical';
  const sortedTiles = [...tiles].sort((a, b) =>
    isHorizontal ? a.col - b.col : a.row - b.row
  );

  const fixedCoord = isHorizontal ? sortedTiles[0].row : sortedTiles[0].col;
  const start = isHorizontal ? sortedTiles[0].col : sortedTiles[0].row;
  const end = isHorizontal ? sortedTiles[sortedTiles.length - 1].col : sortedTiles[sortedTiles.length - 1].row;

  // Vérifier qu'il n'y a pas de trous
  for (let i = start; i <= end; i++) {
    const row = isHorizontal ? fixedCoord : i;
    const col = isHorizontal ? i : fixedCoord;
    const existingTile = game.board[row][col].letter;
    const placedTile = tiles.find(t => t.row === row && t.col === col);

    if (!existingTile && !placedTile) {
      return { valid: false, error: "Les tuiles doivent être continues" };
    }
  }

  // Premier coup: doit passer par le centre
  const isFirstMove = game.moveHistory.length === 0;
  if (isFirstMove) {
    const touchesCenter = tiles.some(t => t.row === 7 && t.col === 7);
    if (!touchesCenter) {
      return { valid: false, error: "Le premier mot doit passer par le centre" };
    }
    if (tiles.length < 2) {
      return { valid: false, error: "Le premier mot doit avoir au moins 2 lettres" };
    }
  } else {
    // Vérifier que le mot est connecté à un mot existant
    let isConnected = false;
    for (const tile of tiles) {
      const neighbors = [
        [tile.row - 1, tile.col],
        [tile.row + 1, tile.col],
        [tile.row, tile.col - 1],
        [tile.row, tile.col + 1]
      ];
      for (const [r, c] of neighbors) {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (game.board[r][c].letter !== null) {
            isConnected = true;
            break;
          }
        }
      }
      if (isConnected) break;
    }

    if (!isConnected) {
      return { valid: false, error: "Le mot doit être connecté à un mot existant" };
    }
  }

  // Trouver tous les mots formés
  const words = findAllWords(game, tiles, direction);

  if (words.length === 0) {
    return { valid: false, error: "Aucun mot valide formé" };
  }

  // Vérifier que tous les mots sont dans le dictionnaire
  for (const wordInfo of words) {
    if (!isValidWord(wordInfo.word)) {
      return { valid: false, error: `"${wordInfo.word}" n'est pas dans le dictionnaire` };
    }
  }

  return { valid: true, words };
}

/**
 * Trouve tous les mots formés par le placement
 */
function findAllWords(game, tiles, mainDirection) {
  const words = [];

  // Créer un plateau temporaire avec les nouvelles tuiles
  const tempBoard = game.board.map(row => row.map(cell => ({ ...cell })));
  for (const tile of tiles) {
    const letter = tile.isBlank ? tile.blankLetter : tile.letter;
    tempBoard[tile.row][tile.col] = {
      ...tempBoard[tile.row][tile.col],
      letter: letter.toUpperCase(),
      isBlank: tile.isBlank,
      isNew: true
    };
  }

  // Trouver le mot principal
  const mainWord = findWordAt(tempBoard, tiles[0].row, tiles[0].col, mainDirection);
  if (mainWord && mainWord.word.length >= 2) {
    words.push(mainWord);
  }

  // Trouver les mots perpendiculaires
  const perpDirection = mainDirection === 'horizontal' ? 'vertical' : 'horizontal';
  for (const tile of tiles) {
    const perpWord = findWordAt(tempBoard, tile.row, tile.col, perpDirection);
    if (perpWord && perpWord.word.length >= 2) {
      // Éviter les doublons
      const isDuplicate = words.some(w =>
        w.word === perpWord.word &&
        w.startRow === perpWord.startRow &&
        w.startCol === perpWord.startCol
      );
      if (!isDuplicate) {
        words.push(perpWord);
      }
    }
  }

  return words;
}

/**
 * Trouve un mot à partir d'une position dans une direction
 */
function findWordAt(board, row, col, direction) {
  let startRow = row, startCol = col;

  // Remonter au début du mot
  if (direction === 'horizontal') {
    while (startCol > 0 && board[row][startCol - 1].letter) {
      startCol--;
    }
  } else {
    while (startRow > 0 && board[startRow - 1][col].letter) {
      startRow--;
    }
  }

  // Construire le mot
  let word = '';
  let cells = [];
  let currentRow = startRow, currentCol = startCol;

  while (currentRow < BOARD_SIZE && currentCol < BOARD_SIZE) {
    const cell = board[currentRow][currentCol];
    if (!cell.letter) break;

    word += cell.letter;
    cells.push({
      row: currentRow,
      col: currentCol,
      letter: cell.letter,
      type: cell.type,
      isNew: cell.isNew || false,
      isBlank: cell.isBlank || false
    });

    if (direction === 'horizontal') {
      currentCol++;
    } else {
      currentRow++;
    }
  }

  if (word.length < 2) return null;

  return {
    word,
    cells,
    startRow,
    startCol,
    direction
  };
}

/**
 * Calcule le score d'un coup
 */
function calculateScore(game, tiles, words) {
  let total = 0;
  const wordScores = [];

  // Créer un set des positions des nouvelles tuiles
  const newTilePositions = new Set(tiles.map(t => `${t.row},${t.col}`));

  for (const wordInfo of words) {
    let wordScore = 0;
    let wordMultiplier = 1;

    for (const cell of wordInfo.cells) {
      let letterScore = cell.isBlank ? 0 : getLetterPoints(cell.letter);
      const isNewTile = newTilePositions.has(`${cell.row},${cell.col}`);

      // Les bonus ne s'appliquent qu'aux nouvelles tuiles
      if (isNewTile) {
        switch (cell.type) {
          case 'dl':
            letterScore *= 2;
            break;
          case 'tl':
            letterScore *= 3;
            break;
          case 'dw':
          case 'center':
            wordMultiplier *= 2;
            break;
          case 'tw':
            wordMultiplier *= 3;
            break;
        }
      }

      wordScore += letterScore;
    }

    wordScore *= wordMultiplier;
    wordScores.push({ word: wordInfo.word, score: wordScore });
    total += wordScore;
  }

  // Bonus Scrabble (7 tuiles placées d'un coup)
  const scrabbleBonus = tiles.length === 7 ? 50 : 0;
  total += scrabbleBonus;

  return { total, wordScores, scrabbleBonus };
}

/**
 * Applique un coup au jeu
 */
function applyMove(game, player, tiles, scoreResult) {
  // Placer les tuiles sur le plateau
  for (const tile of tiles) {
    const letter = tile.isBlank ? tile.blankLetter : tile.letter;
    game.board[tile.row][tile.col] = {
      ...game.board[tile.row][tile.col],
      letter: letter.toUpperCase(),
      isBlank: tile.isBlank,
      locked: true
    };
  }

  // Retirer les tuiles du rack du joueur
  const playerRack = game.players[player].rack;
  for (const tile of tiles) {
    const index = playerRack.findIndex(t =>
      tile.isBlank ? t.isBlank : t.letter === tile.letter
    );
    if (index !== -1) {
      playerRack.splice(index, 1);
    }
  }

  // Ajouter les points
  game.players[player].score += scoreResult.total;

  // Enregistrer le coup
  game.lastMove = {
    player,
    tiles: tiles.map(t => ({ ...t })),
    score: scoreResult.total,
    words: scoreResult.wordScores
  };

  game.moveHistory.push(game.lastMove);
}

/**
 * Passer son tour
 */
function pass(sessionId, player) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };
  if (game.currentPlayer !== player) return { success: false, error: "Ce n'est pas ton tour" };

  game.consecutivePasses++;
  game.lastMove = { player, type: 'pass' };

  // 2 passes consécutifs = fin de partie
  if (game.consecutivePasses >= 2) {
    endGame(game, 'passes');
  } else {
    game.currentPlayer = player === 'player1' ? 'player2' : 'player1';
    game.turnNumber++;
  }

  // Tour d'Ana
  let anaMove = null;
  if (game.mode === 'vsAna' && game.currentPlayer === 'player2' && game.status === 'playing') {
    anaMove = playAnaMove(game);
  }

  return { ...formatGameState(game, player), anaMove };
}

/**
 * Échanger des tuiles
 */
function exchangeTiles(sessionId, player, tilesToExchange) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };
  if (game.currentPlayer !== player) return { success: false, error: "Ce n'est pas ton tour" };
  if (game.bag.length < tilesToExchange.length) {
    return { success: false, error: "Pas assez de tuiles dans le sac" };
  }

  const playerRack = game.players[player].rack;

  // Retirer les tuiles du rack
  const removedTiles = [];
  for (const tileToRemove of tilesToExchange) {
    const index = playerRack.findIndex(t =>
      tileToRemove.isBlank ? t.isBlank : t.letter === tileToRemove.letter
    );
    if (index === -1) {
      return { success: false, error: "Tuile non trouvée dans le rack" };
    }
    removedTiles.push(playerRack.splice(index, 1)[0]);
  }

  // Piocher de nouvelles tuiles
  const newTiles = drawTiles(game.bag, tilesToExchange.length);
  playerRack.push(...newTiles);

  // Remettre les tuiles échangées dans le sac et mélanger
  game.bag.push(...removedTiles);
  for (let i = game.bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [game.bag[i], game.bag[j]] = [game.bag[j], game.bag[i]];
  }

  game.consecutivePasses++;
  game.lastMove = { player, type: 'exchange', count: tilesToExchange.length };
  game.currentPlayer = player === 'player1' ? 'player2' : 'player1';
  game.turnNumber++;

  // Tour d'Ana
  let anaMove = null;
  if (game.mode === 'vsAna' && game.currentPlayer === 'player2' && game.status === 'playing') {
    anaMove = playAnaMove(game);
  }

  return { ...formatGameState(game, player), exchanged: true, anaMove };
}

/**
 * Vérifie si la partie est terminée
 */
function checkGameEnd(game) {
  // Un joueur a vidé son rack et le sac est vide
  const player1Empty = game.players.player1.rack.length === 0;
  const player2Empty = game.players.player2.rack.length === 0;
  const bagEmpty = game.bag.length === 0;

  if (bagEmpty && (player1Empty || player2Empty)) {
    endGame(game, player1Empty ? 'player1' : 'player2');
  }
}

/**
 * Termine la partie
 */
function endGame(game, reason) {
  game.status = 'finished';

  // Soustraire les points des tuiles restantes
  for (const playerKey of ['player1', 'player2']) {
    const player = game.players[playerKey];
    const rackValue = player.rack.reduce((sum, tile) => sum + tile.points, 0);
    player.score -= rackValue;

    // Si c'est le joueur qui a terminé, il gagne les points des autres
    if (reason === playerKey) {
      const otherKey = playerKey === 'player1' ? 'player2' : 'player1';
      const otherRackValue = game.players[otherKey].rack.reduce((sum, tile) => sum + tile.points, 0);
      player.score += otherRackValue;
    }
  }

  // Déterminer le gagnant
  if (game.players.player1.score > game.players.player2.score) {
    game.winner = 'player1';
  } else if (game.players.player2.score > game.players.player1.score) {
    game.winner = 'player2';
  } else {
    game.winner = 'tie';
  }
}

// ==================== IA D'ANA ====================

/**
 * Ana joue son tour
 */
function playAnaMove(game) {
  console.log('[Scrabble] Ana réfléchit...');

  const rack = game.players.player2.rack;
  const bestMove = findBestMove(game, rack);

  if (!bestMove || bestMove.tiles.length === 0) {
    // Ana passe si elle ne trouve pas de coup
    console.log('[Scrabble] Ana passe son tour');
    game.consecutivePasses++;
    game.lastMove = { player: 'player2', type: 'pass' };

    if (game.consecutivePasses >= 2) {
      endGame(game, 'passes');
    } else {
      game.currentPlayer = 'player1';
      game.turnNumber++;
    }

    return { type: 'pass' };
  }

  // Jouer le meilleur coup trouvé
  const validation = validatePlacement(game, bestMove.tiles);
  if (!validation.valid) {
    console.error('[Scrabble] Ana: coup invalide?', validation.error);
    game.consecutivePasses++;
    game.lastMove = { player: 'player2', type: 'pass' };
    game.currentPlayer = 'player1';
    game.turnNumber++;
    return { type: 'pass', error: validation.error };
  }

  const scoreResult = calculateScore(game, bestMove.tiles, validation.words);
  applyMove(game, 'player2', bestMove.tiles, scoreResult);

  // Piocher
  const drawnTiles = drawTiles(game.bag, bestMove.tiles.length);
  game.players.player2.rack.push(...drawnTiles);

  checkGameEnd(game);

  if (game.status === 'playing') {
    game.currentPlayer = 'player1';
    game.turnNumber++;
    game.consecutivePasses = 0;
  }

  console.log(`[Scrabble] Ana joue: ${validation.words.map(w => w.word).join(', ')} (+${scoreResult.total} pts)`);

  return {
    type: 'play',
    tiles: bestMove.tiles,
    words: validation.words.map(w => w.word),
    score: scoreResult.total
  };
}

/**
 * Trouve le meilleur coup possible pour Ana
 */
function findBestMove(game, rack) {
  const isFirstMove = game.moveHistory.length === 0;
  let bestMove = null;
  let bestScore = 0;

  // Obtenir toutes les positions d'ancrage (cases adjacentes à des lettres existantes)
  const anchors = isFirstMove ? [[7, 7]] : findAnchors(game.board);

  // Pour chaque ancrage, essayer de placer des mots
  for (const [anchorRow, anchorCol] of anchors) {
    // Essayer horizontal et vertical
    for (const direction of ['horizontal', 'vertical']) {
      const moves = generateMovesAtAnchor(game, rack, anchorRow, anchorCol, direction);

      for (const move of moves) {
        const validation = validatePlacement(game, move.tiles);
        if (validation.valid) {
          const scoreResult = calculateScore(game, move.tiles, validation.words);
          if (scoreResult.total > bestScore) {
            bestScore = scoreResult.total;
            bestMove = move;
          }
        }
      }
    }
  }

  return bestMove;
}

/**
 * Trouve les points d'ancrage sur le plateau
 */
function findAnchors(board) {
  const anchors = [];
  const hasLetter = new Set();

  // Marquer toutes les cases avec des lettres
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col].letter) {
        hasLetter.add(`${row},${col}`);
      }
    }
  }

  // Trouver les cases vides adjacentes à des lettres
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (!board[row][col].letter) {
        const neighbors = [
          [row - 1, col], [row + 1, col],
          [row, col - 1], [row, col + 1]
        ];
        for (const [nr, nc] of neighbors) {
          if (hasLetter.has(`${nr},${nc}`)) {
            anchors.push([row, col]);
            break;
          }
        }
      }
    }
  }

  return anchors;
}

/**
 * Génère des coups possibles à partir d'un ancrage
 */
function generateMovesAtAnchor(game, rack, anchorRow, anchorCol, direction) {
  const moves = [];
  const rackLetters = rack.map(t => t.isBlank ? '*' : t.letter);

  // Simplification: essayer des mots du dictionnaire qui peuvent être formés
  if (!dictionaryLoaded || !dictionaryService) {
    return moves;
  }

  // Obtenir des mots possibles avec les lettres du rack
  const possibleWords = findWordsWithLetters(rackLetters, 7);

  for (const word of possibleWords) {
    // Essayer de placer ce mot à l'ancrage
    const placement = tryPlaceWord(game, word, anchorRow, anchorCol, direction, rack);
    if (placement) {
      moves.push(placement);
    }
  }

  return moves;
}

/**
 * Trouve des mots possibles avec les lettres données
 */
function findWordsWithLetters(letters, maxLength) {
  if (!dictionaryLoaded || !dictionaryService) return [];

  const words = [];
  const letterCount = {};
  let blanks = 0;

  for (const letter of letters) {
    if (letter === '*') {
      blanks++;
    } else {
      letterCount[letter] = (letterCount[letter] || 0) + 1;
    }
  }

  // Chercher dans le dictionnaire (limiter la recherche)
  const allWords = dictionaryService.words.all || [];
  const sampleSize = Math.min(5000, allWords.length);
  const sample = [];

  // Échantillonner aléatoirement pour la performance
  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.floor(Math.random() * allWords.length);
    sample.push(allWords[idx]);
  }

  for (const word of sample) {
    if (word.length > maxLength || word.length < 2) continue;

    const upperWord = word.toUpperCase();
    if (canFormWord(upperWord, { ...letterCount }, blanks)) {
      words.push(upperWord);
    }
  }

  return words;
}

/**
 * Vérifie si un mot peut être formé avec les lettres disponibles
 */
function canFormWord(word, letterCount, blanks) {
  const needed = {};

  for (const char of word) {
    needed[char] = (needed[char] || 0) + 1;
  }

  let blanksNeeded = 0;
  for (const [char, count] of Object.entries(needed)) {
    const available = letterCount[char] || 0;
    if (available < count) {
      blanksNeeded += count - available;
    }
  }

  return blanksNeeded <= blanks;
}

/**
 * Essaie de placer un mot à une position
 */
function tryPlaceWord(game, word, anchorRow, anchorCol, direction, rack) {
  const tiles = [];
  const usedRack = [];
  const rackCopy = rack.map(t => ({ ...t }));

  for (let i = 0; i < word.length; i++) {
    const row = direction === 'horizontal' ? anchorRow : anchorRow + i;
    const col = direction === 'horizontal' ? anchorCol + i : anchorCol;

    if (row >= BOARD_SIZE || col >= BOARD_SIZE) return null;

    const existingLetter = game.board[row][col].letter;

    if (existingLetter) {
      // La case a déjà une lettre, elle doit correspondre
      if (existingLetter !== word[i]) return null;
    } else {
      // Trouver la tuile dans le rack
      const letter = word[i];
      let tileIndex = rackCopy.findIndex(t => !t.isBlank && t.letter === letter);

      if (tileIndex === -1) {
        // Essayer avec un joker
        tileIndex = rackCopy.findIndex(t => t.isBlank);
        if (tileIndex === -1) return null;

        tiles.push({
          letter: '*',
          blankLetter: letter,
          isBlank: true,
          row,
          col
        });
      } else {
        tiles.push({
          letter,
          isBlank: false,
          row,
          col
        });
      }

      rackCopy.splice(tileIndex, 1);
    }
  }

  if (tiles.length === 0) return null;

  return { tiles, word };
}

// ==================== API ====================

function getState(sessionId, player = 'player1') {
  const game = games.get(sessionId);
  if (!game) return { exists: false };
  return { exists: true, ...formatGameState(game, player) };
}

function getLetterValues() {
  const values = {};
  for (const [letter, info] of Object.entries(LETTER_DISTRIBUTION)) {
    values[letter] = info.points;
  }
  return values;
}

module.exports = {
  newGame,
  playMove,
  pass,
  exchangeTiles,
  getState,
  getLetterValues,
  BOARD_SIZE,
  CELL_TYPES
};
