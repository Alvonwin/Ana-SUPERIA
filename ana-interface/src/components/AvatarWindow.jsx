import { useState, useEffect, useRef } from 'react';
import { IconVideo, IconMinus, IconMaximize } from './Icons';
import { BACKEND_URL } from '../config';
import './AvatarWindow.css';

/**
 * Fenêtre Avatar dédiée pour Ana
 * Affiche une vidéo lip-sync automatique ou manuelle
 */
function AvatarWindow({ lastAnaMessage, enabled, onToggle }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const videoRef = useRef(null);
  const lastProcessedId = useRef(null);

  // Générer automatiquement quand Ana répond (si enabled)
  useEffect(() => {
    if (!enabled || !lastAnaMessage) return;
    if (lastAnaMessage.streaming) return; // Attendre fin du streaming
    if (lastAnaMessage.id === lastProcessedId.current) return; // Déjà traité
    if (!lastAnaMessage.text || lastAnaMessage.text.length < 2) return;

    lastProcessedId.current = lastAnaMessage.id;
    generateVideo(lastAnaMessage.text);
  }, [enabled, lastAnaMessage]);

  const generateVideo = async (text) => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/avatar/animate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur génération');
      }

      const blob = await response.blob();

      // Libérer l'ancienne URL
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }

      const newUrl = URL.createObjectURL(blob);
      setVideoUrl(newUrl);

      // Jouer automatiquement
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play();
        }
      }, 100);

    } catch (err) {
      console.error('[AvatarWindow] Erreur:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);

  return (
    <div className={`avatar-window ${isMinimized ? 'minimized' : ''}`}>
      <div className="avatar-header">
        <span className="avatar-title">
          <IconVideo size={14} />
          Ana
        </span>
        <div className="avatar-controls">
          <button
            className="avatar-minimize-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Restaurer' : 'Réduire'}
          >
            {isMinimized ? <IconMaximize size={14} /> : <IconMinus size={14} />}
          </button>
          <label className="avatar-switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {!isMinimized && (
      <div className="avatar-content">
        {isGenerating && (
          <div className="avatar-loading">
            <div className="spinner"></div>
            <span>Génération...</span>
          </div>
        )}

        {error && !isGenerating && (
          <div className="avatar-error">
            {error}
          </div>
        )}

        {videoUrl && !isGenerating && (
          <video
            ref={videoRef}
            src={videoUrl}
            className="avatar-video-main"
            controls
            playsInline
          />
        )}

        {!videoUrl && !isGenerating && !error && (
          <div className="avatar-placeholder">
            <img src="/avatar-ana.jpg" alt="Ana" className="avatar-static" />
            {enabled && <span className="avatar-hint">En attente...</span>}
            {!enabled && <span className="avatar-hint">Animation OFF</span>}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export default AvatarWindow;
