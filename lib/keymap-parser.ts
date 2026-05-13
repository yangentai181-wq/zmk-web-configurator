import type { Binding, ComboDef, KeymapDoc, Layer } from "./types";

/**
 * Minimal ZMK .keymap parser sufficient for Phase 1 read-only view.
 * Handles: #define, keymap { compatible = "zmk,keymap"; <layers> }, sensor-bindings, combos block.
 * Does NOT handle: nested macros parameters, conditional layers, complex preprocessor logic.
 */
export function parseKeymap(source: string): KeymapDoc {
  const stripped = stripComments(source);
  const defines = parseDefines(stripped);
  const layers = parseLayers(stripped, defines);
  const combos = parseCombos(stripped, defines);
  return { defines, layers, combos };
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function parseDefines(src: string): Record<string, number> {
  const out: Record<string, number> = {};
  const re = /#define\s+(\w+)\s+(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out[m[1]] = Number(m[2]);
  }
  return out;
}

function parseLayers(src: string, defines: Record<string, number>): Layer[] {
  const keymapBlock = extractBlock(src, /keymap\s*\{/);
  if (!keymapBlock) return [];

  const layers: Layer[] = [];
  const layerRe = /([A-Za-z_][\w]*)\s*\{\s*([\s\S]*?)\s*\}\s*;/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = layerRe.exec(keymapBlock))) {
    const name = m[1];
    const body = m[2];
    if (/compatible\s*=/.test(body) && !/bindings\s*=/.test(body)) continue;
    if (!/bindings\s*=/.test(body)) continue;

    const bindings = parseBindingsList(extractAssignment(body, "bindings"));
    const sensorRaw = extractAssignment(body, "sensor-bindings");
    const sensorBindings = sensorRaw
      ? (parseBindingsList(sensorRaw)[0] ?? null)
      : null;

    layers.push({
      index: idx,
      name,
      displayName: humanize(name, idx, defines),
      bindings,
      sensorBindings,
    });
    idx++;
  }
  return layers;
}

function parseCombos(
  src: string,
  _defines: Record<string, number>,
): ComboDef[] {
  const block = extractBlock(src, /combos\s*\{/);
  if (!block) return [];
  const items: ComboDef[] = [];
  const re = /([A-Za-z_][\w]*)\s*\{\s*([\s\S]*?)\s*\}\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const name = m[1];
    const body = m[2];
    if (/compatible\s*=/.test(body) && !/key-positions/.test(body)) continue;
    const keyPositions = (extractAssignment(body, "key-positions") || "")
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    const bindings = extractAssignment(body, "bindings") || "";
    const timeout = extractAssignment(body, "timeout-ms");
    items.push({
      name,
      keyPositions,
      bindings,
      timeoutMs: timeout ? Number(timeout) : undefined,
    });
  }
  return items;
}

function extractBlock(src: string, headerRe: RegExp): string | null {
  const match = headerRe.exec(src);
  if (!match) return null;
  const start = match.index + match[0].length;
  let depth = 1;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i);
    }
  }
  return null;
}

function extractAssignment(body: string, key: string): string | null {
  const re = new RegExp(`${escape(key)}\\s*=\\s*([<"][^;]*?[>"])\\s*;`, "s");
  const m = re.exec(body);
  if (!m) return null;
  return m[1].replace(/^[<"]|[>"]$/g, "").trim();
}

function escape(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function parseBindingsList(raw: string | null): Binding[] {
  if (!raw) return [];
  // Tokenize: each binding starts with `&behavior` and continues until next `&` or end.
  const tokens: Binding[] = [];
  const ampSplit = raw.split(/\s+/).filter(Boolean);
  let current: { behavior: string; params: string[] } | null = null;
  for (const tok of ampSplit) {
    if (tok.startsWith("&")) {
      if (current) tokens.push(finalize(current));
      current = { behavior: tok.slice(1), params: [] };
    } else if (current) {
      current.params.push(tok);
    }
  }
  if (current) tokens.push(finalize(current));
  return tokens;
}

function finalize(b: { behavior: string; params: string[] }): Binding {
  const arity = behaviorArity(b.behavior);
  let params = b.params;
  if (arity != null && params.length > arity) {
    // Excess params belong to a trailing implicit binding? Trim to arity.
    params = params.slice(0, arity);
  }
  return {
    behavior: b.behavior,
    params,
    raw: `&${b.behavior}${params.length ? " " + params.join(" ") : ""}`,
  };
}

// Known behavior arities; unknown → variable.
function behaviorArity(name: string): number | null {
  switch (name) {
    case "kp":
      return 1;
    case "mo":
      return 1;
    case "to":
      return 1;
    case "tog":
      return 1;
    case "trans":
      return 0;
    case "none":
      return 0;
    case "lt":
      return 2;
    case "mt":
      return 2;
    case "lt_mkp":
      return 2;
    case "mkp":
      return 1;
    case "bt":
      return 2;
    case "inc_dec_kp":
      return 2;
    case "inc_dec_cp":
      return 2;
    case "bootloader":
      return 0;
    case "sys_reset":
      return 0;
    case "reset":
      return 0;
    case "to_layer_0":
      return 1;
    default:
      return null;
  }
}

function humanize(
  name: string,
  idx: number,
  defines: Record<string, number>,
): string {
  const trimmed = name.replace(/_layer$/i, "");
  const upper = trimmed.toUpperCase();
  if (defines[upper] === idx) return upper;
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
