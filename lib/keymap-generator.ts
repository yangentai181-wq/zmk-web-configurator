import type { BehaviorDef, Binding, ComboDef, KeymapDoc, Layer } from "./types";

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
  result = replaceBehaviors(result, doc.behaviors);
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
/**
 * Re-emit behavior overrides + named behaviors. Two passes:
 *
 *   1. For each `global` BehaviorDef (e.g. `&mt`, `&lt`), find the
 *      existing `&<name> { ... };` block in the source and replace its
 *      body. If no such block exists yet but we have non-trivial
 *      params, inject one before the `keymap {}` block.
 *   2. Replace the entire `behaviors { ... };` block with our current
 *      `named` BehaviorDef list. Like combos, comments inside this
 *      block are lost — flagged in the type definitions.
 */
function replaceBehaviors(source: string, behaviors: BehaviorDef[]): string {
  let result = source;
  const globals = behaviors.filter((b) => b.scope === "global");
  const named = behaviors.filter((b) => b.scope === "named");

  // 1. Global overrides
  for (const b of globals) {
    const body = renderBehaviorBody(b, /*includeCompatible=*/ false);
    const headerRe = new RegExp(
      `(&${escape(b.name)}\\s*\\{)([^{}]*?)(\\}\\s*;)`,
      "m",
    );
    if (headerRe.test(result)) {
      result = result.replace(
        headerRe,
        (_m, pre: string, _old: string, post: string) =>
          `${pre}\n${indent(body, 4)}\n    ${post}`,
      );
    } else {
      // No existing override block — inject one before the keymap node.
      const km = /\bkeymap\s*\{/.exec(result);
      if (km) {
        const insertion = `&${b.name} {\n${indent(body, 4)}\n};\n\n    `;
        result = result.slice(0, km.index) + insertion + result.slice(km.index);
      }
    }
  }

  // 2. Named behaviors block
  const renderedNamed = named.map(renderNamedBehavior).join("\n\n");
  const blockBody = renderedNamed
    ? `\n${indent(renderedNamed, 8)}\n    `
    : "\n    ";
  const newBlock = `behaviors {${blockBody}};`;

  const startMatch = /\bbehaviors\s*\{/.exec(result);
  if (startMatch) {
    const start = startMatch.index;
    const bodyStart = start + startMatch[0].length;
    let depth = 1;
    let i = bodyStart;
    for (; i < result.length; i++) {
      const ch = result[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth === 0) {
      let end = i + 1;
      if (result[end] === ";") end++;
      // Only rewrite when we actually have named behaviors or the block
      // was already there. Empty named[] keeps an empty block to avoid
      // surprising the user with a missing scaffold.
      result = result.slice(0, start) + newBlock + result.slice(end);
    }
  } else if (named.length > 0) {
    // Inject before keymap block.
    const km = /\bkeymap\s*\{/.exec(result);
    if (km) {
      result =
        result.slice(0, km.index) +
        `${newBlock}\n\n    ` +
        result.slice(km.index);
    }
  }

  return result;
}

function renderBehaviorBody(
  b: BehaviorDef,
  includeCompatible: boolean,
): string {
  const lines: string[] = [];
  if (includeCompatible && b.compatible) {
    lines.push(`compatible = "${b.compatible}";`);
  }
  if (includeCompatible) {
    lines.push(`#binding-cells = <${b.bindingCells}>;`);
  }
  if (b.flavor) lines.push(`flavor = "${b.flavor}";`);
  if (b.tappingTermMs !== undefined)
    lines.push(`tapping-term-ms = <${b.tappingTermMs}>;`);
  if (b.quickTapMs !== undefined)
    lines.push(`quick-tap-ms = <${b.quickTapMs}>;`);
  if (b.requirePriorIdleMs !== undefined)
    lines.push(`require-prior-idle-ms = <${b.requirePriorIdleMs}>;`);
  if (b.innerBindings && b.innerBindings.length > 0) {
    const inner = b.innerBindings.map((t) => `<&${t}>`).join(", ");
    lines.push(`bindings = ${inner};`);
  }
  if (b.rawExtra) {
    // rawExtra already contains trailing semicolons.
    for (const line of b.rawExtra.split(/\n+/)) {
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    }
  }
  return lines.join("\n");
}

function renderNamedBehavior(b: BehaviorDef): string {
  const body = renderBehaviorBody(b, /*includeCompatible=*/ true);
  return `${b.name}: ${b.name} {\n${indent(body, 4)}\n};`;
}

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
