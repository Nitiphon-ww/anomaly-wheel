import type { Ref } from "react";

export default function SpinButton({
  disabled,
  spinning,
  onSpin,
  buttonRef,
}: {
  disabled: boolean;
  spinning: boolean;
  onSpin: () => void;
  buttonRef: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="spin-button"
      disabled={disabled}
      onClick={onSpin}
    >
      <span aria-hidden="true">✦</span>
      {spinning ? "SPINNING…" : "SPIN THE WHEEL"}
      <span aria-hidden="true">↗</span>
    </button>
  );
}
