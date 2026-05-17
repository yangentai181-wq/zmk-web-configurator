"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  BehaviorDef,
  Binding,
  ComboDef,
  KeyboardConfig,
  Layer,
} from "@/lib/types";
import { useWebHidKeyboard } from "@/lib/use-webhid";
import { useZmkStudio } from "@/lib/use-zmk-studio";
import { generateKeymap } from "@/lib/keymap-generator";
import { generateConf } from "@/lib/conf-generator";
import { translateBinding } from "@/lib/translate-binding";
import type { TrackballEdits } from "./TrackballEditor";
import { StudioConnect } from "./StudioConnect";
import { KeyboardView } from "./KeyboardView";
import { LayerTabs } from "./LayerTabs";
import { KeyDetail } from "./KeyDetail";
import { TrackballPanel } from "./TrackballPanel";
import { EncoderPanel } from "./EncoderPanel";
import { StatusBar } from "./StatusBar";
import { HidConnect } from "./HidConnect";
import { CombosPanel } from "./CombosPanel";
import { ComboEditor } from "./ComboEditor";
import { BehaviorsPanel } from "./BehaviorsPanel";
import { MobileActionBar } from "./MobileActionBar";
import { GithubSettingsModal } from "./GithubSettings";
import {
  isGithubSettingsComplete,
  readGithubSettings,
} from "@/lib/github-settings";
import { putFile } from "@/lib/github-push";
import { useCiWatch } from "@/lib/use-ci-watch";
import { ui } from "@/lib/ui";

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

  // --- GitHub push state ---
  const [githubOpen, setGithubOpen] = useState(false);
  // Bump this whenever settings change, so derived flags re-evaluate.
  const [ghTick, setGhTick] = useState(0);
  const ghReady = useMemo(
    () => isGithubSettingsComplete(readGithubSettings()),
    // ghTick lets us refresh after the modal saves.
    [ghTick], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [pushBanner, setPushBanner] = useState<
    | { kind: "ok"; message: string; commitUrl?: string; actionsUrl?: string }
    | { kind: "error"; message: string }
    | null
  >(null);
  const ci = useCiWatch();

  async function pushFile(
    pathField: "keymapPath" | "confPath",
    contentFn: () => string,
    label: string,
  ) {
    const settings = readGithubSettings();
    if (!isGithubSettingsComplete(settings)) {
      setGithubOpen(true);
      return;
    }
    setPushBusy(true);
    setPushBanner(null);
    const result = await putFile(
      settings,
      settings[pathField],
      contentFn(),
      `chore: update ${label} via zmk-web-configurator`,
    );
    setPushBusy(false);
    if (result.ok) {
      setPushBanner({
        kind: "ok",
        message: `Pushed ${label} to ${settings.owner}/${settings.repo}@${settings.branch}.`,
        commitUrl: result.commitUrl,
        actionsUrl: result.actionsUrl,
      });
      if (result.commitSha) {
        ci.start(result.commitSha);
      }
    } else {
      setPushBanner({
        kind: "error",
        message: `Push failed: ${result.error ?? "unknown error"}`,
      });
    }
  }

  // --- Trackball state ---
  const [trackballEdits, setTrackballEdits] = useState<TrackballEdits>({});
  const effectiveTrackball = useMemo(
    () => ({ ...config.trackball, ...trackballEdits }),
    [config.trackball, trackballEdits],
  );
  const editedTrackballFields = useMemo(
    () => new Set(Object.keys(trackballEdits)),
    [trackballEdits],
  );

  function applyTrackballEdits(next: TrackballEdits) {
    setTrackballEdits((prev) => ({ ...prev, ...next }));
  }
  function resetTrackballEdits() {
    setTrackballEdits({});
  }

  function downloadConf() {
    const overrides: Record<string, string | null> = {};
    if (trackballEdits.cpi !== undefined)
      overrides.CONFIG_PMW3610_CPI = String(trackballEdits.cpi);
    if (trackballEdits.cpiDividor !== undefined)
      overrides.CONFIG_PMW3610_CPI_DIVIDOR = String(trackballEdits.cpiDividor);
    if (trackballEdits.scrollTick !== undefined)
      overrides.CONFIG_PMW3610_SCROLL_TICK = String(trackballEdits.scrollTick);
    if (trackballEdits.automouseTimeoutMs !== undefined)
      overrides.CONFIG_PMW3610_AUTOMOUSE_TIMEOUT_MS = String(
        trackballEdits.automouseTimeoutMs,
      );
    if (trackballEdits.invertX !== undefined)
      overrides.CONFIG_PMW3610_INVERT_X = trackballEdits.invertX ? "y" : "n";
    if (trackballEdits.invertY !== undefined)
      overrides.CONFIG_PMW3610_INVERT_Y = trackballEdits.invertY ? "y" : "n";
    if (trackballEdits.invertScrollX !== undefined)
      overrides.CONFIG_PMW3610_INVERT_SCROLL_X = trackballEdits.invertScrollX
        ? "y"
        : "n";
    if (trackballEdits.smartAlgorithm !== undefined)
      overrides.CONFIG_PMW3610_SMART_ALGORITHM = trackballEdits.smartAlgorithm
        ? "y"
        : "n";
    if (trackballEdits.pollingRate !== undefined) {
      // Polling rate is a Kconfig choice — set the picked one to y and
      // null out the other so the choice resolves cleanly.
      overrides.CONFIG_PMW3610_POLLING_RATE_125 =
        trackballEdits.pollingRate === 125 ? "y" : null;
      overrides.CONFIG_PMW3610_POLLING_RATE_250 =
        trackballEdits.pollingRate === 250 ? "y" : null;
    }
    const text = generateConf(config.trackball.originalConfText, overrides);
    saveFile(text, config.trackball.confFilename, "text/plain;charset=utf-8");
  }

  // --- Behaviors state ---
  const [behaviors, setBehaviors] = useState<BehaviorDef[]>(
    config.keymap.behaviors,
  );
  const originalBehaviorsByName = useMemo(() => {
    const m = new Map<string, BehaviorDef>();
    for (const b of config.keymap.behaviors) m.set(b.name, b);
    return m;
  }, [config.keymap.behaviors]);
  const editedBehaviorNames = useMemo(() => {
    const s = new Set<string>();
    for (const b of behaviors) {
      const orig = originalBehaviorsByName.get(b.name);
      if (!orig || JSON.stringify(orig) !== JSON.stringify(b)) s.add(b.name);
    }
    return s;
  }, [behaviors, originalBehaviorsByName]);

  // --- Combos state ---
  const [combos, setCombos] = useState<ComboDef[]>(config.keymap.combos);
  // Track per-combo edited status by comparing against the original
  // parsed combos by name. New combos are "edited" too.
  const originalCombosByName = useMemo(() => {
    const m = new Map<string, ComboDef>();
    for (const c of config.keymap.combos) m.set(c.name, c);
    return m;
  }, [config.keymap.combos]);
  const editedComboNames = useMemo(() => {
    const s = new Set<string>();
    for (const c of combos) {
      const orig = originalCombosByName.get(c.name);
      if (!orig || JSON.stringify(orig) !== JSON.stringify(c)) s.add(c.name);
    }
    // Also flag deleted ones, but they're already gone from `combos`
    // and have no row to badge — skip.
    return s;
  }, [combos, originalCombosByName]);
  const allComboPositions = useMemo(() => {
    const set = new Set<number>();
    for (const c of combos) for (const p of c.keyPositions) set.add(p);
    return set;
  }, [combos]);
  // Editor state: which combo is being authored (null = no editor open)
  type ComboEditingState =
    | { mode: "new"; positions: number[] }
    | { mode: "edit"; name: string; positions: number[] };
  const [comboEditing, setComboEditing] = useState<ComboEditingState | null>(
    null,
  );
  // While `pickingKeys` is true, the keyboard view is in multi-select
  // mode and routes clicks to `selectedComboKeys` instead of moving
  // `selectedPos`.
  const [pickingKeys, setPickingKeys] = useState(false);

  function startNewCombo() {
    setComboEditing({ mode: "new", positions: [] });
    setPickingKeys(true);
  }
  function startEditCombo(name: string) {
    const c = combos.find((x) => x.name === name);
    if (!c) return;
    setComboEditing({ mode: "edit", name, positions: [...c.keyPositions] });
    setPickingKeys(false);
  }
  function deleteCombo(name: string) {
    setCombos((prev) => prev.filter((c) => c.name !== name));
  }
  function applyCombo(next: ComboDef) {
    setCombos((prev) => {
      if (comboEditing?.mode === "edit") {
        return prev.map((c) => (c.name === comboEditing.name ? next : c));
      }
      return [...prev, next];
    });
    setComboEditing(null);
    setPickingKeys(false);
  }
  function cancelCombo() {
    setComboEditing(null);
    setPickingKeys(false);
  }
  function toggleComboKey(pos: number) {
    if (!comboEditing) return;
    setComboEditing((prev) => {
      if (!prev) return prev;
      const set = new Set(prev.positions);
      if (set.has(pos)) set.delete(pos);
      else set.add(pos);
      const positions = Array.from(set).sort((a, b) => a - b);
      return { ...prev, positions };
    });
  }
  function returnToPicking() {
    setPickingKeys(true);
  }

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
      const translated = translateBinding(
        next,
        studio.behaviors,
        studio.layers,
      );
      if (translated === null) {
        setStudioApplyError(
          `Studio: ${next.raw} は自動翻訳できませんでした (Download .keymap で反映してください)`,
        );
        return;
      }
      const layerId = studio.layers[layerIndex].id;
      setStudioApplyError(null);
      void studio.setBinding(layerId, pos, translated).then((result) => {
        if (!result.ok) {
          setStudioApplyError(
            `Studio: 実機への反映に失敗しました — ${result.error ?? "unknown"}`,
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

  function buildKeymapText(): string {
    return generateKeymap({
      ...config.keymap,
      layers: effectiveLayers,
      combos,
      behaviors,
    });
  }

  function downloadKeymap() {
    saveFile(
      buildKeymapText(),
      `${config.name}.keymap`,
      "text/plain;charset=utf-8",
    );
  }

  function pushKeymap() {
    void pushFile("keymapPath", buildKeymapText, ".keymap");
  }
  function pushConf() {
    void pushFile(
      "confPath",
      () => {
        // Reuse the conf override map building from downloadConf
        const overrides: Record<string, string | null> = {};
        if (trackballEdits.cpi !== undefined)
          overrides.CONFIG_PMW3610_CPI = String(trackballEdits.cpi);
        if (trackballEdits.cpiDividor !== undefined)
          overrides.CONFIG_PMW3610_CPI_DIVIDOR = String(
            trackballEdits.cpiDividor,
          );
        if (trackballEdits.scrollTick !== undefined)
          overrides.CONFIG_PMW3610_SCROLL_TICK = String(
            trackballEdits.scrollTick,
          );
        if (trackballEdits.automouseTimeoutMs !== undefined)
          overrides.CONFIG_PMW3610_AUTOMOUSE_TIMEOUT_MS = String(
            trackballEdits.automouseTimeoutMs,
          );
        if (trackballEdits.invertX !== undefined)
          overrides.CONFIG_PMW3610_INVERT_X = trackballEdits.invertX
            ? "y"
            : "n";
        if (trackballEdits.invertY !== undefined)
          overrides.CONFIG_PMW3610_INVERT_Y = trackballEdits.invertY
            ? "y"
            : "n";
        if (trackballEdits.invertScrollX !== undefined)
          overrides.CONFIG_PMW3610_INVERT_SCROLL_X =
            trackballEdits.invertScrollX ? "y" : "n";
        if (trackballEdits.smartAlgorithm !== undefined)
          overrides.CONFIG_PMW3610_SMART_ALGORITHM =
            trackballEdits.smartAlgorithm ? "y" : "n";
        if (trackballEdits.pollingRate !== undefined) {
          overrides.CONFIG_PMW3610_POLLING_RATE_125 =
            trackballEdits.pollingRate === 125 ? "y" : null;
          overrides.CONFIG_PMW3610_POLLING_RATE_250 =
            trackballEdits.pollingRate === 250 ? "y" : null;
        }
        return generateConf(config.trackball.originalConfText, overrides);
      },
      ".conf",
    );
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
          <div className="hidden flex-wrap items-center gap-3 md:flex">
            <StatusBar config={config} hidConnected={!!hid.device} />
            <HidConnect hid={hid} />
            <StudioConnect studio={studio} />
            <button
              type="button"
              onClick={() => setGithubOpen(true)}
              className={ui.iconButton}
              title="GitHub push settings"
              aria-label="Open GitHub settings"
            >
              ⚙️
            </button>
          </div>
        </div>
        {/* Mobile-only secondary row: keep status visible, hide CTAs (they
            live in the bottom action bar). */}
        <div className="mx-auto block max-w-6xl px-6 pb-4 md:hidden">
          <StatusBar config={config} hidConnected={!!hid.device} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6 pb-32 md:pb-6">
        {studioApplyError && (
          <div className="mb-3 rounded-lg border border-status-warn/30 bg-red-50 px-3 py-2 text-xs text-status-warn">
            {studioApplyError}
          </div>
        )}
        {pushBanner && (
          <div
            className={[
              "mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs",
              pushBanner.kind === "ok"
                ? "border-primary/30 bg-teal-50 text-primary"
                : "border-status-warn/30 bg-red-50 text-status-warn",
            ].join(" ")}
          >
            <span>
              {pushBanner.kind === "ok" ? "✅ " : "❌ "}
              {pushBanner.message}
            </span>
            <span className="flex items-center gap-3">
              {pushBanner.kind === "ok" && pushBanner.commitUrl && (
                <a
                  href={pushBanner.commitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  commit ↗
                </a>
              )}
              {pushBanner.kind === "ok" && pushBanner.actionsUrl && (
                <a
                  href={pushBanner.actionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Actions ↗
                </a>
              )}
              <button
                type="button"
                onClick={() => setPushBanner(null)}
                aria-label="Dismiss"
                className="text-ink-secondary hover:text-ink-primary"
              >
                ×
              </button>
            </span>
          </div>
        )}
        {ci.state.status !== "idle" && (
          <div
            className={[
              "mb-3 rounded-lg border px-3 py-2 text-xs",
              ci.state.status === "success"
                ? "border-primary/30 bg-teal-50 text-primary"
                : ci.state.status === "failure" ||
                    ci.state.status === "error" ||
                    ci.state.status === "not_found"
                  ? "border-status-warn/30 bg-red-50 text-status-warn"
                  : "border-accent/30 bg-orange-50 text-accent",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span>
                  {ci.state.status === "searching" && "🤖 CI: starting…"}
                  {ci.state.status === "queued" && "🤖 CI: queued"}
                  {ci.state.status === "in_progress" && "🤖 CI: building"}
                  {ci.state.status === "success" &&
                    "🤖 CI: build complete — UF2 ready"}
                  {ci.state.status === "failure" && "🤖 CI: build failed"}
                  {ci.state.status === "error" &&
                    `🤖 CI watch error — ${ci.state.error ?? "unknown"}`}
                  {ci.state.status === "not_found" &&
                    "🤖 CI: no run found for this commit"}
                </span>
                <span className="text-ink-muted">
                  {formatElapsed(ci.state.elapsedSec)}
                </span>
              </span>
              <span className="flex items-center gap-3">
                {ci.state.run && (
                  <a
                    href={ci.state.run.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Run #{ci.state.run.id} ↗
                  </a>
                )}
                {(ci.state.status === "in_progress" ||
                  ci.state.status === "queued" ||
                  ci.state.status === "searching") && (
                  <button
                    type="button"
                    onClick={ci.cancel}
                    className="text-ink-secondary underline hover:text-ink-primary"
                  >
                    Cancel
                  </button>
                )}
              </span>
            </div>
            {ci.state.status === "success" && ci.state.files.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {ci.state.files.map((f) => (
                  <li key={f.name}>
                    <a
                      href={f.blobUrl}
                      download={f.name}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary bg-primary px-2.5 py-1 text-xs font-bold text-white hover:bg-primary-hover"
                    >
                      ⬇ {f.name}
                      <span className="ml-1 font-normal text-white/70">
                        ({Math.round(f.sizeBytes / 1024)}KB)
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
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
          <div className="flex flex-wrap items-center gap-2">
            {editCount > 0 && (
              <>
                <span className={ui.chipAccent}>
                  <span className="font-bold">{editCount}</span> edited
                </span>
                <button
                  type="button"
                  onClick={resetAll}
                  className={ui.ctaSecondarySmall}
                >
                  Reset all
                </button>
              </>
            )}
            <button
              type="button"
              onClick={downloadKeymap}
              className={ui.ctaSecondarySmall}
              title="Download a regenerated .keymap with your edits applied"
            >
              ⬇ .keymap
            </button>
            <button
              type="button"
              onClick={pushKeymap}
              disabled={pushBusy}
              className={ui.ctaPrimarySmall}
              title={
                ghReady
                  ? "Push .keymap to GitHub"
                  : "Configure GitHub settings first"
              }
            >
              {pushBusy ? "Pushing…" : "⬆ Push .keymap"}
            </button>
            {editedTrackballFields.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={resetTrackballEdits}
                  className={ui.ctaSecondarySmall}
                  title="Discard trackball sensitivity edits"
                >
                  Reset trackball
                </button>
                <button
                  type="button"
                  onClick={downloadConf}
                  className={ui.ctaSecondarySmall}
                  title={`Download ${config.trackball.confFilename} with sensitivity edits applied`}
                >
                  ⬇ .conf
                </button>
                <button
                  type="button"
                  onClick={pushConf}
                  disabled={pushBusy}
                  className={ui.ctaPrimarySmall}
                  title={
                    ghReady
                      ? `Push ${config.trackball.confFilename} to GitHub`
                      : "Configure GitHub settings first"
                  }
                >
                  {pushBusy ? "Pushing…" : "⬆ Push .conf"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <section className={`${ui.card} p-6`}>
            <KeyboardView
              layout={config.layout}
              layer={layer}
              layerNames={layerNames}
              selectedPos={selectedPos}
              pressed={hid.pressed}
              pointer={hid.pointer}
              encoders={hid.encoders}
              comboSelectMode={pickingKeys}
              selectedComboKeys={
                comboEditing ? new Set(comboEditing.positions) : undefined
              }
              comboHighlightKeys={pickingKeys ? undefined : allComboPositions}
              onSelect={setSelectedPos}
              onToggleComboKey={toggleComboKey}
            />
            {pickingKeys && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-orange-50 px-3 py-2 text-xs">
                <span className="text-accent">
                  🎯 コンボ用キーを選択中 — クリックで追加/解除 (
                  {comboEditing?.positions.length ?? 0} 選択)
                </span>
                <button
                  type="button"
                  onClick={() => setPickingKeys(false)}
                  disabled={(comboEditing?.positions.length ?? 0) < 2}
                  className={ui.ctaAccent}
                >
                  Done
                </button>
              </div>
            )}
          </section>

          <aside className={ui.card}>
            {comboEditing && !pickingKeys ? (
              <ComboEditor
                initial={
                  comboEditing.mode === "edit"
                    ? (combos.find((c) => c.name === comboEditing.name) ?? null)
                    : null
                }
                keyPositions={comboEditing.positions}
                layerNames={layerNames}
                onApply={applyCombo}
                onCancel={cancelCombo}
                onPickKeys={returnToPicking}
              />
            ) : (
              <KeyDetail
                layout={config.layout}
                layer={layer}
                layerNames={layerNames}
                selectedPos={selectedPos}
                isEdited={
                  selectedPos != null &&
                  edits[layerIndex]?.[selectedPos] !== undefined
                }
                namedBehaviors={behaviors}
                onEditBinding={applyEdit}
                onResetBinding={resetEdit}
              />
            )}
          </aside>
        </div>

        <div className="mt-6">
          <CombosPanel
            combos={combos}
            layerNames={layerNames}
            layout={config.layout}
            isEditedSet={editedComboNames}
            onAdd={startNewCombo}
            onEdit={startEditCombo}
            onDelete={deleteCombo}
          />
        </div>

        <div className="mt-6">
          <BehaviorsPanel
            behaviors={behaviors}
            editedNames={editedBehaviorNames}
            onChange={setBehaviors}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TrackballPanel
            trackball={effectiveTrackball}
            layerNames={layerNames}
            edited={editedTrackballFields}
            onEdit={applyTrackballEdits}
          />
          <EncoderPanel
            encoder={config.encoder}
            sensors={config.sensors}
            sensorBindings={layer.sensorBindings}
            layerNames={layerNames}
          />
        </div>

        {hid.device && (
          <details className={`mt-6 ${ui.card}`}>
            <summary className="flex cursor-pointer items-center justify-between text-sm font-bold">
              <span>🔬 HID Debug</span>
              <span className="text-xs font-normal text-ink-secondary">
                mask 0x{hid.activeLayerMask.toString(16).padStart(8, "0")} ·
                highest bit {hidActiveLayer ?? "—"}
              </span>
            </summary>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className={`${ui.innerCard} text-xs`}>
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

              <div className={`${ui.innerCard} text-xs`}>
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

      <footer className="mx-auto max-w-6xl px-6 pb-8 pt-2 text-xs text-ink-secondary md:pb-8 pb-32">
        {hid.device
          ? "Live input monitor active · keys highlight on press · current layer auto-follows"
          : "Read-only visualizer · click Connect Keyboard to enable live input monitoring"}
      </footer>

      <MobileActionBar
        {...(pickingKeys
          ? {
              info: (
                <span className="text-accent">
                  🎯 picking · {comboEditing?.positions.length ?? 0} selected
                </span>
              ),
              primary: {
                label: "Done",
                onClick: () => setPickingKeys(false),
                disabled: (comboEditing?.positions.length ?? 0) < 2,
              },
              secondary: {
                label: "Cancel",
                onClick: cancelCombo,
              },
            }
          : {
              info: (
                <>
                  {editCount > 0 || editedComboNames.size > 0
                    ? `${editCount + editedComboNames.size} edits pending`
                    : "ready"}
                </>
              ),
              primary: ghReady
                ? {
                    label: pushBusy ? "Pushing…" : "⬆ Push .keymap",
                    onClick: pushKeymap,
                    disabled: pushBusy,
                    title: "Push regenerated .keymap to GitHub",
                  }
                : {
                    label: "⬇ .keymap",
                    onClick: downloadKeymap,
                    title:
                      "Download regenerated .keymap (configure GitHub for direct push)",
                  },
              secondary: ghReady
                ? {
                    label: "⬇",
                    onClick: downloadKeymap,
                    title: "Download instead of pushing",
                  }
                : hid.device
                  ? undefined
                  : hid.supported
                    ? {
                        label: "Connect",
                        onClick: () => void hid.connect(),
                        title: "Connect Keyboard via WebHID",
                      }
                    : undefined,
            })}
      />

      <GithubSettingsModal
        open={githubOpen}
        onClose={() => {
          setGithubOpen(false);
          setGhTick((t) => t + 1);
        }}
      />
    </div>
  );
}

function saveFile(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s.toString().padStart(2, "0")}s`;
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
