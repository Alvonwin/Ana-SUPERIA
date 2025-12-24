/**
 * French Spell Checker Module for Ana
 * Uses nspell with French Hunspell dictionary
 *
 * @module spell-checker
 * @description Corrects spelling errors in Ana's responses
 */

const nspell = require('nspell');
const fs = require('fs');
const path = require('path');

let spellChecker = null;
let isInitialized = false;

/**
 * Initialize the French spell checker
 * @returns {Promise<void>}
 */
async function initialize() {
  if (isInitialized) return;

  try {
    // FIX 2025-12-23: Lire les fichiers directement (evite conflit ESM/CommonJS)
    const dictPath = path.dirname(require.resolve('dictionary-fr'));
    const affPath = path.join(dictPath, 'index.aff');
    const dicPath = path.join(dictPath, 'index.dic');

    const aff = fs.readFileSync(affPath);
    const dic = fs.readFileSync(dicPath);

    spellChecker = nspell({ aff, dic });
    isInitialized = true;
    console.log('Correcteur orthographique francais initialise');
  } catch (error) {
    console.error('Erreur init spell-checker:', error.message);
    throw error;
  }
}

/**
 * Check if a word is spelled correctly
 * @param {string} word - Word to check
 * @returns {boolean} True if correct
 */
function isCorrect(word) {
  if (!spellChecker) return true;
  return spellChecker.correct(word);
}

/**
 * Get spelling suggestions for a word
 * @param {string} word - Misspelled word
 * @returns {string[]} Array of suggestions
 */
function suggest(word) {
  if (!spellChecker) return [];
  return spellChecker.suggest(word);
}

/**
 * Mots anglais courants a NE PAS corriger (FIX 2025-12-16)
 * Ces mots sont souvent utilises en franglais quebecois
 */
const ENGLISH_WORDS_TO_PRESERVE = [
  // Jeux
  'memory', 'game', 'games', 'chess', 'blackjack', 'hangman', 'battleship', 'backgammon',
  // Tech
  'file', 'files', 'folder', 'folders', 'bug', 'bugs', 'fix', 'update', 'backup', 'reset',
  'server', 'client', 'backend', 'frontend', 'database', 'cache', 'config', 'settings',
  'start', 'stop', 'restart', 'shutdown', 'login', 'logout', 'username', 'password',
  'email', 'download', 'upload', 'install', 'uninstall', 'debug', 'test', 'tests',
  // General
  'ok', 'okay', 'cool', 'nice', 'sorry', 'please', 'thanks', 'yes', 'no', 'maybe',
  'hello', 'hi', 'bye', 'good', 'bad', 'best', 'worst', 'top', 'bottom',
  'check', 'click', 'scroll', 'drag', 'drop', 'copy', 'paste', 'cut', 'delete',
  'search', 'find', 'replace', 'save', 'load', 'open', 'close', 'new', 'old',
  'input', 'output', 'data', 'info', 'error', 'warning', 'success', 'fail', 'failed',
  'online', 'offline', 'status', 'mode', 'option', 'options', 'feature', 'features',
  'tool', 'tools', 'prompt', 'chat', 'voice', 'audio', 'video', 'image', 'images',
  'list', 'array', 'string', 'number', 'boolean', 'null', 'undefined', 'true', 'false',
  'loop', 'break', 'continue', 'return', 'function', 'class', 'object', 'method',
  // === CODE/PROGRAMMING (FIX 2025-12-17) ===
  // React/JSX
  'jsx', 'tsx', 'react', 'component', 'components', 'props', 'state', 'hook', 'hooks',
  'button', 'div', 'span', 'form', 'label', 'select', 'textarea', 'checkbox',
  'className', 'style', 'ref', 'key', 'children', 'render', 'export', 'import', 'default',
  // HTML/CSS
  'html', 'css', 'scss', 'sass', 'padding', 'margin', 'border', 'radius', 'color',
  'background', 'display', 'flex', 'grid', 'width', 'height', 'font', 'size', 'weight',
  'cursor', 'pointer', 'hover', 'active', 'focus', 'disabled', 'none', 'block', 'inline',
  // Paths/Files
  'src', 'dist', 'build', 'node', 'modules', 'package', 'index', 'app', 'main', 'utils',
  'pages', 'layouts', 'assets', 'public', 'static', 'lib', 'api', 'routes', 'middleware',
  // JavaScript/TypeScript
  'const', 'let', 'var', 'async', 'await', 'promise', 'then', 'catch', 'finally',
  'map', 'filter', 'reduce', 'some', 'every', 'includes',
  'push', 'pop', 'shift', 'slice', 'splice', 'concat', 'join', 'split',
  'console', 'log', 'warn', 'require', 'module', 'exports', 'type', 'interface',
  'regex', 'regexp', 'pattern', 'match', 'test', 'exec',
  // Git
  'git', 'commit', 'push', 'pull', 'merge', 'branch', 'checkout', 'clone', 'fetch', 'rebase',
  // Technical terms (FIX 2025-12-17)
  'vram', 'gpu', 'cpu', 'ram', 'ssd', 'hdd', 'cmd', 'powershell', 'bash', 'terminal',
  'comfyui', 'ollama', 'langchain', 'chromadb', 'pytorch', 'tensorflow', 'cuda', 'nvidia',
  'system32', 'windows', 'linux', 'macos', 'localhost', 'webhook', 'api', 'sdk',
  'overnight', 'workflow', 'pipeline', 'docker', 'kubernetes', 'nginx', 'apache'
];

