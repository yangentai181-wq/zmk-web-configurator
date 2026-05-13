"use client";

import { useMemo, useState } from "react";
import type { KeyboardConfig } from "@/lib/types";
import { KeyboardView } from "./KeyboardView";
import { LayerTabs } from "./LayerTabs";
import { KeyDetail } from "./KeyDetail";
import { TrackballPanel } from "./TrackballPanel";
import { EncoderPanel } from "./EncoderPanel";
import { StatusBar } from "./StatusBar";

export function ConfiguratorView({ config }: { config: KeyboardConfig }) {
  const [layerIndex, setLayerIndex] = useState(0);
  const [selectedPos, setSelectedPos] = useState<number | null>(null);

  const layer = config.keymap.layers[layerIndex] ?? config.keymap.layers[0];
  const layerNames = useMemo(
    () => config.keymap.layers.map((l) => l.displayName),
    [config],
  );

  return (
    <div className="min-h-dvh bg-canvas text-ink-primary">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink-secondary">
              ZMK Web Configurator · Phase 1 Visualizer
            </div>
            <h1 className="text-lg font-bold">
              ⌨️ {config.name}
              <span className="ml-2 text-ink-secondary">
                ({config.layout.length} keys · {config.keymap.layers.length}{" "}
                layers)
              </span>
            </h1>
          </div>
          <StatusBar config={config} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <LayerTabs
          layers={config.keymap.layers}
          active={layerIndex}
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
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-8 pt-2 text-xs text-ink-secondary">
        Read-only visualizer · fixtures from{" "}
        <code className="rounded bg-canvas px-1">fixtures/</code> · Phase 1 of
        the ZMK Configurator roadmap
      </footer>
    </div>
  );
}
