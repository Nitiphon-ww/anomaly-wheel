import { defineAnomaly } from "./controller";
import { eliminateWhileSpinning } from "./elimination";
export default defineAnomaly({
  id: "two-segment",
  name: "Two Segment",
  rarity: "Rare",
  async play(c) {
    await eliminateWhileSpinning(c, 2);
  },
  async cleanup(c) {
    await c.morph(
      c.prizes.map(() => 1),
      550,
    );
    c.restoreVisuals();
  },
});
