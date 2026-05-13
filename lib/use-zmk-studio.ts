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
  ) => Promise<boolean>;
  save: () => Promise<boolean>;
  discard: () => Promise<boolean>;
};

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

  const supported = typeof navigator !== "undefined" && "serial" in navigator;

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
      setBehaviors(
        details.filter(Boolean).map((d: any) => ({
          id: d.id ?? d.behaviorId ?? 0,
          name: d.friendlyName ?? d.displayName ?? d.name,
          displayName: d.displayName ?? d.friendlyName ?? d.name,
        })),
      );

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
    ): Promise<boolean> => {
      const conn = connRef.current;
      if (!conn) {
        setError("Not connected to ZMK Studio");
        return false;
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
        const code = (resp as any)?.keymap?.setLayerBinding;
        // SET_LAYER_BINDING_RESP_OK = 0
        if (code !== 0 && code !== undefined) {
          setError(`setLayerBinding error code ${code}`);
          return false;
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
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const save = useCallback(async (): Promise<boolean> => {
    const conn = connRef.current;
    if (!conn) return false;
    setBusy(true);
    try {
      const resp = await call_rpc(conn, {
        keymap: { saveChanges: true },
      } as any);
      const code = (resp as any)?.keymap?.saveChanges;
      // SAVE_CHANGES_ERR_OK = 0 (or just empty object on success)
      if (code !== 0 && code !== undefined && typeof code !== "object") {
        setError(`saveChanges error code ${code}`);
        return false;
      }
      setUnsavedChanges(false);
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const discard = useCallback(async (): Promise<boolean> => {
    const conn = connRef.current;
    if (!conn) return false;
    setBusy(true);
    try {
      await call_rpc(conn, { keymap: { discardChanges: true } } as any);
      setUnsavedChanges(false);
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
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
