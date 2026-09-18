import { choose, defineAnomaly } from "./controller";
export default defineAnomaly({
  id: "fake-stop",
  name: "Fake Stop",
  rarity: "Common",
  async play(c) {
    const fake = choose(
      c,
      c.prizes.filter((p) => p.id !== c.winner.id),
    );
    await c.spinToPrize(fake, 3700, 4);
    c.phase("FALSE_STOP_HOLD");
    c.effects({ message: "Wait for it…" });
    await c.pause(600 + c.random() * 900);
    c.effects({ message: "Not so fast." });
    await c.spinToWinner(3600, 4);
  },
});
