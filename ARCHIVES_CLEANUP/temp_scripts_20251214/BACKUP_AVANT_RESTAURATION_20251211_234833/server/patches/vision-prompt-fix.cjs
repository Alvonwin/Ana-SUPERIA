/**
 * PATCH: Vision Prompt Anti-Hallucination
 * Date: 2025-12-05
 *
 * À appliquer dans ana-core.cjs autour de la ligne 4527-4552
 *
 * PROBLÈME: Le modèle vision (llama3.2-vision) hallucine du contenu
 * car le prompt ne lui donne pas de règles strictes.
 *
 * SOLUTION: Ajouter un prompt spécialisé pour la vision avec règles factuelles.
 */

// ==========================================
// AVANT (lignes ~4527-4552):
// ==========================================
/*
      const systemInstruction = "Tu es Ana, une IA locale française...";
      const fullPrompt = memoryContext ? ... : ...;

      if (isVisionModel) {
        response = await axios.post(`${OLLAMA_URL}/api/chat`, {
          model: model,
          messages: [
            {
              role: 'user',
              content: fullPrompt,  // <-- PROBLÈME: même prompt que texte
              images: images
            }
          ],
          ...
*/

// ==========================================
// APRÈS (remplacer par):
// ==========================================

const VISION_PROMPT_TEMPLATE = `Décris UNIQUEMENT ce que tu VOIS dans cette image.

RÈGLES STRICTES:
- Décris SEULEMENT les éléments visibles (objets, texte, couleurs, formes)
- Si tu vois du texte, retranscris-le EXACTEMENT
- NE JAMAIS inventer de contenu non visible
- NE JAMAIS supposer le contexte extérieur à l'image
- Si quelque chose n'est pas clair, dis "je ne distingue pas bien..."
- Réponds en français

Question d'Alain: `;

// Dans le code, ajouter après fullPrompt:
// const visionPrompt = VISION_PROMPT_TEMPLATE + message;

// Et modifier le bloc isVisionModel pour utiliser visionPrompt:
/*
      if (isVisionModel) {
        const visionPrompt = VISION_PROMPT_TEMPLATE + message;
        response = await axios.post(`${OLLAMA_URL}/api/chat`, {
          model: model,
          messages: [
            {
              role: 'user',
              content: visionPrompt,  // <-- CORRIGÉ: prompt vision spécialisé
              images: images
            }
          ],
          stream: true
        }, {
          responseType: 'stream'
        });
      }
*/

// ==========================================
// INSTRUCTIONS MANUELLES:
// ==========================================
// 1. Ouvrir E:\ANA\server\ana-core.cjs
// 2. Chercher "if (isVisionModel)" (vers ligne 4537)
// 3. AVANT cette ligne, ajouter:
//
//    const visionPrompt = `Décris UNIQUEMENT ce que tu VOIS dans cette image.
//
//    RÈGLES STRICTES:
//    - Décris SEULEMENT les éléments visibles (objets, texte, couleurs, formes)
//    - Si tu vois du texte, retranscris-le EXACTEMENT
//    - NE JAMAIS inventer de contenu non visible
//    - NE JAMAIS supposer le contexte extérieur à l'image
//    - Si quelque chose n'est pas clair, dis "je ne distingue pas bien..."
//    - Réponds en français
//
//    Question d'Alain: ${message}`;
//
// 4. Dans le bloc if (isVisionModel), changer:
//    content: fullPrompt  -->  content: visionPrompt

module.exports = { VISION_PROMPT_TEMPLATE };
