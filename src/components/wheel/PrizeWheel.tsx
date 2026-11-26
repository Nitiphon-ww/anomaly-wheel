"use client";

import Link from "next/link";
import { fitSegmentLabel } from "@/lib/wheel/items";
import WheelItemsEditor from "./WheelItemsEditor";
import { pointOnCircle } from "@/lib/wheel/geometry";
import { arcPath, boundaries } from "@/lib/wheel/anomalies/geometry";
import { useWheelGame } from "@/hooks/useWheelGame";
import WheelPointer from "./WheelPointer";
import SpinButton from "./SpinButton";
import ResultModal from "./ResultModal";
import DeveloperPanel from "./DeveloperPanel";

export default function PrizeWheel() {
  const game = useWheelGame();
  const {
    items,
    status,
    visual,
    winner,
    modalOpen,
    sound,
    spins,
    history,
    rotor,
    pointer,
    pointerOrbit,
    button,
    start,
    closeResult,
    toggleSound,
  } = game;
  const busy = status.state !== "IDLE";
  const edges = items.length ? boundaries(visual.visualWeights) : [];
  return (
    <div className={`app-shell ${visual.jackpot ? "is-jackpot" : ""}`}>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Anomaly Wheel home">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="15" fill="#efe3c9" />
            <path d="M16 16 16 3a13 13 0 0 1 11.3 6.5Z" fill="#ad2943" />
            <path d="M16 16 27.3 22.5A13 13 0 0 1 16 29Z" fill="#2f8a8f" />
            <path d="M16 16 4.7 22.5A13 13 0 0 1 4.7 9.5Z" fill="#e3b04b" />
            <circle cx="16" cy="16" r="3" fill="#2a1a14" />
          </svg>
          Anomaly Wheel
        </Link>
        <button
          className="sound-toggle"
          aria-pressed={sound}
          aria-label={sound ? "Turn sound off" : "Turn sound on"}
          onClick={toggleSound}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M11 4 6 8H3v8h3l5 4Z" />
            {sound ? (
              <>
                <path d="M15 8a6 6 0 0 1 0 8" />
                <path d="M18 4a11 11 0 0 1 0 16" />
              </>
            ) : (
              <path d="m16 9 6 6m0-6-6 6" />
            )}
          </svg>
          <span>Sound {sound ? "on" : "off"}</span>
        </button>
      </header>
      <main className="main-content">
        <div className="intro">
          <h1>Spin for it</h1>
          <p>
            {items.length} items, same odds for each. Every so often the
            wheel does something it shouldn&rsquo;t.
          </p>
        </div>
        <section className="wheel-section" aria-label="Prize wheel game">
          <div
            className={`wheel-stage ${visual.glitch ? "is-glitch" : ""}`}
            data-event={game.event?.id ?? "normal"}
          >
            <div className="wheel-frame">
              <svg
                className="wheel-rotor"
                viewBox="0 0 600 600"
                ref={rotor}
                role="img"
                aria-label={`Prize wheel with ${visual.visualWeights.filter((w) => w > 0.00001).length} visible segments${winner ? `. Last winner: ${winner.label}` : ""}`}
              >
                <defs>
                  <radialGradient id="wheel-shade">
                    <stop offset="0" stopColor="#fff" stopOpacity=".09" />
                    <stop offset=".7" stopColor="#fff" stopOpacity="0" />
                    <stop offset="1" stopColor="#200814" stopOpacity=".24" />
                  </radialGradient>
                </defs>
                {items.map((prize, index) => {
                  const angle = (edges[index] + edges[index + 1]) / 2;
                  const span = edges[index + 1] - edges[index];
                  const label = pointOnCircle(angle, 182);
                  const fitted = fitSegmentLabel(
                    visual.concealed ? "???" : prize.label,
                    span,
                  );
                  const peg = pointOnCircle(edges[index], 268);
                  return (
                    <g
                      key={prize.id}
                      data-prize-id={prize.id}
                      data-full-label={prize.label}
                      data-start-angle={edges[index]}
                      data-end-angle={edges[index + 1]}
                      data-visual-weight={visual.visualWeights[index]}
                      style={{ display: span < 0.00001 ? "none" : undefined }}
                      data-winning={winner?.id === prize.id}
                    >
                      <title>{prize.label}</title>
                      <clipPath id={`clip-${prize.id}`}>
                        <path d={arcPath(edges[index], edges[index + 1])} />
                      </clipPath>
                      <path
                        className={`wheel-segment ${visual.eliminatingIds.includes(prize.id) ? "eliminating-segment" : ""} ${winner?.id === prize.id ? "winning-segment" : ""}`}
                        d={arcPath(edges[index], edges[index + 1])}
                        fill={prize.color}
                        stroke="#efe3c9"
                        strokeWidth="1.6"
                      />
                      <g clipPath={`url(#clip-${prize.id})`}>
                        <text
                          x={label.x}
                          y={label.y}
                          fill={prize.textColor}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${angle - 90} ${label.x} ${label.y})`}
                          className="segment-label"
                          style={{
                            fontSize: fitted.fontSize,
                            opacity: fitted.opacity,
                          }}
                        >
                          {fitted.text}
                        </text>
                      </g>
                      <circle cx={peg.x} cy={peg.y} r="4" fill="#2a1a14" />
                    </g>
                  );
                })}
                <circle
                  cx="300"
                  cy="300"
                  r="270"
                  fill="url(#wheel-shade)"
                  pointerEvents="none"
                />
                <circle
                  cx="300"
                  cy="300"
                  r="271"
                  fill="none"
                  stroke="#2a1a14"
                  strokeWidth="3"
                />
              </svg>
              <svg
                className="rim-lights"
                viewBox="0 0 600 600"
                aria-hidden="true"
              >
                {Array.from({ length: 40 }, (_, index) => {
                  const p = pointOnCircle(index * 9, 289);
                  return (
                    <circle
                      key={index}
                      cx={p.x}
                      cy={p.y}
                      r="3.3"
                      fill={index % 2 ? "#d9c7a3" : "#fffaf0"}
                    />
                  );
                })}
              </svg>
              <div className="wheel-hub" aria-hidden="true" />
            </div>
            <div className="pointer-orbit" ref={pointerOrbit}>
              <WheelPointer pointerRef={pointer} />
            </div>
            <div className="wheel-pedestal" aria-hidden="true" />
            {visual.message && (
              <div className="event-caption" role="status">
                {visual.message}
              </div>
            )}
            {visual.earlyPrize && (
              <div className="early-result" role="status">
                <span>Result</span>
                <strong>{visual.earlyPrize}</strong>
              </div>
            )}
            {visual.jackpot && (
              <div className="jackpot-sparks" aria-hidden="true">
                {Array.from({ length: 16 }, (_, i) => (
                  <i
                    key={i}
                    style={{
                      left: `${(i * 37) % 100}%`,
                      animationDelay: `${i * 0.13}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
        <div className="spin-controls">
          {game.error && <p role="alert">{game.error}</p>}
          <SpinButton
            buttonRef={button}
            disabled={busy || !game.ready || !!game.validation}
            spinning={busy}
            onSpin={start}
          />
          <p role="status" aria-live="polite">
            {busy
              ? "The wheel is spinning."
              : game.validation
                ? game.validation
                : winner
                  ? `Last result: ${winner.label}`
                  : "Nothing spun yet."}
          </p>
        </div>
        <section className="prize-strip" aria-label="Available prizes">
          <div className="strip-heading">
            <span>On the wheel</span>
            <span>
              {items.length
                ? `1 in ${items.length} chance each`
                : "No items yet"}
            </span>
          </div>
          <div className="prize-list">
            {items.map((prize, index) => (
              <div
                key={prize.id}
                className={`prize-chip ${winner?.id === prize.id ? "prize-chip-won" : ""}`}
              >
                <span style={{ background: prize.color }} />
                <span title={prize.label}>{prize.label}</span>
                <small>{String(index + 1).padStart(2, "0")}</small>
              </div>
            ))}
          </div>
        </section>
        <div className="session-row">
          <p>
            {history.length ? (
              <>
                Recent{" "}
                <span className="history">
                  {history.map((prize, index) => (
                    <span key={index}>{prize.label}</span>
                  ))}
                </span>
              </>
            ) : (
              "No spins this session."
            )}
          </p>
          <span>
            {spins} {spins === 1 ? "spin" : "spins"}
          </span>
        </div>
        <WheelItemsEditor
          items={items}
          busy={busy}
          ready={game.ready}
          notice={game.editorNotice}
          onAdd={game.addItem}
          onEdit={game.editItem}
          onDelete={game.deleteItem}
          onMove={game.moveItem}
          onClear={game.clearItems}
          onReset={game.resetItems}
        />
        <DeveloperPanel {...game} />
      </main>
      <footer className="site-footer">
        <span>Anomaly Wheel</span>
        <span>Your items stay in this browser.</span>
      </footer>
      {modalOpen && winner && (
        <ResultModal prize={winner} onClose={closeResult} />
      )}
    </div>
  );
}
