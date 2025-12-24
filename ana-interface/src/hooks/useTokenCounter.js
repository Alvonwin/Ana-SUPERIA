/**
 * useTokenCounter - Hook pour compter les tokens en temps réel
 * Utilise le tokenizer Llama 3 via @huggingface/transformers
 *
 * Créé: 24 Décembre 2025
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Limite de contexte pour Llama 3.3 70B (Cerebras)
const CONTEXT_LIMIT = 128000;

// Cache pour éviter de recompter le même texte
const tokenCache = new Map();
const CACHE_MAX_SIZE = 100;

/**
 * Estimation rapide des tokens (fallback si tokenizer pas chargé)
 * ~4 caractères par token en anglais, ~3.5 en français
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Français utilise plus de tokens que l'anglais
  return Math.ceil(text.length / 3.5);
}

/**
 * Hook pour compter les tokens
 * @param {string} inputText - Texte du champ de saisie
 * @param {Array} messages - Historique des messages
 * @param {string} systemPrompt - Prompt système
 * @returns {Object} { inputTokens, contextTokens, totalTokens, limit, percentage, isLoading, isEstimate }
 */
export function useTokenCounter(inputText = '', messages = [], systemPrompt = '') {
  const [inputTokens, setInputTokens] = useState(0);
  const [contextTokens, setContextTokens] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEstimate, setIsEstimate] = useState(true);
  const tokenizerRef = useRef(null);
  const loadingRef = useRef(false);

  // Charger le tokenizer une seule fois
  useEffect(() => {
    const loadTokenizer = async () => {
      if (loadingRef.current || tokenizerRef.current) return;
      loadingRef.current = true;

      try {
        // Import dynamique pour éviter de bloquer le chargement initial
        const { AutoTokenizer } = await import('@huggingface/transformers');

        console.log('🔄 Chargement du tokenizer Llama 3...');

        // Utiliser le tokenizer Llama 3
        const tokenizer = await AutoTokenizer.from_pretrained(
          'Xenova/llama-3-tokenizer',
          { progress_callback: null }
        );

        tokenizerRef.current = tokenizer;
        setIsEstimate(false);
        console.log('✅ Tokenizer Llama 3 chargé');
      } catch (error) {
        console.warn('⚠️ Tokenizer non disponible, utilisation estimation:', error.message);
        // On continue avec l'estimation
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    };

    loadTokenizer();
  }, []);

  // Fonction pour compter les tokens d'un texte
  const countTokens = useCallback((text) => {
    if (!text) return 0;

    // Vérifier le cache
    const cacheKey = text.substring(0, 200); // Limiter la clé
    if (tokenCache.has(cacheKey)) {
      return tokenCache.get(cacheKey);
    }

    let count;
    if (tokenizerRef.current) {
      try {
        const tokens = tokenizerRef.current.encode(text);
        count = tokens.length;
      } catch (e) {
        count = estimateTokens(text);
      }
    } else {
      count = estimateTokens(text);
    }

    // Mettre en cache (avec limite de taille)
    if (tokenCache.size >= CACHE_MAX_SIZE) {
      const firstKey = tokenCache.keys().next().value;
      tokenCache.delete(firstKey);
    }
    tokenCache.set(cacheKey, count);

    return count;
  }, []);

  // Compter les tokens du champ de saisie (avec debounce implicite via deps)
  useEffect(() => {
    const count = countTokens(inputText);
    setInputTokens(count);
  }, [inputText, countTokens]);

  // Compter les tokens du contexte (messages + system prompt)
  useEffect(() => {
    let total = 0;

    // System prompt
    if (systemPrompt) {
      total += countTokens(systemPrompt);
    }

    // Messages
    for (const msg of messages) {
      if (msg.text) {
        total += countTokens(msg.text);
        // Overhead pour le formatage du message (~4 tokens par message)
        total += 4;
      }
    }

    setContextTokens(total);
  }, [messages, systemPrompt, countTokens]);

  const totalTokens = contextTokens + inputTokens;
  const percentage = Math.min(100, (totalTokens / CONTEXT_LIMIT) * 100);

  return {
    inputTokens,
    contextTokens,
    totalTokens,
    limit: CONTEXT_LIMIT,
    percentage,
    isLoading,
    isEstimate,
    // Formatage pour affichage
    display: {
      input: inputTokens.toLocaleString('fr-FR'),
      context: contextTokens.toLocaleString('fr-FR'),
      total: totalTokens.toLocaleString('fr-FR'),
      limit: (CONTEXT_LIMIT / 1000).toFixed(0) + 'K',
      percentage: percentage.toFixed(1)
    }
  };
}

export default useTokenCounter;
