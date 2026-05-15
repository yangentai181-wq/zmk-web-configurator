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

export type KeymapDoc = {
  defines: Record<string, number>;
  layers: Layer[];
  combos: ComboDef[];
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
  settings: ConfEntry[];
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
