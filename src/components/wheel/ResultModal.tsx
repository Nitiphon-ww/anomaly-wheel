"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { Prize } from "@/types/wheel";

export default function ResultModal({
  prize,
  onClose,
}: {
  prize: Prize;
  onClose: () => void;
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
        onClose();
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
                background: ["#edc77d", "#db7185", "#56a4a1", "#fff0d2"][i % 4],
              } as CSSProperties
            }
          />
        ))}
      </div>
      <button
        className="modal-close"
        onClick={onClose}
        aria-label="Close result"
      >
        ×
      </button>
      <div className="result-seal" aria-hidden="true">
        ✦
      </div>
      <p className="eyebrow">A LITTLE LUCK, ALL YOURS</p>
      <h2 id="result-title">YOU WON</h2>
      <p
        className={`result-prize ${prize.label.length > 24 ? "result-prize-long" : ""}`}
      >
        {prize.label}
      </p>
      <p id="result-description">
        Your lucky moment has arrived.
        <br />
        Ready to give it another whirl?
      </p>
      <button className="spin-button" onClick={onClose}>
        BACK TO THE WHEEL <span aria-hidden="true">↗</span>
      </button>
      <p className="modal-note">ONE SPIN. A NEW POSSIBILITY.</p>
    </dialog>
  );
}
