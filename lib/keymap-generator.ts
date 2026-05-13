import type { Binding, KeymapDoc, Layer } from "./types";

/**
 * Generates a new .keymap text from the parsed KeymapDoc, by substituting
 * each layer's `bindings = < ... >;` payload with the current state of
 * `layer.bindings`. Everything else (macros, behaviors, combos,
 * sensor-bindings, encoder bindings, comments, includes, defines) is
 * preserved verbatim from the original source.
 *
 * This is intentionally a template-rewrite rather than a full re-emitter:
 * round-tripping a complex .keymap losslessly would require capturing
 * every preprocessor / device-tree construct, which the Phase 1 parser
 * doesn't do.
 */
export function generateKeymap(doc: KeymapDoc): string {
  let result = doc.originalText;
  for (const layer of doc.layers) {
    result = replaceLayerBindings(result, layer);
  }
  return result;
}

function replaceLayerBindings(source: string, layer: Layer): string {
  const rendered = renderBindings(layer.bindings);
  // Match `<layerName> { ... bindings = < ... >; ... }`. We rely on the
  // first `bindings = < ... >;` after the layer header, which in valid
  // ZMK keymaps is the bindings array for that layer.
  const re = new RegExp(
    `(\\b${escape(layer.name)}\\s*\\{[\\s\\S]*?bindings\\s*=\\s*<)([^>]*)(>\\s*;)`,
    "m",
  );
  return source.replace(re, (_m, pre: string, _old: string, post: string) => {
    return `${pre}\n${rendered}\n            ${post}`;
  });
}

function renderBindings(bindings: Binding[]): string {
  // Emit `&behavior param1 param2` for each entry, separated by two
  // spaces. Indentation matches the typical ZMK keymap style; whitespace
  // doesn't affect the device-tree parser anyway, so this is just for
  // human readability of diffs.
  return bindings
    .map((b) => {
      const params = b.params.length > 0 ? " " + b.params.join(" ") : "";
      return `&${b.behavior}${params}`;
    })
    .join("  ");
}

function escape(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

/** Convenience helper to make a Binding from behavior + params. */
export function makeBinding(behavior: string, params: string[] = []): Binding {
  const trimmed = params.filter((p) => p.length > 0);
  return {
    behavior,
    params: trimmed,
    raw: `&${behavior}${trimmed.length ? " " + trimmed.join(" ") : ""}`,
  };
}

/** Parse a raw `&behavior arg1 arg2` string back into a Binding. */
export function parseRawBinding(raw: string): Binding | null {
  const trimmed = raw.trim().replace(/^&/, "");
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0) return null;
  const [behavior, ...params] = parts;
  return makeBinding(behavior, params);
}
