/**
 * Motus Engine for Ana
 * Le joueur doit deviner un mot en 6 essais
 * Feedback: bien placé (🟥), mal placé (🟨), absent (⬜)
 * Supporte mode vsAna et vsHuman
 * Utilise le dictionnaire partagé
 */

const games = new Map();

// Service de dictionnaire partagé
let dictionaryService = null;
let dictionaryLoaded = false;

async function initDictionary() {
  if (dictionaryLoaded) return;
  try {
    dictionaryService = require('../services/dictionary-service.cjs');
    await dictionaryService.load();
    dictionaryLoaded = true;
    console.log('[Motus] Dictionnaire chargé:', dictionaryService.getStats());
  } catch (error) {
    console.error('[Motus] Erreur chargement dictionnaire:', error.message);
  }
}
initDictionary();

// Mots de fallback si le dictionnaire n'est pas disponible
const FALLBACK_WORDS = {
  5: [
    'ARBRE', 'AVION', 'BALAI', 'BANDE', 'BARBE', 'BATON', 'BIERE', 'BLANC',
    'BLOND', 'BOIRE', 'BOITE', 'BOMBE', 'BOTTE', 'BRAVO', 'BRUIT', 'CABLE',
    'CACAO', 'CADRE', 'CALME', 'CANAL', 'CARTE', 'CAUSE', 'CHAMP', 'CHANT',
    'CHOIX', 'CLAIR', 'CLASSE', 'COEUR', 'COUPE', 'CREME', 'CRISE', 'CROIX',
    'DANCE', 'DOIGT', 'DROIT', 'ECOLE', 'EFFET', 'ENVIE', 'ETAGE', 'ETOILE',
    'FEMME', 'FEUILLE', 'FINAL', 'FLEUR', 'FORCE', 'FORME', 'FOULE', 'FRUIT',
    'GARDE', 'GLACE', 'GRACE', 'GRAND', 'GRAVE', 'GRISE', 'HOMME', 'IMAGE',
    'JAMBE', 'JAUNE', 'JEUNE', 'JOUER', 'JUSTE', 'LAMPE', 'LARGE', 'LEVER',
    'LIBRE', 'LIGNE', 'LIVRE', 'LOURD', 'LUNDI', 'MAINS', 'MANGE', 'MARDI',
    'MASSE', 'MERCI', 'METRO', 'MIEUX', 'MONDE', 'MONTE', 'MOTIF', 'MOYEN',
    'NEIGE', 'NOIRE', 'OFFRE', 'OMBRE', 'ONCLE', 'ORDRE', 'OUEST', 'PAIRE',
    'PAIX', 'PANNE', 'PASSE', 'PAUSE', 'PEINE', 'PERDU', 'PIECE', 'PISTE',
    'PLACE', 'PLAGE', 'PLUIE', 'POCHE', 'POEME', 'POIDS', 'POINT', 'POMME',
    'PORTE', 'POSTE', 'POULE', 'PRIME', 'PRISE', 'PROCHE', 'QUAND', 'RESTE',
    'RICHE', 'ROUTE', 'ROUGE', 'SABLE', 'SALUT', 'SAUCE', 'SCENE', 'SEIZE',
    'SELON', 'SERIE', 'SIGNE', 'SPORT', 'STAGE', 'STYLE', 'SUITE', 'TABLE',
    'TANTE', 'TASSE', 'TERRE', 'TEXTE', 'TITRE', 'TOTAL', 'TRACE', 'TRAIN',
    'TROIS', 'TROUVER', 'UNION', 'USAGE', 'VAGUE', 'VENIR', 'VERRE', 'VILLE',
    'VIVRE', 'VOILA', 'VOTRE', 'VOYEZ', 'VRAIE', 'YACHT', 'ZEBRE', 'ZONE'
  ],
  6: [
    'ABSENT', 'ACCENT', 'ACTION', 'ACTUEL', 'ADOREE', 'ADULTE', 'AGENCE', 'ALARME',
    'ANIMAL', 'ANNEAU', 'APERCU', 'APPARU', 'ARGENT', 'ARRIVE', 'ASPECT', 'ASSISE',
    'ATELIER', 'AUTEUR', 'BATEAU', 'BEAUTE', 'BESOIN', 'BEURRE', 'BOUCHE', 'BRANCHE',
    'BUDGET', 'BUREAU', 'CABINE', 'CALMER', 'CASQUE', 'CENTRE', 'CERCLE', 'CHAISE',
    'CHANCE', 'CHEMIN', 'CINEMA', 'CLIENT', 'COMPTE', 'COPAIN', 'COUCHE', 'COURSE',
    'COUSIN', 'CUISSE', 'DANGER', 'DEBOUT', 'DESSIN', 'DETAIL', 'DIAMANT', 'DISQUE',
    'DOUBLE', 'DRAGON', 'ECOUTE', 'EFFORT', 'EMPLOI', 'ENFANT', 'ENIGME', 'ENTRER',
    'EQUIPE', 'ERREUR', 'ESPRIT', 'ETOILE', 'EUROPE', 'FAVORI', 'FIGURE', 'FLEUVE',
    'FRANCE', 'GARAGE', 'GAUCHE', 'GENDE', 'GLOIRE', 'GUERRE', 'GUIDE', 'HASARD',
    'HERBE', 'HIVERS', 'HUMAIN', 'JUNGLE', 'JOYEUX', 'LANCER', 'LANGUE', 'LETTRE',
    'LIMITE', 'LONGUE', 'LUMIERE', 'MADAME', 'MAGASIN', 'MAITRE', 'MALADE', 'MANCHE',
    'MARCHE', 'MARINE', 'MEMBRE', 'MENACE', 'MESURE', 'MINUTE', 'MODELE', 'MOMENT',
    'MONTRE', 'MUSEE', 'NATION', 'NATURE', 'NORMAL', 'NOTION', 'NUMERO', 'ORANGE',
    'PALAIS', 'PAPIER', 'PARDON', 'PARENT', 'PARTIR', 'PATRIE', 'PATRON', 'PAYSAN',
    'PENSEE', 'PERMIS', 'PHRASE', 'PIERRE', 'PLANTE', 'POLICE', 'POTION', 'POSTER',
    'PREVUE', 'PRINCE', 'PRISON', 'PROFIT', 'PROJET', 'PUBLIC', 'PUZZLE', 'QUAKER',
    'RAISON', 'RAPIDE', 'REGIME', 'REGION', 'RELIEF', 'RENARD', 'RETOUR', 'RISQUE',
    'RIVAGE', 'SAISON', 'SAMEDI', 'SECRET', 'SEMAINE', 'SIMPLE', 'SOLEIL', 'SOURCE',
    'STATUE', 'SUCCES', 'SUIVRE', 'TALENT', 'TEMPLE', 'TIMBRE', 'TRAFIC', 'TRESOR',
    'VALEUR', 'VAPEUR', 'VELOUR', 'VERBAL', 'VICTIME', 'VIOLET', 'VISAGE', 'VOLUME'
  ],
  7: [
    'ABANDON', 'ABSENCE', 'ACCIDENT', 'ACCUEIL', 'ADRESSE', 'AFFIRME', 'AGREMENT',
    'ANALYSE', 'ANGOISSE', 'ANNONCE', 'APPROCHE', 'ARTICLE', 'ATELIER', 'ATTAQUE',
    'ATTENTE', 'BALANCE', 'BANLIEUE', 'BATAILLE', 'BONHEUR', 'BOUTIQUE', 'CABANES',
    'CABINET', 'CADENAS', 'CAMPING', 'CAPABLE', 'CAPITAL', 'CAROTTE', 'CERVEAU',
    'CHALEUR', 'CHAMBRE', 'CHANSON', 'CHAPITRE', 'CHARBON', 'CHATEAU', 'CHEMISE',
    'CHEVEUX', 'CHOCOLAT', 'CITOYEN', 'CLASSER', 'COLONNE', 'COMBIEN', 'COMMENT',
    'COMMUNE', 'COMPLET', 'CONSEIL', 'CONTACT', 'CONTENU', 'CONTRAT', 'COSTUME',
    'COURAGE', 'COURANT', 'CULTURE', 'DANSEUR', 'DECISION', 'DEMANDE', 'DERNIER',
    'DESCENTE', 'DILEMME', 'DISPUTE', 'DOMMAGE', 'DRAPEAU', 'ECLIPSE', 'EMOTION',
    'ENERGIE', 'ENSEMBLE', 'ENTIERE', 'EXEMPLE', 'EXTREME', 'FAMILLE', 'FANTOME',
    'FERMIER', 'FINANCE', 'FORMULE', 'FORTUNE', 'FOURMI', 'FROMAGE', 'GENERAL',
    'GIRAFE', 'GLACIER', 'GLOBALE', 'GRANDES', 'GUITARE', 'HABITER', 'HAMSTER',
    'HEUREUX', 'HISTOIRE', 'HOPITAL', 'HORIZON', 'IMMENSE', 'IMPORTE', 'INCONNU',
    'INITIAL', 'JANVIER', 'JARDIN', 'JOURNAL', 'JUILLET', 'JUSTICE', 'LANGAGE',
    'LECTURE', 'LEGENDE', 'LIBERTE', 'LOGIQUE', 'MACHINE', 'MAGIQUE', 'MANIERE',
    'MARIAGE', 'MATIERE', 'MAXIMUM', 'MEMOIRE', 'MESSAGE', 'METHODE', 'MILLION',
    'MINIMUM', 'MINISTRE', 'MISSION', 'MONSTRE', 'MONTAGE', 'MOYENNE', 'MYSTERE',
    'NATUREL', 'NERVEUX', 'NOUVEAU', 'NUANCES', 'OBJECTIF', 'OCTOBRE', 'OPINION',
    'ORIGNAL', 'OUBLIER', 'PAISIBLE', 'PALIERS', 'PANACHE', 'PARADIS', 'PARFAIT',
    'PARKING', 'PARTOUT', 'PASSAGE', 'PASSION', 'PATIENT', 'PAUVRES', 'PAYSAGE'
  ]
};

