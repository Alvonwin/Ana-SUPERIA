import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';
import { IconPlay, IconSave, IconFolderOpen, IconTerminal, IconWand2, IconX, IconFileText } from '../components/Icons';
import prettier from 'prettier/standalone';
import parserBabel from 'prettier/parser-babel';
import parserTypescript from 'prettier/parser-typescript';
import parserHtml from 'prettier/parser-html';
import parserCss from 'prettier/parser-postcss';
import { toast, Toaster } from 'sonner';
import ChatWidget from '../components/ChatWidget';
import './CodingPage.css';

const BACKEND_URL = 'http://localhost:3338';

function CodingPage() {
  const [code, setCode] = useState('// Bienvenue dans l\'éditeur Ana\n// Codons ensemble!\n\nfunction hello() {\n  console.log("Hello from Ana!");\n}\n');
  const [language, setLanguage] = useState('javascript');
  const [terminalOutput, setTerminalOutput] = useState(['Prêt pour l\'exécution...']);

  // File management
  const [currentFile, setCurrentFile] = useState(null);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [fileBrowserPath, setFileBrowserPath] = useState('E:/ANA');
  const [fileBrowserItems, setFileBrowserItems] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Coding Agent states (pour plus tard)
  const [agentStatus, setAgentStatus] = useState('idle');
  const [agentTask, setAgentTask] = useState('');
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [dryRunMode, setDryRunMode] = useState(false);

  // Socket connection for code injection from chat
  const socketRef = useRef(null);
  const editorRef = useRef(null);

  // Map backend language names to Monaco language IDs
  const langMap = {
    'javascript': 'javascript', 'js': 'javascript',
    'typescript': 'typescript', 'ts': 'typescript',
    'python': 'python', 'py': 'python',
    'java': 'java',
    'cpp': 'cpp', 'c++': 'cpp', 'c': 'cpp',
    'csharp': 'csharp', 'c#': 'csharp', 'cs': 'csharp',
    'go': 'go', 'golang': 'go',
    'rust': 'rust', 'rs': 'rust',
    'html': 'html', 'css': 'css', 'json': 'json',
    'sql': 'sql', 'shell': 'shell', 'bash': 'shell', 'bat': 'bat'
  };

  // Socket.io connection for receiving code from Ana chat
  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('📝 CodingPage connected to Ana backend');
    });

    // Listen for code injection from Ana's chat responses
    socket.on('coding:inject', (data) => {
      const { code, language, source } = data;
      console.log(`📥 Code received from ${source}: ${language} (${code.length} chars)`);

      // Update the code in the editor
      setCode(code);

      // Update the language selector
      const monacoLang = langMap[language.toLowerCase()] || 'javascript';
      setLanguage(monacoLang);

      // Notify user
      toast.success(`Code ${language} injecté depuis le chat Ana!`, { duration: 3000 });
      setTerminalOutput(prev => [...prev, `📥 Code ${language} reçu d'Ana (${code.split('\\n').length} lignes)`]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Store editor reference for programmatic access
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  // Callback quand un bloc de code est détecté dans le chat (Perplexity - 2 Dec 2025)
  const handleCodeBlock = (codeFromChat, langFromChat) => {
    // Injecter le code directement dans l'éditeur Monaco
    setCode(codeFromChat);

    // Mapper le langage vers Monaco si fourni
    if (langFromChat) {
      const langMap = {
        'javascript': 'javascript',
        'js': 'javascript',
        'typescript': 'typescript',
        'ts': 'typescript',
        'python': 'python',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c++': 'cpp',
        'csharp': 'csharp',
        'c#': 'csharp',
        'go': 'go',
        'rust': 'rust',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'sql': 'sql',
        'bash': 'shell',
        'sh': 'shell'
      };
      const monacoLang = langMap[langFromChat.toLowerCase()] || 'javascript';
      setLanguage(monacoLang);
    }

    setTerminalOutput(prev => [...prev, `✅ Code ${langFromChat || 'détecté'} injecté dans l'éditeur (${codeFromChat.split('\n').length} lignes)`]);
  };

  const handleEditorChange = (value) => {
    setCode(value);
  };

  // File browser functions
  const loadDirectory = async (dirPath) => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/file/list?dirpath=${encodeURIComponent(dirPath)}`);
      const data = await response.json();
      if (data.success) {
        setFileBrowserItems(data.items || []);
        setFileBrowserPath(dirPath);
      } else {
        toast.error(data.error || 'Erreur lecture dossier');
      }
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const openFileFromBrowser = async (item) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
    } else {
      // Open file
      try {
        const response = await fetch(`${BACKEND_URL}/api/file/read?filepath=${encodeURIComponent(item.path)}`);
        const data = await response.json();
        if (data.success && data.content) {
          setCode(data.content);
          setCurrentFile(item.path);

          // Detect language from extension
          const ext = item.name.split('.').pop().toLowerCase();
          const langMap = {
            'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
            'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'cs': 'csharp',
            'go': 'go', 'rs': 'rust', 'html': 'html', 'css': 'css', 'json': 'json',
            'md': 'markdown', 'sql': 'sql', 'sh': 'shell', 'bat': 'bat'
          };
          setLanguage(langMap[ext] || 'plaintext');

          setShowFileBrowser(false);
          toast.success(`Ouvert: ${item.name}`);
          setTerminalOutput(prev => [...prev, `$ Fichier ouvert: ${item.path}`]);
        } else {
          toast.error(data.error || 'Erreur lecture fichier');
        }
      } catch (error) {
        toast.error('Erreur: ' + error.message);
      }
    }
  };

  const goToParentDirectory = () => {
    const parts = fileBrowserPath.replace(/\\/g, '/').split('/');
    if (parts.length > 1) {
      parts.pop();
      loadDirectory(parts.join('/') || 'E:/');
    }
  };


  const handleOpenFile = () => {
    setShowFileBrowser(true);
    loadDirectory(fileBrowserPath);
  };

  const handleSaveFile = async () => {
    if (currentFile) {
      // Save to actual file
      try {
        const response = await fetch(`${BACKEND_URL}/api/file/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filepath: currentFile, content: code })
        });
        const data = await response.json();
        if (data.success) {
          toast.success(`Sauvegardé: ${currentFile.split('/').pop()}`);
          setTerminalOutput(prev => [...prev, `$ Fichier sauvegardé: ${currentFile}`]);
        } else {
          toast.error(data.error || 'Erreur sauvegarde');
        }
      } catch (error) {
        toast.error('Erreur: ' + error.message);
      }
    } else {
      // Save to localStorage
      setTerminalOutput(prev => [...prev, `$ Code sauvegardé localement (${code.split('\n').length} lignes)`]);
      localStorage.setItem('ana_code_backup', code);
      localStorage.setItem('ana_code_language', language);
      toast.success('Sauvegardé localement');
    }
  };

  const handleExecuteCode = async () => {
    // Ajouter le message de début
    setTerminalOutput(prev => [...prev, `$ Exécution ${language}...`]);

    try {
      const response = await fetch(`${BACKEND_URL}/api/code/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      });

      const result = await response.json();

      if (result.success) {
        // Succès - afficher en vert
        const outputLines = result.output.split('\n').map(line => `✅ ${line}`);
        setTerminalOutput(prev => [...prev, ...outputLines, `⏱️ Exécuté en ${result.duration}ms`]);
        toast.success('Code exécuté avec succès');
      } else {
        // Erreur - afficher en rouge
        if (result.output) {
          const outputLines = result.output.split('\n').map(line => `  ${line}`);
          setTerminalOutput(prev => [...prev, ...outputLines]);
        }
        setTerminalOutput(prev => [...prev, `❌ Erreur: ${result.error}`, `⏱️ Durée: ${result.duration}ms`]);
        toast.error(result.error || 'Erreur d\'exécution');
      }
    } catch (error) {
      setTerminalOutput(prev => [...prev, `❌ Erreur réseau: ${error.message}`]);
      toast.error('Erreur de connexion au serveur');
    }
  };

  // Format code with Prettier (source: https://blog.expo.dev/building-a-code-editor-with-monaco-f84b3a06deaf)
  const handleFormatCode = () => {
    try {
      const parserMap = {
        javascript: 'babel',
        typescript: 'typescript',
        html: 'html',
        css: 'css',
        json: 'json'
      };

      const pluginsMap = {
        babel: [parserBabel],
        typescript: [parserTypescript],
        html: [parserHtml],
        css: [parserCss],
        json: [parserBabel]
      };

      const parser = parserMap[language] || 'babel';
      const plugins = pluginsMap[parser];

      const formatted = prettier.format(code, {
        parser,
        plugins,
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5'
      });

      setCode(formatted);
      setTerminalOutput(prev => [...prev, `✓ Code formatté avec Prettier`]);
      toast.success('Code formatté avec succès');
    } catch (error) {
      setTerminalOutput(prev => [...prev, `✗ Erreur formatting: ${error.message}`]);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  return (
    <div className="coding-page">
      {/* Sidebar Chat - Utilise le ChatWidget réutilisable */}
      <div className="coding-sidebar">
        <ChatWidget
          compact={true}
          showVoiceControls={true}
          context={{ codeContext: code, language }}
          onCodeBlock={handleCodeBlock}
          placeholder="Demande à Ana de coder..."
        />
      </div>

      {/* Main Editor Area */}
      <div className="editor-area">
        <Toaster richColors position="top-right" />
        <div className="editor-toolbar">
          <div className="toolbar-left">
            <button className="btn-icon" onClick={handleOpenFile} title="Ouvrir fichier">
              <IconFolderOpen size={18} />
            </button>
            <button className="btn-icon" onClick={handleSaveFile} title="Sauvegarder">
              <IconSave size={18} />
            </button>
            <button className="btn-icon" onClick={handleFormatCode} title="Formatter avec Prettier">
              <IconWand2 size={18} />
              Format
            </button>
            <button className="btn-icon btn-primary" onClick={handleExecuteCode} title="Exécuter">
              <IconPlay size={18} />
              Exécuter
            </button>
          </div>
          <div className="toolbar-right">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="language-select"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="csharp">C#</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>
          </div>
        </div>

        <div className="editor-container">
          <Editor
            height="70vh"
            language={language}
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </div>

        <div className="terminal-section">
          <div className="terminal-header">
            <IconTerminal size={16} />
            <span>Terminal</span>
          </div>
          <div className="terminal-content">
            {terminalOutput.map((line, index) => (
              <div key={index} className="terminal-line">{line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* File Browser Modal */}
      {showFileBrowser && (
        <div className="file-browser-modal">
          <div className="file-browser-overlay" onClick={() => setShowFileBrowser(false)} />
          <div className="file-browser-content">
            <div className="file-browser-header">
              <h3>📂 Ouvrir un fichier</h3>
              <button className="btn-close" onClick={() => setShowFileBrowser(false)}>
                <IconX size={20} />
              </button>
            </div>
            <div className="file-browser-path">
              <button className="btn-parent" onClick={goToParentDirectory}>⬆️</button>
              <span>{fileBrowserPath}</span>
            </div>
            <div className="file-browser-list">
              {isLoadingFiles ? (
                <div className="loading-files">Chargement...</div>
              ) : fileBrowserItems.length === 0 ? (
                <div className="empty-files">Dossier vide</div>
              ) : (
                fileBrowserItems.map((item, index) => (
                  <div
                    key={index}
                    className={`file-item ${item.isDirectory ? 'directory' : 'file'}`}
                    onClick={() => openFileFromBrowser(item)}
                  >
                    <span className="file-icon">
                      {item.isDirectory ? '📁' : <IconFileText size={16} />}
                    </span>
                    <span className="file-name">{item.name}</span>
                    {!item.isDirectory && item.size && (
                      <span className="file-size">{Math.round(item.size / 1024)} KB</span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="file-browser-shortcuts">
              <button onClick={() => loadDirectory('E:/ANA')}>🤖 ANA</button>
              <button onClick={() => loadDirectory('E:/Mémoire Claude')}>🧠 Mémoire</button>
              <button onClick={() => loadDirectory('C:/Users')}>👤 Users</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CodingPage;
