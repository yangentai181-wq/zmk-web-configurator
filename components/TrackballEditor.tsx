"use client";

import { useState } from "react";
import type { TrackballConfig } from "@/lib/types";
import { UI } from "@/lib/labels";
import { ui } from "@/lib/ui";

/**
 * Sensitivity / behavior editor for a PMW3610 trackball. The shape
 * intentionally mirrors the typed fields on TrackballConfig so the
 * caller can splat the result onto its overlay state without having
 * to translate keys.
 *
 * Required props are kept minimal: pass the original parsed
 * TrackballConfig as `initial` (so unedited values populate the
 * form), then receive a partial back on Apply containing only the
 * fields the user actually touched. Untouched fields are omitted so
 * the .conf re-emitter can leave the corresponding lines alone.
 */
export type TrackballEdits = Partial<
  Pick<
    TrackballConfig,
    | "cpi"
    | "cpiDividor"
    | "scrollTick"
    | "automouseTimeoutMs"
    | "invertX"
    | "invertY"
    | "invertScrollX"
    | "smartAlgorithm"
    | "pollingRate"
  >
>;

export function TrackballEditor({
  initial,
  onApply,
  onCancel,
}: {
  initial: TrackballConfig;
  onApply: (next: TrackballEdits) => void;
  onCancel: () => void;
}) {
  // Track every field as a string so we can let the user clear an
  // input mid-edit. Empty string = "use the original / unchanged".
  const [cpi, setCpi] = useState(toStr(initial.cpi));
  const [cpiDividor, setCpiDividor] = useState(toStr(initial.cpiDividor));
  const [scrollTick, setScrollTick] = useState(toStr(initial.scrollTick));
  const [automouseTimeoutMs, setAutomouseTimeoutMs] = useState(
    toStr(initial.automouseTimeoutMs),
  );
  const [invertX, setInvertX] = useState(!!initial.invertX);
  const [invertY, setInvertY] = useState(!!initial.invertY);
  const [invertScrollX, setInvertScrollX] = useState(!!initial.invertScrollX);
  const [smartAlgorithm, setSmartAlgorithm] = useState(
    initial.smartAlgorithm ?? true,
  );
  const [pollingRate, setPollingRate] = useState<125 | 250>(
    initial.pollingRate ?? 250,
  );

  const cpiNum = numOrNull(cpi);
  const cpiDividorNum = numOrNull(cpiDividor);
  const scrollTickNum = numOrNull(scrollTick);
  const automouseTimeoutNum = numOrNull(automouseTimeoutMs);

  const cpiValid =
    cpi === "" ||
    (cpiNum !== null && cpiNum >= 200 && cpiNum <= 3200 && cpiNum % 200 === 0);
  const cpiDividorValid =
    cpiDividor === "" ||
    (cpiDividorNum !== null && cpiDividorNum >= 1 && cpiDividorNum <= 100);
  const scrollTickValid =
    scrollTick === "" ||
    (scrollTickNum !== null && scrollTickNum >= 1 && scrollTickNum <= 255);
  const automouseValid =
    automouseTimeoutMs === "" ||
    (automouseTimeoutNum !== null && automouseTimeoutNum >= 0);

  const formValid =
    cpiValid && cpiDividorValid && scrollTickValid && automouseValid;

  function submit() {
    const edits: TrackballEdits = {};
    if (cpiNum !== null && cpiNum !== initial.cpi) edits.cpi = cpiNum;
    if (cpiDividorNum !== null && cpiDividorNum !== initial.cpiDividor)
      edits.cpiDividor = cpiDividorNum;
    if (scrollTickNum !== null && scrollTickNum !== initial.scrollTick)
      edits.scrollTick = scrollTickNum;
    if (
      automouseTimeoutNum !== null &&
      automouseTimeoutNum !== initial.automouseTimeoutMs
    )
      edits.automouseTimeoutMs = automouseTimeoutNum;
    if (invertX !== !!initial.invertX) edits.invertX = invertX;
    if (invertY !== !!initial.invertY) edits.invertY = invertY;
    if (invertScrollX !== !!initial.invertScrollX)
      edits.invertScrollX = invertScrollX;
    if (smartAlgorithm !== (initial.smartAlgorithm ?? true))
      edits.smartAlgorithm = smartAlgorithm;
    if (pollingRate !== (initial.pollingRate ?? 250))
      edits.pollingRate = pollingRate;
    onApply(edits);
  }

  return (
    <div className="space-y-3">
      <Field
        label={`CPI（感度） — 200〜3200、200刻み`}
        hint={!cpiValid ? "200〜3200 の 200刻みで指定" : undefined}
      >
        <div className="flex gap-2">
          <input
            type="range"
            min={200}
            max={3200}
            step={200}
            value={Number.isFinite(cpiNum) ? (cpiNum as number) : 800}
            onChange={(e) => setCpi(e.target.value)}
            className="flex-1"
          />
          <input
            value={cpi}
            onChange={(e) => setCpi(e.target.value.trim())}
            inputMode="numeric"
            className={`${ui.input} w-24`}
            aria-invalid={!cpiValid}
          />
        </div>
      </Field>

      <Field
        label="CPI 微調整（dividor）"
        hint={!cpiDividorValid ? "1〜100" : undefined}
      >
        <input
          value={cpiDividor}
          onChange={(e) => setCpiDividor(e.target.value.trim())}
          inputMode="numeric"
          className={ui.input}
          aria-invalid={!cpiDividorValid}
        />
      </Field>

      <Field
        label="スクロール間隔"
        hint={!scrollTickValid ? "1〜255" : undefined}
      >
        <input
          value={scrollTick}
          onChange={(e) => setScrollTick(e.target.value.trim())}
          inputMode="numeric"
          className={ui.input}
          aria-invalid={!scrollTickValid}
        />
      </Field>

      <Field
        label="オートマウス解除時間 (ms)"
        hint={!automouseValid ? "0以上" : undefined}
      >
        <input
          value={automouseTimeoutMs}
          onChange={(e) => setAutomouseTimeoutMs(e.target.value.trim())}
          inputMode="numeric"
          className={ui.input}
          aria-invalid={!automouseValid}
        />
      </Field>

      <Field label="ポーリングレート">
        <div className="flex gap-2">
          {[125, 250].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setPollingRate(rate as 125 | 250)}
              className={[
                "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                pollingRate === rate
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card text-ink-primary hover:bg-canvas",
              ].join(" ")}
            >
              {rate} Hz
            </button>
          ))}
        </div>
      </Field>

      <Field label="軸とアルゴリズム">
        <div className="space-y-1.5">
          <Toggle
            label="X軸を反転（カーソル左右）"
            checked={invertX}
            onChange={setInvertX}
          />
          <Toggle label="Y軸を反転" checked={invertY} onChange={setInvertY} />
          <Toggle
            label="スクロールX軸を反転"
            checked={invertScrollX}
            onChange={setInvertScrollX}
          />
          <Toggle
            label="スマートアルゴリズム（表面適応）"
            checked={smartAlgorithm}
            onChange={setSmartAlgorithm}
          />
        </div>
      </Field>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={submit}
          disabled={!formValid}
          className={`${ui.ctaPrimary} flex-1`}
        >
          {UI.apply}
        </button>
        <button type="button" onClick={onCancel} className={ui.ctaSecondary}>
          {UI.cancel}
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      <span>{label}</span>
    </label>
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

function toStr(v: number | undefined): string {
  return v === undefined ? "" : String(v);
}

function numOrNull(s: string): number | null {
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
