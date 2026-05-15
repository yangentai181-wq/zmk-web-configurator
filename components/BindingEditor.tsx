"use client";

import { useEffect, useState } from "react";
import type { Binding } from "@/lib/types";
import { makeBinding, parseRawBinding } from "@/lib/keymap-generator";
import { ui } from "@/lib/ui";

/**
 * Edits a single Binding. The set of behaviors covered by the form is
 * intentionally small (kp / mo / lt / mt / tog / trans / none). For
 * anything else (mkp, bt, sys_reset, bootloader, custom hold-tap, etc.)
 * the user falls through to the `custom` mode which lets them type
 * `&behavior arg1 arg2` directly.
 */
export function BindingEditor({
  binding,
  layerNames,
  onApply,
  onCancel,
}: {
  binding: Binding;
  layerNames: string[];
  onApply: (next: Binding) => void;
  onCancel: () => void;
}) {
  const initialMode = inferMode(binding);
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [keyCode, setKeyCode] = useState<string>(
    initialMode === "kp" ? (binding.params[0] ?? "") : "",
  );
  const [layerIdx, setLayerIdx] = useState<string>(
    initialMode === "mo" || initialMode === "tog"
      ? (binding.params[0] ?? "0")
      : initialMode === "lt"
        ? (binding.params[0] ?? "0")
        : "0",
  );
  const [ltTap, setLtTap] = useState<string>(
    initialMode === "lt" ? (binding.params[1] ?? "") : "",
  );
  const [mtMod, setMtMod] = useState<string>(
    initialMode === "mt" ? (binding.params[0] ?? "LSHIFT") : "LSHIFT",
  );
  const [mtTap, setMtTap] = useState<string>(
    initialMode === "mt" ? (binding.params[1] ?? "") : "",
  );
  const [customText, setCustomText] = useState<string>(binding.raw);

  // Reset form when the selected key changes underneath us.
  useEffect(() => {
    setMode(inferMode(binding));
    setKeyCode(binding.behavior === "kp" ? (binding.params[0] ?? "") : "");
    setLayerIdx(
      binding.behavior === "mo" ||
        binding.behavior === "tog" ||
        binding.behavior === "lt"
        ? (binding.params[0] ?? "0")
        : "0",
    );
    setLtTap(binding.behavior === "lt" ? (binding.params[1] ?? "") : "");
    setMtMod(
      binding.behavior === "mt" ? (binding.params[0] ?? "LSHIFT") : "LSHIFT",
    );
    setMtTap(binding.behavior === "mt" ? (binding.params[1] ?? "") : "");
    setCustomText(binding.raw);
  }, [binding]);

  function buildBinding(): Binding | null {
    switch (mode) {
      case "kp":
        return keyCode ? makeBinding("kp", [keyCode]) : null;
      case "mo":
        return makeBinding("mo", [layerIdx]);
      case "tog":
        return makeBinding("tog", [layerIdx]);
      case "lt":
        return ltTap ? makeBinding("lt", [layerIdx, ltTap]) : null;
      case "mt":
        return mtTap ? makeBinding("mt", [mtMod, mtTap]) : null;
      case "trans":
        return makeBinding("trans");
      case "none":
        return makeBinding("none");
      case "custom": {
        return parseRawBinding(customText);
      }
    }
  }

  const next = buildBinding();
  const isValid = next !== null;
  const preview = next?.raw ?? "(invalid)";

  return (
    <div className="space-y-3">
      <label className={ui.fieldLabel}>Behavior</label>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as EditorMode)}
        className={ui.input}
      >
        <option value="kp">Key (kp)</option>
        <option value="mo">Layer Hold (mo)</option>
        <option value="lt">Layer-Tap (lt)</option>
        <option value="mt">Mod-Tap (mt)</option>
        <option value="tog">Toggle Layer (tog)</option>
        <option value="trans">Transparent (trans)</option>
        <option value="none">None (none)</option>
        <option value="custom">Custom…</option>
      </select>

      {mode === "kp" && (
        <Field label="Key code">
          <input
            value={keyCode}
            onChange={(e) => setKeyCode(e.target.value.trim())}
            placeholder="A / N1 / LSHIFT / C_VOLUME_UP / LC(LS(TAB))"
            className={inputClass}
          />
        </Field>
      )}

      {(mode === "mo" || mode === "tog") && (
        <Field label="Target layer">
          <LayerSelect
            value={layerIdx}
            onChange={setLayerIdx}
            layerNames={layerNames}
          />
        </Field>
      )}

      {mode === "lt" && (
        <>
          <Field label="Hold layer">
            <LayerSelect
              value={layerIdx}
              onChange={setLayerIdx}
              layerNames={layerNames}
            />
          </Field>
          <Field label="Tap key">
            <input
              value={ltTap}
              onChange={(e) => setLtTap(e.target.value.trim())}
              placeholder="SPACE / TAB / A"
              className={inputClass}
            />
          </Field>
        </>
      )}

      {mode === "mt" && (
        <>
          <Field label="Hold modifier">
            <select
              value={mtMod}
              onChange={(e) => setMtMod(e.target.value)}
              className={inputClass}
            >
              {[
                "LSHIFT",
                "LCTRL",
                "LALT",
                "LCMD",
                "RSHIFT",
                "RCTRL",
                "RALT",
                "RCMD",
              ].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tap key">
            <input
              value={mtTap}
              onChange={(e) => setMtTap(e.target.value.trim())}
              placeholder="A / SPACE / ENTER"
              className={inputClass}
            />
          </Field>
        </>
      )}

      {mode === "custom" && (
        <Field label="Raw binding (start with &)">
          <input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="&bt BT_SEL 0"
            className={`${inputClass} font-mono`}
          />
        </Field>
      )}

      <div className={`${ui.innerCard} text-xs`}>
        <div className={ui.microLabel}>Preview</div>
        <code className="mt-1 block break-all font-mono">{preview}</code>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => next && onApply(next)}
          disabled={!isValid}
          className={`${ui.ctaPrimary} flex-1`}
        >
          Apply
        </button>
        <button type="button" onClick={onCancel} className={ui.ctaSecondary}>
          Cancel
        </button>
      </div>
    </div>
  );
}

type EditorMode =
  | "kp"
  | "mo"
  | "lt"
  | "mt"
  | "tog"
  | "trans"
  | "none"
  | "custom";

function inferMode(binding: Binding): EditorMode {
  const known: EditorMode[] = ["kp", "mo", "lt", "mt", "tog", "trans", "none"];
  if (known.includes(binding.behavior as EditorMode)) {
    return binding.behavior as EditorMode;
  }
  return "custom";
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

function LayerSelect({
  value,
  onChange,
  layerNames,
}: {
  value: string;
  onChange: (v: string) => void;
  layerNames: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    >
      {layerNames.map((name, idx) => (
        <option key={idx} value={String(idx)}>
          L{idx} {name}
        </option>
      ))}
    </select>
  );
}
