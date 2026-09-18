import type { Ref } from "react";

export default function WheelPointer({
  pointerRef,
}: {
  pointerRef: Ref<HTMLDivElement>;
}) {
  return (
    <div className="wheel-pointer" ref={pointerRef} aria-hidden="true">
      <svg viewBox="0 0 48 72">
        <defs>
          <linearGradient id="pointer-gold" x2="1" y2="1">
            <stop stopColor="#fff1bd" />
            <stop offset=".5" stopColor="#dbaa53" />
            <stop offset="1" stopColor="#916326" />
          </linearGradient>
        </defs>
        <path
          d="M4 7 Q24 -2 44 7 L24 67 Z"
          fill="url(#pointer-gold)"
          stroke="#ffdf96"
          strokeWidth="2"
        />
        <path d="M12 13 L36 13 L24 49 Z" fill="#a52a43" />
        <circle cx="24" cy="12" r="4" fill="#fff3cc" />
      </svg>
    </div>
  );
}
