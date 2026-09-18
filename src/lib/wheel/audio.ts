/** Replace this adapter with sampled assets without changing the wheel engine. */
export interface WheelAudio {
  unlock(): void;
  setEnabled(enabled: boolean): void;
  startSpin(sustained?: boolean): void;
  eliminate(): void;
  stopSpin(): void;
  tick(): void;
  win(): void;
  stopEffects(): void;
  dispose(): void;
}

export class SynthWheelAudio implements WheelAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private tones = new Set<OscillatorNode>();
  private spin: { oscillator: OscillatorNode; gain: GainNode } | null = null;

  unlock() {
    try {
      this.context ??= new AudioContext();
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.gain.value = this.enabled ? 0.35 : 0;
        this.master.connect(this.context.destination);
      }
      void this.context.resume().catch(() => {});
    } catch {
      /* The game still works when Web Audio is unavailable. */
    }
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        enabled ? 0.35 : 0,
        this.context.currentTime,
        0.015,
      );
  }
  private tone(
    frequency: number,
    duration: number,
    volume: number,
    delay = 0,
    type: OscillatorType = "sine",
  ) {
    if (!this.context || !this.master || !this.enabled) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.master);
    this.tones.add(oscillator);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    oscillator.onended = () => {
      this.tones.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  startSpin(sustained = false) {
    this.stopSpin();
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(65, now);
    oscillator.frequency.linearRampToValueAtTime(145, now + 1.5);
    if (!sustained)
      oscillator.frequency.exponentialRampToValueAtTime(45, now + 6.5);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.5);
    if (!sustained) gain.gain.linearRampToValueAtTime(0, now + 6.5);
    oscillator.connect(gain).connect(this.master);
    oscillator.start();
    this.spin = { oscillator, gain };
  }
  stopSpin() {
    if (!this.spin) return;
    this.spin.oscillator.stop();
    this.spin.oscillator.disconnect();
    this.spin.gain.disconnect();
    this.spin = null;
  }
  tick() {
    this.tone(1100, 0.035, 0.2, 0, "triangle");
  }
  eliminate() {
    this.tone(330, 0.16, 0.18, 0, "triangle");
    this.tone(165, 0.2, 0.12, 0.06);
  }
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((note, i) =>
      this.tone(note, 0.55, 0.24, i * 0.11),
    );
  }
  stopEffects() {
    for (const tone of this.tones) {
      tone.stop();
      tone.disconnect();
    }
    this.tones.clear();
  }
  dispose() {
    this.stopEffects();
    this.stopSpin();
    void this.context?.close().catch(() => {});
    this.context = null;
    this.master = null;
  }
}
