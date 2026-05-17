import type { Binding } from "./types";

export type BindingCategory =
  | "key"
  | "modifier"
  | "layer"
  | "hold-tap"
  | "mouse"
  | "bluetooth"
  | "media"
  | "sensor"
  | "macro"
  | "system"
  | "transparent"
  | "none"
  | "custom";

const MODIFIER_KEYS = new Set([
  "LCTRL",
  "RCTRL",
  "LSHIFT",
  "RSHIFT",
  "LALT",
  "RALT",
  "LCMD",
  "RCMD",
  "LGUI",
  "RGUI",
  "LWIN",
  "RWIN",
  "LMETA",
  "RMETA",
]);

const MEDIA_KEYS = new Set([
  "C_MUTE",
  "C_VOLUME_UP",
  "C_VOLUME_DOWN",
  "C_VOL_UP",
  "C_VOL_DN",
  "C_PLAY_PAUSE",
  "C_PLAY",
  "C_PAUSE",
  "C_NEXT",
  "C_PREV",
  "C_BRIGHTNESS_INC",
  "C_BRIGHTNESS_DEC",
]);

export function categorize(binding: Binding): BindingCategory {
  switch (binding.behavior) {
    case "kp": {
      const code = binding.params[0] ?? "";
      if (MODIFIER_KEYS.has(code)) return "modifier";
      if (MEDIA_KEYS.has(code)) return "media";
      return "key";
    }
    case "mo":
    case "to":
    case "tog":
    case "lt":
      return "layer";
    case "mt":
    case "lt_mkp":
      return "hold-tap";
    case "mkp":
      return "mouse";
    case "bt":
      return "bluetooth";
    case "inc_dec_kp":
    case "inc_dec_cp":
      return "sensor";
    case "macro":
    case "to_layer_0":
      return "macro";
    case "bootloader":
    case "sys_reset":
    case "reset":
      return "system";
    case "trans":
      return "transparent";
    case "none":
      return "none";
    default:
      return "custom";
  }
}

export function describe(binding: Binding, layerNames: string[] = []): string {
  const { behavior, params } = binding;
  switch (behavior) {
    case "kp":
      return formatKeyCode(params[0] ?? "");
    case "mo":
      return `Hold Layer ${layerLabel(params[0], layerNames)}`;
    case "to":
      return `To Layer ${layerLabel(params[0], layerNames)}`;
    case "tog":
      return `Toggle Layer ${layerLabel(params[0], layerNames)}`;
    case "lt":
      return `Tap: ${formatKeyCode(params[1] ?? "")}\nHold: Layer ${layerLabel(params[0], layerNames)}`;
    case "mt":
      return `Tap: ${formatKeyCode(params[1] ?? "")}\nHold: ${formatKeyCode(params[0] ?? "")}`;
    case "lt_mkp":
      return `Tap: Mouse ${formatKeyCode(params[1] ?? "")}\nHold: Layer ${layerLabel(params[0], layerNames)}`;
    case "mkp":
      return `Mouse ${formatKeyCode(params[0] ?? "")}`;
    case "bt":
      return `BT ${params.join(" ")}`;
    case "inc_dec_kp":
      return `↺ ${formatKeyCode(params[0] ?? "")} / ↻ ${formatKeyCode(params[1] ?? "")}`;
    case "inc_dec_cp":
      return `↺ ${formatKeyCode(params[0] ?? "")} / ↻ ${formatKeyCode(params[1] ?? "")}`;
    case "to_layer_0":
      return `→L0 + ${formatKeyCode(params[0] ?? "")}`;
    case "bootloader":
      return "Bootloader";
    case "sys_reset":
    case "reset":
      return "Reset";
    case "trans":
      return "▽";
    case "none":
      return "";
    default:
      return [behavior, ...params].join(" ");
  }
}

