export type PhysicalKey = {
  position: number;
  row: number;
  col: number;
  x: number;
  y: number;
  side: "left" | "right";
};

export type Binding = {
  raw: string;
  behavior: string;
  params: string[];
};

export type Layer = {
  index: number;
  name: string;
  displayName: string;
  bindings: Binding[];
  sensorBindings: Binding | null;
};

export type SensorConfig = {
  ref: string;
  name: string;
  compatible?: string;
  enabled: boolean;
};

export type HoldTapFlavor =
  | "hold-preferred"
  | "balanced"
  | "tap-preferred"
  | "tap-unless-interrupted";

export type BehaviorDef = {
  /** Node label in DTS. `&mt` / `&lt` are referenced as "mt" / "lt"; named
   * behaviors use whatever label is in the keymap (e.g. "hm", "bspc_lt"). */
  name: string;
  /** "global": `&mt { ... };` style override of a built-in behavior.
   * "named": `behaviors { label: label { ... }; };` style new definition. */
  scope: "global" | "named";
  /** ZMK compatible string. For hold-tap that's "zmk,behavior-hold-tap". */
  compatible: string;
  /** Number of params expected when used as a binding. 2 for typical
   * hold-tap (hold action + tap action). */
  bindingCells: number;
  flavor?: HoldTapFlavor;
  tappingTermMs?: number;
  quickTapMs?: number;
  requirePriorIdleMs?: number;
  /** Inner bindings for behaviors like lt_mkp: ["mo", "mkp"]. Kept as
   * tokens (without the leading &). */
  innerBindings?: string[];
  /** Other DTS properties (label, hold-trigger-key-positions, …) that we
   * don't model individually. Preserved verbatim during re-emission. */
  rawExtra?: string;
};

export type KeymapDoc = {
  defines: Record<string, number>;
  layers: Layer[];
  combos: ComboDef[];
  behaviors: BehaviorDef[];
  /**
   * Original .keymap source text. Kept so the generator can re-emit a
   * round-trippable file: only the bindings = < ... > regions are
   * substituted, leaving macros / behaviors / combos / sensor-bindings
   * exactly as the user authored them.
   */
  originalText: string;
};

export type ComboDef = {
  name: string;
  keyPositions: number[];
  bindings: string;
  timeoutMs?: number;
  /**
   * `undefined` means "all layers" (ZMK's default when the `layers`
   * property is omitted). An explicit empty array is treated the same
   * way by ZMK, so we normalize to `undefined`.
   */
  layers?: number[];
  requirePriorIdleMs?: number;
  slowRelease?: boolean;
};

export type ConfEntry = {
  key: string;
  value: string;
};

export type TrackballConfig = {
  driver: string;
  enabled: boolean;
  scrollLayer?: number;
  automouseLayer?: number;
  /** Raw entries from .conf for everything we don't expose via typed
   * fields below. Generator falls back to these for unknown keys. */
  settings: ConfEntry[];
  /** Original .conf text for the central shield; used for round-tripping
   * by replacing matching lines and preserving everything else. */
  originalConfText: string;
  /** Source filename so we can offer a sensible default for download. */
  confFilename: string;

  // --- Typed editable fields (PMW3610) ---
  cpi?: number; // 200..3200, step 200
  cpiDividor?: number; // 1..100
  scrollTick?: number;
  automouseTimeoutMs?: number;
  invertX?: boolean;
  invertY?: boolean;
  invertScrollX?: boolean;
  smartAlgorithm?: boolean;
  pollingRate?: 125 | 250;
};

export type EncoderConfig = {
  enabled: boolean;
  driver: string;
  settings: ConfEntry[];
};

export type KeyboardConfig = {
  name: string;
  layout: PhysicalKey[];
  keymap: KeymapDoc;
  trackball: TrackballConfig;
  encoder: EncoderConfig;
  sensors: SensorConfig[];
};
