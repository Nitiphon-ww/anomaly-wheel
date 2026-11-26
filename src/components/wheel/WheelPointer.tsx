import type { Ref } from "react";

export default function WheelPointer({
  pointerRef,
}: {
  pointerRef: Ref<HTMLDivElement>;
}) {
  return (
    <div className="wheel-pointer" ref={pointerRef} aria-hidden="true">
      <svg viewBox="0 0 48 72">
        <path
          d="M5 8 Q24 -1 43 8 L24 66 Z"
          fill="#2a1a14"
          stroke="#efe3c9"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="13" r="5" fill="#e3b04b" />
      </svg>
    </div>
  );
}
