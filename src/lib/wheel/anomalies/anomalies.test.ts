import assert from "node:assert/strict";
import { test } from "node:test";
import { PRIZES } from "../prizes";
import { AnomalyEngine, cleanEffects } from "./anomaly-engine";
import { ANOMALIES } from "./registry";
import { ANOMALY_CONFIG, anomalyProbabilities, selectAnomaly } from "./config";
import {
  arcPath,
  boundaries,
  centerFor,
  crossingCount,
  directionalTarget,
  indexAtPointer,
} from "./geometry";
import type { Anomaly, Scheduler, VisualState } from "./types";

class Clock implements Scheduler {
  now = 0;
  next = 1;
  frames = new Map<number, FrameRequestCallback>();
  request = (callback: FrameRequestCallback) => {
    const id = this.next++;
    this.frames.set(id, callback);
    return id;
  };
  cancel = (id: number) => {
    this.frames.delete(id);
  };
  async step() {
    this.now += 100;
    const callbacks = [...this.frames.values()];
    this.frames.clear();
    callbacks.forEach((callback) => callback(this.now));
    for (let i = 0; i < 12; i++) await Promise.resolve();
  }
  async settle<T>(promise: Promise<T>): Promise<T> {
    let done = false;
    let value: T | undefined;
    let error: unknown;
    promise.then(
      (v) => {
        value = v;
        done = true;
      },
      (e) => {
        error = e;
        done = true;
      },
    );
    for (let i = 0; i < 400 && !done; i++) await this.step();
    assert.ok(done, "controller must finish within 40 seconds");
    if (error) throw error;
    return value as T;
  }
}
function fixture() {
  const clock = new Clock();
  const phases: string[] = [];
  const visuals: VisualState[] = [];
  let ticks = 0;
  const engine = new AnomalyEngine(
    PRIZES,
    {
      onFrame() {},
      onVisual(v) {
        visuals.push(v);
      },
      onStatus(s) {
        phases.push(s.phase);
      },
      onTick() {
        ticks++;
      },
      onSpinAudio() {},
    },
    clock,
  );
  return { clock, engine, phases, visuals, ticks: () => ticks };
}
function assertClean(engine: AnomalyEngine, clock: Clock) {
  const s = engine.snapshot;
  assert.equal(s.state, "IDLE");
  assert.equal(s.active, false);
  assert.equal(s.pointerAngle, 0);
  assert.equal(s.pendingFrames, 0);
  assert.equal(clock.frames.size, 0);
  assert.deepEqual(s.visual, {
    ...cleanEffects(),
    visualWeights: PRIZES.map(() => 1),
  });
}

for (const event of [null, ...ANOMALIES] as (Anomaly | null)[]) {
  test(`${event?.name ?? "Normal"}: every prize lands, cleans up, then supports a normal spin`, async () => {
    const original = JSON.stringify(PRIZES);
    for (const prize of PRIZES) {
      const f = fixture();
      const result = await f.clock.settle(
        f.engine.run(prize, event, () => 0.37),
      );
      assert.equal(result.id, prize.id);
      const s = f.engine.snapshot;
      assert.equal(s.state, "RESULT");
      assert.equal(
        PRIZES[
          indexAtPointer(s.wheelAngle, s.pointerAngle, s.visual.visualWeights)
        ].id,
        prize.id,
      );
      assert.equal(s.pendingFrames, 0);
      if (event?.id === "pointer-spin") {
        assert.equal(s.wheelAngle, 0);
        assert.ok(s.pointerAngle >= 1800);
      }
      if (event?.id === "single-segment")
        assert.equal(s.visual.visualWeights.filter(Boolean).length, 1);
      if (event?.id === "two-segment")
        assert.deepEqual(s.visual.visualWeights.filter(Boolean), [0.5, 0.5]);
      await f.clock.settle(f.engine.close());
      assertClean(f.engine, f.clock);
      await f.clock.settle(f.engine.run(PRIZES[7], null, () => 0.37));
      assert.equal(
        indexAtPointer(
          f.engine.snapshot.wheelAngle,
          0,
          f.engine.snapshot.visual.visualWeights,
        ),
        7,
      );
      await f.clock.settle(f.engine.close());
      assertClean(f.engine, f.clock);
      assert.equal(
        JSON.stringify(PRIZES),
        original,
        "anomaly cannot alter prize probability data",
      );
    }
  });
}

test("all reverse and instant-reveal variations honor the winner", async () => {
  for (const [id, count] of [
    ["reverse-spin", 3],
    ["instant-reveal", 4],
  ] as const) {
    for (let variant = 0; variant < count; variant++) {
      const f = fixture();
      const event = ANOMALIES.find((e) => e.id === id)!;
      await f.clock.settle(f.engine.run(PRIZES[5], event, () => 0.5, variant));
      for (const visual of f.visuals)
        if (visual.earlyPrize) assert.equal(visual.earlyPrize, PRIZES[5].label);
      assert.equal(
        indexAtPointer(
          f.engine.snapshot.wheelAngle,
          f.engine.snapshot.pointerAngle,
          f.engine.snapshot.visual.visualWeights,
        ),
        5,
      );
      await f.clock.settle(f.engine.close());
      assertClean(f.engine, f.clock);
    }
  }
});

