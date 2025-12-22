/**
 * Hangman (Pendu) Engine for Ana
 * Supporte mode vsAna et vsHuman (J1 choisit le mot, J2 devine)
 * Catégories thématiques avec indices pour aider le joueur
 */

const games = new Map();

// Catégories thématiques étendues (beaucoup plus de mots!)
const WORDS = {
  animaux: [
    // Mammifères
    'elephant', 'girafe', 'hippopotame', 'rhinoceros', 'crocodile', 'dauphin', 'kangourou',
    'lion', 'tigre', 'leopard', 'panthere', 'jaguar', 'guepard', 'lynx', 'puma',
    'loup', 'renard', 'ours', 'sanglier', 'cerf', 'biche', 'chevreuil', 'elan',
    'singe', 'gorille', 'chimpanze', 'orang-outan', 'babouin', 'macaque',
    'elephant', 'mammouth', 'morse', 'phoque', 'otarie', 'baleine', 'orque',
    'cheval', 'poney', 'ane', 'zebre', 'chameau', 'dromadaire', 'lama', 'alpaga',
    'vache', 'taureau', 'bison', 'buffle', 'yack', 'mouton', 'chevre', 'antilope',
    'cochon', 'sanglier', 'hippopotame', 'tapir', 'rhinoceros',
    'lapin', 'lievre', 'hamster', 'cobaye', 'chinchilla', 'ecureuil', 'castor',
    'souris', 'rat', 'herisson', 'taupe', 'chauve-souris', 'koala', 'paresseux',
    'tatou', 'fourmilier', 'suricate', 'mangouste', 'blaireau', 'loutre', 'belette',
    // Oiseaux
    'aigle', 'faucon', 'vautour', 'hibou', 'chouette', 'corbeau', 'corneille',
    'pigeon', 'colombe', 'tourterelle', 'moineau', 'merle', 'rossignol',
    'perroquet', 'perruche', 'cacatoes', 'toucan', 'colibri', 'martin-pecheur',
    'flamant', 'heron', 'cigogne', 'pelican', 'cormoran', 'albatros', 'mouette',
    'pingouin', 'manchot', 'autruche', 'emeu', 'kiwi', 'paon', 'faisan', 'dindon',
    'canard', 'oie', 'cygne', 'poule', 'coq', 'poussin',
    // Reptiles et amphibiens
    'serpent', 'python', 'cobra', 'vipere', 'couleuvre', 'anaconda',
    'crocodile', 'alligator', 'caiman', 'lezard', 'iguane', 'cameleon', 'gecko',
    'tortue', 'grenouille', 'crapaud', 'salamandre', 'triton',
    // Poissons
    'requin', 'dauphin', 'baleine', 'orque', 'raie', 'thon', 'saumon', 'truite',
    'carpe', 'brochet', 'perche', 'sardine', 'anchois', 'maquereau', 'morue',
    'espadon', 'marlin', 'hippocampe', 'poisson-clown', 'piranha', 'murene',
    // Insectes et autres
    'papillon', 'abeille', 'guepe', 'frelon', 'bourdon', 'mouche', 'moustique',
    'fourmi', 'termite', 'scarabee', 'coccinelle', 'libellule', 'cigale', 'grillon',
    'sauterelle', 'mante', 'phasme', 'cafard', 'puce', 'araignee', 'scorpion',
    'escargot', 'limace', 'ver', 'sangsue', 'pieuvre', 'calamar', 'meduse'
  ],

  fruits: [
    'pomme', 'poire', 'peche', 'abricot', 'prune', 'cerise', 'griotte',
    'fraise', 'framboise', 'mure', 'myrtille', 'cassis', 'groseille',
    'raisin', 'figue', 'datte', 'banane', 'ananas', 'mangue', 'papaye',
    'orange', 'citron', 'mandarine', 'clementine', 'pamplemousse', 'kumquat',
    'kiwi', 'grenade', 'litchi', 'longane', 'ramboutan', 'fruit-de-la-passion',
    'melon', 'pasteque', 'cantaloup', 'avocat', 'noix-de-coco',
    'pomelo', 'bergamote', 'yuzu', 'carambole', 'durian', 'jacquier',
    'goyave', 'pitaya', 'acerola', 'physalis', 'nectarine', 'brugnon',
    'coing', 'nefle', 'kaki', 'jujube', 'tamarin', 'sapotille',
    'airelle', 'canneberge', 'sureau', 'arbouse', 'cynorhodon'
  ],

  legumes: [
    'carotte', 'pomme-de-terre', 'tomate', 'concombre', 'courgette', 'aubergine',
    'poivron', 'piment', 'oignon', 'ail', 'echalote', 'poireau', 'celeri',
    'salade', 'laitue', 'mache', 'roquette', 'epinard', 'blette', 'chou',
    'brocoli', 'chou-fleur', 'artichaut', 'asperge', 'fenouil', 'endive',
    'radis', 'navet', 'betterave', 'panais', 'rutabaga', 'topinambour',
    'haricot', 'petit-pois', 'feve', 'lentille', 'pois-chiche', 'soja',
    'mais', 'champignon', 'citrouille', 'potiron', 'courge', 'butternut',
    'gingembre', 'curcuma', 'rhubarbe', 'patate-douce', 'igname', 'manioc'
  ],

  pays: [
    // Europe
    'france', 'allemagne', 'espagne', 'italie', 'portugal', 'belgique', 'suisse',
    'autriche', 'pays-bas', 'luxembourg', 'monaco', 'andorre', 'liechtenstein',
    'royaume-uni', 'irlande', 'islande', 'norvege', 'suede', 'finlande', 'danemark',
    'pologne', 'tchequie', 'slovaquie', 'hongrie', 'roumanie', 'bulgarie',
    'grece', 'turquie', 'chypre', 'malte', 'croatie', 'slovenie', 'serbie',
    'ukraine', 'russie', 'bielorussie', 'moldavie', 'estonie', 'lettonie', 'lituanie',
    // Amériques
    'canada', 'etats-unis', 'mexique', 'guatemala', 'honduras', 'nicaragua',
    'costa-rica', 'panama', 'cuba', 'jamaique', 'haiti', 'dominicaine',
    'colombie', 'venezuela', 'equateur', 'perou', 'bolivie', 'chili',
    'argentine', 'uruguay', 'paraguay', 'bresil', 'guyane', 'suriname',
    // Asie
    'chine', 'japon', 'coree', 'vietnam', 'thailande', 'cambodge', 'laos',
    'birmanie', 'malaisie', 'singapour', 'indonesie', 'philippines',
    'inde', 'pakistan', 'bangladesh', 'nepal', 'bhoutan', 'sri-lanka',
    'afghanistan', 'iran', 'irak', 'syrie', 'liban', 'israel', 'jordanie',
    'arabie-saoudite', 'emirats', 'qatar', 'koweit', 'oman', 'yemen',
    // Afrique
    'maroc', 'algerie', 'tunisie', 'libye', 'egypte', 'soudan', 'ethiopie',
    'kenya', 'tanzanie', 'ouganda', 'rwanda', 'congo', 'cameroun', 'nigeria',
    'ghana', 'senegal', 'mali', 'niger', 'burkina-faso', 'cote-d-ivoire',
    'afrique-du-sud', 'namibie', 'botswana', 'zimbabwe', 'mozambique', 'madagascar',
    // Océanie
    'australie', 'nouvelle-zelande', 'papouasie', 'fidji', 'samoa', 'tonga'
  ],

  villes: [
    // France
    'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'nantes', 'strasbourg',
    'montpellier', 'bordeaux', 'lille', 'rennes', 'reims', 'toulon', 'grenoble',
    // Monde
    'londres', 'berlin', 'madrid', 'rome', 'lisbonne', 'amsterdam', 'bruxelles',
    'vienne', 'prague', 'budapest', 'varsovie', 'moscou', 'stockholm', 'oslo',
    'new-york', 'los-angeles', 'chicago', 'toronto', 'montreal', 'vancouver',
    'mexico', 'rio-de-janeiro', 'buenos-aires', 'santiago', 'lima', 'bogota',
    'tokyo', 'pekin', 'shanghai', 'hong-kong', 'seoul', 'bangkok', 'singapour',
    'dubai', 'istanbul', 'jerusalem', 'le-caire', 'casablanca', 'johannesburg',
    'sydney', 'melbourne', 'auckland', 'mumbai', 'delhi', 'calcutta'
  ],

  metiers: [
    // Santé
    'medecin', 'chirurgien', 'dentiste', 'pharmacien', 'infirmier', 'sage-femme',
    'kinesitherapeute', 'osteopathe', 'psychologue', 'psychiatre', 'veterinaire',
    // Enseignement
    'professeur', 'instituteur', 'enseignant', 'formateur', 'educateur', 'moniteur',
    // Justice et sécurité
    'avocat', 'juge', 'notaire', 'huissier', 'policier', 'gendarme', 'pompier',
    // Construction et artisanat
    'architecte', 'ingenieur', 'maçon', 'plombier', 'electricien', 'menuisier',
    'charpentier', 'couvreur', 'carreleur', 'peintre', 'serrurier', 'vitrier',
    // Alimentation
    'boulanger', 'patissier', 'boucher', 'charcutier', 'poissonnier', 'fromager',
    'cuisinier', 'chef', 'serveur', 'barman', 'sommelier', 'traiteur',
    // Commerce et services
    'vendeur', 'caissier', 'commercial', 'comptable', 'banquier', 'assureur',
    'coiffeur', 'estheticienne', 'fleuriste', 'libraire', 'antiquaire',
    // Informatique et tech
    'informaticien', 'programmeur', 'developpeur', 'webmaster', 'graphiste',
    // Arts et spectacle
    'musicien', 'chanteur', 'comedien', 'acteur', 'danseur', 'peintre',
    'sculpteur', 'photographe', 'cineaste', 'realisateur', 'journaliste',
    // Transports
    'pilote', 'chauffeur', 'conducteur', 'routier', 'marin', 'capitaine',
    // Autres
    'agriculteur', 'jardinier', 'paysagiste', 'bucheron', 'viticulteur',
    'secretaire', 'assistant', 'receptionniste', 'concierge', 'gardien'
  ],

  sports: [
    'football', 'basketball', 'volleyball', 'handball', 'rugby', 'tennis',
    'badminton', 'squash', 'ping-pong', 'golf', 'hockey', 'cricket',
    'baseball', 'softball', 'boxe', 'judo', 'karate', 'taekwondo',
    'escrime', 'lutte', 'athletisme', 'marathon', 'sprint', 'saut',
    'natation', 'plongeon', 'waterpolo', 'aviron', 'canoe', 'kayak',
    'voile', 'surf', 'planche-a-voile', 'kitesurf', 'ski', 'snowboard',
    'patinage', 'hockey-sur-glace', 'curling', 'bobsleigh', 'luge',
    'cyclisme', 'vtt', 'bmx', 'motocross', 'equitation', 'polo',
    'gymnastique', 'danse', 'escalade', 'alpinisme', 'randonnee',
    'triathlon', 'pentathlon', 'decathlon', 'haltérophilie', 'musculation'
  ],

  objets: [
    // Électronique
    'ordinateur', 'telephone', 'tablette', 'television', 'radio', 'montre',
    'appareil-photo', 'camera', 'casque', 'ecouteurs', 'enceinte', 'imprimante',
    // Mobilier
    'table', 'chaise', 'fauteuil', 'canape', 'lit', 'armoire', 'commode',
    'bureau', 'etagere', 'bibliotheque', 'meuble', 'tabouret', 'banc',
    // Cuisine
    'refrigerateur', 'four', 'micro-ondes', 'lave-vaisselle', 'cafetiere',
    'grille-pain', 'mixeur', 'bouilloire', 'poele', 'casserole', 'couteau',
    'fourchette', 'cuillere', 'assiette', 'verre', 'tasse', 'bol',
    // Ménager
    'aspirateur', 'lave-linge', 'seche-linge', 'fer-a-repasser', 'balai',
    // Vêtements
    'chemise', 'pantalon', 'jupe', 'robe', 'veste', 'manteau', 'pull',
    'chaussure', 'botte', 'sandale', 'chapeau', 'casquette', 'echarpe',
    // Outils
    'marteau', 'tournevis', 'cle', 'pince', 'scie', 'perceuse', 'niveau',
    // Transport
    'voiture', 'moto', 'velo', 'camion', 'bus', 'train', 'avion', 'bateau',
    // Autres
    'livre', 'stylo', 'crayon', 'cahier', 'ciseaux', 'lampe', 'miroir',
    'parapluie', 'valise', 'sac', 'portefeuille', 'lunettes', 'montre'
  ],

  musique: [
    // Cordes
    'guitare', 'violon', 'violoncelle', 'contrebasse', 'harpe', 'banjo',
    'mandoline', 'ukulele', 'luth', 'cithare', 'balalaika',
    // Vents
    'flute', 'clarinette', 'saxophone', 'trompette', 'trombone', 'tuba',
    'hautbois', 'basson', 'cor', 'harmonica', 'accordeon', 'cornemuse',
    // Claviers
    'piano', 'orgue', 'clavecin', 'synthetiseur', 'xylophone', 'vibraphone',
    // Percussions
    'batterie', 'tambour', 'djembe', 'bongo', 'congas', 'cymbale',
    'triangle', 'maracas', 'castagnettes', 'gong', 'tam-tam', 'timbales',
    // Genres
    'rock', 'jazz', 'blues', 'classique', 'pop', 'rap', 'reggae',
    'electro', 'techno', 'metal', 'funk', 'soul', 'country', 'folk'
  ],

  nature: [
    // Arbres
    'chene', 'sapin', 'pin', 'bouleau', 'hetre', 'erable', 'platane',
    'peuplier', 'saule', 'olivier', 'palmier', 'sequoia', 'baobab', 'cedre',
    // Fleurs
    'rose', 'tulipe', 'marguerite', 'tournesol', 'orchidee', 'lys', 'jasmin',
    'lavande', 'violette', 'pivoine', 'dahlia', 'iris', 'lilas', 'muguet',
    // Paysages
    'montagne', 'colline', 'vallee', 'plaine', 'plateau', 'falaise', 'canyon',
    'foret', 'jungle', 'savane', 'desert', 'toundra', 'prairie', 'marais',
    'ocean', 'mer', 'lac', 'riviere', 'fleuve', 'cascade', 'source', 'glacier',
    'plage', 'ile', 'archipel', 'volcan', 'grotte', 'caverne', 'recif',
    // Météo
    'soleil', 'lune', 'etoile', 'nuage', 'pluie', 'neige', 'grele', 'brouillard',
    'orage', 'tonnerre', 'eclair', 'arc-en-ciel', 'vent', 'tempete', 'ouragan'
  ],

  cuisine: [
    // Plats français
    'blanquette', 'cassoulet', 'ratatouille', 'bouillabaisse', 'choucroute',
    'quiche', 'crepe', 'galette', 'soufflé', 'gratin', 'fondue', 'raclette',
    'croissant', 'baguette', 'brioche', 'pain-au-chocolat', 'macaron', 'eclair',
    // Plats internationaux
    'pizza', 'pasta', 'risotto', 'lasagne', 'gnocchi', 'tiramisu',
    'paella', 'tapas', 'gazpacho', 'tortilla', 'churros',
    'sushi', 'ramen', 'tempura', 'teriyaki', 'miso', 'tofu',
    'curry', 'tandoori', 'naan', 'samosa', 'biryani',
    'hamburger', 'hot-dog', 'brownie', 'cheesecake', 'pancake',
    'couscous', 'tajine', 'falafel', 'houmous', 'kebab',
    // Ingrédients et bases
    'sauce', 'bouillon', 'soupe', 'salade', 'vinaigrette', 'mayonnaise',
    'omelette', 'quenelle', 'terrine', 'pate', 'mousse', 'creme'
  ]
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

  // Mode vsAna - choisir un mot d'une catégorie thématique
  const categories = Object.keys(WORDS);
  const cat = category && WORDS[category] ? category : categories[Math.floor(Math.random() * categories.length)];
  const wordList = WORDS[cat];
  const word = wordList[Math.floor(Math.random() * wordList.length)].toUpperCase().replace(/-/g, '');

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

  // En phase setup, word est null
  if (game.phase === 'setup') {
    return {
      exists: true,
      mode: game.mode,
      phase: 'setup',
      status: 'setup'
    };
  }

  return {
    exists: true,
    mode: game.mode,
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

function getWordCount() {
  let total = 0;
  for (const cat of Object.keys(WORDS)) {
    total += WORDS[cat].length;
  }
  return { categories: Object.keys(WORDS).length, totalWords: total };
}

module.exports = { newGame, setWord, guess, getState, getCategories, getWordCount, MAX_ERRORS };
