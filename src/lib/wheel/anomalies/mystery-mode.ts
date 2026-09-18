import { defineAnomaly } from "./controller";
export default defineAnomaly({
  id: "mystery-mode",
  name: "Mystery Mode",
  rarity: "Rare",
  async prepare(c) {
    c.effects({ concealed: true, message: "Some things are worth the wait." });
    await c.pause(500);
  },
  async play(c) {
    const motion = c.spinToWinner(6500, 6);
    const reveal = (async () => {
      await c.pause(4850);
      c.effects({ concealed: false, message: "The mystery unfolds." });
      c.phase("MYSTERY_REVEAL");
    })();
    await Promise.all([motion, reveal]);
  },
});
