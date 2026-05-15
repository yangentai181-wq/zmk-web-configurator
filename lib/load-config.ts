import fs from "node:fs/promises";
import path from "node:path";
import { parseKeymap } from "./keymap-parser";
import { parseConf, findConf, pickConfPrefix } from "./conf-parser";
import { extractNodeBlock, extractProperty } from "./overlay-parser";
import type {
  EncoderConfig,
  KeyboardConfig,
  PhysicalKey,
  SensorConfig,
  TrackballConfig,
} from "./types";

const FIXTURE_DIR = path.join(process.cwd(), "fixtures");
const SHIELD_DIR = path.join(FIXTURE_DIR, "boards", "shields", "minimal-keys");

export async function loadKeyboardConfig(): Promise<KeyboardConfig> {
  const [keymapSrc, layoutJson, confR, confL, overlayR, overlayL] =
    await Promise.all([
      read("minimal-keys.keymap"),
      read("minimal-keys.json"),
      readShield("minimal-keys_R.conf"),
      readShield("minimal-keys_L.conf"),
      readShield("minimal-keys_R.overlay"),
      readShield("minimal-keys_L.overlay"),
    ]);

  const keymap = parseKeymap(keymapSrc);
  const { layout, sensors } = parseLayoutJson(layoutJson);

  const confREntries = parseConf(confR);
  const confLEntries = parseConf(confL);

  const trackball = buildTrackball(
    confREntries,
    overlayR,
    confR,
    "minimal-keys_R.conf",
  );
  const encoder = buildEncoder(confLEntries, overlayL);
  const name =
    findConf(confREntries, "CONFIG_ZMK_KEYBOARD_NAME")?.replace(/^"|"$/g, "") ||
    "minimal-keys";

  return { name, layout, keymap, trackball, encoder, sensors };
}

function parseLayoutJson(text: string): {
  layout: PhysicalKey[];
  sensors: SensorConfig[];
} {
  const data = JSON.parse(text) as {
    layouts: Record<
      string,
      { layout: Array<{ row: number; col: number; x: number; y: number }> }
    >;
    sensors?: Array<{
      ref: string;
      name: string;
      compatible?: string;
      enabled?: boolean;
    }>;
  };
  const first = Object.values(data.layouts)[0];
  // Determine left/right by column index (gap between cols 5 and 7).
  const layout: PhysicalKey[] = first.layout.map((k, i) => ({
    position: i,
    row: k.row,
    col: k.col,
    x: k.x,
    y: k.y,
    side: k.col <= 5 ? "left" : "right",
  }));
  const sensors: SensorConfig[] = (data.sensors ?? []).map((s) => ({
    ref: s.ref,
    name: s.name,
    compatible: s.compatible,
    enabled: s.enabled ?? false,
  }));
  return { layout, sensors };
}

function buildTrackball(
  conf: ReturnType<typeof parseConf>,
  overlay: string,
  originalConfText: string,
  confFilename: string,
): TrackballConfig {
  const enabled = findConf(conf, "CONFIG_PMW3610") === "y";
  const block = extractNodeBlock(overlay, "trackball");
  const scrollLayer = block
    ? toNum(extractProperty(block, "scroll-layers"))
    : undefined;
  const automouseLayer = block
    ? toNum(extractProperty(block, "automouse-layer"))
    : undefined;
  const settings = pickConfPrefix(conf, [
    "CONFIG_PMW3610_",
    "CONFIG_ZMK_POINTING",
    "CONFIG_SPI",
  ]);
  const pollingRate =
    findConf(conf, "CONFIG_PMW3610_POLLING_RATE_125") === "y"
      ? 125
      : findConf(conf, "CONFIG_PMW3610_POLLING_RATE_250") === "y"
        ? 250
        : undefined;
  return {
    driver: "PMW3610",
    enabled,
    scrollLayer,
    automouseLayer,
    settings,
    originalConfText,
    confFilename,
    cpi: toNum(findConf(conf, "CONFIG_PMW3610_CPI")),
    cpiDividor: toNum(findConf(conf, "CONFIG_PMW3610_CPI_DIVIDOR")),
    scrollTick: toNum(findConf(conf, "CONFIG_PMW3610_SCROLL_TICK")),
    automouseTimeoutMs: toNum(
      findConf(conf, "CONFIG_PMW3610_AUTOMOUSE_TIMEOUT_MS"),
    ),
    invertX: findConf(conf, "CONFIG_PMW3610_INVERT_X") === "y",
    invertY: findConf(conf, "CONFIG_PMW3610_INVERT_Y") === "y",
    invertScrollX: findConf(conf, "CONFIG_PMW3610_INVERT_SCROLL_X") === "y",
    smartAlgorithm: findConf(conf, "CONFIG_PMW3610_SMART_ALGORITHM") === "y",
    pollingRate,
  };
}

function buildEncoder(
  conf: ReturnType<typeof parseConf>,
  _overlay: string,
): EncoderConfig {
  const enabled = findConf(conf, "CONFIG_EC11") === "y";
  const settings = pickConfPrefix(conf, ["CONFIG_EC11"]);
  return { driver: "EC11", enabled, settings };
}

function toNum(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v.replace(/[<>]/g, "").trim());
  return Number.isFinite(n) ? n : undefined;
}

function read(name: string): Promise<string> {
  return fs.readFile(path.join(FIXTURE_DIR, name), "utf8");
}
function readShield(name: string): Promise<string> {
  return fs.readFile(path.join(SHIELD_DIR, name), "utf8");
}
