"use client";

import type { ComboDef, PhysicalKey } from "@/lib/types";
import { ui } from "@/lib/ui";

/**
 * Compact list of currently defined combos. Each row shows the
 * essentials (name, key-positions, bindings, layers/timeout) plus
 * Edit / Delete actions. "+ Add Combo" lives in the header.
 *
 * Selection-mode plumbing (picking key-positions on the board) lives
 * one level up in ConfiguratorView; this component is purely a list
 * + action dispatcher.
 */
export function CombosPanel({
  combos,
  layerNames,
  layout,
  isEditedSet,
  onAdd,
  onEdit,
  onDelete,
}: {
  combos: ComboDef[];
  layerNames: string[];
  layout: PhysicalKey[];
  isEditedSet?: ReadonlySet<string>;
  onAdd: () => void;
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  return (
    <section className={ui.card}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">
          🔗 Combos{" "}
          <span className="text-ink-secondary">({combos.length})</span>
        </h2>
        <button type="button" onClick={onAdd} className={ui.ctaPrimarySmall}>
          + Add Combo
        </button>
      </div>

      {combos.length === 0 ? (
        <p className="mt-3 text-xs text-ink-secondary">
          まだコンボが定義されていません。 + Add Combo
          で盤面からキーを選択して追加できます。
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {combos.map((c) => (
            <ComboRow
              key={c.name}
              combo={c}
              layerNames={layerNames}
              layout={layout}
              edited={isEditedSet?.has(c.name) ?? false}
              onEdit={() => onEdit(c.name)}
              onDelete={() => onDelete(c.name)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ComboRow({
  combo,
  layerNames,
  layout,
  edited,
  onEdit,
  onDelete,
}: {
  combo: ComboDef;
  layerNames: string[];
  layout: PhysicalKey[];
  edited: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const layerLabel =
    combo.layers && combo.layers.length > 0
      ? combo.layers
          .map((i) => `L${i}${layerNames[i] ? ` ${layerNames[i]}` : ""}`)
          .join(", ")
      : "all";

  return (
    <li className={ui.innerCard}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{combo.name}</span>
            {edited && (
              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
                edited
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
            <span className="text-ink-muted">keys:</span>
            {combo.keyPositions.map((p) => (
              <KeyChip key={p} pos={p} layout={layout} />
            ))}
            <span className="ml-1 text-ink-muted">→</span>
            <code className="rounded bg-white px-1.5 py-0.5 font-mono">
              {combo.bindings || "(empty)"}
            </code>
          </div>
          <div className="mt-1 text-[11px] text-ink-secondary">
            layers: <span className="text-ink-primary">{layerLabel}</span>
            {combo.timeoutMs !== undefined && (
              <>
                {" · "}timeout:{" "}
                <span className="text-ink-primary">{combo.timeoutMs}ms</span>
              </>
            )}
            {combo.requirePriorIdleMs !== undefined && (
              <>
                {" · "}prior-idle:{" "}
                <span className="text-ink-primary">
                  {combo.requirePriorIdleMs}ms
                </span>
              </>
            )}
            {combo.slowRelease && (
              <>
                {" · "}
                <span className="text-ink-primary">slow-release</span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onEdit} className={ui.ctaPrimarySmall}>
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={ui.iconButton}
            aria-label={`Delete combo ${combo.name}`}
          >
            ×
          </button>
        </div>
      </div>
    </li>
  );
}

function KeyChip({ pos, layout }: { pos: number; layout: PhysicalKey[] }) {
  const key = layout.find((k) => k.position === pos);
  const tooltip = key ? `${key.side} r${key.row} c${key.col}` : `pos ${pos}`;
  return (
    <span
      className="rounded border border-border bg-white px-1.5 py-0.5 font-mono text-[10px]"
      title={tooltip}
    >
      {pos}
    </span>
  );
}
