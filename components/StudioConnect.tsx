"use client";

import type { StudioActions, StudioState } from "@/lib/use-zmk-studio";
import { ui } from "@/lib/ui";
import { UI } from "@/lib/labels";

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
          title="USB経由でZMK Studioに接続（ライブ編集）"
        >
          {studio.busy ? "接続中…" : `🔌 ${UI.studio}`}
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
          <span className="ml-1 text-ink-muted">{UI.unsavedChanges}</span>
        )}
      </div>
      {studio.unsavedChanges && (
        <>
          <button
            type="button"
            onClick={() => void studio.save()}
            disabled={studio.busy}
            className={ui.ctaPrimarySmall}
            title="未保存の変更をフラッシュに書き込む"
          >
            💾 {UI.save}
          </button>
          <button
            type="button"
            onClick={() => void studio.discard()}
            disabled={studio.busy}
            className={ui.ctaSecondarySmall}
            title="未保存の編集を破棄する"
          >
            破棄
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => void studio.disconnect()}
        className={ui.iconButton}
        title={UI.disconnect}
        aria-label="Studioを切断"
      >
        ×
      </button>
    </div>
  );
}
