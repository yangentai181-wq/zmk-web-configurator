"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const RAW_HID_USAGE_PAGE = 0xff60;
const RAW_HID_USAGE = 0x61;
const KEY_PACKET_MARKER = 0xf1;
const LAYER_PACKET_MARKER = 0xff;
const POINTER_PACKET_MARKER = 0xf2;
const ENCODER_PACKET_MARKER = 0xf3;

type HIDCollection = { usagePage: number; usage: number };
type HIDInputReportEvent = Event & {
  device: HIDDeviceLike;
  reportId: number;
  data: DataView;
};
type HIDDeviceLike = EventTarget & {
  productName: string;
  vendorId: number;
  productId: number;
  opened: boolean;
  collections: ReadonlyArray<HIDCollection>;
  open(): Promise<void>;
  close(): Promise<void>;
};
type HIDLike = {
  requestDevice(options: {
    filters: Array<{
      vendorId?: number;
      productId?: number;
      usagePage?: number;
      usage?: number;
    }>;
  }): Promise<HIDDeviceLike[]>;
  getDevices(): Promise<HIDDeviceLike[]>;
};

function getHid(): HIDLike | null {
  if (typeof navigator === "undefined") return null;
  const hid = (navigator as unknown as { hid?: HIDLike }).hid;
  return hid ?? null;
}

export type HidDebugFrame = {
  at: number;
  reportId: number;
  bytes: number[];
};

export type PointerSample = {
  dx: number;
  dy: number;
  wheel: number;
  hwheel: number;
  buttons: number;
  at: number;
};

export type EncoderSample = {
  delta: number;
  at: number;
};

export type HidState = {
  supported: boolean;
  device: HIDDeviceLike | null;
  pressed: ReadonlySet<number>;
  activeLayerMask: number;
  defaultLayerState: number;
  pointer: PointerSample | null;
  encoders: Readonly<Record<number, EncoderSample>>;
  lastEventAt: number | null;
  error: string | null;
  recentNonKeyFrames: HidDebugFrame[];
};

export type HidActions = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

function readInt16LE(data: DataView, offset: number): number {
  return data.getInt16(offset, true);
}

export function useWebHidKeyboard(): HidState & HidActions {
  const [device, setDevice] = useState<HIDDeviceLike | null>(null);
  const [pressed, setPressed] = useState<ReadonlySet<number>>(() => new Set());
  const [activeLayerMask, setActiveLayerMask] = useState<number>(0);
  const [defaultLayerState, setDefaultLayerState] = useState<number>(1);
  const [pointer, setPointer] = useState<PointerSample | null>(null);
  const [encoders, setEncoders] = useState<Record<number, EncoderSample>>({});
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentNonKeyFrames, setRecentNonKeyFrames] = useState<HidDebugFrame[]>(
    [],
  );
  const listenerRef = useRef<EventListener | null>(null);

  const supported = !!getHid();

  const handleReport = useCallback((event: HIDInputReportEvent) => {
    const data = event.data;
    if (data.byteLength < 4) return;
    const marker = data.getUint8(0);
    const now = Date.now();

    if (marker === KEY_PACKET_MARKER) {
      const position = data.getUint8(2);
      const isPressed = data.getUint8(3) === 1;
      setPressed((prev) => {
        const next = new Set(prev);
        if (isPressed) next.add(position);
        else next.delete(position);
        return next;
      });
      setLastEventAt(now);
      return;
    }
    if (marker === LAYER_PACKET_MARKER) {
      if (data.byteLength < 10) return;
      const defaultLayer = data.getUint32(2, true);
      const mask = data.getUint32(6, true);
      setDefaultLayerState(defaultLayer);
      setActiveLayerMask(mask);
      setLastEventAt(now);
    } else if (marker === POINTER_PACKET_MARKER) {
      if (data.byteLength < 11) return;
      setPointer({
        dx: readInt16LE(data, 2),
        dy: readInt16LE(data, 4),
        wheel: readInt16LE(data, 6),
        hwheel: readInt16LE(data, 8),
        buttons: data.getUint8(10),
        at: now,
      });
      setLastEventAt(now);
    } else if (marker === ENCODER_PACKET_MARKER) {
      if (data.byteLength < 4) return;
      const sensor = data.getUint8(2);
      const delta = data.getInt8(3);
      setEncoders((prev) => ({ ...prev, [sensor]: { delta, at: now } }));
      setLastEventAt(now);
    }

    // Capture every non-key inputreport into the debug buffer so we can
    // diagnose unknown markers / byte layout issues from the UI.
    const bytes: number[] = [];
    const take = Math.min(data.byteLength, 12);
    for (let i = 0; i < take; i++) bytes.push(data.getUint8(i));
    setRecentNonKeyFrames((prev) =>
      [{ at: now, reportId: event.reportId ?? 0, bytes }, ...prev].slice(0, 5),
    );
  }, []);

  const attach = useCallback(
    async (d: HIDDeviceLike) => {
      if (!d.opened) await d.open();
      const listener: EventListener = (e) =>
        handleReport(e as HIDInputReportEvent);
      d.addEventListener("inputreport", listener);
      listenerRef.current = listener;
      setDevice(d);
      setError(null);
    },
    [handleReport],
  );

  const detach = useCallback(async () => {
    const d = device;
    if (d && listenerRef.current) {
      d.removeEventListener("inputreport", listenerRef.current);
      listenerRef.current = null;
    }
    if (d?.opened) {
      try {
        await d.close();
      } catch {
        // ignore
      }
    }
    setDevice(null);
    setPressed(new Set());
    setActiveLayerMask(0);
    setPointer(null);
    setEncoders({});
  }, [device]);

  const connect = useCallback(async () => {
    const hid = getHid();
    if (!hid) {
      setError("WebHID API not available in this browser");
      return;
    }
    try {
      const [d] = await hid.requestDevice({
        filters: [{ usagePage: RAW_HID_USAGE_PAGE, usage: RAW_HID_USAGE }],
      });
      if (!d) {
        setError("No device selected");
        return;
      }
      await attach(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [attach]);

  const disconnect = useCallback(async () => {
    await detach();
  }, [detach]);

  useEffect(() => {
    const hid = getHid();
    if (!hid) return;
    let cancelled = false;
    hid
      .getDevices()
      .then(async (devs) => {
        if (cancelled) return;
        const match = devs.find((d) =>
          d.collections.some(
            (c) =>
              c.usagePage === RAW_HID_USAGE_PAGE && c.usage === RAW_HID_USAGE,
          ),
        );
        if (match) await attach(match);
      })
      .catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [attach]);

  return {
    supported,
    device,
    pressed,
    activeLayerMask,
    defaultLayerState,
    pointer,
    encoders,
    lastEventAt,
    error,
    recentNonKeyFrames,
    connect,
    disconnect,
  };
}