const MAX_ATTEMPTS = 6;

/**
 * Normalise un mot (enlève les accents, met en majuscules)
 */
function normalizeWord(word) {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * Obtient un mot aléatoire de la longueur spécifiée
 * Utilise le dictionnaire partagé si disponible, sinon les mots de fallback
 */
function getRandomWord(length = 6) {
  // Essayer le dictionnaire partagé
  if (dictionaryLoaded && dictionaryService) {
    const word = dictionaryService.getRandomWord({
      minLength: length,
      maxLength: length,
      excludeAccents: false
    });
    if (word) {
      return normalizeWord(word);
    }
  }

  // Fallback aux mots locaux
  const words = FALLBACK_WORDS[length] || FALLBACK_WORDS[6];
  return words[Math.floor(Math.random() * words.length)];
}

/**
 * Vérifie si un mot existe dans le dictionnaire
 */
function isValidWord(word) {
  if (!word || word.length < 3) return false;

  if (dictionaryLoaded && dictionaryService) {
    // Normaliser le mot pour la recherche
    const normalized = word.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return dictionaryService.wordExists(normalized);
  }

  // Sans dictionnaire, accepter tous les mots
  return true;
}

/**
 * Compare le mot proposé avec le mot à deviner
 * Retourne un tableau de résultats: 'correct' (🟥), 'present' (🟨), 'absent' (⬜)
 */
function compareWords(guess, target) {
  const result = [];
  const targetLetters = target.split('');
  const guessLetters = guess.toUpperCase().split('');
  const used = new Array(target.length).fill(false);

  // Premier passage: lettres bien placées
  for (let i = 0; i < guessLetters.length; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Deuxième passage: lettres mal placées ou absentes
  for (let i = 0; i < guessLetters.length; i++) {
    if (result[i]) continue; // Déjà traité

    let found = false;
    for (let j = 0; j < targetLetters.length; j++) {
      if (!used[j] && guessLetters[i] === targetLetters[j]) {
        result[i] = 'present';
        used[j] = true;
        found = true;
        break;
      }
    }
    if (!found) {
      result[i] = 'absent';
    }
  }

  return result;
}

/**
 * Formate le résultat en emojis pour affichage
 */
function formatResult(guess, result) {
  const emojis = { correct: '🟥', present: '🟨', absent: '⬜' };
  let display = '';
  for (let i = 0; i < guess.length; i++) {
    display += emojis[result[i]] + guess[i].toUpperCase() + ' ';
  }
  return display.trim();
}

/**
 * Nouvelle partie
 */
function newGame(sessionId, wordLength = 6, mode = 'vsAna', customWord = null) {
  let targetWord;

  if (mode === 'vsHuman' && customWord) {
    targetWord = customWord.toUpperCase().replace(/[^A-Z]/g, '');
  } else {
    targetWord = getRandomWord(wordLength);
  }

  const firstLetter = targetWord[0];

  const game = {
    sessionId,
    targetWord,
    wordLength: targetWord.length,
    attempts: [],
    maxAttempts: MAX_ATTEMPTS,
    status: 'playing', // playing, won, lost
    mode,
    firstLetter,
    createdAt: new Date().toISOString()
  };

  games.set(sessionId, game);

  return {
    success: true,
    message: `🟩 MOTUS - Trouve le mot de ${targetWord.length} lettres!\n\nLa première lettre est: ${firstLetter}\nTu as ${MAX_ATTEMPTS} essais.\n\nPropose un mot!`,
    wordLength: targetWord.length,
    firstLetter,
    attemptsLeft: MAX_ATTEMPTS,
    status: 'playing'
  };
}

/**
 * Proposer un mot
 */
function guess(sessionId, word) {
  const game = games.get(sessionId);

  if (!game) {
    return { success: false, message: "Pas de partie en cours. Dis 'nouvelle partie motus' pour commencer!" };
  }

  if (game.status !== 'playing') {
    return { success: false, message: `La partie est terminée (${game.status}). Dis 'nouvelle partie motus' pour rejouer!` };
  }

  const guessWord = normalizeWord(word).replace(/[^A-Z]/g, '');

  // Vérifier la longueur
  if (guessWord.length !== game.wordLength) {
    return {
      success: false,
      message: `Le mot doit faire ${game.wordLength} lettres! "${word}" en fait ${guessWord.length}.`
    };
  }

  // Vérifier que le mot existe dans le dictionnaire
  if (!isValidWord(guessWord)) {
    return {
      success: false,
      message: `"${word}" n'est pas dans le dictionnaire!`
    };
  }

  // Vérifier que ça commence par la bonne lettre
  if (guessWord[0] !== game.firstLetter) {
    return {
      success: false,
      message: `Le mot doit commencer par ${game.firstLetter}!`
    };
  }

  // Comparer
  const result = compareWords(guessWord, game.targetWord);
  const display = formatResult(guessWord, result);

  game.attempts.push({ word: guessWord, result, display });

  // Gagné?
  if (guessWord === game.targetWord) {
    game.status = 'won';
    return {
      success: true,
      won: true,
      message: `${display}\n\n🎉 BRAVO! Tu as trouvé "${game.targetWord}" en ${game.attempts.length} essai(s)!`,
      attempts: game.attempts.length,
      word: game.targetWord
    };
  }

  // Perdu?
  if (game.attempts.length >= game.maxAttempts) {
    game.status = 'lost';
    return {
      success: true,
      lost: true,
      message: `${display}\n\n😢 Perdu! Le mot était "${game.targetWord}".`,
      word: game.targetWord
    };
  }

  // Continuer
  const attemptsLeft = game.maxAttempts - game.attempts.length;
  return {
    success: true,
    message: `${display}\n\nEncore ${attemptsLeft} essai(s).`,
    attemptsLeft,
    attempts: game.attempts.map(a => a.display)
  };
}

/**
 * État de la partie
 */
function getState(sessionId) {
  const game = games.get(sessionId);

  if (!game) {
    return { success: false, hasGame: false };
  }

  return {
    success: true,
    hasGame: true,
    wordLength: game.wordLength,
    firstLetter: game.firstLetter,
    attempts: game.attempts.map(a => a.display),
    attemptsLeft: game.maxAttempts - game.attempts.length,
    status: game.status
  };
}

/**
 * Abandonner
 */
function abandon(sessionId) {
  const game = games.get(sessionId);

  if (!game) {
    return { success: false, message: "Pas de partie en cours." };
  }

  game.status = 'abandoned';
  const word = game.targetWord;
  games.delete(sessionId);

  return {
    success: true,
    message: `Partie abandonnée. Le mot était "${word}".`,
    word
  };
}

/**
 * Obtenir un indice (révèle une lettre)
 */
function getHint(sessionId) {
  const game = games.get(sessionId);

  if (!game) {
    return { success: false, message: "Pas de partie en cours." };
  }

  if (game.status !== 'playing') {
    return { success: false, message: "La partie est terminée." };
  }

  // Initialiser les indices utilisés si pas encore fait
  if (!game.hintsUsed) game.hintsUsed = [];
  if (!game.revealedPositions) game.revealedPositions = [0]; // Position 0 déjà révélée (première lettre)

  // Trouver les positions non révélées
  const unrevealedPositions = [];
  for (let i = 1; i < game.wordLength; i++) {
    if (!game.revealedPositions.includes(i)) {
      unrevealedPositions.push(i);
    }
  }

  if (unrevealedPositions.length === 0) {
    return { success: false, message: "Toutes les lettres ont déjà été révélées!" };
  }

  // Max 2 indices par partie
  if (game.hintsUsed.length >= 2) {
    return { success: false, message: "Tu as déjà utilisé tes 2 indices!" };
  }

  // Révéler une position aléatoire
  const randomIndex = Math.floor(Math.random() * unrevealedPositions.length);
  const position = unrevealedPositions[randomIndex];
  const letter = game.targetWord[position];

  game.revealedPositions.push(position);
  game.hintsUsed.push({ position, letter });

  return {
    success: true,
    message: `💡 Indice: La lettre en position ${position + 1} est "${letter}"`,
    position: position,
    letter: letter,
    hintsRemaining: 2 - game.hintsUsed.length
  };
}

module.exports = {
  newGame,
  guess,
  getState,
  abandon,
  getHint,
  // Pour compatibilité avec le pattern games-tools
  games
};
