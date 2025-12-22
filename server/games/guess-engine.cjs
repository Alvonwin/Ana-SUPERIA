/**
 * Guess the Number Engine for Ana
 * Ana choisit un nombre, le joueur devine avec des indices chaud/froid
 * Supporte mode vsAna et vsHuman (J1 choisit le nombre, J2 devine)
 */

const games = new Map();

/**
 * Nouvelle partie
 * @param {string} sessionId - ID de session
 * @param {number} max - Maximum du nombre à deviner (défaut 100)
 * @param {string} mode - 'vsAna' (défaut) ou 'vsHuman'
 * @param {number} customSecret - Nombre personnalisé pour mode vsHuman
 */
function newGame(sessionId, max = 100, mode = 'vsAna', customSecret = null) {
  // Mode vsHuman: attente du nombre de J1
  if (mode === 'vsHuman' && !customSecret) {
    const game = {
      mode: 'vsHuman',
      phase: 'setup', // setup = J1 entre le nombre
      secret: null,
      max,
      guesses: [],
      status: 'setup'
    };
    games.set(sessionId, game);

    return {
      success: true,
      mode: 'vsHuman',
      phase: 'setup',
      max,
      status: 'setup',
      message: `Joueur 1: Choisis un nombre secret entre 1 et ${max}!`
    };
  }

  // Mode vsHuman avec nombre fourni
  if (mode === 'vsHuman' && customSecret) {
    const n = parseInt(customSecret);
    if (isNaN(n) || n < 1 || n > max) {
      return { success: false, error: `Le nombre doit être entre 1 et ${max}!` };
    }

    const game = {
      mode: 'vsHuman',
      phase: 'playing',
      secret: n,
      max,
      guesses: [],
      status: 'playing'
    };
    games.set(sessionId, game);

    return {
      success: true,
      mode: 'vsHuman',
      phase: 'playing',
      max,
      status: 'playing',
      message: "Nombre enregistré! Passe l'écran à Joueur 2."
    };
  }

  // Mode vsAna (original)
  const secret = Math.floor(Math.random() * max) + 1;
  const game = {
    mode: 'vsAna',
    secret,
    max,
    guesses: [],
    status: 'playing'
  };
  games.set(sessionId, game);

  return {
    success: true,
    mode: 'vsAna',
    max,
    status: 'playing',
    message: `J'ai choisi un nombre entre 1 et ${max}. À toi de deviner!`
  };
}

/**
 * Définit le nombre secret en mode vsHuman (appelé par J1)
 */
function setNumber(sessionId, number) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.mode !== 'vsHuman') return { success: false, error: "Cette fonction est pour le mode 2 joueurs" };
  if (game.phase !== 'setup') return { success: false, error: "Le nombre a déjà été défini" };

  const n = parseInt(number);
  if (isNaN(n) || n < 1 || n > game.max) {
    return { success: false, error: `Le nombre doit être entre 1 et ${game.max}!` };
  }

  game.secret = n;
  game.phase = 'playing';
  game.status = 'playing';

  return {
    success: true,
    mode: 'vsHuman',
    phase: 'playing',
    max: game.max,
    status: 'playing',
    message: "Nombre enregistré! Passe l'écran à Joueur 2."
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
  if (game.mode === 'vsHuman' && game.phase === 'setup') {
    return { success: false, error: "En attente du nombre de Joueur 1" };
  }

  const n = parseInt(number);
  if (isNaN(n) || n < 1 || n > game.max) {
    return { success: false, error: `Entre un nombre entre 1 et ${game.max}` };
  }

  const previousGuess = game.guesses.length > 0 ? game.guesses[game.guesses.length - 1] : null;
  const hint = getHint(game.secret, n, previousGuess);

  game.guesses.push(n);

  if (n === game.secret) {
    game.status = 'won';
    // En mode vsHuman, le gagnant est player2 (celui qui devine)
    const winner = game.mode === 'vsHuman' ? 'player2' : 'player';
    return {
      success: true,
      mode: game.mode,
      guess: n,
      correct: true,
      attempts: game.guesses.length,
      status: 'won',
      gameOver: true,
      secret: game.secret,
      winner
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
    mode: game.mode,
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
  // En mode vsHuman, si J2 abandonne, J1 gagne
  const winner = game.mode === 'vsHuman' ? 'player1' : 'ana';
  return {
    success: true,
    mode: game.mode,
    secret: game.secret,
    attempts: game.guesses.length,
    status: 'gave_up',
    gameOver: true,
    winner
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };
  return {
    exists: true,
    mode: game.mode,
    phase: game.phase,
    max: game.max,
    guesses: game.guesses,
    attempts: game.guesses.length,
    status: game.status,
    gameOver: game.status !== 'playing' && game.status !== 'setup',
    secret: game.status !== 'playing' && game.status !== 'setup' ? game.secret : null
  };
}

module.exports = { newGame, setNumber, guess, giveUp, getState };
