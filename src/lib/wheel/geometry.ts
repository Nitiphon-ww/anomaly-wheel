export const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;

/** Angle 0 is the fixed top pointer; positive angles run clockwise. */
export function pointOnCircle(angle: number, radius: number, center = 300) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  };
}

export function segmentPath(
  index: number,
  count: number,
  radius = 270,
): string {
  const start = pointOnCircle((index * 360) / count, radius);
  const end = pointOnCircle(((index + 1) * 360) / count, radius);
  return `M 300 300 L ${start.x} ${start.y} A ${radius} ${radius} 0 ${360 / count > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`;
}

export function targetAngleForPrize(
  current: number,
  index: number,
  count: number,
  turns = 6,
): number {
  if (
    !Number.isFinite(current) ||
    !Number.isInteger(count) ||
    count < 2 ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= count ||
    !Number.isInteger(turns) ||
    turns < 1
  )
    throw new Error("Invalid wheel geometry.");
  const centerAngle = (index + 0.5) * (360 / count);
  const desiredRotation = normalizeAngle(-centerAngle);
  return (
    current +
    turns * 360 +
    normalizeAngle(desiredRotation - normalizeAngle(current))
  );
}

/** Verification only: the engine never uses this to choose a winner. */
export function prizeIndexAtPointer(angle: number, count: number): number {
  return Math.floor(normalizeAngle(-angle) / (360 / count)) % count;
}
