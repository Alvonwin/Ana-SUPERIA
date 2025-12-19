/**
 * Battleship (Bataille Navale) Engine for Ana
 * Un jeu avec placement de bateaux et combat strategique
 * Supporte mode vsAna et vsHuman (2 joueurs)
 *
 * CORRIGE: 15 dec 2025
 * - IA pattern damier corrige
 * - Memory leak fix (sessions expirent)
 * - Grilles coherentes
 * - Duplicats aiTargets elimines
 * - Status unifie
 */

const games = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Definition des bateaux
const SHIPS = {
  carrier: { name: 'Porte-avions', size: 5, symbol: 'P' },
  battleship: { name: 'Croiseur', size: 4, symbol: 'C' },
  destroyer: { name: 'Destroyer', size: 3, symbol: 'D' },
  submarine: { name: 'Sous-marin', size: 3, symbol: 'S' },
  patrol: { name: 'Torpilleur', size: 2, symbol: 'T' }
};

const GRID_SIZE = 10;
const COLS = 'ABCDEFGHIJ';

// Nettoyage periodique des sessions expirees
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, game] of games.entries()) {
    if (now - game.lastActivity > SESSION_TIMEOUT) {
      games.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Creer une grille vide
function createGrid() {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

// Convertir coordonnees (ex: "B5" -> {row: 4, col: 1})
function parseCoord(coord) {
  if (!coord || typeof coord !== 'string' || coord.length < 2 || coord.length > 3) return null;
  const col = COLS.indexOf(coord[0].toUpperCase());
  const row = parseInt(coord.slice(1), 10) - 1;
  if (col === -1 || isNaN(row) || row < 0 || row >= GRID_SIZE || col >= GRID_SIZE) return null;
  return { row, col };
}

// Convertir index en coordonnee (ex: {row: 4, col: 1} -> "B5")
function toCoord(row, col) {
  return `${COLS[col]}${row + 1}`;
}

// Verifier si un bateau peut etre place
function canPlaceShip(grid, row, col, size, horizontal) {
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (r >= GRID_SIZE || c >= GRID_SIZE || r < 0 || c < 0) {
      return false;
    }
    if (grid[r][c] !== null) {
      return false;
    }
  }
  return true;
}

// Placer un bateau sur la grille
function placeShip(grid, row, col, size, horizontal, symbol) {
  const positions = [];
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    grid[r][c] = symbol;
    positions.push({ row: r, col: c });
  }
  return positions;
}

// Placement aleatoire pour Ana
function placeShipsRandomly(grid) {
  const ships = {};
  for (const [key, ship] of Object.entries(SHIPS)) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      const horizontal = Math.random() > 0.5;
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      if (canPlaceShip(grid, row, col, ship.size, horizontal)) {
        const positions = placeShip(grid, row, col, ship.size, horizontal, ship.symbol);
        ships[key] = { ...ship, positions, hits: 0, sunk: false };
        placed = true;
      }
      attempts++;
    }
  }
  return ships;
}

/**
 * Nouvelle partie
 * @param {string} sessionId - ID de session
 * @param {string} mode - 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
 */
