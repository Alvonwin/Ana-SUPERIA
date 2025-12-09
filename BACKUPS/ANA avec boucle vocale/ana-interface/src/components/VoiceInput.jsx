import { useState, useRef } from 'react';
import './VoiceInput.css';

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
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setStatus('🎤 Écoute en cours...');
        console.log('🎤 Enregistrement démarré');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
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
