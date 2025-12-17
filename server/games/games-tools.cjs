/**
 * Games Tools for Ana
 * Outils pour que Ana puisse jouer avec l'utilisateur
 */

const checkersEngine = require('./checkers-engine.cjs');

// Réactions d'Ana selon les situations
const REACTIONS = {
  gameStart: [
    "Oh cool, une partie de dames! J'adore ce jeu! 🎮",
    "Parfait! Prépare-toi, je ne vais pas te laisser gagner facilement! 😏",
    "Allons-y! Que le meilleur gagne! ✨"
  ],
  playerCapture: [
    "Aïe! Tu m'as eu là! 😅",
    "Bien joué! Je ne l'avais pas vu venir...",
    "Ouch! Ok, je vais devoir me concentrer plus!",
    "Pas mal! Mais attends de voir ma riposte! 😤"
  ],
  anaCapture: [
    "Ha ha! Je t'ai eu! 😄",
    "Celui-là, il est pour moi! 🎯",
    "Merci pour ce pion! 😊",
    "Tu ne l'as pas vu venir, hein? 😏"
  ],
  playerGoodMove: [
    "Hmm, bon coup...",
    "Intéressant... tu joues bien!",
    "Je vois que tu connais le jeu!"
  ],
  anaThinking: [
    "Laisse-moi réfléchir...",
    "Hmm, voyons voir...",
    "Ok, je calcule mes options..."
  ],
  playerWin: [
    "Bravo! Tu m'as battue! On fait la revanche? 🎉",
    "GG! Tu joues vraiment bien! Une autre? 🏆",
    "Ok ok, tu as gagné cette fois! Mais la prochaine... 😤"
  ],
  anaWin: [
    "Yes! J'ai gagné! 🎉 C'était une belle partie!",
    "Victoire! Mais t'inquiète, tu as bien joué! 😊",
    "Je gagne! Une revanche? 🏆"
  ],
  hint: [
    "Tu veux un indice? Ok... Je te suggère ",
    "Hmm, si j'étais toi, je jouerais ",
    "Un petit coup de pouce: essaie "
  ],
  illegalMove: [
    "Hé! Ce coup n'est pas légal! 😅",
    "Attends, tu ne peux pas jouer ça!",
    "Non non, ce mouvement n'est pas permis!"
  ]
};

function randomReaction(type) {
  const reactions = REACTIONS[type];
  return reactions[Math.floor(Math.random() * reactions.length)];
}

/**
 * Outil principal pour jouer aux dames
 */
async function playCheckers(args, sessionId = 'default') {
  const { action, move, difficulty } = args;

  switch (action) {
    case 'new':
    case 'nouvelle':
    case 'start': {
      const result = checkersEngine.newGame(sessionId, difficulty || 'normal');
      return {
        success: true,
        reaction: randomReaction('gameStart'),
        ...result
      };
    }

    case 'play':
    case 'move':
    case 'jouer': {
      if (!move) {
        return {
          success: false,
          error: "Tu dois spécifier un coup! Par exemple: C3-D4 ou B6xD4"
        };
      }

      const result = checkersEngine.play(sessionId, move);

      if (!result.success) {
        return {
          success: false,
          reaction: randomReaction('illegalMove'),
          error: result.error
        };
      }

      // Construire la réponse avec les réactions
      const response = {
        success: true,
        ...result
      };

      // Réaction au coup du joueur
      if (result.playerMove && result.playerMove.captures.length > 0) {
        response.playerReaction = randomReaction('playerCapture');
      } else if (result.playerMove) {
        response.playerReaction = randomReaction('playerGoodMove');
      }

      // Réaction au coup d'Ana
      if (result.anaMove) {
        response.thinkingReaction = randomReaction('anaThinking');
        if (result.anaMove.captures.length > 0) {
          response.anaReaction = randomReaction('anaCapture');
        }
      }

      // Réaction fin de partie
      if (result.gameOver) {
        if (result.winner === 'player') {
          response.endReaction = randomReaction('playerWin');
        } else {
          response.endReaction = randomReaction('anaWin');
        }
      }

      return response;
    }

    case 'state':
    case 'status':
    case 'plateau': {
      const state = checkersEngine.getGameState(sessionId);
      if (!state.exists) {
        return {
          success: false,
          error: "Aucune partie en cours. Dis 'nouvelle partie de dames' pour commencer!"
        };
      }
      return {
        success: true,
        ...state
      };
    }

    case 'hint':
    case 'indice':
    case 'aide': {
      const hint = checkersEngine.getHint(sessionId);
      if (!hint.success) {
        return hint;
      }
      return {
        success: true,
        reaction: randomReaction('hint') + hint.hint,
        hint: hint.hint,
        allMoves: hint.allMoves
      };
    }

    case 'forfeit':
    case 'abandon': {
      return {
        success: true,
        message: "Tu abandonnes? D'accord... On fait une nouvelle partie? 😊",
        gameOver: true,
        winner: 'ana'
      };
    }

    default:
      return {
        success: false,
        error: `Action inconnue: ${action}. Actions possibles: new, play, state, hint, forfeit`
      };
  }
}

// Définition de l'outil pour le système de tools
const CHECKERS_TOOL = {
  name: 'play_checkers',
  description: `Jouer aux dames (checkers) avec l'utilisateur.
Actions disponibles:
- new/nouvelle: Démarrer une nouvelle partie (difficulty: easy/normal/hard)
- play/jouer: Jouer un coup (move: "C3-D4" ou "B6xD4" pour capture)
- state/plateau: Voir l'état actuel du jeu
- hint/indice: Obtenir un indice
- forfeit/abandon: Abandonner la partie`,
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['new', 'nouvelle', 'play', 'jouer', 'state', 'plateau', 'hint', 'indice', 'forfeit', 'abandon'],
        description: 'Action à effectuer'
      },
      move: {
        type: 'string',
        description: 'Le coup à jouer (ex: C3-D4 ou B6xD4)'
      },
      difficulty: {
        type: 'string',
        enum: ['easy', 'normal', 'hard'],
        description: 'Niveau de difficulté pour une nouvelle partie'
      }
    },
    required: ['action']
  },
  handler: playCheckers
};

module.exports = {
  playCheckers,
  CHECKERS_TOOL,
  REACTIONS
};
