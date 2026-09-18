import { defineAnomaly } from "./controller";
import { eliminateWhileSpinning } from "./elimination";
export default defineAnomaly({
  id: "single-segment",
  name: "Single Segment",
  rarity: "Rare",
  async play(c) {
    await eliminateWhileSpinning(c, 1);
  },
  async cleanup(c) {
    await c.morph(
      c.prizes.map(() => 1),
      550,
    );
    c.restoreVisuals();
  },
});
