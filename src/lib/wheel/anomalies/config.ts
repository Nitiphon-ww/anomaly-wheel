import { ANOMALIES } from "./registry";
import type { Anomaly, ForcedEvent } from "./types";

export type SpinBehavior = {
  id: Exclude<ForcedEvent, "random">;
  name: string;
  enabled: boolean;
  anomaly: Anomaly | null;
};

export const NORMAL_BEHAVIOR: SpinBehavior = {
  id: "normal", name: "Normal Spin", enabled: true, anomaly: null,
};

export function behaviorRegistry(): SpinBehavior[] {
  return [NORMAL_BEHAVIOR, ...ANOMALIES.map(anomaly => ({
    id: anomaly.id, name: anomaly.name, enabled: anomaly.enabled, anomaly,
  }))];
}

export function behaviorProbabilities(registry = behaviorRegistry()) {
  const enabledCount = registry.filter(behavior => behavior.enabled).length;
  return { enabledCount, perBehavior: enabledCount ? 1 / enabledCount : 0 };
}

function randomUint32() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/** Rejection sampling avoids the tiny modulo bias when count does not divide 2^32. */
export function uniformIndex(count: number, random = randomUint32): number {
  const range = 0x1_0000_0000;
  if (!Number.isInteger(count) || count < 1 || count > range)
    throw new Error("Invalid behavior count");
  const limit = range - (range % count);
  let ticket: number;
  do {
    ticket = random();
    if (!Number.isInteger(ticket) || ticket < 0 || ticket >= range)
      throw new Error("Random source must return an unsigned 32-bit integer");
  } while (ticket >= limit);
  return ticket % count;
}

/** One independent uniform draw; no rarity weights, cooldowns or shuffle bag. */
export function selectBehavior(
  force: ForcedEvent,
  randomIndex: (count: number) => number = uniformIndex,
  registry: readonly SpinBehavior[] = behaviorRegistry(),
): SpinBehavior {
  if (force !== "random") {
    const forced = registry.find(behavior => behavior.id === force);
    if (!forced) throw new Error("Unknown forced behavior");
    return forced;
  }
  const enabled = registry.filter(behavior => behavior.enabled);
  if (!enabled.length) throw new Error("Enable at least one spin behavior");
  const index = randomIndex(enabled.length);
  if (!Number.isInteger(index) || index < 0 || index >= enabled.length)
    throw new Error("Invalid random behavior index");
  return enabled[index];
}
