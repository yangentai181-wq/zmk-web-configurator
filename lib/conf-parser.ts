import type { ConfEntry } from "./types";

export function parseConf(src: string): ConfEntry[] {
  const out: ConfEntry[] = [];
  for (const line of src.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    out.push({ key: t.slice(0, eq).trim(), value: t.slice(eq + 1).trim() });
  }
  return out;
}

export function findConf(
  entries: ConfEntry[],
  key: string,
): string | undefined {
  return entries.find((e) => e.key === key)?.value;
}

export function pickConfPrefix(
  entries: ConfEntry[],
  prefixes: string[],
): ConfEntry[] {
  return entries.filter((e) => prefixes.some((p) => e.key.startsWith(p)));
}
