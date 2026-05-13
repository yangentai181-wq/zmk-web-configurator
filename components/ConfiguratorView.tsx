"use client";

import { useEffect, useMemo, useState } from "react";
import type { Binding, KeyboardConfig, Layer } from "@/lib/types";
import { useWebHidKeyboard } from "@/lib/use-webhid";
import { useZmkStudio } from "@/lib/use-zmk-studio";
import { generateKeymap } from "@/lib/keymap-generator";
import { translateBinding } from "@/lib/translate-binding";
import { StudioConnect } from "./StudioConnect";
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
  // Edits overlay: edits[layerIndex][position] = Binding. Sparse so we can
  // tell "edited" from "untouched" per key and only patch what changed.
  const [edits, setEdits] = useState<Record<number, Record<number, Binding>>>(
    {},
  );
  const hid = useWebHidKeyboard();
  const studio = useZmkStudio();

  const effectiveLayers: Layer[] = useMemo(() => {
    return config.keymap.layers.map((l) => {
      const layerEdits = edits[l.index];
      if (!layerEdits) return l;
      const nextBindings = l.bindings.map((b, pos) => layerEdits[pos] ?? b);
      return { ...l, bindings: nextBindings };
    });
  }, [config.keymap.layers, edits]);

  const editCount = useMemo(() => {
    let n = 0;
    for (const layer of Object.values(edits)) n += Object.keys(layer).length;
    return n;
  }, [edits]);

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

  const layer = effectiveLayers[layerIndex] ?? effectiveLayers[0];
  const layerNames = useMemo(
    () => config.keymap.layers.map((l) => l.displayName),
    [config],
  );

  const [studioApplyError, setStudioApplyError] = useState<string | null>(null);

  function applyEdit(pos: number, next: Binding) {
    setEdits((prev) => {
      const layerEdits = { ...(prev[layerIndex] ?? {}) };
      layerEdits[pos] = next;
      return { ...prev, [layerIndex]: layerEdits };
    });

    // If Studio is connected, attempt a live push so the keyboard
    // reflects the edit immediately. On any failure the local edit is
    // still preserved so the user can fall back to the download flow.
    if (studio.connected && studio.layers[layerIndex]) {
      const translated = translateBinding(next, studio.behaviors);
      if (translated === null) {
        setStudioApplyError(
          `Studio: ${next.raw} は自動翻訳できませんでした (Download .keymap で反映してください)`,
        );
        return;
      }
      const layerId = studio.layers[layerIndex].id;
      setStudioApplyError(null);
      void studio.setBinding(layerId, pos, translated).then((ok) => {
        if (!ok) {
          setStudioApplyError(
            `Studio: 実機への反映に失敗しました — ${studio.error ?? "unknown"}`,
          );
        }
      });
    }
  }

  function resetEdit(pos: number) {
    setEdits((prev) => {
      const layerEdits = { ...(prev[layerIndex] ?? {}) };
      delete layerEdits[pos];
      const next = { ...prev };
      if (Object.keys(layerEdits).length === 0) {
        delete next[layerIndex];
      } else {
        next[layerIndex] = layerEdits;
      }
      return next;
    });
  }

  function resetAll() {
    setEdits({});
  }

  function downloadKeymap() {
    const docWithEdits = {
      ...config.keymap,
      layers: effectiveLayers,
    };
    const text = generateKeymap(docWithEdits);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.name}.keymap`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
          <div className="flex flex-wrap items-center gap-3">
            <StatusBar config={config} hidConnected={!!hid.device} />
            <HidConnect hid={hid} />
            <StudioConnect studio={studio} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {studioApplyError && (
          <div className="mb-3 rounded-lg border border-status-warn/30 bg-red-50 px-3 py-2 text-xs text-status-warn">
            {studioApplyError}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LayerTabs
            layers={config.keymap.layers}
            active={layerIndex}
            activeLayers={activeLayers}
            onChange={(i) => {
              setLayerIndex(i);
              setSelectedPos(null);
            }}
          />
          <div className="flex items-center gap-2">
            {editCount > 0 && (
              <>
                <span className="rounded-lg border border-accent/30 bg-orange-50 px-3 py-1.5 text-xs text-accent">
                  <span className="font-bold">{editCount}</span> edited
                </span>
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-ink-secondary hover:bg-canvas"
                >
                  Reset all
                </button>
              </>
            )}
            <button
              type="button"
              onClick={downloadKeymap}
              className="rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-hover"
              title="Download a regenerated .keymap with your edits applied"
            >
              ⬇ Download .keymap
            </button>
          </div>
        </div>

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
              isEdited={
                selectedPos != null &&
                edits[layerIndex]?.[selectedPos] !== undefined
              }
              onEditBinding={applyEdit}
              onResetBinding={resetEdit}
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

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-canvas p-3 text-xs">
                <div className="text-[10px] uppercase tracking-widest text-ink-muted">
                  Last pointer frame (0xF2)
                </div>
                {hid.pointer ? (
                  <div className="mt-1 font-mono">
                    dx={hid.pointer.dx} dy={hid.pointer.dy} wheel=
                    {hid.pointer.wheel} hwheel={hid.pointer.hwheel} btns=0x
                    {hid.pointer.buttons.toString(16).padStart(2, "0")} ·{" "}
                    <span className="text-ink-muted">
                      {Math.max(
                        0,
                        Math.floor((Date.now() - hid.pointer.at) / 100) / 10,
                      )}
                      s ago
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-ink-secondary">
                    まだ受信していません
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-canvas p-3 text-xs">
                <div className="text-[10px] uppercase tracking-widest text-ink-muted">
                  Last encoder tick (0xF3)
                </div>
                {Object.keys(hid.encoders).length === 0 ? (
                  <div className="mt-1 text-ink-secondary">
                    まだ受信していません
                  </div>
                ) : (
                  <ul className="mt-1 space-y-0.5 font-mono">
                    {Object.entries(hid.encoders).map(([idx, s]) => (
                      <li key={idx}>
                        sensor={idx} delta={s.delta} ·{" "}
                        <span className="text-ink-muted">
                          {Math.max(
                            0,
                            Math.floor((Date.now() - s.at) / 100) / 10,
                          )}
                          s ago
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-3 text-[10px] uppercase tracking-widest text-ink-muted">
              Recent layer/pointer/encoder packets (raw, newest first)
            </div>
            {hid.recentNonKeyFrames.length === 0 ? (
              <p className="mt-2 text-xs text-ink-secondary">
                0xFF/0xF2/0xF3 のいずれもまだ受信していません。
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
