import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import {
  IconSend,
  IconUpload,
  IconBrain,
  IconZap,
  IconRotateCcw,
  IconPlay,
  IconPause,
  IconCopy,
  IconCheck,
  IconFileText,
  IconImage,
  IconSettings,
  IconSave,
  IconChevronDown,
  IconChevronUp,
  IconThumbsUp,
  IconThumbsDown,
  IconLoader2
} from '../components/Icons';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import soundSystem from '../utils/soundSystem';
import VoiceInput from '../components/VoiceInput';
import VoiceLoopButton from '../components/VoiceLoopButton';
import './ChatPage.css';

const BACKEND_URL = 'http://localhost:3338';

// MessageContent component with markdown + syntax highlighting + copy button
// Source: https://github.com/remarkjs/react-markdown
function MessageContent({ text, sender }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Custom code block renderer with copy button
  // Source: https://hannadrehman.com/blog/enhancing-your-react-markdown-experience-with-syntax-highlighting
  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const code = String(children).replace(/\n$/, '');
    const codeBlockIndex = node?.position?.start?.line || 0;

    return !inline && language ? (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => copyCode(code, codeBlockIndex)}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: '#fff'
          }}
        >
          {copiedIndex === codeBlockIndex ? (
            <><IconCheck size={14} /> Copié</>
          ) : (
            <><IconCopy size={14} /> Copier</>
          )}
        </button>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
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

  // For system messages, render plain text
  if (sender === 'system') {
    return <span>{text}</span>;
  }

  // For user/ana messages, render markdown with syntax highlighting
  // Source: https://athrael.net/blog/building-an-ai-chat-assistant/add-markdown-to-streaming-chat
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeBlock
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState(null);
  const [memoryStats, setMemoryStats] = useState({ sizeKB: 0, lines: 0 });
  const [socket, setSocket] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({}); // Track feedback per message - Phase 5B
  const messagesEndRef = useRef(null);
  const voiceLoopRef = useRef(null);
  const fileInputRef = useRef(null);

  // Helper: Convert file to base64 (source: https://dev.to/guscarpim/upload-image-base64-react-4p7j)
  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
    });
  };

  // Helper: Read text from file (TXT only - plain text)
  const readTextFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  };

  // Helper: Extract text from PDF using pdf.js
  // Source: https://mozilla.github.io/pdf.js/examples/
  const readPdfFile = async (file) => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `[Page ${i}]\n${pageText}\n\n`;
    }
    return fullText.trim();
  };

  // System message helper (declare early for use in handleFileUpload)
  const addSystemMessage = (text, type = 'info') => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'system',
      text,
      type,
      timestamp: new Date()
    }]);
  };

  // File upload handler (must be before useDropzone)
  const handleFileUpload = async (files) => {
    const fileList = Array.isArray(files) ? files : Array.from(files || []);
    if (fileList.length === 0) return;

    const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const validDocTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allValidTypes = [...validImageTypes, ...validDocTypes];

    for (const file of fileList) {
      if (!allValidTypes.includes(file.type)) {
        addSystemMessage(`❌ Format non supporté: ${file.name}. Formats acceptés: PNG, JPEG, WebP, PDF, TXT, DOC`, 'error');
        continue;
      }

      try {
        if (validImageTypes.includes(file.type)) {
          const base64Image = await getBase64(file);
          setUploadedImage({
            name: file.name,
            type: file.type,
            size: file.size,
            base64: base64Image,
            preview: URL.createObjectURL(file)
          });
          addSystemMessage(`📷 Image uploadée: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        }
        else if (validDocTypes.includes(file.type)) {
          let textContent = '';

          // PDF files need special handling
          if (file.type === 'application/pdf') {
            try {
              textContent = await readPdfFile(file);
              addSystemMessage(`📄 PDF parsé: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
            } catch (pdfError) {
              addSystemMessage(`⚠️ Erreur PDF: ${pdfError.message}. Essayant lecture basique...`, 'error');
              textContent = `[PDF: ${file.name} - Extraction texte échouée]`;
            }
          }
          // DOC/DOCX - note: full parsing requires server-side processing
          else if (file.type.includes('msword') || file.type.includes('wordprocessing')) {
            addSystemMessage(`⚠️ DOC/DOCX: Extraction basique. Pour meilleur résultat, convertir en PDF.`, 'warning');
            textContent = `[Document Word: ${file.name} - Convertir en PDF pour extraction complète]`;
          }
          // Plain text
          else {
            textContent = await readTextFile(file);
          }

          setUploadedFiles(prev => [...prev, {
            name: file.name,
            type: file.type,
            size: file.size,
            content: textContent
          }]);

          if (file.type === 'text/plain') {
            addSystemMessage(`📄 Fichier texte uploadé: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
          }
        }
      } catch (error) {
        addSystemMessage(`❌ Erreur upload ${file.name}: ${error.message}`, 'error');
      }
    }
  };

  // Dropzone setup (source: https://react-dropzone.js.org/)
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    noClick: true,
    noKeyboard: true
  });

  useEffect(() => {
    // Connect to WebSocket
    console.log('🔌 Tentative de connexion WebSocket à:', BACKEND_URL);
    const newSocket = io(BACKEND_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
    setSocket(newSocket);

    // Load memory stats and system prompt
    fetchMemoryStats();
    fetchSystemPrompt();

    // Socket events
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connecté!', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erreur connexion WebSocket:', error);
      addSystemMessage(`❌ Erreur connexion: ${error.message}`, 'error');
    });

    newSocket.on('chat:model_selected', (data) => {
      setActiveModel(data.model);
      addSystemMessage(`🧠 ${data.reason}`);
      soundSystem.play('llm-start');
    });

    newSocket.on('chat:chunk', (data) => {
      // Update last message with streaming chunk
      console.log('📥 Frontend reçoit chunk:', data);

      // Vérification stricte: data doit être un objet avec une clé chunk non vide
      if (typeof data === 'object' && data.chunk && typeof data.chunk === 'string') {
        setMessages(prev => {
          // Chercher le dernier message Ana avec streaming:true
          const lastAnaIndex = prev.slice().reverse().findIndex(msg => msg.sender === 'ana' && msg.streaming);

          if (lastAnaIndex !== -1) {
            const index = prev.length - 1 - lastAnaIndex;
            const anaMessage = prev[index];
            const currentText = anaMessage.text || '';

            if (currentText === '') {
              soundSystem.play('message-received');
            }

            console.log('✅ ACCUM chunk dans message Ana index', index);

            return prev.map((msg, i) =>
              i === index ? { ...msg, text: currentText + data.chunk } : msg
            );
          }

          console.warn('⚠️ Aucun message Ana en streaming trouvé');
          return prev;
        });
      } else {
        console.warn('⚠️ Chunk incorrect reçu:', data);
      }
    });

    newSocket.on('chat:complete', (data) => {
      let finalText = null;
      let finalMessageId = null;

      setMessages(prev => {
        const lastAnaIndex = prev.slice().reverse().findIndex(msg => msg.sender === 'ana' && msg.streaming);

        if (lastAnaIndex !== -1) {
          const index = prev.length - 1 - lastAnaIndex;
          const anaMessage = prev[index];

          // Stocker le texte pour lecture audio
          finalText = anaMessage.text;
          finalMessageId = anaMessage.id;

          return prev.map((msg, i) =>
            i === index ? { ...msg, streaming: false } : msg
          );
        }
        return prev;
      });

      // Déclencher l'audio après un délai pour laisser React mettre à jour le state
      setTimeout(() => {
        if (finalText && window.speechSynthesis) {
          // PAUSE la reconnaissance vocale pendant le TTS
          if (voiceLoopRef.current) {
            voiceLoopRef.current.pause();
          }
          
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(finalText);
          utterance.lang = 'fr-FR';
          utterance.rate = playbackRate;
          if (selectedVoice) utterance.voice = selectedVoice;

          // Callback quand Ana finit de parler
          utterance.onend = () => {
            setPlayingAudio(null);
            console.log('✅ TTS terminé');
            // RESUME la reconnaissance vocale après le TTS
            if (voiceLoopRef.current) {
              voiceLoopRef.current.resume();
            }
          };

          window.speechSynthesis.speak(utterance);
          setPlayingAudio(finalMessageId);
        }
      }, 100);

      setIsLoading(false);
      fetchMemoryStats();
      soundSystem.play('llm-complete');
    });

    newSocket.on('chat:error', (data) => {
      addSystemMessage(`❌ Erreur: ${data.error}`, 'error');
      setIsLoading(false);
      soundSystem.play('error');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup URL.createObjectURL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (uploadedImage?.preview) {
        URL.revokeObjectURL(uploadedImage.preview);
      }
    };
  }, [uploadedImage]);

  // Load voices and preferences
  useEffect(() => {
    // Load preferences from localStorage
    const savedVoice = localStorage.getItem('ana_tts_voice');
    const savedRate = localStorage.getItem('ana_tts_rate');

    if (savedRate) {
      setPlaybackRate(parseFloat(savedRate));
    }

    // Load available voices
    const loadVoices = () => {
      if (!window.speechSynthesis) return;

      const voices = window.speechSynthesis.getVoices();
      // Filter French voices
      const frenchVoices = voices.filter(voice => voice.lang.startsWith('fr'));

      setAvailableVoices(frenchVoices);
      console.log(`🎤 ${frenchVoices.length} voix françaises disponibles`);

      // Set saved or default voice
      if (savedVoice) {
        const voice = frenchVoices.find(v => v.name === savedVoice);
        if (voice) {
          setSelectedVoice(voice);
        }
      } else if (frenchVoices.length > 0) {
        // Select first French voice as default
        setSelectedVoice(frenchVoices[0]);
      }
    };

    // Initial load
    loadVoices();

    // Handle async voice loading (some browsers load voices asynchronously)
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Handler pour les transcriptions vocales du composant VoiceLoopButton
  const handleVoiceLoopTranscript = useCallback((transcript) => {
    if (!transcript || transcript.trim().length < 3 || isLoading) return;

    console.log('🎤 Mode vocal: message reçu ->', transcript);

    // Ajouter le message utilisateur
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: transcript.trim(),
      timestamp: new Date()
    };

    // Ajouter message Ana vide avec streaming:true
    const anaMsg = {
      id: Date.now() + 1,
      sender: 'ana',
      text: '',
      timestamp: new Date(),
      streaming: true
    };

    setMessages(prev => [...prev, userMsg, anaMsg]);
    setIsLoading(true);

    // Envoyer via socket
    if (socket) {
      socket.emit('chat:message', {
        message: transcript.trim(),
        contextLines: 20
      });
      soundSystem.play('message-sent');
    }
  }, [socket, isLoading]);

  const fetchMemoryStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stats`);
      const data = await response.json();
      setMemoryStats(data.memory);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch system prompt from backend
  const fetchSystemPrompt = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/system-prompt`);
      const data = await response.json();
      setSystemPrompt(data.prompt || '');
    } catch (error) {
      console.error('Error fetching system prompt:', error);
    }
  };

  // Save system prompt to backend
  const saveSystemPrompt = async () => {
    setPromptSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/system-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: systemPrompt })
      });
      const data = await response.json();
      if (data.success) {
        addSystemMessage('✅ Prompt système sauvegardé');
      } else {
        addSystemMessage('❌ Erreur sauvegarde prompt', 'error');
      }
    } catch (error) {
      console.error('Error saving system prompt:', error);
      addSystemMessage('❌ Erreur sauvegarde prompt', 'error');
    }
    setPromptSaving(false);
  };

  const sendMessage = async (messageOverride = null) => {
    const messageToSend = messageOverride || inputMessage;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: messageToSend,
      timestamp: new Date()
    };

    // Ajouter message utilisateur ET message Ana vide EN MÊME TEMPS
    const anaMessage = {
      id: Date.now() + 1,
      sender: 'ana',
      text: '',
      timestamp: new Date(),
      streaming: true
    };

    setMessages(prev => [...prev, userMessage, anaMessage]);
    console.log('🟢 Message Ana créé avec streaming:true', anaMessage);

    setInputMessage('');
    setIsLoading(true);
    soundSystem.play('message-sent');

    // Send via WebSocket for streaming
    if (socket) {
      const context = uploadedImage ? { hasImage: true } : {};
      const images = uploadedImage ? [uploadedImage.base64] : [];

      // Inclure contenu des documents uploadés dans le message
      let enrichedMessage = messageToSend;
      if (uploadedFiles.length > 0) {
        enrichedMessage += '\n\n--- Documents attachés ---\n';
        uploadedFiles.forEach(file => {
          enrichedMessage += `\n[${file.name}]:\n${file.content}\n`;
        });
      }

      socket.emit('chat:message', {
        message: enrichedMessage,
        context,
        images  // Tableau d'images base64 (source: https://docs.ollama.com/capabilities/vision)
      });

      // Reset uploaded files après envoi
      setUploadedImage(null);
      setUploadedFiles([]);
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
    addSystemMessage('📝 Message copié dans le champ de saisie');
  };

  const handlePlayPause = (messageId, text) => {
    // Browser compatibility check
    if (!window.speechSynthesis) {
      addSystemMessage('❌ Synthèse vocale non supportée par ce navigateur', 'error');
      return;
    }

    if (playingAudio === messageId) {
      // Stop audio proprement
      window.speechSynthesis.cancel();
      setPlayingAudio(null);
      return;
    }

    // Cancel toute lecture en cours
    window.speechSynthesis.cancel();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = playbackRate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Use selected voice if available
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Event: Démarrage lecture
      utterance.onstart = () => {
        console.log('🔊 Lecture audio démarrée');
      };

      // Event: Fin lecture
      utterance.onend = () => {
        setPlayingAudio(null);
        console.log('✅ Lecture audio terminée');
      };

      // Event: Erreur
      utterance.onerror = (event) => {
        console.error('❌ Erreur synthèse vocale:', event.error);
        setPlayingAudio(null);

        // Messages erreur utilisateur
        const errorMessages = {
          'canceled': 'Lecture annulée',
          'interrupted': 'Lecture interrompue',
          'audio-busy': 'Audio occupé',
          'audio-hardware': 'Problème matériel audio',
          'network': 'Erreur réseau',
          'synthesis-unavailable': 'Synthèse vocale indisponible',
          'synthesis-failed': 'Échec synthèse vocale',
          'language-unavailable': 'Langue non disponible',
          'voice-unavailable': 'Voix non disponible',
          'text-too-long': 'Texte trop long',
          'invalid-argument': 'Argument invalide',
          'not-allowed': 'Lecture non autorisée'
        };

        const userMessage = errorMessages[event.error] || `Erreur: ${event.error}`;
        addSystemMessage(`🔊 ${userMessage}`, 'error');
      };

      // Démarrer lecture
      window.speechSynthesis.speak(utterance);
      setPlayingAudio(messageId);

    } catch (error) {
      console.error('❌ Exception synthèse vocale:', error);
      addSystemMessage('❌ Erreur lors du démarrage de la lecture audio', 'error');
      setPlayingAudio(null);
    }
  };

  const handleVoiceTranscript = (transcript) => {
    setInputMessage(transcript);
    addSystemMessage(`🎤 Transcription: "${transcript}"`);
  };

  const handleVoiceChange = (voiceName) => {
    const voice = availableVoices.find(v => v.name === voiceName);
    if (voice) {
      setSelectedVoice(voice);
      localStorage.setItem('ana_tts_voice', voiceName);
      console.log('🎤 Voix changée:', voiceName);
    }
  };

  const handleRateChange = (rate) => {
    setPlaybackRate(rate);
    localStorage.setItem('ana_tts_rate', rate.toString());
    console.log('⚡ Vitesse changée:', rate + 'x');
  };

  // Feedback handler - Phase 5B/5C - 01 Dec 2025
  // Enriched with targeted context (LLM model, question, response summary)
  const handleFeedback = async (messageId, type) => {
    // Prevent duplicate feedback
    if (feedbackGiven[messageId]) return;

    // Find the message and its context
    const messageIndex = messages.findIndex(m => m.id === messageId);
    const anaMessage = messages[messageIndex];

    // Find the user question that prompted this response
    let userQuestion = null;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        userQuestion = messages[i].text;
        break;
      }
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: String(messageId),
          type,
          source: 'chat',
          llmModel: activeModel || null,
          question: userQuestion ? userQuestion.substring(0, 500) : null,
          responseSummary: anaMessage?.text ? anaMessage.text.substring(0, 500) : null
        })
      });

      const data = await response.json();
      if (data.success) {
        setFeedbackGiven(prev => ({ ...prev, [messageId]: type }));
        console.log(`👍 Feedback ${type} ciblé enregistré - LLM: ${activeModel}`);
      }
    } catch (error) {
      console.error('Erreur feedback:', error);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="header-left">
          <h2>💬 Chat avec Ana</h2>
          <span className="subtitle">Conversation avec mémoire persistante</span>
        </div>
        <div className="header-right">
          {/* Composant Mode Vocal isolé pour éviter les crashs */}
          <VoiceLoopButton
            ref={voiceLoopRef}
            onTranscript={handleVoiceLoopTranscript}
            onListeningChange={setIsVoiceListening}
            disabled={isLoading}
            soundSystem={soundSystem}
          />
          <button
            className="prompt-toggle-btn"
            onClick={() => setShowPromptPanel(!showPromptPanel)}
            title="Prompt Système"
          >
            <IconSettings size={16} />
            {showPromptPanel ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </button>
          <div className="memory-info">
            <IconBrain size={16} />
            <span>Mémoire: {memoryStats.sizeKB} KB • {memoryStats.lines} lignes</span>
          </div>
          {activeModel && (
            <div className="active-model">
              <IconZap size={16} />
              <span>{activeModel}</span>
            </div>
          )}
        </div>
      </div>

      {/* System Prompt Panel */}
      {showPromptPanel && (
        <div className="system-prompt-panel">
          <div className="prompt-header">
            <h3><IconSettings size={16} /> Prompt Système</h3>
            <span className="prompt-hint">Définit la personnalité et les instructions d'Ana</span>
          </div>
          <textarea
            className="prompt-textarea"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Tu es Ana, une IA locale française..."
            rows={4}
          />
          <div className="prompt-actions">
            <button
              className="btn-save-prompt"
              onClick={saveSystemPrompt}
              disabled={promptSaving}
            >
              <IconSave size={14} />
              {promptSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h3>👋 Bonjour! Je suis Ana</h3>
            <p>Une SUPER IA locale avec mémoire infinie. Pose-moi n'importe quelle question!</p>
            <div className="suggestions">
              <button onClick={() => setInputMessage("Explique-moi comment tu fonctionnes")}>
                Comment tu fonctionnes?
              </button>
              <button onClick={() => setInputMessage("Aide-moi à coder une fonction JavaScript")}>
                Aide-moi à coder
              </button>
              <button onClick={() => setInputMessage("De quoi on a parlé hier?")}>
                Recherche mémoire
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.sender}`}>
            {message.sender === 'user' && (
              <div className="message-avatar">👤</div>
            )}
            {message.sender === 'ana' && (
              <div className="message-avatar">🤖</div>
            )}
            <div className="message-content">
              <div className="message-header">
                <span className="message-sender">
                  {message.sender === 'user' ? 'Toi' : message.sender === 'ana' ? 'Ana' : 'Système'}
                </span>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="message-text">
                {message.streaming && !message.text ? (
                  <span className="loading-spinner">
                    <IconLoader2 size={16} className="spin" /> Ana réfléchit...
                  </span>
                ) : (
                  <MessageContent text={message.text} sender={message.sender} />
                )}
                {message.streaming && message.text && <span className="cursor">▊</span>}
              </div>
              {message.sender === 'ana' && message.text && (
                <div className="message-actions">
                  <button
                    className="btn-action"
                    onClick={() => handleRepeat(message.text)}
                    title="Répéter ce message"
                  >
                    <IconRotateCcw size={14} />
                    <span>Répéter</span>
                  </button>
                  <button
                    className={`btn-action ${playingAudio === message.id ? 'playing' : ''}`}
                    onClick={() => handlePlayPause(message.id, message.text)}
                    title={playingAudio === message.id ? "Arrêter la lecture" : "Lire à voix haute"}
                  >
                    {playingAudio === message.id ? (
                      <>
                        <IconPause size={14} />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <IconPlay size={14} />
                        <span>Lire</span>
                      </>
                    )}
                  </button>

                  {/* Voice selection */}
                  {availableVoices.length > 0 && (
                    <select
                      className="voice-select"
                      value={selectedVoice?.name || ''}
                      onChange={(e) => handleVoiceChange(e.target.value)}
                      title="Sélectionner une voix"
                    >
                      {availableVoices.map(voice => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name.split(' ')[0]}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Speed control */}
                  <div className="speed-controls">
                    <button
                      className={`btn-speed ${playbackRate === 0.8 ? 'active' : ''}`}
                      onClick={() => handleRateChange(0.8)}
                      title="Vitesse lente"
                    >
                      0.8x
                    </button>
                    <button
                      className={`btn-speed ${playbackRate === 1.0 ? 'active' : ''}`}
                      onClick={() => handleRateChange(1.0)}
                      title="Vitesse normale"
                    >
                      1x
                    </button>
                    <button
                      className={`btn-speed ${playbackRate === 1.2 ? 'active' : ''}`}
                      onClick={() => handleRateChange(1.2)}
                      title="Vitesse rapide"
                    >
                      1.2x
                    </button>
                  </div>

                  {/* Feedback buttons - Phase 5B */}
                  <div className="feedback-buttons">
                    {feedbackGiven[message.id] ? (
                      <span className="feedback-thanks">
                        {feedbackGiven[message.id] === 'positive' ? '👍' : '👎'} Merci!
                      </span>
                    ) : (
                      <>
                        <button
                          className="btn-feedback btn-feedback-up"
                          onClick={() => handleFeedback(message.id, 'positive')}
                          title="Réponse utile"
                        >
                          <IconThumbsUp size={14} />
                        </button>
                        <button
                          className="btn-feedback btn-feedback-down"
                          onClick={() => handleFeedback(message.id, 'negative')}
                          title="Réponse pas utile"
                        >
                          <IconThumbsDown size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div
        className={`chat-input-container ${isDragActive ? 'drag-active' : ''}`}
        {...getRootProps()}
      >
        {/* File Previews */}
        {(uploadedImage || uploadedFiles.length > 0) && (
          <div className="file-previews">
            {uploadedImage && (
              <div className="file-preview image-preview">
                <IconImage size={16} />
                <span>{uploadedImage.name}</span>
                <button onClick={() => setUploadedImage(null)}>×</button>
              </div>
            )}
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="file-preview doc-preview">
                <IconFileText size={16} />
                <span>{file.name}</span>
                <button onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Drag & Drop Overlay */}
        {isDragActive && (
          <div className="dropzone-overlay">
            <IconUpload size={48} />
            <p>Dépose tes fichiers ici...</p>
          </div>
        )}

        <div className="chat-input-wrapper">
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            onAutoSubmit={sendMessage}
            disabled={isLoading}
          />
          <button
            className="btn-icon"
            onClick={() => fileInputRef.current?.click()}
            title="Upload fichiers: images, PDF, TXT, DOC"
          >
            <IconUpload size={20} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
            style={{ display: 'none' }}
            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
          />
          <textarea
            className="chat-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Message Ana... (Shift+Enter pour nouvelle ligne)"
            rows={1}
            disabled={isLoading}
          />
          <button
            className="btn-send"
            onClick={(e) => {
              e.stopPropagation();
              sendMessage();
            }}
            disabled={!inputMessage.trim() || isLoading}
          >
            <IconSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
