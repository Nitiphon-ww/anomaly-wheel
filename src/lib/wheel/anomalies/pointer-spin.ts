import { defineAnomaly } from "./controller";
import { centerFor, directionalTarget } from "./geometry";
export default defineAnomaly({
  id: "pointer-spin",
  name: "Pointer Spin",
  rarity: "Rare",
  async play(c) {
    c.effects({ message: "The wheel takes a break." });
    const index = c.prizes.findIndex((p) => p.id === c.winner.id);
    const desired = c.wheelAngle + centerFor(c.visualWeights, index);
    const target = directionalTarget(
      c.pointerAngle,
      desired,
      5 + Math.floor(c.random() * 6),
    );
    await c.rotatePointer(target, 6800, "POINTER_ORBIT");
  },
  async cleanup(c) {
    c.phase("POINTER_RETURNING_HOME");
    await c.rotatePointer(
      Math.ceil(c.pointerAngle / 360) * 360,
      650,
      "POINTER_RETURN",
    );
    c.restoreVisuals();
  },
});
