"use client";

import type { HidActions, HidState } from "@/lib/use-webhid";

export function HidConnect({ hid }: { hid: HidState & HidActions }) {
  const ago = hid.lastEventAt
    ? Math.max(0, Math.floor((Date.now() - hid.lastEventAt) / 1000))
    : null;

  if (!hid.supported) {
    return (
      <div className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-ink-secondary">
        WebHID 非対応ブラウザ
      </div>
    );
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
          className="rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Connect Keyboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg border border-primary/30 bg-teal-50 px-3 py-1.5 text-xs text-primary">
        <span className="font-bold">●</span>{" "}
        <span className="font-bold">{hid.device.productName || "ZMK"}</span>
        {ago !== null && (
          <span className="ml-2 text-ink-muted">
            {ago < 2 ? "live" : `${ago}s ago`}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => void hid.disconnect()}
        className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-ink-secondary transition hover:bg-canvas"
        title="Disconnect"
      >
        ×
      </button>
    </div>
  );
}
