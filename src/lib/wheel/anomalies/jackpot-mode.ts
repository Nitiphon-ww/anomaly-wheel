import { defineAnomaly } from "./controller";
export default defineAnomaly({
  id: "jackpot-mode",
  name: "Jackpot Mode",
  rarity: "Legendary",
  async prepare(c) {
    c.effects({ jackpot: true, message: "Jackpot round." });
    c.phase("JACKPOT_DARKENING");
    await c.pause(1500);
  },
  async play(c) {
    c.effects({ message: "Here it comes." });
    await c.spinToWinner(7800, 10);
  },
});
