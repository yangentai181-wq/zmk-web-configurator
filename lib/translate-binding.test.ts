import { describe, it, expect } from "vitest";
import { translateBinding } from "./translate-binding";
import { makeBinding } from "./keymap-generator";
import type {
  StudioBehaviorDescriptor,
  StudioKeymapLayer,
} from "./use-zmk-studio";

const BEHAVIORS: StudioBehaviorDescriptor[] = [
  { id: 1, displayName: "mouse_key_press" },
  { id: 2, displayName: "mouse_move" },
  { id: 6, displayName: "Key Press" },
  { id: 10, displayName: "Momentary Layer" },
  { id: 11, displayName: "To Layer" },
  { id: 13, displayName: "LAYER_TAP_TO_0" },
  { id: 14, displayName: "None" },
  { id: 21, displayName: "Toggle Layer" },
  { id: 22, displayName: "Transparent" },
  { id: 23, displayName: "enc_key_press" },
  { id: 24, displayName: "Layer-Tap" },
  { id: 25, displayName: "Mod-Tap" },
];

const LAYERS: StudioKeymapLayer[] = [
  { id: 100, bindings: [] },
  { id: 101, bindings: [] },
  { id: 102, bindings: [] },
  { id: 103, bindings: [] },
];

describe("translateBinding", () => {
  it("prefers exact 'Key Press' (id 6) over mouse_key_press (id 1)", () => {
    const out = translateBinding(makeBinding("kp", ["K"]), BEHAVIORS, LAYERS);
    expect(out).toEqual({
      behaviorId: 6,
      param1: 0x0007000e, // K on keyboard page
      param2: 0,
    });
  });

  it("translates &mo using the live Studio layer ID, not the .keymap index", () => {
    const out = translateBinding(makeBinding("mo", ["2"]), BEHAVIORS, LAYERS);
    // layers[2].id === 102, not literal 2
    expect(out).toEqual({ behaviorId: 10, param1: 102, param2: 0 });
  });

  it("translates &tog to Toggle Layer (not the noisy TO_LAYER_0)", () => {
    const out = translateBinding(makeBinding("tog", ["1"]), BEHAVIORS, LAYERS);
    expect(out).toEqual({ behaviorId: 21, param1: 101, param2: 0 });
  });

  it("translates &lt with layer ID in param1 and keycode in param2", () => {
    const out = translateBinding(
      makeBinding("lt", ["3", "SPACE"]),
      BEHAVIORS,
      LAYERS,
    );
    expect(out).toEqual({
      behaviorId: 24,
      param1: 103,
      param2: 0x0007002c, // SPACE
    });
  });

  it("translates &mt with modifier mask in param1 and keycode in param2", () => {
    const out = translateBinding(
      makeBinding("mt", ["LSHIFT", "A"]),
      BEHAVIORS,
      LAYERS,
    );
    expect(out).toEqual({
      behaviorId: 25,
      param1: 0x02, // LSHIFT
      param2: 0x00070004, // A
    });
  });

  it("translates &trans and &none with zero params", () => {
    expect(translateBinding(makeBinding("trans"), BEHAVIORS, LAYERS)).toEqual({
      behaviorId: 22,
      param1: 0,
      param2: 0,
    });
    expect(translateBinding(makeBinding("none"), BEHAVIORS, LAYERS)).toEqual({
      behaviorId: 14,
      param1: 0,
      param2: 0,
    });
  });

  it("returns null for unknown behaviors", () => {
    expect(
      translateBinding(makeBinding("bt", ["BT_SEL", "0"]), BEHAVIORS, LAYERS),
    ).toBeNull();
    expect(
      translateBinding(makeBinding("bootloader"), BEHAVIORS, LAYERS),
    ).toBeNull();
  });

  it("returns null when the keycode can't be encoded", () => {
    expect(
      translateBinding(makeBinding("kp", ["NOT_A_KEYCODE"]), BEHAVIORS, LAYERS),
    ).toBeNull();
  });

  it("returns null when the layer index is out of range", () => {
    expect(
      translateBinding(makeBinding("mo", ["99"]), BEHAVIORS, LAYERS),
    ).toBeNull();
  });
});
