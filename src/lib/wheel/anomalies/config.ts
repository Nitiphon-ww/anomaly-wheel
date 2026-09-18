import { ANOMALIES } from "./registry";
import type { Anomaly, ForcedEvent } from "./types";

export const ANOMALY_CONFIG = { chance: 0.15 } as const;

export function enabledAnomalies(registry: readonly Anomaly[] = ANOMALIES) {
  return registry.filter((event) => event.enabled);
}

/** Actual Random-mode odds; an empty event pool falls back to normal play. */
export function anomalyProbabilities(registry: readonly Anomaly[] = ANOMALIES) {
  const enabledCount = enabledAnomalies(registry).length;
  const special = enabledCount ? ANOMALY_CONFIG.chance : 0;
  const perAnomalyPool = enabledCount ? 1 / enabledCount : 0;
  return {
    normal: 1 - special,
    special,
    enabledCount,
    perAnomalyPool,
    perAnomalySpin: special * perAnomalyPool,
  };
}

/** Prize selection is independent. Rarity is cosmetic; no cooldown filtering. */
export function selectAnomaly(
  force: ForcedEvent,
  random: () => number,
  registry: readonly Anomaly[] = ANOMALIES,
): Anomaly | null {
  if (force === "normal") return null;
  if (force !== "random") {
    const forced = registry.find((event) => event.id === force);
    if (!forced) throw new Error("Unknown forced event");
    return forced;
  }
  // Stage 1: independent 85/15 normal/special gate.
  if (random() >= ANOMALY_CONFIG.chance) return null;
  const enabled = enabledAnomalies(registry);
  if (!enabled.length) return null;
  // Stage 2: equal intervals over the dynamically enabled pool.
  return enabled[Math.floor(random() * enabled.length)];
}
