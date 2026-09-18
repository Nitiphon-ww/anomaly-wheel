import type { SpinPlan } from "@/types/wheel";

/** Integral of 20t(1-t)^3: starts at rest, accelerates, then coasts to rest. */
export function spinProgress(t: number): number {
  const p = Math.min(1, Math.max(0, t));
  return 10 * p ** 2 - 20 * p ** 3 + 15 * p ** 4 - 4 * p ** 5;
}

type Callbacks = {
  onFrame: (angle: number) => void;
  onBoundary: () => void;
  onComplete: () => void;
};

export function runSpin(
  plan: SpinPlan,
  callbacks: Callbacks,
  scheduler = {
    request: (callback: FrameRequestCallback) =>
      requestAnimationFrame(callback),
    cancel: (id: number) => cancelAnimationFrame(id),
  },
): () => void {
  let frame = 0;
  let cancelled = false;
  let started: number | undefined;
  const segmentAngle = 360 / plan.segmentCount;
  let lastBoundary = Math.floor(plan.startAngle / segmentAngle);
  const animate = (now: number) => {
    if (cancelled) return;
    started ??= now;
    const progress = Math.min(1, (now - started) / plan.duration);
    const angle =
      progress === 1
        ? plan.targetAngle
        : plan.startAngle +
          (plan.targetAngle - plan.startAngle) * spinProgress(progress);
    const boundary = Math.floor(angle / segmentAngle);
    // Count every crossed boundary even if a browser frame is delayed.
    for (let i = lastBoundary; i < boundary; i++) callbacks.onBoundary();
    lastBoundary = boundary;
    callbacks.onFrame(angle);
    if (progress === 1) callbacks.onComplete();
    else frame = scheduler.request(animate);
  };
  frame = scheduler.request(animate);
  return () => {
    cancelled = true;
    scheduler.cancel(frame);
  };
}
