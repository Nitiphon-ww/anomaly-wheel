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
      {spinning ? "Spinning…" : "Spin"}
    </button>
  );
}
