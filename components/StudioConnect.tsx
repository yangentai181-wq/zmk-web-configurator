"use client";

import type { StudioActions, StudioState } from "@/lib/use-zmk-studio";
import { ui } from "@/lib/ui";

export function StudioConnect({
  studio,
}: {
  studio: StudioState & StudioActions;
}) {
  if (!studio.supported) {
    return <div className={ui.chip}>WebSerial 非対応ブラウザ</div>;
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
          className={ui.ctaAccent}
          title="Connect to ZMK Studio over USB (live editing)"
        >
          {studio.busy ? "Connecting…" : "🔌 Studio"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={studio.unsavedChanges ? ui.chipAccent : ui.chipPrimary}>
        <span className="font-bold">●</span>
        <span className="font-bold">{studio.deviceInfo?.name ?? "Studio"}</span>
        {studio.unsavedChanges && (
          <span className="ml-1 text-ink-muted">unsaved</span>
        )}
      </div>
      {studio.unsavedChanges && (
        <>
          <button
            type="button"
            onClick={() => void studio.save()}
            disabled={studio.busy}
            className={ui.ctaPrimarySmall}
            title="Persist pending changes to flash"
          >
            💾 Save
          </button>
          <button
            type="button"
            onClick={() => void studio.discard()}
            disabled={studio.busy}
            className={ui.ctaSecondarySmall}
            title="Drop pending edits"
          >
            Discard
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => void studio.disconnect()}
        className={ui.iconButton}
        title="Disconnect"
        aria-label="Disconnect Studio"
      >
        ×
      </button>
    </div>
  );
}