function layerLabel(idx: string | undefined, names: string[]): string {
  if (idx == null) return "?";
  const n = Number(idx);
  if (Number.isFinite(n) && names[n]) return `${n} ${names[n]}`;
  return idx;
}

const SHORT_KEY_LABEL: Record<string, string> = {
  BACKSPACE: "BSpc",
  LSHIFT: "Shift",
  RSHIFT: "Shift",
  LCTRL: "Ctrl",
  RCTRL: "Ctrl",
  LALT: "Alt",
  RALT: "Alt",
  LCMD: "Cmd",
  RCMD: "Cmd",
  LGUI: "Gui",
  RGUI: "Gui",
  SPACE: "Space",
  ENTER: "Enter",
  ESC: "Esc",
  TAB: "Tab",
  MINUS: "-",
  EQUAL: "=",
  LBKT: "[",
  RBKT: "]",
  LBRC: "{",
  RBRC: "}",
  LPAR: "(",
  RPAR: ")",
  SEMI: ";",
  COLON: ":",
  SQT: "'",
  DQT: '"',
  GRAVE: "`",
  TILDE: "~",
  BSLH: "\\",
  PIPE: "|",
  SLASH: "/",
  QMARK: "?",
  COMMA: ",",
  DOT: ".",
  EXCL: "!",
  HASH: "#",
  DOLLAR: "$",
  PERCENT: "%",
  AMPS: "&",
  AT: "@",
  CARET: "^",
  UNDER: "_",
  LT: "<",
  GT: ">",
  PG_UP: "PgUp",
  PG_DN: "PgDn",
  HOME: "Home",
  END: "End",
  UP: "↑",
  DOWN: "↓",
  LEFT: "←",
  RIGHT: "→",
  C_VOLUME_UP: "Vol+",
  C_VOLUME_DOWN: "Vol-",
  C_MUTE: "Mute",
  C_PLAY_PAUSE: "▶︎❙❙",
  C_NEXT: "⏭",
  C_PREV: "⏮",
  LANGUAGE_1: "Lang1",
  LANGUAGE_2: "Lang2",
};

export function formatKeyCode(code: string): string {
  if (!code) return "";
  // Numbers like N1..N9 N0
  if (/^N([0-9])$/.test(code)) return code.slice(1);
  if (SHORT_KEY_LABEL[code]) return SHORT_KEY_LABEL[code];
  // Modifier wrappers: LC(...), LG(...), LS(...), LA(...), RC, RG, RS, RA
  const mod = code.match(/^([LR])([CGSA])\((.+)\)$/);
  if (mod) {
    const which = mod[1] === "L" ? "" : "R";
    const m: Record<string, string> = {
      C: "Ctrl",
      G: "Cmd",
      S: "Shift",
      A: "Alt",
    };
    return `${which}${m[mod[2]]}+${formatKeyCode(mod[3])}`;
  }
  // F1..F12
  if (/^F\d+$/.test(code)) return code;
  // Single letter
  if (/^[A-Z]$/.test(code)) return code;
  return code;
}

/* ------------------------------------------------------------------ */
/* Two-line ("primary" + "secondary") label for the keyboard view.    */
/* Designed for at-a-glance recognition: the main glyph is whatever  */
/* the key types on tap, the muted secondary line carries the hold   */
/* action or modifier flags.                                          */
/* ------------------------------------------------------------------ */

export type KeyLabel = {
  /** Big, bold glyph in the keycap. Empty when the binding is purely
   * a layer hold (mo/tog) — caller should fall back to secondary. */
  primary: string;
  /** Smaller muted line under the primary (hold action, modifier
   * indicator, etc.). Empty when no extra info applies. */
  secondary?: string;
};

/**
 * Build a 2-line label for the keyboard view. Keep primary short
 * (1-5 chars ideal) so the cap can render it at text-sm bold; let
 * `secondary` carry the qualifier ("↪ Shift", "▲ L1", "⌃⇧").
 */
