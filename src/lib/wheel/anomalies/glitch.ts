import { defineAnomaly } from "./controller";
export default defineAnomaly({
  id: "glitch",
  name: "Glitch",
  rarity: "Rare",
  async play(c) {
    await c.rotateWheel(c.wheelAngle + 600, 1500, "GLITCH_APPROACH");
    c.effects({ glitch: true, message: "A brief interruption in reality." });
    c.phase("CONTROLLED_GLITCH");
    await c.pause(850);
    c.effects({ glitch: false });
    await c.spinToWinner(4700, 5);
  },
});
