"use client";
import type { Ref } from "react";
import { anomalyProbabilities } from "@/lib/wheel/anomalies/config";
import { ANOMALIES } from "@/lib/wheel/anomalies/registry";

import type { Anomaly, ForcedEvent, Status } from "@/lib/wheel/anomalies/types";
import type { Prize } from "@/types/wheel";

type Props = {
  items: readonly Prize[];
  status: Status;
  selected: Prize | null;
  event: Anomaly | null;
  forceEvent: ForcedEvent;
  setForceEvent(value: ForcedEvent): void;
  forcePrize: string;
  setForcePrize(value: string): void;
  variant: string;
  setVariant(value: string): void;
  angleOutput: Ref<HTMLOutputElement>;
  pointerOutput: Ref<HTMLOutputElement>;
};
export default function DeveloperPanel({
  items,
  status,
  selected,
  event,
  forceEvent,
  setForceEvent,
  forcePrize,
  setForcePrize,
  variant,
  setVariant,
  angleOutput,
  pointerOutput,
}: Props) {
  const odds = anomalyProbabilities();
  const percent = (value: number) => `${Number((value * 100).toFixed(2))}%`;
  const busy = status.state !== "IDLE";
  return (
    <details className="developer-panel" open>
      <summary>
        <span>⌘ &nbsp; DEVELOPER INFO</span>
        <span>TEMPORARY PANEL</span>
      </summary>
      <div className="developer-controls">
        <label>
          Force Event
          <select
            value={forceEvent}
            disabled={busy}
            onChange={(e) => {
              setForceEvent(e.target.value as ForcedEvent);
              setVariant("random");
            }}
          >
            <option value="random">Random</option>
            <option value="normal">Normal</option>
            {ANOMALIES.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Force Prize
          <select
            value={forcePrize}
            disabled={busy}
            onChange={(e) => setForcePrize(e.target.value)}
          >
            <option value="random">Random</option>
            {items.map((prize) => (
              <option key={prize.id} value={prize.id}>
                {prize.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Event Variation
          <select
            value={variant}
            disabled={
              busy || !["instant-reveal", "reverse-spin"].includes(forceEvent)
            }
            onChange={(e) => setVariant(e.target.value)}
          >
            <option value="random">Random</option>
            {Array.from(
              { length: forceEvent === "reverse-spin" ? 3 : 4 },
              (_, i) => (
                <option key={i} value={i}>
                  Variation {i + 1}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="developer-grid" aria-label="Random mode probabilities">
        <div><label>Normal Spin</label><output>{percent(odds.normal)}</output></div>
        <div><label>Special Event</label><output>{percent(odds.special)}</output></div>
        <div><label>Enabled Anomalies</label><output>{odds.enabledCount}</output></div>
        <div><label>Chance Per Enabled Anomaly</label><output>{percent(odds.perAnomalyPool)} of anomaly pool</output></div>
        <div><label>Overall Chance Per Anomaly</label><output>~{percent(odds.perAnomalySpin)} per spin</output></div>
        <div><label>Probability Mode</label><output>{forceEvent === "random" ? "Random · equal enabled chances" : "Forced event · odds bypassed"}</output></div>
      </div>
      <div className="developer-grid">
        <div>
          <label>Selected Prize</label>
          <output data-testid="selected-prize">{selected?.label ?? "—"}</output>
        </div>
        <div>
          <label>Selected Anomaly</label>
          <output data-testid="selected-anomaly">
            {event?.name ?? "Normal"}
          </output>
        </div>
        <div>
          <label>Anomaly Rarity</label>
          <output>{event?.rarity ?? "—"}</output>
        </div>
        <div>
          <label>Current Angle</label>
          <output aria-live="off" ref={angleOutput} data-testid="current-angle">
            0.00°
          </output>
        </div>
        <div>
          <label>Target Angle ({status.targetKind})</label>
          <output data-testid="target-angle">
            {status.targetAngle === null
              ? "—"
              : `${status.targetAngle.toFixed(2)}°`}
          </output>
        </div>
        <div>
          <label>Pointer Angle</label>
          <output
            aria-live="off"
            ref={pointerOutput}
            data-testid="pointer-angle"
          >
            0.00°
          </output>
        </div>
        <div>
          <label>Spin State</label>
          <output data-testid="spin-state">{status.state}</output>
        </div>
        <div>
          <label>Animation Phase</label>
          <output data-testid="animation-phase">{status.phase}</output>
        </div>
      </div>
    </details>
  );
}
