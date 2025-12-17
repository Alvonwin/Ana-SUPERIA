/**
 * Hangman (Pendu) Engine for Ana
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

function newGame(sessionId, category = null) {
  const cat = category && WORDS[category] ? category : Object.keys(WORDS)[Math.floor(Math.random() * Object.keys(WORDS).length)];
  const wordList = WORDS[cat];
  const word = wordList[Math.floor(Math.random() * wordList.length)].toUpperCase();

  const game = {
    word,
    category: cat,
    guessed: [],
    errors: 0,
    status: 'playing'
  };
  games.set(sessionId, game);

  return {
    success: true,
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

function guess(sessionId, letter) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };

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

  return {
    success: true,
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
    winner: isWon ? 'player' : (isLost ? 'ana' : null)
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

module.exports = { newGame, guess, getState, getCategories, MAX_ERRORS };
