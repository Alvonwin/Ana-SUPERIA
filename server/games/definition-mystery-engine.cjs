/**
 * Définition Mystère Engine for Ana
 * Ana donne des indices progressifs, le joueur devine le mot
 * Plus on devine vite, plus on gagne de points
 */

const games = new Map();

// Mots avec indices progressifs (du plus vague au plus précis)
const WORDS_WITH_CLUES = {
  objets: [
    {
      word: 'parapluie',
      clues: [
        "Je te protège des éléments",
        "Tu me portes quand le ciel pleure",
        "Je m'ouvre et je me ferme",
        "J'ai des baleines mais je ne nage pas",
        "Mary Poppins m'utilise pour voler"
      ]
    },
    {
      word: 'miroir',
      clues: [
        "Je te montre la vérité",
        "La reine de Blanche-Neige m'interrogeait",
        "Je reflète tout ce qui est devant moi",
        "Je suis fait de verre mais je ne suis pas une fenêtre",
        "Tu me regardes chaque matin"
      ]
    },
    {
      word: 'escalier',
      clues: [
        "Je t'aide à monter ou descendre",
        "Je peux être roulant dans les centres commerciaux",
        "J'ai des marches mais je ne suis pas une parade",
        "Je relie les étages",
        "Tu me grimpes pour aller au lit"
      ]
    },
    {
      word: 'television',
      clues: [
        "Je te divertis depuis des décennies",
        "J'ai un écran mais je ne suis pas un ordinateur",
        "Tu me regardes le soir sur le canapé",
        "J'ai des chaînes mais je ne suis pas une prison",
        "On m'appelle parfois 'la boîte à images'"
      ]
    },
    {
      word: 'refrigerateur',
      clues: [
        "Je garde les choses au frais",
        "Tu m'ouvres plusieurs fois par jour",
        "J'ai une lumière qui s'allume quand tu m'ouvres",
        "Je fais du bruit la nuit parfois",
        "Je suis dans ta cuisine et je conserve ta nourriture"
      ]
    },
    {
      word: 'ciseaux',
      clues: [
        "Je coupe mais je ne suis pas un couteau",
        "J'ai deux lames qui travaillent ensemble",
        "Les coiffeurs m'utilisent beaucoup",
        "Je perds contre la pierre mais je bats le papier",
        "J'ai deux anneaux pour les doigts"
      ]
    },
    {
      word: 'horloge',
      clues: [
        "Je mesure quelque chose d'invisible",
        "Je fais tic-tac",
        "Je peux être murale ou de grand-père",
        "J'ai des aiguilles mais je ne couds pas",
        "Je te dis l'heure"
      ]
    },
    {
      word: 'lunettes',
      clues: [
        "Je t'aide à voir plus clair",
        "Je peux être de soleil ou de vue",
        "Je me pose sur ton nez",
        "J'ai deux verres reliés",
        "Harry Potter porte les miennes rondes"
      ]
    }
  ],

  animaux: [
    {
      word: 'elephant',
      clues: [
        "Je suis le plus grand sur terre",
        "J'ai une mémoire légendaire",
        "Mon nez est très long et flexible",
        "J'ai de grandes oreilles en Afrique",
        "Je suis gris et j'ai des défenses en ivoire"
      ]
    },
    {
      word: 'cameleon',
      clues: [
        "Je suis un maître du déguisement",
        "Je change selon mon humeur ou environnement",
        "Ma langue est plus rapide que l'œil",
        "Mes yeux bougent indépendamment",
        "Je change de couleur pour me camoufler"
      ]
    },
    {
      word: 'dauphin',
      clues: [
        "Je suis très intelligent",
        "Je vis dans l'eau mais je respire l'air",
        "Je communique avec des clics et sifflements",
        "Je saute hors de l'eau pour m'amuser",
        "Je suis un mammifère marin ami de l'homme"
      ]
    },
    {
      word: 'hibou',
      clues: [
        "Je vis la nuit",
        "Ma tête peut tourner très loin",
        "Je chasse les souris",
        "Je fais 'hou hou'",
        "Je suis un oiseau nocturne avec de grands yeux"
      ]
    },
    {
      word: 'kangourou',
      clues: [
        "Je viens d'un pays-continent",
        "Je transporte mes petits avec moi",
        "Je me déplace en sautant",
        "J'ai une poche ventrale",
        "Je suis le symbole de l'Australie"
      ]
    },
    {
      word: 'tortue',
      clues: [
        "Je suis très lente mais je vis longtemps",
        "Je porte ma maison sur mon dos",
        "J'ai gagné contre le lièvre",
        "Je peux vivre sur terre ou dans l'eau",
        "J'ai une carapace dure"
      ]
    },
    {
      word: 'abeille',
      clues: [
        "Je travaille pour la reine",
        "Je produis quelque chose de sucré",
        "Je pollinise les fleurs",
        "Je vis dans une ruche",
        "Je fais du miel et je pique"
      ]
    },
    {
      word: 'pieuvre',
      clues: [
        "J'ai un encre de défense",
        "Je suis très intelligente pour un invertébré",
        "J'ai trois cœurs",
        "J'ai huit bras avec des ventouses",
        "Je vis dans l'océan et je suis un mollusque"
      ]
    }
  ],

  nature: [
    {
      word: 'arc-en-ciel',
      clues: [
        "J'apparais après la tempête",
        "J'ai plusieurs couleurs",
        "La légende dit qu'il y a un trésor à mon pied",
        "Je suis un phénomène optique",
        "J'ai 7 couleurs dans le ciel après la pluie"
      ]
    },
    {
      word: 'volcan',
      clues: [
        "Je peux dormir pendant des siècles",
        "Quand je me réveille, c'est catastrophique",
        "Je crache du feu et de la fumée",
        "Je suis une montagne spéciale",
        "J'éjecte de la lave et des cendres"
      ]
    },
    {
      word: 'glacier',
      clues: [
        "Je suis fait d'eau mais je ne coule pas",
        "Je fonds à cause du réchauffement",
        "Je suis très vieux et très froid",
        "Je me déplace très lentement",
        "Je suis une énorme masse de glace"
      ]
    },
    {
      word: 'orage',
      clues: [
        "Je fais du bruit et de la lumière",
        "Les chiens ont peur de moi",
        "J'apporte beaucoup de pluie",
        "Je gronde dans le ciel",
        "J'ai des éclairs et du tonnerre"
      ]
    },
    {
      word: 'cascade',
      clues: [
        "Je tombe mais je ne me fais pas mal",
        "Tu peux m'entendre de loin",
        "Les aventuriers passent parfois derrière moi",
        "Je suis de l'eau en mouvement vertical",
        "Je suis une chute d'eau naturelle"
      ]
    }
  ],

  nourriture: [
    {
      word: 'croissant',
      clues: [
        "Je viens de France... ou d'Autriche",
        "Je suis doré et feuilleté",
        "Tu me manges souvent le matin",
        "J'ai une forme de lune",
        "Je suis une viennoiserie en forme de croissant de lune"
      ]
    },
    {
      word: 'spaghetti',
      clues: [
        "Je viens d'Italie",
        "Tu m'enroules avec une fourchette",
        "Je suis long et fin",
        "Je suis souvent avec de la sauce tomate",
        "Je suis des pâtes longues et fines"
      ]
    },
    {
      word: 'chocolat',
      clues: [
        "Je viens d'une fève tropicale",
        "Je peux être noir, au lait ou blanc",
        "Je fonds dans ta bouche",
        "Les enfants m'adorent à Pâques",
        "Je suis une confiserie à base de cacao"
      ]
    },
    {
      word: 'fromage',
      clues: [
        "La France en a plus de 400 sortes",
        "Je suis fait à partir de lait",
        "Je peux puer mais être délicieux",
        "Les souris m'adorent dans les dessins animés",
        "Je suis un produit laitier affiné"
      ]
    },
    {
      word: 'baguette',
      clues: [
        "Je suis un symbole français",
        "Je croustille quand tu me mords",
        "Tu me portes sous le bras",
        "Je suis longue et dorée",
        "Je suis le pain français par excellence"
      ]
    }
  ],

  metiers: [
    {
      word: 'pompier',
      clues: [
        "Mon travail est dangereux mais héroïque",
        "Je porte une tenue spéciale",
        "J'utilise beaucoup d'eau",
        "J'arrive avec une sirène",
        "Je combats les incendies"
      ]
    },
    {
      word: 'astronaute',
      clues: [
        "Mon bureau est très loin",
        "Je flotte pendant mon travail",
        "Peu de gens font mon métier",
        "Je porte un casque spécial",
        "Je voyage dans l'espace"
      ]
    },
    {
      word: 'boulanger',
      clues: [
        "Je me lève très tôt",
        "Mon travail sent très bon",
        "J'utilise de la farine et de la levure",
        "Je travaille avec un four",
        "Je fais du pain et des viennoiseries"
      ]
    },
    {
      word: 'detective',
      clues: [
        "Je cherche la vérité",
        "J'observe les détails que les autres manquent",
        "Sherlock Holmes est mon collègue fictif",
        "J'utilise une loupe parfois",
        "J'enquête et je résous des mystères"
      ]
    }
  ],

  lieux: [
    {
      word: 'bibliotheque',
      clues: [
        "Il faut y être silencieux",
        "On y trouve des milliers de trésors",
        "Tu peux emprunter sans acheter",
        "Les étudiants y passent beaucoup de temps",
        "C'est un lieu rempli de livres"
      ]
    },
    {
      word: 'phare',
      clues: [
        "Je guide ceux qui sont perdus",
        "Je brille dans la nuit",
        "Je suis souvent près de rochers dangereux",
        "Les gardiens vivaient en moi autrefois",
        "Je suis une tour avec une lumière qui guide les bateaux"
      ]
    },
    {
      word: 'chateau',
      clues: [
        "Les rois y vivaient",
        "J'ai souvent des tours et des douves",
        "Les contes de fées s'y passent",
        "Je peux être hanté dans les histoires",
        "Je suis une forteresse royale médiévale"
      ]
    },
    {
      word: 'hopital',
      clues: [
        "On espère ne pas y aller souvent",
        "Les gens en blanc y travaillent",
        "On y naît et parfois on y meurt",
        "Il y a des urgences ici",
        "C'est un établissement de soins médicaux"
      ]
    }
  ]
};

