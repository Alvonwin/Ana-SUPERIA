/**
 * Backgammon Engine pour Ana SUPERIA
 * 16 Dec 2025
 *
 * REGLE CRITIQUE: Toujours retourner phase + board dans chaque reponse!
 */

// Points: 0-23 (0 = home board blanc, 23 = home board noir)
// Bar: pieces capturees
// Off: pieces sorties du jeu

const games = new Map();

function createInitialBoard() {
  // board[i] > 0 = pieces blanches, < 0 = pieces noires
  const board = new Array(24).fill(0);

  // Position initiale standard
  // Blanc (positif)
  board[0] = 2;   // 2 blancs sur point 1
  board[11] = 5;  // 5 blancs sur point 12
  board[16] = 3;  // 3 blancs sur point 17
  board[18] = 5;  // 5 blancs sur point 19

  // Noir (negatif)
  board[23] = -2;  // 2 noirs sur point 24
  board[12] = -5;  // 5 noirs sur point 13
  board[7] = -3;   // 3 noirs sur point 8
  board[5] = -5;   // 5 noirs sur point 6

  return board;
}

function rollDice() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;

  // Doubles = 4 mouvements
  if (d1 === d2) {
    return [d1, d1, d1, d1];
  }
  return [d1, d2];
}

function newGame(sessionId) {
  const game = {
    sessionId,
    board: createInitialBoard(),
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
    currentPlayer: 'white', // white = joueur, black = Ana
    dice: [],
    movesLeft: [],
    phase: 'rolling', // rolling, moving, gameover
    winner: null,
    moveHistory: []
  };

  games.set(sessionId, game);

  return getGameState(game);
}

function getGameState(game) {
  // CRITIQUE: Toujours retourner phase!
  return {
    success: true,
    phase: game.phase,
    board: [...game.board],
    bar: { ...game.bar },
    off: { ...game.off },
    currentPlayer: game.currentPlayer,
    dice: [...game.dice],
    movesLeft: [...game.movesLeft],
    winner: game.winner,
    validMoves: game.phase === 'moving' ? getValidMoves(game) : []
  };
}

function getGame(sessionId) {
  const game = games.get(sessionId);
  if (!game) {
    return { success: false, error: 'Partie non trouvee', phase: 'none' };
  }
  return getGameState(game);
}

function roll(sessionId) {
  const game = games.get(sessionId);
  if (!game) {
    return { success: false, error: 'Partie non trouvee', phase: 'none' };
  }

  if (game.phase !== 'rolling') {
    return {
      success: false,
      error: 'Ce nest pas le moment de lancer les des',
      phase: game.phase,
      board: [...game.board]
    };
  }

  game.dice = rollDice();
  game.movesLeft = [...game.dice];
  game.phase = 'moving';

  // Verifier si des mouvements sont possibles
  const validMoves = getValidMoves(game);
  if (validMoves.length === 0) {
    // Pas de mouvement possible, passer au joueur suivant
    game.movesLeft = [];
    game.dice = [];
    game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
    game.phase = 'rolling';

    // Si c'est au tour de Ana, elle joue automatiquement
    if (game.currentPlayer === 'black') {
      return anaPlay(game);
    }
  }

  return getGameState(game);
}

function getValidMoves(game) {
  const validMoves = [];
  const isWhite = game.currentPlayer === 'white';
  const bar = isWhite ? game.bar.white : game.bar.black;
  const direction = isWhite ? 1 : -1;

  // Si des pieces sont sur la barre, elles doivent entrer en premier
  if (bar > 0) {
    for (const die of [...new Set(game.movesLeft)]) {
      const entryPoint = isWhite ? die - 1 : 24 - die;
      if (canLandOn(game, entryPoint, isWhite)) {
        validMoves.push({ from: 'bar', to: entryPoint, die });
      }
    }
    return validMoves;
  }

  // Verifier si on peut sortir des pieces (bearing off)
  const canBearOff = canBearOffCheck(game, isWhite);

  for (let i = 0; i < 24; i++) {
    const pieces = game.board[i];
    const hasPiece = isWhite ? pieces > 0 : pieces < 0;

    if (hasPiece) {
      for (const die of [...new Set(game.movesLeft)]) {
        const to = i + (die * direction);

        // Mouvement normal sur le plateau
        if (to >= 0 && to < 24 && canLandOn(game, to, isWhite)) {
          validMoves.push({ from: i, to, die });
        }

        // Bearing off
        if (canBearOff) {
          if (isWhite && i >= 18) {
            // Blanc sort par le point 24+
            if (to >= 24) {
              validMoves.push({ from: i, to: 'off', die });
            }
          } else if (!isWhite && i <= 5) {
            // Noir sort par le point -1
            if (to < 0) {
              validMoves.push({ from: i, to: 'off', die });
            }
          }
        }
      }
    }
  }

  return validMoves;
}

