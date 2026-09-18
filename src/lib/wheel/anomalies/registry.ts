import fakeStop from "./fake-stop";
import reverseSpin from "./reverse-spin";
import speedBoost from "./speed-boost";
import pointerSpin from "./pointer-spin";
import randomSegmentSize from "./random-segment-size";
import instantReveal from "./instant-reveal";
import singleSegment from "./single-segment";
import twoSegment from "./two-segment";
import glitch from "./glitch";
import mysteryMode from "./mystery-mode";
import jackpotMode from "./jackpot-mode";

export const ANOMALIES = [
  fakeStop,
  reverseSpin,
  speedBoost,
  pointerSpin,
  randomSegmentSize,
  instantReveal,
  singleSegment,
  twoSegment,
  glitch,
  mysteryMode,
  jackpotMode,
] as const;
