"use client";

import { useState } from "react";
import type { BehaviorDef, Binding, Layer, PhysicalKey } from "@/lib/types";
import { categorize, describeKey } from "@/lib/zmk-bindings";
import { BindingEditor } from "./BindingEditor";
import { ui } from "@/lib/ui";

export function KeyDetail({
  layout,
  layer,
  layerNames,
  selectedPos,
  isEdited,
  namedBehaviors,
  onEditBinding,
  onResetBinding,
}: {
  layout: PhysicalKey[];
  layer: Layer;
  layerNames: string[];
  selectedPos: number | null;
  isEdited?: boolean;
  /** Custom hold-tap behaviors defined in the keymap, forwarded to the
   * BindingEditor's behavior dropdown so the user can pick &hm,
   * &bspc_lt, … without dropping to Custom mode. */
  namedBehaviors?: BehaviorDef[];
  onEditBinding?: (pos: number, next: Binding) => void;
  onResetBinding?: (pos: number) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (selectedPos == null) {
    return (
      <div>
        <h2 className="text-sm font-bold text-ink-primary">Key Detail</h2>
        <p className="mt-2 text-xs text-ink-secondary">
          盤面のキーをクリックすると詳細を表示します。
        </p>
        <div className="mt-4 rounded-lg border border-border bg-canvas p-3 text-xs text-ink-secondary">
          <div className="font-bold text-ink-primary">Layer</div>
          <div className="mt-1">
            L{layer.index} {layer.displayName} ({layer.name})
          </div>
          <div className="mt-3 font-bold text-ink-primary">Bindings</div>
          <div className="mt-1">{layer.bindings.length} keys assigned</div>
        </div>
      </div>
    );
  }

  const key = layout.find((k) => k.position === selectedPos);
  const binding = layer.bindings[selectedPos];
  if (!key || !binding) return null;
  const category = categorize(binding);
  const { primary, secondary } = describeKey(binding, layerNames);

  return (
    <div>
      <h2 className="text-sm font-bold text-ink-primary">
        Key #{selectedPos}{" "}
        <span className="text-ink-secondary">
          ({key.side} · r{key.row} c{key.col})
        </span>
        {isEdited && (
          <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
            edited
          </span>
        )}
      </h2>

      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-xl font-bold text-ink-primary">
          {primary || "—"}
        </div>
        {secondary ? (
          <div className="text-xs text-ink-secondary">{secondary}</div>
        ) : null}
      </div>

      {editing && onEditBinding ? (
        <div className="mt-3 rounded-lg border border-primary/30 bg-canvas p-3">
          <BindingEditor
            binding={binding}
            layerNames={layerNames}
            namedBehaviors={namedBehaviors}
            onApply={(next) => {
              onEditBinding(selectedPos, next);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-lg border border-border bg-canvas p-3">
            <div className="text-[10px] uppercase tracking-widest text-ink-muted">
              Behavior
            </div>
            <div className="mt-1 font-bold text-ink-primary">
              &{binding.behavior}
            </div>
            {binding.params.length > 0 && (
              <>
                <div className="mt-3 text-[10px] uppercase tracking-widest text-ink-muted">
                  Params
                </div>
                <div className="mt-1 font-mono text-sm">
                  {binding.params.join(" ")}
                </div>
              </>
            )}
            <div className="mt-3 text-[10px] uppercase tracking-widest text-ink-muted">
              Category
            </div>
            <div className="mt-1 text-sm">{category}</div>
            <div className="mt-3 text-[10px] uppercase tracking-widest text-ink-muted">
              Raw
            </div>
            <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs">
              {binding.raw}
            </code>
          </div>

          {onEditBinding && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`${ui.ctaPrimary} flex-1`}
              >
                Edit
              </button>
              {isEdited && onResetBinding && (
                <button
                  type="button"
                  onClick={() => onResetBinding(selectedPos)}
                  className={ui.ctaSecondary}
                  title="Revert to original"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
