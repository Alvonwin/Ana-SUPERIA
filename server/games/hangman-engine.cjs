/**
 * Hangman (Pendu) Engine for Ana
 * Supporte mode vsAna et vsHuman (J1 choisit le mot, J2 devine)
 */

const games = new Map();

// Mots français par catégorie
const WORDS = {
  animaux: ['elephant', 'girafe', 'hippopotame', 'crocodile', 'papillon', 'dauphin', 'kangourou', 'pingouin'],
  fruits: ['framboise', 'ananas', 'mangue', 'pasteque', 'fraise', 'cerise', 'abricot', 'orange'],
  pays: ['france', 'espagne', 'allemagne', 'italie', 'portugal', 'belgique', 'suisse', 'canada'],
  metiers: ['architecte', 'boulanger', 'musicien', 'professeur', 'informaticien', 'medecin', 'avocat'],
  objets: ['ordinateur', 'telephone', 'television', 'refrigerateur', 'aspirateur', 'machine']
};

const MAX_ERRORS = 6;

const HANGMAN_STAGES = [
  `
  +---+
  |   |
      |
      |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
      |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`
];

/**
 * Nouvelle partie
 * @param {string} sessionId - ID de session
 * @param {string} category - Catégorie pour mode vsAna
 * @param {string} mode - 'vsAna' (défaut) ou 'vsHuman'
 * @param {string} customWord - Mot personnalisé pour mode vsHuman
 */
function newGame(sessionId, category = null, mode = 'vsAna', customWord = null) {
  // Mode vsHuman: attente du mot de J1
  if (mode === 'vsHuman' && !customWord) {
    const game = {
      mode: 'vsHuman',
      phase: 'setup', // setup = J1 entre le mot
      word: null,
      guessed: [],
      errors: 0,
      status: 'setup'
    };
    games.set(sessionId, game);

    return {
      success: true,
      mode: 'vsHuman',
      phase: 'setup',
      status: 'setup',
      message: "Joueur 1: Entre un mot secret pour Joueur 2!"
    };
  }

  // Mode vsHuman avec mot fourni
  if (mode === 'vsHuman' && customWord) {
    const word = customWord.toUpperCase().replace(/[^A-Z]/g, '');
    if (word.length < 2) {
      return { success: false, error: "Le mot doit avoir au moins 2 lettres!" };
    }

    const game = {
      mode: 'vsHuman',
      phase: 'playing',
      word,
      category: 'custom',
      guessed: [],
      errors: 0,
      status: 'playing'
    };
    games.set(sessionId, game);

    return {
      success: true,
      mode: 'vsHuman',
      phase: 'playing',
      wordLength: word.length,
      display: word.split('').map(() => '_').join(' '),
      hangman: HANGMAN_STAGES[0],
      errorsLeft: MAX_ERRORS,
      status: 'playing',
      guessed: [],
      message: "Mot enregistré! Passe l'écran à Joueur 2."
    };
  }

  // Mode vsAna (original)
  const cat = category && WORDS[category] ? category : Object.keys(WORDS)[Math.floor(Math.random() * Object.keys(WORDS).length)];
  const wordList = WORDS[cat];
  const word = wordList[Math.floor(Math.random() * wordList.length)].toUpperCase();

  const game = {
    mode: 'vsAna',
    word,
    category: cat,
    guessed: [],
    errors: 0,
    status: 'playing'
  };
  games.set(sessionId, game);

  return {
    success: true,
    mode: 'vsAna',
    category: cat,
    wordLength: word.length,
    display: word.split('').map(() => '_').join(' '),
    hangman: HANGMAN_STAGES[0],
    errorsLeft: MAX_ERRORS,
    status: 'playing',
    guessed: []
  };
}

function getMaskedWord(word, guessed) {
  return word.split('').map(c => guessed.includes(c) ? c : '_').join(' ');
}

/**
 * Définit le mot secret en mode vsHuman (appelé par J1)
 */
function setWord(sessionId, customWord) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.mode !== 'vsHuman') return { success: false, error: "Cette fonction est pour le mode 2 joueurs" };
  if (game.phase !== 'setup') return { success: false, error: "Le mot a déjà été défini" };

  const word = customWord.toUpperCase().replace(/[^A-Z]/g, '');
  if (word.length < 2) {
    return { success: false, error: "Le mot doit avoir au moins 2 lettres!" };
  }

  game.word = word;
  game.phase = 'playing';
  game.status = 'playing';

  return {
    success: true,
    mode: 'vsHuman',
    phase: 'playing',
    wordLength: word.length,
    display: word.split('').map(() => '_').join(' '),
    hangman: HANGMAN_STAGES[0],
    errorsLeft: MAX_ERRORS,
    status: 'playing',
    guessed: [],
    message: "Mot enregistré! Passe l'écran à Joueur 2."
  };
}

function guess(sessionId, letter) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };
  if (game.mode === 'vsHuman' && game.phase === 'setup') {
    return { success: false, error: "En attente du mot de Joueur 1" };
  }

  const l = letter.toUpperCase().charAt(0);
  if (!/[A-Z]/.test(l)) return { success: false, error: "Entre une lettre valide (A-Z)" };
  if (game.guessed.includes(l)) return { success: false, error: `Tu as déjà essayé '${l}'!`, guessed: game.guessed };

  game.guessed.push(l);

  const isCorrect = game.word.includes(l);
  if (!isCorrect) {
    game.errors++;
  }

  const display = getMaskedWord(game.word, game.guessed);
  const isWon = !display.includes('_');
  const isLost = game.errors >= MAX_ERRORS;

  if (isWon) game.status = 'won';
  if (isLost) game.status = 'lost';

  // En mode vsHuman, le gagnant est player2 (celui qui devine) ou player1 (celui qui a choisi le mot)
  const winner = game.mode === 'vsHuman'
    ? (isWon ? 'player2' : (isLost ? 'player1' : null))
    : (isWon ? 'player' : (isLost ? 'ana' : null));

  return {
    success: true,
    mode: game.mode,
    letter: l,
    correct: isCorrect,
    display,
    hangman: HANGMAN_STAGES[Math.min(game.errors, MAX_ERRORS)],
    errors: game.errors,
    errorsLeft: MAX_ERRORS - game.errors,
    guessed: game.guessed,
    status: game.status,
    gameOver: isWon || isLost,
    word: (isWon || isLost) ? game.word : null,
    winner
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };
  return {
    exists: true,
    category: game.category,
    display: getMaskedWord(game.word, game.guessed),
    hangman: HANGMAN_STAGES[game.errors],
    guessed: game.guessed,
    errors: game.errors,
    errorsLeft: MAX_ERRORS - game.errors,
    status: game.status
  };
}

function getCategories() {
  return Object.keys(WORDS);
}

module.exports = { newGame, setWord, guess, getState, getCategories, MAX_ERRORS };
