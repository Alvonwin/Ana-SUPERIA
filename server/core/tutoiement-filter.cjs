/**
 * Tutoiement Filter - Force le tutoiement dans les réponses
 * Post-processing automatique vous→tu
 *
 * @author Claude Code - 2025-12-08
 */

'use strict';

/**
 * Force le tutoiement dans un texte
 * Remplace vous/votre/vos par tu/ton/ta/tes
 * Préserve les blocs de code et citations
 *
 * @param {string} text - Texte brut du LLM
 * @returns {string} - Texte avec tutoiement forcé
 */
function forceTutoiement(text) {
  if (!text || typeof text !== 'string') return text;

  // Extraire et protéger les blocs de code
  const codeBlocks = [];
  let result = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Extraire et protéger les inline code
  const inlineCode = [];
  result = result.replace(/`[^`]+`/g, (match) => {
    inlineCode.push(match);
    return `__INLINE_CODE_${inlineCode.length - 1}__`;
  });

  // Remplacements principaux (avec bordures de mots)

  // Pronoms et déterminants
  result = result.replace(/\bVous\b/g, 'Tu');
  result = result.replace(/\bvous\b/g, 'tu');
  result = result.replace(/\bVotre\b/g, 'Ton');
  result = result.replace(/\bvotre\b/g, 'ton');
  result = result.replace(/\bVos\b/g, 'Tes');
  result = result.replace(/\bvos\b/g, 'tes');

  // Conjugaisons courantes (vous + verbe → tu + verbe)
  result = result.replace(/\btu pouvez\b/gi, 'tu peux');
  result = result.replace(/\btu devez\b/gi, 'tu dois');
  result = result.replace(/\btu avez\b/gi, 'tu as');
  result = result.replace(/\btu êtes\b/gi, 'tu es');
  result = result.replace(/\btu souhaitez\b/gi, 'tu souhaites');
  result = result.replace(/\btu voulez\b/gi, 'tu veux');
  result = result.replace(/\btu allez\b/gi, 'tu vas');
  result = result.replace(/\btu faites\b/gi, 'tu fais');
  result = result.replace(/\btu savez\b/gi, 'tu sais');
  result = result.replace(/\btu voyez\b/gi, 'tu vois');
  result = result.replace(/\btu pensez\b/gi, 'tu penses');
  result = result.replace(/\btu aimez\b/gi, 'tu aimes');
  result = result.replace(/\btu cherchez\b/gi, 'tu cherches');
  result = result.replace(/\btu trouvez\b/gi, 'tu trouves');
  result = result.replace(/\btu utilisez\b/gi, 'tu utilises');
  result = result.replace(/\btu préférez\b/gi, 'tu préfères');

  // Verbes au subjonctif/conditionnel
  result = result.replace(/\btu pourriez\b/gi, 'tu pourrais');
  result = result.replace(/\btu devriez\b/gi, 'tu devrais');
  result = result.replace(/\btu auriez\b/gi, 'tu aurais');
  result = result.replace(/\btu seriez\b/gi, 'tu serais');
  result = result.replace(/\btu voudriez\b/gi, 'tu voudrais');
  result = result.replace(/\btu feriez\b/gi, 'tu ferais');

  // Impératif
  result = result.replace(/\bVeuillez\b/g, 'Veuille');
  result = result.replace(/\bveuillez\b/g, 'veuille');

  // Expressions communes
  result = result.replace(/Comment puis-je tu aider/gi, 'Comment puis-je t\'aider');
  result = result.replace(/si tu avez/gi, 'si tu as');
  result = result.replace(/si tu êtes/gi, 'si tu es');
  result = result.replace(/si tu souhaitez/gi, 'si tu souhaites');
  result = result.replace(/n'hésitez pas/gi, 'n\'hésite pas');
  result = result.replace(/à ton disposition/gi, 'à ta disposition');

  // Corrections de double remplacement
  result = result.replace(/\btu tu\b/gi, 'tu');
  result = result.replace(/\bt'aider tu\b/gi, 't\'aider');

  // Restaurer les blocs de code
  codeBlocks.forEach((block, i) => {
    result = result.replace(`__CODE_BLOCK_${i}__`, block);
  });

  // Restaurer les inline code
  inlineCode.forEach((code, i) => {
    result = result.replace(`__INLINE_CODE_${i}__`, code);
  });

  return result;
}

/**
 * Vérifie si un texte contient du vouvoiement
 * @param {string} text
 * @returns {boolean}
 */
function containsVouvoiement(text) {
  if (!text) return false;
  const vouvoiementPatterns = /\b(vous|votre|vos|veuillez|pouvez|devez|avez|êtes|souhaitez)\b/i;
  return vouvoiementPatterns.test(text);
}

/**
 * Statistiques de conversion
 * @param {string} original
 * @param {string} converted
 * @returns {object}
 */
function getConversionStats(original, converted) {
  const originalVous = (original.match(/\b(vous|votre|vos)\b/gi) || []).length;
  const convertedVous = (converted.match(/\b(vous|votre|vos)\b/gi) || []).length;

  return {
    originalVouvoiement: originalVous,
    remainingVouvoiement: convertedVous,
    conversions: originalVous - convertedVous,
    success: convertedVous === 0
  };
}

module.exports = {
  forceTutoiement,
  containsVouvoiement,
  getConversionStats
};
