"use client";

import type { Layer } from "@/lib/types";

export function LayerTabs({
  layers,
  active,
  activeLayers,
  onChange,
}: {
  layers: Layer[];
  active: number;
  activeLayers?: ReadonlySet<number>;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {layers.map((l) => {
        const selected = l.index === active;
        const liveActive = activeLayers?.has(l.index) ?? false;
        return (
          <button
            key={l.index}
            type="button"
            onClick={() => onChange(l.index)}
            className={[
              "relative inline-flex h-10 items-center rounded-xl border px-4 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              selected
                ? "border-primary bg-primary text-white"
                : liveActive
                  ? "border-accent bg-orange-50 text-accent"
                  : "border-border bg-card text-ink-primary hover:bg-canvas",
            ].join(" ")}
          >
            {liveActive && !selected && (
              <span
                className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent"
                aria-label="active layer"
              />
            )}
            <span
              className={[
                "mr-2 text-xs",
                selected ? "text-white/70" : "text-ink-muted",
              ].join(" ")}
            >
              L{l.index}
            </span>
            <span className={selected ? "font-bold" : "font-medium"}>
              {l.displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