export function describeKey(
  binding: Binding,
  layerNames: string[] = [],
): KeyLabel {
  const { behavior, params } = binding;
  switch (behavior) {
    case "kp": {
      // For wrapped modifier keycodes split the modifier prefix into the
      // secondary line so the main glyph stays clean. e.g.
      //   LC(LS(TAB)) => primary "Tab", secondary "⌃⇧"
      const wrapped = decomposeKeyCode(params[0] ?? "");
      return wrapped;
    }
    case "mo":
      return { primary: `L${params[0] ?? "?"}`, secondary: "hold" };
    case "to":
      return { primary: `L${params[0] ?? "?"}`, secondary: "to" };
    case "tog":
      return { primary: `L${params[0] ?? "?"}`, secondary: "toggle" };
    case "lt": {
      const tap = formatKeyCode(params[1] ?? "");
      return {
        primary: tap || "?",
        secondary: `▲ ${shortLayer(params[0], layerNames)}`,
      };
    }
    case "mt": {
      const tap = formatKeyCode(params[1] ?? "");
      return {
        primary: tap || "?",
        secondary: `↪ ${modifierSymbol(params[0])}`,
      };
    }
    case "lt_mkp": {
      const tap = params[1] ?? "?";
      return {
        primary: `M${tap.replace(/^MB/, "")}`,
        secondary: `▲ ${shortLayer(params[0], layerNames)}`,
      };
    }
    case "mkp":
      return { primary: mouseLabel(params[0] ?? ""), secondary: "click" };
    case "bt": {
      const action = params[0] ?? "";
      const idx = params[1];
      return {
        primary: action.replace(/^BT_/, ""),
        secondary: idx !== undefined ? `BT ${idx}` : "BT",
      };
    }
    case "inc_dec_kp":
    case "inc_dec_cp":
      return {
        primary: `${formatKeyCode(params[0] ?? "")}/${formatKeyCode(params[1] ?? "")}`,
        secondary: "↺ / ↻",
      };
    case "to_layer_0":
      return {
        primary: formatKeyCode(params[0] ?? "") || "K",
        secondary: "→L0",
      };
    case "bootloader":
      return { primary: "Boot", secondary: "loader" };
    case "sys_reset":
    case "reset":
      return { primary: "Reset", secondary: "" };
    case "trans":
      return { primary: "▽" };
    case "none":
      return { primary: "—" };
    default: {
      // Custom or named hold-tap. Surface tap glyph as primary, hold
      // hint as secondary, behavior name otherwise.
      if (params.length >= 2) {
        return {
          primary: formatKeyCode(params[1]) || params[1],
          secondary: `▲ ${shortModOrLayer(params[0])} · &${behavior}`,
        };
      }
      if (params.length === 1) {
        return {
          primary: formatKeyCode(params[0]) || params[0],
          secondary: `&${behavior}`,
        };
      }
      return { primary: `&${behavior}` };
    }
  }
}

/**
 * Strip leading modifier wrappers off a kp param and return the bare
 * keycode as primary plus the gathered modifier symbols as secondary.
 *   "LC(LS(TAB))" → { primary: "Tab", secondary: "⌃⇧" }
 *   "A"           → { primary: "A" }
 */
function decomposeKeyCode(code: string): KeyLabel {
  const mods: string[] = [];
  let inner = code;
  for (let safety = 0; safety < 4; safety++) {
    const m = inner.match(/^([LR])([CGSA])\((.+)\)$/);
    if (!m) break;
    const which = m[1];
    const letter = m[2];
    const sym = ({ C: "⌃", S: "⇧", A: "⌥", G: "⌘" } as Record<string, string>)[
      letter
    ];
    mods.push(which === "L" ? sym : `R${sym}`);
    inner = m[3];
  }
  const primary = formatKeyCode(inner);
  return {
    primary: primary || code,
    secondary: mods.length > 0 ? mods.join("") : undefined,
  };
}

