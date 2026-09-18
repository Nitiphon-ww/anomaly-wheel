import { normalizeAngle, pointOnCircle } from "../geometry";

export function boundaries(weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (
    !weights.length ||
    total <= 0 ||
    !Number.isFinite(total) ||
    weights.some((w) => !Number.isFinite(w) || w < 0)
  )
    throw new Error("Invalid visual weights");
  let sum = 0;
  return [
    0,
    ...weights.map((weight, i) => {
      sum += weight;
      return i === weights.length - 1 ? 360 : (sum / total) * 360;
    }),
  ];
}
export function centerFor(weights: readonly number[], index: number) {
  const edges = boundaries(weights);
  if (!weights[index]) throw new Error("Winner must remain visible");
  return (edges[index] + edges[index + 1]) / 2;
}
export function directionalTarget(
  current: number,
  desired: number,
  turns: number,
  direction: 1 | -1 = 1,
) {
  return direction === 1
    ? current + turns * 360 + normalizeAngle(desired - current)
    : current - turns * 360 - normalizeAngle(current - desired);
}
export function indexAtPointer(
  wheel: number,
  pointer: number,
  weights: readonly number[],
) {
  const local = normalizeAngle(pointer - wheel);
  const edges = boundaries(weights);
  return weights.findIndex(
    (w, i) => w > 0 && local >= edges[i] && local < edges[i + 1],
  );
}
export function crossingCount(
  from: number,
  to: number,
  weights: readonly number[],
) {
  const edges = boundaries(weights)
    .slice(0, -1)
    .filter((_, i) => weights[i] > 0);
  return edges.reduce(
    (sum, edge) =>
      sum +
      (to >= from
        ? Math.floor((to - edge) / 360) - Math.floor((from - edge) / 360)
        : Math.ceil((from - edge) / 360) - Math.ceil((to - edge) / 360)),
    0,
  );
}
export function arcPath(start: number, end: number, radius = 270) {
  if (end - start < 0.00001) return "";
  const a = pointOnCircle(start, radius);
  if (end - start >= 359.99999) {
    const b = pointOnCircle(start + 180, radius);
    return `M ${a.x} ${a.y} A ${radius} ${radius} 0 1 1 ${b.x} ${b.y} A ${radius} ${radius} 0 1 1 ${a.x} ${a.y} Z`;
  }
  const b = pointOnCircle(end, radius);
  return `M 300 300 L ${a.x} ${a.y} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
}
