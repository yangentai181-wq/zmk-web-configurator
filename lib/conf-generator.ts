/**
 * Generates a new .conf text from the original .conf plus a sparse map
 * of overrides. Strategy:
 *
 *   1. For every line that starts with `CONFIG_<key>=`, if the key
 *      appears in `overrides`, rewrite the line. Comments and blank
 *      lines stay exactly as they are.
 *   2. Keys in `overrides` that didn't match an existing line are
 *      appended at the end, preserving the original trailing newline.
 *   3. To delete a setting, set its value to `null` in `overrides`.
 *      The original line is dropped; any trailing comment is dropped
 *      too.
 *
 * This is intentionally a per-line rewrite rather than a full Kconfig
 * model — we don't try to validate choices or dependencies.
 */
export function generateConf(
  original: string,
  overrides: Record<string, string | null>,
): string {
  const keysSeen = new Set<string>();
  const lines = original.split(/\r?\n/);
  const out: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*(CONFIG_[A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) {
      // Comment / blank / unrelated — keep verbatim
      out.push(line);
      continue;
    }
    const key = match[1];
    if (!(key in overrides)) {
      out.push(line);
      continue;
    }
    const value = overrides[key];
    keysSeen.add(key);
    if (value === null) {
      // Drop the line (and its trailing comment, if it was part of the
      // line; we don't try to preserve inline-comment-only changes).
      continue;
    }
    out.push(`${key}=${value}`);
  }

  // Append any overrides that weren't present in the original file
  const appended: string[] = [];
  for (const [key, value] of Object.entries(overrides)) {
    if (keysSeen.has(key) || value === null) continue;
    appended.push(`${key}=${value}`);
  }
  if (appended.length > 0) {
    // Ensure exactly one separating blank line before our additions
    if (out[out.length - 1] !== "") out.push("");
    out.push(...appended);
  }

  // Preserve trailing newline behavior of the original
  const hadTrailingNewline = /\r?\n$/.test(original);
  let text = out.join("\n");
  if (hadTrailingNewline && !text.endsWith("\n")) text += "\n";
  return text;
}