// Points selon l'indice utilisé
const POINTS_BY_CLUE = [100, 80, 60, 40, 20];

class DefinitionMysteryGame {
  constructor(session) {
    this.session = session;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.roundsPlayed = 0;
    this.currentWord = null;
    this.currentClues = [];
    this.currentClueIndex = 0;
    this.currentCategory = null;
    this.guessedWords = [];
    this.status = 'waiting'; // waiting, playing, finished
  }

  // Démarrer une nouvelle manche
  newRound() {
    // Choisir une catégorie aléatoire
    const categories = Object.keys(WORDS_WITH_CLUES);
    this.currentCategory = categories[Math.floor(Math.random() * categories.length)];

    // Choisir un mot aléatoire non encore joué
    const availableWords = WORDS_WITH_CLUES[this.currentCategory].filter(
      w => !this.guessedWords.includes(w.word)
    );

    if (availableWords.length === 0) {
      // Reset si tous les mots ont été joués
      this.guessedWords = [];
      return this.newRound();
    }

    const wordData = availableWords[Math.floor(Math.random() * availableWords.length)];
    this.currentWord = wordData.word;
    this.currentClues = wordData.clues;
    this.currentClueIndex = 0;
    this.status = 'playing';

    return {
      category: this.currentCategory,
      clue: this.currentClues[0],
      clueNumber: 1,
      totalClues: this.currentClues.length,
      possiblePoints: POINTS_BY_CLUE[0],
      wordLength: this.currentWord.length,
      score: this.score,
      roundsPlayed: this.roundsPlayed
    };
  }

