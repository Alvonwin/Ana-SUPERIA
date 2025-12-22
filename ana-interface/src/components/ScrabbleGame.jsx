/**
 * Scrabble Game Component
 * Plateau de Scrabble complet avec tuiles interactives
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_URL } from '../config';
import './ScrabbleGame.css';

const API_URL = `${BACKEND_URL}/api`;

// Types de cases spéciales
const CELL_TYPES = {
  tw: { label: 'MOT×3', color: '#ff6b6b' },
  dw: { label: 'MOT×2', color: '#feca57' },
  tl: { label: 'LET×3', color: '#48dbfb' },
  dl: { label: 'LET×2', color: '#a8e6cf' },
  center: { label: '★', color: '#feca57' },
  normal: { label: '', color: '#dfe6e9' }
};

// Points par lettre
const LETTER_POINTS = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
  'I': 1, 'J': 8, 'K': 10, 'L': 1, 'M': 2, 'N': 1, 'O': 1, 'P': 3,
  'Q': 8, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 10, 'X': 10,
  'Y': 10, 'Z': 10, '*': 0
};

const ScrabbleGame = ({ session = 'default', mode = 'vsAna', onReaction }) => {
  const [gameState, setGameState] = useState(null);
  const [savedGameInfo, setSavedGameInfo] = useState(null); // Info sur partie sauvegardée
  const [checkingGame, setCheckingGame] = useState(true); // Vérification initiale
  const [selectedTile, setSelectedTile] = useState(null);
  const [placedTiles, setPlacedTiles] = useState([]);
  const [blankLetterModal, setBlankLetterModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rackOrder, setRackOrder] = useState([0, 1, 2, 3, 4, 5, 6]); // Ordre d'affichage du rack
  const [draggedTile, setDraggedTile] = useState(null); // Pour le drag & drop

  // Vérifier si une partie existe (au chargement)
  const checkSavedGame = useCallback(async () => {
    setCheckingGame(true);
    try {
      const res = await fetch(`${API_URL}/games/scrabble/state?session=${session}`);
      const data = await res.json();
      if (data.exists) {
        setSavedGameInfo({
          scores: data.scores,
          tilesRemaining: data.tilesRemaining,
          status: data.status
        });
      }
    } catch (err) {
      console.error('Erreur vérification Scrabble:', err);
    } finally {
      setCheckingGame(false);
    }
  }, [session]);

  // Continuer la partie sauvegardée
  const continueGame = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/games/scrabble/state?session=${session}`);
      const data = await res.json();
      if (data.exists) {
        setGameState(data);
      }
    } catch (err) {
      console.error('Erreur chargement Scrabble:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Charger l'état du jeu (legacy)
  const loadGameState = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/games/scrabble/state?session=${session}`);
      const data = await res.json();
      if (data.exists) {
        setGameState(data);
      }
    } catch (err) {
      console.error('Erreur chargement Scrabble:', err);
    }
  }, [session]);

  // Nouvelle partie
  const startNewGame = async () => {
    setLoading(true);
    setError(null);
    setPlacedTiles([]);
    setSelectedTile(null);

    try {
      const res = await fetch(`${API_URL}/games/scrabble/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, mode })
      });
      const data = await res.json();
      if (data.success) {
        setGameState(data);
        onReaction?.(data.reaction);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Sélectionner une tuile du rack
  const selectRackTile = (index) => {
    if (!gameState?.isMyTurn) return;

    const tile = gameState.rack[index];
    if (!tile) return;

    // Vérifier que cette tuile n'est pas déjà placée
    const alreadyPlaced = placedTiles.some(pt => pt.rackIndex === index);
    if (alreadyPlaced) return;

    setSelectedTile({ ...tile, rackIndex: index });
  };

  // Placer une tuile sur le plateau
  const placeTileOnBoard = (row, col) => {
    if (!selectedTile || !gameState?.isMyTurn) return;
    if (gameState.board[row][col].letter) return; // Case déjà occupée
    if (placedTiles.some(pt => pt.row === row && pt.col === col)) return;

    // Si c'est un joker, demander la lettre
    if (selectedTile.isBlank) {
      setBlankLetterModal({ row, col, rackIndex: selectedTile.rackIndex });
      return;
    }

    setPlacedTiles(prev => [...prev, {
      letter: selectedTile.letter,
      row,
      col,
      rackIndex: selectedTile.rackIndex,
      isBlank: false
    }]);
    setSelectedTile(null);
  };

  // Confirmer la lettre d'un joker
  const confirmBlankLetter = (letter) => {
    if (!blankLetterModal) return;

    setPlacedTiles(prev => [...prev, {
      letter: '*',
      blankLetter: letter.toUpperCase(),
      row: blankLetterModal.row,
      col: blankLetterModal.col,
      rackIndex: blankLetterModal.rackIndex,
      isBlank: true
    }]);
    setBlankLetterModal(null);
    setSelectedTile(null);
  };

  // Retirer une tuile placée
  const removePlacedTile = (index) => {
    setPlacedTiles(prev => prev.filter((_, i) => i !== index));
  };

  // Jouer le coup
  const playMove = async () => {
    if (placedTiles.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/games/scrabble/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, tiles: placedTiles })
      });
      const data = await res.json();

      if (data.success) {
        setGameState(data);
        setPlacedTiles([]);
        onReaction?.(data.reaction);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Passer son tour
  const passMove = async () => {
    setLoading(true);
    setError(null);
    setPlacedTiles([]);

    try {
      const res = await fetch(`${API_URL}/games/scrabble/pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session })
      });
      const data = await res.json();

      if (data.success) {
        setGameState(data);
        onReaction?.(data.reaction);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Annuler les tuiles placées
  const cancelPlacement = () => {
    setPlacedTiles([]);
    setSelectedTile(null);
  };

  // Mélanger les lettres du rack
  const shuffleRack = () => {
    setRackOrder(prev => {
      const newOrder = [...prev];
      for (let i = newOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
      }
      return newOrder;
    });
  };

  // Drag & Drop pour réorganiser le rack
  const handleDragStart = (e, index) => {
    setDraggedTile(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedTile === null || draggedTile === index) return;

    setRackOrder(prev => {
      const newOrder = [...prev];
      const draggedIdx = prev.indexOf(draggedTile);
      const targetIdx = prev.indexOf(index);
      if (draggedIdx === -1 || targetIdx === -1) return prev;

      // Swap
      [newOrder[draggedIdx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[draggedIdx]];
      return newOrder;
    });
    setDraggedTile(index);
  };

  const handleDragEnd = () => {
    setDraggedTile(null);
  };

  // Reset rack order quand le rack change
  useEffect(() => {
    if (gameState?.rack) {
      setRackOrder(gameState.rack.map((_, i) => i));
    }
  }, [gameState?.rack?.length]);

  useEffect(() => {
    checkSavedGame();
  }, [checkSavedGame]);

  // Rendu d'une case du plateau
  const renderCell = (cell, row, col) => {
    const cellType = CELL_TYPES[cell.type] || CELL_TYPES.normal;
    const placedTile = placedTiles.find(pt => pt.row === row && pt.col === col);
    const hasLetter = cell.letter || placedTile;

    const isSelected = selectedTile && !hasLetter;

    return (
      <div
        key={`${row}-${col}`}
        className={`scrabble-cell ${cell.type} ${isSelected ? 'selectable' : ''} ${placedTile ? 'placed-new' : ''}`}
        style={{ backgroundColor: hasLetter ? '#f8e8c0' : cellType.color }}
        onClick={() => placeTileOnBoard(row, col)}
      >
        {hasLetter ? (
          <div className="scrabble-tile-cell">
            <span className="tile-letter">
              {placedTile ? (placedTile.isBlank ? placedTile.blankLetter : placedTile.letter) : cell.letter}
            </span>
            <span className="tile-points">
              {placedTile?.isBlank || cell.isBlank ? '' : LETTER_POINTS[placedTile?.letter || cell.letter]}
            </span>
            {placedTile && (
              <button
                className="remove-tile"
                onClick={(e) => { e.stopPropagation(); removePlacedTile(placedTiles.indexOf(placedTile)); }}
              >×</button>
            )}
          </div>
        ) : (
          <span className="cell-label">{cellType.label}</span>
        )}
      </div>
    );
  };

  // Rendu d'une tuile du rack
  const renderRackTile = (tile, index) => {
    const isPlaced = placedTiles.some(pt => pt.rackIndex === index);
    const isSelected = selectedTile?.rackIndex === index;
    const isDragging = draggedTile === index;

    if (isPlaced) {
      return (
        <div key={index} className="rack-tile-slot empty">
          <span className="empty-slot">-</span>
        </div>
      );
    }

    return (
      <div
        key={index}
        className={`rack-tile ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
        onClick={() => selectRackTile(index)}
        draggable
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
      >
        <span className="tile-letter">{tile.isBlank ? '?' : tile.letter}</span>
        <span className="tile-points">{tile.points}</span>
      </div>
    );
  };

  if (!gameState) {
    return (
      <div className="scrabble-container">
        <div className="scrabble-start">
          <h2>🔠 Scrabble</h2>
          <p>Le roi des jeux de mots! Forme des mots avec tes lettres pour marquer des points.</p>

          {checkingGame ? (
            <p className="checking-game">Vérification...</p>
          ) : (
            <div className="start-buttons">
              {savedGameInfo && savedGameInfo.status !== 'finished' && (
                <>
                  <button className="start-button continue" onClick={continueGame} disabled={loading}>
                    {loading ? 'Chargement...' : '▶ Continuer la partie'}
                  </button>
                  <div className="saved-game-info">
                    <span>Score: {savedGameInfo.scores?.player1 || 0} - {savedGameInfo.scores?.player2 || 0}</span>
                    <span>•</span>
                    <span>{savedGameInfo.tilesRemaining} tuiles restantes</span>
                  </div>
                </>
              )}
              <button className="start-button new" onClick={startNewGame} disabled={loading}>
                {loading ? 'Chargement...' : '🔄 Nouvelle Partie'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="scrabble-container">
      {/* En-tête avec scores */}
      <div className="scrabble-header">
        <div className="player-score player1">
          <span className="player-name">{gameState.playerNames?.player1 || 'Joueur 1'}</span>
          <span className="score">{gameState.scores?.player1 || 0}</span>
        </div>
        <div className="game-info">
          <span className="tiles-remaining">🎲 {gameState.tilesRemaining} tuiles</span>
          <span className="turn-indicator">
            {gameState.isMyTurn ? '🟢 Ton tour' : '🔴 Tour adverse'}
          </span>
        </div>
        <div className="player-score player2">
          <span className="player-name">{gameState.playerNames?.player2 || 'Ana'}</span>
          <span className="score">{gameState.scores?.player2 || 0}</span>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && <div className="scrabble-error">{error}</div>}

      {/* Plateau */}
      <div className="scrabble-board">
        {gameState.board?.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
          </div>
        ))}
      </div>

      {/* Rack du joueur */}
      <div className="scrabble-rack">
        <div className="rack-tiles">
          {rackOrder.map(index => gameState.rack?.[index] && renderRackTile(gameState.rack[index], index))}
        </div>
        <button className="shuffle-btn" onClick={shuffleRack} title="Mélanger les lettres">
          🔀
        </button>
      </div>

      {/* Actions */}
      <div className="scrabble-actions">
        {placedTiles.length > 0 && (
          <>
            <button className="action-btn play" onClick={playMove} disabled={loading}>
              ✓ Jouer ({placedTiles.length} tuile{placedTiles.length > 1 ? 's' : ''})
            </button>
            <button className="action-btn cancel" onClick={cancelPlacement}>
              ✕ Annuler
            </button>
          </>
        )}
        <button className="action-btn pass" onClick={passMove} disabled={loading || placedTiles.length > 0}>
          ⏭ Passer
        </button>
        <button className="action-btn new-game" onClick={startNewGame} disabled={loading}>
          <span>🔄 Nouvelle</span>
          <span>partie</span>
        </button>
      </div>

      {/* Fin de partie */}
      {gameState.status === 'finished' && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>🏆 Partie terminée!</h2>
            <div className="final-scores">
              <div className="final-score">
                <span>{gameState.playerNames?.player1}</span>
                <span className="score">{gameState.scores?.player1}</span>
              </div>
              <div className="final-score">
                <span>{gameState.playerNames?.player2}</span>
                <span className="score">{gameState.scores?.player2}</span>
              </div>
            </div>
            <p className="winner-announcement">
              {gameState.winner === 'player1' ? '🎉 Tu as gagné!' :
               gameState.winner === 'player2' ? '😊 Ana a gagné!' :
               '🤝 Égalité!'}
            </p>
            <button className="action-btn new-game" onClick={startNewGame}>
              Rejouer
            </button>
          </div>
        </div>
      )}

      {/* Modal pour lettre du joker */}
      {blankLetterModal && (
        <div className="blank-modal-overlay">
          <div className="blank-modal">
            <h3>Quelle lettre pour le joker?</h3>
            <div className="letter-grid">
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                <button
                  key={letter}
                  className="letter-btn"
                  onClick={() => confirmBlankLetter(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
            <button className="cancel-btn" onClick={() => setBlankLetterModal(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="scrabble-legend">
        <div className="legend-item"><span className="legend-color tw"></span> Mot ×3</div>
        <div className="legend-item"><span className="legend-color dw"></span> Mot ×2</div>
        <div className="legend-item"><span className="legend-color tl"></span> Lettre ×3</div>
        <div className="legend-item"><span className="legend-color dl"></span> Lettre ×2</div>
      </div>
    </div>
  );
};

export default ScrabbleGame;
