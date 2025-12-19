/**
 * Blackjack (21) Engine for Ana
 * Supporte mode vsAna (1 joueur) et vsHuman (2 joueurs contre Ana croupier)
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

/**
 * Démarre une nouvelle partie
 * @param {string} sessionId - ID de session
 * @param {string} mode - 'vsAna' (défaut) ou 'vsHuman' (2 joueurs contre Ana)
 */
function newGame(sessionId, mode = 'vsAna') {
  const deck = createDeck();

  if (mode === 'vsHuman') {
    // Mode 2 joueurs: 2 mains contre Ana
    const player1Hand = [deck.pop(), deck.pop()];
    const player2Hand = [deck.pop(), deck.pop()];
    const anaHand = [deck.pop(), deck.pop()];

    const game = {
      deck,
      mode: 'vsHuman',
      player1Hand,
      player2Hand,
      anaHand,
      currentPlayer: 'player1', // player1 joue d'abord
      player1Stand: false,
      player2Stand: false,
      player1Bust: false,
      player2Bust: false,
      status: 'playing'
    };

    games.set(sessionId, game);

    const player1Score = calculateHand(player1Hand);
    const player2Score = calculateHand(player2Hand);

    return {
      success: true,
      mode: 'vsHuman',
      player1Hand: player1Hand.map(c => c.display),
      player2Hand: player2Hand.map(c => c.display),
      anaHand: [anaHand[0].display, '🂠'],
      player1Score,
      player2Score,
      currentPlayer: 'player1',
      status: 'playing',
      message: "Joueur 1 joue d'abord! Hit ou Stand?"
    };
  }

  // Mode vsAna (original)
  const playerHand = [deck.pop(), deck.pop()];
  const anaHand = [deck.pop(), deck.pop()];

  const game = {
    deck,
    mode: 'vsAna',
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
    mode: 'vsAna',
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

  // Mode vsHuman
  if (game.mode === 'vsHuman') {
    const isPlayer1 = game.currentPlayer === 'player1';

    if (isPlayer1 && game.player1Stand) {
      return { success: false, error: "Joueur 1 a déjà passé!" };
    }
    if (!isPlayer1 && game.player2Stand) {
      return { success: false, error: "Joueur 2 a déjà passé!" };
    }

    const card = game.deck.pop();
    const hand = isPlayer1 ? game.player1Hand : game.player2Hand;
    hand.push(card);
    const score = calculateHand(hand);

    if (score > 21) {
      if (isPlayer1) {
        game.player1Bust = true;
        // Passer à joueur 2
        game.currentPlayer = 'player2';
        return {
          success: true,
          mode: 'vsHuman',
          card: card.display,
          player1Hand: game.player1Hand.map(c => c.display),
          player2Hand: game.player2Hand.map(c => c.display),
          anaHand: [game.anaHand[0].display, '🂠'],
          player1Score: calculateHand(game.player1Hand),
          player2Score: calculateHand(game.player2Hand),
          currentPlayer: 'player2',
          player1Bust: true,
          status: 'playing',
          message: "Joueur 1 a sauté! Au tour de Joueur 2."
        };
      } else {
        game.player2Bust = true;
        // Les deux joueurs ont terminé, Ana joue
        return finishVsHumanGame(game);
      }
    }

    return {
      success: true,
      mode: 'vsHuman',
      card: card.display,
      player1Hand: game.player1Hand.map(c => c.display),
      player2Hand: game.player2Hand.map(c => c.display),
      anaHand: [game.anaHand[0].display, '🂠'],
      player1Score: calculateHand(game.player1Hand),
      player2Score: calculateHand(game.player2Hand),
      currentPlayer: game.currentPlayer,
      status: 'playing'
    };
  }

  // Mode vsAna (original)
  if (game.playerStand) return { success: false, error: "Tu as déjà passé!" };

  const card = game.deck.pop();
  game.playerHand.push(card);
  const playerScore = calculateHand(game.playerHand);

  if (playerScore > 21) {
    game.status = 'player_bust';
    return {
      success: true,
      mode: 'vsAna',
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
    mode: 'vsAna',
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

  // Mode vsHuman
  if (game.mode === 'vsHuman') {
    const isPlayer1 = game.currentPlayer === 'player1';

    if (isPlayer1) {
      game.player1Stand = true;
      game.currentPlayer = 'player2';
      return {
        success: true,
        mode: 'vsHuman',
        player1Hand: game.player1Hand.map(c => c.display),
        player2Hand: game.player2Hand.map(c => c.display),
        anaHand: [game.anaHand[0].display, '🂠'],
        player1Score: calculateHand(game.player1Hand),
        player2Score: calculateHand(game.player2Hand),
        currentPlayer: 'player2',
        player1Stand: true,
        status: 'playing',
        message: "Joueur 1 reste. Au tour de Joueur 2!"
      };
    } else {
      game.player2Stand = true;
      // Les deux joueurs ont terminé, Ana joue
      return finishVsHumanGame(game);
    }
  }

  // Mode vsAna (original)
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
    mode: 'vsAna',
    playerHand: game.playerHand.map(c => c.display),
    anaHand: game.anaHand.map(c => c.display),
    playerScore,
    anaScore,
    status: game.status,
    gameOver: true,
    winner
  };
}

/**
 * Termine la partie en mode vsHuman (Ana joue, puis résultats)
 */
function finishVsHumanGame(game) {
  // Ana joue (tire jusqu'à 17 minimum)
  while (calculateHand(game.anaHand) < 17) {
    game.anaHand.push(game.deck.pop());
  }

  const player1Score = calculateHand(game.player1Hand);
  const player2Score = calculateHand(game.player2Hand);
  const anaScore = calculateHand(game.anaHand);
  const anaBust = anaScore > 21;

  // Déterminer le résultat pour chaque joueur
  let player1Result, player2Result;

  if (game.player1Bust) {
    player1Result = 'lose';
  } else if (anaBust) {
    player1Result = 'win';
  } else if (player1Score > anaScore) {
    player1Result = 'win';
  } else if (player1Score < anaScore) {
    player1Result = 'lose';
  } else {
    player1Result = 'push';
  }

  if (game.player2Bust) {
    player2Result = 'lose';
  } else if (anaBust) {
    player2Result = 'win';
  } else if (player2Score > anaScore) {
    player2Result = 'win';
  } else if (player2Score < anaScore) {
    player2Result = 'lose';
  } else {
    player2Result = 'push';
  }

  game.status = 'gameover';

  return {
    success: true,
    mode: 'vsHuman',
    player1Hand: game.player1Hand.map(c => c.display),
    player2Hand: game.player2Hand.map(c => c.display),
    anaHand: game.anaHand.map(c => c.display),
    player1Score,
    player2Score,
    anaScore,
    anaBust,
    player1Bust: game.player1Bust,
    player2Bust: game.player2Bust,
    player1Result,
    player2Result,
    status: 'gameover',
    gameOver: true
  };
}

function getState(sessionId) {
  const game = games.get(sessionId);
  if (!game) return { exists: false };

  if (game.mode === 'vsHuman') {
    return {
      exists: true,
      mode: 'vsHuman',
      player1Hand: game.player1Hand.map(c => c.display),
      player2Hand: game.player2Hand.map(c => c.display),
      anaHand: game.status === 'playing' ? [game.anaHand[0].display, '🂠'] : game.anaHand.map(c => c.display),
      player1Score: calculateHand(game.player1Hand),
      player2Score: calculateHand(game.player2Hand),
      anaScore: game.status === 'playing' ? '?' : calculateHand(game.anaHand),
      currentPlayer: game.currentPlayer,
      status: game.status
    };
  }

  return {
    exists: true,
    mode: 'vsAna',
    playerHand: game.playerHand.map(c => c.display),
    anaHand: game.status === 'playing' ? [game.anaHand[0].display, '🂠'] : game.anaHand.map(c => c.display),
    playerScore: calculateHand(game.playerHand),
    anaScore: game.status === 'playing' ? '?' : calculateHand(game.anaHand),
    status: game.status
  };
}

module.exports = { newGame, hit, stand, getState };
