/**
 * Nim Game Engine for Ana
 * Jeu mathématique: retire des bâtonnets, celui qui prend le dernier perd!
 * Supporte mode vsAna et vsHuman (2 joueurs)
 */

const games = new Map();

/**
 * Démarre une nouvelle partie
 * @param {string} sessionId - ID de session
 * @param {string} difficulty - Difficulté (ignoré pour Nim, pour cohérence API)
 * @param {string} mode - 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
 * @param {number[]} piles - Configuration des piles (défaut: [3, 5, 7])
 */
function newGame(sessionId, difficulty = 'normal', mode = 'vsAna', piles = [3, 5, 7]) {
  const pilesArray = Array.isArray(piles) ? piles : [3, 5, 7];
  const game = {
    piles: [...pilesArray],
    currentPlayer: 'player1',
    mode,  // 'vsAna' ou 'vsHuman'
    status: 'playing',
    moves: []
  };
  games.set(sessionId, game);

  const message = mode === 'vsHuman'
    ? "Partie 2 joueurs! Celui qui prend le dernier bâtonnet perd! Joueur 1 commence!"
    : "Nim! Celui qui prend le dernier bâtonnet perd! À toi!";

  return {
    success: true,
    piles: game.piles,
    currentPlayer: 'player1',
    mode,
    status: 'playing',
    totalSticks: pilesArray.reduce((a, b) => a + b, 0),
    message
  };
}

function nimSum(piles) {
  return piles.reduce((a, b) => a ^ b, 0);
}

function anaPlay(game) {
  const xor = nimSum(game.piles);

  if (xor === 0) {
    // Position perdante pour Ana, jouer aléatoirement
    const nonEmpty = game.piles.map((p, i) => ({ pile: i, count: p })).filter(x => x.count > 0);
    if (nonEmpty.length === 0) return null;
    const choice = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
    const take = Math.floor(Math.random() * choice.count) + 1;
    return { pile: choice.pile, take };
  }

  // Position gagnante - trouver le coup optimal
  for (let i = 0; i < game.piles.length; i++) {
    const target = game.piles[i] ^ xor;
    if (target < game.piles[i]) {
      return { pile: i, take: game.piles[i] - target };
    }
  }

  // Fallback
  const nonEmpty = game.piles.map((p, i) => ({ pile: i, count: p })).filter(x => x.count > 0);
  const choice = nonEmpty[0];
  return { pile: choice.pile, take: 1 };
}

/**
 * Joue un coup
 * Supporte mode vsAna et vsHuman (2 joueurs)
 */
function play(sessionId, pile, take) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };

  // Vérifier que c'est bien le tour du joueur en mode vsAna
  if (game.mode === 'vsAna' && game.currentPlayer !== 'player1') {
    return { success: false, error: "C'est le tour d'Ana!" };
  }

  if (pile < 0 || pile >= game.piles.length) return { success: false, error: "Pile invalide" };
  if (take < 1 || take > game.piles[pile]) return { success: false, error: `Tu peux prendre entre 1 et ${game.piles[pile]} bâtonnets de cette pile` };

  const isPlayer1Turn = game.currentPlayer === 'player1';

  // Coup du joueur courant
  game.piles[pile] -= take;
  game.moves.push({ player: game.currentPlayer, pile, take });

  // Vérifier si le joueur courant a pris le dernier (= il perd)
  const total = game.piles.reduce((a, b) => a + b, 0);
  if (total === 0) {
    // Celui qui prend le dernier PERD
    if (game.mode === 'vsHuman') {
      const loser = isPlayer1Turn ? 'player1' : 'player2';
      const winner = isPlayer1Turn ? 'player2' : 'player1';
      game.status = winner + '_wins';
      game.winner = winner;
      return {
        success: true,
        piles: game.piles,
        playerMove: { pile, take },
        gameOver: true,
        winner,
        status: game.status,
        mode: 'vsHuman',
        message: `${winner === 'player1' ? 'Joueur 1' : 'Joueur 2'} gagne! (${loser === 'player1' ? 'Joueur 1' : 'Joueur 2'} a pris le dernier)`
      };
    } else {
      // Mode vsAna - player1 a pris le dernier = Ana gagne
      game.status = 'ana_wins';
      game.winner = 'ana';
      return {
        success: true,
        piles: game.piles,
        playerMove: { pile, take },
        gameOver: true,
        winner: 'ana',
        status: 'ana_wins',
        mode: 'vsAna'
      };
    }
  }

  // MODE 2 JOUEURS : alterner les tours
  if (game.mode === 'vsHuman') {
    game.currentPlayer = isPlayer1Turn ? 'player2' : 'player1';
    return {
      success: true,
      piles: game.piles,
      playerMove: { pile, take },
      status: 'playing',
      gameOver: false,
      mode: 'vsHuman',
      currentPlayer: game.currentPlayer,
      message: `Au tour de ${game.currentPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'}`
    };
  }

  // MODE VS ANA : Ana joue automatiquement
  game.currentPlayer = 'ana';
  const anaMove = anaPlay(game);

  if (anaMove) {
    game.piles[anaMove.pile] -= anaMove.take;
    game.moves.push({ player: 'ana', ...anaMove });

    const newTotal = game.piles.reduce((a, b) => a + b, 0);
    if (newTotal === 0) {
      // Ana a pris le dernier = joueur gagne
      game.status = 'player_wins';
      game.winner = 'player';
      return {
        success: true,
        piles: game.piles,
        playerMove: { pile, take },
        anaMove,
        gameOver: true,
        winner: 'player',
        status: 'player_wins',
        mode: 'vsAna'
      };
    }
  }

  game.currentPlayer = 'player1';

  return {
    success: true,
    piles: game.piles,
    playerMove: { pile, take },
    anaMove,
    status: 'playing',
    currentPlayer: 'player1',
    mode: 'vsAna'
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };
  return {
    exists: true,
    mode: game.mode,
    piles: game.piles,
    currentPlayer: game.currentPlayer,
    status: game.status,
    gameOver: game.status !== 'playing',
    winner: game.winner
  };
}

module.exports = { newGame, play, getState };
