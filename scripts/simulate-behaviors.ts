/** CLI-only diagnostic; never imported by the app or included in the UI. */
import { behaviorRegistry, selectBehavior } from "../src/lib/wheel/anomalies/config";

if (process.env.NODE_ENV === "production") {
  throw new Error("Run this diagnostic in development only");
}
const trials = 120_000;
const registry = behaviorRegistry();
const enabled = registry.filter(behavior => behavior.enabled);
const counts = new Map(enabled.map(behavior => [behavior.id, 0]));
let previous = "";
let repeats = 0;
for (let i = 0; i < trials; i++) {
  const selected = selectBehavior("random", undefined, registry);
  counts.set(selected.id, counts.get(selected.id)! + 1);
  if (selected.id === previous) repeats++;
  previous = selected.id;
}
const expected = trials / enabled.length;
let chiSquared = 0;
console.table(enabled.map(behavior => {
  const count = counts.get(behavior.id)!;
  chiSquared += (count - expected) ** 2 / expected;
  return { behavior: behavior.name, count, percent: `${(100 * count / trials).toFixed(4)}%` };
}));
console.log(JSON.stringify({ trials, enabled: enabled.length, expectedPerBehavior: expected, consecutiveRepeats: repeats, chiSquared: Number(chiSquared.toFixed(3)) }));
// Broad diagnostic threshold; deterministic unit tests prove interval equality.
if (enabled.some(behavior => Math.abs(counts.get(behavior.id)! - expected) > expected * .08)) {
  throw new Error("Distribution deviates by more than 8%; investigate selection bias");
}
