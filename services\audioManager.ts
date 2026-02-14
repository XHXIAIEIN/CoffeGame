
import { SlapGrade } from '../types';

/**
 * A simple audio manager using Web Audio API to generate sounds
 * so the app works without external assets.
 */

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';

class AudioManager {
  private ctx: any = null;
  private enabled: boolean = true;
  
  // Charge Sound Nodes
  private chargeOsc: any = null;
  private chargeGain: any = null;

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
  
  // --- Charge Sound Logic ---

  public startChargeSound() {
    this.init();
    if (!this.enabled || !this.ctx) return;
    if (this.chargeOsc) return; // Already playing

    try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime); // Start low
        
        // Low pass filter to dampen the sawtooth harshness
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        
        this.chargeOsc = osc;
        this.chargeGain = gain;
    } catch(e) { console.warn(e); }
  }

  public updateChargeSound(progress: number) {
      if (!this.chargeOsc) return;
      // Clamp progress to avoid crazy high frequencies if overloaded
      const p = Math.min(progress, 1.2); 
      
      // Frequency Sweep: 100Hz -> 800Hz
      const freq = 100 + (p * 700);
      this.chargeOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
      
      // Volume tremolo for overload warning
      if (p > 1.0) {
          // Chaos
          this.chargeOsc.frequency.setValueAtTime(freq + Math.random() * 50, this.ctx.currentTime);
      }
  }

  public stopChargeSound() {
    if (this.chargeOsc && this.chargeGain) {
        const t = this.ctx.currentTime;
        this.chargeGain.gain.cancelScheduledValues(t);
        this.chargeGain.gain.setValueAtTime(this.chargeGain.gain.value, t);
        this.chargeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        
        const oldOsc = this.chargeOsc;
        setTimeout(() => {
            try {
                oldOsc.stop();
            } catch(e){}
        }, 150);
        
        this.chargeOsc = null;
        this.chargeGain = null;
    }
  }

  // --- Tension (Old, remove or keep empty) ---
  public startTension() {}
  public stopTension() {}

  // --- Beeps ---

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

  public playSlap(grade: SlapGrade) {
    this.init();
    if (!this.enabled || !this.ctx) return;
    
    // Stop any charge sound immediately
    this.stopChargeSound();
    
    if (grade === SlapGrade.PERFECT) {
      // PERFECT: Deep Thud + Sharp Crack + Low Rumble
      this.playTone(100, 30, 'square', 0.5, 0.4); // Bass drop
      this.playNoise(0.5, 0.3); // Heavy Impact
      // Delayed rattle echo
      setTimeout(() => this.playNoise(0.3, 0.2), 100); 
    } 
    else if (grade === SlapGrade.GOOD) {
      // GOOD: Standard slap
      this.playTone(150, 60, 'triangle', 0.3, 0.2);
      this.playNoise(0.3, 0.15);
    } 
    else {
      // MISS: Hollow tap, high pitch, weak
      this.playTone(300, 200, 'sine', 0.2, 0.1); // "Boop" sound
      this.playNoise(0.1, 0.05); // Tiny scratch
    }
  }

  private playTone(startFreq: number, endFreq: number, type: OscillatorType, volume: number, duration: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(volume: number, duration: number) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  public playWin() {
    this.playBeep(523.25, 'sine', 0.1, 0.2);
    setTimeout(() => this.playBeep(659.25, 'sine', 0.1, 0.2), 100);
    setTimeout(() => this.playBeep(783.99, 'sine', 0.4, 0.2), 200);
  }
}

export const audioManager = new AudioManager();
