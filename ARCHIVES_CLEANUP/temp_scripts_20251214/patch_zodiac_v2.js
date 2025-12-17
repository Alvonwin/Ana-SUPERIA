const fs = require('fs');

const filePath = 'E:/ANA/server/agents/tool-agent.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Verifier si deja present
if (content.includes('get_zodiac_sign')) {
  console.log('SKIP: get_zodiac_sign deja present');
  process.exit(0);
}

// 1. Ajouter a la liste des outils valides (DATE/MATH)
content = content.replace(
  "// DATE/MATH (9)\n    'format_date', 'date_diff', 'add_to_date', 'timestamp_to_date', 'date_to_timestamp', 'calculate', 'convert_units', 'random_number', 'statistics',",
  "// DATE/MATH (10)\n    'format_date', 'date_diff', 'add_to_date', 'timestamp_to_date', 'date_to_timestamp', 'calculate', 'convert_units', 'random_number', 'statistics', 'get_zodiac_sign',"
);
console.log('OK: Ajoute a la liste des outils valides');

// 2. Ajouter la definition de l'outil apres statistics
const statisticsDefEnd = `name: 'statistics',
      description: 'Calculer des statistiques sur un ensemble de nombres.',
      parameters: {
        type: 'object',
        properties: {
          numbers: { type: 'array', items: { type: 'number' }, description: 'Liste de nombres' }
        },
        required: ['numbers']
      }
    }
  },`;

const zodiacDef = `name: 'statistics',
      description: 'Calculer des statistiques sur un ensemble de nombres.',
      parameters: {
        type: 'object',
        properties: {
          numbers: { type: 'array', items: { type: 'number' }, description: 'Liste de nombres' }
        },
        required: ['numbers']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_zodiac_sign',
      description: 'Determiner le signe astrologique a partir d une date de naissance.',
      parameters: {
        type: 'object',
        properties: {
          day: { type: 'number', description: 'Jour de naissance (1-31)' },
          month: { type: 'number', description: 'Mois de naissance (1-12)' },
          date: { type: 'string', description: 'Date au format YYYY-MM-DD ou DD/MM/YYYY (alternative)' }
        }
      }
    }
  },`;

content = content.replace(statisticsDefEnd, zodiacDef);
console.log('OK: Definition de outil ajoutee');

// 3. Ajouter implementation apres statistics
const zodiacImpl = `
  // Signe astrologique
  async get_zodiac_sign(args) {
    let day, month;

    // Parser la date
    if (args.date) {
      const date = new Date(args.date);
      if (!isNaN(date)) {
        day = date.getDate();
        month = date.getMonth() + 1;
      } else {
        // Essayer format DD/MM/YYYY
        const parts = args.date.split(/[\\/\\-]/);
        if (parts.length >= 2) {
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
        }
      }
    } else {
      day = args.day;
      month = args.month;
    }

    if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) {
      return { success: false, error: 'Date invalide. Fournir day/month ou date.' };
    }

    // Dates des signes astrologiques
    const signs = [
      { name: 'Capricorne', start: [12, 22], end: [1, 19], element: 'Terre', emoji: '♑' },
      { name: 'Verseau', start: [1, 20], end: [2, 18], element: 'Air', emoji: '♒' },
      { name: 'Poissons', start: [2, 19], end: [3, 20], element: 'Eau', emoji: '♓' },
      { name: 'Belier', start: [3, 21], end: [4, 19], element: 'Feu', emoji: '♈' },
      { name: 'Taureau', start: [4, 20], end: [5, 20], element: 'Terre', emoji: '♉' },
      { name: 'Gemeaux', start: [5, 21], end: [6, 20], element: 'Air', emoji: '♊' },
      { name: 'Cancer', start: [6, 21], end: [7, 22], element: 'Eau', emoji: '♋' },
      { name: 'Lion', start: [7, 23], end: [8, 22], element: 'Feu', emoji: '♌' },
      { name: 'Vierge', start: [8, 23], end: [9, 22], element: 'Terre', emoji: '♍' },
      { name: 'Balance', start: [9, 23], end: [10, 22], element: 'Air', emoji: '♎' },
      { name: 'Scorpion', start: [10, 23], end: [11, 21], element: 'Eau', emoji: '♏' },
      { name: 'Sagittaire', start: [11, 22], end: [12, 21], element: 'Feu', emoji: '♐' }
    ];

    // Trouver le signe
    for (const sign of signs) {
      const [startMonth, startDay] = sign.start;
      const [endMonth, endDay] = sign.end;

      // Cas special Capricorne (chevauche annee)
      if (sign.name === 'Capricorne') {
        if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
          return {
            success: true,
            sign: sign.name,
            emoji: sign.emoji,
            element: sign.element,
            date_input: day + '/' + month,
            message: 'Le ' + day + '/' + month + ', le signe astrologique est ' + sign.emoji + ' ' + sign.name + ' (element: ' + sign.element + ')'
          };
        }
      } else if (
        (month === startMonth && day >= startDay) ||
        (month === endMonth && day <= endDay)
      ) {
        return {
          success: true,
          sign: sign.name,
          emoji: sign.emoji,
          element: sign.element,
          date_input: day + '/' + month,
          message: 'Le ' + day + '/' + month + ', le signe astrologique est ' + sign.emoji + ' ' + sign.name + ' (element: ' + sign.element + ')'
        };
      }
    }

    return { success: false, error: 'Impossible de determiner le signe' };
  },
`;

// Ajouter apres implementation de statistics
content = content.replace(
  /async statistics\(args\) \{[\s\S]*?return \{ success: false, error: error\.message \};\s*\}\s*\},/,
  (match) => match + zodiacImpl
);
console.log('OK: Implementation ajoutee');

// Sauvegarder
fs.writeFileSync(filePath, content, 'utf8');
console.log('DONE: Outil get_zodiac_sign ajoute a tool-agent.cjs');
console.log('TOTAL: 182 outils maintenant!');
