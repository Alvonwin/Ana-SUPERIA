import { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../config';
import './GamesPage.css';
import VoiceInput from '../components/VoiceInput';
import VoiceLoopButton from '../components/VoiceLoopButton';

// Constante pour la voix Sylvie (edge-tts) - FIX 2025-12-19
const SYLVIE_VOICE = 'Sylvie (Québec)';

// Liste des jeux disponibles
const GAMES_LIST = [
  { id: 'checkers', name: 'Dames', icon: '🎮', description: 'Stratégie classique' },
  { id: 'tictactoe', name: 'Morpion', icon: '⭕', description: 'Tic-tac-toe' },
  { id: 'connect4', name: 'Puissance 4', icon: '🔴', description: 'Aligne 4 jetons' },
  { id: 'rps', name: 'Shifumi', icon: '✊', description: 'Pierre-Feuille-Ciseaux' },
  { id: 'hangman', name: 'Pendu', icon: '🔤', description: 'Devine le mot' },
  { id: 'blackjack', name: 'Blackjack', icon: '🃏', description: '21!' },
  { id: 'memory', name: 'Memory', icon: '🧠', description: 'Trouve les paires' },
  { id: 'nim', name: 'Nim', icon: '🔢', description: 'Stratégie mathématique' },
  { id: 'guess', name: 'Devinette', icon: '🎯', description: 'Trouve le nombre!' },
  { id: 'chess', name: 'Échecs', icon: '♟', description: 'Le roi des jeux!' },
  { id: 'battleship', name: 'Bataille Navale', icon: '🚢', description: 'Coule la flotte!' },
  { id: 'backgammon', name: 'Backgammon', icon: '🎲', description: 'Classique!' }
];

function GamesPage() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const voiceLoopRef = useRef(null);
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  // TTS - Ana parle avec EdgeTTS (Sylvie Québec) - FIX 2025-12-19
  const speak = async (text) => {
    if (!text) return;

    const savedVoice = localStorage.getItem('ana_tts_voice');

    // Utiliser EdgeTTS (Sylvie) par défaut ou si sélectionné
    if (!savedVoice || savedVoice === SYLVIE_VOICE) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/tts/synthesize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        if (response.ok) {
          const blob = await response.blob();
          const audio = new Audio(URL.createObjectURL(blob));
          audio.onended = () => URL.revokeObjectURL(audio.src);
          audio.play();
          return;
        }
      } catch (error) {
        console.warn('EdgeTTS failed, falling back to browser:', error.message);
      }
    }

    // Fallback: voix navigateur
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    const savedRate = localStorage.getItem('ana_tts_rate');
    utterance.rate = savedRate ? parseFloat(savedRate) : 1.0;
    const voices = window.speechSynthesis.getVoices();
    if (savedVoice) {
      const voice = voices.find(v => v.name === savedVoice);
      if (voice) utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const addMessage = (text, sender = 'ana') => {
    if (!text) return;
    setMessages(prev => [...prev, { text, sender, time: new Date() }]);
    if (sender === 'ana') speak(text);
  };

  // Envoyer un message à Ana via l'API chat
  const sendChatMessage = async (transcript = null) => {
    const messageText = transcript || chatInput.trim();
    if (!messageText || isChatLoading) return;

    const userMessage = messageText;
    setChatInput('');
    addMessage(userMessage, 'user');
    setIsChatLoading(true);

    // Contexte pour qu'Ana sache qu'on joue
    const gameContext = selectedGame
      ? `[Contexte: Alain joue au jeu "${GAMES_LIST.find(g => g.id === selectedGame)?.name || selectedGame}" avec Ana. Réponds en tant qu'Ana, l'assistante IA d'Alain.]`
      : '[Contexte: Page Jeux. Réponds en tant qu\'Ana, l\'assistante IA d\'Alain.]';

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${gameContext}\n\nAlain: ${userMessage}`,
          context: { source: 'games', game: selectedGame }
        })
      });
      const data = await res.json();
      if (data.response) {
        addMessage(data.response, 'ana');
      } else if (data.error) {
        addMessage(`Erreur: ${data.error}`, 'ana');
      }
    } catch (e) {
      addMessage("Erreur de connexion avec Ana", 'ana');
    } finally {
      setIsChatLoading(false);
    }
  };
  // Voice input handlers
  const handleVoiceTranscript = (transcript) => {
    setChatInput(transcript);
  };

  const handleVoiceAutoSubmit = (transcript) => {
    sendChatMessage(transcript);
  };

  const handleVoiceLoopTranscript = (transcript) => {
    sendChatMessage(transcript);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectGame = (gameId) => {
    setSelectedGame(gameId);
    setGameState(null);
    setMessages([]);
  };

  const backToMenu = () => {
    setSelectedGame(null);
    setGameState(null);
    setMessages([]);
  };

  // ==================== CHECKERS ====================
  const CheckersGame = () => {
    const [selectedCell, setSelectedCell] = useState(null);
    const [difficulty, setDifficulty] = useState('normal');
    const [mode, setMode] = useState('vsAna'); // 'vsAna' ou 'vsHuman'

    // Utiliser legalMoves directement depuis gameState
    const legalMoves = gameState?.legalMoves || [];

    const startCheckers = async () => {
      setIsLoading(true);
      setSelectedCell(null);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/checkers/new`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', difficulty, mode })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          addMessage(data.reaction || data.message);
        }
      } catch (e) {
        addMessage("Erreur de connexion");
      }
      setIsLoading(false);
    };

    const playCheckers = async (move) => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/checkers/play`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', move })
        });
        const data = await res.json();
        if (data.success) {
          // Mode vsAna : Ana joue automatiquement
          if (data.anaMove) addMessage(`Je joue ${data.anaMove.notation}`);
          // Mode vsHuman : afficher à qui c'est le tour
          if (data.mode === 'vsHuman' && !data.gameOver) {
            addMessage(data.message || `Au tour de ${data.currentPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'}`);
          }
          setGameState(data);
          if (data.gameOver) {
            if (data.mode === 'vsHuman') {
              addMessage(data.winner === 'player1' ? "Joueur 1 gagne!" : "Joueur 2 gagne!");
            } else {
              addMessage(data.winner === 'player' || data.winner === 'player1' ? "Tu as gagné!" : "J'ai gagné!");
            }
          }
        } else {
          addMessage(data.error || "Coup invalide");
        }
      } catch (e) {
        addMessage("Erreur");
      }
      setIsLoading(false);
      setSelectedCell(null);
    };

    const toNotation = (r, c) => String.fromCharCode(65 + c) + (8 - r);

    const handleClick = (row, col) => {
      if (!gameState?.boardData) return;

      const piece = gameState.boardData[row]?.[col];
      // En mode vsHuman, déterminer quelles pièces le joueur courant peut sélectionner
      const currentPlayer = gameState.currentPlayer || 'player1';
      const isPlayer1Piece = piece === 1 || piece === 2; // Pièces noires (●◆)
      const isPlayer2Piece = piece === 3 || piece === 4; // Pièces blanches (○◇)

      // Déterminer si c'est une pièce du joueur actif
      let isOwnPiece;
      if (gameState.mode === 'vsHuman') {
        isOwnPiece = (currentPlayer === 'player1' && isPlayer1Piece) ||
                     (currentPlayer === 'player2' && isPlayer2Piece);
      } else {
        // Mode vsAna : seul player1 joue (pièces noires)
        isOwnPiece = isPlayer1Piece;
      }

      if (selectedCell) {
        const from = toNotation(selectedCell.row, selectedCell.col);
        const to = toNotation(row, col);
        const move1 = `${from}-${to}`;
        const move2 = `${from}x${to}`;

        if (legalMoves.includes(move1)) {
          playCheckers(move1);
        } else if (legalMoves.includes(move2)) {
          playCheckers(move2);
        } else if (isOwnPiece) {
          setSelectedCell({ row, col });
        } else {
          setSelectedCell(null);
        }
      } else if (isOwnPiece) {
        setSelectedCell({ row, col });
      }
    };

    if (!gameState?.boardData) {
      return (
        <div className="no-game">
          <p>Jouer aux Dames!</p>
          <div className="game-controls">
            {/* Sélecteur de mode */}
            <div className="mode-selector">
              <button
                className={`mode-btn ${mode === 'vsAna' ? 'active' : ''}`}
                onClick={() => setMode('vsAna')}
              >
                vs Ana
              </button>
              <button
                className={`mode-btn ${mode === 'vsHuman' ? 'active' : ''}`}
                onClick={() => setMode('vsHuman')}
              >
                2 Joueurs
              </button>
            </div>
            {/* Difficulté (seulement en mode vs Ana) */}
            {mode === 'vsAna' && (
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="easy">Facile</option>
                <option value="normal">Normal</option>
                <option value="hard">Difficile</option>
              </select>
            )}
            <button className="btn-new-game" onClick={startCheckers} disabled={isLoading}>
              Commencer
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Indicateur de tour en mode 2 joueurs */}
        {gameState.mode === 'vsHuman' && gameState.status === 'playing' && (
          <div className="turn-indicator">
            Tour de {gameState.currentPlayer === 'player1' ? 'Joueur 1 (●)' : 'Joueur 2 (○)'}
          </div>
        )}
        <div className="checkers-board">
          {gameState.boardData.map((row, r) => (
            <div key={r} className="board-row">
              {row.map((cell, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                const from = selectedCell ? toNotation(selectedCell.row, selectedCell.col) : '';
                const to = toNotation(r, c);
                const isLegal = legalMoves.includes(`${from}-${to}`) || legalMoves.includes(`${from}x${to}`);
                return (
                  <div key={c}
                       className={`board-cell ${isDark ? 'dark' : 'light'} ${isSelected ? 'selected' : ''} ${isLegal ? 'legal-move' : ''}`}
                       onClick={() => handleClick(r, c)}>
                    {cell === 1 && <span className="piece player">●</span>}
                    {cell === 2 && <span className="piece player dame">◆</span>}
                    {cell === 3 && <span className="piece ana">○</span>}
                    {cell === 4 && <span className="piece ana dame">◇</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {gameState.status && gameState.status !== 'playing' && (
          <div className={`game-over ${gameState.status.includes('player1') || gameState.status === 'player_wins' ? 'win' : 'lose'}`}>
            {gameState.mode === 'vsHuman' ? (
              gameState.status === 'player1_wins' ? '🎉 Joueur 1 gagne!' : '🎉 Joueur 2 gagne!'
            ) : (
              gameState.status === 'player_wins' || gameState.status === 'player1_wins' ? '🎉 Tu gagnes!' : '😢 Ana gagne!'
            )}
          </div>
        )}
        <button className="btn-new-game" onClick={startCheckers}>Nouvelle partie</button>
      </>
    );
  };

  // ==================== TIC-TAC-TOE ====================
  const TicTacToeGame = () => {
    const [mode, setMode] = useState('vsAna'); // 'vsAna' ou 'vsHuman'

    const startGame = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/tictactoe/new`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', mode })
        });
        const data = await res.json();
        setGameState(data);
        if (data.reaction) addMessage(data.reaction);
      } catch (e) { addMessage("Erreur de connexion"); }
      setIsLoading(false);
    };

    const play = async (row, col) => {
      if (!gameState || gameState.status !== 'playing' || isLoading) return;
      if (gameState.board?.[row]?.[col] !== 0) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/tictactoe/play`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', row, col })
        });
        const data = await res.json();
        if (data.success !== false) {
          setGameState(data);
          // Messages adaptés selon le mode
          if (data.mode === 'vsHuman' && !data.gameOver) {
            addMessage(data.message || `Au tour de ${data.currentPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'}`);
          } else if (data.reaction) {
            addMessage(data.reaction);
          }
          if (data.gameOver && data.message) {
            addMessage(data.message);
          }
        } else {
          addMessage(data.error);
        }
      } catch (e) { addMessage("Erreur"); }
      setIsLoading(false);
    };

    if (!gameState) {
      return (
        <div className="no-game">
          <p>Jouer au Morpion!</p>
          <div className="game-controls">
            {/* Sélecteur de mode */}
            <div className="mode-selector">
              <button
                className={`mode-btn ${mode === 'vsAna' ? 'active' : ''}`}
                onClick={() => setMode('vsAna')}
              >
                vs Ana
              </button>
              <button
                className={`mode-btn ${mode === 'vsHuman' ? 'active' : ''}`}
                onClick={() => setMode('vsHuman')}
              >
                2 Joueurs
              </button>
            </div>
            <button className="btn-new-game" onClick={startGame}>Commencer</button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Indicateur de tour en mode 2 joueurs */}
        {gameState.mode === 'vsHuman' && gameState.status === 'playing' && (
          <div className="turn-indicator">
            Tour de {gameState.currentPlayer === 'player1' ? 'Joueur 1 (X)' : 'Joueur 2 (O)'}
          </div>
        )}
        <div className="tictactoe-board">
          {(gameState.board || [[0,0,0],[0,0,0],[0,0,0]]).map((row, r) => (
            row.map((cell, c) => (
              <div key={`${r}-${c}`}
                   className={`ttt-cell ${cell !== 0 ? 'taken' : ''} ${cell === 1 ? 'X' : ''} ${cell === 2 ? 'O' : ''}`}
                   onClick={() => play(r, c)}>
                {cell === 1 && 'X'}
                {cell === 2 && 'O'}
              </div>
            ))
          ))}
        </div>
        {gameState.status && gameState.status !== 'playing' && (
          <div className={`game-over ${gameState.status.includes('player1') || gameState.status === 'player_wins' ? 'win' : gameState.status === 'draw' ? 'tie' : 'lose'}`}>
            {gameState.mode === 'vsHuman' ? (
              <>
                {gameState.status === 'player1_wins' && '🎉 Joueur 1 gagne!'}
                {gameState.status === 'player2_wins' && '🎉 Joueur 2 gagne!'}
                {gameState.status === 'draw' && '🤝 Match nul!'}
              </>
            ) : (
              <>
                {gameState.status === 'player_wins' && '🎉 Tu gagnes!'}
                {gameState.status === 'ana_wins' && '😢 Ana gagne!'}
                {gameState.status === 'draw' && '🤝 Match nul!'}
              </>
            )}
          </div>
        )}
        <button className="btn-new-game" onClick={startGame}>Nouvelle partie</button>
      </>
    );
  };

  // ==================== CONNECT 4 ====================
  const Connect4Game = () => {
    const [mode, setMode] = useState('vsAna');

    const startGame = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/connect4/new`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', mode })
        });
        const data = await res.json();
        setGameState(data);
        if (data.reaction) addMessage(data.reaction);
      } catch (e) { addMessage("Erreur de connexion"); }
      setIsLoading(false);
    };

    const play = async (col) => {
      if (!gameState || gameState.status !== 'playing' || isLoading) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/connect4/play`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', col })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        }
      } catch (e) { addMessage("Erreur"); }
      setIsLoading(false);
    };

    if (!gameState) {
      return (
        <div className="no-game">
          <p>Jouer au Puissance 4!</p>
          <div className="mode-selector">
            <button className={`mode-btn ${mode === 'vsAna' ? 'active' : ''}`} onClick={() => setMode('vsAna')}>vs Ana</button>
            <button className={`mode-btn ${mode === 'vsHuman' ? 'active' : ''}`} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
          </div>
          <button className="btn-new-game" onClick={startGame}>Commencer</button>
        </div>
      );
    }

    return (
      <>
        {/* Indicateur de tour en mode 2 joueurs */}
        {gameState.mode === 'vsHuman' && gameState.status === 'playing' && (
          <div className="turn-indicator">
            Tour de {gameState.currentPlayer === 'player1' ? 'Joueur 1 (Rouge)' : 'Joueur 2 (Jaune)'}
          </div>
        )}
        <div className="connect4-container">
          <div className="connect4-drop-buttons">
            {[0,1,2,3,4,5,6].map(c => (
              <button key={c} className="drop-btn" onClick={() => play(c)} disabled={isLoading || gameState.status !== 'playing'}>
                ⬇
              </button>
            ))}
          </div>
          <div className="connect4-board">
            {(gameState.board || []).map((row, r) => (
              row.map((cell, c) => (
                <div key={`${r}-${c}`} className={`c4-cell ${cell === 1 ? 'player' : ''} ${cell === 2 ? 'ana' : ''}`} />
              ))
            ))}
          </div>
        </div>
        {gameState.status && gameState.status !== 'playing' && (
          <div className={`game-over ${
            gameState.mode === 'vsHuman'
              ? (gameState.status === 'player1_wins' || gameState.status === 'player2_wins' ? 'win' : 'tie')
              : (gameState.status === 'player_wins' ? 'win' : gameState.status === 'ana_wins' ? 'lose' : 'tie')
          }`}>
            {gameState.mode === 'vsHuman' ? (
              <>
                {gameState.status === 'player1_wins' && '🎉 Joueur 1 gagne!'}
                {gameState.status === 'player2_wins' && '🎉 Joueur 2 gagne!'}
                {gameState.status === 'draw' && '🤝 Match nul!'}
              </>
            ) : (
              <>
                {gameState.status === 'player_wins' && '🎉 Tu gagnes!'}
                {gameState.status === 'ana_wins' && '😢 Ana gagne!'}
                {gameState.status === 'draw' && '🤝 Match nul!'}
              </>
            )}
          </div>
        )}
        <div className="mode-selector" style={{marginTop: '1rem'}}>
          <button className={`mode-btn ${(gameState.mode || mode) === 'vsAna' ? 'active' : ''}`} onClick={() => setMode('vsAna')}>vs Ana</button>
          <button className={`mode-btn ${(gameState.mode || mode) === 'vsHuman' ? 'active' : ''}`} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
        </div>
        <button className="btn-new-game" onClick={startGame}>Nouvelle partie</button>
      </>
    );
  };

  // ==================== RPS ====================
  const RPSGame = () => {
    const [result, setResult] = useState(null);
    const [mode, setMode] = useState('vsAna'); // 'vsAna' ou 'vsHuman'
    const [phase, setPhase] = useState('player1'); // player1, player2, reveal

    const startGame = async () => {
      setResult(null);
      setPhase('player1');
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/rps/new`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', mode })
        });
        const data = await res.json();
        setGameState(data);
        if (data.reaction) addMessage(data.reaction);
      } catch (e) { addMessage("Erreur de connexion"); }
    };

    const play = async (choice) => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/rps/play`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', choice })
        });
        const data = await res.json();
        console.log('RPS response:', data);
        if (data.success) {
          setResult(data);
          setGameState(data);
          if (data.phase) setPhase(data.phase);
          if (data.reaction) addMessage(data.reaction);
        } else {
          addMessage(data.error || "Erreur");
        }
      } catch (e) {
        console.error('RPS error:', e);
        addMessage("Erreur de connexion");
      } finally {
        setIsLoading(false);
      }
    };

    const EMOJIS = { rock: '🪨', paper: '📄', scissors: '✂️' };

    // Mode 2 joueurs
    if (mode === 'vsHuman' || gameState?.mode === 'vsHuman') {
      const score = gameState?.score || { player1: 0, player2: 0, ties: 0 };

      return (
        <div className="rps-game">
          {!gameState && (
            <div className="mode-selector">
              <button className={mode === 'vsAna' ? 'active' : ''} onClick={() => setMode('vsAna')}>vs Ana</button>
              <button className={mode === 'vsHuman' ? 'active' : ''} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
            </div>
          )}

          <div className="rps-score">
            <span>J1: {score.player1}</span>
            <span>J2: {score.player2}</span>
            <span>Nuls: {score.ties}</span>
          </div>

          {phase === 'player1' && (
            <div className="turn-indicator">Tour de Joueur 1 (choix caché)</div>
          )}
          {phase === 'player2' && (
            <div className="turn-indicator">Tour de Joueur 2</div>
          )}

          {phase !== 'reveal' && (
            <div className="rps-choices">
              <button className="rps-btn" onClick={() => play('rock')} disabled={isLoading}>🪨</button>
              <button className="rps-btn" onClick={() => play('paper')} disabled={isLoading}>📄</button>
              <button className="rps-btn" onClick={() => play('scissors')} disabled={isLoading}>✂️</button>
            </div>
          )}

          {result?.phase === 'reveal' && (
            <div className="rps-result">
              <div>
                <span>J1: </span>
                <span className="player-choice">{result.player1Emoji}</span>
              </div>
              <span className="vs">VS</span>
              <div>
                <span>J2: </span>
                <span className="ana-choice">{result.player2Emoji}</span>
              </div>
            </div>
          )}

          {result?.phase === 'reveal' && (
            <div className={`game-result ${result.winner === 'tie' ? 'tie' : ''}`}>
              {result.winner === 'player1' ? 'Joueur 1 gagne!' : result.winner === 'player2' ? 'Joueur 2 gagne!' : 'Égalité!'}
            </div>
          )}

          <button className="btn-new-game" onClick={startGame}>
            {result?.phase === 'reveal' ? 'Rejouer' : 'Nouvelle partie'}
          </button>
        </div>
      );
    }

    // Mode vsAna (original)
    const score = gameState?.score || { player: 0, ana: 0, ties: 0 };

    return (
      <div className="rps-game">
        {!gameState && (
          <div className="mode-selector">
            <button className={mode === 'vsAna' ? 'active' : ''} onClick={() => setMode('vsAna')}>vs Ana</button>
            <button className={mode === 'vsHuman' ? 'active' : ''} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
          </div>
        )}
        <div className="rps-score">
          <span>Toi: {score.player}</span>
          <span>Ana: {score.ana}</span>
          <span>Nuls: {score.ties}</span>
        </div>
        <div className="rps-choices">
          <button className="rps-btn" onClick={() => play('rock')} disabled={isLoading}>🪨</button>
          <button className="rps-btn" onClick={() => play('paper')} disabled={isLoading}>📄</button>
          <button className="rps-btn" onClick={() => play('scissors')} disabled={isLoading}>✂️</button>
        </div>
        {result && (
          <div className="rps-result">
            <span className="player-choice">{EMOJIS[result.playerChoice]}</span>
            <span className="vs">VS</span>
            <span className="ana-choice">{EMOJIS[result.anaChoice]}</span>
          </div>
        )}
      </div>
    );
  };

  // ==================== HANGMAN ====================
  const HangmanGame = () => {
    const [mode, setMode] = useState('vsAna'); // 'vsAna' ou 'vsHuman'
    const [secretWord, setSecretWord] = useState('');

    const startGame = async () => {
      setIsLoading(true);
      setSecretWord('');
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/hangman/new`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', mode })
        });
        const data = await res.json();
        setGameState(data);
        if (data.reaction) addMessage(data.reaction);
      } catch (e) { addMessage("Erreur de connexion"); }
      setIsLoading(false);
    };

    const submitWord = async () => {
      if (!secretWord || secretWord.length < 2) {
        addMessage("Le mot doit avoir au moins 2 lettres!");
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/hangman/setword`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', word: secretWord })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          setSecretWord('');
          if (data.reaction) addMessage(data.reaction);
        } else {
          addMessage(data.error || "Erreur");
        }
      } catch (e) { addMessage("Erreur de connexion"); }
      setIsLoading(false);
    };

    const guess = async (letter) => {
      if (!gameState || gameState.status !== 'playing' || isLoading) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/hangman/guess`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', letter })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        }
      } catch (e) { addMessage("Erreur"); }
      setIsLoading(false);
    };

    if (!gameState) {
      return (
        <div className="no-game">
          <p>{mode === 'vsHuman' ? 'Pendu 2 joueurs! J1 choisit le mot, J2 devine.' : 'Jouer au Pendu contre Ana!'}</p>
          <div className="mode-selector">
            <button className={mode === 'vsAna' ? 'active' : ''} onClick={() => setMode('vsAna')}>vs Ana</button>
            <button className={mode === 'vsHuman' ? 'active' : ''} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
          </div>
          <button className="btn-new-game" onClick={startGame}>Commencer</button>
        </div>
      );
    }

    // Phase setup en mode 2 joueurs: J1 entre le mot
    if (gameState.mode === 'vsHuman' && gameState.phase === 'setup') {
      return (
        <div className="hangman-game">
          <div className="turn-indicator">Joueur 1: Entre un mot secret</div>
          <input
            type="password"
            className="secret-word-input"
            placeholder="Mot secret..."
            value={secretWord}
            onChange={(e) => setSecretWord(e.target.value.toUpperCase())}
            autoFocus
          />
          <button className="btn-new-game" onClick={submitWord} disabled={isLoading || secretWord.length < 2}>
            Valider le mot
          </button>
          <button className="btn-cancel" onClick={() => setGameState(null)}>Annuler</button>
        </div>
      );
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return (
      <div className="hangman-game">
        {gameState.mode === 'vsHuman' && <div className="turn-indicator">Joueur 2 devine!</div>}
        {gameState.category && gameState.category !== 'custom' && (
          <div className="hangman-category">Catégorie: {gameState.category}</div>
        )}
        <pre className="hangman-figure">{gameState.hangman}</pre>
        <div className="hangman-word">{gameState.display}</div>
        <div className="hangman-errors">Erreurs restantes: {gameState.errorsLeft}</div>
        <div className="hangman-keyboard">
          {alphabet.map(l => (
            <button key={l}
                    className={`letter-btn ${gameState.guessed?.includes(l) ? (gameState.display?.includes(l) ? 'correct' : 'wrong') : ''}`}
                    onClick={() => guess(l)}
                    disabled={gameState.guessed?.includes(l) || gameState.status !== 'playing'}>
              {l}
            </button>
          ))}
        </div>
        {gameState.gameOver && (
          <div className={`game-over ${gameState.winner === 'player' || gameState.winner === 'player2' ? 'win' : 'lose'}`}>
            {gameState.mode === 'vsHuman'
              ? (gameState.winner === 'player2' ? `🎉 J2 gagne! Le mot: ${gameState.word}` : `J1 gagne! Le mot: ${gameState.word}`)
              : (gameState.winner === 'player' ? '🎉 Bravo!' : `😢 Le mot était: ${gameState.word}`)}
          </div>
        )}
        <button className="btn-new-game" onClick={startGame}>Nouveau mot</button>
      </div>
    );
  };

  // ==================== BLACKJACK ====================
  const BlackjackGame = () => {
    const [mode, setMode] = useState('vsAna'); // 'vsAna' ou 'vsHuman'

    const startGame = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/blackjack/new`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', mode })
        });
        const data = await res.json();
        setGameState(data);
        if (data.reaction) addMessage(data.reaction);
      } catch (e) { addMessage("Erreur de connexion"); }
      setIsLoading(false);
    };

    const hit = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/blackjack/hit`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main' })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        }
      } catch (e) { addMessage("Erreur"); }
      setIsLoading(false);
    };

    const stand = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/blackjack/stand`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main' })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        }
      } catch (e) { addMessage("Erreur"); }
      setIsLoading(false);
    };

    const isRed = (card) => card?.includes('♥') || card?.includes('♦');

    if (!gameState) {
      return (
        <div className="no-game">
          <p>{mode === 'vsHuman' ? '2 joueurs contre Ana (croupier)!' : 'Jouer au Blackjack contre Ana!'}</p>
          <div className="mode-selector">
            <button className={mode === 'vsAna' ? 'active' : ''} onClick={() => setMode('vsAna')}>vs Ana</button>
            <button className={mode === 'vsHuman' ? 'active' : ''} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
          </div>
          <button className="btn-new-game" onClick={startGame}>Distribuer</button>
        </div>
      );
    }

    // Mode 2 joueurs
    if (gameState.mode === 'vsHuman') {
      return (
        <div className="blackjack-game">
          {gameState.status === 'playing' && (
            <div className="turn-indicator">
              Tour de: {gameState.currentPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'}
            </div>
          )}
          <div className="blackjack-hands">
            <div className="hand">
              <div className="hand-label">Ana (Croupier)</div>
              <div className="hand-cards">
                {(gameState.anaHand || []).map((c, i) => (
                  <div key={i} className={`bj-card ${c === '🂠' ? 'hidden' : ''} ${isRed(c) ? 'red' : ''}`}>{c}</div>
                ))}
              </div>
              <div className="hand-score">{gameState.anaScore || '?'}</div>
            </div>
            <div className={`hand ${gameState.currentPlayer === 'player1' ? 'active-player' : ''} ${gameState.player1Bust ? 'bust' : ''}`}>
              <div className="hand-label">Joueur 1 {gameState.player1Bust ? '💥' : ''}</div>
              <div className="hand-cards">
                {(gameState.player1Hand || []).map((c, i) => (
                  <div key={i} className={`bj-card ${isRed(c) ? 'red' : ''}`}>{c}</div>
                ))}
              </div>
              <div className="hand-score">{gameState.player1Score}</div>
            </div>
            <div className={`hand ${gameState.currentPlayer === 'player2' ? 'active-player' : ''} ${gameState.player2Bust ? 'bust' : ''}`}>
              <div className="hand-label">Joueur 2 {gameState.player2Bust ? '💥' : ''}</div>
              <div className="hand-cards">
                {(gameState.player2Hand || []).map((c, i) => (
                  <div key={i} className={`bj-card ${isRed(c) ? 'red' : ''}`}>{c}</div>
                ))}
              </div>
              <div className="hand-score">{gameState.player2Score}</div>
            </div>
          </div>
          {gameState.status === 'playing' && (
            <div className="blackjack-actions">
              <button className="bj-btn hit" onClick={hit} disabled={isLoading}>Hit</button>
              <button className="bj-btn stand" onClick={stand} disabled={isLoading}>Stand</button>
            </div>
          )}
          {gameState.gameOver && (
            <div className="game-over-results">
              <div className={`result ${gameState.player1Result}`}>
                J1: {gameState.player1Result === 'win' ? '🎉 Gagne!' : gameState.player1Result === 'push' ? '🤝 Égalité' : '😢 Perd'}
              </div>
              <div className={`result ${gameState.player2Result}`}>
                J2: {gameState.player2Result === 'win' ? '🎉 Gagne!' : gameState.player2Result === 'push' ? '🤝 Égalité' : '😢 Perd'}
              </div>
            </div>
          )}
          <button className="btn-new-game" onClick={startGame}>Nouvelle main</button>
        </div>
      );
    }

    // Mode vsAna (original)
    return (
      <div className="blackjack-game">
        <div className="blackjack-hands">
          <div className="hand">
            <div className="hand-label">Ana</div>
            <div className="hand-cards">
              {(gameState.anaHand || []).map((c, i) => (
                <div key={i} className={`bj-card ${c === '🂠' ? 'hidden' : ''} ${isRed(c) ? 'red' : ''}`}>{c}</div>
              ))}
            </div>
            <div className="hand-score">{gameState.anaScore || '?'}</div>
          </div>
          <div className="hand">
            <div className="hand-label">Toi</div>
            <div className="hand-cards">
              {(gameState.playerHand || []).map((c, i) => (
                <div key={i} className={`bj-card ${isRed(c) ? 'red' : ''}`}>{c}</div>
              ))}
            </div>
            <div className="hand-score">{gameState.playerScore}</div>
          </div>
        </div>
        {gameState.status === 'playing' && (
          <div className="blackjack-actions">
            <button className="bj-btn hit" onClick={hit} disabled={isLoading}>Hit</button>
            <button className="bj-btn stand" onClick={stand} disabled={isLoading}>Stand</button>
          </div>
        )}
        {gameState.gameOver && (
          <div className={`game-over ${gameState.winner === 'player' ? 'win' : gameState.winner === 'ana' ? 'lose' : 'tie'}`}>
            {gameState.winner === 'player' && '🎉 Tu gagnes!'}
            {gameState.winner === 'ana' && '😢 Ana gagne!'}
            {gameState.winner === 'tie' && '🤝 Égalité!'}
          </div>
        )}
        <button className="btn-new-game" onClick={startGame}>Nouvelle main</button>
      </div>
    );
  };

  // ==================== MEMORY ====================
  const MemoryGame = () => {
    const [theme, setTheme] = useState('emojis');
    const [mode, setMode] = useState('vsAna');
    const [waiting, setWaiting] = useState(false);

    // Board depuis gameState
    const board = gameState?.board || [];

    const startGame = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/memory/new`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', size: 4, theme, mode })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          addMessage(data.reaction || `Memory ${data.size}x${data.size} - Trouve les ${data.totalPairs} paires!`);
        }
      } catch (e) {
        addMessage("Erreur de connexion");
      } finally {
        setIsLoading(false);
      }
    };

    const flip = async (cardId) => {
      if (!gameState || isLoading || waiting) return;
      const card = board.find(c => c.id === cardId);
      if (!card || card.revealed || card.matched) return;

      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/memory/flip`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', cardId })
        });
        const data = await res.json();

        if (data.success) {
          if (data.action === 'first_flip') {
            // Montrer la première carte
            setGameState(prev => ({ ...prev, ...data }));
          } else if (data.action === 'match') {
            // Paire trouvée - montrer puis marquer comme matched
            setGameState(prev => ({ ...prev, ...data }));
            addMessage(data.reaction || "Bien joué! Une paire!");
          } else if (data.action === 'no_match') {
            // Montrer les deux cartes d'abord
            setGameState(prev => ({
              ...prev,
              board: prev.board.map(c => {
                if (c.id === data.card1.id) return { ...c, revealed: true, symbol: data.card1.symbol };
                if (c.id === data.card2.id) return { ...c, revealed: true, symbol: data.card2.symbol };
                return c;
              })
            }));

            // Mode 2 joueurs : pas de tour d'Ana
            if (data.mode === 'vsHuman') {
              setWaiting(true);
              setTimeout(() => {
                setGameState(prev => ({
                  ...prev,
                  ...data,
                  board: data.board.map(c => ({ ...c, revealed: c.matched }))
                }));
                setWaiting(false);
                addMessage(data.reaction || data.message);
              }, 1500);
            } else {
              // Mode vsAna
              addMessage("Pas de paire...");

              // Attendre 1.5s pour voir les cartes, puis les cacher
              setWaiting(true);
              setTimeout(() => {
                // Cacher les cartes
                setGameState(prev => ({
                  ...prev,
                  board: prev.board.map(c => ({ ...c, revealed: c.matched, symbol: c.matched ? c.symbol : null }))
                }));

                if (data.anaPlayed) {
                  // Tour d'Ana après 500ms
                  setTimeout(() => {
                    setGameState(prev => ({
                      ...prev,
                      board: prev.board.map(c => {
                        if (c.id === data.anaPlayed.card1.id) return { ...c, revealed: true, symbol: data.anaPlayed.card1.symbol };
                        if (c.id === data.anaPlayed.card2.id) return { ...c, revealed: true, symbol: data.anaPlayed.card2.symbol };
                        return c;
                      })
                    }));

                    addMessage(data.anaPlayed.isMatch ? "Ana a trouvé une paire!" : "Ana n'a pas trouvé...");

                    // Attendre puis finaliser
                    setTimeout(() => {
                      setGameState(prev => ({
                        ...prev,
                        ...data,
                        board: data.board.map(c => ({ ...c, revealed: c.matched }))
                      }));
                      setWaiting(false);
                    }, 1500);
                  }, 500);
                } else {
                  setGameState(prev => ({ ...prev, ...data }));
                  setWaiting(false);
                }
              }, 1500);
            }
          }
        } else {
          addMessage(data.error);
        }
      } catch (e) {
        addMessage("Erreur");
      } finally {
        setIsLoading(false);
      }
    };

    if (!gameState || board.length === 0) {
      return (
        <div className="no-game">
          <p>Jouer au Memory!</p>
          <div className="mode-selector" style={{marginBottom: '1rem'}}>
            <button className={`mode-btn ${mode === 'vsAna' ? 'active' : ''}`} onClick={() => setMode('vsAna')}>vs Ana</button>
            <button className={`mode-btn ${mode === 'vsHuman' ? 'active' : ''}`} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
          </div>
          <div className="memory-theme-selector">
            {['emojis', 'animaux', 'fruits', 'nature'].map(t => (
              <button key={t} className={`theme-btn ${theme === t ? 'active' : ''}`} onClick={() => setTheme(t)}>
                {t}
              </button>
            ))}
          </div>
          <button className="btn-new-game" onClick={startGame} disabled={isLoading} style={{marginTop: '1rem'}}>
            {isLoading ? 'Chargement...' : 'Commencer'}
          </button>
        </div>
      );
    }

    return (
      <div className="memory-game">
        {/* Indicateur de tour en mode 2 joueurs */}
        {gameState.mode === 'vsHuman' && !gameState.gameOver && (
          <div className="turn-indicator">
            Tour de {gameState.currentPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'}
          </div>
        )}
        <div className="memory-info">
          {gameState.mode === 'vsHuman' ? (
            <>
              <span>J1: {gameState.player1Matches || 0}</span>
              <span>J2: {gameState.player2Matches || 0}</span>
            </>
          ) : (
            <>
              <span>Toi: {gameState.playerMatches || 0}</span>
              <span>Ana: {gameState.anaMatches || 0}</span>
            </>
          )}
          {waiting && gameState.mode !== 'vsHuman' && <span style={{color: '#f39c12'}}>Tour d'Ana...</span>}
        </div>
        <div className={`memory-board size-${gameState.size || 4}`}>
          {board.map((card) => (
            <div key={card.id}
                 className={`memory-card ${card.revealed ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`}
                 onClick={() => flip(card.id)}
                 style={{ cursor: waiting || card.matched ? 'default' : 'pointer' }}>
              <div className="memory-card-inner">
                <div className="memory-card-front">?</div>
                <div className="memory-card-back">{card.symbol || '?'}</div>
              </div>
            </div>
          ))}
        </div>
        {gameState.gameOver && (
          <div className={`game-over ${
            gameState.mode === 'vsHuman'
              ? (gameState.status === 'player1_wins' || gameState.status === 'player2_wins' ? 'win' : 'tie')
              : (gameState.status === 'player_wins' ? 'win' : gameState.status === 'ana_wins' ? 'lose' : 'tie')
          }`}>
            {gameState.mode === 'vsHuman' ? (
              <>
                {gameState.status === 'player1_wins' && '🎉 Joueur 1 gagne!'}
                {gameState.status === 'player2_wins' && '🎉 Joueur 2 gagne!'}
                {gameState.status === 'draw' && '🤝 Égalité!'}
              </>
            ) : (
              <>
                {gameState.status === 'player_wins' && '🎉 Tu gagnes!'}
                {gameState.status === 'ana_wins' && '😢 Ana gagne!'}
                {gameState.status === 'draw' && '🤝 Égalité!'}
              </>
            )}
          </div>
        )}
        <div className="mode-selector" style={{marginTop: '1rem'}}>
          <button className={`mode-btn ${(gameState.mode || mode) === 'vsAna' ? 'active' : ''}`} onClick={() => setMode('vsAna')}>vs Ana</button>
          <button className={`mode-btn ${(gameState.mode || mode) === 'vsHuman' ? 'active' : ''}`} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
        </div>
        <button className="btn-new-game" onClick={startGame}>Nouvelle partie</button>
      </div>
    );
  };

  // ==================== NIM ====================
  const NimGame = () => {
    const [mode, setMode] = useState('vsAna');

    const startGame = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/nim/new`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', mode })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        }
      } catch (e) { addMessage("Erreur de connexion"); }
      finally { setIsLoading(false); }
    };

    const play = async (pile, take) => {
      if (!gameState || gameState.status !== 'playing' || isLoading) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/nim/play`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', pile, take })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        } else {
          addMessage(data.error);
        }
      } catch (e) { addMessage("Erreur"); }
      finally { setIsLoading(false); }
    };

    if (!gameState) {
      return (
        <div className="no-game">
          <p>Jeu de Nim: retire des bâtonnets, celui qui prend le dernier perd!</p>
          <div className="mode-selector">
            <button className={`mode-btn ${mode === 'vsAna' ? 'active' : ''}`} onClick={() => setMode('vsAna')}>vs Ana</button>
            <button className={`mode-btn ${mode === 'vsHuman' ? 'active' : ''}`} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
          </div>
          <button className="btn-new-game" onClick={startGame} disabled={isLoading}>Commencer</button>
        </div>
      );
    }

    return (
      <div className="nim-game">
        {/* Indicateur de tour en mode 2 joueurs */}
        {gameState.mode === 'vsHuman' && gameState.status === 'playing' && (
          <div className="turn-indicator">
            Tour de {gameState.currentPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'}
          </div>
        )}
        <div className="nim-piles">
          {(gameState.piles || []).map((count, pileIdx) => (
            <div key={pileIdx} className="nim-pile">
              <div className="pile-label">Pile {pileIdx + 1}</div>
              <div className="pile-sticks">
                {Array(count).fill(0).map((_, i) => (
                  <span key={i} className="stick">|</span>
                ))}
                {count === 0 && <span className="empty">vide</span>}
              </div>
              <div className="pile-count">{count} bâtonnet{count > 1 ? 's' : ''}</div>
              {count > 0 && gameState.status === 'playing' && (
                <div className="pile-buttons">
                  {Array(Math.min(count, 5)).fill(0).map((_, i) => (
                    <button key={i} onClick={() => play(pileIdx, i + 1)} disabled={isLoading}>
                      -{i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {gameState.gameOver && (
          <div className={`game-over ${
            gameState.mode === 'vsHuman'
              ? 'win'
              : (gameState.winner === 'player' ? 'win' : 'lose')
          }`}>
            {gameState.mode === 'vsHuman' ? (
              gameState.winner === 'player1' ? '🎉 Joueur 1 gagne!' : '🎉 Joueur 2 gagne!'
            ) : (
              gameState.winner === 'player' ? '🎉 Tu gagnes!' : '😢 Ana gagne!'
            )}
          </div>
        )}
        <div className="mode-selector" style={{marginTop: '1rem'}}>
          <button className={`mode-btn ${(gameState.mode || mode) === 'vsAna' ? 'active' : ''}`} onClick={() => setMode('vsAna')}>vs Ana</button>
          <button className={`mode-btn ${(gameState.mode || mode) === 'vsHuman' ? 'active' : ''}`} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
        </div>
        <button className="btn-new-game" onClick={startGame}>Nouvelle partie</button>
      </div>
    );
  };

  // ==================== GUESS ====================
  const GuessGame = () => {
    const [inputValue, setInputValue] = useState('');
    const [mode, setMode] = useState('vsAna');
    const [secretInput, setSecretInput] = useState('');

    const startGame = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/guess/new`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', max: 100, mode })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        }
      } catch (e) { addMessage("Erreur de connexion"); }
      finally { setIsLoading(false); }
    };

    const setNumber = async () => {
      if (!secretInput || isLoading) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/guess/setnumber`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', number: parseInt(secretInput) })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(prev => ({ ...prev, ...data }));
          setSecretInput('');
          if (data.reaction) addMessage(data.reaction);
        } else {
          addMessage(data.error);
        }
      } catch (e) { addMessage("Erreur"); }
      finally { setIsLoading(false); }
    };

    const guess = async () => {
      if (!inputValue || isLoading) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/guess/try`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', number: parseInt(inputValue) })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(prev => ({ ...prev, ...data }));
          if (data.reaction) addMessage(data.reaction);
          setInputValue('');
        } else {
          addMessage(data.error);
        }
      } catch (e) { addMessage("Erreur"); }
      finally { setIsLoading(false); }
    };

    const giveUp = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/guess/giveup`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main' })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(prev => ({ ...prev, ...data }));
          if (data.reaction) addMessage(data.reaction);
        }
      } catch (e) { addMessage("Erreur"); }
      finally { setIsLoading(false); }
    };

    if (!gameState) {
      return (
        <div className="no-game">
          <p>{mode === 'vsHuman' ? 'Joueur 1 choisit un nombre, Joueur 2 devine!' : 'Ana choisit un nombre entre 1 et 100. À toi de le deviner!'}</p>
          <div className="mode-selector">
            <button className={mode === 'vsAna' ? 'active' : ''} onClick={() => setMode('vsAna')}>vs Ana</button>
            <button className={mode === 'vsHuman' ? 'active' : ''} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
          </div>
          <button className="btn-new-game" onClick={startGame} disabled={isLoading}>Commencer</button>
        </div>
      );
    }

    // Phase setup pour mode vsHuman: J1 entre le nombre secret
    if (gameState.mode === 'vsHuman' && gameState.phase === 'setup') {
      return (
        <div className="guess-game">
          <div className="turn-indicator">Joueur 1 - Entre ton nombre secret!</div>
          <div className="guess-input">
            <input
              type="password"
              value={secretInput}
              onChange={e => setSecretInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && setNumber()}
              placeholder="Nombre secret (1-100)..."
              maxLength={3}
            />
            <button onClick={setNumber} disabled={isLoading || !secretInput}>Confirmer</button>
          </div>
          <p className="hint">Joueur 2: ne regarde pas!</p>
        </div>
      );
    }

    return (
      <div className="guess-game">
        {gameState.mode === 'vsHuman' && gameState.status === 'playing' && (
          <div className="turn-indicator">Joueur 2 - À toi de deviner!</div>
        )}
        <div className="guess-info">
          <span>Nombre entre 1 et {gameState.max || 100}</span>
          <span>Essais: {gameState.attempts || 0}</span>
        </div>
        {gameState.status === 'playing' ? (
          <>
            <div className="guess-input">
              <input
                type="number"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && guess()}
                placeholder="Ton nombre..."
                min="1"
                max={gameState.max || 100}
              />
              <button onClick={guess} disabled={isLoading || !inputValue}>Deviner</button>
            </div>
            <button className="btn-giveup" onClick={giveUp}>Abandonner</button>
          </>
        ) : (
          <div className={`game-over ${gameState.status === 'won' ? 'win' : 'lose'}`}>
            {gameState.status === 'won'
              ? (gameState.mode === 'vsHuman'
                  ? `🎉 Joueur 2 a trouvé ${gameState.secret} en ${gameState.attempts} essais!`
                  : `🎉 Trouvé en ${gameState.attempts} essais!`)
              : (gameState.mode === 'vsHuman'
                  ? `🏆 Joueur 1 gagne! Le nombre était ${gameState.secret}`
                  : `😅 C'était ${gameState.secret}`)}
          </div>
        )}
        <button className="btn-new-game" onClick={startGame}>Nouvelle partie</button>
      </div>
    );
  };

  // ==================== CHESS ====================
  const ChessGame = () => {
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [difficulty, setDifficulty] = useState('normal');
    const [mode, setMode] = useState('vsAna');
    const [moveInput, setMoveInput] = useState('');

    // legalMoves depuis gameState
    const legalMoves = gameState?.legalMoves || [];

    const startGame = async () => {
      setIsLoading(true);
      setSelectedSquare(null);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/chess/new`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', difficulty, mode })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        } else {
          addMessage(data.error || "Erreur au démarrage");
        }
      } catch (e) {
        addMessage("Erreur de connexion");
      }
      finally { setIsLoading(false); }
    };

    const play = async (moveStr) => {
      if (!gameState || gameState.status !== 'playing' || isLoading) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/chess/play`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', move: moveStr })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        } else {
          addMessage(data.error);
        }
      } catch (e) { addMessage("Erreur"); }
      finally {
        setIsLoading(false);
        setSelectedSquare(null);
        setMoveInput('');
      }
    };

    const getHint = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/chess/hint?session=main`);
        const data = await res.json();
        if (data.success && data.reaction) addMessage(data.reaction);
      } catch (e) { addMessage("Erreur"); }
    };

    const toNotation = (r, c) => String.fromCharCode(97 + c) + (8 - r);

    const handleSquareClick = (row, col) => {
      if (!gameState || gameState.status !== 'playing' || isLoading) return;

      const piece = gameState.board?.[row]?.[col];
      // En mode vsHuman, le joueur courant joue ses pièces
      const isCurrentPlayerPiece = gameState.mode === 'vsHuman'
        ? (gameState.isWhiteTurn ? (piece >= 1 && piece <= 6) : (piece >= 7 && piece <= 12))
        : (piece >= 1 && piece <= 6);  // vsAna: blancs seulement

      if (selectedSquare) {
        const from = toNotation(selectedSquare.row, selectedSquare.col);
        const to = toNotation(row, col);
        const moveStr = `${from}-${to}`;

        if (legalMoves.includes(moveStr)) {
          play(moveStr);
        } else if (isCurrentPlayerPiece) {
          setSelectedSquare({ row, col });
        } else {
          setSelectedSquare(null);
        }
      } else if (isCurrentPlayerPiece) {
        setSelectedSquare({ row, col });
      }
    };

    const handleMoveSubmit = () => {
      if (moveInput.length >= 4) {
        play(moveInput);
      }
    };

    const PIECE_SYMBOLS = {
      1: '♔', 2: '♕', 3: '♖', 4: '♗', 5: '♘', 6: '♙',
      7: '♚', 8: '♛', 9: '♜', 10: '♝', 11: '♞', 12: '♟'
    };

    if (!gameState) {
      return (
        <div className="no-game">
          <p>Jouer aux Échecs!</p>
          <div className="mode-selector" style={{marginBottom: '1rem'}}>
            <button className={`mode-btn ${mode === 'vsAna' ? 'active' : ''}`} onClick={() => setMode('vsAna')}>vs Ana</button>
            <button className={`mode-btn ${mode === 'vsHuman' ? 'active' : ''}`} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
          </div>
          {mode === 'vsAna' && (
            <div className="game-controls" style={{marginBottom: '1rem'}}>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="easy">Facile</option>
                <option value="normal">Normal</option>
                <option value="hard">Difficile</option>
              </select>
            </div>
          )}
          <button className="btn-new-game" onClick={startGame} disabled={isLoading}>
            Commencer
          </button>
        </div>
      );
    }

    return (
      <div className="chess-game">
        {/* Indicateur de tour */}
        {gameState.mode === 'vsHuman' && gameState.status === 'playing' && (
          <div className="turn-indicator">
            Tour de {gameState.currentPlayer === 'player1' ? 'Joueur 1 (Blancs)' : 'Joueur 2 (Noirs)'}
          </div>
        )}
        <div className="chess-info">
          {gameState.inCheck && <span className="in-check">ÉCHEC!</span>}
          {gameState.mode !== 'vsHuman' && (
            <span>{gameState.isWhiteTurn ? "Ton tour (Blancs)" : "Tour d'Ana (Noirs)"}</span>
          )}
        </div>
        <div className="chess-board">
          {(gameState.board || []).map((row, r) => (
            <div key={r} className="chess-row">
              <div className="row-label">{8 - r}</div>
              {row.map((piece, c) => {
                const isLight = (r + c) % 2 === 0;
                const isSelected = selectedSquare?.row === r && selectedSquare?.col === c;
                const from = selectedSquare ? toNotation(selectedSquare.row, selectedSquare.col) : '';
                const to = toNotation(r, c);
                const isLegal = legalMoves.includes(`${from}-${to}`);

                return (
                  <div key={c}
                       className={`chess-square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isLegal ? 'legal' : ''}`}
                       onClick={() => handleSquareClick(r, c)}>
                    {piece !== 0 && (
                      <span className={`chess-piece ${piece <= 6 ? 'white' : 'black'}`}>
                        {PIECE_SYMBOLS[piece]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="col-labels">
            <div className="corner"></div>
            {['a','b','c','d','e','f','g','h'].map(l => (
              <div key={l} className="col-label">{l}</div>
            ))}
          </div>
        </div>
        <div className="chess-controls">
          <div className="move-input">
            <input
              type="text"
              value={moveInput}
              onChange={e => setMoveInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleMoveSubmit()}
              placeholder="Ex: e2-e4"
              maxLength={5}
            />
            <button onClick={handleMoveSubmit} disabled={isLoading || moveInput.length < 4}>Jouer</button>
          </div>
          <button className="btn-hint" onClick={getHint} disabled={isLoading}>💡 Indice</button>
        </div>
        {gameState.gameOver && (
          <div className={`game-over ${
            gameState.mode === 'vsHuman'
              ? (gameState.status === 'player1_wins' || gameState.status === 'player2_wins' ? 'win' : 'tie')
              : (gameState.status === 'player_wins' ? 'win' : gameState.status === 'ana_wins' ? 'lose' : 'tie')
          }`}>
            {gameState.mode === 'vsHuman' ? (
              <>
                {gameState.status === 'player1_wins' && '🎉 Échec et mat! Joueur 1 gagne!'}
                {gameState.status === 'player2_wins' && '🎉 Échec et mat! Joueur 2 gagne!'}
                {gameState.status === 'stalemate' && '🤝 Pat! Match nul!'}
              </>
            ) : (
              <>
                {gameState.status === 'player_wins' && '🎉 Échec et mat! Tu gagnes!'}
                {gameState.status === 'ana_wins' && '😢 Échec et mat! Ana gagne!'}
                {gameState.status === 'stalemate' && '🤝 Pat! Match nul!'}
              </>
            )}
          </div>
        )}
        <div className="mode-selector" style={{marginTop: '1rem'}}>
          <button className={`mode-btn ${(gameState.mode || mode) === 'vsAna' ? 'active' : ''}`} onClick={() => setMode('vsAna')}>vs Ana</button>
          <button className={`mode-btn ${(gameState.mode || mode) === 'vsHuman' ? 'active' : ''}`} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
        </div>
        <button className="btn-new-game" onClick={startGame}>Nouvelle partie</button>
      </div>
    );
  };

  // ==================== BATTLESHIP ====================
  const BattleshipGame = () => {
    const [horizontal, setHorizontal] = useState(true);
    const [mode, setMode] = useState('vsAna');
    const COLS = 'ABCDEFGHIJ';

    const startGame = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/battleship/new`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', mode })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        }
      } catch (e) { addMessage("Erreur de connexion"); }
      finally { setIsLoading(false); }
    };

    const placeShip = async (coord) => {
      if (!gameState || isLoading) return;
      // Mode vsHuman: placement1 ou placement2
      if (gameState.mode === 'vsHuman') {
        if (gameState.phase !== 'placement1' && gameState.phase !== 'placement2') return;
      } else {
        if (gameState.phase !== 'placement') return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/battleship/place`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', coord, horizontal })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
          if (data.message) addMessage(data.message);
        } else {
          addMessage(data.error);
        }
      } catch (e) { addMessage("Erreur"); }
      finally { setIsLoading(false); }
    };

    const fire = async (coord) => {
      if (!gameState || gameState.phase !== 'battle' || isLoading) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/battleship/fire`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', coord })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          // Messages de résultat
          if (gameState.mode === 'vsHuman') {
            const shot = data.shot;
            let msg = shot.hit ? `Touché en ${shot.coord}!` : `Raté en ${shot.coord}`;
            if (shot.sunk) msg += ` ${shot.shipName} coulé!`;
            addMessage(msg);
            if (data.gameOver) {
              addMessage(data.winner === 'player1' ? '🎉 Joueur 1 gagne!' : '🎉 Joueur 2 gagne!');
            }
          } else {
            const ps = data.playerShot;
            let msg = ps.hit ? `Touché en ${ps.coord}!` : `Raté en ${ps.coord}`;
            if (ps.sunk) msg += ` ${ps.shipName} coulé!`;
            const as = data.anaShot;
            if (as) {
              msg += as.hit ? ` Ana touche en ${as.coord}!` : ` Ana rate en ${as.coord}`;
              if (as.sunk) msg += ` Ton ${as.shipName} est coulé!`;
            }
            addMessage(msg);
            if (data.gameOver) {
              addMessage(data.winner === 'player' ? '🎉 Victoire! Tu as coulé toute la flotte!' : '😢 Défaite! Ana a coulé ta flotte!');
            }
          }
        } else {
          addMessage(data.error);
        }
      } catch (e) { addMessage("Erreur"); }
      finally { setIsLoading(false); }
    };

    const renderCell = (row, col, grid, onClick, isShots = false) => {
      const cell = grid?.[row]?.[col];
      const content = cell?.content || '~';
      const isHit = content === 'X';
      const isMiss = content === 'O';
      const isShip = !isShots && content !== '~' && content !== 'hit' && content !== 'miss';
      return (
        <div
          key={col}
          className={`bs-cell ${isHit ? 'hit' : ''} ${isMiss ? 'miss' : ''} ${isShip ? 'ship' : ''}`}
          onClick={() => onClick(`${COLS[col]}${row + 1}`)}
        >
          {isHit ? '💥' : isMiss ? '○' : isShip ? '■' : ''}
        </div>
      );
    };

    if (!gameState) {
      return (
        <div className="no-game">
          <p>🚢 {mode === 'vsHuman' ? 'Bataille Navale 2 joueurs!' : 'Bataille Navale: Place tes 5 bateaux et coule la flotte d\'Ana!'}</p>
          <div className="mode-selector">
            <button className={mode === 'vsAna' ? 'active' : ''} onClick={() => setMode('vsAna')}>vs Ana</button>
            <button className={mode === 'vsHuman' ? 'active' : ''} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
          </div>
          <button className="btn-new-game" onClick={startGame} disabled={isLoading}>Commencer</button>
        </div>
      );
    }

    // Phases de placement
    const isPlacement = gameState.phase === 'placement' || gameState.phase === 'placement1' || gameState.phase === 'placement2';

    return (
      <div className="battleship-game">
        {/* Indicateur de joueur pour mode vsHuman */}
        {gameState.mode === 'vsHuman' && (
          <div className="turn-indicator">
            {gameState.phase === 'placement1' && 'Joueur 1 - Place tes bateaux'}
            {gameState.phase === 'placement2' && 'Joueur 2 - Place tes bateaux'}
            {gameState.phase === 'battle' && `Tour de ${gameState.currentPlayer === 'player1' ? 'Joueur 1' : 'Joueur 2'}`}
          </div>
        )}

        {isPlacement && gameState.currentShip && (
          <div className="bs-placement">
            <p>Place le {gameState.currentShip.name} ({gameState.currentShip.size} cases)</p>
            <button onClick={() => setHorizontal(!horizontal)}>
              {horizontal ? '↔️ Horizontal' : '↕️ Vertical'}
            </button>
          </div>
        )}

        <div className="bs-boards">
          <div className="bs-board">
            <h4>{gameState.mode === 'vsHuman'
              ? (gameState.phase === 'battle' ? 'Tes tirs' : 'Ta flotte')
              : 'Ta flotte'}</h4>
            <div className="bs-grid">
              {Array(10).fill(0).map((_, r) => (
                <div key={r} className="bs-row">
                  {Array(10).fill(0).map((_, c) => renderCell(r, c,
                    gameState.mode === 'vsHuman' && gameState.phase === 'battle'
                      ? gameState.shotsGrid
                      : gameState.playerGrid,
                    isPlacement ? placeShip : (gameState.phase === 'battle' ? fire : () => {}),
                    gameState.mode === 'vsHuman' && gameState.phase === 'battle'
                  ))}
                </div>
              ))}
            </div>
          </div>

          {gameState.phase === 'battle' && gameState.mode !== 'vsHuman' && (
            <div className="bs-board">
              <h4>Flotte ennemie</h4>
              <div className="bs-grid">
                {Array(10).fill(0).map((_, r) => (
                  <div key={r} className="bs-row">
                    {Array(10).fill(0).map((_, c) => renderCell(r, c, gameState.shotsGrid, fire, true))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status des bateaux */}
        {gameState.phase === 'battle' && (
          <div className="bs-status">
            {gameState.mode === 'vsHuman' ? (
              <>
                <div>Mes bateaux: {gameState.myShipsStatus?.filter(s => !s.sunk).length || 5} restants</div>
                <div>Bateaux ennemis: {gameState.enemyShipsStatus?.filter(s => !s.sunk).length || 5} restants</div>
              </>
            ) : (
              <>
                <div>Tes bateaux: {gameState.playerShipsStatus?.filter(s => !s.sunk).length || 0} restants</div>
                <div>Bateaux Ana: {gameState.anaShipsStatus?.filter(s => !s.sunk).length || 0} restants</div>
              </>
            )}
          </div>
        )}

        {gameState.gameOver && (
          <div className={`game-over ${(gameState.winner === 'player' || gameState.winner === 'player1' || gameState.winner === 'player2') ? 'win' : 'lose'}`}>
            {gameState.mode === 'vsHuman'
              ? (gameState.winner === 'player1' ? '🎉 Joueur 1 gagne!' : '🎉 Joueur 2 gagne!')
              : (gameState.winner === 'player' ? '🎉 Victoire!' : '😢 Ana gagne!')}
          </div>
        )}
        <button className="btn-new-game" onClick={startGame}>Nouvelle partie</button>
      </div>
    );
  };


  // ==================== BACKGAMMON ====================
  const BackgammonGame = () => {
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [mode, setMode] = useState('vsAna'); // 'vsAna' ou 'vsHuman'

    const startGame = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/backgammon/new`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', mode })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        }
      } catch (e) { addMessage("Erreur de connexion"); }
      finally { setIsLoading(false); }
    };

    const rollDice = async () => {
      if (!gameState || gameState.phase !== 'rolling' || isLoading) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/backgammon/roll`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main' })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          if (data.reaction) addMessage(data.reaction);
        }
      } catch (e) { addMessage("Erreur"); }
      finally { setIsLoading(false); }
    };

    const makeMove = async (from, to, die) => {
      if (!gameState || gameState.phase !== 'moving' || isLoading) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/games/backgammon/move`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: 'main', from, to, die })
        });
        const data = await res.json();
        if (data.success) {
          setGameState(data);
          setSelectedPoint(null);
          if (data.reaction) addMessage(data.reaction);
        } else {
          addMessage(data.error || "Mouvement invalide");
        }
      } catch (e) { addMessage("Erreur"); }
      finally { setIsLoading(false); }
    };

    const handlePointClick = (pointIndex) => {
      if (!gameState || gameState.phase !== 'moving') return;

      const isWhite = gameState.currentPlayer === 'white';
      const pieces = gameState.board[pointIndex];
      const hasPiece = isWhite ? pieces > 0 : pieces < 0;

      if (selectedPoint === null) {
        // Selectionner un point avec nos pieces
        if (hasPiece || (isWhite && gameState.bar?.white > 0 && pointIndex === 'bar')) {
          setSelectedPoint(pointIndex);
        }
      } else {
        // Tenter le mouvement
        const validMove = gameState.validMoves?.find(m =>
          m.from === selectedPoint && m.to === pointIndex
        );
        if (validMove) {
          makeMove(selectedPoint, pointIndex, validMove.die);
        } else {
          // Deselectionner ou selectionner autre
          if (hasPiece) {
            setSelectedPoint(pointIndex);
          } else {
            setSelectedPoint(null);
          }
        }
      }
    };

    const handleBarClick = () => {
      const isWhite = gameState?.currentPlayer === 'white';
      const isBlack = gameState?.currentPlayer === 'black';

      // En mode vsHuman, les deux joueurs peuvent cliquer sur la barre
      if (mode === 'vsHuman') {
        if ((isWhite && gameState?.bar?.white > 0) || (isBlack && gameState?.bar?.black > 0)) {
          setSelectedPoint('bar');
        }
      } else {
        // Mode vsAna: seul blanc peut jouer
        if (gameState?.bar?.white > 0 && isWhite) {
          setSelectedPoint('bar');
        }
      }
    };

    const handleOffClick = () => {
      if (selectedPoint !== null) {
        const validMove = gameState.validMoves?.find(m =>
          m.from === selectedPoint && m.to === 'off'
        );
        if (validMove) {
          makeMove(selectedPoint, 'off', validMove.die);
        }
      }
    };

    const renderPoint = (index, isTop) => {
      const pieces = gameState?.board?.[index] || 0;
      const absCount = Math.abs(pieces);
      const isWhite = pieces > 0;
      const isSelected = selectedPoint === index;
      const isValidTarget = gameState?.validMoves?.some(m => m.to === index && m.from === selectedPoint);
      const isValidSource = gameState?.validMoves?.some(m => m.from === index);

      return (
        <div
          key={index}
          className={`bg-point ${isTop ? 'top' : 'bottom'} ${index % 2 === 0 ? 'dark' : 'light'} ${isSelected ? 'selected' : ''} ${isValidTarget ? 'valid-target' : ''} ${isValidSource ? 'valid-source' : ''}`}
          onClick={() => handlePointClick(index)}
        >
          <div className="bg-point-triangle"></div>
          <div className="bg-checkers">
            {Array(Math.min(absCount, 5)).fill(0).map((_, i) => (
              <div key={i} className={`bg-checker ${isWhite ? 'white' : 'black'}`}>
                {i === 4 && absCount > 5 && <span className="checker-count">{absCount}</span>}
              </div>
            ))}
          </div>
          <div className="bg-point-num">{index + 1}</div>
        </div>
      );
    };

    if (!gameState) {
      return (
        <div className="no-game">
          <p>🎲 Backgammon: Le classique jeu de des et de strategie!</p>
          <p>{mode === 'vsHuman' ? 'Joueur 1 = Blancs, Joueur 2 = Noirs' : 'Tu joues les blancs. Sors tous tes pions avant Ana!'}</p>
          <div className="mode-selector">
            <button className={mode === 'vsAna' ? 'active' : ''} onClick={() => setMode('vsAna')}>vs Ana</button>
            <button className={mode === 'vsHuman' ? 'active' : ''} onClick={() => setMode('vsHuman')}>2 Joueurs</button>
          </div>
          <button className="btn-new-game" onClick={startGame} disabled={isLoading}>Commencer</button>
        </div>
      );
    }

    return (
      <div className="backgammon-game">
        <div className="bg-status">
          <span>Tour: {mode === 'vsHuman'
            ? (gameState.playerTurn === 'player1' ? 'Joueur 1 (Blancs)' : 'Joueur 2 (Noirs)')
            : (gameState.currentPlayer === 'white' ? 'Toi (Blanc)' : 'Ana (Noir)')}</span>
          <span>Phase: {gameState.phase === 'rolling' ? 'Lance les des' : gameState.phase === 'moving' ? 'Deplace' : 'Termine'}</span>
          {gameState.dice?.length > 0 && <span>Des: {gameState.dice.join(', ')}</span>}
          {gameState.movesLeft?.length > 0 && <span>Restants: {gameState.movesLeft.join(', ')}</span>}
        </div>

        <div className="bg-board">
          {/* Top row: points 13-24 (noir home) */}
          <div className="bg-half top">
            <div className="bg-quadrant">
              {[12, 13, 14, 15, 16, 17].map(i => renderPoint(i, true))}
            </div>
            <div className="bg-bar" onClick={handleBarClick}>
              {gameState.bar?.black > 0 && (
                <div className="bg-bar-checkers black">{gameState.bar.black}</div>
              )}
            </div>
            <div className="bg-quadrant">
              {[18, 19, 20, 21, 22, 23].map(i => renderPoint(i, true))}
            </div>
          </div>

          {/* Bottom row: points 1-12 (blanc home) */}
          <div className="bg-half bottom">
            <div className="bg-quadrant">
              {[11, 10, 9, 8, 7, 6].map(i => renderPoint(i, false))}
            </div>
            <div className="bg-bar" onClick={handleBarClick}>
              {gameState.bar?.white > 0 && (
                <div className="bg-bar-checkers white" onClick={handleBarClick}>
                  {gameState.bar.white}
                </div>
              )}
            </div>
            <div className="bg-quadrant">
              {[5, 4, 3, 2, 1, 0].map(i => renderPoint(i, false))}
            </div>
          </div>

          {/* Off areas */}
          <div className="bg-off-area">
            <div
              className={`bg-off white ${selectedPoint !== null && gameState.validMoves?.some(m => m.from === selectedPoint && m.to === 'off') ? 'valid-target' : ''}`}
              onClick={handleOffClick}
              title="Clique ici pour sortir le pion selectionne"
            >
              Sortis: {gameState.off?.white || 0}/15
              {selectedPoint !== null && gameState.validMoves?.some(m => m.from === selectedPoint && m.to === 'off') && (
                <span className="click-hint"> ← CLIQUE</span>
              )}
            </div>
            <div className="bg-off black">
              {mode === 'vsHuman' ? 'J2' : 'Ana'}: {gameState.off?.black || 0}/15
            </div>
          </div>
        </div>

        <div className="bg-controls">
          {gameState.phase === 'rolling' && (mode === 'vsHuman' || gameState.currentPlayer === 'white') && (
            <button className="btn-roll" onClick={rollDice} disabled={isLoading}>
              🎲 {mode === 'vsHuman'
                ? (gameState.playerTurn === 'player1' ? 'J1 lance les dés' : 'J2 lance les dés')
                : 'Lancer les des'}
            </button>
          )}
          <button className="btn-new-game" onClick={startGame}>Nouvelle partie</button>
        </div>

        {gameState.phase === 'gameover' && (
          <div className={`game-over ${gameState.winner === 'white' || gameState.winner === 'player1' ? 'win' : 'lose'}`}>
            {mode === 'vsHuman'
              ? (gameState.winner === 'player1' ? '🎉 Joueur 1 gagne!' : '🎉 Joueur 2 gagne!')
              : (gameState.winner === 'white' ? '🎉 Tu as gagne!' : '😢 Ana gagne!')}
          </div>
        )}
      </div>
    );
  };

  // ==================== RENDER ====================
  const renderGame = () => {
    switch (selectedGame) {
      case 'checkers': return <CheckersGame />;
      case 'tictactoe': return <TicTacToeGame />;
      case 'connect4': return <Connect4Game />;
      case 'rps': return <RPSGame />;
      case 'hangman': return <HangmanGame />;
      case 'blackjack': return <BlackjackGame />;
      case 'memory': return <MemoryGame />;
      case 'nim': return <NimGame />;
      case 'guess': return <GuessGame />;
      case 'chess': return <ChessGame />;
      case 'battleship': return <BattleshipGame />;
      case 'backgammon': return <BackgammonGame />;
      default: return null;
    }
  };

  return (
    <div className="games-page">
      <div className="games-header">
        <h1>🎮 Jeux avec Ana</h1>
        {selectedGame && <button className="back-button" onClick={backToMenu}>← Retour</button>}
      </div>

      {!selectedGame ? (
        <div className="games-menu">
          {GAMES_LIST.map(game => (
            <div key={game.id} className="game-card" onClick={() => selectGame(game.id)}>
              <span className="game-icon">{game.icon}</span>
              <h3>{game.name}</h3>
              <p>{game.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="games-container">
          <div className="game-area">
            {renderGame()}
          </div>
          <div className="game-chat">
            <div className="chat-header">
              <h3>💬 Ana</h3>
              <VoiceLoopButton
                ref={voiceLoopRef}
                onTranscript={handleVoiceLoopTranscript}
                onListeningChange={setIsVoiceListening}
                disabled={isChatLoading}
              />
            </div>
            <div className="chat-messages">
              {messages.length === 0 && <div className="chat-empty">Parle avec Ana pendant que tu joues!</div>}
              {messages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.sender || 'ana'}`}>
                  {msg.sender === 'user' && <span className="msg-prefix">Toi: </span>}
                  {msg.text}
                </div>
              ))}
              {isChatLoading && <div className="chat-message ana loading">Ana réfléchit...</div>}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Parle à Ana..."
                disabled={isChatLoading}
              />
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                onAutoSubmit={handleVoiceAutoSubmit}
                disabled={isChatLoading}
              />
              <button onClick={() => sendChatMessage()} disabled={isChatLoading || !chatInput.trim()}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GamesPage;
