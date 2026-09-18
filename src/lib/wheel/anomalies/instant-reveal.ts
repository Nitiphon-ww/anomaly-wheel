import { defineAnomaly, variation } from "./controller";
export default defineAnomaly({
  id: "instant-reveal",
  name: "Instant Reveal",
  rarity: "Rare",
  async play(c) {
    const mode = variation(c, 4);
    c.phase(`INSTANT_REVEAL_${mode + 1}`);
    if (mode === 0) {
      c.alignWinner();
      return;
    }
    if (mode === 1) {
      c.effects({
        earlyPrize: c.winner.label,
        message: "The answer came first.",
      });
      await c.pause(1000);
      await c.spinToWinner(4800, 5);
    } else if (mode === 2) {
      c.effects({ earlyPrize: c.winner.label });
      await c.pause(100 + c.random() * 200);
      c.effects({ earlyPrize: null, message: "Did you catch that?" });
      await c.spinToWinner(5600, 6);
    } else {
      const motion = c.spinToWinner(5600, 6);
      // Attach a handler immediately so cancellation of concurrent tasks is safe.
      const reveal = (async () => {
        await c.pause(300);
        c.effects({
          earlyPrize: c.winner.label,
          message: "A little ahead of schedule.",
        });
      })();
      await Promise.all([motion, reveal]);
    }
  },
});
