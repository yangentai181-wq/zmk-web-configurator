"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  call_rpc,
  create_rpc_connection,
  type Notification,
  type RpcConnection,
} from "@zmkfirmware/zmk-studio-ts-client";
import { connect as serialConnect } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";

export type StudioDeviceInfo = {
  name: string;
  serial?: string;
};

export type StudioKeymapLayer = {
  id: number;
  name?: string;
  bindings: StudioBehaviorBinding[];
};

export type StudioBehaviorBinding = {
  behaviorId: number;
  param1: number;
  param2: number;
};

export type StudioBehaviorDescriptor = {
  id: number;
  name?: string;
  displayName?: string;
};

export type StudioState = {
  supported: boolean;
  connected: boolean;
  busy: boolean;
  deviceInfo: StudioDeviceInfo | null;
  layers: StudioKeymapLayer[];
  behaviors: StudioBehaviorDescriptor[];
  unsavedChanges: boolean;
  error: string | null;
};

export type StudioActions = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setBinding: (
    layerId: number,
    position: number,
    binding: StudioBehaviorBinding,
  ) => Promise<StudioResult>;
  save: () => Promise<StudioResult>;
  discard: () => Promise<StudioResult>;
};

export type StudioResult = { ok: boolean; error: string | null };

export function useZmkStudio(): StudioState & StudioActions {
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<StudioDeviceInfo | null>(null);
  const [layers, setLayers] = useState<StudioKeymapLayer[]>([]);
  const [behaviors, setBehaviors] = useState<StudioBehaviorDescriptor[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connRef = useRef<RpcConnection | null>(null);
  const notificationCancelRef = useRef<(() => void) | null>(null);

  // Defer the navigator check until after mount so the first client render
  // matches the SSR markup (`false`) and React doesn't trigger a
  // hydration mismatch when the value flips on the client.
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "serial" in navigator);
  }, []);

  const connect = useCallback(async () => {
    if (!supported) {
      setError("WebSerial not available in this browser");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const transport = await serialConnect();
      const conn = create_rpc_connection(transport);
      connRef.current = conn;

      // Subscribe to notifications (lock state, unsaved changes, etc.)
      const reader = conn.notification_readable.getReader();
      let cancelled = false;
      notificationCancelRef.current = () => {
        cancelled = true;
        reader.releaseLock();
      };
      void (async () => {
        try {
          while (!cancelled) {
            const { value, done } = await reader.read();
            if (done) break;
            handleNotification(value);
          }
        } catch {
          // stream closed
        }
      })();

      // Initial fetches
      const infoResp = await call_rpc(conn, {
        core: { getDeviceInfo: true },
      } as any);
      const info = (infoResp as any)?.core?.getDeviceInfo;
      if (info) {
        setDeviceInfo({
          name: info.name ?? "ZMK",
          serial: info.serial,
        });
      }

      const km = await call_rpc(conn, {
        keymap: { getKeymap: true },
      } as any);
      const keymap = (km as any)?.keymap?.getKeymap;
      if (keymap?.layers) {
        setLayers(
          keymap.layers.map((l: any) => ({
            id: l.id,
            name: l.name,
            bindings: (l.bindings ?? []).map((b: any) => ({
              behaviorId: b.behaviorId ?? 0,
              param1: b.param1 ?? 0,
              param2: b.param2 ?? 0,
            })),
          })),
        );
      }

      const bv = await call_rpc(conn, {
        behaviors: { listAllBehaviors: true },
      } as any);
      const behaviorList =
        (bv as any)?.behaviors?.listAllBehaviors?.behaviors ?? [];
      // Fetch details for each behavior to get the name. Some firmwares
      // ship only the id list initially.
      const details = await Promise.all(
        behaviorList.map((bid: number) =>
          call_rpc(conn, {
            behaviors: { getBehaviorDetails: { behaviorId: bid } },
          } as any).then((r) => (r as any)?.behaviors?.getBehaviorDetails),
        ),
      );
      const mappedBehaviors = details.filter(Boolean).map((d: any) => ({
        id: d.id ?? d.behaviorId ?? 0,
        name: d.friendlyName ?? d.displayName ?? d.name,
        displayName: d.displayName ?? d.friendlyName ?? d.name,
        metadata: d.metadata,
      }));
      console.info(
        "Studio behaviors:",
        mappedBehaviors.map((b: any) => ({
          id: b.id,
          displayName: b.displayName,
        })),
      );
      console.debug("Studio behaviors full:", mappedBehaviors);
      setBehaviors(mappedBehaviors);

      const chk = await call_rpc(conn, {
        keymap: { checkUnsavedChanges: true },
      } as any);
      setUnsavedChanges(Boolean((chk as any)?.keymap?.checkUnsavedChanges));

      setConnected(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      connRef.current = null;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const disconnect = useCallback(async () => {
    notificationCancelRef.current?.();
    notificationCancelRef.current = null;
    const conn = connRef.current;
    if (conn) {
      try {
        await conn.request_writable.close();
      } catch {
        // ignore
      }
    }
    connRef.current = null;
    setConnected(false);
    setDeviceInfo(null);
    setLayers([]);
    setBehaviors([]);
    setUnsavedChanges(false);
  }, []);

  function handleNotification(n: Notification) {
    const anyN = n as any;
    if (anyN?.keymap?.unsavedChangesStatusChanged !== undefined) {
      setUnsavedChanges(Boolean(anyN.keymap.unsavedChangesStatusChanged));
    }
  }

  const setBinding = useCallback(
    async (
      layerId: number,
      position: number,
      binding: StudioBehaviorBinding,
    ): Promise<StudioResult> => {
      const conn = connRef.current;
      if (!conn) {
        const msg = "Not connected to ZMK Studio";
        setError(msg);
        return { ok: false, error: msg };
      }
      setBusy(true);
      try {
        const resp = await call_rpc(conn, {
          keymap: {
            setLayerBinding: {
              layerId,
              keyPosition: position,
              binding,
            },
          },
        } as any);
        console.debug("setLayerBinding resp", {
          layerId,
          position,
          binding,
          resp,
        });
        const code = (resp as any)?.keymap?.setLayerBinding;
        // SET_LAYER_BINDING_RESP_OK = 0; proto3 typically omits the
        // field on the default value, so undefined is also success.
        if (code !== 0 && code !== undefined) {
          const reason =
            (
              {
                1: "INVALID_LOCATION (layer / position)",
                2: "INVALID_BEHAVIOR (behaviorId not recognised)",
                3: "INVALID_PARAMETERS (param1 / param2)",
              } as Record<number, string>
            )[code] ?? `code ${code}`;
          const msg = `setLayerBinding ${reason}`;
          setError(msg);
          return { ok: false, error: msg };
        }
        // Reflect locally
        setLayers((prev) =>
          prev.map((l) => {
            if (l.id !== layerId) return l;
            const nextBindings = [...l.bindings];
            nextBindings[position] = binding;
            return { ...l, bindings: nextBindings };
          }),
        );
        setUnsavedChanges(true);
        setError(null);
        return { ok: true, error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("setLayerBinding threw", e);
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const save = useCallback(async (): Promise<StudioResult> => {
    const conn = connRef.current;
    if (!conn) return { ok: false, error: "Not connected" };
    setBusy(true);
    try {
      const resp = await call_rpc(conn, {
        keymap: { saveChanges: true },
      } as any);
      const code = (resp as any)?.keymap?.saveChanges;
      if (code !== 0 && code !== undefined && typeof code !== "object") {
        const msg = `saveChanges error code ${code}`;
        setError(msg);
        return { ok: false, error: msg };
      }
      setUnsavedChanges(false);
      setError(null);
      return { ok: true, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("saveChanges threw", e);
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setBusy(false);
    }
  }, []);

  const discard = useCallback(async (): Promise<StudioResult> => {
    const conn = connRef.current;
    if (!conn) return { ok: false, error: "Not connected" };
    setBusy(true);
    try {
      await call_rpc(conn, { keymap: { discardChanges: true } } as any);
      setUnsavedChanges(false);
      setError(null);
      return { ok: true, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("discardChanges threw", e);
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      notificationCancelRef.current?.();
    };
  }, []);

  return {
    supported,
    connected,
    busy,
    deviceInfo,
    layers,
    behaviors,
    unsavedChanges,
    error,
    connect,
    disconnect,
    setBinding,
    save,
    discard,
  };
}
