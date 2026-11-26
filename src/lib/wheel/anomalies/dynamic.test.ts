import assert from "node:assert/strict";
import { test } from "node:test";
import {
  sampleItems,
  colorItems,
  parseItems,
  serializeItems,
  spinValidation,
  fitSegmentLabel,
  withoutWinningItem,
} from "../items";
import { AnomalyEngine, cleanEffects } from "./anomaly-engine";
import { ANOMALIES } from "./registry";
import { boundaries, indexAtPointer } from "./geometry";
import type { Scheduler } from "./types";

class Clock implements Scheduler {
  now = 0;
  next = 1;
  frames = new Map<number, FrameRequestCallback>();
  request = (cb: FrameRequestCallback) => {
    const id = this.next++;
    this.frames.set(id, cb);
    return id;
  };
  cancel = (id: number) => {
    this.frames.delete(id);
  };
  async step() {
    this.now += 16;
    const frames = [...this.frames.values()];
    this.frames.clear();
    frames.forEach((cb) => cb(this.now));
    for (let i = 0; i < 12; i++) await Promise.resolve();
  }
  async settle<T>(promise: Promise<T>) {
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
    for (let i = 0; i < 4000 && !done; i++) await this.step();
    assert.ok(done);
    if (error) throw error;
    return value as T;
  }
}
const itemsFor = (n: number) =>
  colorItems(
    Array.from({ length: n }, (_, i) => ({
      ...sampleItems()[i % 8],
      id: `item-${i}`,
      label: `Item ${i + 1}`,
    })),
  );

for (const anomaly of [null, ...ANOMALIES]) {
  for (const remove of [false, true]) {
    test(`${anomaly?.id ?? "normal"}: ${remove ? "remove" : "keep"} result restores full geometry and permits next spin`, async () => {
      const items = itemsFor(8);
      items[0].label = items[3].label = "Pizza";
      const original = serializeItems(items);
      const clock = new Clock();
      const engine = new AnomalyEngine(items, {
        onFrame() {}, onVisual() {}, onStatus() {}, onTick() {}, onSpinAudio() {},
      }, clock);
      const winner = await clock.settle(engine.run(items[3], anomaly, () => 0.37));
      await clock.settle(engine.close());
      const next = remove ? colorItems(withoutWinningItem(items, winner)!) : items;
      engine.setPrizes(next);
      assert.equal(serializeItems(items), original, "temporary elimination cannot mutate source items");
      assert.equal(next.length, remove ? 7 : 8);
      assert.ok(next.some((item) => item.id === items[0].id), "duplicate label survives");
      assert.equal(next.some((item) => item.id === winner.id), !remove);
      assert.deepEqual(parseItems(serializeItems(next)), next);
      assert.deepEqual(engine.snapshot.visual, { ...cleanEffects(), visualWeights: next.map(() => 1) });
      assert.equal(engine.snapshot.pointerAngle, 0);
      assert.equal(engine.snapshot.wheelAngle, 0);
      assert.equal(engine.snapshot.pendingFrames, 0);
      const edges = boundaries(engine.snapshot.visual.visualWeights);
      edges.forEach((angle, i) => assert.ok(Math.abs(angle - i * 360 / next.length) < 1e-9));
      await clock.settle(engine.run(next[0], null, () => 0.5));
      assert.equal(indexAtPointer(engine.snapshot.wheelAngle, 0, engine.snapshot.visual.visualWeights), 0);
      await clock.settle(engine.close());
      engine.dispose();
    });
  }
}

test("result removal protects minimum items and requires the current winner ID", () => {
  const items = itemsFor(3);
  assert.equal(withoutWinningItem(items.slice(0, 2), items[0]), null);
  assert.equal(withoutWinningItem(items, { ...items[0], id: "unknown" }), null);
  assert.equal(withoutWinningItem(items, items[0])?.length, 2);
});

test("items: persistence, validation, colors and long Unicode labels", () => {
  const items = itemsFor(20);
  items[0].label = "Free Coffee · กาแฟ ☕";
  assert.deepEqual(parseItems(serializeItems(items)), items);
  assert.deepEqual(parseItems(serializeItems([])), []);
  assert.ok(spinValidation([]));
  assert.ok(spinValidation(itemsFor(1)));
  assert.equal(spinValidation(items), null);
  assert.ok(spinValidation([{ ...items[0], label: "  " }, items[1]]));
  for (const raw of [
    "null",
    "{}",
    '{"version":1,"items":[{"id":"a","label":"x"},{"id":"a","label":"y"}]}',
  ])
    assert.throws(() => parseItems(raw));
  const fit = fitSegmentLabel(
    "An exceptionally long prize description ".repeat(4),
    18,
  );
  assert.ok(fit.text.endsWith("…"));
  assert.ok(fit.fontSize <= 15);
  assert.ok(fitSegmentLabel("กาแฟ".repeat(40), 18).text.length < 160);
});

