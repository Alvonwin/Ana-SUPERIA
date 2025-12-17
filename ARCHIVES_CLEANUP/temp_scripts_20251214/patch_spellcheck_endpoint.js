const fs = require('fs');

const filePath = 'E:/ANA/server/ana-core.cjs';
let content = fs.readFileSync(filePath, 'utf8');

// Endpoint à ajouter après /api/voice/history
const afterPattern = `});

// ================== CODE EXECUTE API (Fix #3 - 30-Nov-2025) ==================`;

const newEndpoint = `});

// ================== SPELL CHECK API (13-Dec-2025) ==================
// Correction orthographique pour la capture vocale
app.post('/api/spellcheck', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Le champ "text" est requis'
      });
    }

    // Corrections forcées spécifiques (reconnaissance vocale)
    let corrected = text;

    // Anna → Ana (nom propre, forcer)
    corrected = corrected.replace(/\\bAnna\\b/gi, 'Ana');

    // Appliquer le spell checker français
    corrected = spellChecker.correctText(corrected);

    res.json({
      success: true,
      original: text,
      corrected: corrected,
      changed: text !== corrected
    });
  } catch (error) {
    console.error('Erreur spellcheck:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================== CODE EXECUTE API (Fix #3 - 30-Nov-2025) ==================`;

if (content.includes(afterPattern) && !content.includes('/api/spellcheck')) {
  content = content.replace(afterPattern, newEndpoint);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('OK: Endpoint /api/spellcheck ajoute');
} else if (content.includes('/api/spellcheck')) {
  console.log('SKIP: Endpoint /api/spellcheck deja present');
} else {
  console.log('ERROR: Pattern non trouve');
}
