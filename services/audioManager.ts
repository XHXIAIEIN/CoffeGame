/**
 * A simple audio manager using Web Audio API to generate sounds
 * so the app works without external assets.
 */

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';

class AudioManager {
  private ctx: any = null;
  private enabled: boolean = true;

  constructor() {
    // Initialize on first user interaction to comply with browser policies
  }

  private init() {
    if (!this.ctx) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public playBeep(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
    this.init();
    if (!this.enabled || !this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }

  public playCountdown() {
    this.playBeep(440, 'sine', 0.1, 0.2);
  }

  public playGo() {
    this.playBeep(880, 'square', 0.3, 0.2);
  }

  public playSlap(power: number) {
    this.init();
    if (!this.enabled || !this.ctx) return;
    
    // Synthesis of a "thud" or "slap" sound
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Noise buffer for "crunch"
    const bufferSize = this.ctx.sampleRate * 0.1; // 100ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();

    // Thud
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    
    gain.gain.setValueAtTime(power * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    // Crunch
    noiseGain.gain.setValueAtTime(power * 0.3, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start();
    osc.stop(t + 0.3);
    noise.start();
    noise.stop(t + 0.1);
  }

  public playWin() {
    this.playBeep(523.25, 'sine', 0.1, 0.2);
    setTimeout(() => this.playBeep(659.25, 'sine', 0.1, 0.2), 100);
    setTimeout(() => this.playBeep(783.99, 'sine', 0.4, 0.2), 200);
  }
}

export const audioManager = new AudioManager();