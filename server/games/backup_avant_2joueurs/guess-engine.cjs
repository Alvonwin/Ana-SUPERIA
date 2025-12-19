/**
 * Guess the Number Engine for Ana
 * Ana choisit un nombre, le joueur devine avec des indices chaud/froid
 */

const games = new Map();

function newGame(sessionId, max = 100) {
  const secret = Math.floor(Math.random() * max) + 1;
  const game = {
    secret,
    max,
    guesses: [],
    status: 'playing'
  };
  games.set(sessionId, game);

  return {
    success: true,
    max,
    status: 'playing',
    message: `J'ai choisi un nombre entre 1 et ${max}. À toi de deviner!`
  };
}

function getHint(secret, guess, previousGuess) {
  const diff = Math.abs(secret - guess);
  const prevDiff = previousGuess ? Math.abs(secret - previousGuess) : null;

  let temperature;
  if (diff === 0) temperature = 'exact';
  else if (diff <= 2) temperature = 'brulant';
  else if (diff <= 5) temperature = 'tres_chaud';
  else if (diff <= 10) temperature = 'chaud';
  else if (diff <= 20) temperature = 'tiede';
  else if (diff <= 35) temperature = 'froid';
  else temperature = 'glace';

  let direction = null;
  if (prevDiff !== null) {
    if (diff < prevDiff) direction = 'warmer';
    else if (diff > prevDiff) direction = 'colder';
    else direction = 'same';
  }

  return { temperature, direction, diff };
}

function guess(sessionId, number) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };

  const n = parseInt(number);
  if (isNaN(n) || n < 1 || n > game.max) {
    return { success: false, error: `Entre un nombre entre 1 et ${game.max}` };
  }

  const previousGuess = game.guesses.length > 0 ? game.guesses[game.guesses.length - 1] : null;
  const hint = getHint(game.secret, n, previousGuess);

  game.guesses.push(n);

  if (n === game.secret) {
    game.status = 'won';
    return {
      success: true,
      guess: n,
      correct: true,
      attempts: game.guesses.length,
      status: 'won',
      gameOver: true,
      secret: game.secret
    };
  }

  const TEMP_MESSAGES = {
    brulant: "🔥 BRÛLANT! Tu y es presque!",
    tres_chaud: "🌡️ Très chaud!",
    chaud: "☀️ Chaud!",
    tiede: "😐 Tiède...",
    froid: "❄️ Froid!",
    glace: "🧊 Glacial! Tu es loin!"
  };

  const DIR_MESSAGES = {
    warmer: "Tu te rapproches!",
    colder: "Tu t'éloignes!",
    same: "Même distance qu'avant."
  };

  let message = TEMP_MESSAGES[hint.temperature];
  if (hint.direction) {
    message += " " + DIR_MESSAGES[hint.direction];
  }

  // Indice supplémentaire
  if (n < game.secret) message += " C'est plus!";
  else message += " C'est moins!";

  return {
    success: true,
    guess: n,
    correct: false,
    hint: hint.temperature,
    direction: hint.direction,
    message,
    attempts: game.guesses.length,
    status: 'playing'
  };
}

function giveUp(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };

  game.status = 'gave_up';
  return {
    success: true,
    secret: game.secret,
    attempts: game.guesses.length,
    status: 'gave_up',
    gameOver: true
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };
  return {
    exists: true,
    max: game.max,
    guesses: game.guesses,
    attempts: game.guesses.length,
    status: game.status,
    secret: game.status !== 'playing' ? game.secret : null
  };
}

module.exports = { newGame, guess, giveUp, getState };