/**
 * Correct spelling in a text
 * @param {string} text - Text to correct
 * @returns {string} Corrected text
 */
function correctText(text) {
  if (!text) return text;

  // === PROTECTION DES BLOCS DE CODE (FIX 2025-12-17) ===
  // Tout ce qui est entre backticks ne doit PAS être corrigé
  const codeBlockPlaceholders = [];
  // Blocs de code multi-lignes ```...```
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = '__CODEBLOCK_' + codeBlockPlaceholders.length + '__';
    codeBlockPlaceholders.push(match);
    return placeholder;
  });
  // Code inline `...`
  text = text.replace(/`[^`]+`/g, (match) => {
    const placeholder = '__CODEBLOCK_' + codeBlockPlaceholders.length + '__';
    codeBlockPlaceholders.push(match);
    return placeholder;
  });

  // === PROTECTION DES IDENTIFIANTS CAMELCASE/PASCALCASE (FIX 2025-12-17) ===
  // Les mots comme onClick, useState, MyComponent ne doivent PAS être corrigés
  const camelCasePlaceholders = [];
  text = text.replace(/\b[a-z]+[A-Z][a-zA-Z]*\b|\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b/g, (match) => {
    const placeholder = '__CAMEL_' + camelCasePlaceholders.length + '__';
    camelCasePlaceholders.push(match);
    return placeholder;
  });

  // === PROTECTION DES MOTS ANGLAIS (FIX 2025-12-16) ===
  const englishPlaceholders = [];
  const englishPattern = new RegExp('\\b(' + ENGLISH_WORDS_TO_PRESERVE.join('|') + ')\\b', 'gi');
  text = text.replace(englishPattern, (match) => {
    const placeholder = '__ENG_' + englishPlaceholders.length + '__';
    englishPlaceholders.push(match);
    return placeholder;
  });

  // === PROTECTION DES CHEMINS DE FICHIERS (FIX 2025-12-16) ===
  // Les chemins comme C:/Users/niwno/Desktop ne doivent PAS etre corriges
  const pathPlaceholders = [];
  const pathPattern = /([A-Za-z]:[\x2F\x5C][^\s\"'<>|*?]+)/g;
  text = text.replace(pathPattern, (match) => {
    const placeholder = '__PATH_' + pathPlaceholders.length + '__';
    pathPlaceholders.push(match);
    return placeholder;
  });

  // === PROTECTION DES EXTENSIONS DE FICHIERS (FIX 2025-12-16) ===
  // Les extensions comme .txt, .cjs, .json ne doivent PAS etre corrigees
  const extPlaceholders = [];
  const extPattern = /\.(txt|cjs|js|json|md|html|css|py|sh|bat|xml|yaml|yml|csv|log|ini|cfg|conf|exe|dll|zip|tar|gz|jpg|jpeg|png|gif|svg|pdf|doc|docx|xls|xlsx)\b/gi;
  text = text.replace(extPattern, (match) => {
    const placeholder = '__EXT_' + extPlaceholders.length + '__';
    extPlaceholders.push(match);
    return placeholder;
  });

  // === CORRECTIONS CONTEXTUELLES (erreurs LLM connues) ===
  text = text.replace(/puisage/gi, 'puis-je');
  text = text.replace(/qu'estoque/gi, "qu'est-ce que");
  text = text.replace(/ajoure['']?fui/gi, "aujourd'hui");
  text = text.replace(/\bAnna\b/g, 'Ana');

  // Si pas de dictionnaire, restaurer TOUS les placeholders et retourner
  // FIX 2025-12-18: Bug - retournait sans restaurer EXT, ENG, CAMEL, CODEBLOCK
  if (!spellChecker) {
    pathPlaceholders.forEach((path, i) => {
      text = text.replace('__PATH_' + i + '__', path);
    });
    englishPlaceholders.forEach((word, i) => {
      text = text.replace('__ENG_' + i + '__', word);
    });
    extPlaceholders.forEach((ext, i) => {
      text = text.replace('__EXT_' + i + '__', ext);
    });
    camelCasePlaceholders.forEach((word, i) => {
      text = text.replace('__CAMEL_' + i + '__', word);
    });
    codeBlockPlaceholders.forEach((block, i) => {
      text = text.replace('__CODEBLOCK_' + i + '__', block);
    });
    return text;
  }

  // Split text into words while preserving punctuation and whitespace
  const wordPattern = /([a-zA-ZÀ-ÿ'-]+)|([^a-zA-ZÀ-ÿ'-]+)/g;
  const tokens = text.match(wordPattern) || [];

  const correctedTokens = tokens.map(token => {
    if (!/^[a-zA-ZÀ-ÿ'-]+$/.test(token)) {
      return token;
    }
    if (token.length <= 2) {
      return token;
    }
    if (/^[A-ZÀ-Ý]/.test(token) && token.length > 1) {
      return token;
    }
    if (spellChecker.correct(token)) {
      return token;
    }
    const suggestions = spellChecker.suggest(token);
    if (suggestions.length > 0) {
      const suggestion = suggestions[0];
      if (isSimilarEnough(token, suggestion)) {
        return suggestion;
      }
    }
    return token;
  });

  // Restaurer les chemins de fichiers
  let result = correctedTokens.join('');
  pathPlaceholders.forEach((path, i) => {
    result = result.replace('__PATH_' + i + '__', path);
  });
  
  // Restaurer les mots anglais
  englishPlaceholders.forEach((word, i) => {
    result = result.replace('__ENG_' + i + '__', word);
  });

  // Restaurer les extensions de fichiers
  extPlaceholders.forEach((ext, i) => {
    result = result.replace('__EXT_' + i + '__', ext);
  });

  // Restaurer les identifiants camelCase/PascalCase
  camelCasePlaceholders.forEach((word, i) => {
    result = result.replace('__CAMEL_' + i + '__', word);
  });

  // Restaurer les blocs de code
  codeBlockPlaceholders.forEach((block, i) => {
    result = result.replace('__CODEBLOCK_' + i + '__', block);
  });

  return result;
}

function isSimilarEnough(original, suggestion) {
  const distance = levenshteinDistance(original.toLowerCase(), suggestion.toLowerCase());
  const maxLength = Math.max(original.length, suggestion.length);
  const similarity = 1 - (distance / maxLength);
  return similarity >= 0.6;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function getStatus() {
  return {
    initialized: isInitialized,
    language: 'fr',
    ready: spellChecker !== null
  };
}

module.exports = {
  initialize,
  isCorrect,
  suggest,
  correctText,
  getStatus
};
