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

/**
 * ZMK encodes a keycode parameter as a 32-bit value:
 *   bits 31..24 = explicit modifier mask (LC/LS/LG/LA wrappers)
 *   bits 23..16 = HID usage page (0x07 keyboard, 0x0C consumer, ...)
 *   bits 15..0  = HID usage ID
 */
const PAGE_KEYBOARD = 0x07;
const PAGE_CONSUMER = 0x0c;

/** Consumer-page (media) usages: kept separate so we OR the right page. */
const CONSUMER_USAGE: Record<string, number> = {
  C_MUTE: 0xe2,
  C_VOLUME_UP: 0xe9,
  C_VOL_UP: 0xe9,
  C_VOLUME_DOWN: 0xea,
  C_VOL_DN: 0xea,
  C_PLAY_PAUSE: 0xcd,
  C_PLAY: 0xb0,
  C_PAUSE: 0xb1,
  C_NEXT: 0xb5,
  C_PREV: 0xb6,
  C_STOP: 0xb7,
  C_BRIGHTNESS_INC: 0x6f,
  C_BRIGHTNESS_DEC: 0x70,
};

/** Modifier bit positions in the high byte of the 32-bit kp param. */
const MOD_BIT: Record<string, number> = {
  LCTRL: 0x01,
  LSHIFT: 0x02,
  LALT: 0x04,
  LCMD: 0x08,
  LGUI: 0x08,
  RCTRL: 0x10,
  RSHIFT: 0x20,
  RALT: 0x40,
  RCMD: 0x80,
  RGUI: 0x80,
};

/**
 * Encode a ZMK key code string (e.g. "A", "SPACE", "LSHIFT", "LC(LS(TAB))")
 * into the 32-bit value that the `kp` behavior expects as param1.
 *
 * The returned value already includes the HID usage page and (if any)
 * implicit modifier mask in the high byte.
 */
export function encodeKeyCode(code: string): number | null {
  if (!code) return null;
  const trimmed = code.trim();

  // Modifier-wrapper form: LC(...), LG(...), LS(...), LA(...) (and R*).
  const wrap = trimmed.match(/^([LR])([CGSA])\((.+)\)$/);
  if (wrap) {
    const inner = encodeKeyCode(wrap[3]);
    if (inner === null) return null;
    const which = wrap[1]; // 'L' or 'R'
    const letter = wrap[2]; // 'C' / 'G' / 'S' / 'A'
    const modKey = `${which}${letter === "C" ? "CTRL" : letter === "G" ? "CMD" : letter === "S" ? "SHIFT" : "ALT"}`;
    const bit = MOD_BIT[modKey];
    if (bit === undefined) return null;
    return inner | (bit << 24);
  }

  // Bare modifier name (e.g. LSHIFT) — treat as a regular keyboard key
  // by mapping to its modifier HID usage (0xE0..0xE7) on the keyboard
  // page. ZMK ignores the modifier bit for these by convention.
  const modUsage: Record<string, number> = {
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
  if (modUsage[trimmed] !== undefined) {
    return (PAGE_KEYBOARD << 16) | modUsage[trimmed];
  }

  // Consumer-page (media) keycodes
  const c = CONSUMER_USAGE[trimmed];
  if (c !== undefined) {
    return (PAGE_CONSUMER << 16) | c;
  }

  const k = KEY[trimmed];
  if (k !== undefined) {
    return (PAGE_KEYBOARD << 16) | k;
  }
  return null;
}

/**
 * Encode a modifier name (used for the hold side of `mt`).
 * Returns the modifier bit as a uint8.
 */
export function encodeModifier(name: string): number | null {
  return MOD_BIT[name.trim()] ?? null;
}