function newGame(sessionId, mode = 'vsAna') {
  const shipsToPlace = Object.keys(SHIPS);
  const firstShipKey = shipsToPlace[0];
  const firstShip = SHIPS[firstShipKey];

  if (mode === 'vsHuman') {
    // Mode 2 joueurs
    const game = {
      mode: 'vsHuman',
      player1Grid: createGrid(),
      player2Grid: createGrid(),
      player1Shots: createGrid(),
      player2Shots: createGrid(),
      player1Ships: {},
      player2Ships: {},
      phase: 'placement1', // placement1, placement2, battle
      currentPlayer: 'player1',
      shipsToPlace,
      currentShipIndex: 0,
      gameOver: false,
      winner: null,
      lastActivity: Date.now()
    };

    games.set(sessionId, game);

    return {
      success: true,
      mode: 'vsHuman',
      phase: 'placement1',
      currentPlayer: 'player1',
      gridSize: GRID_SIZE,
      playerGrid: formatGridForPlayer(game.player1Grid),
      shipsToPlace: Object.entries(SHIPS).map(([key, ship]) => ({
        id: key,
        name: ship.name,
        size: ship.size
      })),
      currentShip: {
        id: firstShipKey,
        name: firstShip.name,
        size: firstShip.size
      },
      message: `Joueur 1: Place tes bateaux! Commence par le ${firstShip.name} (${firstShip.size} cases).`
    };
  }

  // Mode vsAna (original)
  const playerGrid = createGrid();
  const anaGrid = createGrid();
  const playerShots = createGrid();
  const anaShots = createGrid();

  // Ana place ses bateaux
  const anaShips = placeShipsRandomly(anaGrid);

  const game = {
    mode: 'vsAna',
    playerGrid,
    anaGrid,
    playerShots,
    anaShots,
    playerShips: {},
    anaShips,
    phase: 'placement',
    shipsToPlace,
    currentShipIndex: 0,
    gameOver: false,
    winner: null,
    // IA de traque
    aiMode: 'hunt',
    aiTargets: [],
    aiHitDirection: null, // 'h' ou 'v' quand on detecte l'orientation
    aiFirstHit: null,
    lastActivity: Date.now()
  };

  games.set(sessionId, game);

  return {
    success: true,
    mode: 'vsAna',
    phase: 'placement',
    gridSize: GRID_SIZE,
    playerGrid: formatGridForPlayer(playerGrid),
    shipsToPlace: Object.entries(SHIPS).map(([key, ship]) => ({
      id: key,
      name: ship.name,
      size: ship.size
    })),
    currentShip: {
      id: firstShipKey,
      name: firstShip.name,
      size: firstShip.size
    },
    message: `Place tes bateaux! Commence par le ${firstShip.name} (${firstShip.size} cases).`
  };
}

