import type { KeyboardConfig } from "@/lib/types";

export function StatusBar({ config }: { config: KeyboardConfig }) {
  const items = [
    { label: "Combos", value: `${config.keymap.combos.length}` },
    { label: "Layers", value: `${config.keymap.layers.length}` },
    {
      label: "Trackball",
      value: config.trackball.enabled ? "on" : "off",
      ok: config.trackball.enabled,
    },
    {
      label: "Encoder",
      value: config.encoder.enabled ? "on" : "off",
      ok: config.encoder.enabled,
    },
  ];
  return (
    <div className="flex gap-2">
      {items.map((it) => (
        <div
          key={it.label}
          className={[
            "rounded-lg border px-3 py-1.5 text-xs",
            it.ok
              ? "border-primary/30 bg-teal-50 text-primary"
              : "border-border bg-canvas text-ink-secondary",
          ].join(" ")}
        >
          <span className="text-ink-muted">{it.label}</span>{" "}
          <span className="font-bold">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
