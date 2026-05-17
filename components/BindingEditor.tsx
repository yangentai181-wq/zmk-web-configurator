"use client";

import { useEffect, useState } from "react";
import type { BehaviorDef, Binding } from "@/lib/types";
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
  namedBehaviors,
  onApply,
  onCancel,
}: {
  binding: Binding;
  layerNames: string[];
  /** Custom hold-tap behaviors defined in the keymap, surfaced as
   * extra rows in the Behavior dropdown so the user can pick e.g.
   * &hm or &bspc_lt without dropping to Custom mode. */
  namedBehaviors?: BehaviorDef[];
  onApply: (next: Binding) => void;
  onCancel: () => void;
}) {
  const initialMode = inferMode(binding, namedBehaviors);
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
    setMode(inferMode(binding, namedBehaviors));
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
    // Named hold-tap mode: build a binding referencing the custom behavior
    // by its label and capture the same two args mt/lt would.
    if (mode.startsWith("named:")) {
      const name = mode.slice("named:".length);
      const def = namedBehaviors?.find((b) => b.name === name);
      if (!def) return null;
      // 2 args by default; fall back to one if the behavior wants it.
      if (def.bindingCells === 2) {
        if (!mtTap) return null;
        return makeBinding(name, [mtMod, mtTap]);
      }
      if (def.bindingCells === 1) {
        if (!keyCode) return null;
        return makeBinding(name, [keyCode]);
      }
      return makeBinding(name);
    }
    return null;
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
        {(namedBehaviors ?? [])
          .filter((b) => b.scope === "named")
          .map((b) => (
            <option key={b.name} value={`named:${b.name}`}>
              Custom Hold-Tap: &{b.name}
            </option>
          ))}
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

      {(mode === "mt" || mode.startsWith("named:")) && (
        <>
          <Field label={mode === "mt" ? "Hold modifier" : "Hold arg"}>
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

/** Editor modes. `named:<behaviorName>` is dynamic, picked when the
 * user selects a custom hold-tap from the dropdown. */
type EditorMode =
  | "kp"
  | "mo"
  | "lt"
  | "mt"
  | "tog"
  | "trans"
  | "none"
  | "custom"
  | `named:${string}`;

function inferMode(
  binding: Binding,
  namedBehaviors?: BehaviorDef[],
): EditorMode {
  const known = ["kp", "mo", "lt", "mt", "tog", "trans", "none"] as const;
  if ((known as readonly string[]).includes(binding.behavior)) {
    return binding.behavior as EditorMode;
  }
  if (namedBehaviors?.some((b) => b.name === binding.behavior)) {
    return `named:${binding.behavior}` as EditorMode;
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
