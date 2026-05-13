import type { Binding } from "./types";
import type {
  StudioBehaviorBinding,
  StudioBehaviorDescriptor,
  StudioKeymapLayer,
} from "./use-zmk-studio";
import { encodeKeyCode, encodeModifier } from "./zmk-keycodes";

/**
 * Translate a local Binding (parsed from .keymap) into the
 * `{ behaviorId, param1, param2 }` triple that ZMK Studio's
 * `setLayerBinding` expects.
 *
 * Returns null when the behavior isn't covered by the table or when a
 * required parameter (keycode, layer index, modifier) couldn't be
 * resolved. The caller should fall back to the .keymap download flow.
 */
export function translateBinding(
  local: Binding,
  behaviors: StudioBehaviorDescriptor[],
  layers: StudioKeymapLayer[],
): StudioBehaviorBinding | null {
  const findBehavior = (...needles: string[]): number | null => {
    const ns = needles.map(normalize);

    // 1. Normalized exact match (handles "Key Press" vs "key press" vs
    //    "key_press" identically). Skips noise like mouse_key_press.
    for (const needle of ns) {
      const exact = behaviors.find((b) => {
        const dn = normalize(b.displayName);
        const nm = normalize(b.name);
        return dn === needle || nm === needle;
      });
      if (exact) return exact.id;
    }

    // 2. Substring fallback, but EXCLUDE mouse_*/enc_* variants because
    //    they shadow the bare behavior name (e.g. "mouse_key_press"
    //    accidentally matches the "key press" needle).
    for (const needle of ns) {
      const fuzzy = behaviors.find((b) => {
        const raw = (b.displayName ?? b.name ?? "").toLowerCase();
        if (raw.startsWith("mouse_") || raw.startsWith("enc_")) return false;
        const dn = normalize(b.displayName);
        const nm = normalize(b.name);
        return dn.includes(needle) || nm.includes(needle);
      });
      if (fuzzy) return fuzzy.id;
    }

    return null;
  };

  const layerIdFor = (raw: string): number | null => {
    const idx = Number(raw);
    if (!Number.isFinite(idx)) return null;
    return layers[idx]?.id ?? null;
  };

  switch (local.behavior) {
    case "kp": {
      const id = findBehavior("Key Press");
      const code = encodeKeyCode(local.params[0] ?? "");
      if (id === null || code === null) return null;
      return { behaviorId: id, param1: code, param2: 0 };
    }
    case "mo": {
      const id = findBehavior("Momentary Layer");
      const layerId = layerIdFor(local.params[0] ?? "");
      if (id === null || layerId === null) return null;
      return { behaviorId: id, param1: layerId, param2: 0 };
    }
    case "tog": {
      const id = findBehavior("Toggle Layer");
      const layerId = layerIdFor(local.params[0] ?? "");
      if (id === null || layerId === null) return null;
      return { behaviorId: id, param1: layerId, param2: 0 };
    }
    case "lt": {
      const id = findBehavior("Layer-Tap", "Layer Tap");
      const layerId = layerIdFor(local.params[0] ?? "");
      const code = encodeKeyCode(local.params[1] ?? "");
      if (id === null || layerId === null || code === null) return null;
      return { behaviorId: id, param1: layerId, param2: code };
    }
    case "mt": {
      const id = findBehavior("Mod-Tap", "Mod Tap");
      const mod = encodeModifier(local.params[0] ?? "");
      const code = encodeKeyCode(local.params[1] ?? "");
      if (id === null || mod === null || code === null) return null;
      return { behaviorId: id, param1: mod, param2: code };
    }
    case "trans": {
      const id = findBehavior("Transparent");
      if (id === null) return null;
      return { behaviorId: id, param1: 0, param2: 0 };
    }
    case "none": {
      const id = findBehavior("None");
      if (id === null) return null;
      return { behaviorId: id, param1: 0, param2: 0 };
    }
  }
  return null;
}

function normalize(s: string | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/[\s_-]/g, "");
}
