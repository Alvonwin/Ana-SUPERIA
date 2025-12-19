/**
 * Rock-Paper-Scissors (Pierre-Feuille-Ciseaux) Engine for Ana
 * Supporte mode vsAna et vsHuman (2 joueurs avec choix caché)
 */

const games = new Map();

const CHOICES = ['rock', 'paper', 'scissors'];
const NAMES = { rock: 'Pierre', paper: 'Feuille', scissors: 'Ciseaux' };
const EMOJIS = { rock: '🪨', paper: '📄', scissors: '✂️' };

/**
 * Nouvelle partie
 * @param {string} sessionId - ID de session
 * @param {string} mode - 'vsAna' (défaut) ou 'vsHuman' (2 joueurs)
 */
function newGame(sessionId, mode = 'vsAna') {
  if (mode === 'vsHuman') {
    const game = {
      mode: 'vsHuman',
      rounds: [],
      player1Score: 0,
      player2Score: 0,
      ties: 0,
      phase: 'player1', // player1, player2, reveal
      player1Choice: null
    };
    games.set(sessionId, game);
    return {
      success: true,
      mode: 'vsHuman',
      phase: 'player1',
      message: "Shifumi 2 joueurs! Joueur 1: fais ton choix (il sera caché)"
    };
  }

  const game = {
    mode: 'vsAna',
    rounds: [],
    playerScore: 0,
    anaScore: 0,
    ties: 0
  };
  games.set(sessionId, game);
  return { success: true, mode: 'vsAna', message: "Nouvelle partie! Pierre, Feuille ou Ciseaux?" };
}

function getWinner(player, ana) {
  if (player === ana) return 'tie';
  if (
    (player === 'rock' && ana === 'scissors') ||
    (player === 'paper' && ana === 'rock') ||
    (player === 'scissors' && ana === 'paper')
  ) {
    return 'player';
  }
  return 'ana';
}

function play(sessionId, choice) {
  let game = games.get(sessionId);
  if (!game) {
    newGame(sessionId);
    game = games.get(sessionId);
  }

  const playerChoice = choice.toLowerCase();
  if (!CHOICES.includes(playerChoice)) {
    return { success: false, error: "Choix invalide! Dis: rock/pierre, paper/feuille, ou scissors/ciseaux" };
  }

  // Mode vsHuman
  if (game.mode === 'vsHuman') {
    if (game.phase === 'player1') {
      // J1 fait son choix (caché)
      game.player1Choice = playerChoice;
      game.phase = 'player2';
      return {
        success: true,
        mode: 'vsHuman',
        phase: 'player2',
        message: "Joueur 1 a choisi! Passe l'écran à Joueur 2.",
        score: { player1: game.player1Score, player2: game.player2Score, ties: game.ties }
      };
    } else if (game.phase === 'player2') {
      // J2 fait son choix, on révèle
      const player2Choice = playerChoice;
      const winner = getWinner(game.player1Choice, player2Choice);

      if (winner === 'player') game.player1Score++;
      else if (winner === 'ana') game.player2Score++; // 'ana' représente le 2ème joueur
      else game.ties++;

      game.rounds.push({ player1: game.player1Choice, player2: player2Choice, winner });

      // Préparer pour le prochain round
      game.phase = 'player1';
      game.player1Choice = null;

      return {
        success: true,
        mode: 'vsHuman',
        phase: 'reveal',
        player1Choice: game.rounds[game.rounds.length - 1].player1,
        player2Choice: player2Choice,
        player1Emoji: EMOJIS[game.rounds[game.rounds.length - 1].player1],
        player2Emoji: EMOJIS[player2Choice],
        player1Name: NAMES[game.rounds[game.rounds.length - 1].player1],
        player2Name: NAMES[player2Choice],
        winner: winner === 'player' ? 'player1' : winner === 'ana' ? 'player2' : 'tie',
        score: { player1: game.player1Score, player2: game.player2Score, ties: game.ties },
        roundNumber: game.rounds.length
      };
    }
  }

  // Mode vsAna (original)
  // Ana choisit (légèrement stratégique basé sur historique)
  let anaChoice;
  if (game.rounds.length > 2 && Math.random() > 0.3) {
    // Analyser les derniers coups du joueur
    const lastMoves = game.rounds.slice(-3).map(r => r.player);
    const counts = { rock: 0, paper: 0, scissors: 0 };
    lastMoves.forEach(m => counts[m]++);
    const mostUsed = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    // Contrer le coup le plus utilisé
    if (mostUsed === 'rock') anaChoice = 'paper';
    else if (mostUsed === 'paper') anaChoice = 'scissors';
    else anaChoice = 'rock';
  } else {
    anaChoice = CHOICES[Math.floor(Math.random() * 3)];
  }

  const winner = getWinner(playerChoice, anaChoice);

  if (winner === 'player') game.playerScore++;
  else if (winner === 'ana') game.anaScore++;
  else game.ties++;

  game.rounds.push({ player: playerChoice, ana: anaChoice, winner });

  return {
    success: true,
    mode: 'vsAna',
    playerChoice,
    anaChoice,
    playerEmoji: EMOJIS[playerChoice],
    anaEmoji: EMOJIS[anaChoice],
    playerName: NAMES[playerChoice],
    anaName: NAMES[anaChoice],
    winner,
    score: { player: game.playerScore, ana: game.anaScore, ties: game.ties },
    roundNumber: game.rounds.length
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };
  return {
    exists: true,
    score: { player: game.playerScore, ana: game.anaScore, ties: game.ties },
    rounds: game.rounds.length,
    lastRound: game.rounds[game.rounds.length - 1] || null
  };
}

module.exports = { newGame, play, getState, CHOICES, NAMES, EMOJIS };
