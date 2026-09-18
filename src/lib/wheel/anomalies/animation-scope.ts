import type { Scheduler } from "./types";

export const browserScheduler: Scheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};
/** Every awaitable animation belongs to one scope; abort rejects pending work. */
export class AnimationScope {
  private pending = new Map<number, () => void>();
  private cancelled = false;
  constructor(private scheduler: Scheduler = browserScheduler) {}
  /** An independent timeline that runs until its callback returns true. */
  drive(update: (elapsed: number) => boolean): Promise<void> {
    if (this.cancelled) return Promise.reject(new Error("Animation cancelled"));
    return new Promise((resolve, reject) => {
      let frame = 0;
      let start: number | undefined;
      const abort = () => reject(new Error("Animation cancelled"));
      const step = (now: number) => {
        this.pending.delete(frame);
        if (this.cancelled) return abort();
        start ??= now;
        let done: boolean;
        try {
          done = update(now - start);
        } catch (error) {
          reject(error);
          return;
        }
        if (done) resolve();
        else {
          frame = this.scheduler.request(step);
          this.pending.set(frame, abort);
        }
      };
      frame = this.scheduler.request(step);
      this.pending.set(frame, abort);
    });
  }
  tween(duration: number, update: (progress: number) => void): Promise<void> {
    return this.drive((elapsed) => {
      const p = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
      update(p);
      return p === 1;
    });
  }
  cancel() {
    this.cancelled = true;
    for (const [id, reject] of this.pending) {
      this.scheduler.cancel(id);
      reject();
    }
    this.pending.clear();
  }
  get activeFrames() {
    return this.pending.size;
  }
}
