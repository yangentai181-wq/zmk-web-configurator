"use client";

import { useEffect, useState } from "react";
import type { ComboDef } from "@/lib/types";
import { parseRawBinding } from "@/lib/keymap-generator";
import { UI } from "@/lib/labels";
import { ui } from "@/lib/ui";

/**
 * Form for creating or editing a single combo. key-positions is set
 * externally (from board multi-select) and shown read-only inside the
 * form; clicking "Pick keys" returns the caller back to selection
 * mode.
 *
 * The `bindings` is treated as a raw string so users can input
 * anything ZMK accepts (kp / mkp / bt / macro …). We piggyback on
 * BindingEditor when the string parses to a single behavior, falling
 * back to a raw text input otherwise.
 */
export function ComboEditor({
  initial,
  keyPositions,
  layerNames,
  onApply,
  onCancel,
  onPickKeys,
}: {
  /** Editing an existing combo → its prior values. New combo → undefined. */
  initial: ComboDef | null;
  /** Current key-positions (from board selection). */
  keyPositions: number[];
  layerNames: string[];
  onApply: (combo: ComboDef) => void;
  onCancel: () => void;
  onPickKeys: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? defaultName(keyPositions));
  const [bindingsRaw, setBindingsRaw] = useState(
    initial?.bindings ?? "&kp ESC",
  );
  const [timeoutMs, setTimeoutMs] = useState<string>(
    initial?.timeoutMs !== undefined ? String(initial.timeoutMs) : "50",
  );
  const [requirePriorIdleMs, setRequirePriorIdleMs] = useState<string>(
    initial?.requirePriorIdleMs !== undefined
      ? String(initial.requirePriorIdleMs)
      : "",
  );
  const [slowRelease, setSlowRelease] = useState(initial?.slowRelease ?? false);
  const [layerMode, setLayerMode] = useState<"all" | "specific">(
    initial?.layers && initial.layers.length > 0 ? "specific" : "all",
  );
  const [selectedLayers, setSelectedLayers] = useState<Set<number>>(
    new Set(initial?.layers ?? []),
  );

  // If the user re-picks keys mid-edit and never touched the name, keep
  // the default in sync. Heuristic: name still matches default pattern.
  useEffect(() => {
    setName((prev) =>
      prev === defaultName(initial?.keyPositions ?? []) || prev === ""
        ? defaultName(keyPositions)
        : prev,
    );
    // We intentionally don't depend on `name` to avoid infinite loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyPositions.join(",")]);

  const nameValid = /^[A-Za-z_][\w]*$/.test(name);
  const positionsValid = keyPositions.length >= 2;
  const bindingsValid = bindingsRaw.trim().length > 0;
  const timeoutValid = /^\d+$/.test(timeoutMs);
  const priorIdleValid =
    requirePriorIdleMs === "" || /^\d+$/.test(requirePriorIdleMs);

  const formValid =
    nameValid &&
    positionsValid &&
    bindingsValid &&
    timeoutValid &&
    priorIdleValid;

  function toggleLayer(idx: number) {
    setSelectedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function buildCombo(): ComboDef {
    const layers =
      layerMode === "specific" && selectedLayers.size > 0
        ? Array.from(selectedLayers).sort((a, b) => a - b)
        : undefined;
    return {
      name: name.trim(),
      keyPositions: [...keyPositions].sort((a, b) => a - b),
      bindings: bindingsRaw.trim(),
      timeoutMs: Number(timeoutMs),
      layers,
      requirePriorIdleMs:
        requirePriorIdleMs !== "" ? Number(requirePriorIdleMs) : undefined,
      slowRelease: slowRelease || undefined,
    };
  }

  // Show inline preview of the bindings as parsed (helps catch typos).
  const previewBinding = parseRawBinding(bindingsRaw);

  return (
    <div className="space-y-3">
      <Field label="名前">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="combo_jk"
          className={`${inputClass} font-mono`}
          aria-invalid={!nameValid}
        />
        {!nameValid && (
          <p className="mt-1 text-[10px] text-status-warn">
            英数字とアンダースコアのみ、先頭は英字または _
          </p>
        )}
      </Field>

      <Field label="キー位置">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-1 rounded-lg border border-border bg-canvas px-2 py-1.5 text-xs">
            {keyPositions.length === 0 ? (
              <span className="text-ink-secondary">未選択 (2つ以上必要)</span>
            ) : (
              keyPositions.map((p) => (
                <span
                  key={p}
                  className="rounded border border-border bg-white px-1.5 py-0.5 font-mono text-[10px]"
                >
                  {p}
                </span>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={onPickKeys}
            className={ui.ctaPrimarySmall}
          >
            キーを選択
          </button>
        </div>
        {!positionsValid && (
          <p className="mt-1 text-[10px] text-status-warn">
            コンボには2つ以上のキーが必要です
          </p>
        )}
      </Field>

      <Field label="動作 (raw)">
        <input
          value={bindingsRaw}
          onChange={(e) => setBindingsRaw(e.target.value)}
          placeholder="&kp ESC"
          className={`${inputClass} font-mono`}
        />
        {previewBinding && (
          <p className="mt-1 text-[10px] text-ink-secondary">
            {UI.preview}:{" "}
            <code className="font-mono">{previewBinding.raw}</code>
          </p>
        )}
      </Field>

      <Field label="タイムアウト (ms)">
        <input
          value={timeoutMs}
          onChange={(e) => setTimeoutMs(e.target.value)}
          inputMode="numeric"
          className={inputClass}
          aria-invalid={!timeoutValid}
        />
      </Field>

      <Field label="直前無入力時間 (ms)（任意）">
        <input
          value={requirePriorIdleMs}
          onChange={(e) => setRequirePriorIdleMs(e.target.value)}
          inputMode="numeric"
          placeholder=""
          className={inputClass}
          aria-invalid={!priorIdleValid}
        />
      </Field>

      <Field label="有効なレイヤ">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="radio"
              name="combo-layer-mode"
              checked={layerMode === "all"}
              onChange={() => setLayerMode("all")}
            />
            <span>すべてのレイヤ</span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="radio"
              name="combo-layer-mode"
              checked={layerMode === "specific"}
              onChange={() => setLayerMode("specific")}
            />
            <span>特定のレイヤ</span>
          </label>
          {layerMode === "specific" && (
            <div className="flex flex-wrap gap-1.5">
              {layerNames.map((label, idx) => {
                const on = selectedLayers.has(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleLayer(idx)}
                    className={[
                      "inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      on
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-card text-ink-primary hover:bg-canvas",
                    ].join(" ")}
                  >
                    L{idx} {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Field>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={slowRelease}
          onChange={(e) => setSlowRelease(e.target.checked)}
        />
        <span>slow-release</span>
      </label>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => onApply(buildCombo())}
          disabled={!formValid}
          className={`${ui.ctaPrimary} flex-1`}
        >
          {initial ? UI.save : UI.add}
        </button>
        <button type="button" onClick={onCancel} className={ui.ctaSecondary}>
          {UI.cancel}
        </button>
      </div>
    </div>
  );
}

function defaultName(positions: number[]): string {
  if (positions.length === 0) return "combo_new";
  return `combo_${[...positions].sort((a, b) => a - b).join("_")}`;
}

const inputClass = ui.input;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={ui.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}
