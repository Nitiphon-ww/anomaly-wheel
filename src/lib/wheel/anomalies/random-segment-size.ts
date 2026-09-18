import { defineAnomaly } from "./controller";
export default defineAnomaly({
  id: "random-segment-size",
  name: "Random Segment Size",
  rarity: "Uncommon",
  async play(c) {
    c.phase("GEOMETRY_STRETCHING");
    const weights = c.prizes.map(() => 2 + c.random() * 7);
    const giant = Math.floor(c.random() * weights.length);
    const tiny =
      (giant + 1 + Math.floor(c.random() * (weights.length - 1))) %
      weights.length;
    weights[giant] = 55 + c.random() * 30;
    weights[tiny] = 0.8;
    c.effects({ message: "Different sizes. Same chances." });
    await c.morph(weights, 1000);
    await c.pause(500);
    await c.spinToWinner(6000, 6);
  },
  async cleanup(c) {
    await c.morph(
      c.prizes.map(() => 1),
      550,
    );
    c.restoreVisuals();
  },
});
