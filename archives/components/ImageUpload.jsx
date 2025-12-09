import { memo, useState, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

/**
 * ImageUpload Component v1.0.0
 *
 * Composant d'upload d'image pour Vision AI (Phase 3C)
 * Features:
 * - Drag & Drop support
 * - Image preview avec zoom
 * - Compression automatique en base64
 * - Limite de taille 20MB (Gemini inline method)
 * - Clear/Remove image
 * - Styled avec ThemeContext
 */
const ImageUpload = memo(({ onImageSelect, selectedImage, onImageClear }) => {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const MAX_SIZE_MB = 20
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

  const handleFile = async (file) => {
    setError(null)

    // Validation du type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Type de fichier non supporté. Utilisez: JPG, PNG, WEBP, GIF`)
      return
    }

    // Validation de la taille
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Fichier trop volumineux (max ${MAX_SIZE_MB}MB). Taille: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }

    try {
      // Lecture du fichier en base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64Data = e.target.result
        onImageSelect({
          name: file.name,
          type: file.type,
          size: file.size,
          base64: base64Data,
          preview: base64Data
        })
      }
      reader.onerror = () => {
        setError('Erreur lors de la lecture du fichier')
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError('Erreur lors du traitement de l\'image')
      console.error('ImageUpload error:', err)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleInputChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleClear = (e) => {
    e.stopPropagation()
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onImageClear()
  }

  const containerStyle = {
    position: 'relative',
    marginBottom: '0.3rem',
    width: '100%'
  }

  const dropZoneStyle = {
    border: `2px dashed ${isDragging ? theme.accent.primary : theme.border}`,
    borderRadius: '6px',
    padding: selectedImage ? '0.3rem' : '0.4rem',
    backgroundColor: isDragging ? theme.accent.primary + '10' : theme.bg.secondary,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    minHeight: selectedImage ? 'auto' : '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.2rem'
  }

  const iconStyle = {
    fontSize: '1rem',
    color: theme.accent.primary,
    marginRight: '0.3rem'
  }

  const textStyle = {
    color: theme.text.secondary,
    fontSize: '0.75rem',
    margin: 0
  }

  const previewContainerStyle = {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto'
  }

  const previewImageStyle = {
    width: '100%',
    maxHeight: '80px',
    objectFit: 'contain',
    borderRadius: '4px',
    display: 'block'
  }

  const previewInfoStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.3rem',
    fontSize: '0.7rem',
    color: theme.text.muted
  }

  const clearButtonStyle = {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: theme.accent.error,
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s ease',
    zIndex: 10
  }

  const errorStyle = {
    color: theme.accent.error,
    fontSize: '0.85rem',
    marginTop: '0.5rem',
    padding: '0.5rem',
    backgroundColor: theme.accent.error + '10',
    borderRadius: '4px',
    textAlign: 'left'
  }

  const badgeStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    backgroundColor: theme.accent.primary + '20',
    color: theme.accent.primary,
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600'
  }

  return (
    <div style={containerStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <div
        style={dropZoneStyle}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!selectedImage ? handleClick : undefined}
      >
        {!selectedImage ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={iconStyle}>🖼️</span>
            <span style={textStyle}>
              <strong>{t('image.title')}</strong> - {t('image.dragDrop')} (JPG, PNG, WEBP, GIF • max {MAX_SIZE_MB}MB)
            </span>
          </div>
        ) : (
          <div style={previewContainerStyle}>
            <button
              style={clearButtonStyle}
              onClick={handleClear}
              title="Supprimer l'image"
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              ✕
            </button>
            <img
              src={selectedImage.preview}
              alt={selectedImage.name}
              style={previewImageStyle}
            />
            <div style={previewInfoStyle}>
              <span style={badgeStyle}>
                {selectedImage.type.split('/')[1].toUpperCase()}
              </span>
              <span>{selectedImage.name}</span>
              <span>{(selectedImage.size / 1024).toFixed(0)} KB</span>
            </div>
          </div>
        )}
      </div>

      {error && <div style={errorStyle}>⚠️ {error}</div>}
    </div>
  )
})

ImageUpload.displayName = 'ImageUpload'

export default ImageUpload
