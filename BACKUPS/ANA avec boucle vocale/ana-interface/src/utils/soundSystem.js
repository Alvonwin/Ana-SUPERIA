/**
 * ANA Sound System
 * Système de sons de notification inspiré d'ARCHON
 * Utilise Web Audio API pour générer des sons procéduraux
 *
 * Types de sons disponibles:
 * - message-sent: Bip montant rapide
 * - message-received: Double bip doux
 * - llm-start: Triple bip (sélection LLM)
 * - llm-complete: Son de complétion
 * - error: Basse fréquence
 * - success: Son de succès
 */

class SoundSystem {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
  }

  /**
   * Initialize AudioContext (lazy loading)
   */
  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Enable or disable sounds
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Play a sound by type
   */
  play(soundType) {
    if (!this.enabled) return;

    try {
      const ctx = this.getAudioContext();

      switch (soundType) {
        case 'message-sent':
          this.playMessageSent(ctx);
          break;

        case 'message-received':
          this.playMessageReceived(ctx);
          break;

        case 'llm-start':
          this.playLLMStart(ctx);
          break;

        case 'llm-complete':
          this.playLLMComplete(ctx);
          break;

        case 'error':
          this.playError(ctx);
          break;

        case 'success':
          this.playSuccess(ctx);
          break;

        case 'notification':
          this.playNotification(ctx);
          break;

        default:
          this.playDefault(ctx);
      }
    } catch (error) {
      console.error('🔇 Erreur playSound:', error);
    }
  }

  /**
   * Message Sent - Bip montant rapide
   */
  playMessageSent(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);

    console.log('📤 Son: Message envoyé');
  }

  /**
   * Message Received - Double bip doux
   */
  playMessageReceived(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);

    console.log('📥 Son: Message reçu');
  }

  /**
   * LLM Start - Triple bip rapide (Phi-3/DeepSeek/Qwen/Llama)
   */
  playLLMStart(ctx) {
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    // Triple bip
    [0, 0.1, 0.2].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.frequency.value = 700;
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.08);
    });

    console.log('🧠 Son: LLM démarré');
  }

  /**
   * LLM Complete - Accord descendant doux
   */
  playLLMComplete(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Sol-Mi-Do descendant (comme ARCHON recording-stop)
    osc.frequency.setValueAtTime(784, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(523, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);

    console.log('✅ Son: LLM terminé');
  }

  /**
   * Error - Basse fréquence
   */
  playError(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(200, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);

    console.log('❌ Son: Erreur');
  }

  /**
   * Success - Accord ascendant joyeux
   */
  playSuccess(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Do-Mi-Sol ascendant (comme ARCHON recording-start)
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);

    console.log('✅ Son: Succès');
  }

  /**
   * Notification - Bip neutre
   */
  playNotification(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 880; // La aigu

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);

    console.log('🔔 Son: Notification');
  }

  /**
   * Default - Son neutre (La 440Hz)
   */
  playDefault(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 440;

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }
}

// Export singleton
const soundSystem = new SoundSystem();
export default soundSystem;
