/**
 * ChatWidget - Composant de chat réutilisable
 * Utilisé par ChatPage et CodingPage
 *
 * Props:
 * - compact: boolean - Mode compact pour sidebar (default: false)
 * - showVoiceControls: boolean - Afficher contrôles vocaux (default: true)
 * - showUpload: boolean - Afficher upload fichiers (default: false)
 * - context: object - Contexte supplémentaire à envoyer (ex: {codeContext, language})
 * - onCodeBlock: function - Callback quand un bloc de code est détecté
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import {
  IconSend,
  IconRotateCcw,
  IconPlay,
  IconPause,
  IconCopy,
  IconCheck,
  IconLoader2
} from './Icons';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import soundSystem from '../utils/soundSystem';
import VoiceInput from './VoiceInput';
import './ChatWidget.css';

const BACKEND_URL = 'http://localhost:3338';

// Fonction utilitaire pour extraire le premier bloc de code (Perplexity - 2 Dec 2025)
function extractFirstCodeBlock(text) {
  if (!text) return null;
  // Cherche ```language\ncode```
  const regex = /```(\w+)?\n([\s\S]*?)```/m;
  const match = text.match(regex);
  if (!match) return null;

  const language = match[1] || 'plaintext';
  const code = match[2].trim();
  return { language, code };
}

// MessageContent component with markdown + syntax highlighting + copy button
function MessageContent({ text, sender, onCodeBlock, compact }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);

    // Notify parent about code block
    if (onCodeBlock) {
      onCodeBlock(code);
    }
  };

  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const code = String(children).replace(/\n$/, '');
    const codeBlockIndex = node?.position?.start?.line || 0;

    return !inline && language ? (
      <div className="code-block-wrapper">
        <button
          onClick={() => copyCode(code, codeBlockIndex)}
          className="btn-copy-code"
        >
          {copiedIndex === codeBlockIndex ? (
            <><IconCheck size={12} /> Copié</>
          ) : (
            <><IconCopy size={12} /> Copier</>
          )}
        </button>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: '6px',
            fontSize: compact ? '0.75em' : '0.85em',
            maxWidth: '100%'
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  if (sender === 'system') {
    return <span>{text}</span>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{ code: CodeBlock }}
    >
      {text}
    </ReactMarkdown>
  );
}

function ChatWidget({
  compact = false,
  showVoiceControls = true,
  showUpload = false,
  context = {},
  onCodeBlock = null,
  placeholder = "Message Ana..."
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [memoryStats, setMemoryStats] = useState({ sizeKB: 0 });
  const messagesEndRef = useRef(null);
  const onCodeBlockRef = useRef(onCodeBlock); // Ref pour accéder à onCodeBlock dans socket handlers

  // Garder la ref à jour quand onCodeBlock change
  useEffect(() => {
    onCodeBlockRef.current = onCodeBlock;
  }, [onCodeBlock]);

  // System message helper
  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'system',
      text,
      timestamp: new Date()
    }]);
  };

  // Socket connection
  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ ChatWidget WebSocket connecté');
    });

    newSocket.on('chat:model_selected', (data) => {
      addSystemMessage(`🧠 ${data.reason}`);
    });

    newSocket.on('chat:chunk', (data) => {
      if (typeof data === 'object' && data.chunk && typeof data.chunk === 'string') {
        setMessages(prev => {
          const lastAnaIndex = prev.slice().reverse().findIndex(msg => msg.sender === 'ana' && msg.streaming);
          if (lastAnaIndex !== -1) {
            const index = prev.length - 1 - lastAnaIndex;
            return prev.map((msg, i) =>
              i === index ? { ...msg, text: (msg.text || '') + data.chunk } : msg
            );
          }
          return prev;
        });
      }
    });

    newSocket.on('chat:complete', () => {
      setMessages(prev => {
        const lastAnaIndex = prev.slice().reverse().findIndex(msg => msg.sender === 'ana' && msg.streaming);
        if (lastAnaIndex !== -1) {
          const index = prev.length - 1 - lastAnaIndex;
          const fullText = prev[index]?.text || '';

          // Perplexity: Extraire le premier bloc de code et l'envoyer à l'éditeur
          const block = extractFirstCodeBlock(fullText);
          if (block && typeof onCodeBlockRef.current === 'function') {
            console.log(`📤 Auto-injection code ${block.language} vers éditeur`);
            onCodeBlockRef.current(block.code, block.language);
          }

          return prev.map((msg, i) =>
            i === index ? { ...msg, streaming: false } : msg
          );
        }
        return prev;
      });
      setIsLoading(false);
      fetchMemoryStats();
    });

    newSocket.on('chat:error', (data) => {
      addSystemMessage(`❌ Erreur: ${data.error}`);
      setIsLoading(false);
    });

    // Initial fetch
    fetchMemoryStats();

    return () => {
      newSocket.close();
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load voices
  useEffect(() => {
    const savedVoice = localStorage.getItem('ana_tts_voice');
    const savedRate = localStorage.getItem('ana_tts_rate');
    if (savedRate) setPlaybackRate(parseFloat(savedRate));

    const loadVoices = () => {
      if (!window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
      setAvailableVoices(frenchVoices);

      if (savedVoice) {
        const voice = frenchVoices.find(v => v.name === savedVoice);
        if (voice) setSelectedVoice(voice);
      } else if (frenchVoices.length > 0) {
        setSelectedVoice(frenchVoices[0]);
      }
    };

    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const fetchMemoryStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stats`);
      const data = await response.json();
      setMemoryStats(data.memory || { sizeKB: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: inputMessage,
      timestamp: new Date()
    };

    const anaMessage = {
      id: Date.now() + 1,
      sender: 'ana',
      text: '',
      timestamp: new Date(),
      streaming: true
    };

    setMessages(prev => [...prev, userMessage, anaMessage]);
    setInputMessage('');
    setIsLoading(true);

    if (socket) {
      socket.emit('chat:message', {
        message: inputMessage,
        context: context
      });
      soundSystem.play('message-sent');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRepeat = (text) => {
    setInputMessage(text);
  };

  const handlePlayPause = (messageId, text) => {
    if (!window.speechSynthesis) return;

    if (playingAudio === messageId) {
      window.speechSynthesis.cancel();
      setPlayingAudio(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = playbackRate;
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onend = () => setPlayingAudio(null);
    utterance.onerror = () => setPlayingAudio(null);

    window.speechSynthesis.speak(utterance);
    setPlayingAudio(messageId);
  };

  const handleVoiceChange = (voiceName) => {
    const voice = availableVoices.find(v => v.name === voiceName);
    if (voice) {
      setSelectedVoice(voice);
      localStorage.setItem('ana_tts_voice', voiceName);
    }
  };

  const handleRateChange = (rate) => {
    setPlaybackRate(rate);
    localStorage.setItem('ana_tts_rate', rate.toString());
  };

  // Handler pour la dictée vocale - envoie le message directement
  const handleVoiceTranscript = (transcript) => {
    if (!transcript || transcript.trim().length < 2 || isLoading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: transcript.trim(),
      timestamp: new Date()
    };

    const anaMessage = {
      id: Date.now() + 1,
      sender: 'ana',
      text: '',
      timestamp: new Date(),
      streaming: true
    };

    setMessages(prev => [...prev, userMessage, anaMessage]);
    setIsLoading(true);

    if (socket) {
      socket.emit('chat:message', {
        message: transcript.trim(),
        context: context
      });
      soundSystem.play('message-sent');
    }
  };

  return (
    <div className={`chat-widget ${compact ? 'compact' : ''}`}>
      {/* Messages */}
      <div className="chat-widget-messages">
        {messages.length === 0 && (
          <div className="chat-widget-placeholder">
            <p>{compact ? 'Demande à Ana...' : '👋 Bonjour! Je suis Ana. Pose-moi n\'importe quelle question!'}</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`chat-widget-message message-${message.sender}`}>
            <div className="message-avatar">
              {message.sender === 'user' ? '👤' : message.sender === 'ana' ? '🤖' : '⚙️'}
            </div>
            <div className="message-body">
              <div className="message-header">
                <span className="message-sender">
                  {message.sender === 'user' ? 'Toi' : message.sender === 'ana' ? 'Ana' : 'Système'}
                </span>
                <span className="message-time">
                  {message.timestamp?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="message-text">
                {message.streaming && !message.text ? (
                  <span className="loading-spinner">
                    <IconLoader2 size={compact ? 14 : 16} className="spin" /> Ana réfléchit...
                  </span>
                ) : (
                  <MessageContent
                    text={message.text || ''}
                    sender={message.sender}
                    onCodeBlock={onCodeBlock}
                    compact={compact}
                  />
                )}
                {message.streaming && message.text && <span className="cursor">▊</span>}
              </div>

              {/* Voice Controls */}
              {showVoiceControls && message.sender === 'ana' && message.text && !message.streaming && (
                <div className="message-actions">
                  <button
                    className="btn-action"
                    onClick={() => handleRepeat(message.text)}
                    title="Répéter"
                  >
                    <IconRotateCcw size={compact ? 12 : 14} />
                    {!compact && <span>Répéter</span>}
                  </button>
                  <button
                    className={`btn-action ${playingAudio === message.id ? 'playing' : ''}`}
                    onClick={() => handlePlayPause(message.id, message.text)}
                    title={playingAudio === message.id ? "Pause" : "Lire"}
                  >
                    {playingAudio === message.id ? (
                      <><IconPause size={compact ? 12 : 14} />{!compact && <span>Pause</span>}</>
                    ) : (
                      <><IconPlay size={compact ? 12 : 14} />{!compact && <span>Lire</span>}</>
                    )}
                  </button>

                  {/* Voice selection */}
                  {availableVoices.length > 0 && (
                    <select
                      className="voice-select"
                      value={selectedVoice?.name || ''}
                      onChange={(e) => handleVoiceChange(e.target.value)}
                      title="Voix"
                    >
                      {availableVoices.map(voice => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name.split(' ')[0]}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Speed controls */}
                  <div className="speed-controls">
                    <button
                      className={`btn-speed ${playbackRate === 0.8 ? 'active' : ''}`}
                      onClick={() => handleRateChange(0.8)}
                    >
                      0.8x
                    </button>
                    <button
                      className={`btn-speed ${playbackRate === 1.0 ? 'active' : ''}`}
                      onClick={() => handleRateChange(1.0)}
                    >
                      1x
                    </button>
                    <button
                      className={`btn-speed ${playbackRate === 1.2 ? 'active' : ''}`}
                      onClick={() => handleRateChange(1.2)}
                    >
                      1.2x
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-widget-input">
        <VoiceInput
          onTranscript={(text) => setInputMessage(text)}
          onAutoSubmit={handleVoiceTranscript}
          disabled={isLoading}
        />
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={isLoading}
        />
        <button
          className="btn-send"
          onClick={sendMessage}
          disabled={isLoading || !inputMessage.trim()}
        >
          <IconSend size={18} />
        </button>
      </div>

      {/* Memory indicator */}
      <div className="chat-widget-footer">
        <span>💾 Mémoire: {memoryStats.sizeKB} KB</span>
      </div>
    </div>
  );
}

export default ChatWidget;
