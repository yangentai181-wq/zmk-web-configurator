"use client";

import { useState } from "react";
import type { TrackballConfig } from "@/lib/types";
import { UI } from "@/lib/labels";
import { ui } from "@/lib/ui";
import { TrackballEditor, type TrackballEdits } from "./TrackballEditor";

export function TrackballPanel({
  trackball,
  layerNames,
  edited,
  onEdit,
}: {
  trackball: TrackballConfig;
  layerNames: string[];
  /** Names of fields that differ from the original parsed values. */
  edited?: ReadonlySet<string>;
  /** Receives the partial set of fields the user actually changed. */
  onEdit?: (edits: TrackballEdits) => void;
}) {
  const [editing, setEditing] = useState(false);
  const isEdited = edited && edited.size > 0;

  return (
    <section className={ui.card}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">
          🟢 トラックボール
          {isEdited && (
            <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
              編集済
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={[
              "rounded-full px-2 py-0.5 text-xs",
              trackball.enabled
                ? "bg-teal-50 text-primary"
                : "bg-slate-100 text-ink-secondary",
            ].join(" ")}
          >
            {trackball.driver} · {trackball.enabled ? "有効" : "無効"}
          </span>
          {onEdit && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={ui.ctaPrimarySmall}
            >
              {UI.edit}
            </button>
          )}
        </div>
      </div>

      {editing && onEdit ? (
        <div className="mt-4 rounded-lg border border-primary/30 bg-canvas p-3">
          <TrackballEditor
            initial={trackball}
            onApply={(next) => {
              onEdit(next);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Stat
              label="スクロールレイヤ"
              value={
                trackball.scrollLayer != null
                  ? `L${trackball.scrollLayer} ${layerNames[trackball.scrollLayer] ?? ""}`
                  : "—"
              }
            />
            <Stat
              label="オートマウスレイヤ"
              value={
                trackball.automouseLayer != null
                  ? `L${trackball.automouseLayer} ${layerNames[trackball.automouseLayer] ?? ""}`
                  : "—"
              }
            />
            <Stat
              label="CPI（感度）"
              value={trackball.cpi !== undefined ? String(trackball.cpi) : "—"}
              highlighted={edited?.has("cpi")}
            />
            <Stat
              label="CPI 微調整"
              value={
                trackball.cpiDividor !== undefined
                  ? String(trackball.cpiDividor)
                  : "—"
              }
              highlighted={edited?.has("cpiDividor")}
            />
            <Stat
              label="スクロール間隔"
              value={
                trackball.scrollTick !== undefined
                  ? String(trackball.scrollTick)
                  : "—"
              }
              highlighted={edited?.has("scrollTick")}
            />
            <Stat
              label="オートマウス解除時間"
              value={
                trackball.automouseTimeoutMs !== undefined
                  ? `${trackball.automouseTimeoutMs} ms`
                  : "—"
              }
              highlighted={edited?.has("automouseTimeoutMs")}
            />
            <Stat
              label="ポーリングレート"
              value={
                trackball.pollingRate !== undefined
                  ? `${trackball.pollingRate} Hz`
                  : "—"
              }
              highlighted={edited?.has("pollingRate")}
            />
            <Stat
              label="スマートアルゴリズム"
              value={trackball.smartAlgorithm ? "オン" : "オフ"}
              highlighted={edited?.has("smartAlgorithm")}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Flag
              label="X軸 反転"
              on={!!trackball.invertX}
              highlighted={edited?.has("invertX")}
            />
            <Flag
              label="Y軸 反転"
              on={!!trackball.invertY}
              highlighted={edited?.has("invertY")}
            />
            <Flag
              label="スクロールX 反転"
              on={!!trackball.invertScrollX}
              highlighted={edited?.has("invertScrollX")}
            />
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-ink-secondary hover:text-ink-primary">
              元の設定 ({trackball.settings.length} 件)
            </summary>
            <ul className="mt-2 space-y-1 text-xs">
              {trackball.settings.map((s) => (
                <li
                  key={s.key}
                  className="flex justify-between gap-3 border-b border-border/60 py-1"
                >
                  <span className="text-ink-secondary">{s.key}</span>
                  <span className="font-medium">{s.value}</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  highlighted,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg border bg-canvas p-3",
        highlighted ? "border-accent" : "border-border",
      ].join(" ")}
    >
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">
        {label}
      </div>
      <div className="mt-1 font-medium">
        {value}
        {highlighted && (
          <span className="ml-2 text-[10px] uppercase tracking-widest text-accent">
            編集済
          </span>
        )}
      </div>
    </div>
  );
}

function Flag({
  label,
  on,
  highlighted,
}: {
  label: string;
  on: boolean;
  highlighted?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        highlighted
          ? "border-accent text-accent"
          : on
            ? "border-primary/30 bg-teal-50 text-primary"
            : "border-border bg-canvas text-ink-secondary",
      ].join(" ")}
    >
      <span className="font-bold">{on ? "●" : "○"}</span>
      <span>{label}</span>
    </span>
  );
}
