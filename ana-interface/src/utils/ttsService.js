/**
 * TTS Service - Synthèse vocale avec edge-tts (voix québécoise Sylvie)
 * Remplace la synthèse vocale du navigateur par notre API backend
 *
 * Créé: 16 Décembre 2025
 */

import { BACKEND_URL } from '../config';

// Audio element réutilisable
let currentAudio = null;

/**
 * Synthétise du texte en audio avec la voix de Sylvie
 * @param {string} text - Le texte à synthétiser
 * @param {Object} options - Options
 * @param {Function} options.onStart - Callback au démarrage
 * @param {Function} options.onEnd - Callback à la fin
 * @param {Function} options.onError - Callback en cas d'erreur
 * @returns {Promise<HTMLAudioElement>}
 */
export async function speak(text, options = {}) {
  const { onStart, onEnd, onError } = options;

  // Arrêter toute lecture en cours
  stop();

  if (!text || text.trim().length === 0) {
    return null;
  }

  try {
    // Appeler l'API backend
    const response = await fetch(`${BACKEND_URL}/api/tts/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: text.trim() })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    // Créer un blob audio à partir de la réponse
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Créer l'élément audio
    currentAudio = new Audio(audioUrl);

    // Event handlers
    currentAudio.onplay = () => {
      console.log('🔊 Sylvie parle...');
      if (onStart) onStart();
    };

    currentAudio.onended = () => {
      console.log('✅ Sylvie a fini de parler');
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      if (onEnd) onEnd();
    };

    currentAudio.onerror = (event) => {
      console.error('❌ Erreur audio:', event);
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      if (onError) onError(event);
    };

    // Démarrer la lecture
    await currentAudio.play();

    return currentAudio;

  } catch (error) {
    console.error('❌ Erreur TTS:', error);
    if (onError) onError(error);

    // Fallback vers speechSynthesis si l'API échoue
    console.log('⚠️ Fallback vers synthèse navigateur');
    return fallbackSpeak(text, options);
  }
}

/**
 * Fallback vers la synthèse vocale du navigateur
 */
function fallbackSpeak(text, options = {}) {
  const { onStart, onEnd, onError } = options;

  if (!window.speechSynthesis) {
    if (onError) onError(new Error('Synthèse vocale non supportée'));
    return null;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-CA';
  utterance.rate = 1.0;

  // Chercher une voix française canadienne
  const voices = window.speechSynthesis.getVoices();
  const frenchVoice = voices.find(v => v.lang.startsWith('fr-CA')) ||
                      voices.find(v => v.lang.startsWith('fr'));
  if (frenchVoice) {
    utterance.voice = frenchVoice;
  }

  utterance.onstart = () => {
    if (onStart) onStart();
  };

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = (event) => {
    if (onError) onError(event);
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Arrête la lecture en cours
 */
export function stop() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  // Aussi arrêter le fallback si actif
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Vérifie si une lecture est en cours
 */
export function isSpeaking() {
  return currentAudio !== null && !currentAudio.paused;
}

/**
 * Change la voix (pour l'API backend)
 * @param {string} voiceName - Nom de la voix (ex: fr-CA-SylvieNeural)
 */
export async function setVoice(voiceName) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/tts/voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ voice: voiceName })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('🎤 Voix changée:', voiceName);
    return true;
  } catch (error) {
    console.error('❌ Erreur changement voix:', error);
    return false;
  }
}

/**
 * Liste les voix disponibles
 */
export async function getVoices() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/tts/voices`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('❌ Erreur liste voix:', error);
    return [];
  }
}

export default {
  speak,
  stop,
  isSpeaking,
  setVoice,
  getVoices
};