// Placer un bateau (joueur)
function placePlayerShip(sessionId, coord, horizontal = true) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.gameOver) return { success: false, error: "La partie est terminee" };

  game.lastActivity = Date.now();

  // Mode vsHuman
  if (game.mode === 'vsHuman') {
    if (game.phase !== 'placement1' && game.phase !== 'placement2') {
      return { success: false, error: "Phase de placement terminee" };
    }

    const pos = parseCoord(coord);
    if (!pos) return { success: false, error: "Coordonnee invalide (ex: A1, B5, J10)" };

    const shipKey = game.shipsToPlace[game.currentShipIndex];
    if (!shipKey) return { success: false, error: "Tous les bateaux sont deja places" };

    const ship = SHIPS[shipKey];
    const isPlayer1 = game.phase === 'placement1';
    const currentGrid = isPlayer1 ? game.player1Grid : game.player2Grid;
    const currentShips = isPlayer1 ? game.player1Ships : game.player2Ships;

    if (!canPlaceShip(currentGrid, pos.row, pos.col, ship.size, horizontal)) {
      return {
        success: false,
        error: `Impossible de placer le ${ship.name} ici.`
      };
    }

    const positions = placeShip(currentGrid, pos.row, pos.col, ship.size, horizontal, ship.symbol);
    currentShips[shipKey] = { ...ship, positions, hits: 0, sunk: false };
    game.currentShipIndex++;

    // Tous les bateaux places pour ce joueur?
    if (game.currentShipIndex >= game.shipsToPlace.length) {
      if (isPlayer1) {
        // Passer à J2
        game.phase = 'placement2';
        game.currentPlayer = 'player2';
        game.currentShipIndex = 0;
        const nextShipKey = game.shipsToPlace[0];
        const nextShip = SHIPS[nextShipKey];
        return {
          success: true,
          mode: 'vsHuman',
          placed: { ship: ship.name, positions: positions.map(p => toCoord(p.row, p.col)) },
          phase: 'placement2',
          currentPlayer: 'player2',
          playerGrid: formatGridForPlayer(game.player2Grid), // Grille vide de J2
          currentShip: {
            id: nextShipKey,
            name: nextShip.name,
            size: nextShip.size
          },
          message: `Joueur 1 a termine! Passe l'ecran a Joueur 2. J2: Place le ${nextShip.name}.`
        };
      } else {
        // Tous les bateaux places, bataille!
        game.phase = 'battle';
        game.currentPlayer = 'player1';
        return {
          success: true,
          mode: 'vsHuman',
          placed: { ship: ship.name, positions: positions.map(p => toCoord(p.row, p.col)) },
          phase: 'battle',
          currentPlayer: 'player1',
          currentShip: null,
          message: "Tous les bateaux sont places! La bataille commence! Joueur 1 tire en premier."
        };
      }
    }

    const nextShipKey = game.shipsToPlace[game.currentShipIndex];
    const nextShip = SHIPS[nextShipKey];
    const playerLabel = isPlayer1 ? 'J1' : 'J2';

    return {
      success: true,
      mode: 'vsHuman',
      placed: { ship: ship.name, positions: positions.map(p => toCoord(p.row, p.col)) },
      phase: game.phase,
      currentPlayer: game.currentPlayer,
      playerGrid: formatGridForPlayer(currentGrid),
      currentShip: {
        id: nextShipKey,
        name: nextShip.name,
        size: nextShip.size
      },
      message: `${playerLabel}: ${ship.name} place! Place le ${nextShip.name} (${nextShip.size} cases).`
    };
  }

  // Mode vsAna (original)
  if (game.phase !== 'placement') return { success: false, error: "Phase de placement terminee" };

  const pos = parseCoord(coord);
  if (!pos) return { success: false, error: "Coordonnee invalide (ex: A1, B5, J10)" };

  const shipKey = game.shipsToPlace[game.currentShipIndex];
  if (!shipKey) return { success: false, error: "Tous les bateaux sont deja places" };

  const ship = SHIPS[shipKey];

  if (!canPlaceShip(game.playerGrid, pos.row, pos.col, ship.size, horizontal)) {
    return {
      success: false,
      error: `Impossible de placer le ${ship.name} ici. Verifie que le bateau tient dans la grille et ne chevauche pas un autre.`
    };
  }

  const positions = placeShip(game.playerGrid, pos.row, pos.col, ship.size, horizontal, ship.symbol);
  game.playerShips[shipKey] = { ...ship, positions, hits: 0, sunk: false };
  game.currentShipIndex++;

  // Tous les bateaux places?
  if (game.currentShipIndex >= game.shipsToPlace.length) {
    game.phase = 'battle';
    return {
      success: true,
      mode: 'vsAna',
      placed: { ship: ship.name, positions: positions.map(p => toCoord(p.row, p.col)) },
      phase: 'battle',
      playerGrid: formatGridForPlayer(game.playerGrid),
      currentShip: null,
      message: "Tous tes bateaux sont places! La bataille commence! Tire sur une case (ex: B5)"
    };
  }

  const nextShipKey = game.shipsToPlace[game.currentShipIndex];
  const nextShip = SHIPS[nextShipKey];

  return {
    success: true,
    mode: 'vsAna',
    placed: { ship: ship.name, positions: positions.map(p => toCoord(p.row, p.col)) },
    phase: 'placement',
    playerGrid: formatGridForPlayer(game.playerGrid),
    currentShip: {
      id: nextShipKey,
      name: nextShip.name,
      size: nextShip.size
    },
    message: `${ship.name} place! Maintenant place le ${nextShip.name} (${nextShip.size} cases).`
  };
}

// Formater la grille pour l'affichage (coherent avec ~)
function formatGridForPlayer(grid) {
  return grid.map((row, i) =>
    row.map((cell, j) => ({
      coord: toCoord(i, j),
      content: cell === 'hit' ? 'X' : cell === 'miss' ? 'O' : cell || '~'
    }))
  );
}

// Formater la grille de tir (ce que le joueur voit des tirs sur Ana)
function formatShotsGrid(shotsGrid) {
  return shotsGrid.map((row, i) =>
    row.map((cell, j) => ({
      coord: toCoord(i, j),
      content: cell === 'hit' ? 'X' : cell === 'miss' ? 'O' : '~'
    }))
  );
}

