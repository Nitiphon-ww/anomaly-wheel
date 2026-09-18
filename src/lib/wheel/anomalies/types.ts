import type { Prize } from "@/types/wheel";

export type Rarity = "Common" | "Uncommon" | "Rare" | "Legendary";
export type GameState =
  | "IDLE"
  | "PREPARING"
  | "NORMAL_SPIN"
  | "ANOMALY_PREPARING"
  | "ANOMALY_RUNNING"
  | "DECELERATING"
  | "RESULT"
  | "RESETTING";
export type EventId =
  | "fake-stop"
  | "reverse-spin"
  | "speed-boost"
  | "pointer-spin"
  | "random-segment-size"
  | "instant-reveal"
  | "single-segment"
  | "two-segment"
  | "glitch"
  | "mystery-mode"
  | "jackpot-mode";
export type ForcedEvent = "random" | "normal" | EventId;
export type Effects = {
  concealed: boolean;
  glitch: boolean;
  jackpot: boolean;
  message: string;
  earlyPrize: string | null;
  eliminatingIds: string[];
};
export type VisualState = Effects & { visualWeights: number[] };
export type Status = {
  state: GameState;
  phase: string;
  targetAngle: number | null;
  targetKind: "wheel" | "pointer";
};
export interface AnomalyContext {
  readonly prizes: readonly Prize[];
  readonly winner: Prize;
  readonly variant: number | null;
  readonly wheelAngle: number;
  readonly pointerAngle: number;
  readonly visualWeights: readonly number[];
  random(): number;
  phase(name: string): void;
  effects(patch: Partial<Effects>): void;
  pause(ms: number): Promise<void>;
  rotateWheel(target: number, duration: number, phase: string): Promise<void>;
  rotatePointer(target: number, duration: number, phase: string): Promise<void>;
  spinToWinner(
    duration?: number,
    turns?: number,
    direction?: 1 | -1,
  ): Promise<void>;
  spinToPrize(
    prize: Prize,
    duration: number,
    turns: number,
    direction?: 1 | -1,
  ): Promise<void>;
  morph(weights: readonly number[], duration?: number): Promise<void>;
  spinWhile(work: () => Promise<void>, finalTurns: number): Promise<void>;
  markEliminating(indexes: readonly number[]): void;
  alignWinner(): void;
  restoreVisuals(): void;
}
export interface Anomaly {
  id: EventId;
  name: string;
  enabled: boolean;
  rarity: Rarity;
  prepare(context: AnomalyContext): Promise<void>;
  play(context: AnomalyContext): Promise<void>;
  resolve(context: AnomalyContext): Promise<void>;
  cleanup(context: AnomalyContext): Promise<void>;
}
export type Scheduler = {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
};
export type EngineCallbacks = {
  onFrame(wheel: number, pointer: number): void;
  onVisual(visual: VisualState): void;
  onStatus(status: Status): void;
  onTick(): void;
  onSpinAudio(active: boolean, sustained?: boolean): void;
  onElimination?(): void;
};
