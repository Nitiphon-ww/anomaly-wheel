import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeAngle,
  prizeIndexAtPointer,
  targetAngleForPrize,
} from "./geometry";
import { selectPrize } from "./probability";
import { PRIZES } from "./prizes";
import { runSpin, spinProgress } from "./spin-engine";

test("all eight prizes land at the pointer from arbitrary and repeated starting angles", () => {
  for (const start of [0, 12.4, 359.9, 2475, 100000]) {
    for (let index = 0; index < 8; index++) {
      const end = targetAngleForPrize(start, index, 8);
      assert.equal(prizeIndexAtPointer(end, 8), index);
      assert.ok(end - start >= 2160 && end - start < 2520);
      assert.ok(Math.abs(normalizeAngle(-end) - (index + 0.5) * 45) < 1e-7);
    }
  }
  let angle = 0;
  for (let spin = 0; spin < 500; spin++) {
    const index = spin % 8;
    angle = targetAngleForPrize(angle, index, 8);
    assert.equal(prizeIndexAtPointer(angle, 8), index);
  }
});

test("weighted selection respects interval boundaries and zero weights", () => {
  const prizes = PRIZES.slice(0, 3).map((p, i) => ({
    ...p,
    probabilityWeight: [0, 1, 3][i],
  }));
  assert.equal(selectPrize(prizes, () => 0).id, "prize-2");
  assert.equal(selectPrize(prizes, () => 0.24999).id, "prize-2");
  assert.equal(selectPrize(prizes, () => 0.25).id, "prize-3");
  assert.equal(selectPrize(prizes, () => 0.99999).id, "prize-3");
  const counts = [0, 0, 0];
  for (let i = 0; i < 1000; i++)
    counts[prizes.indexOf(selectPrize(prizes, () => i / 1000))]++;
  assert.deepEqual(counts, [0, 250, 750]);
});

test("invalid probability inputs and geometry are rejected", () => {
  for (const probabilityWeight of [-1, NaN, Infinity])
    assert.throws(() => selectPrize([{ ...PRIZES[0], probabilityWeight }]));
  assert.throws(() => selectPrize([]));
  assert.throws(() => selectPrize([{ ...PRIZES[0], probabilityWeight: 0 }]));
  for (const unit of [-0.1, 1, NaN])
    assert.throws(() => selectPrize(PRIZES, () => unit));
  assert.throws(() => targetAngleForPrize(0, 8, 8));
});

test("motion is monotonic, starts slowly, accelerates and decelerates to rest", () => {
  assert.equal(spinProgress(0), 0);
  assert.equal(spinProgress(1), 1);
  let previous = 0;
  for (let i = 1; i <= 1000; i++) {
    const p = spinProgress(i / 1000);
    assert.ok(p >= previous - 1e-12);
    previous = p;
  }
  const velocity = (t: number) =>
    (spinProgress(t + 0.001) - spinProgress(t)) / 0.001;
  assert.ok(velocity(0) < velocity(0.1));
  assert.ok(velocity(0.1) < velocity(0.25));
  assert.ok(velocity(0.25) > velocity(0.6));
  assert.ok(velocity(0.6) > velocity(0.99));
  assert.ok(velocity(0.999) < 0.0001);
});

test("engine counts crossed boundaries, finishes exactly once, and cancels safely", () => {
  let queued: FrameRequestCallback | null = null;
  const scheduler = {
    request: (callback: FrameRequestCallback) => {
      queued = callback;
      return 1;
    },
    cancel: () => {
      queued = null;
    },
  };

  let ticks = 0;
  let completed = 0;
  let angle = 0;
  const plan = {
    startAngle: 337.5,
    targetAngle: targetAngleForPrize(337.5, 5, 8),
    duration: 6500,
    segmentCount: 8,
  };
  const callbacks = {
    onFrame: (value: number) => {
      angle = value;
    },
    onBoundary: () => {
      ticks++;
    },
    onComplete: () => {
      completed++;
    },
  };
  const pump = (now: number) => {
    const callback = queued;
    queued = null;
    callback?.(now);
  };
  runSpin(plan, callbacks, scheduler);
  [0, 16, 32, 1100, 2000, 6499, 6500, 9000].forEach(pump);
  assert.equal(angle, plan.targetAngle);
  assert.equal(prizeIndexAtPointer(angle, 8), 5);
  assert.equal(
    ticks,
    Math.floor(plan.targetAngle / 45) - Math.floor(plan.startAngle / 45),
  );
  assert.equal(completed, 1);
  const cancel = runSpin(plan, callbacks, scheduler);
  pump(0);
  cancel();
  pump(7000);
  assert.equal(completed, 1);
});
