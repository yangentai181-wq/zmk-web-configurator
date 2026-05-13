"use client";

import { useEffect, useMemo, useState } from "react";
import type { KeyboardConfig } from "@/lib/types";
import { useWebHidKeyboard } from "@/lib/use-webhid";
import { KeyboardView } from "./KeyboardView";
import { LayerTabs } from "./LayerTabs";
import { KeyDetail } from "./KeyDetail";
import { TrackballPanel } from "./TrackballPanel";
import { EncoderPanel } from "./EncoderPanel";
import { StatusBar } from "./StatusBar";
import { HidConnect } from "./HidConnect";

export function ConfiguratorView({ config }: { config: KeyboardConfig }) {
  const [layerIndex, setLayerIndex] = useState(0);
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const hid = useWebHidKeyboard();

  // Derive the "active layer" from HID layer mask (highest set bit), so the
  // configurator follows the keyboard's real state while connected.
  const hidActiveLayer = useMemo(() => {
    if (!hid.device || hid.activeLayerMask === 0) return null;
    return highestBitIndex(hid.activeLayerMask);
  }, [hid.device, hid.activeLayerMask]);

  useEffect(() => {
    if (
      hidActiveLayer != null &&
      hidActiveLayer < config.keymap.layers.length
    ) {
      setLayerIndex(hidActiveLayer);
    }
  }, [hidActiveLayer, config.keymap.layers.length]);

  const layer = config.keymap.layers[layerIndex] ?? config.keymap.layers[0];
  const layerNames = useMemo(
    () => config.keymap.layers.map((l) => l.displayName),
    [config],
  );

  const activeLayers = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < config.keymap.layers.length; i++) {
      if (hid.activeLayerMask & (1 << i)) set.add(i);
    }
    return set;
  }, [hid.activeLayerMask, config.keymap.layers.length]);

  return (
    <div className="min-h-dvh bg-canvas text-ink-primary">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink-secondary">
              ZMK Web Configurator · Live Input Monitor
            </div>
            <h1 className="text-lg font-bold">
              ⌨️ {config.name}
              <span className="ml-2 text-ink-secondary">
                ({config.layout.length} keys · {config.keymap.layers.length}{" "}
                layers)
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusBar config={config} hidConnected={!!hid.device} />
            <HidConnect hid={hid} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <LayerTabs
          layers={config.keymap.layers}
          active={layerIndex}
          activeLayers={activeLayers}
          onChange={(i) => {
            setLayerIndex(i);
            setSelectedPos(null);
          }}
        />

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-xl border border-border bg-card p-6 key-shadow">
            <KeyboardView
              layout={config.layout}
              layer={layer}
              layerNames={layerNames}
              selectedPos={selectedPos}
              pressed={hid.pressed}
              pointer={hid.pointer}
              encoders={hid.encoders}
              onSelect={setSelectedPos}
            />
          </section>

          <aside className="rounded-xl border border-border bg-card p-5 key-shadow">
            <KeyDetail
              layout={config.layout}
              layer={layer}
              layerNames={layerNames}
              selectedPos={selectedPos}
            />
          </aside>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TrackballPanel
            trackball={config.trackball}
            layerNames={layerNames}
          />
          <EncoderPanel
            encoder={config.encoder}
            sensors={config.sensors}
            sensorBindings={layer.sensorBindings}
            layerNames={layerNames}
          />
        </div>

        {hid.device && (
          <details className="mt-6 rounded-xl border border-border bg-card p-5 key-shadow">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-bold">
              <span>🔬 HID Debug</span>
              <span className="text-xs font-normal text-ink-secondary">
                mask 0x{hid.activeLayerMask.toString(16).padStart(8, "0")} ·
                highest bit {hidActiveLayer ?? "—"}
              </span>
            </summary>
            <div className="mt-3 text-[10px] uppercase tracking-widest text-ink-muted">
              Recent non-key inputreports (newest first)
            </div>
            {hid.recentNonKeyFrames.length === 0 ? (
              <p className="mt-2 text-xs text-ink-secondary">
                まだ 0xF1 以外のレポートを受信していません。
              </p>
            ) : (
              <ul className="mt-2 space-y-1 font-mono text-xs">
                {hid.recentNonKeyFrames.map((f, i) => (
                  <li
                    key={`${f.at}-${i}`}
                    className="flex gap-3 border-b border-border/60 py-1"
                  >
                    <span className="text-ink-muted">rid={f.reportId}</span>
                    <span>
                      {f.bytes
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join(" ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-8 pt-2 text-xs text-ink-secondary">
        {hid.device
          ? "Live input monitor active · keys highlight on press · current layer auto-follows"
          : "Read-only visualizer · click Connect Keyboard to enable live input monitoring"}
      </footer>
    </div>
  );
}

function highestBitIndex(mask: number): number | null {
  if (mask === 0) return null;
  let i = 0;
  let m = mask;
  while (m > 1) {
    m >>>= 1;
    i++;
  }
  return i;
}