const MOD_SYMBOL: Record<string, string> = {
  LSHIFT: "⇧",
  RSHIFT: "⇧",
  LCTRL: "⌃",
  RCTRL: "⌃",
  LALT: "⌥",
  RALT: "⌥",
  LCMD: "⌘",
  RCMD: "⌘",
  LGUI: "⌘",
  RGUI: "⌘",
};

function modifierSymbol(code: string | undefined): string {
  if (!code) return "?";
  return MOD_SYMBOL[code] ?? formatKeyCode(code);
}

function shortLayer(idx: string | undefined, _names: string[]): string {
  if (idx == null) return "?";
  const n = Number(idx);
  return Number.isFinite(n) ? `L${n}` : idx;
}

function shortModOrLayer(arg: string | undefined): string {
  if (!arg) return "?";
  if (MOD_SYMBOL[arg]) return MOD_SYMBOL[arg];
  if (/^\d+$/.test(arg)) return `L${arg}`;
  return formatKeyCode(arg);
}

function mouseLabel(code: string): string {
  if (!code) return "MB?";
  return code.replace(/^MB/, "M");
}

/**
 * Inline fill+stroke hex pairs for the keycap rect. We don't use
 * Tailwind `fill-*` utilities because the content scanner can miss
 * classes constructed inside switch returns, leaving caps black.
 * Setting the SVG attributes directly avoids that pitfall entirely.
 */
export function categorySvgColors(cat: BindingCategory): {
  fill: string;
  stroke: string;
} {
  switch (cat) {
    case "key":
      return { fill: "#FFFFFF", stroke: "#E2E8F0" }; // white / slate-200
    case "modifier":
      return { fill: "#F1F5F9", stroke: "#CBD5E1" }; // slate-100 / slate-300
    case "layer":
      return { fill: "#F0FDFA", stroke: "#5EEAD4" }; // teal-50 / teal-300
    case "hold-tap":
      return { fill: "#FEF3C7", stroke: "#FCD34D" }; // amber-100 / amber-300
    case "mouse":
      return { fill: "#EFF6FF", stroke: "#BFDBFE" }; // blue-50 / blue-200
    case "bluetooth":
      return { fill: "#EEF2FF", stroke: "#C7D2FE" }; // indigo-50 / indigo-200
    case "media":
      return { fill: "#FDF4FF", stroke: "#F5D0FE" }; // fuchsia-50 / fuchsia-200
    case "macro":
      return { fill: "#FFF7ED", stroke: "#FED7AA" }; // orange-50 / orange-200
    case "system":
      return { fill: "#FEF2F2", stroke: "#FECACA" }; // red-50 / red-200
    case "transparent":
    case "none":
      return { fill: "#F8FAFC", stroke: "#E2E8F0" }; // slate-50 / slate-200
    default:
      return { fill: "#FFFFFF", stroke: "#E2E8F0" };
  }
}

/** @deprecated use categorySvgColors */
export function categoryFill(cat: BindingCategory): string {
  const { fill, stroke } = categorySvgColors(cat);
  return `${fill} ${stroke}`;
}

/**
 * HTML-side text color (and weight) for the keycap label, by category.
 */
export function categoryText(cat: BindingCategory): string {
  switch (cat) {
    case "key":
      return "text-ink-primary";
    case "modifier":
      return "text-ink-primary";
    case "layer":
      return "text-primary";
    case "hold-tap":
      return "text-amber-900";
    case "mouse":
      return "text-blue-900";
    case "bluetooth":
      return "text-indigo-900";
    case "media":
      return "text-fuchsia-900";
    case "macro":
      return "text-accent";
    case "system":
      return "text-red-900";
    case "transparent":
    case "none":
      return "text-ink-muted";
    default:
      return "text-ink-secondary";
  }
}

/** @deprecated use categoryFill + categoryText separately */
export function categoryColor(cat: BindingCategory): string {
  return `${categoryFill(cat)} ${categoryText(cat)}`;
}
