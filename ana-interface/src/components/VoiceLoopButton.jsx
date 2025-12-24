/**
 * VoiceLoopButton - Composant isolé pour le mode vocal continu
 *
 * Ce composant est séparé pour:
 * 1. Isoler les erreurs potentielles de Web Speech API
 * 2. Éviter de crasher toute la page ChatPage
 * 3. Meilleure maintenance et testabilité
 *
 * Source: https://github.com/JamesBrill/react-speech-recognition
 */

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { IconMic, IconMicOff } from './Icons';
import { BACKEND_URL } from '../config.js';
import { isSpeaking } from '../utils/ttsService';

// Correction orthographique via backend (Anna -> Ana, majuscule, point)
async function correctSpelling(text) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/spellcheck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    if (data.success && data.corrected) {
      if (data.changed) {
        console.log('Correction ortho:', text, '->', data.corrected);
      }
      return data.corrected;
    }
  } catch (e) {
    console.warn('Spell check failed:', e.message);
  }
  return text;
}

// Vérification initiale du support
const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

// Détection mobile pour ajustements spécifiques
const isMobile = typeof window !== 'undefined' &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const VoiceLoopButton = forwardRef(function VoiceLoopButton({
  onTranscript,
  onListeningChange,
  disabled = false,
  soundSystem = null
}, ref) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const isEnabledRef = useRef(false);
  const isPausedRef = useRef(false);
  const lastTranscriptRef = useRef('');  // Mobile: anti-doublon
  const lastTranscriptTimeRef = useRef(0);  // Mobile: debounce

  // Sync ref with state
  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  // Expose pause/resume au parent pour coordination TTS
  useImperativeHandle(ref, () => ({
    pause: () => {
      console.log('⏸️ VoiceLoop: pause demandé par parent');
      isPausedRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('⚠️ Pause error:', e.message);
        }
      }
    },
    resume: () => {
      console.log('▶️ VoiceLoop: resume demandé par parent');
      isPausedRef.current = false;
      if (isEnabledRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('⚠️ Resume error:', e.message);
        }
      }
    }
  }));

  // Notify parent of listening state changes
  useEffect(() => {
    if (onListeningChange) {
      onListeningChange(isListening);
    }
  }, [isListening, onListeningChange]);

  // Initialize SpeechRecognition
  const initRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('Speech Recognition non supporté');
      return null;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'fr-CA' // Canadian French - plus tolerant aux mots anglais;
      recognition.continuous = true;
      // Mobile: désactiver interimResults pour éviter les doublons
      recognition.interimResults = !isMobile;

      recognition.onstart = () => {
        console.log('🎤 Écoute démarrée');
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        console.log('🎤 Écoute terminée');

        // FIX 2025-12-21: Ne pas mettre isListening à false si on va redémarrer
        // Cela évite le "flash" du bouton pendant le cycle de redémarrage
        if (isEnabledRef.current && !isPausedRef.current) {
          // Redémarrer automatiquement - garder l'indicateur actif
          const restartDelay = isMobile ? 1500 : 300;
          console.log(`🔄 Redémarrage automatique dans ${restartDelay}ms...`);
          setTimeout(() => {
            if (isEnabledRef.current && recognitionRef.current && !isPausedRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.warn('⚠️ Impossible de redémarrer:', e.message);
                setIsListening(false);  // Seulement si échec
              }
            } else {
              setIsListening(false);  // Mode désactivé entre-temps
            }
          }, restartDelay);
        } else {
          // Mode désactivé ou TTS en cours - vraiment arrêter
          setIsListening(false);
          if (isPausedRef.current) {
            console.log('⏸️ Pas de redémarrage - TTS en cours');
          }
        }
      };

      recognition.onresult = async (event) => {
        // Ignorer les transcriptions si Ana parle (TTS en cours)
        if (isSpeaking()) {
          console.log('🔇 Transcription ignorée - TTS en cours');
          return;
        }

        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        if (finalTranscript && onTranscript) {
          const trimmed = finalTranscript.trim();
          const now = Date.now();

          // Mobile: anti-doublon - ignorer si même texte dans les 2 dernières secondes
          if (isMobile) {
            const timeSinceLast = now - lastTranscriptTimeRef.current;
            if (trimmed === lastTranscriptRef.current && timeSinceLast < 2000) {
              console.log('🚫 Mobile: doublon ignoré:', trimmed);
              return;
            }
            lastTranscriptRef.current = trimmed;
            lastTranscriptTimeRef.current = now;
          }

          // Correction orthographique avant envoi
          const corrected = await correctSpelling(trimmed);
          console.log('🎤 Transcript final (corrigé):', corrected);
          onTranscript(corrected);
        }
      };

      recognition.onerror = (event) => {
        console.error('❌ Erreur Speech Recognition:', event.error);
        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }
        setError();
        setIsListening(false);
      };

      return recognition;
    } catch (e) {
      console.error('❌ Erreur création SpeechRecognition:', e);
      setError("Impossible d'initialiser la reconnaissance vocale");
      return null;
    }
  }, [onTranscript]);

  // Toggle voice mode
  const toggleVoiceMode = useCallback(() => {
    try {
      if (!isEnabled) {
        if (!recognitionRef.current) {
          recognitionRef.current = initRecognition();
        }
        if (recognitionRef.current) {
          setIsEnabled(true);
          isPausedRef.current = false;
          if (soundSystem) soundSystem.play('success');
          try {
            recognitionRef.current.start();
          } catch (e) {
            if (!e.message.includes('already started')) throw e;
          }
        }
      } else {
        setIsEnabled(false);
        if (soundSystem) soundSystem.play('llm-complete');
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
        setIsListening(false);
      }
    } catch (e) {
      console.error('❌ Erreur toggle voice mode:', e);
      setError(e.message);
      setIsEnabled(false);
      setIsListening(false);
    }
  }, [isEnabled, initRecognition, soundSystem]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  if (!SpeechRecognitionAPI) return null;

  return (
    <button
      className={`voice-loop-btn ${isEnabled ? "active" : ""}`}
      onClick={toggleVoiceMode}
      disabled={disabled}
      title={error || (isEnabled ? 'Désactiver le mode vocal' : 'Activer le mode vocal continu')}
    >
      {isEnabled ? <IconMic size={16} /> : <IconMicOff size={16} />}
      <span>Mode Vocal {isEnabled ? 'ON' : 'OFF'}</span>
      {isListening && <span className="listening-indicator">●</span>}
    </button>
  );
});

export default VoiceLoopButton;