// Tirer (joueur)
function fire(sessionId, coord) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.phase !== 'battle') return { success: false, error: "La bataille n'a pas encore commence" };
  if (game.gameOver) return { success: false, error: "La partie est terminee" };

  game.lastActivity = Date.now();

  const pos = parseCoord(coord);
  if (!pos) return { success: false, error: "Coordonnee invalide (ex: A1, B5, J10)" };

  // Mode vsHuman
  if (game.mode === 'vsHuman') {
    const isPlayer1 = game.currentPlayer === 'player1';
    const shooterShots = isPlayer1 ? game.player1Shots : game.player2Shots;
    const targetGrid = isPlayer1 ? game.player2Grid : game.player1Grid;
    const targetShips = isPlayer1 ? game.player2Ships : game.player1Ships;

    // Deja tire ici?
    if (shooterShots[pos.row][pos.col]) {
      return { success: false, error: "Deja tire ici!" };
    }

    // Resultat du tir
    const target = targetGrid[pos.row][pos.col];
    let result = { coord, hit: false, sunk: false, shipName: null };

    if (target && target !== 'hit' && target !== 'miss') {
      // Touche!
      shooterShots[pos.row][pos.col] = 'hit';
      targetGrid[pos.row][pos.col] = 'hit';
      result.hit = true;

      // Trouver le bateau touche
      for (const [key, ship] of Object.entries(targetShips)) {
        if (ship.positions.some(p => p.row === pos.row && p.col === pos.col)) {
          ship.hits++;
          result.shipName = ship.name;
          if (ship.hits >= ship.size) {
            ship.sunk = true;
            result.sunk = true;
          }
          break;
        }
      }
    } else {
      // Manque
      shooterShots[pos.row][pos.col] = 'miss';
    }

    // Verifier victoire
    const allTargetSunk = Object.values(targetShips).every(s => s.sunk);
    if (allTargetSunk) {
      game.gameOver = true;
      game.winner = isPlayer1 ? 'player1' : 'player2';
      game.phase = 'finished';
      return {
        success: true,
        mode: 'vsHuman',
        shot: result,
        gameOver: true,
        winner: game.winner,
        currentPlayer: game.currentPlayer,
        shotsGrid: formatShotsGrid(shooterShots),
        myShipsStatus: getShipsStatus(isPlayer1 ? game.player1Ships : game.player2Ships),
        enemyShipsStatus: getShipsStatus(targetShips, false),
        message: `${isPlayer1 ? 'Joueur 1' : 'Joueur 2'} gagne!`
      };
    }

    // Changer de joueur
    game.currentPlayer = isPlayer1 ? 'player2' : 'player1';
    const nextPlayer = game.currentPlayer;
    const nextShooterShots = nextPlayer === 'player1' ? game.player1Shots : game.player2Shots;

    return {
      success: true,
      mode: 'vsHuman',
      phase: 'battle',
      shot: result,
      currentPlayer: nextPlayer,
      shotsGrid: formatShotsGrid(nextShooterShots),
      myShipsStatus: getShipsStatus(nextPlayer === 'player1' ? game.player1Ships : game.player2Ships),
      enemyShipsStatus: getShipsStatus(nextPlayer === 'player1' ? game.player2Ships : game.player1Ships, true),
      message: result.hit
        ? `${result.sunk ? 'Coule!' : 'Touche!'} Au tour de ${nextPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'}.`
        : `Manque! Au tour de ${nextPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'}.`
    };
  }

  // Mode vsAna (original)
  // Deja tire ici?
  if (game.playerShots[pos.row][pos.col]) {
    return { success: false, error: "Tu as deja tire ici!" };
  }

  // Resultat du tir
  const target = game.anaGrid[pos.row][pos.col];
  let result = { coord, hit: false, sunk: false, shipName: null };

  if (target && target !== 'hit' && target !== 'miss') {
    // Touche!
    game.playerShots[pos.row][pos.col] = 'hit';
    game.anaGrid[pos.row][pos.col] = 'hit';
    result.hit = true;

    // Trouver le bateau touche
    for (const [key, ship] of Object.entries(game.anaShips)) {
      if (ship.positions.some(p => p.row === pos.row && p.col === pos.col)) {
        ship.hits++;
        result.shipName = ship.name;
        if (ship.hits >= ship.size) {
          ship.sunk = true;
          result.sunk = true;
        }
        break;
      }
    }
  } else {
    // Manque
    game.playerShots[pos.row][pos.col] = 'miss';
  }

  // Verifier victoire joueur
  const allAnaSunk = Object.values(game.anaShips).every(s => s.sunk);
  if (allAnaSunk) {
    game.gameOver = true;
    game.winner = 'player';
    game.phase = 'finished';
    return {
      success: true,
      mode: 'vsAna',
      playerShot: result,
      gameOver: true,
      winner: 'player',
      shotsGrid: formatShotsGrid(game.playerShots),
      playerGrid: formatGridForPlayer(game.playerGrid),
      stats: getStats(game),
      playerShipsStatus: getShipsStatus(game.playerShips),
      anaShipsStatus: getShipsStatus(game.anaShips, false)
    };
  }

  // Tour d'Ana
  const anaResult = anaFire(game);

  // Verifier victoire Ana
  const allPlayerSunk = Object.values(game.playerShips).every(s => s.sunk);
  if (allPlayerSunk) {
    game.gameOver = true;
    game.winner = 'ana';
    game.phase = 'finished';
    return {
      success: true,
      mode: 'vsAna',
      playerShot: result,
      anaShot: anaResult,
      gameOver: true,
      winner: 'ana',
      playerGrid: formatGridForPlayer(game.playerGrid),
      shotsGrid: formatShotsGrid(game.playerShots),
      stats: getStats(game),
      playerShipsStatus: getShipsStatus(game.playerShips),
      anaShipsStatus: getShipsStatus(game.anaShips, false)
    };
  }

  return {
    success: true,
    mode: 'vsAna',
    phase: 'battle',  // FIX 2025-12-16: CRUCIAL
    playerShot: result,
    anaShot: anaResult,
    playerGrid: formatGridForPlayer(game.playerGrid),
    shotsGrid: formatShotsGrid(game.playerShots),
    playerShipsStatus: getShipsStatus(game.playerShips),
    anaShipsStatus: getShipsStatus(game.anaShips, true)
  };
}

