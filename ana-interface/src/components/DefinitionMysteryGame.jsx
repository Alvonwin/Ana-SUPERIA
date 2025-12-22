/**
 * Définition Mystère Game Component
 * Ana donne des indices, le joueur devine le mot
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_URL } from '../config';
import './DefinitionMysteryGame.css';

const API_URL = `${BACKEND_URL}/api`;

const DefinitionMysteryGame = ({ session = 'default', onReaction }) => {
  const [gameState, setGameState] = useState(null);
  const [guess, setGuess] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showResult, setShowResult] = useState(null);
  const [previousClues, setPreviousClues] = useState([]);

  // Charger l'état du jeu
  const loadGameState = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/games/definition-mystery/state?session=${session}`);
      const data = await res.json();
      if (data.exists && data.isPlaying) {
        setGameState(data);
        setPreviousClues(data.currentClues || []);
      }
    } catch (err) {
      console.error('Erreur chargement:', err);
    }
  }, [session]);

  // Nouvelle partie
  const startNewGame = async () => {
    setLoading(true);
    setMessage(null);
    setShowResult(null);
    setPreviousClues([]);
    setGuess('');

    try {
      const res = await fetch(`${API_URL}/games/definition-mystery/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session })
      });
      const data = await res.json();
      if (data.success) {
        setGameState(data);
        setPreviousClues([data.clue]);
        onReaction?.(data.reaction);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Nouvelle manche
  const newRound = async () => {
    setLoading(true);
    setMessage(null);
    setShowResult(null);
    setPreviousClues([]);
    setGuess('');

    try {
      const res = await fetch(`${API_URL}/games/definition-mystery/new-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session })
      });
      const data = await res.json();
      if (data.success) {
        setGameState(data);
        setPreviousClues([data.clue]);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Soumettre une réponse
  const submitGuess = async (e) => {
    e.preventDefault();
    if (!guess.trim() || loading) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/games/definition-mystery/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, answer: guess.trim() })
      });
      const data = await res.json();

      if (data.correct) {
        setShowResult({
          type: 'success',
          word: data.word,
          points: data.pointsEarned,
          cluesUsed: data.cluesUsed,
          totalScore: data.totalScore
        });
        setGameState(prev => ({
          ...prev,
          score: data.totalScore,
          roundsPlayed: data.roundsPlayed,
          isPlaying: false
        }));
        onReaction?.(data.reaction);
      } else {
        setMessage({ type: 'error', text: data.message, hint: data.hint });
      }

      setGuess('');
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Demander un indice supplémentaire
  const requestNextClue = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/games/definition-mystery/next-clue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session })
      });
      const data = await res.json();

      if (data.revealed) {
        // Plus d'indices, mot révélé
        setShowResult({
          type: 'revealed',
          word: data.word
        });
        setGameState(prev => ({
          ...prev,
          score: data.totalScore,
          roundsPlayed: data.roundsPlayed,
          isPlaying: false
        }));
        onReaction?.(data.reaction);
      } else if (data.clue) {
        setPreviousClues(prev => [...prev, data.clue]);
        setGameState(prev => ({
          ...prev,
          currentClueIndex: data.clueNumber - 1,
          possiblePoints: data.possiblePoints
        }));
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Abandonner et révéler
  const giveUp = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/games/definition-mystery/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session })
      });
      const data = await res.json();

      if (data.revealed) {
        setShowResult({
          type: 'giveup',
          word: data.word
        });
        setGameState(prev => ({
          ...prev,
          score: data.totalScore,
          roundsPlayed: data.roundsPlayed,
          isPlaying: false
        }));
        onReaction?.(data.reaction);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGameState();
  }, [loadGameState]);

  // Écran de démarrage
  if (!gameState) {
    return (
      <div className="definition-mystery-container">
        <div className="definition-mystery-start">
          <h2>🔮 Définition Mystère</h2>
          <p>Ana te donne des indices progressifs. Devine le mot avec le moins d'indices possible pour marquer plus de points!</p>
          <div className="points-explanation">
            <div className="point-row"><span className="clue-num">1er indice</span><span className="points">100 pts</span></div>
            <div className="point-row"><span className="clue-num">2ème indice</span><span className="points">80 pts</span></div>
            <div className="point-row"><span className="clue-num">3ème indice</span><span className="points">60 pts</span></div>
            <div className="point-row"><span className="clue-num">4ème indice</span><span className="points">40 pts</span></div>
            <div className="point-row"><span className="clue-num">5ème indice</span><span className="points">20 pts</span></div>
          </div>
          <button className="start-button" onClick={startNewGame} disabled={loading}>
            {loading ? 'Chargement...' : 'Commencer'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="definition-mystery-container">
      {/* Header avec score */}
      <div className="definition-mystery-header">
        <div className="score-display">
          <span className="label">Score</span>
          <span className="value">{gameState.score || 0}</span>
        </div>
        <div className="category-display">
          <span className="label">Catégorie</span>
          <span className="value">{gameState.currentCategory || '?'}</span>
        </div>
        <div className="rounds-display">
          <span className="label">Manches</span>
          <span className="value">{gameState.roundsPlayed || 0}</span>
        </div>
      </div>

      {/* Résultat de la manche */}
      {showResult && (
        <div className={`result-card ${showResult.type}`}>
          {showResult.type === 'success' && (
            <>
              <div className="result-icon">🎉</div>
              <h3>Bien joué!</h3>
              <p className="result-word">Le mot était: <strong>{showResult.word}</strong></p>
              <p className="result-details">
                +{showResult.points} points ({showResult.cluesUsed} indice{showResult.cluesUsed > 1 ? 's' : ''})
              </p>
            </>
          )}
          {showResult.type === 'revealed' && (
            <>
              <div className="result-icon">😅</div>
              <h3>Plus d'indices!</h3>
              <p className="result-word">Le mot était: <strong>{showResult.word}</strong></p>
            </>
          )}
          {showResult.type === 'giveup' && (
            <>
              <div className="result-icon">💡</div>
              <h3>Solution</h3>
              <p className="result-word">Le mot était: <strong>{showResult.word}</strong></p>
            </>
          )}
          <button className="next-round-btn" onClick={newRound} disabled={loading}>
            Mot suivant →
          </button>
        </div>
      )}

      {/* Zone de jeu */}
      {!showResult && gameState.isPlaying && (
        <div className="game-area">
          {/* Indices */}
          <div className="clues-section">
            <div className="clues-header">
              <span>Indices ({previousClues.length}/5)</span>
              <span className="possible-points">{gameState.possiblePoints || 100} pts possibles</span>
            </div>
            <div className="clues-list">
              {previousClues.map((clue, index) => (
                <div key={index} className="clue-item">
                  <span className="clue-number">{index + 1}</span>
                  <span className="clue-text">{clue}</span>
                </div>
              ))}
            </div>
            {previousClues.length < 5 && (
              <button className="next-clue-btn" onClick={requestNextClue} disabled={loading}>
                💡 Indice suivant (-{20} pts)
              </button>
            )}
          </div>

          {/* Info mot */}
          <div className="word-info">
            <span>Le mot a </span>
            <strong>{gameState.wordLength}</strong>
            <span> lettres</span>
          </div>

          {/* Message d'erreur */}
          {message && (
            <div className={`message ${message.type}`}>
              <span>{message.text}</span>
              {message.hint && <span className="hint">{message.hint}</span>}
            </div>
          )}

          {/* Formulaire de réponse */}
          <form className="guess-form" onSubmit={submitGuess}>
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Tape ta réponse..."
              disabled={loading}
              autoFocus
            />
            <button type="submit" disabled={loading || !guess.trim()}>
              Deviner
            </button>
          </form>

          {/* Bouton abandonner */}
          <button className="give-up-btn" onClick={giveUp} disabled={loading}>
            Je donne ma langue au chat 🐱
          </button>
        </div>
      )}

      {/* Bouton nouvelle partie */}
      <button className="new-game-btn" onClick={startNewGame} disabled={loading}>
        🔄 Nouvelle partie
      </button>
    </div>
  );
};

export default DefinitionMysteryGame;
