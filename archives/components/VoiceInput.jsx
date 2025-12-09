import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { useTranslation } from 'react-i18next'
import config from './config'

const VoiceInput = forwardRef(({ onTranscript, playSound, handsFreeModeEnabled }, ref) => {
  const { t } = useTranslation()
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState(t('voice.ready'))
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const silenceTimeoutRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const streamRef = useRef(null)
  const startRecordingTimeoutRef = useRef(null)
  const isStartingRef = useRef(false)
  const hasDetectedSoundRef = useRef(false)
  const silenceStartTimeRef = useRef(null)

  const startRecording = async () => {
    // Bloquer si Mode Vocal désactivé
    if (!handsFreeModeEnabled) {
      console.log('⛔ Mode Vocal désactivé - Capture bloquée')
      setStatus(t('voice.disabled'))
      return
    }

    // Débounce: éviter appels multiples rapides
    if (isStartingRef.current) {
      console.log('⏸️ startRecording déjà en cours, ignoré')
      return
    }

    // Annuler tout démarrage précédent encore en attente
    if (startRecordingTimeoutRef.current) {
      clearTimeout(startRecordingTimeoutRef.current)
    }

    isStartingRef.current = true

    try {
      setStatus(t('voice.starting'))

      // Demander accès micro
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      streamRef.current = stream

      // Créer AudioContext pour analyse volume
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)
      microphone.connect(analyser)
      analyser.fftSize = 512

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Créer MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        setStatus(t('voice.transcribing'))

        // Arrêter AudioContext
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }

        // Créer blob audio
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

        // Envoyer à Voice Platform pour transcription
        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')

          const response = await fetch(`${config.VOICE_BACKEND_URL}/transcribe`, {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          const data = await response.json()

          if (data.text) {
            console.log('Transcription brute:', data.text)

            // 🛡️ FILTRE ANTI-GLITCH
            const text = data.text.trim()

            // Rejeter si trop court (moins de 3 caractères)
            if (text.length < 3) {
              console.log('⚠️ Glitch rejeté: texte trop court')
              setStatus(t('voice.glitchIgnored'))
              return
            }

            // Rejeter les patterns parasites connus
            const glitchPatterns = [
              /^sous-titrage/i,
              /^sous-titre/i,
              /^amara\.org/i,
              /^st['']?\d+/i,
              /^subtitle/i,
              /merci d'avoir regard[ée]/i,
              /thank you for watching/i,
              /thanks for watching/i
            ]

            if (glitchPatterns.some(pattern => pattern.test(text))) {
              console.log('⚠️ Glitch rejeté: pattern parasite détecté')
              setStatus(t('voice.noiseIgnored'))
              return
            }

            // Rejeter si répétition excessive (même mot >5 fois)
            const words = text.split(/\s+/)
            const wordCounts = {}
            for (const word of words) {
              wordCounts[word] = (wordCounts[word] || 0) + 1
              if (wordCounts[word] > 5) {
                console.log('⚠️ Glitch rejeté: répétition excessive')
                setStatus(t('voice.repetitionIgnored'))
                return
              }
            }

            // Si tout est OK, envoyer la transcription
            console.log('✅ Transcription validée:', text)
            onTranscript(text)
            setStatus(t('voice.ready'))
          } else {
            setStatus(t('voice.noText'))
          }
        } catch (error) {
          console.warn('⚠️ Voice Platform indisponible (transcription impossible)')
          setStatus(`Voice Platform non lancé`)
        }

        // Arrêter le stream
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(100) // Collecter données toutes les 100ms (buffer plus long)
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setStatus(t('voice.recording'))

      // Son de début d'enregistrement
      if (playSound) playSound('recording-start')

      // Démarrer détection de silence
      detectSilence()

    } catch (error) {
      console.error('Erreur micro:', error)
      setStatus(`Erreur: ${error.message}`)
    } finally {
      // Libérer le flag après un délai de sécurité
      setTimeout(() => {
        isStartingRef.current = false
      }, 500)
    }
  }

  const detectSilence = () => {
    if (!analyserRef.current) return

    // Réinitialiser les refs au début de l'enregistrement
    hasDetectedSoundRef.current = false
    silenceStartTimeRef.current = null
    console.log('🔍 Détection silence démarrée')

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const SILENCE_THRESHOLD = 15
    const SILENCE_DURATION = 5000 // 5 secondes (plus confortable pour phrases longues)

    const checkAudio = () => {
      if (!analyserRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        console.log('⚠️ checkAudio arrêté (analyser ou recorder invalide)')
        return
      }

      analyserRef.current.getByteFrequencyData(dataArray)

      // Calculer volume moyen
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i]
      }
      const average = sum / bufferLength

      const now = Date.now()

      if (average > SILENCE_THRESHOLD) {
        // Son détecté
        console.log(`🔊 Son détecté: ${average.toFixed(1)} > ${SILENCE_THRESHOLD}`)
        hasDetectedSoundRef.current = true
        silenceStartTimeRef.current = null // Réinitialiser le compteur de silence
      } else if (hasDetectedSoundRef.current) {
        // Silence détecté après avoir eu du son
        if (!silenceStartTimeRef.current) {
          // Premier moment de silence
          silenceStartTimeRef.current = now
          console.log(`🤫 Début silence (volume: ${average.toFixed(1)})`)
        } else {
          const elapsedSilence = now - silenceStartTimeRef.current
          console.log(`⏱️ Silence: ${elapsedSilence}ms / ${SILENCE_DURATION}ms (volume: ${average.toFixed(1)})`)

          if (elapsedSilence >= SILENCE_DURATION) {
            // 2 secondes de silence écoulées
            console.log('✅ 2s de silence détectées, arrêt enregistrement')
            stopRecording()
            return // Ne pas continuer le polling
          }
        }
      } else {
        console.log(`🔇 Attente son initial (volume: ${average.toFixed(1)} <= ${SILENCE_THRESHOLD})`)
      }

      // Continuer à checker toutes les 100ms
      setTimeout(checkAudio, 100)
    }

    checkAudio()
  }

  const stopRecording = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      // Son de fin d'enregistrement
      if (playSound) playSound('recording-stop')
    }

    // Cleanup du stream micro
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('🛑 Track micro arrêté:', track.kind)
      })
      streamRef.current = null
    }

    // Cleanup AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().then(() => {
        console.log('🔇 AudioContext fermé')
      })
      audioContextRef.current = null
    }
  }

  // Exposer startRecording au parent via ref
  useImperativeHandle(ref, () => ({
    startRecording
  }))

  return (
    <div style={{ marginBottom: '8px', textAlign: 'center' }}>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          padding: '12px 24px',
          fontSize: '12.8px',
          backgroundColor: isRecording ? '#ef4444' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6.4px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'all 0.2s'
        }}
      >
        {isRecording ? t('voice.stop') : t('voice.start')}
      </button>

      <div style={{ marginTop: '6.4px', fontSize: '10.4px', color: '#9ca3af', minHeight: '16px' }}>
        {status}
      </div>
    </div>
  )
})

VoiceInput.displayName = 'VoiceInput'

export default VoiceInput
