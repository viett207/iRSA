import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SoundService {
  private audioCtx: AudioContext | null = null;

  readonly soundEnabled = signal<boolean>(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('notification_sound_enabled') !== 'false'
      : true
  );

  constructor() {
    this.initUnlockListener();
  }

  /**
   * Unlock AudioContext on the first user interaction (click/touch/keydown)
   * to comply with browser Autoplay Policy.
   */
  private initUnlockListener(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.getAudioContext();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    return this.audioCtx;
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled.set(enabled);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('notification_sound_enabled', String(enabled));
    }
  }

  toggleSound(): void {
    this.setSoundEnabled(!this.soundEnabled());
  }

  /**
   * Play a crisp, gentle two-tone chime for incoming chat messages (D5 -> A5)
   */
  playMessageSound(): void {
    if (!this.soundEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Tone 1: 587.33 Hz (D5)
      this.playTone(ctx, 587.33, now, 0.12, 0.22);
      // Tone 2: 880.00 Hz (A5)
      this.playTone(ctx, 880.0, now + 0.1, 0.18, 0.18);
    } catch {
      // Audio playback should never break application logic
    }
  }

  /**
   * Play an elegant 3-tone notification chime for system / interview notifications (E5 -> G#5 -> B5)
   */
  playNotificationSound(): void {
    if (!this.soundEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Triad chime: 659.25Hz -> 830.61Hz -> 987.77Hz
      this.playTone(ctx, 659.25, now, 0.1, 0.18);
      this.playTone(ctx, 830.61, now + 0.08, 0.1, 0.2);
      this.playTone(ctx, 987.77, now + 0.16, 0.22, 0.22);
    } catch {
      // Audio playback should never break application logic
    }
  }

  private playTone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    peakVolume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, startTime);

    // Smooth envelope: quick attack -> exponential decay
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakVolume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }
}
