/**
 * Nim Game Engine for Ana
 * Jeu mathématique: retire des bâtonnets, celui qui prend le dernier perd!
 */

const games = new Map();

function newGame(sessionId, piles = [3, 5, 7]) {
  const game = {
    piles: [...piles],
    currentPlayer: 'player',
    status: 'playing',
    moves: []
  };
  games.set(sessionId, game);

  return {
    success: true,
    piles: game.piles,
    currentPlayer: 'player',
    status: 'playing',
    totalSticks: piles.reduce((a, b) => a + b, 0)
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

function play(sessionId, pile, take) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };
  if (game.currentPlayer !== 'player') return { success: false, error: "C'est le tour d'Ana!" };

  if (pile < 0 || pile >= game.piles.length) return { success: false, error: "Pile invalide" };
  if (take < 1 || take > game.piles[pile]) return { success: false, error: `Tu peux prendre entre 1 et ${game.piles[pile]} bâtonnets de cette pile` };

  // Coup du joueur
  game.piles[pile] -= take;
  game.moves.push({ player: 'player', pile, take });

  // Vérifier si le joueur a pris le dernier
  const total = game.piles.reduce((a, b) => a + b, 0);
  if (total === 0) {
    game.status = 'ana_wins';
    game.winner = 'ana';
    return {
      success: true,
      piles: game.piles,
      playerMove: { pile, take },
      gameOver: true,
      winner: 'ana',
      status: 'ana_wins'
    };
  }

  // Tour d'Ana
  game.currentPlayer = 'ana';
  const anaMove = anaPlay(game);

  if (anaMove) {
    game.piles[anaMove.pile] -= anaMove.take;
    game.moves.push({ player: 'ana', ...anaMove });

    const newTotal = game.piles.reduce((a, b) => a + b, 0);
    if (newTotal === 0) {
      game.status = 'player_wins';
      game.winner = 'player';
      return {
        success: true,
        piles: game.piles,
        playerMove: { pile, take },
        anaMove,
        gameOver: true,
        winner: 'player',
        status: 'player_wins'
      };
    }
  }

  game.currentPlayer = 'player';

  return {
    success: true,
    piles: game.piles,
    playerMove: { pile, take },
    anaMove,
    status: 'playing',
    currentPlayer: 'player'
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };
  return {
    exists: true,
    piles: game.piles,
    currentPlayer: game.currentPlayer,
    status: game.status,
    winner: game.winner
  };
}

module.exports = { newGame, play, getState };