for (const count of [2, 3, 5, 8, 12, 13, 20])
  for (const id of ["normal", "single-segment", "two-segment"]) {
    test(`${id}: ${count} items, continuous motion, protected winner and next normal spin`, async () => {
      for (const winnerIndex of [0, Math.floor(count / 2), count - 1]) {
        const items = itemsFor(count),
          winner = items[winnerIndex],
          clock = new Clock();
        let previous = -1,
          firstMark = 0,
          marks = 0,
          geometryFrames = 0,
          lastWheel = 0,
          lastTime = 0;
        let audioStarts = 0;
        let morphTicks = 0;
        const engine = new AnomalyEngine(
          items,
          {
            onFrame(angle) {
              if (
                engine.snapshot.state !== "RESETTING" &&
                engine.snapshot.state !== "IDLE"
              ) {
                assert.ok(
                  angle >= previous,
                  "rotation must not reverse/jump backward",
                );
                const phase = engine.snapshot.phase;
                if (phase.startsWith("ELIMINATING") && lastTime) {
                  assert.ok(
                    angle > previous,
                    "rotation cannot stop during elimination",
                  );
                  assert.ok(
                    Math.abs(
                      (angle - previous) / (clock.now - lastTime) - 0.9,
                    ) < 1e-7,
                    "cruise speed cannot jump",
                  );
                }
                previous = angle;
                lastTime = clock.now;
              }
              lastWheel = angle;
            },
            onVisual(v) {
              if (
                engine.snapshot.state === "RESETTING" ||
                engine.snapshot.state === "IDLE"
              )
                return;
              assert.ok(
                v.visualWeights[winnerIndex] > 0,
                "winner survives every frame",
              );
              assert.ok(!v.eliminatingIds.includes(winner.id));
              if (v.eliminatingIds.length) {
                if (!firstMark) {
                  firstMark = clock.now;
                  assert.ok(
                    lastWheel > 600,
                    "wheel has accelerated before eliminating",
                  );
                }
                marks++;
                if (v.visualWeights.some((w) => w > 0 && w < 1))
                  geometryFrames++;
              }
            },
            onStatus() {},
            onTick() {
              morphTicks++;
            },
            onSpinAudio(active) {
              if (active) audioStarts++;
            },
          },
          clock,
        );
        const result = await clock.settle(
          engine.run(
            winner,
            ANOMALIES.find((e) => e.id === id) ?? null,
            () => 0.37,
          ),
        );
        assert.equal(result.id, winner.id);
        const s = engine.snapshot;
        assert.equal(
          indexAtPointer(s.wheelAngle, s.pointerAngle, s.visual.visualWeights),
          winnerIndex,
        );
        assert.ok(morphTicks > 0, "rotation should produce boundary ticks");
        assert.equal(
          audioStarts,
          1,
          "elimination must not restart rotation audio",
        );
        if (id !== "normal") {
          assert.equal(
            s.visual.visualWeights.filter(Boolean).length,
            id === "single-segment" ? 1 : 2,
          );
          if (count > 2 || id === "single-segment") {
            assert.ok(firstMark >= 1350);
            assert.ok(marks > 0);
            assert.ok(geometryFrames > 0);
          }
        }
        await clock.settle(engine.close());
        assert.deepEqual(engine.snapshot.visual, {
          ...cleanEffects(),
          visualWeights: items.map(() => 1),
        });
        assert.equal(clock.frames.size, 0);
        previous = engine.snapshot.wheelAngle;
        lastTime = 0;
        await clock.settle(engine.run(items[0], null, () => 0.5));
        assert.equal(
          indexAtPointer(
            engine.snapshot.wheelAngle,
            0,
            engine.snapshot.visual.visualWeights,
          ),
          0,
        );
        await clock.settle(engine.close());
        engine.setPrizes(itemsFor(3));
        assert.equal(engine.snapshot.visual.visualWeights.length, 3);
        engine.dispose();
        assert.equal(clock.frames.size, 0);
      }
    });
  }

test("cancel concurrent elimination and prohibit editing during a spin", async () => {
  const clock = new Clock(),
    items = itemsFor(20);
  const engine = new AnomalyEngine(
    items,
    {
      onFrame() {},
      onVisual() {},
      onStatus() {},
      onTick() {},
      onSpinAudio() {},
    },
    clock,
  );
  const run = engine.run(
    items[5],
    ANOMALIES.find((e) => e.id === "single-segment")!,
    () => 0.5,
  );
  const rejected = assert.rejects(run, /cancelled/);
  for (let i = 0; i < 160; i++) await clock.step();
  assert.throws(() => engine.setPrizes(itemsFor(5)), /Cannot edit/);
  engine.dispose();
  await rejected;
  assert.equal(clock.frames.size, 0);
});
