/**
 * VoicePage.jsx - Interface Vocale Bidirectionnelle Ana SUPERIA
 *
 * Features:
 * - Speech-to-Text via Web Speech API (gratuit, local)
 * - Text-to-Speech via Web Speech API
 * - Mode conversation vocale continue
 * - Historique des transcriptions
 * - Support Piper TTS (futur)
 * - Support Whisper STT (futur)
 *
 * Best Practices 2025:
 * - Web Speech API pour compatibilité maximale
 * - Fallback gracieux si non supporté
 * - Mode hors-ligne partiel
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  IconMic,
  IconMicOff,
  IconVolume2,
  IconVolumeX,
  IconPlay,
  IconPause,
  IconSettings,
  IconTrash2,
  IconSend,
  IconLoader2,
  IconBrain,
  IconRadio
} from '../components/Icons';

const VoicePage = () => {
  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [sttSupported, setSttSupported] = useState(true);

  // Text-to-Speech State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);

  // Conversation State
  const [conversationMode, setConversationMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentModel, setCurrentModel] = useState('deepseek-r1:8b');

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [autoListen, setAutoListen] = useState(true);
  const [language, setLanguage] = useState('fr-FR');

  // Refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const messagesEndRef = useRef(null);

  // Available models
  const models = [
    { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B' },
    { id: 'phi3:mini-128k', name: 'Phi-3 Mini 128K' },
    { id: 'llama3.2-vision:11b', name: 'Llama Vision 11B' }
  ];

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSttSupported(false);
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart in conversation mode
      if (conversationMode && autoListen && !isProcessing) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log('Could not restart recognition');
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [language, conversationMode, autoListen, isProcessing]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = synthRef.current.getVoices();
      setVoices(availableVoices);

      // Select French voice by default
      const frenchVoice = availableVoices.find(v => v.lang.startsWith('fr'));
      if (frenchVoice) {
        setSelectedVoice(frenchVoice);
      } else if (availableVoices.length > 0) {
        setSelectedVoice(availableVoices[0]);
      }
    };

    loadVoices();
    synthRef.current.onvoiceschanged = loadVoices;
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start/Stop listening
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setInterimTranscript('');
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
    }
  }, [isListening, language]);

  // Text-to-Speech
  const speak = useCallback((text) => {
    if (!ttsEnabled || !text) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.lang = language;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Resume listening after speaking in conversation mode
      if (conversationMode && autoListen) {
        setTimeout(() => toggleListening(), 300);
      }
    };
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, [ttsEnabled, selectedVoice, speechRate, speechPitch, language, conversationMode, autoListen, toggleListening]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  // Send message to Ana
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setTranscript('');
    setInterimTranscript('');
    setIsProcessing(true);

    try {
      const response = await fetch('http://localhost:3338/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          model: currentModel,
          context: messages.slice(-10) // Last 10 messages for context
        })
      });

      const data = await response.json();

      const anaMessage = {
        role: 'assistant',
        content: data.response || data.message || 'Je suis Ana, votre assistante IA.',
        timestamp: new Date(),
        model: currentModel
      };

      setMessages(prev => [...prev, anaMessage]);

      // Speak the response
      if (ttsEnabled) {
        speak(anaMessage.content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Erreur de connexion au serveur Ana.',
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [currentModel, messages, speak, ttsEnabled]);

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(transcript);
    }
  };

  // Toggle conversation mode
  const toggleConversationMode = useCallback(() => {
    setConversationMode(prev => {
      if (!prev) {
        // Starting conversation mode
        toggleListening();
      } else {
        // Stopping conversation mode
        if (isListening) recognitionRef.current?.stop();
        stopSpeaking();
      }
      return !prev;
    });
  }, [isListening, toggleListening, stopSpeaking]);

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    setTranscript('');
    setInterimTranscript('');
  };

  return (
    <div className="voice-page">
      <div className="voice-header">
        <div className="header-title">
          <IconRadio size={28} className="voice-icon" />
          <h1>Mode Vocal Ana</h1>
          <span className="voice-status">
            {conversationMode ? 'Conversation active' : 'En attente'}
          </span>
        </div>

        <div className="header-actions">
          <select
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
            className="model-select"
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <button
            className={`btn-icon ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Parametres"
          >
            <IconSettings size={20} />
          </button>

          <button
            className="btn-icon"
            onClick={clearConversation}
            title="Effacer conversation"
          >
            <IconTrash2 size={20} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <h3>Parametres Vocaux</h3>

          <div className="settings-grid">
            <div className="setting-item">
              <label>Langue</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="fr-FR">Francais</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Espanol</option>
                <option value="de-DE">Deutsch</option>
              </select>
            </div>

            <div className="setting-item">
              <label>Voix TTS</label>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => setSelectedVoice(voices.find(v => v.name === e.target.value))}
              >
                {voices.map(v => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div className="setting-item">
              <label>Vitesse: {speechRate.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              />
            </div>

            <div className="setting-item">
              <label>Tonalite: {speechPitch.toFixed(1)}</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
              />
            </div>

            <div className="setting-item checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={ttsEnabled}
                  onChange={(e) => setTtsEnabled(e.target.checked)}
                />
                Activer synthese vocale
              </label>
            </div>

            <div className="setting-item checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={autoListen}
                  onChange={(e) => setAutoListen(e.target.checked)}
                />
                Ecoute automatique apres reponse
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Browser Support Warning */}
      {!sttSupported && (
        <div className="warning-banner">
          <IconMicOff size={20} />
          <span>La reconnaissance vocale n'est pas supportee par ce navigateur. Utilisez Chrome ou Edge.</span>
        </div>
      )}

      {/* Conversation Area */}
      <div className="conversation-container">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <IconBrain size={64} className="empty-icon" />
              <h2>Mode Vocal Ana</h2>
              <p>Parlez a Ana en utilisant votre voix.</p>
              <p>Cliquez sur le microphone ou activez le mode conversation.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role} ${msg.error ? 'error' : ''}`}>
                <div className="message-header">
                  <span className="message-role">
                    {msg.role === 'user' ? 'Vous' : 'Ana'}
                  </span>
                  {msg.model && <span className="message-model">{msg.model}</span>}
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">{msg.content}</div>
                {msg.role === 'assistant' && ttsEnabled && (
                  <button
                    className="btn-speak"
                    onClick={() => speak(msg.content)}
                    title="Ecouter"
                  >
                    <IconVolume2 size={16} />
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Transcript Area */}
        <div className="transcript-area">
          <div className="transcript-display">
            {transcript && <span className="final">{transcript}</span>}
            {interimTranscript && <span className="interim">{interimTranscript}</span>}
            {!transcript && !interimTranscript && (
              <span className="placeholder">
                {isListening ? 'Parlez maintenant...' : 'Cliquez sur le micro pour parler'}
              </span>
            )}
          </div>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ou tapez votre message..."
            className="transcript-input"
          />
        </div>
      </div>

      {/* Control Bar */}
      <div className="voice-controls">
        <button
          className={`btn-conversation ${conversationMode ? 'active' : ''}`}
          onClick={toggleConversationMode}
          disabled={!sttSupported}
        >
          {conversationMode ? (
            <>
              <IconPause size={20} />
              Arreter conversation
            </>
          ) : (
            <>
              <IconPlay size={20} />
              Mode conversation
            </>
          )}
        </button>

        <button
          className={`btn-mic ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
          disabled={!sttSupported}
        >
          {isListening ? (
            <IconMicOff size={32} />
          ) : (
            <IconMic size={32} />
          )}
          <span className="mic-pulse" />
        </button>

        <button
          className={`btn-tts ${isSpeaking ? 'speaking' : ''}`}
          onClick={isSpeaking ? stopSpeaking : () => speak(transcript)}
          disabled={!transcript && !isSpeaking}
        >
          {isSpeaking ? (
            <>
              <IconVolumeX size={20} />
              Stop
            </>
          ) : (
            <>
              <IconVolume2 size={20} />
              Lire
            </>
          )}
        </button>

        <button
          className="btn-send"
          onClick={() => sendMessage(transcript)}
          disabled={!transcript.trim() || isProcessing}
        >
          {isProcessing ? (
            <>
              <IconLoader2 size={20} className="spin" />
              Envoi...
            </>
          ) : (
            <>
              <IconSend size={20} />
              Envoyer
            </>
          )}
        </button>
      </div>

      <style>{`
        .voice-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .voice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .header-title h1 {
          font-size: 1.5rem;
          margin: 0;
        }

        .voice-icon {
          color: var(--primary);
        }

        .voice-status {
          background: var(--primary);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .model-select {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          color: var(--text-primary);
          cursor: pointer;
        }

        .btn-icon {
          background: transparent;
          border: none;
          padding: 0.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .btn-icon.active {
          background: var(--primary);
          color: white;
        }

        .settings-panel {
          background: var(--bg-secondary);
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }

        .settings-panel h3 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .setting-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .setting-item label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .setting-item.checkbox label {
          flex-direction: row;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .setting-item select,
        .setting-item input[type="range"] {
          width: 100%;
          padding: 0.5rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 0.375rem;
          color: var(--text-primary);
        }

        .warning-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #fef3cd;
          color: #856404;
          border-bottom: 1px solid #ffc107;
        }

        .conversation-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--text-secondary);
        }

        .empty-icon {
          opacity: 0.3;
          margin-bottom: 1rem;
        }

        .empty-state h2 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
        }

        .message {
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 0.75rem;
          position: relative;
        }

        .message.user {
          background: var(--bg-tertiary);
          margin-left: 2rem;
        }

        .message.assistant {
          background: var(--primary-light, rgba(59, 130, 246, 0.1));
          margin-right: 2rem;
          border: 1px solid var(--primary);
        }

        .message.error {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        .message-header {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
        }

        .message-role {
          font-weight: 600;
          color: var(--text-primary);
        }

        .message-model {
          color: var(--primary);
          background: var(--bg-secondary);
          padding: 0.125rem 0.5rem;
          border-radius: 0.25rem;
        }

        .message-time {
          color: var(--text-tertiary);
          margin-left: auto;
        }

        .message-content {
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .btn-speak {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          background: transparent;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          color: var(--text-tertiary);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .message:hover .btn-speak {
          opacity: 1;
        }

        .btn-speak:hover {
          color: var(--primary);
        }

        .transcript-area {
          padding: 1rem 1.5rem;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border);
        }

        .transcript-display {
          min-height: 2rem;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          background: var(--bg-primary);
          border-radius: 0.5rem;
          font-size: 1rem;
        }

        .transcript-display .final {
          color: var(--text-primary);
        }

        .transcript-display .interim {
          color: var(--text-tertiary);
          font-style: italic;
        }

        .transcript-display .placeholder {
          color: var(--text-tertiary);
        }

        .transcript-input {
          width: 100%;
          padding: 0.75rem;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          color: var(--text-primary);
          resize: none;
          min-height: 60px;
          font-family: inherit;
          font-size: 1rem;
        }

        .transcript-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .voice-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border);
        }

        .btn-mic {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--primary);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }

        .btn-mic:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
        }

        .btn-mic.listening {
          background: #ef4444;
          animation: pulse 1.5s infinite;
        }

        .btn-mic:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mic-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid var(--primary);
          animation: none;
        }

        .btn-mic.listening .mic-pulse {
          animation: ripple 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .btn-conversation,
        .btn-tts,
        .btn-send {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-conversation {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .btn-conversation.active {
          background: #10b981;
          color: white;
          border-color: #10b981;
        }

        .btn-tts {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .btn-tts.speaking {
          background: #f59e0b;
          color: white;
          border-color: #f59e0b;
        }

        .btn-send {
          background: var(--primary);
          color: white;
        }

        .btn-send:hover {
          background: var(--primary-dark, #2563eb);
        }

        .btn-send:disabled,
        .btn-tts:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .voice-header {
            flex-direction: column;
            gap: 1rem;
          }

          .settings-grid {
            grid-template-columns: 1fr;
          }

          .voice-controls {
            flex-wrap: wrap;
          }

          .btn-mic {
            width: 64px;
            height: 64px;
          }
        }
      `}</style>
    </div>
  );
};

export default VoicePage;
