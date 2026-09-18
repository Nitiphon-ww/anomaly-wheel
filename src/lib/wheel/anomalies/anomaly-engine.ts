import { spinProgress } from "../spin-engine";
import type { Prize } from "@/types/wheel";
import { AnimationScope, browserScheduler } from "./animation-scope";
import {
  centerFor,
  crossingCount,
  directionalTarget,
  indexAtPointer,
} from "./geometry";
import type {
  Anomaly,
  AnomalyContext,
  EngineCallbacks,
  Effects,
  Scheduler,
  Status,
  VisualState,
} from "./types";

export const cleanEffects = (): Effects => ({
  concealed: false,
  glitch: false,
  jackpot: false,
  message: "",
  earlyPrize: null,
  eliminatingIds: [],
});
export class AnomalyEngine {
  private scope: AnimationScope;
  private active = false;
  private disposed = false;
  private event: Anomaly | null = null;
  private context: AnomalyContext | null = null;
  private wheel = 0;
  private pointer = 0;
  private visual: VisualState;
  private status: Status = {
    state: "IDLE",
    phase: "READY",
    targetAngle: null,
    targetKind: "wheel",
  };
  constructor(
    private prizes: readonly Prize[],
    private callbacks: EngineCallbacks,
    private scheduler: Scheduler = browserScheduler,
  ) {
    this.scope = new AnimationScope(scheduler);
    this.visual = { ...cleanEffects(), visualWeights: prizes.map(() => 1) };
  }
  /** Configuration may change only while idle; each run owns a stable item list. */
  setPrizes(prizes: readonly Prize[]) {
    if (this.active || this.disposed)
      throw new Error("Cannot edit items during a spin");
    this.prizes = prizes.map((prize) => ({ ...prize }));
    this.restoreVisuals();
    this.frame(0, 0, false);
    this.statusChange({ state: "IDLE", phase: "READY", targetAngle: null });
  }
  get snapshot() {
    return {
      ...this.status,
      wheelAngle: this.wheel,
      pointerAngle: this.pointer,
      visual: this.visual,
      active: this.active,
      pendingFrames: this.scope.activeFrames,
    };
  }
  private statusChange(patch: Partial<Status>) {
    if (this.disposed) return;
    this.status = { ...this.status, ...patch };
    this.callbacks.onStatus(this.status);
  }
  private effects(patch: Partial<Effects>) {
    if (this.disposed) return;
    this.visual = { ...this.visual, ...patch };
    this.callbacks.onVisual(this.visual);
  }
  private frame(wheel: number, pointer: number, ticks = true) {
    if (ticks) {
      const count = crossingCount(
        this.pointer - this.wheel,
        pointer - wheel,
        this.visual.visualWeights,
      );
      for (let i = 0; i < count; i++) this.callbacks.onTick();
    }
    this.wheel = wheel;
    this.pointer = pointer;
    this.callbacks.onFrame(wheel, pointer);
  }
  private restoreVisuals() {
    this.visual = {
      ...cleanEffects(),
      visualWeights: this.prizes.map(() => 1),
    };
    this.callbacks.onVisual(this.visual);
  }
  private async rotate(
    kind: "wheel" | "pointer",
    target: number,
    duration: number,
    phase: string,
  ) {
    if (this.disposed) throw new Error("Animation cancelled");
    const start = kind === "wheel" ? this.wheel : this.pointer;
    this.statusChange({
      targetAngle: target,
      targetKind: kind,
      phase,
      state:
        this.status.state === "RESETTING"
          ? "RESETTING"
          : this.event
            ? "ANOMALY_RUNNING"
            : "NORMAL_SPIN",
    });
    this.callbacks.onSpinAudio(true);
    let decelerating = false;
    try {
      await this.scope.tween(duration, (p) => {
        if (p >= 0.25 && !decelerating) {
          decelerating = true;
          this.statusChange({
            state:
              this.status.state === "RESETTING" ? "RESETTING" : "DECELERATING",
            phase: `${phase}_DECELERATING`,
          });
        }
        const angle =
          p === 1 ? target : start + (target - start) * spinProgress(p);
        this.frame(
          kind === "wheel" ? angle : this.wheel,
          kind === "pointer" ? angle : this.pointer,
        );
      });
    } finally {
      this.callbacks.onSpinAudio(false);
    }
  }
  /** One uninterrupted rotation timeline; geometry has its own scoped timelines. */
  private async spinWhile(
    winner: Prize,
    work: () => Promise<void>,
    finalTurns: number,
  ) {
    const initial = this.wheel;
    const acceleration = 1200;
    const velocity = 0.9; // degrees/ms at cruise speed
    let elapsed = 0;
    let braking: {
      at: number;
      start: number;
      target: number;
      duration: number;
    } | null = null;
    this.statusChange({
      state: "ANOMALY_RUNNING",
      phase: "ELIMINATION_ACCELERATING",
      targetAngle: null,
      targetKind: "wheel",
    });
    this.callbacks.onSpinAudio(true, true);
    const rotation = this.scope.drive((time) => {
      elapsed = time;
      if (braking) {
        const p = Math.min(1, (time - braking.at) / braking.duration);
        // Initial derivative equals cruise velocity; no restart, pause, or velocity jump.
        const angle =
          p === 1
            ? braking.target
            : braking.start +
              (braking.target - braking.start) * (1 - (1 - p) ** 3);
        this.frame(angle, this.pointer);
        return p === 1;
      }
      const u = Math.min(1, time / acceleration);
      const distance =
        time < acceleration
          ? velocity * acceleration * (u ** 3 - 0.5 * u ** 4)
          : velocity * (time - acceleration / 2);
      this.frame(initial + distance, this.pointer);
      return false;
    });
    const geometry = (async () => {
      await work();
      if (this.disposed) throw new Error("Animation cancelled");
      const center = centerFor(
        this.visual.visualWeights,
        this.prizes.findIndex((p) => p.id === winner.id),
      );
      const target = directionalTarget(
        this.wheel,
        this.pointer - center,
        finalTurns,
      );
      braking = {
        at: elapsed,
        start: this.wheel,
        target,
        duration: (3 * (target - this.wheel)) / velocity,
      };
      this.statusChange({
        state: "DECELERATING",
        phase: "ELIMINATION_FINAL_DECELERATION",
        targetAngle: target,
      });
    })();
    try {
      await Promise.all([rotation, geometry]);
    } finally {
      this.callbacks.onSpinAudio(false);
    }
  }
  async run(
    winner: Prize,
    event: Anomaly | null,
    random: () => number,
    variant: number | null = null,
  ): Promise<Prize> {
    if (this.active || this.disposed) throw new Error("Engine is unavailable");
    if (this.prizes.length < 2)
      throw new Error("At least two items are required");
    if (!this.prizes.some((p) => p.id === winner.id))
      throw new Error("Unknown winner");
    this.scope.cancel();
    this.scope = new AnimationScope(this.scheduler);
    this.active = true;
    this.event = event;
    this.restoreVisuals();
    this.frame(this.wheel, 0, false);
    this.statusChange({
      state: "PREPARING",
      phase: "PRIZE_SELECTED",
      targetAngle: null,
      targetKind: "wheel",
    });
    const context = AnomalyEngine.makeContext(
      this,
      winner,
      event,
      random,
      variant,
    );
    this.context = context;
    try {
      if (event) {
        this.statusChange({ state: "ANOMALY_PREPARING", phase: "PREPARE" });
        await event.prepare(context);
        if (this.disposed) throw new Error("Animation cancelled");
        await event.play(context);
        if (this.disposed) throw new Error("Animation cancelled");
        await event.resolve(context);
      } else await context.spinToWinner();
      if (this.disposed) throw new Error("Animation cancelled");
      const actual = indexAtPointer(
        this.wheel,
        this.pointer,
        this.visual.visualWeights,
      );
      if (this.prizes[actual]?.id !== winner.id)
        throw new Error("Landing invariant failed");
      this.effects({ earlyPrize: null, message: "" });
      this.statusChange({ state: "RESULT", phase: "RESULT_CONFIRMED" });
      return winner;
    } catch (error) {
      if (!this.disposed) this.resetImmediately();
      throw error;
    }
  }
  private static makeContext(
    engine: AnomalyEngine,
    winner: Prize,
    event: Anomaly | null,
    random: () => number,
    variant: number | null,
  ): AnomalyContext {
    const context: AnomalyContext = {
      prizes: engine.prizes,
      winner,
      variant,
      get wheelAngle() {
        return engine.wheel;
      },
      get pointerAngle() {
        return engine.pointer;
      },
      get visualWeights() {
        return engine.visual.visualWeights;
      },
      random,
      phase(name) {
        engine.statusChange({
          phase: name,
          state:
            engine.status.state === "RESETTING"
              ? "RESETTING"
              : event
                ? "ANOMALY_RUNNING"
                : "NORMAL_SPIN",
        });
      },
      effects(patch) {
        engine.effects(patch);
      },
      pause(ms) {
        return engine.scope.tween(ms, () => {});
      },
      rotateWheel(target, duration, phase) {
        return engine.rotate("wheel", target, duration, phase);
      },
      rotatePointer(target, duration, phase) {
        return engine.rotate("pointer", target, duration, phase);
      },
      spinToWinner(duration = 6500, turns = 6, direction = 1) {
        return context.spinToPrize(winner, duration, turns, direction);
      },
      spinToPrize(prize, duration, turns, direction = 1) {
        const center = centerFor(
          engine.visual.visualWeights,
          engine.prizes.findIndex((p) => p.id === prize.id),
        );
        return context.rotateWheel(
          directionalTarget(
            engine.wheel,
            engine.pointer - center,
            turns,
            direction,
          ),
          duration,
          "WHEEL_SPIN",
        );
      },
      async morph(weights, duration = 480) {
        if (
          weights.length !== engine.prizes.length ||
          weights[engine.prizes.findIndex((p) => p.id === winner.id)] <= 0
        )
          throw new Error("Geometry must preserve the selected prize");
        // Validate before starting the transition.
        centerFor(
          weights,
          engine.prizes.findIndex((p) => p.id === winner.id),
        );
        const total = weights.reduce((a, b) => a + b, 0);
        const fromTotal = engine.visual.visualWeights.reduce(
          (a, b) => a + b,
          0,
        );
        const from = engine.visual.visualWeights.map((w) => w / fromTotal);
        const to = weights.map((w) => w / total);
        await engine.scope.tween(duration, (p) => {
          const eased = p * p * (3 - 2 * p);
          engine.visual = {
            ...engine.visual,
            visualWeights: to.map((w, i) =>
              p === 1 ? w : from[i] + (w - from[i]) * eased,
            ),
          };
          engine.callbacks.onVisual(engine.visual);
        });
      },
      spinWhile(work, finalTurns) {
        return engine.spinWhile(winner, work, finalTurns);
      },
      markEliminating(indexes) {
        if (
          indexes.some(
            (index) =>
              index < 0 ||
              index >= engine.prizes.length ||
              engine.prizes[index].id === winner.id,
          )
        )
          throw new Error("Cannot eliminate the selected winner");
        engine.effects({
          eliminatingIds: indexes.map((index) => engine.prizes[index].id),
        });
        if (indexes.length) engine.callbacks.onElimination?.();
      },
      alignWinner() {
        const center = centerFor(
          engine.visual.visualWeights,
          engine.prizes.findIndex((p) => p.id === winner.id),
        );
        const target = directionalTarget(
          engine.wheel,
          engine.pointer - center,
          0,
        );
        engine.statusChange({ targetAngle: target, targetKind: "wheel" });
        engine.frame(target, engine.pointer, false);
      },
      restoreVisuals() {
        engine.restoreVisuals();
      },
    };
    return context;
  }
  async close(): Promise<void> {
    if (!this.active || this.status.state !== "RESULT" || !this.context) return;
    this.statusChange({ state: "RESETTING", phase: "RESTORING_BASELINE" });
    try {
      await this.event?.cleanup(this.context);
    } finally {
      if (!this.disposed) {
        // Defense in depth: the engine resets even if a controller omits something.
        this.restoreVisuals();
        if (this.event) {
          this.pointer = 0;
          this.context.alignWinner();
        }
        this.frame(this.wheel, 0, false);
        this.scope.cancel();
        this.active = false;
        this.context = null;
        this.event = null;
        this.statusChange({
          state: "IDLE",
          phase: "READY",
          targetAngle: null,
          targetKind: "wheel",
        });
      }
    }
  }
  private resetImmediately() {
    this.scope.cancel();
    this.callbacks.onSpinAudio(false);
    this.restoreVisuals();
    this.frame(this.wheel, 0, false);
    this.active = false;
    this.context = null;
    this.event = null;
    this.statusChange({
      state: "IDLE",
      phase: "READY",
      targetAngle: null,
      targetKind: "wheel",
    });
  }
  dispose() {
    this.resetImmediately();
    this.disposed = true;
  }
}
