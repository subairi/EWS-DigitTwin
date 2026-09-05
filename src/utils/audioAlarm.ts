/**
 * Web Audio API synthesizer for River Flood & Battery Critical alarms
 */
class AlarmAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBeeping: boolean = false;
  private currentOsc: OscillatorNode | null = null;
  private currentGain: GainNode | null = null;
  private timeoutId: NodeJS.Timeout | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public stop() {
    this.isBeeping = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.currentOsc) {
      try {
        this.currentOsc.stop();
        this.currentOsc.disconnect();
      } catch {
        // ignore already stopped oscillator
      }
      this.currentOsc = null;
    }
    if (this.currentGain) {
      try {
        this.currentGain.disconnect();
      } catch {
        // ignore
      }
      this.currentGain = null;
    }
  }

  public playAckChime() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.stop();

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // ignore audio context errors
    }
  }

  public playSiren(severity: 'warning' | 'critical' = 'warning') {
    if (this.isMuted || this.isBeeping) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.stop();
    this.isBeeping = true;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      this.currentOsc = osc;
      this.currentGain = gain;

      osc.type = severity === 'critical' ? 'sawtooth' : 'sine';
      const now = ctx.currentTime;

      if (severity === 'critical') {
        // High-pitched alternating warning pulses (flood/critical)
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.6);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);

        this.timeoutId = setTimeout(() => {
          this.isBeeping = false;
          this.currentOsc = null;
        }, 850);
      } else {
        // Warning chime
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.25); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);

        this.timeoutId = setTimeout(() => {
          this.isBeeping = false;
          this.currentOsc = null;
        }, 500);
      }
    } catch {
      this.isBeeping = false;
      this.currentOsc = null;
    }
  }
}

export const alarmAudio = new AlarmAudioEngine();
