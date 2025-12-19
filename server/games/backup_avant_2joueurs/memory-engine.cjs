/**
 * Memory/Concentration Game Engine for Ana
 * Version simplifiée - synchrone, pas de setTimeout
 */

const games = new Map();

const CARD_SETS = {
  emojis: ['🎮', '🎲', '🎯', '🎪', '🎨', '🎭', '🎬', '🎤'],
  animaux: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'],
  fruits: ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🍑', '🥝'],
  nature: ['🌸', '🌺', '🌻', '🌹', '🌷', '💐', '🌿', '🍀']
};

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function newGame(sessionId, theme = 'emojis', size = 4) {
  const totalCards = size * size;
  const pairsNeeded = totalCards / 2;

  const cardSet = CARD_SETS[theme] || CARD_SETS.emojis;
  const selectedCards = cardSet.slice(0, pairsNeeded);
  const allCards = shuffle([...selectedCards, ...selectedCards]);

  const game = {
    cards: allCards.map((symbol, idx) => ({
      id: idx,
      symbol,
      matched: false
    })),
    size,
    theme,
    totalPairs: pairsNeeded,
    playerMatches: 0,
    anaMatches: 0,
    status: 'playing',
    firstCard: null // Pour tracking de la première carte retournée
  };

  games.set(sessionId, game);

  return {
    success: true,
    size,
    theme,
    totalPairs: pairsNeeded,
    board: game.cards.map(c => ({ id: c.id, matched: false, symbol: null })),
    status: 'playing',
    playerMatches: 0,
    anaMatches: 0
  };
}

function flip(sessionId, cardId) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };

  const card = game.cards[cardId];
  if (!card) return { success: false, error: "Carte invalide" };
  if (card.matched) return { success: false, error: "Carte déjà trouvée!" };

  // Première carte
  if (game.firstCard === null) {
    game.firstCard = cardId;
    return {
      success: true,
      action: 'first_flip',
      card: { id: cardId, symbol: card.symbol },
      board: game.cards.map(c => ({
        id: c.id,
        matched: c.matched,
        symbol: c.matched ? c.symbol : (c.id === cardId ? c.symbol : null),
        revealed: c.id === cardId
      })),
      status: 'playing',
      playerMatches: game.playerMatches,
      anaMatches: game.anaMatches
    };
  }

  // Deuxième carte
  if (game.firstCard === cardId) {
    return { success: false, error: "Choisis une autre carte!" };
  }

  const firstCard = game.cards[game.firstCard];
  const secondCard = card;
  const firstCardId = game.firstCard;
  game.firstCard = null; // Reset

  // Vérifier match
  if (firstCard.symbol === secondCard.symbol) {
    firstCard.matched = true;
    secondCard.matched = true;
    game.playerMatches++;

    // Vérifier fin de partie
    if (game.playerMatches + game.anaMatches === game.totalPairs) {
      game.status = game.playerMatches > game.anaMatches ? 'player_wins' :
                    game.anaMatches > game.playerMatches ? 'ana_wins' : 'draw';
    }

    return {
      success: true,
      action: 'match',
      card1: { id: firstCardId, symbol: firstCard.symbol },
      card2: { id: cardId, symbol: secondCard.symbol },
      board: game.cards.map(c => ({
        id: c.id,
        matched: c.matched,
        symbol: c.matched ? c.symbol : null,
        revealed: false
      })),
      status: game.status,
      playerMatches: game.playerMatches,
      anaMatches: game.anaMatches,
      gameOver: game.status !== 'playing'
    };
  }

  // Pas de match - Ana joue
  const anaResult = anaPlay(game);

  return {
    success: true,
    action: 'no_match',
    card1: { id: firstCardId, symbol: firstCard.symbol },
    card2: { id: cardId, symbol: secondCard.symbol },
    anaPlayed: anaResult,
    board: game.cards.map(c => ({
      id: c.id,
      matched: c.matched,
      symbol: c.matched ? c.symbol : null,
      revealed: false
    })),
    status: game.status,
    playerMatches: game.playerMatches,
    anaMatches: game.anaMatches,
    gameOver: game.status !== 'playing'
  };
}

function anaPlay(game) {
  const unmatched = game.cards.filter(c => !c.matched);
  if (unmatched.length < 2) return null;

  let card1, card2;

  // Ana a 60% de chance de trouver une paire si elle en connaît une
  if (Math.random() < 0.6) {
    const symbols = {};
    for (const c of unmatched) {
      if (!symbols[c.symbol]) symbols[c.symbol] = [];
      symbols[c.symbol].push(c);
    }
    for (const sym in symbols) {
      if (symbols[sym].length === 2) {
        [card1, card2] = symbols[sym];
        break;
      }
    }
  }

  if (!card1) {
    const shuffled = shuffle(unmatched);
    card1 = shuffled[0];
    card2 = shuffled[1];
  }

  const isMatch = card1.symbol === card2.symbol;
  if (isMatch) {
    card1.matched = true;
    card2.matched = true;
    game.anaMatches++;

    if (game.playerMatches + game.anaMatches === game.totalPairs) {
      game.status = game.playerMatches > game.anaMatches ? 'player_wins' :
                    game.anaMatches > game.playerMatches ? 'ana_wins' : 'draw';
    }
  }

  return {
    card1: { id: card1.id, symbol: card1.symbol },
    card2: { id: card2.id, symbol: card2.symbol },
    isMatch
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };

  return {
    exists: true,
    size: game.size,
    theme: game.theme,
    totalPairs: game.totalPairs,
    playerMatches: game.playerMatches,
    anaMatches: game.anaMatches,
    status: game.status,
    board: game.cards.map(c => ({
      id: c.id,
      matched: c.matched,
      symbol: c.matched ? c.symbol : null
    }))
  };
}

module.exports = { newGame, flip, getState, CARD_SETS };
