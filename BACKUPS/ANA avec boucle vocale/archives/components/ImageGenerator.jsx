import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import config from '../config'

/**
 * Modal de génération d'images avec ComfyUI
 * Permet de générer des images 1920x1080 avec upscaling optionnel
 */
function ImageGenerator({ isOpen, onClose }) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('ugly, blurry, low quality, distorted, deformed, bad anatomy')
  const [upscale, setUpscale] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState(null)
  const [error, setError] = useState(null)
  const [generationTime, setGenerationTime] = useState(null)

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Veuillez entrer un prompt')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedImage(null)
    setGenerationTime(null)

    try {
      const response = await fetch(`${config.BACKEND_URL}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          upscale
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erreur génération')
      }

      setGeneratedImage(data.image)
      setGenerationTime((data.generation_time_ms / 1000).toFixed(1))

    } catch (err) {
      console.error('Erreur génération image:', err)
      setError(err.message || 'Erreur lors de la génération')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!generatedImage) return

    const link = document.createElement('a')
    link.href = generatedImage
    link.download = `archon_${Date.now()}.png`
    link.click()
  }

  const handleClose = () => {
    setPrompt('')
    setNegativePrompt('ugly, blurry, low quality, distorted, deformed, bad anatomy')
    setUpscale(true)
    setGeneratedImage(null)
    setError(null)
    setGenerationTime(null)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: theme.bg.primary,
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h2 style={{
            margin: 0,
            color: theme.text.primary,
            fontSize: '1.5em'
          }}>
            🎨 Générer une Image
          </h2>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            style={{
              background: 'none',
              border: 'none',
              color: theme.text.muted,
              fontSize: '24px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              padding: '0 8px',
              opacity: isGenerating ? 0.5 : 1
            }}
          >
            ×
          </button>
        </div>

        {/* Prompt */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            color: theme.text.secondary,
            fontSize: '14px',
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            Prompt (description de l'image):
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: beautiful sunset over mountains, vivid colors, masterpiece"
            disabled={isGenerating}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              backgroundColor: theme.bg.input,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              color: theme.text.primary,
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              opacity: isGenerating ? 0.6 : 1
            }}
          />
        </div>

        {/* Negative Prompt */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            color: theme.text.secondary,
            fontSize: '14px',
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            Prompt négatif (optionnel):
          </label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Ce que vous ne voulez PAS dans l'image"
            disabled={isGenerating}
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '12px',
              backgroundColor: theme.bg.input,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              color: theme.text.primary,
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              opacity: isGenerating ? 0.6 : 1
            }}
          />
        </div>

        {/* Upscale Checkbox */}
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          backgroundColor: theme.bg.secondary,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.6 : 1
          }}>
            <input
              type="checkbox"
              checked={upscale}
              onChange={(e) => setUpscale(e.target.checked)}
              disabled={isGenerating}
              style={{
                marginRight: '10px',
                width: '18px',
                height: '18px',
                cursor: isGenerating ? 'not-allowed' : 'pointer'
              }}
            />
            <div>
              <div style={{
                color: theme.text.primary,
                fontSize: '14px',
                fontWeight: '500'
              }}>
                ✨ Upscale AI (qualité maximale)
              </div>
              <div style={{
                color: theme.text.muted,
                fontSize: '12px',
                marginTop: '2px'
              }}>
                +5-10s de génération, détails affinés
              </div>
            </div>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#ff4444',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Generated Image */}
        {generatedImage && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <div style={{ color: theme.text.secondary, fontSize: '14px' }}>
                ✅ Image générée {generationTime && `en ${generationTime}s`}
              </div>
              <button
                onClick={handleDownload}
                style={{
                  padding: '6px 12px',
                  backgroundColor: theme.accent.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                📥 Télécharger
              </button>
            </div>
            <img
              src={generatedImage}
              alt="Generated"
              style={{
                width: '100%',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`
              }}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            style={{
              padding: '10px 20px',
              backgroundColor: theme.bg.secondary,
              color: theme.text.primary,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: isGenerating ? 0.5 : 1
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: isGenerating || !prompt.trim() ? theme.bg.secondary : theme.accent.primary,
              color: isGenerating || !prompt.trim() ? theme.text.muted : '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isGenerating ? (
              <>
                <span className="spinner" style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></span>
                Génération en cours...
              </>
            ) : (
              <>
                🎨 Générer
              </>
            )}
          </button>
        </div>

        {/* Spinner animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}

export default ImageGenerator