test("cancellation at preparation, motion, and concurrent reveals releases all frames", async () => {
  for (const event of ANOMALIES) {
    for (const steps of [0, 8, 25]) {
      const f = fixture();
      const running = f.engine
        .run(
          PRIZES[3],
          event,
          () => 0.9,
          event.id === "instant-reveal" ? 3 : null,
        )
        .catch(() => null);
      for (let i = 0; i < steps; i++) await f.clock.step();
      f.engine.dispose();
      await running;
      await f.clock.step();
      assertClean(f.engine, f.clock);
    }
  }
});

test("failure in a controller or cleanup restores baseline and unlocks engine", async () => {
  const f = fixture();
  const bad = {
    ...ANOMALIES[0],
    async play(c: Parameters<Anomaly["play"]>[0]) {
      c.effects({ glitch: true });
      throw new Error("test failure");
    },
  };
  await assert.rejects(
    f.clock.settle(f.engine.run(PRIZES[0], bad, () => 0.5)),
    /test failure/,
  );
  assertClean(f.engine, f.clock);
  const badCleanup = {
    ...ANOMALIES[0],
    async cleanup() {
      throw new Error("cleanup failure");
    },
  };
  await f.clock.settle(f.engine.run(PRIZES[0], badCleanup, () => 0.5));
  await assert.rejects(f.clock.settle(f.engine.close()), /cleanup failure/);
  assertClean(f.engine, f.clock);
});

test("85/15 gate and equal dynamic enabled pools, independent of rarity and history", () => {
  assert.equal(ANOMALY_CONFIG.chance, 0.15);
  for (const count of [1, 2, 5, 8, 11]) {
    const registry = ANOMALIES.map((event, i) => ({ ...event, enabled: i < count }));
    const enabled = registry.filter(event => event.enabled);
    const picks = new Map<string, number>();
    // A stratified sweep gives every equal interval exactly 100 tickets.
    for (let i = 0; i < count * 100; i++) {
      let calls = 0;
      const picked = selectAnomaly("random", () => calls++ === 0 ? 0.149999 : (i + .5) / (count * 100), registry)!;
      assert.equal(calls, 2);
      picks.set(picked.id, (picks.get(picked.id) ?? 0) + 1);
    }
    enabled.forEach(event => assert.equal(picks.get(event.id), 100));
    for (let i = 0; i < count; i++) {
      let call = 0;
      assert.equal(selectAnomaly("random", () => call++ === 0 ? 0 : i / count, registry)?.id, enabled[i].id);
    }
    const odds = anomalyProbabilities(registry);
    assert.equal(odds.enabledCount, count);
    assert.equal(odds.normal, .85);
    assert.equal(odds.special, .15);
    assert.equal(odds.perAnomalyPool, 1 / count);
    assert.equal(odds.perAnomalySpin, .15 / count);
    // Repeated selection is allowed: no cooldown silently changes eligibility.
    for (let i = 0; i < 3; i++) assert.equal(selectAnomaly("random", () => 0, registry)?.id, enabled[0].id);
  }
  let gateCalls = 0;
  assert.equal(selectAnomaly("random", () => { gateCalls++; return .15; }), null);
  assert.equal(gateCalls, 1);
  const disabled = ANOMALIES.map(event => ({...event, enabled:false}));
  assert.equal(selectAnomaly("random", () => 0, disabled), null);
  assert.deepEqual(anomalyProbabilities(disabled), {normal:1,special:0,enabledCount:0,perAnomalyPool:0,perAnomalySpin:0});
});

test("all forced events bypass random draws and enabled flags", () => {
  const noRoll = () => { throw new Error("must not roll"); };
  const disabled = ANOMALIES.map(event => ({...event,enabled:false}));
  for (const event of disabled) assert.equal(selectAnomaly(event.id, noRoll, disabled), event);
  assert.equal(selectAnomaly("normal", noRoll), null);
});

test("unequal/full-circle geometry and bidirectional boundary crossings", () => {
  const weights = [12, 4, 38, 7, 18, 3, 10, 8];
  assert.equal(boundaries(weights).at(-1), 360);
  for (let i = 0; i < 8; i++) {
    for (const direction of [1, -1] as const) {
      const wheel = directionalTarget(
        145.7,
        -centerFor(weights, i),
        6,
        direction,
      );
      assert.equal(indexAtPointer(wheel, 0, weights), i);
      const pointer = directionalTarget(0, 145.7 + centerFor(weights, i), 8);
      assert.equal(indexAtPointer(145.7, pointer, weights), i);
    }
  }
  assert.equal(crossingCount(1, 721, weights), 16);
  assert.equal(crossingCount(721, 1, weights), 16);
  assert.equal((arcPath(0, 360).match(/ A /g) ?? []).length, 2);
  assert.equal(arcPath(0, 0), "");
});

test("the requested mixed sequence preserves normal baseline after every event", async () => {
  const f = fixture();
  for (const id of [
    "normal",
    "pointer-spin",
    "normal",
    "single-segment",
    "normal",
    "two-segment",
    "normal",
    "random-segment-size",
    "fake-stop",
    "glitch",
    "normal",
  ]) {
    const event = ANOMALIES.find((e) => e.id === id) ?? null;
    await f.clock.settle(f.engine.run(PRIZES[5], event, () => 0.6));
    assert.equal(
      indexAtPointer(
        f.engine.snapshot.wheelAngle,
        f.engine.snapshot.pointerAngle,
        f.engine.snapshot.visual.visualWeights,
      ),
      5,
    );
    await f.clock.settle(f.engine.close());
    assertClean(f.engine, f.clock);
  }
});
