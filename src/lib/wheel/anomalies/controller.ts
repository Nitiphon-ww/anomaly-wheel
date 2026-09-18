import type { Anomaly, AnomalyContext } from "./types";

/** Default hooks are deliberately explicit on every controller. */
export function defineAnomaly(
  spec: Pick<
    Anomaly,
    "id" | "name" | "rarity" | "play"
  > &
    Partial<Pick<Anomaly, "prepare" | "resolve" | "cleanup">>,
): Anomaly {
  return {
    enabled: true,
    prepare: async (c) => {
      c.phase("ANOMALY_PREPARING");
    },
    resolve: async () => {},
    cleanup: async (c) => {
      c.restoreVisuals();
    },
    ...spec,
  };
}
export function choose<T>(c: AnomalyContext, items: readonly T[]): T {
  return items[Math.floor(c.random() * items.length)];
}
export function variation(c: AnomalyContext, count: number) {
  return c.variant === null
    ? Math.floor(c.random() * count)
    : Math.min(count - 1, Math.max(0, c.variant));
}
export function shuffledLosers(c: AnomalyContext) {
  const indexes = c.prizes
    .map((_, i) => i)
    .filter((i) => c.prizes[i].id !== c.winner.id);
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(c.random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes;
}
