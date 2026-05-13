/**
 * Extracts trackball/encoder properties from devicetree overlay text.
 * This is intentionally pattern-based, not a real DTS parser — sufficient for Phase 1 display.
 */

export function extractNodeBlock(src: string, label: string): string | null {
  // Match e.g. `trackball: trackball@0 { ... };` or `&left_encoder { ... };`
  const patterns = [
    new RegExp(`${escape(label)}\\s*:\\s*${escape(label)}@[\\w]+\\s*\\{`),
    new RegExp(`&${escape(label)}\\s*\\{`),
    new RegExp(`${escape(label)}\\s*\\{`),
  ];
  for (const re of patterns) {
    const m = re.exec(src);
    if (!m) continue;
    const start = m.index + m[0].length;
    let depth = 1;
    for (let i = start; i < src.length; i++) {
      const ch = src[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return src.slice(start, i);
      }
    }
  }
  return null;
}

export function extractProperty(block: string, prop: string): string | null {
  const re = new RegExp(`\\b${escape(prop)}\\s*=\\s*([^;]+);`);
  const m = re.exec(block);
  if (!m) return null;
  return m[1]
    .trim()
    .replace(/^["<]|[">]$/g, "")
    .trim();
}

function escape(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}