  // Demander l'indice suivant
  nextClue() {
    if (this.status !== 'playing') return null;

    this.currentClueIndex++;

    if (this.currentClueIndex >= this.currentClues.length) {
      // Plus d'indices, révéler le mot
      return this.reveal();
    }

    return {
      clue: this.currentClues[this.currentClueIndex],
      clueNumber: this.currentClueIndex + 1,
      totalClues: this.currentClues.length,
      possiblePoints: POINTS_BY_CLUE[this.currentClueIndex] || 10,
      previousClues: this.currentClues.slice(0, this.currentClueIndex),
      wordLength: this.currentWord.length
    };
  }

  // Tenter une réponse
  guess(answer) {
    if (this.status !== 'playing') {
      return { correct: false, error: 'Pas de partie en cours' };
    }

    const normalizedAnswer = answer.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedWord = this.currentWord.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (normalizedAnswer === normalizedWord) {
      // Bonne réponse!
      const points = POINTS_BY_CLUE[this.currentClueIndex] || 10;
      this.score += points;
      this.roundsPlayed++;
      this.guessedWords.push(this.currentWord);
      this.status = 'waiting';

      return {
        correct: true,
        word: this.currentWord,
        pointsEarned: points,
        cluesUsed: this.currentClueIndex + 1,
        totalScore: this.score,
        roundsPlayed: this.roundsPlayed,
        reaction: this.getReaction(this.currentClueIndex)
      };
    }

    return {
      correct: false,
      message: 'Ce n\'est pas ça...',
      hint: `Le mot a ${this.currentWord.length} lettres`
    };
  }

