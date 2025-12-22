/**
 * Motus Game Component
 * Jeu de mots style Motus/Wordle
 */

import React, { useState, useRef } from 'react';
import { BACKEND_URL } from '../config';
import './MotusGame.css';

const MotusGame = ({ session = 'default', onReaction }) => {
  const [guess, setGuess] = useState('');
  const [grid, setGrid] = useState([]); // [{letters: [{char, status}], word}]
  const [firstLetter, setFirstLetter] = useState('');
  const [wordLength, setWordLength] = useState(6);
  const [currentRow, setCurrentRow] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, playing, won, lost
  const [usedLetters, setUsedLetters] = useState({ correct: [], present: [], absent: [] });
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [secretWord, setSecretWord] = useState('');
  const [hints, setHints] = useState([]); // [{position, letter}]
  const [hintsRemaining, setHintsRemaining] = useState(2);
  const inputRef = useRef(null);

  const KEYBOARD_ROWS = [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['⌫', 'W', 'X', 'C', 'V', 'B', 'N', '⏎']
  ];

  const startGame = async (length = 6) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/games/motus/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, wordLength: length })
      });
      const data = await response.json();
      if (data.success) {
        setFirstLetter(data.firstLetter);
        setWordLength(data.wordLength);
        setCurrentRow(0);
        setGrid([]);
        setGuess(data.firstLetter);
        setStatus('playing');
        setUsedLetters({ correct: [], present: [], absent: [] });
        setHints([]);
        setHintsRemaining(2);
        if (onReaction) onReaction(data.reaction || data.message);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        if (onReaction) onReaction(data.error || "Erreur de démarrage");
      }
    } catch (e) {
      console.error('Motus error:', e);
      if (onReaction) onReaction("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const parseResult = (message) => {
    // Parse "🟥C 🟨A ⬜L" format - emojis are multi-byte in JS
    // First line only (message may contain "\n\nEncore X essai(s).")
    const firstLine = message.split('\n')[0];
    const results = [];
    const parts = firstLine.split(' ');

    for (const part of parts) {
      if (part.length < 2) continue;
      const chars = [...part]; // Spread to handle emojis properly
      const emoji = chars[0];
      const letter = chars[1]; // Letter is always second character after emoji

      if (!/[A-Z]/.test(letter)) continue;

      let status = 'absent';
      if (emoji === '🟥') status = 'correct';
      else if (emoji === '🟨') status = 'present';

      results.push({ char: letter, status });
    }

    return results.length > 0 ? results : null;
  };

  const submitGuess = async () => {
    if (guess.length !== wordLength) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      if (onReaction) onReaction(`Le mot doit faire ${wordLength} lettres!`);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/games/motus/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, word: guess })
      });
      const data = await response.json();

      if (data.success) {
        const parsed = parseResult(data.message);
        if (parsed) {
          setGrid(prev => [...prev, { letters: parsed, word: guess }]);

          // Mettre à jour les lettres utilisées
          const newUsed = { ...usedLetters };
          parsed.forEach(({ char, status: s }) => {
            if (s === 'correct' && !newUsed.correct.includes(char)) newUsed.correct.push(char);
            else if (s === 'present' && !newUsed.present.includes(char) && !newUsed.correct.includes(char)) newUsed.present.push(char);
            else if (s === 'absent' && !newUsed.absent.includes(char) && !newUsed.correct.includes(char) && !newUsed.present.includes(char)) newUsed.absent.push(char);
          });
          setUsedLetters(newUsed);
        }

        setCurrentRow(prev => prev + 1);

        if (data.won) {
          setStatus('won');
          setSecretWord(guess);
          if (onReaction) onReaction("🎉 Bravo! Tu as trouvé le mot!");
        } else if (data.lost) {
          setStatus('lost');
          setSecretWord(data.word || '');
          if (onReaction) onReaction(data.message);
        } else {
          setGuess(firstLetter);
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        if (onReaction) onReaction(data.message || data.error);
      }
    } catch (e) {
      console.error('Motus guess error:', e);
      if (onReaction) onReaction("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const getHint = async () => {
    if (hintsRemaining <= 0 || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/games/motus/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session })
      });
      const data = await response.json();
      if (data.success) {
        setHints(prev => [...prev, { position: data.position, letter: data.letter }]);
        setHintsRemaining(data.hintsRemaining);
        if (onReaction) onReaction(data.message);
      } else {
        if (onReaction) onReaction(data.message);
      }
    } catch (e) {
      console.error('Hint error:', e);
      if (onReaction) onReaction("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && status === 'playing') {
      submitGuess();
    }
  };

  const handleVirtualKey = (key) => {
    if (status !== 'playing' || loading) return;
    if (key === '⌫') {
      if (guess.length > 1) setGuess(prev => prev.slice(0, -1));
    } else if (key === '⏎') {
      submitGuess();
    } else if (guess.length < wordLength) {
      setGuess(prev => prev + key);
    }
    inputRef.current?.focus();
  };

  const getKeyStatus = (key) => {
    if (usedLetters.correct.includes(key)) return 'correct';
    if (usedLetters.present.includes(key)) return 'present';
    if (usedLetters.absent.includes(key)) return 'absent';
    return '';
  };

  // Grille vide pour les essais restants
  const emptyRows = Math.max(0, 6 - grid.length - (status === 'playing' ? 1 : 0));

  return (
    <div className="motus-game">
      {status === 'idle' && (
        <div className="motus-start">
          <div className="motus-logo">
            <span className="motus-letter correct">M</span>
            <span className="motus-letter present">O</span>
            <span className="motus-letter absent">T</span>
            <span className="motus-letter correct">U</span>
            <span className="motus-letter present">S</span>
          </div>
          <p>Trouve le mot secret en 6 essais!</p>
          <div className="motus-rules">
            <div><span className="cell-demo correct">A</span> Bien placé</div>
            <div><span className="cell-demo present">B</span> Mal placé</div>
            <div><span className="cell-demo absent">C</span> Absent</div>
          </div>
          <div className="word-length-selector">
            <button onClick={() => startGame(5)} disabled={loading}>5 lettres</button>
            <button onClick={() => startGame(6)} disabled={loading} className="recommended">6 lettres</button>
            <button onClick={() => startGame(7)} disabled={loading}>7 lettres</button>
          </div>
        </div>
      )}

      {(status === 'playing' || status === 'won' || status === 'lost') && (
        <div className="motus-board">
          <div className="motus-header">
            <span className="motus-title">MOTUS</span>
            <span className="motus-counter">{currentRow}/6</span>
          </div>

          <div className="motus-grid">
            {/* Lignes complétées */}
            {grid.map((row, i) => (
              <div key={i} className="motus-row completed">
                {row.letters.map((cell, j) => (
                  <div key={j} className={`motus-cell ${cell.status}`} style={{ animationDelay: `${j * 0.1}s` }}>
                    {cell.char}
                  </div>
                ))}
              </div>
            ))}

            {/* Ligne courante */}
            {status === 'playing' && (
              <div className={`motus-row current ${shake ? 'shake' : ''}`}>
                {Array.from({ length: wordLength }).map((_, i) => (
                  <div key={i} className={`motus-cell ${i === 0 ? 'first-letter' : ''} ${guess[i] ? 'filled' : ''}`}>
                    {guess[i] || ''}
                  </div>
                ))}
              </div>
            )}

            {/* Lignes vides */}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <div key={`empty-${i}`} className="motus-row empty">
                {Array.from({ length: wordLength }).map((_, j) => (
                  <div key={j} className="motus-cell empty"></div>
                ))}
              </div>
            ))}
          </div>

          {/* Input caché pour le clavier physique */}
          {status === 'playing' && (
            <input
              ref={inputRef}
              type="text"
              className="motus-hidden-input"
              value={guess}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                if (val.length === 0) setGuess(firstLetter);
                else if (val[0] === firstLetter) setGuess(val.slice(0, wordLength));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitGuess();
                if (e.key === 'Backspace' && guess.length <= 1) e.preventDefault();
              }}
              maxLength={wordLength}
              autoFocus
            />
          )}

          {/* Clavier virtuel */}
          {status === 'playing' && (
            <div className="motus-keyboard">
              {KEYBOARD_ROWS.map((row, i) => (
                <div key={i} className="keyboard-row">
                  {row.map(key => (
                    <button
                      key={key}
                      className={`key ${getKeyStatus(key)} ${key === '⏎' ? 'enter' : ''} ${key === '⌫' ? 'backspace' : ''}`}
                      onClick={() => handleVirtualKey(key)}
                      disabled={loading}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Section indices */}
          {status === 'playing' && (
            <div className="motus-hints">
              <button
                className="btn-hint"
                onClick={getHint}
                disabled={loading || hintsRemaining <= 0}
              >
                💡 Indice ({hintsRemaining}/2)
              </button>
              {hints.length > 0 && (
                <div className="hints-display">
                  {hints.map((h, i) => (
                    <span key={i} className="hint-item">
                      Position {h.position + 1}: <strong>{h.letter}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Résultat final */}
          {(status === 'won' || status === 'lost') && (
            <div className={`motus-final ${status}`}>
              <h3>{status === 'won' ? '🎉 Félicitations!' : '😢 Dommage!'}</h3>
              {secretWord && (
                <div className="motus-secret-word">
                  <span className="label">Le mot était:</span>
                  <div className="word-reveal">
                    {secretWord.split('').map((char, i) => (
                      <span key={i} className="reveal-letter">{char}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="motus-stats">
                <span>Essais: {currentRow}/6</span>
              </div>
              <button className="btn-replay" onClick={() => setStatus('idle')}>
                Rejouer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MotusGame;
