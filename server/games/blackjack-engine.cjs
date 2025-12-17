/**
 * Blackjack (21) Engine for Ana
 */

const games = new Map();

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value, display: `${value}${suit}` });
    }
  }
  // Mélanger
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getCardValue(card) {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11; // Géré séparément
  return parseInt(card.value);
}

function calculateHand(cards) {
  let sum = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.value === 'A') {
      aces++;
      sum += 11;
    } else {
      sum += getCardValue(card);
    }
  }

  // Ajuster les As si nécessaire
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }

  return sum;
}

function newGame(sessionId) {
  const deck = createDeck();
  const playerHand = [deck.pop(), deck.pop()];
  const anaHand = [deck.pop(), deck.pop()];

  const game = {
    deck,
    playerHand,
    anaHand,
    status: 'playing',
    playerStand: false
  };

  games.set(sessionId, game);

  const playerScore = calculateHand(playerHand);
  const isBlackjack = playerScore === 21;

  if (isBlackjack) {
    game.status = 'player_blackjack';
  }

  return {
    success: true,
    playerHand: playerHand.map(c => c.display),
    anaHand: [anaHand[0].display, '🂠'], // Cacher la 2ème carte
    playerScore,
    status: game.status,
    isBlackjack
  };
}

function hit(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };
  if (game.playerStand) return { success: false, error: "Tu as déjà passé!" };

  const card = game.deck.pop();
  game.playerHand.push(card);
  const playerScore = calculateHand(game.playerHand);

  if (playerScore > 21) {
    game.status = 'player_bust';
    return {
      success: true,
      card: card.display,
      playerHand: game.playerHand.map(c => c.display),
      playerScore,
      status: 'player_bust',
      gameOver: true,
      winner: 'ana',
      anaHand: game.anaHand.map(c => c.display),
      anaScore: calculateHand(game.anaHand)
    };
  }

  return {
    success: true,
    card: card.display,
    playerHand: game.playerHand.map(c => c.display),
    playerScore,
    status: 'playing'
  };
}

function stand(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { success: false, error: "Pas de partie en cours" };
  if (game.status !== 'playing') return { success: false, error: "Partie terminée" };

  game.playerStand = true;

  // Ana joue (tire jusqu'à 17 minimum)
  while (calculateHand(game.anaHand) < 17) {
    game.anaHand.push(game.deck.pop());
  }

  const playerScore = calculateHand(game.playerHand);
  const anaScore = calculateHand(game.anaHand);

  let winner;
  if (anaScore > 21) {
    game.status = 'ana_bust';
    winner = 'player';
  } else if (playerScore > anaScore) {
    game.status = 'player_wins';
    winner = 'player';
  } else if (anaScore > playerScore) {
    game.status = 'ana_wins';
    winner = 'ana';
  } else {
    game.status = 'push';
    winner = 'tie';
  }

  return {
    success: true,
    playerHand: game.playerHand.map(c => c.display),
    anaHand: game.anaHand.map(c => c.display),
    playerScore,
    anaScore,
    status: game.status,
    gameOver: true,
    winner
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };
  return {
    exists: true,
    playerHand: game.playerHand.map(c => c.display),
    anaHand: game.status === 'playing' ? [game.anaHand[0].display, '🂠'] : game.anaHand.map(c => c.display),
    playerScore: calculateHand(game.playerHand),
    anaScore: game.status === 'playing' ? '?' : calculateHand(game.anaHand),
    status: game.status
  };
}

module.exports = { newGame, hit, stand, getState };