function canLandOn(game, point, isWhite) {
  if (point < 0 || point >= 24) return false;

  const pieces = game.board[point];

  // Case vide ou avec nos pieces
  if (isWhite) {
    return pieces >= -1; // Peut atterrir si <= 1 piece noire (blot)
  } else {
    return pieces <= 1; // Peut atterrir si <= 1 piece blanche (blot)
  }
}

function canBearOffCheck(game, isWhite) {
  // Toutes les pieces doivent etre dans le home board
  const bar = isWhite ? game.bar.white : game.bar.black;
  if (bar > 0) return false;

  for (let i = 0; i < 24; i++) {
    const pieces = game.board[i];
    if (isWhite && pieces > 0 && i < 18) return false;
    if (!isWhite && pieces < 0 && i > 5) return false;
  }

  return true;
}

function move(sessionId, from, to, die) {
  const game = games.get(sessionId);
  if (!game) {
    return { success: false, error: 'Partie non trouvee', phase: 'none' };
  }

  if (game.phase !== 'moving') {
    return {
      success: false,
      error: 'Ce nest pas le moment de bouger',
      phase: game.phase,
      board: [...game.board]
    };
  }

  if (game.currentPlayer !== 'white') {
    return {
      success: false,
      error: 'Ce nest pas votre tour',
      phase: game.phase,
      board: [...game.board]
    };
  }

  // Valider le mouvement
  const validMoves = getValidMoves(game);
  const isValid = validMoves.some(m =>
    m.from === from && m.to === to && m.die === die
  );

  if (!isValid) {
    return {
      success: false,
      error: 'Mouvement invalide',
      phase: game.phase,
      board: [...game.board],
      validMoves
    };
  }

  // Executer le mouvement
  executeMove(game, from, to, true);

  // Retirer le de utilise
  const dieIndex = game.movesLeft.indexOf(die);
  if (dieIndex > -1) {
    game.movesLeft.splice(dieIndex, 1);
  }

  // Verifier victoire
  if (game.off.white >= 15) {
    game.phase = 'gameover';
    game.winner = 'white';
    return getGameState(game);
  }

  // Verifier s'il reste des mouvements
  if (game.movesLeft.length === 0 || getValidMoves(game).length === 0) {
    // Tour suivant
    game.movesLeft = [];
    game.dice = [];
    game.currentPlayer = 'black';
    game.phase = 'rolling';

    // Ana joue
    return anaPlay(game);
  }

  return getGameState(game);
}

function executeMove(game, from, to, isWhite) {
  // Deplacer la piece
  if (from === 'bar') {
    if (isWhite) {
      game.bar.white--;
    } else {
      game.bar.black--;
    }
  } else {
    if (isWhite) {
      game.board[from]--;
    } else {
      game.board[from]++;
    }
  }

  if (to === 'off') {
    if (isWhite) {
      game.off.white++;
    } else {
      game.off.black++;
    }
  } else {
    // Verifier capture (blot)
    if (isWhite && game.board[to] === -1) {
      game.board[to] = 0;
      game.bar.black++;
    } else if (!isWhite && game.board[to] === 1) {
      game.board[to] = 0;
      game.bar.white++;
    }

    // Placer la piece
    if (isWhite) {
      game.board[to]++;
    } else {
      game.board[to]--;
    }
  }

  game.moveHistory.push({ from, to, player: isWhite ? 'white' : 'black' });
}

function anaPlay(game) {
  // Ana lance les des
  game.dice = rollDice();
  game.movesLeft = [...game.dice];
  game.phase = 'moving';

  // Ana fait ses mouvements
  let moves = [];
  while (game.movesLeft.length > 0) {
    const validMoves = getValidMoves(game);
    if (validMoves.length === 0) break;

    // Strategie simple: choisir un mouvement aleatoire parmi les valides
    const chosen = validMoves[Math.floor(Math.random() * validMoves.length)];
    executeMove(game, chosen.from, chosen.to, false);

    const dieIndex = game.movesLeft.indexOf(chosen.die);
    if (dieIndex > -1) {
      game.movesLeft.splice(dieIndex, 1);
    }

    moves.push(chosen);

    // Verifier victoire Ana
    if (game.off.black >= 15) {
      game.phase = 'gameover';
      game.winner = 'black';
      return {
        ...getGameState(game),
        anaDice: game.dice,
        anaMoves: moves
      };
    }
  }

  // Retour au joueur
  game.dice = [];
  game.movesLeft = [];
  game.currentPlayer = 'white';
  game.phase = 'rolling';

  return {
    ...getGameState(game),
    anaDice: game.dice.length > 0 ? game.dice : moves.length > 0 ? [moves[0].die] : [],
    anaMoves: moves
  };
}

function resetGame(sessionId) {
  games.delete(sessionId);
  return newGame(sessionId);
}

module.exports = {
  newGame,
  getGame,
  roll,
  move,
  resetGame
};