  // Révéler le mot (abandon)
  reveal() {
    if (!this.currentWord) return null;

    const word = this.currentWord;
    this.roundsPlayed++;
    this.guessedWords.push(word);
    this.status = 'waiting';

    return {
      revealed: true,
      word: word,
      category: this.currentCategory,
      totalScore: this.score,
      roundsPlayed: this.roundsPlayed,
      reaction: "Dommage! Le mot était: " + word
    };
  }

  // Réaction d'Ana selon la performance
  getReaction(clueIndex) {
    const reactions = [
      "Incroyable! Tu as deviné avec seulement le premier indice! 🎯",
      "Excellent! Seulement 2 indices, bien joué! 🌟",
      "Bien joué! Tu l'as trouvé! 👏",
      "Pas mal, tu as fini par le trouver! 😊",
      "Juste à temps! C'était le dernier indice! 😅"
    ];
    return reactions[clueIndex] || reactions[reactions.length - 1];
  }

  // État actuel
  getState() {
    return {
      exists: true,
      status: this.status,
      score: this.score,
      roundsPlayed: this.roundsPlayed,
      currentCategory: this.currentCategory,
      currentClueIndex: this.currentClueIndex,
      currentClues: this.status === 'playing' ? this.currentClues.slice(0, this.currentClueIndex + 1) : [],
      possiblePoints: this.status === 'playing' ? (POINTS_BY_CLUE[this.currentClueIndex] || 10) : 0,
      wordLength: this.currentWord?.length || 0,
      isPlaying: this.status === 'playing'
    };
  }
}

// API du moteur
module.exports = {
  newGame(session) {
    const game = new DefinitionMysteryGame(session);
    games.set(session, game);
    const roundData = game.newRound();
    return {
      success: true,
      ...roundData,
      isPlaying: true,
      reaction: "C'est parti! Devine le mot à partir de mes indices. Premier indice..."
    };
  },

  getState(session) {
    const game = games.get(session);
    if (!game) return { exists: false };
    return game.getState();
  },

  nextClue(session) {
    const game = games.get(session);
    if (!game) return { success: false, error: 'Pas de partie en cours' };

    const result = game.nextClue();
    if (!result) return { success: false, error: 'Erreur' };

    return { success: true, ...result };
  },

  guess(session, answer) {
    const game = games.get(session);
    if (!game) return { success: false, error: 'Pas de partie en cours' };

    return { success: true, ...game.guess(answer) };
  },

  reveal(session) {
    const game = games.get(session);
    if (!game) return { success: false, error: 'Pas de partie en cours' };

    const result = game.reveal();
    return { success: true, ...result };
  },

  newRound(session) {
    const game = games.get(session);
    if (!game) return { success: false, error: 'Pas de partie en cours' };

    const roundData = game.newRound();
    return { success: true, ...roundData, isPlaying: true };
  },

  // Stats
  getStats(session) {
    const game = games.get(session);
    if (!game) return { exists: false };

    return {
      exists: true,
      score: game.score,
      roundsPlayed: game.roundsPlayed,
      averagePoints: game.roundsPlayed > 0 ? Math.round(game.score / game.roundsPlayed) : 0
    };
  }
};
