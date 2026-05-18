import type { KeyboardConfig } from "@/lib/types";
import { ui } from "@/lib/ui";
import { UI } from "@/lib/labels";

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
      value: hidConnected ? "ライブ" : "オフ",
      ok: !!hidConnected,
    },
    { label: UI.layers, value: `${config.keymap.layers.length}` },
    {
      label: "トラックボール",
      value: config.trackball.enabled ? "オン" : "オフ",
      ok: config.trackball.enabled,
    },
    {
      label: "エンコーダ",
      value: config.encoder.enabled ? "オン" : "オフ",
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
