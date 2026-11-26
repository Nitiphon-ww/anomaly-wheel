"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { Prize } from "@/types/wheel";

export default function ResultModal({
  prize,
  onKeep,
  onRemove,
  canRemove,
}: {
  prize: Prize;
  onKeep: () => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="result-dialog"
      aria-labelledby="result-title"
      aria-describedby="result-description"
      onCancel={(event) => {
        event.preventDefault();
        onKeep();
      }}
    >
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <i
            key={i}
            style={
              {
                "--x": `${(i * 37) % 100}%`,
                "--delay": `${(i % 7) * 0.08}s`,
                "--tilt": `${i * 49}deg`,
                background: ["#e3b04b", "#ad2943", "#2f8a8f", "#efe3c9"][i % 4],
              } as CSSProperties
            }
          />
        ))}
      </div>
      <button
        className="modal-close"
        onClick={onKeep}
        aria-label="Keep item and close result"
      >
        ×
      </button>
      <h2 id="result-title">The wheel landed on</h2>
      <p
        className={`result-prize ${prize.label.length > 24 ? "result-prize-long" : ""}`}
      >
        {prize.label}
      </p>
      <p id="result-description">
        Take it off the wheel, or leave it for the next spin?
      </p>
      <div className="result-actions">
        <button
          className="spin-button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-describedby={!canRemove ? "result-minimum" : undefined}
        >
          Remove from wheel
        </button>
        {!canRemove && (
          <p id="result-minimum">The wheel needs at least 2 items.</p>
        )}
        <button className="spin-button result-keep" onClick={onKeep}>
          Keep on wheel
        </button>
      </div>
    </dialog>
  );
}
