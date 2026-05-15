import type { KeyboardConfig } from "@/lib/types";
import { ui } from "@/lib/ui";

export function StatusBar({
  config,
  hidConnected,
}: {
  config: KeyboardConfig;
  hidConnected?: boolean;
}) {
  const items = [
    {
      label: "HID",
      value: hidConnected ? "live" : "off",
      ok: !!hidConnected,
    },
    { label: "Layers", value: `${config.keymap.layers.length}` },
    {
      label: "TB",
      value: config.trackball.enabled ? "on" : "off",
      ok: config.trackball.enabled,
    },
    {
      label: "ENC",
      value: config.encoder.enabled ? "on" : "off",
      ok: config.encoder.enabled,
    },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <div key={it.label} className={it.ok ? ui.chipPrimary : ui.chip}>
          <span className="text-ink-muted">{it.label}</span>
          <span className="font-bold">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
