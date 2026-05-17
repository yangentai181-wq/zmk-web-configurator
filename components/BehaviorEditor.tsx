"use client";

import { useEffect, useState } from "react";
import type { BehaviorDef, HoldTapFlavor } from "@/lib/types";
import { ui } from "@/lib/ui";

/**
 * Inline editor for a single hold-tap behavior. Global behaviors (the
 * `&mt`, `&lt` overrides) only let the user tweak their hold-tap
 * params; named behaviors additionally allow renaming and changing
 * inner bindings.
 */

export type PresetId =
  | "repeat-friendly"
  | "home-row-mod"
  | "slow-careful"
  | "zmk-default";

const PRESETS: {
  id: PresetId;
  label: string;
  hint: string;
  values: Pick<
    BehaviorDef,
    "flavor" | "tappingTermMs" | "quickTapMs" | "requirePriorIdleMs"
  >;
}[] = [
  {
    id: "repeat-friendly",
    label: "Repeat-friendly",
    hint: "リピート最優先。BACKSPACE などに",
    values: {
      flavor: "tap-preferred",
      tappingTermMs: 200,
      quickTapMs: 50,
      requirePriorIdleMs: undefined,
    },
  },
  {
    id: "home-row-mod",
    label: "Home row mod",
    hint: "ホームロウmod 用 (短めtap-preferred + 直前タイピングを許容)",
    values: {
      flavor: "tap-preferred",
      tappingTermMs: 180,
      quickTapMs: undefined,
      requirePriorIdleMs: 150,
    },
  },
  {
    id: "slow-careful",
    label: "Slow & careful",
    hint: "ゆっくり押したい時用",
    values: {
      flavor: "balanced",
      tappingTermMs: 350,
      quickTapMs: 175,
      requirePriorIdleMs: 150,
    },
  },
  {
    id: "zmk-default",
    label: "ZMK default",
    hint: "ZMK 公式デフォルト",
    values: {
      flavor: "balanced",
      tappingTermMs: 280,
      quickTapMs: 175,
      requirePriorIdleMs: 150,
    },
  },
];

const FLAVORS: { id: HoldTapFlavor; label: string; hint: string }[] = [
  {
    id: "hold-preferred",
    label: "hold-preferred",
    hint: "tapping-term 経過で即 hold",
  },
  {
    id: "balanced",
    label: "balanced",
    hint: "interrupt key 解放で hold (default)",
  },
  {
    id: "tap-preferred",
    label: "tap-preferred",
    hint: "interrupt キーで hold、それ以外 tap",
  },
  {
    id: "tap-unless-interrupted",
    label: "tap-unless-interrupted",
    hint: "tapping-term 経過で tap、interrupt で hold",
  },
];

