"use client";

import type { Layer, PhysicalKey } from "@/lib/types";
import { categorize, describe } from "@/lib/zmk-bindings";

export function KeyDetail({
  layout,
  layer,
  layerNames,
  selectedPos,
}: {
  layout: PhysicalKey[];
  layer: Layer;
  layerNames: string[];
  selectedPos: number | null;
}) {
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

  return (
    <div>
      <h2 className="text-sm font-bold text-ink-primary">
        Key #{selectedPos}{" "}
        <span className="text-ink-secondary">
          ({key.side} · r{key.row} c{key.col})
        </span>
      </h2>
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
          Display
        </div>
        <pre className="mt-1 whitespace-pre-wrap text-sm">
          {describe(binding, layerNames)}
        </pre>
        <div className="mt-3 text-[10px] uppercase tracking-widest text-ink-muted">
          Raw
        </div>
        <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs">
          {binding.raw}
        </code>
      </div>
    </div>
  );
}
