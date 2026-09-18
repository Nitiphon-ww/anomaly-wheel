# Anomaly Wheel

Next.js App Router, TypeScript, Tailwind CSS, and a client-side wheel engine. Phase 3 preserves the Phase 2 wheel design and normal 6.5-second, six-turn minimum spin.

## Commands

- `npm install`
- `npm run dev` — development server
- `npm run lint` — ESLint
- `npm test` — normal wheel and anomaly regression tests
- `npm run build` — production compilation and TypeScript validation
- `npm start` — serve the production build

## Architecture

- `src/components/wheel/PrizeWheel.tsx`: existing wheel presentation, temporary event layers, unequal SVG geometry.
- `src/components/wheel/DeveloperPanel.tsx`: forced event, forced prize, variation controls, and live state information.
- `src/hooks/useWheelGame.ts`: React integration, prize-first selection, session history, audio, synchronous spin lock, and result/reset lifecycle.
- `src/lib/wheel/anomalies/anomaly-engine.ts`: controller lifecycle, precise landing, reset guarantees, and result validation.
- `src/lib/wheel/anomalies/animation-scope.ts`: cancellable animation frames and frame-driven waits; no untracked timers.
- `src/lib/wheel/anomalies/geometry.ts`: unequal boundaries, full-circle SVG paths, clockwise/counterclockwise targets, pointer-relative landing, and boundary ticks.
- `src/lib/wheel/anomalies/registry.ts`: eleven independent controllers. Each exposes id, name, enabled, rarity, prepare, play, resolve, and cleanup.
- `src/lib/wheel/anomalies/config.ts`: centralized 15% anomaly gate and uniform selection from enabled events.
- `src/lib/wheel/prizes.ts`: immutable sample configuration using `probabilityWeight`. Visual weights are separate runtime data.
- `src/lib/wheel/audio.ts`: replaceable synthesized spin, tick, elimination, and winning sounds with a master mute and effect cleanup.

## Selection and landing

On every spin the prize is selected FIRST, using its probability weight and Web Crypto. An independent draw then chooses normal animation (85%) or an anomaly (15%). Within the anomaly branch, every enabled controller has probability `1 / enabledCount`, regardless of rarity. Cooldowns and anomaly weights have been removed. If none are enabled, the engine uses a normal spin. Forced events bypass both random stages and enabled status. Forced prizes bypass prize selection only.

The winner never changes during an event. Visual weights do not affect probability. The engine derives each segment's center from cumulative visual weights. A wheel target satisfies `pointerAngle - wheelAngle = winnerCenter (mod 360)`; a pointer target satisfies `pointerAngle = wheelAngle + winnerCenter (mod 360)`. Full turns are added in the intended direction. Final geometry is checked before the predetermined winner reaches the modal.

The normal acceleration curve remains the Phase 2 curve. Wheel and pointer rotation update transforms directly without React renders per frame. Geometry morphs update the current SVG wedges independently of rotation. Pointer ticks handle either direction and unequal boundaries.

## Events

- Fake Stop: wrong-prize stop, randomized 600–1500ms pause, restart, real result.
- Reverse Spin: one reversal, two reversals, or a hesitation before reversal.
- Speed Boost: fast spin, slowdown, renewed acceleration, final deceleration.
- Pointer Spin: wheel remains stationary while the pointer makes approximately 5–10 turns, lands on the winner, and returns home after the result closes.
- Random Segment Size: animated unequal visual weights with oversized and tiny wedges.
- Instant Reveal: immediate result, prize-before-spin, 100–300ms flash, or very early reveal during motion. Early reveals use a non-blocking overlay; the standard final modal appears after motion completes.
- Single Segment: accelerate the full wheel, eliminate losers while continuously rotating, then keep the full-circle winner spinning for at least five more turns before stopping.
- Two Segment: accelerate the full wheel, eliminate dynamic batches during rotation, preserve the winner plus one random opponent, then decelerate with two equal halves.
- Glitch: 850ms displacement and RGB separation; no rapid blackout strobing.
- Mystery Mode: hidden labels revealed near the end of the spin.
- Jackpot Mode: dimmed surroundings, a pause, wheel illumination, particles, and a dramatic spin. It does not improve the prize.

## Cleanup

The spin lock stays engaged through the result and RESETTING. Closing the result cancels remaining victory tones, invokes controller cleanup, returns the orbiting pointer or morphs the geometry back, and then runs the engine's unconditional baseline restoration. Temporary messages, early reveals, concealed labels, glitch/jackpot classes, and visual weights are reset. The pointer's flex animation is cancelled. All owned frames are cancelled before IDLE; unmount and exception paths also restore/cancel. A settled wheel angle is normal persistent presentation, not an active animation.

## Developer controls

Force Event lists Random, Normal, and all eleven events. Force Prize lists Random and the current items; deleting the forced item resets the override. Event Variation is available for Reverse Spin (1–3) and Instant Reveal (1–4), matching the order above; changing events restores random variation selection. Controls are disabled while the engine is busy. Readouts show selected prize, event, rarity, wheel angle, target and its owner, pointer angle, spin state, and animation phase.

## Scope and limitations

No admin panel, database, or prize fulfillment. Results and history are session-local. Audio uses replaceable generated tones. Reduced-motion preferences suppress decorative pointer flex, particles, and glitch displacement; core spinning remains. Very narrow wedges use smaller text. Browser frame throttling can pause presentation in a background tab; the final target and winner remain deterministic.

See [Phase 3 verification](docs/phase-3-verification.md) for automated and browser test coverage.


## Dynamic items and continuous elimination

The main-page Wheel Items editor supports adding, renaming, deleting, moving up/down, clearing, and resetting items. At least two non-empty labels are required to spin; the editor supports up to 100 items and 160 characters per label. Changes immediately rebuild equal wedges, assign the existing color palette, and refresh Force Prize. Editing is locked through spinning, the result, and cleanup. There is no admin UI or backend.

`src/lib/wheel/items.ts` validates and serializes versioned `{id,label}` records under localStorage key `anomaly-wheel.items.v1`. Colors and equal probability weights are reconstructed. Empty lists are preserved; invalid or inaccessible storage falls back to samples with a notice. Save failures retain the current items in memory. Reset writes the eight samples to the same key. Full text stays in the editor, result and SVG title; radial labels scale and truncate inside wedge clipping paths.

`src/lib/wheel/anomalies/elimination.ts` generates a shuffled loser sequence, excluding the already-selected winner. Two Segment additionally reserves a random opponent. The engine rejects attempts to highlight or remove the winner. After 1.35 seconds of acceleration, variable highlight, shrink and hold durations create eliminations; the last transitions take longer. No DOM wedges are removed during interpolation.

`spinWhile` runs one cancellable rotation timeline alongside independent geometry tweens. It integrates smooth acceleration into constant cruise speed. Once final geometry is ready, a cubic deceleration starts at the same angle and velocity, ending exactly at the selected segment's center plus full turns. The wheel never pauses or restarts during elimination. Ticks compare rotation movement against current boundaries; geometry callbacks do not generate ticks. The audio/pointer adapter coalesces crossings within 28ms to avoid bursts from collapsed boundaries or delayed frames.

See [dynamic-items verification](docs/dynamic-items-verification.md) for the revised browser and automated coverage.

Developer Info calculates Random-mode normal/special odds, enabled count, equal pool probability and overall per-spin probability from the same enabled registry. With no enabled events it reports 100% normal and zero special/per-event odds. Forced selections explicitly show that odds are bypassed.
