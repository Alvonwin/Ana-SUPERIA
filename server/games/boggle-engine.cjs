
const games = new Map();
const dictionaryService = require('../services/dictionary-service.cjs');

dictionaryService.load();

function newGame(sessionId) {
  const grid = generateGrid();
  games.set(sessionId, { grid, score: 0, words: [] });
  return { grid, sessionId };
}

function guess(sessionId, word) {
  const game = games.get(sessionId);
  if (!game) return { error: 'Session non trouvée' };
  const isValid = dictionaryService.isValidWord(word);
  if (isValid) {
    game.score += getScore(word.length);
    game.words.push(word);
  }
  return { isValid, score: game.score };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { error: 'Session non trouvée' };
  return { grid: game.grid, score: game.score, words: game.words };
}

function generateGrid() {
  const grid = [];
  for (let i = 0; i < 4; i++) {
    grid[i] = [];
    for (let j = 0; j < 4; j++) {
      grid[i][j] = getRandomLetter();
    }
  }
  return grid;
}

function getScore(length) {
  if (length >= 7) return 5;
  if (length === 6) return 3;
  if (length === 5) return 2;
  if (length >= 3) return 1;
  return 0;
}

function getRandomLetter() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[Math.floor(Math.random() * letters.length)];
}

module.exports = { newGame, guess, getState };
