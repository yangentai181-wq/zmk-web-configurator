"use client";

import type { Layer } from "@/lib/types";

export function LayerTabs({
  layers,
  active,
  onChange,
}: {
  layers: Layer[];
  active: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {layers.map((l) => {
        const selected = l.index === active;
        return (
          <button
            key={l.index}
            type="button"
            onClick={() => onChange(l.index)}
            className={[
              "rounded-xl border px-4 py-2 text-sm transition",
              selected
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-ink-primary hover:bg-canvas",
            ].join(" ")}
          >
            <span className="mr-2 text-xs text-ink-muted">L{l.index}</span>
            <span className={selected ? "font-bold text-white" : "font-medium"}>
              {l.displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
