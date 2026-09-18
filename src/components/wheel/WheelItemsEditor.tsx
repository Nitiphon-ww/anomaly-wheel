"use client";
import type { Prize } from "@/types/wheel";
import { MAX_ITEMS, MAX_LABEL_LENGTH } from "@/lib/wheel/items";

type Props = {
  items: readonly Prize[];
  busy: boolean;
  ready: boolean;
  notice: string;
  onAdd(): void;
  onEdit(id: string, text: string): void;
  onDelete(id: string): void;
  onMove(id: string, direction: -1 | 1): void;
  onClear(): void;
  onReset(): void;
};
export default function WheelItemsEditor({
  items,
  busy,
  ready,
  notice,
  onAdd,
  onEdit,
  onDelete,
  onMove,
  onClear,
  onReset,
}: Props) {
  const disabled = busy || !ready;
  return (
    <section className="items-editor" aria-labelledby="items-heading">
      <div className="items-editor-heading">
        <div>
          <h2 id="items-heading">Wheel Items</h2>
          <p>Your choices. Your next lucky moment.</p>
        </div>
        <span>
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      <fieldset disabled={disabled}>
        <legend className="sr-only">Edit wheel items</legend>
        <div className="item-rows">
          {items.map((item, index) => (
            <div key={item.id} className="item-row" data-item-id={item.id}>
              <span
                className="item-color"
                style={{ background: item.color }}
                aria-hidden="true"
              />
              <input
                aria-label={`Item ${index + 1} text`}
                value={item.label}
                maxLength={MAX_LABEL_LENGTH}
                onChange={(e) => onEdit(item.id, e.target.value)}
                placeholder="Give this item a name"
                spellCheck={false}
              />
              <button
                type="button"
                aria-label={`Move item ${index + 1} up`}
                disabled={index === 0}
                onClick={() => onMove(item.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move item ${index + 1} down`}
                disabled={index === items.length - 1}
                onClick={() => onMove(item.id, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Delete item ${index + 1}`}
                className="item-delete"
                onClick={() => onDelete(item.id)}
              >
                Delete
              </button>
            </div>
          ))}
          {!items.length && (
            <p className="items-empty">
              A blank wheel. Add a few possibilities below.
            </p>
          )}
        </div>
        <div className="item-actions">
          <button
            className="add-item"
            type="button"
            disabled={items.length >= MAX_ITEMS}
            onClick={onAdd}
          >
            + Add Item
          </button>
          <div>
            <button type="button" disabled={!items.length} onClick={onClear}>
              Clear all
            </button>
            <button type="button" onClick={onReset}>
              Reset to samples
            </button>
          </div>
        </div>
      </fieldset>
      <p className="items-save-note" role="status">
        {!ready
          ? "Restoring your items…"
          : busy
            ? "You can edit again when this spin has finished."
            : notice || `Saved on this device · 2–${MAX_ITEMS} items to spin`}
      </p>
    </section>
  );
}
