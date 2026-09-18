import { defineAnomaly, variation } from "./controller";
export default defineAnomaly({
  id: "reverse-spin",
  name: "Reverse Spin",
  rarity: "Uncommon",
  async play(c) {
    const mode = variation(c, 3);
    await c.rotateWheel(c.wheelAngle + 850, 1800, "FORWARD");
    if (mode === 2) {
      c.phase("REVERSAL_HESITATION");
      await c.pause(350 + c.random() * 350);
    }
    c.effects({ message: "A change of direction." });
    if (mode === 1) {
      await c.rotateWheel(c.wheelAngle - 700, 1800, "REVERSE");
      c.effects({ message: "And back again." });
      await c.spinToWinner(3700, 4, 1);
    } else await c.spinToWinner(4300, 5, -1);
  },
});
