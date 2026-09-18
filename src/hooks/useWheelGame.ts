"use client";

import { useEffect, useRef, useState } from "react";
import {
  colorItems,
  sampleItems,
  newItem,
  spinValidation,
  serializeItems,
  parseItems,
  ITEMS_STORAGE_KEY,
  MAX_ITEMS,
  withoutWinningItem,
} from "@/lib/wheel/items";
import { PRIZES } from "@/lib/wheel/prizes";
import { randomUnit, selectPrize } from "@/lib/wheel/probability";
import { SynthWheelAudio } from "@/lib/wheel/audio";
import {
  AnomalyEngine,
  cleanEffects,
} from "@/lib/wheel/anomalies/anomaly-engine";
import { selectBehavior } from "@/lib/wheel/anomalies/config";
import type {
  Anomaly,
  ForcedEvent,
  Status,
  VisualState,
} from "@/lib/wheel/anomalies/types";
import type { Prize } from "@/types/wheel";

export function useWheelGame() {
  const [items, setItems] = useState<Prize[]>(sampleItems);
  const [ready, setReady] = useState(false);
  const [editorNotice, setEditorNotice] = useState("");
  const [status, setStatus] = useState<Status>({
    state: "IDLE",
    phase: "READY",
    targetAngle: null,
    targetKind: "wheel",
  });
  const [visual, setVisual] = useState<VisualState>({
    ...cleanEffects(),
    visualWeights: PRIZES.map(() => 1),
  });
  const [selected, setSelected] = useState<Prize | null>(null);
  const [event, setEvent] = useState<Anomaly | null>(null);
  const [winner, setWinner] = useState<Prize | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sound, setSound] = useState(true);
  const [history, setHistory] = useState<Prize[]>([]);
  const [spins, setSpins] = useState(0);
  const [forceEvent, setForceEvent] = useState<ForcedEvent>("random");
  const [forcePrize, setForcePrize] = useState("random");
  const [variant, setVariant] = useState("random");
  const [error, setError] = useState("");
  const rotor = useRef<SVGSVGElement>(null);
  const pointer = useRef<HTMLDivElement>(null);
  const pointerOrbit = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const angleOutput = useRef<HTMLOutputElement>(null);
  const pointerOutput = useRef<HTMLOutputElement>(null);
  const pointerAnimation = useRef<Animation | null>(null);
  const audio = useRef<SynthWheelAudio | null>(null);
  const engine = useRef<AnomalyEngine | null>(null);
  const locked = useRef(false);
  const closingResult = useRef(false);
  const mounted = useRef(false);
  const completed = useRef(0);

  useEffect(() => {
    mounted.current = true;
    audio.current = new SynthWheelAudio();
    let lastTick = -Infinity;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    engine.current = new AnomalyEngine(PRIZES, {
      onFrame(wheel, pointerAngle) {
        if (rotor.current)
          rotor.current.style.transform = `rotate(${wheel}deg)`;
        if (pointerOrbit.current)
          pointerOrbit.current.style.transform = `rotate(${pointerAngle}deg)`;
        // DOM-only readouts avoid a React render on every animation frame.
        if (angleOutput.current)
          angleOutput.current.value = `${wheel.toFixed(2)}°`;
        if (pointerOutput.current)
          pointerOutput.current.value = `${pointerAngle.toFixed(2)}°`;
      },
      onVisual(value) {
        if (mounted.current) setVisual(value);
      },
      onStatus(value) {
        if (mounted.current) setStatus(value);
      },
      onTick() {
        // Coalesce crossings from a delayed frame or nearly collapsed wedges.
        const now = performance.now();
        if (now - lastTick < 28) return;
        lastTick = now;
        audio.current?.tick();
        if (!reduced.matches && pointer.current) {
          pointerAnimation.current?.cancel();
          pointerAnimation.current = pointer.current.animate(
            [
              { transform: "rotate(0deg)" },
              { transform: "rotate(-21deg)", offset: 0.2 },
              { transform: "rotate(7deg)", offset: 0.6 },
              { transform: "rotate(0deg)" },
            ],
            { duration: 145, easing: "ease-out" },
          );
        }
      },
      onElimination() {
        audio.current?.eliminate();
      },
      onSpinAudio(active, sustained) {
        if (active) audio.current?.startSpin(sustained);
        else audio.current?.stopSpin();
      },
    });
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      let restored = sampleItems();
      try {
        const saved = localStorage.getItem(ITEMS_STORAGE_KEY);
        if (saved) restored = parseItems(saved);
      } catch {
        setEditorNotice(
          "Saved items could not be restored. Using samples; changes stay available in this session.",
        );
      }
      engine.current?.setPrizes(restored);
      setItems(restored);
      setReady(true);
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      engine.current?.dispose();
      pointerAnimation.current?.cancel();
      audio.current?.dispose();
    };
  }, []);

  const changeItems = (next: Prize[]) => {
    if (locked.current || !ready) return;
    const colored = colorItems(next);
    engine.current?.setPrizes(colored);
    setItems(colored);
    setSelected(null);
    setWinner(null);
    setEvent(null);
    if (!colored.some((p) => p.id === forcePrize)) setForcePrize("random");
    try {
      localStorage.setItem(ITEMS_STORAGE_KEY, serializeItems(colored));
      setEditorNotice("");
    } catch {
      setEditorNotice(
        "Local saving is unavailable. Your items are available for this session.",
      );
    }
  };
  const addItem = () => {
    if (items.length < MAX_ITEMS)
      changeItems([...items, newItem(items.length)]);
  };
  const editItem = (id: string, label: string) =>
    changeItems(items.map((p) => (p.id === id ? { ...p, label } : p)));
  const deleteItem = (id: string) =>
    changeItems(items.filter((p) => p.id !== id));
  const moveItem = (id: string, direction: -1 | 1) => {
    const index = items.findIndex((p) => p.id === id),
      next = index + direction;
    if (index < 0 || next < 0 || next >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    changeItems(reordered);
  };
  const clearItems = () => changeItems([]);
  const resetItems = () => changeItems(sampleItems());
  const validation = spinValidation(items);
  const start = async () => {
    if (locked.current || !engine.current || !ready || validation) return;
    locked.current = true;
    setError("");
    setWinner(null);
    setModalOpen(false);
    try {
      // The prize is immutable for the entire event and is selected FIRST.
      const prize =
        forcePrize === "random"
          ? selectPrize(items)
          : (items.find((p) => p.id === forcePrize) ?? selectPrize(items));
      const anomaly = selectBehavior(forceEvent).anomaly;
      setSelected(prize);
      setEvent(anomaly);
      audio.current?.unlock();
      const result = await engine.current.run(
        prize,
        anomaly,
        randomUnit,
        variant === "random" || forceEvent === "random"
          ? null
          : Number(variant),
      );
      if (!mounted.current) return;
      completed.current++;
      setSpins(completed.current);
      setHistory((items) => [result, ...items].slice(0, 5));
      pointerAnimation.current?.cancel();
      audio.current?.win();
      setWinner(result);
      setModalOpen(true);
    } catch (cause) {
      if (!mounted.current) return;
      pointerAnimation.current?.cancel();
      locked.current = false;
      setError(
        cause instanceof Error
          ? `Spin interrupted: ${cause.message}. Please try again.`
          : "Spin interrupted. Please try again.",
      );
    }
  };
  const canRemoveWinner = !!winner && withoutWinningItem(items, winner) !== null;
  const closeResult = async (removeWinner = false) => {
    if (!modalOpen || !winner || closingResult.current) return;
    const remaining = removeWinner ? withoutWinningItem(items, winner) : null;
    if (removeWinner && !remaining) return;
    closingResult.current = true;
    setModalOpen(false);
    audio.current?.stopEffects();
    try {
      await engine.current?.close();
    } catch {
      if (mounted.current)
        setError("The event was reset. The normal wheel is ready.");
    } finally {
      pointerAnimation.current?.cancel();
      if (mounted.current) {
        locked.current = false;
        // Cleanup must finish against the original list before replacing geometry.
        if (remaining) changeItems(remaining);
        else {
          engine.current?.setPrizes(items);
          setSelected(null);
          setWinner(null);
          setEvent(null);
        }
        audio.current?.stopEffects();
        button.current?.focus();
      }
      closingResult.current = false;
    }
  };
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    audio.current?.unlock();
    audio.current?.setEnabled(next);
  };
  return {
    items,
    ready,
    editorNotice,
    validation,
    addItem,
    editItem,
    deleteItem,
    moveItem,
    clearItems,
    resetItems,
    status,
    visual,
    selected,
    event,
    winner,
    modalOpen,
    sound,
    history,
    spins,
    forceEvent,
    setForceEvent,
    forcePrize,
    setForcePrize,
    variant,
    setVariant,
    error,
    rotor,
    pointer,
    pointerOrbit,
    button,
    angleOutput,
    pointerOutput,
    start,
    closeResult,
    canRemoveWinner,
    toggleSound,
  };
}