// IA de tir pour Ana - amelioree
function anaFire(game) {
  let row, col;

  // Nettoyer les cibles invalides (deja tirees)
  game.aiTargets = game.aiTargets.filter(t => game.anaShots[t.row][t.col] === null);

  if (game.aiMode === 'target' && game.aiTargets.length > 0) {
    // Mode traque - cibler autour du dernier hit
    const target = game.aiTargets.shift();
    row = target.row;
    col = target.col;
  } else {
    // Mode chasse - tir en pattern damier (plus efficace)
    game.aiMode = 'hunt';
    game.aiHitDirection = null;
    game.aiFirstHit = null;

    // Collecter toutes les cases valides en pattern damier
    const validCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        // Pattern damier: on cible les cases ou (r + c) % 2 === 0
        if ((r + c) % 2 === 0 && game.anaShots[r][c] === null) {
          validCells.push({ row: r, col: c });
        }
      }
    }

    // Si plus de cases damier, cibler le reste
    if (validCells.length === 0) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (game.anaShots[r][c] === null) {
            validCells.push({ row: r, col: c });
          }
        }
      }
    }

    if (validCells.length === 0) {
      // Plus de cases - ne devrait pas arriver
      return { coord: 'A1', hit: false, sunk: false, shipName: null };
    }

    // Choisir aleatoirement parmi les cases valides
    const chosen = validCells[Math.floor(Math.random() * validCells.length)];
    row = chosen.row;
    col = chosen.col;
  }

  // Effectuer le tir
  const coord = toCoord(row, col);
  const target = game.playerGrid[row][col];
  let result = { coord, hit: false, sunk: false, shipName: null };

  if (target && target !== 'hit' && target !== 'miss') {
    // Touche!
    game.anaShots[row][col] = 'hit';
    game.playerGrid[row][col] = 'hit';
    result.hit = true;

    // Passer en mode traque
    game.aiMode = 'target';

    if (!game.aiFirstHit) {
      game.aiFirstHit = { row, col };
    }

    // Ajouter les cases adjacentes comme cibles (sans doublons)
    const adjacent = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 }
    ].filter(p =>
      p.row >= 0 && p.row < GRID_SIZE &&
      p.col >= 0 && p.col < GRID_SIZE &&
      game.anaShots[p.row][p.col] === null &&
      !game.aiTargets.some(t => t.row === p.row && t.col === p.col)
    );

    // Si on a detecte une direction, prioriser cette direction
    if (game.aiHitDirection === 'h') {
      // Prioriser horizontal
      adjacent.sort((a, b) => {
        const aIsH = a.row === row;
        const bIsH = b.row === row;
        return bIsH - aIsH;
      });
    } else if (game.aiHitDirection === 'v') {
      // Prioriser vertical
      adjacent.sort((a, b) => {
        const aIsV = a.col === col;
        const bIsV = b.col === col;
        return bIsV - aIsV;
      });
    }

    game.aiTargets = [...adjacent, ...game.aiTargets];

    // Detecter la direction si on a deja un hit
    if (game.aiFirstHit && (game.aiFirstHit.row !== row || game.aiFirstHit.col !== col)) {
      if (game.aiFirstHit.row === row) {
        game.aiHitDirection = 'h';
      } else if (game.aiFirstHit.col === col) {
        game.aiHitDirection = 'v';
      }
    }

    // Trouver le bateau touche
    for (const [key, ship] of Object.entries(game.playerShips)) {
      if (ship.positions.some(p => p.row === row && p.col === col)) {
        ship.hits++;
        result.shipName = ship.name;
        if (ship.hits >= ship.size) {
          ship.sunk = true;
          result.sunk = true;
          // Bateau coule - revenir en mode chasse
          game.aiMode = 'hunt';
          game.aiTargets = [];
          game.aiHitDirection = null;
          game.aiFirstHit = null;
        }
        break;
      }
    }
  } else {
    // Manque
    game.anaShots[row][col] = 'miss';
  }

  return result;
}

