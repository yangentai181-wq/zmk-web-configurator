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
  const layerIdFor = (raw: string): number | null => {
    const idx = Number(raw);
    if (!Number.isFinite(idx)) return null;
    return layers[idx]?.id ?? null;
  };
  const findBehavior = (...needles: string[]): number | null => {
    const lc = needles.map((n) => n.toLowerCase());
    const found = behaviors.find((b) => {
      const fields = [b.name, b.displayName]
        .filter((s): s is string => typeof s === "string" && s.length > 0)
        .map((s) => s.toLowerCase());
      return lc.some((needle) =>
        fields.some((f) => f === needle || f.includes(needle)),
      );
    });
    return found?.id ?? null;
  };

  switch (local.behavior) {
    case "kp": {
      const id = findBehavior("key_press", "key press", "kp");
      const code = encodeKeyCode(local.params[0] ?? "");
      if (id === null || code === null) return null;
      return { behaviorId: id, param1: code, param2: 0 };
    }
    case "mo": {
      const id = findBehavior("momentary", "mo");
      const layerId = layerIdFor(local.params[0] ?? "");
      if (id === null || layerId === null) return null;
      return { behaviorId: id, param1: layerId, param2: 0 };
    }
    case "tog": {
      const id = findBehavior("toggle", "tog");
      const layerId = layerIdFor(local.params[0] ?? "");
      if (id === null || layerId === null) return null;
      return { behaviorId: id, param1: layerId, param2: 0 };
    }
    case "lt": {
      const id = findBehavior("layer_tap", "layer tap", "lt");
      const layerId = layerIdFor(local.params[0] ?? "");
      const code = encodeKeyCode(local.params[1] ?? "");
      if (id === null || layerId === null || code === null) return null;
      return { behaviorId: id, param1: layerId, param2: code };
    }
    case "mt": {
      const id = findBehavior("mod_tap", "mod tap", "mt");
      const mod = encodeModifier(local.params[0] ?? "");
      const code = encodeKeyCode(local.params[1] ?? "");
      if (id === null || mod === null || code === null) return null;
      return { behaviorId: id, param1: mod, param2: code };
    }
    case "trans": {
      const id = findBehavior("trans", "transparent");
      if (id === null) return null;
      return { behaviorId: id, param1: 0, param2: 0 };
    }
    case "none": {
      const id = findBehavior("none");
      if (id === null) return null;
      return { behaviorId: id, param1: 0, param2: 0 };
    }
  }
  return null;
}
