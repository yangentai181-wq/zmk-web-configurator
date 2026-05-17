"use client";

import { useState } from "react";
import type { BehaviorDef } from "@/lib/types";
import { ui } from "@/lib/ui";
import { BehaviorEditor, newNamedBehavior } from "./BehaviorEditor";

/**
 * Lists hold-tap behaviors (global overrides + named definitions) and
 * lets the user open the inline editor on each one. Global behaviors
 * cannot be deleted; named ones can. "+ Add Behavior" creates a new
 * named entry pre-filled with sensible defaults.
 */
export function BehaviorsPanel({
  behaviors,
  editedNames,
  onChange,
}: {
  behaviors: BehaviorDef[];
  editedNames?: ReadonlySet<string>;
  onChange: (next: BehaviorDef[]) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  function suggestName(): string {
    const taken = new Set(behaviors.map((b) => b.name));
    if (!taken.has("hm")) return "hm";
    for (let i = 2; i < 100; i++) {
      const candidate = `hm${i}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `hm_${Date.now().toString(36)}`;
  }

  function startAdd() {
    const fresh = newNamedBehavior(suggestName());
    onChange([...behaviors, fresh]);
    setEditing(fresh.name);
  }

  function applyEdit(prevName: string, next: BehaviorDef) {
    onChange(behaviors.map((b) => (b.name === prevName ? next : b)));
    setEditing(null);
  }

  function deleteBehavior(name: string) {
    onChange(behaviors.filter((b) => b.name !== name));
    if (editing === name) setEditing(null);
  }

  return (
    <section className={ui.card}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">
          ⏱️ Hold-tap behaviors{" "}
          <span className="text-ink-secondary">({behaviors.length})</span>
        </h2>
        <button type="button" onClick={startAdd} className={ui.ctaPrimarySmall}>
          + Add Behavior
        </button>
      </div>

      {behaviors.length === 0 ? (
        <p className="mt-3 text-xs text-ink-secondary">
          hold-tap 系の behavior が見つかりませんでした。
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {behaviors.map((b) => (
            <li key={b.name} className={ui.innerCard}>
              {editing === b.name ? (
                <BehaviorEditor
                  initial={b}
                  onApply={(next) => applyEdit(b.name, next)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <Row
                  behavior={b}
                  edited={editedNames?.has(b.name) ?? false}
                  onEdit={() => setEditing(b.name)}
                  onDelete={
                    b.scope === "named"
                      ? () => deleteBehavior(b.name)
                      : undefined
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({
  behavior,
  edited,
  onEdit,
  onDelete,
}: {
  behavior: BehaviorDef;
  edited: boolean;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const isHoldTap = behavior.compatible === "zmk,behavior-hold-tap";
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <code className="font-mono text-sm font-bold">
            &amp;{behavior.name}
          </code>
          <span
            className={
              behavior.scope === "global"
                ? ui.chip
                : "inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-teal-50 px-2 py-0.5 text-[10px] text-primary"
            }
          >
            {behavior.scope === "global" ? "built-in" : "custom"}
          </span>
          {edited && (
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
              edited
            </span>
          )}
          {behavior.flavor && (
            <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
              {behavior.flavor}
            </span>
          )}
        </div>
        {isHoldTap && (
          <div className="mt-1 text-[11px] text-ink-secondary">
            tapping-term:{" "}
            <span className="text-ink-primary">
              {behavior.tappingTermMs ?? "—"}
              {behavior.tappingTermMs !== undefined ? "ms" : ""}
            </span>
            {behavior.quickTapMs !== undefined && (
              <>
                {" · "}quick-tap:{" "}
                <span className="text-ink-primary">
                  {behavior.quickTapMs}ms
                </span>
              </>
            )}
            {behavior.requirePriorIdleMs !== undefined && (
              <>
                {" · "}prior-idle:{" "}
                <span className="text-ink-primary">
                  {behavior.requirePriorIdleMs}ms
                </span>
              </>
            )}
            {behavior.innerBindings && behavior.innerBindings.length > 0 && (
              <>
                {" · "}inner:{" "}
                <code className="text-ink-primary">
                  {behavior.innerBindings.map((b) => `&${b}`).join(", ")}
                </code>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={onEdit} className={ui.ctaPrimarySmall}>
          Edit
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className={ui.iconButton}
            aria-label={`Delete behavior ${behavior.name}`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
