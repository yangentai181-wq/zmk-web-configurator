"use client";

import type { StudioActions, StudioState } from "@/lib/use-zmk-studio";

export function StudioConnect({
  studio,
}: {
  studio: StudioState & StudioActions;
}) {
  if (!studio.supported) {
    return (
      <div className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-ink-secondary">
        WebSerial 非対応ブラウザ
      </div>
    );
  }

  if (!studio.connected) {
    return (
      <div className="flex items-center gap-2">
        {studio.error && (
          <span className="text-xs text-status-warn" title={studio.error}>
            {studio.error.slice(0, 40)}
          </span>
        )}
        <button
          type="button"
          onClick={() => void studio.connect()}
          disabled={studio.busy}
          className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40"
          title="Connect to ZMK Studio over USB (live editing)"
        >
          {studio.busy ? "Connecting…" : "🔌 Studio"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={[
          "rounded-lg border px-3 py-1.5 text-xs",
          studio.unsavedChanges
            ? "border-accent/30 bg-orange-50 text-accent"
            : "border-primary/30 bg-teal-50 text-primary",
        ].join(" ")}
      >
        <span className="font-bold">●</span>{" "}
        <span className="font-bold">{studio.deviceInfo?.name ?? "Studio"}</span>
        {studio.unsavedChanges && (
          <span className="ml-2 text-ink-muted">unsaved</span>
        )}
      </div>
      {studio.unsavedChanges && (
        <>
          <button
            type="button"
            onClick={() => void studio.save()}
            disabled={studio.busy}
            className="rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-hover disabled:opacity-40"
            title="Persist pending changes to flash"
          >
            💾 Save
          </button>
          <button
            type="button"
            onClick={() => void studio.discard()}
            disabled={studio.busy}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-ink-secondary hover:bg-canvas"
            title="Drop pending edits"
          >
            Discard
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => void studio.disconnect()}
        className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-ink-secondary hover:bg-canvas"
        title="Disconnect"
      >
        ×
      </button>
    </div>
  );
}
