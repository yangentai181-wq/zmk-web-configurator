/**
 * Minimal ZMK keycode → 32-bit `kp` parameter table.
 *
 * ZMK encodes a `kp` parameter as: low 16 bits = HID usage, upper bits =
 * implicit modifier mask. This table only covers the plain (no-modifier)
 * variant of the common keys + the modifier names themselves. For
 * wrapped codes like `LC(LS(TAB))` the encoder returns null and the
 * caller falls back to the download flow.
 *
 * Source values come from `dt-bindings/zmk/keys.h` in upstream ZMK.
 */

const KEY: Record<string, number> = {
  // letters
  A: 0x04,
  B: 0x05,
  C: 0x06,
  D: 0x07,
  E: 0x08,
  F: 0x09,
  G: 0x0a,
  H: 0x0b,
  I: 0x0c,
  J: 0x0d,
  K: 0x0e,
  L: 0x0f,
  M: 0x10,
  N: 0x11,
  O: 0x12,
  P: 0x13,
  Q: 0x14,
  R: 0x15,
  S: 0x16,
  T: 0x17,
  U: 0x18,
  V: 0x19,
  W: 0x1a,
  X: 0x1b,
  Y: 0x1c,
  Z: 0x1d,
  // numbers
  N1: 0x1e,
  N2: 0x1f,
  N3: 0x20,
  N4: 0x21,
  N5: 0x22,
  N6: 0x23,
  N7: 0x24,
  N8: 0x25,
  N9: 0x26,
  N0: 0x27,
  // controls
  ENTER: 0x28,
  RET: 0x28,
  RETURN: 0x28,
  ESC: 0x29,
  ESCAPE: 0x29,
  BACKSPACE: 0x2a,
  BSPC: 0x2a,
  TAB: 0x2b,
  SPACE: 0x2c,
  SPC: 0x2c,
  MINUS: 0x2d,
  EQUAL: 0x2e,
  LBKT: 0x2f,
  RBKT: 0x30,
  BSLH: 0x31,
  SEMI: 0x33,
  SQT: 0x34,
  GRAVE: 0x35,
  COMMA: 0x36,
  DOT: 0x37,
  SLASH: 0x38,
  CAPS: 0x39,
  CAPSLOCK: 0x39,
  // function keys
  F1: 0x3a,
  F2: 0x3b,
  F3: 0x3c,
  F4: 0x3d,
  F5: 0x3e,
  F6: 0x3f,
  F7: 0x40,
  F8: 0x41,
  F9: 0x42,
  F10: 0x43,
  F11: 0x44,
  F12: 0x45,
  // navigation
  PG_UP: 0x4b,
  PGUP: 0x4b,
  PG_DN: 0x4e,
  PGDN: 0x4e,
  HOME: 0x4a,
  END: 0x4d,
  INS: 0x49,
  INSERT: 0x49,
  DEL: 0x4c,
  DELETE: 0x4c,
  RIGHT: 0x4f,
  LEFT: 0x50,
  DOWN: 0x51,
  UP: 0x52,
  // language keys
  LANG1: 0x90,
  LANGUAGE_1: 0x90,
  LANG2: 0x91,
  LANGUAGE_2: 0x91,
};

/** Modifier bit positions (high byte of the 32-bit kp param). */
const MOD_BIT: Record<string, number> = {
  LCTRL: 0x01,
  RCTRL: 0x10,
  LSHIFT: 0x02,
  RSHIFT: 0x20,
  LALT: 0x04,
  RALT: 0x40,
  LCMD: 0x08,
  RCMD: 0x80,
  LGUI: 0x08,
  RGUI: 0x80,
};

/**
 * Encode a ZMK key code string (e.g. "A", "SPACE", "LSHIFT", "LC(LS(TAB))")
 * into the 32-bit value that the `kp` behavior expects as param1.
 */
export function encodeKeyCode(code: string): number | null {
  if (!code) return null;
  const trimmed = code.trim();

  // Modifier-wrapper form: LC(...), LG(...), LS(...), LA(...) etc.
  const wrap = trimmed.match(/^([LR])([CGSA])\((.+)\)$/);
  if (wrap) {
    const inner = encodeKeyCode(wrap[3]);
    if (inner === null) return null;
    const which = wrap[1] === "L" ? 0 : 1; // L/R prefix
    const map: Record<string, number> = {
      C: 0x01, // ctrl
      S: 0x02, // shift
      A: 0x04, // alt
      G: 0x08, // gui (cmd)
    };
    const bit = map[wrap[2]] << (which * 4);
    return inner | (bit << 16);
  }

  // Bare modifier name → it's a key too (modifier as a regular key press)
  const mod = MOD_BIT[trimmed];
  if (mod !== undefined) {
    // Use the same encoding as ZMK: the modifier itself acts as a key.
    // HID usages for modifier keys: 0xE0..0xE7.
    const hid: Record<string, number> = {
      LCTRL: 0xe0,
      LSHIFT: 0xe1,
      LALT: 0xe2,
      LCMD: 0xe3,
      LGUI: 0xe3,
      RCTRL: 0xe4,
      RSHIFT: 0xe5,
      RALT: 0xe6,
      RCMD: 0xe7,
      RGUI: 0xe7,
    };
    return hid[trimmed] ?? null;
  }

  const k = KEY[trimmed];
  return k !== undefined ? k : null;
}

/**
 * Encode a modifier name (used for the hold side of `mt`).
 * Returns the modifier bit as a uint8.
 */
export function encodeModifier(name: string): number | null {
  return MOD_BIT[name.trim()] ?? null;
}
