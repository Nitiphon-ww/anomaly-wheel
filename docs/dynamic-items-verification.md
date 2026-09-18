# Dynamic items and continuous elimination verification

Tested 2026-09-18 against the local production app in Chromium.

## Automated

46 test groups pass. Dynamic tests use a 16ms scheduler with counts 2, 3, 5, 8, 12, 13 and 20, testing first, middle and last winners. They check full-wheel acceleration before the first elimination, strictly increasing angle at constant cruise velocity during elimination, winner survival on every geometry callback, one spin-audio start, exact physical landing, restored equal geometry, no pending frames and another normal spin. Cancellation during concurrent rotation/morph and configuration locking are covered. The original all-event regression suite remains passing.

Storage checks include round trips, empty lists, Unicode, duplicate/invalid IDs, blank-label validation, equal probabilities and long-label fitting.

## Browser

17 completed spins in the dynamic-count matrix:

| Mode | Counts | Landing / restored geometry / following normal spin |
| --- | --- | --- |
| Normal | 3, 5, 8, 12, 20 | Pass |
| Single Segment | 5, 8, 12, 20 | Pass in all four cases |
| Two Segment | 5, 8, 12, 20 | Pass in all four cases |

Each elimination was followed immediately by a normal spin. The final DOM wheel angle and actual segment boundaries independently identified the same prize as the predetermined selection and modal. Single finished with one 360-degree wedge; Two with two 180-degree wedges. After dismissal, every original item returned with equal geometry and the editor unlocked. Samples during elimination showed increasing rotation angles while visible segment counts fell; screenshots confirmed the retained visual styling and pointer flex. Fine-grained continuity was asserted by the 16ms automated tests.

Editor checks: add, delete, rename, move, clear, reset, persistence across refresh, forced-prize removal resetting to Random, no spin for zero/one/blank items, and disabled editing during events. Mobile viewport 390 x 844 was inspected with 20 items and a long label: no horizontal overflow, radial truncation stayed within wedges, and editor controls fit. Browser console reported no errors or warnings during the matrix.

Audio is synthesized, including a sustained spin bed and elimination tones; browser tests verify the controls and event lifecycle, not subjective speaker output. Frame scheduling targets 60 FPS; no hardware performance benchmark is claimed. Browser automation's empty-string fill did not dispatch a change; keyboard Select All/Backspace correctly exercised blank-label validation.

## Final build and changed files

Final `npm run lint`, `npm test` (46/46 groups), and `npm run build` all passed. Two additional final-build browser spins (Two Segment with a long custom label, then Normal) passed, bringing the browser total to 19. The long-label modal was visually inspected. Samples and random overrides were restored; the production server remains available at http://127.0.0.1:3001.

Created:
- `src/components/wheel/WheelItemsEditor.tsx`
- `src/lib/wheel/items.ts`
- `src/lib/wheel/anomalies/elimination.ts`
- `src/lib/wheel/anomalies/dynamic.test.ts`
- `docs/dynamic-items-verification.md`

Modified:
- `src/components/wheel/PrizeWheel.tsx`
- `src/components/wheel/DeveloperPanel.tsx`
- `src/components/wheel/ResultModal.tsx`
- `src/hooks/useWheelGame.ts`
- `src/lib/wheel/audio.ts`
- `src/lib/wheel/anomalies/animation-scope.ts`
- `src/lib/wheel/anomalies/anomaly-engine.ts`
- `src/lib/wheel/anomalies/types.ts`
- `src/lib/wheel/anomalies/single-segment.ts`
- `src/lib/wheel/anomalies/two-segment.ts`
- `src/app/globals.css`
- `package.json`
- `README.md`