export function BehaviorEditor({
  initial,
  onApply,
  onCancel,
}: {
  initial: BehaviorDef;
  onApply: (next: BehaviorDef) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [flavor, setFlavor] = useState<HoldTapFlavor>(
    initial.flavor ?? "balanced",
  );
  const [tappingTermMs, setTappingTermMs] = useState<string>(
    initial.tappingTermMs !== undefined ? String(initial.tappingTermMs) : "280",
  );
  const [quickTapMs, setQuickTapMs] = useState<string>(
    initial.quickTapMs !== undefined ? String(initial.quickTapMs) : "",
  );
  const [requirePriorIdleMs, setRequirePriorIdleMs] = useState<string>(
    initial.requirePriorIdleMs !== undefined
      ? String(initial.requirePriorIdleMs)
      : "",
  );
  const [innerBindingsRaw, setInnerBindingsRaw] = useState<string>(
    (initial.innerBindings ?? []).map((b) => `&${b}`).join(", "),
  );

  useEffect(() => {
    setName(initial.name);
    setFlavor(initial.flavor ?? "balanced");
    setTappingTermMs(
      initial.tappingTermMs !== undefined
        ? String(initial.tappingTermMs)
        : "280",
    );
    setQuickTapMs(
      initial.quickTapMs !== undefined ? String(initial.quickTapMs) : "",
    );
    setRequirePriorIdleMs(
      initial.requirePriorIdleMs !== undefined
        ? String(initial.requirePriorIdleMs)
        : "",
    );
    setInnerBindingsRaw(
      (initial.innerBindings ?? []).map((b) => `&${b}`).join(", "),
    );
  }, [initial]);

  function applyPreset(p: (typeof PRESETS)[number]) {
    if (p.values.flavor) setFlavor(p.values.flavor);
    setTappingTermMs(
      p.values.tappingTermMs !== undefined
        ? String(p.values.tappingTermMs)
        : "",
    );
    setQuickTapMs(
      p.values.quickTapMs !== undefined ? String(p.values.quickTapMs) : "",
    );
    setRequirePriorIdleMs(
      p.values.requirePriorIdleMs !== undefined
        ? String(p.values.requirePriorIdleMs)
        : "",
    );
  }

  const tappingTermNum = numOrNull(tappingTermMs);
  const quickTapNum = numOrNull(quickTapMs);
  const priorIdleNum = numOrNull(requirePriorIdleMs);
  const tappingTermValid = tappingTermNum === null || tappingTermNum >= 0;
  const quickTapValid = quickTapNum === null || quickTapNum >= 0;
  const priorIdleValid = priorIdleNum === null || priorIdleNum >= 0;
  const nameValid = initial.scope === "global" || /^[A-Za-z_][\w]*$/.test(name);
  const formValid =
    tappingTermValid && quickTapValid && priorIdleValid && nameValid;

  function submit() {
    const innerBindings =
      initial.scope === "named" && innerBindingsRaw.trim()
        ? innerBindingsRaw
            .split(",")
            .map((s) => s.trim().replace(/^&/, ""))
            .filter(Boolean)
        : initial.innerBindings;
    onApply({
      ...initial,
      name: initial.scope === "global" ? initial.name : name.trim(),
      flavor,
      tappingTermMs: tappingTermNum ?? undefined,
      quickTapMs: quickTapNum ?? undefined,
      requirePriorIdleMs: priorIdleNum ?? undefined,
      innerBindings,
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Preset">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-ink-primary transition hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              title={p.hint}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      {initial.scope === "named" && (
        <Field
          label="Name"
          hint={
            !nameValid ? "英数字+アンダースコア、先頭は英字または _" : undefined
          }
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value.trim())}
            placeholder="hm / bspc_lt / ..."
            className={`${ui.input} font-mono`}
            aria-invalid={!nameValid}
          />
        </Field>
      )}

      <Field label="Flavor">
        <div className="space-y-1.5">
          {FLAVORS.map((f) => (
            <label
              key={f.id}
              className="flex cursor-pointer items-start gap-2 text-xs"
            >
              <input
                type="radio"
                name="ht-flavor"
                checked={flavor === f.id}
                onChange={() => setFlavor(f.id)}
                className="mt-0.5 accent-primary"
              />
              <span>
                <span className="font-mono">{f.label}</span>{" "}
                <span className="text-ink-muted">— {f.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Field>

      <Field
        label="tapping-term-ms (ホールド判定までの時間)"
        hint={!tappingTermValid ? "0 以上" : undefined}
      >
        <div className="flex gap-2">
          <input
            type="range"
            min={50}
            max={500}
            step={10}
            value={tappingTermNum ?? 280}
            onChange={(e) => setTappingTermMs(e.target.value)}
            className="flex-1"
          />
          <input
            value={tappingTermMs}
            onChange={(e) => setTappingTermMs(e.target.value.trim())}
            inputMode="numeric"
            className={`${ui.input} w-24`}
            aria-invalid={!tappingTermValid}
          />
        </div>
      </Field>

      <Field
        label="quick-tap-ms (リピート優先窓口、空欄=未設定)"
        hint={!quickTapValid ? "0 以上または空欄" : undefined}
      >
        <input
          value={quickTapMs}
          onChange={(e) => setQuickTapMs(e.target.value.trim())}
          placeholder="例: 50"
          inputMode="numeric"
          className={ui.input}
          aria-invalid={!quickTapValid}
        />
      </Field>

      <Field
        label="require-prior-idle-ms (直前のキー入力後の待ち、空欄=未設定)"
        hint={!priorIdleValid ? "0 以上または空欄" : undefined}
      >
        <input
          value={requirePriorIdleMs}
          onChange={(e) => setRequirePriorIdleMs(e.target.value.trim())}
          placeholder="例: 150"
          inputMode="numeric"
          className={ui.input}
          aria-invalid={!priorIdleValid}
        />
      </Field>

      {initial.scope === "named" && (
        <Field label="Inner bindings (raw, comma separated)">
          <input
            value={innerBindingsRaw}
            onChange={(e) => setInnerBindingsRaw(e.target.value)}
            placeholder="&kp, &mo"
            className={`${ui.input} font-mono`}
          />
        </Field>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={submit}
          disabled={!formValid}
          className={`${ui.ctaPrimary} flex-1`}
        >
          {initial.scope === "global" ? "Apply" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className={ui.ctaSecondary}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={ui.fieldLabel}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-status-warn">{hint}</p>}
    </div>
  );
}

function numOrNull(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Sensible default for a freshly-created named behavior. */
export function newNamedBehavior(name: string): BehaviorDef {
  return {
    name,
    scope: "named",
    compatible: "zmk,behavior-hold-tap",
    bindingCells: 2,
    flavor: "tap-preferred",
    tappingTermMs: 200,
    quickTapMs: 50,
    innerBindings: ["kp", "kp"],
  };
}
