import { PRIZES } from "./prizes";
import type { Prize } from "@/types/wheel";

export const MIN_ITEMS = 2;
export const MAX_ITEMS = 100;
export const MAX_LABEL_LENGTH = 160;
export const ITEMS_STORAGE_KEY = "anomaly-wheel.items.v1";
export const sampleItems = (): Prize[] => PRIZES.map((p) => ({ ...p }));

/** Reuse the existing palette; probability remains independent of color/order. */
export function colorItems(items: readonly Prize[]): Prize[] {
  return items.map((item, i) => ({
    ...item,
    color: PRIZES[i % PRIZES.length].color,
    textColor: PRIZES[i % PRIZES.length].textColor,
    probabilityWeight: 1,
  }));
}
export function newItem(index: number): Prize {
  return {
    ...PRIZES[index % PRIZES.length],
    id: crypto.randomUUID(),
    label: `Item ${index + 1}`,
    probabilityWeight: 1,
  };
}
export function spinValidation(items: readonly Prize[]): string | null {
  if (items.length < MIN_ITEMS)
    return `Add at least ${MIN_ITEMS} items to spin.`;
  if (items.some((item) => !item.label.trim()))
    return "Give every item a name before spinning.";
  return null;
}
export function serializeItems(items: readonly Prize[]): string {
  return JSON.stringify({
    version: 1,
    items: items.map(({ id, label }) => ({ id, label })),
  });
}
export function parseItems(raw: string): Prize[] {
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("items" in value) ||
    !Array.isArray(value.items) ||
    value.items.length > MAX_ITEMS
  )
    throw new Error("Invalid saved items");
  const ids = new Set<string>();
  const items = value.items.map((item: unknown, i: number) => {
    if (
      !item ||
      typeof item !== "object" ||
      !("id" in item) ||
      !("label" in item) ||
      typeof item.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) ||
      ids.has(item.id) ||
      typeof item.label !== "string" ||
      item.label.length > MAX_LABEL_LENGTH
    )
      throw new Error("Invalid saved item");
    ids.add(item.id);
    return {
      ...PRIZES[i % PRIZES.length],
      id: item.id,
      label: item.label,
      probabilityWeight: 1,
    };
  });
  return colorItems(items);
}

/** Bound radial text length to the usable annulus, including wide Unicode glyphs. */
export function fitSegmentLabel(label: string, span: number) {
  const characters = Array.from(label || "Unnamed item");
  const units = (text: string[]) =>
    text.reduce((sum, c) => sum + (/[^\u0000-\u00ff]/.test(c) ? 1 : 0.59), 0);
  const maximum = Math.min(22, Math.max(7, span * 0.82));
  const fontSize = Math.min(
    maximum,
    Math.max(Math.min(12, maximum), 138 / Math.max(1, units(characters))),
  );
  while (characters.length > 1 && units(characters) * fontSize > 134)
    characters.pop();
  const text =
    characters.length < Array.from(label || "Unnamed item").length
      ? `${characters.join("")}…`
      : characters.join("");
  return {
    text,
    fontSize,
    opacity: Math.min(1, Math.max(0, (span - 1.5) / 3)),
  };
}
