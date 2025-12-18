import { useState, useRef } from 'react';
import './VoiceInput.css';
import { BACKEND_URL } from '../config.js';

// Correction orthographique via backend (Anna -> Ana, etc.)
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
        console.log('Correction:', text, '->', data.corrected);
      }
      return data.corrected;
    }
  } catch (e) {
    console.warn('Spell check failed:', e.message);
  }
  return text;
}

function VoiceInput({ onTranscript, onAutoSubmit, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Prêt');
  const recognitionRef = useRef(null);

  const startRecording = () => {
    if (disabled) {
      setStatus('Entrée vocale désactivée');
      return;
    }

    // Vérifier support navigateur
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus('❌ Speech Recognition non supporté');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-CA' // Canadian French - plus tolerant aux mots anglais;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setStatus('🎤 Écoute en cours...');
        console.log('🎤 Enregistrement démarré');
      };

      recognition.onresult = async (event) => {
        const rawTranscript = event.results[0][0].transcript;
        const transcript = await correctSpelling(rawTranscript);
        console.log('📝 Transcription:', transcript);

        if (onTranscript) {
          onTranscript(transcript);
        }

        setStatus('✅ Transcription complète');

        // Auto-submit après transcription avec le transcript en paramètre direct
        if (onAutoSubmit) {
          console.log('🚀 Auto-submit déclenché avec:', transcript);
          setTimeout(() => {
            onAutoSubmit(transcript);
          }, 200);
        }
      };

      recognition.onerror = (event) => {
        console.error('❌ Erreur reconnaissance vocale:', event.error);
        setStatus(`❌ Erreur: ${event.error}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setStatus('Prêt');
        console.log('⏹️ Enregistrement terminé');
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (error) {
      console.error('❌ Erreur démarrage:', error);
      setStatus('❌ Erreur démarrage');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="voice-input">
      <button
        className={`voice-btn ${isRecording ? 'recording' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleClick}
        disabled={disabled}
        title={status}
      >
        {isRecording ? (
          <span style={{ fontSize: '20px' }}>⏹️</span>
        ) : (
          <span style={{ fontSize: '20px' }}>🎤</span>
        )}
      </button>
      {isRecording && (
        <div className="voice-status">
          <span className="pulse-dot"></span>
          {status}
        </div>
      )}
    </div>
  );
}

export default VoiceInput;
