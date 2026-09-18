import type { Prize } from "@/types/wheel";

export function randomUnit(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 0x1_0000_0000;
}

/** Weights control selection, never the visual size of a segment. */
export function selectPrize(
  prizes: readonly Prize[],
  random = randomUnit,
): Prize {
  if (
    !prizes.length ||
    prizes.some(
      (p) => !Number.isFinite(p.probabilityWeight) || p.probabilityWeight < 0,
    )
  )
    throw new Error("Prizes require finite, non-negative weights.");
  const total = prizes.reduce((sum, prize) => sum + prize.probabilityWeight, 0);
  if (!Number.isFinite(total) || total <= 0)
    throw new Error("At least one prize must have positive probabilityWeight.");
  const unit = random();
  if (!Number.isFinite(unit) || unit < 0 || unit >= 1)
    throw new Error("Random value must be in [0, 1).");
  const ticket = unit * total;
  let cumulative = 0;
  for (const prize of prizes) {
    cumulative += prize.probabilityWeight;
    if (ticket < cumulative) return prize;
  }
  return [...prizes].reverse().find((prize) => prize.probabilityWeight > 0)!;
}
