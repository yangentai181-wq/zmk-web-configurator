import type { Binding, ComboDef, KeymapDoc, Layer } from "./types";

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
  result = replaceCombosBlock(result, doc.combos);
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

/**
 * Replace the entire `combos { ... };` block content with newly rendered
 * combo entries. Unlike the per-layer bindings substitution, combos
 * survive as a unit: we rewrite all of them at once, which means
 * comments inside the original combos block are lost. The trade-off
 * keeps the generator simple — preserving comments would require a
 * structural parse that we don't have.
 *
 * If the source has no combos block and there are combos to write, we
 * inject a fresh block just before the closing brace of the top-level
 * `/ { ... };` node.
 */
function replaceCombosBlock(source: string, combos: ComboDef[]): string {
  const renderedInner = combos.map(renderCombo).join("\n\n");
  const blockBody = `\n        compatible = "zmk,combos";${
    renderedInner ? "\n\n" + indent(renderedInner, 8) : ""
  }\n    `;
  const newBlock = `combos {${blockBody}};`;

  // Try to find an existing combos block first. Match the whole
  // `combos { ... };` greedy enough to swallow nested braces by
  // counting them manually rather than relying on regex.
  const startMatch = /\bcombos\s*\{/.exec(source);
  if (startMatch) {
    const start = startMatch.index;
    const bodyStart = start + startMatch[0].length;
    let depth = 1;
    let i = bodyStart;
    for (; i < source.length; i++) {
      const ch = source[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) return source; // unbalanced — give up
    // Include the trailing `};` if present
    let end = i + 1;
    if (source[end] === ";") end++;
    return source.slice(0, start) + newBlock + source.slice(end);
  }

  // No existing combos block. Inject before the closing `};` of the
  // outermost `/ { ... };` node.
  if (combos.length === 0) return source;
  const rootClose = /\}\s*;\s*$/.exec(source);
  if (!rootClose) return source;
  const insertAt = rootClose.index;
  return (
    source.slice(0, insertAt) + `    ${newBlock}\n` + source.slice(insertAt)
  );
}

function renderCombo(c: ComboDef): string {
  const lines: string[] = [`${c.name} {`];
  if (c.timeoutMs !== undefined) {
    lines.push(`    timeout-ms = <${c.timeoutMs}>;`);
  }
  if (c.requirePriorIdleMs !== undefined) {
    lines.push(`    require-prior-idle-ms = <${c.requirePriorIdleMs}>;`);
  }
  lines.push(`    key-positions = <${c.keyPositions.join(" ")}>;`);
  lines.push(`    bindings = <${c.bindings}>;`);
  if (c.layers && c.layers.length > 0) {
    lines.push(`    layers = <${c.layers.join(" ")}>;`);
  }
  if (c.slowRelease) {
    lines.push(`    slow-release;`);
  }
  lines.push(`};`);
  return lines.join("\n");
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? pad + line : line))
    .join("\n");
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
