import type { AnomalyContext } from "./types";
import { shuffledLosers } from "./controller";

/** Geometry changes independently while one rotation timeline keeps running. */
export async function eliminateWhileSpinning(
  c: AnomalyContext,
  survivors: 1 | 2,
) {
  const losers = shuffledLosers(c);
  const opponent = survivors === 2 ? c.prizes[losers.pop()!] : null;
  const weights = c.prizes.map(() => 1);
  await c.spinWhile(
    async () => {
      await c.pause(1350);
      while (losers.length) {
        const count = weights.filter(Boolean).length;
        const batch =
          survivors === 2 && count > 6 ? Math.min(2, losers.length) : 1;
        const removed = losers.splice(0, batch);
        c.phase(`ELIMINATING_${count}_TO_${count - batch}`);
        c.markEliminating(removed);
        await c.pause(90 + c.random() * 80);
        removed.forEach((index) => {
          weights[index] = 0;
        });
        const dramatic = losers.length < 2 ? 220 : 0;
        await c.morph(weights, 240 + c.random() * 180 + dramatic);
        c.markEliminating([]);
        await c.pause(70 + c.random() * 130 + dramatic / 2);
      }
      c.phase(survivors === 1 ? "SINGLE_SURVIVOR_SPIN" : "FINAL_TWO_FACE_OFF");
      c.effects({
        message: opponent
          ? `FINAL TWO · ${c.winner.label} VS ${opponent.label}`
          : "One prize. Still worth a spin.",
      });
      await c.pause(survivors === 1 ? 850 : 650);
    },
    survivors === 1 ? 5 : 3,
  );
}
