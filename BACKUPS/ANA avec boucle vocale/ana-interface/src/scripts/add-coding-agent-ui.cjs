/**
 * Script pour ajouter l'UI Coding Agent à CodingPage.jsx
 */

const fs = require('fs');
const path = require('path');

const codingPagePath = path.join(__dirname, '..', 'pages', 'CodingPage.jsx');

// Lire le fichier
let content = fs.readFileSync(codingPagePath, 'utf8');

// Vérifier si déjà présent
if (content.includes('agentStatus')) {
  console.log('ℹ️ Coding Agent UI déjà présent');
  process.exit(0);
}

// ============================================
// 1. Ajouter les nouveaux states après ligne 31
// ============================================
const stateMarker = 'const fileInputRef = useRef(null);';
const newStates = `const fileInputRef = useRef(null);

  // Coding Agent states
  const [agentStatus, setAgentStatus] = useState('idle'); // idle, running, completed, error
  const [agentTask, setAgentTask] = useState('');
  const [agentActions, setAgentActions] = useState([]);
  const [agentResult, setAgentResult] = useState(null);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [dryRunMode, setDryRunMode] = useState(false);`;

content = content.replace(stateMarker, newStates);

// ============================================
// 2. Ajouter les WebSocket listeners après chat:error
// ============================================
const wsMarker = `newSocket.on('chat:error', (error) => {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'system',
        text: \`❌ Erreur: \${error.error}\`
      }]);
      setIsLoading(false);
    });`;

const newWsListeners = `newSocket.on('chat:error', (error) => {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'system',
        text: \`❌ Erreur: \${error.error}\`
      }]);
      setIsLoading(false);
    });

    // Coding Agent WebSocket events
    newSocket.on('coding:started', (data) => {
      setAgentStatus('running');
      setAgentActions([]);
      setAgentResult(null);
      setShowAgentPanel(true);
      setTerminalOutput(prev => [...prev, \`🤖 Agent démarré: \${data.task}\`]);
    });

    newSocket.on('coding:action', (data) => {
      setAgentActions(prev => [...prev, {
        index: data.index,
        total: data.total,
        tool: data.tool,
        success: data.success,
        timestamp: data.timestamp
      }]);
      setTerminalOutput(prev => [...prev, \`  → [\${data.index + 1}/\${data.total}] \${data.tool}: \${data.success ? '✓' : '✗'}\`]);
    });

    newSocket.on('coding:completed', (data) => {
      setAgentStatus('completed');
      setAgentResult(data);
      setTerminalOutput(prev => [...prev, \`✅ Agent terminé en \${data.elapsedMs}ms (\${data.iterations} itérations)\`]);
      if (data.response) {
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'ana',
          text: data.response
        }]);
      }
    });

    newSocket.on('coding:error', (data) => {
      setAgentStatus('error');
      setAgentResult(data);
      setTerminalOutput(prev => [...prev, \`❌ Agent erreur: \${data.error}\`]);
    });`;

content = content.replace(wsMarker, newWsListeners);

// ============================================
// 3. Ajouter la fonction handleRunAgent avant handleOpenFile
// ============================================
const funcMarker = 'const handleOpenFile = () => {';
const newFunction = `// Run Coding Agent
  const handleRunAgent = () => {
    if (!agentTask.trim()) {
      toast.error('Décris la tâche pour l\\'agent');
      return;
    }

    if (!socket) {
      toast.error('WebSocket non connecté');
      return;
    }

    setAgentStatus('running');
    setAgentActions([]);
    setAgentResult(null);
    setShowAgentPanel(true);

    // Contexte avec le code actuel et le fichier
    const context = {
      workingDirectory: fileBrowserPath,
      currentCode: code,
      currentFile: currentFile,
      language: language
    };

    socket.emit('coding:run', {
      task: agentTask,
      context: context,
      dryRun: dryRunMode
    });

    setChatMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      text: \`🤖 Agent: \${agentTask}\`
    }]);
  };

  const handleOpenFile = () => {`;

content = content.replace(funcMarker, newFunction);

// ============================================
// 4. Ajouter le panneau Agent dans le JSX (après chat-input-coding)
// ============================================
const uiMarker = `<div className="memory-indicator-coding">
          <span>💾 Mémoire: {memorySize}</span>
        </div>
      </div>`;

const newUI = `<div className="memory-indicator-coding">
          <span>💾 Mémoire: {memorySize}</span>
        </div>

        {/* Coding Agent Section */}
        <div className="coding-agent-section">
          <div className="agent-header">
            <h4>🤖 Ana Code Agent</h4>
            <label className="dry-run-toggle">
              <input
                type="checkbox"
                checked={dryRunMode}
                onChange={(e) => setDryRunMode(e.target.checked)}
              />
              Dry-run
            </label>
          </div>
          <div className="agent-input-row">
            <input
              type="text"
              value={agentTask}
              onChange={(e) => setAgentTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunAgent()}
              placeholder="Ex: Corrige le bug dans ce fichier..."
              disabled={agentStatus === 'running'}
            />
            <button
              className={\`btn-agent \${agentStatus === 'running' ? 'running' : ''}\`}
              onClick={handleRunAgent}
              disabled={agentStatus === 'running'}
            >
              {agentStatus === 'running' ? '⏳' : '▶️'} {agentStatus === 'running' ? 'En cours...' : 'Lancer'}
            </button>
          </div>
          {showAgentPanel && agentActions.length > 0 && (
            <div className="agent-actions">
              <div className="actions-title">Actions ({agentActions.length}):</div>
              {agentActions.map((action, i) => (
                <div key={i} className={\`action-item \${action.success ? 'success' : 'error'}\`}>
                  {action.success ? '✓' : '✗'} {action.tool}
                </div>
              ))}
            </div>
          )}
          {agentStatus === 'completed' && agentResult && (
            <div className="agent-result success">
              ✅ Terminé en {agentResult.elapsedMs}ms
            </div>
          )}
          {agentStatus === 'error' && agentResult && (
            <div className="agent-result error">
              ❌ {agentResult.error}
            </div>
          )}
        </div>
      </div>`;

content = content.replace(uiMarker, newUI);

// Sauvegarder
fs.writeFileSync(codingPagePath, content, 'utf8');
console.log('✅ Coding Agent UI ajouté à CodingPage.jsx');