// Obtenir le statut des bateaux
function getShipsStatus(ships, hideActive = false) {
  return Object.entries(ships).map(([key, ship]) => ({
    id: key,
    name: ship.name,
    size: ship.size,
    hits: hideActive && !ship.sunk ? '?' : ship.hits,
    sunk: ship.sunk
  }));
}

// Statistiques de fin de partie
function getStats(game) {
  const playerHits = game.playerShots.flat().filter(c => c === 'hit').length;
  const playerMisses = game.playerShots.flat().filter(c => c === 'miss').length;
  const anaHits = game.anaShots.flat().filter(c => c === 'hit').length;
  const anaMisses = game.anaShots.flat().filter(c => c === 'miss').length;

  const playerTotal = playerHits + playerMisses;
  const anaTotal = anaHits + anaMisses;

  return {
    player: {
      hits: playerHits,
      misses: playerMisses,
      accuracy: playerTotal > 0 ? Math.round(playerHits / playerTotal * 100) : 0
    },
    ana: {
      hits: anaHits,
      misses: anaMisses,
      accuracy: anaTotal > 0 ? Math.round(anaHits / anaTotal * 100) : 0
    }
  };
}

// Etat du jeu
function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };

  game.lastActivity = Date.now();

  const currentShipKey = game.shipsToPlace[game.currentShipIndex];
  const currentShip = currentShipKey ? {
    id: currentShipKey,
    name: SHIPS[currentShipKey].name,
    size: SHIPS[currentShipKey].size
  } : null;

  return {
    exists: true,
    phase: game.phase,
    gameOver: game.gameOver,
    winner: game.winner,
    playerGrid: formatGridForPlayer(game.playerGrid),
    shotsGrid: formatShotsGrid(game.playerShots),
    playerShipsStatus: getShipsStatus(game.playerShips),
    anaShipsStatus: getShipsStatus(game.anaShips, !game.gameOver),
    currentShip,
    stats: game.gameOver ? getStats(game) : null
  };
}

module.exports = {
  newGame,
  placePlayerShip,
  fire,
  getState,
  SHIPS,
  GRID_SIZE
};
