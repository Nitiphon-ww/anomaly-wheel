import { defineAnomaly } from "./controller";
export default defineAnomaly({
  id: "jackpot-mode",
  name: "Jackpot Mode",
  rarity: "Legendary",
  async prepare(c) {
    c.effects({ jackpot: true, message: "A moment out of the ordinary." });
    c.phase("JACKPOT_DARKENING");
    await c.pause(1500);
  },
  async play(c) {
    c.effects({ message: "LET THERE BE LUCK" });
    await c.spinToWinner(7800, 10);
  },
});
