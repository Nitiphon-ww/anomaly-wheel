# Phase 3 verification

Tested on 2026-09-18 using the local production build in the Codex Chromium browser. The existing visual design was retained; screenshots were inspected for single/two-segment layouts, unequal geometry, pointer orbit, glitch, mystery, early reveal, jackpot, and mobile presentation.

## Automated checks

- `npm run lint`: pass.
- `npm run build`: pass, including TypeScript and prerendering.
- `npm test`: all 23 test groups pass.
- Each controller and Normal tested with all eight predetermined prizes, then cleanup and another normal spin.
- All three reverse variations and four instant-reveal variations tested.
- Tests cover unequal geometry, single full-circle paths, both tick directions, probability independence, the 85/15 gate, relative event weights, cooldowns, forced overrides, controller exceptions, cleanup exceptions, cancellation during preparation/motion/concurrent reveals, and the requested mixed sequence.

## Browser results

39 consecutive completed browser spins were checked before the final debug-control smoke test. Each recorded spin verified the selected prize, rendered wheel/pointer geometry, modal prize, eight equal restored segments, labels, pointer home position, cleared transient effects, and IDLE. Every event was followed by a successful normal spin during the test session.

| Forced event        | Forced prize(s)                  | Result, cleanup, next normal spin                                                                    |
| ------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Normal              | All 8 represented across session | Pass                                                                                                 |
| Fake Stop           | Prize 8, Prize 3                 | Pass; a captured false stop landed on Prize 5 while Prize 3 remained selected and no modal was shown |
| Reverse Spin        | Prize 5 / 8 / 2                  | Pass for one reversal, two reversals, and hesitation                                                 |
| Speed Boost         | Prize 7                          | Pass                                                                                                 |
| Pointer Spin        | Prize 6 / 5 / 1                  | Pass; wheel angle stayed fixed; off-top landings at 180° and 45° returned to top                     |
| Random Segment Size | Prize 5 / 1                      | Pass; unequal wedge geometry restored to equal 45° segments                                          |
| Instant Reveal      | Prize 4 / 5 / 7 / 8              | Pass for all four variations; early and final prizes matched                                         |
| Single Segment      | Prize 4                          | Pass; one full-circle prize remained, then all eight returned                                        |
| Two Segment         | Prize 7                          | Pass; two visible 180° halves, then all eight returned                                               |
| Glitch              | Prize 2                          | Pass; controlled RGB displacement inspected and cleared                                              |
| Mystery Mode        | Prize 2                          | Pass; all eight labels concealed, then revealed and restored                                         |
| Jackpot Mode        | Prize 3                          | Pass; dimming, illumination, and particles cleared                                                   |

The exact required sequence passed:

Normal → Pointer Spin → Normal → Single Segment → Normal → Two Segment → Normal → Random Segment Size → Fake Stop → Glitch → Normal.

Mobile at 390×844: pointer orbit and a following normal spin passed; no horizontal overflow. No application warning/error logs were reported during the 39-spin session. Testing covers this Chromium environment, not physical-device audio quality or performance certification across every browser.

## Final-build smoke check

After the debug-variation isolation fix, lint, all 23 automated test groups, and the production build passed again. Two additional live spins passed (41 total browser spins). Switching from a forced reveal variation to Random reset the variation to Random. Spin, event, and prize controls were disabled during motion. Tablet controls at 768×1024 had no horizontal overflow. The final browser console had no warnings or errors; debug selections were returned to Random and the app left running at http://127.0.0.1:3001.

## Files created

- `src/hooks/useWheelGame.ts`
- `src/components/wheel/DeveloperPanel.tsx`
- `src/lib/wheel/anomalies/types.ts`
- `src/lib/wheel/anomalies/anomaly-engine.ts`
- `src/lib/wheel/anomalies/animation-scope.ts`
- `src/lib/wheel/anomalies/config.ts`
- `src/lib/wheel/anomalies/controller.ts`
- `src/lib/wheel/anomalies/geometry.ts`
- `src/lib/wheel/anomalies/registry.ts`
- `src/lib/wheel/anomalies/fake-stop.ts`
- `src/lib/wheel/anomalies/reverse-spin.ts`
- `src/lib/wheel/anomalies/speed-boost.ts`
- `src/lib/wheel/anomalies/pointer-spin.ts`
- `src/lib/wheel/anomalies/random-segment-size.ts`
- `src/lib/wheel/anomalies/instant-reveal.ts`
- `src/lib/wheel/anomalies/single-segment.ts`
- `src/lib/wheel/anomalies/two-segment.ts`
- `src/lib/wheel/anomalies/glitch.ts`
- `src/lib/wheel/anomalies/mystery-mode.ts`
- `src/lib/wheel/anomalies/jackpot-mode.ts`
- `src/lib/wheel/anomalies/anomalies.test.ts`
- `docs/phase-3-verification.md`

## Files modified

- `src/components/wheel/PrizeWheel.tsx`: uses the engine hook and temporary event layers, preserving the baseline markup/design.
- `src/app/globals.css`: appended event-only and developer-control styles; formatted existing styles.
- `src/lib/wheel/audio.ts`: cleanup of active/scheduled effect oscillators.
- `src/types/wheel.ts`, `src/lib/wheel/prizes.ts`, `src/lib/wheel/probability.ts`, `src/lib/wheel/wheel.test.ts`: explicit `probabilityWeight` naming.
- `src/lib/wheel/spin-engine.ts`: formatting only; the existing normal motion curve is reused.
- `package.json`: includes the anomaly test file in `npm test`.
- `README.md`: engine architecture, configuration, event behavior, cleanup, and limitations.
