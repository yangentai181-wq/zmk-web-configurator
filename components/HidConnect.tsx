"use client";

import type { HidActions, HidState } from "@/lib/use-webhid";
import { ui } from "@/lib/ui";
import { UI } from "@/lib/labels";

export function HidConnect({ hid }: { hid: HidState & HidActions }) {
  const ago = hid.lastEventAt
    ? Math.max(0, Math.floor((Date.now() - hid.lastEventAt) / 1000))
    : null;

  if (!hid.supported) {
    return <div className={ui.chip}>WebHID 非対応ブラウザ</div>;
  }

  if (!hid.device) {
    return (
      <div className="flex items-center gap-2">
        {hid.error && (
          <span className="text-xs text-status-warn">{hid.error}</span>
        )}
        <button
          type="button"
          onClick={() => void hid.connect()}
          className={ui.ctaPrimarySmall}
        >
          キーボードに接続
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className={ui.chipPrimary}>
        <span className="font-bold">●</span>
        <span className="font-bold">{hid.device.productName || "ZMK"}</span>
        {ago !== null && (
          <span className="ml-1 text-ink-muted">
            {ago < 2 ? "ライブ" : `${ago}秒前`}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => void hid.disconnect()}
        className={ui.iconButton}
        title={UI.disconnect}
        aria-label="HIDを切断"
      >
        ×
      </button>
    </div>
  );
}
