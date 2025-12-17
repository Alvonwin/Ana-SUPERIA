/**
 * Rock-Paper-Scissors (Pierre-Feuille-Ciseaux) Engine for Ana
 */

const games = new Map();

const CHOICES = ['rock', 'paper', 'scissors'];
const NAMES = { rock: 'Pierre', paper: 'Feuille', scissors: 'Ciseaux' };
const EMOJIS = { rock: '🪨', paper: '📄', scissors: '✂️' };

function newGame(sessionId) {
  const game = {
    rounds: [],
    playerScore: 0,
    anaScore: 0,
    ties: 0
  };
  games.set(sessionId, game);
  return { success: true, message: "Nouvelle partie! Pierre, Feuille ou Ciseaux?" };
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
