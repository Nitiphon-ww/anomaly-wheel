import { defineAnomaly } from "./controller";
export default defineAnomaly({
  id: "speed-boost",
  name: "Speed Boost",
  rarity: "Uncommon",
  async play(c) {
    await c.rotateWheel(
      c.wheelAngle + 1200,
      2400 + c.random() * 400,
      "FAST_THEN_SLOW",
    );
    c.phase("BOOST_IGNITION");
    c.effects({ message: "One more burst." });
    await c.spinToWinner(3500 + c.random() * 400, 10);
  },
});
