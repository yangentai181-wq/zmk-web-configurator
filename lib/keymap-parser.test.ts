import { describe, it, expect } from "vitest";
import { parseKeymap } from "./keymap-parser";

const SAMPLE = `
#include <behaviors.dtsi>
#include <dt-bindings/zmk/keys.h>

#define MOUSE 4
#define FN 5

/ {
    keymap {
        compatible = "zmk,keymap";

        // Layer 0
        default_layer {
            bindings = <
&kp A   &kp B   &kp C
&mo 1   &lt FN SPACE   &kp ENTER
            >;
            sensor-bindings = <&inc_dec_kp C_VOLUME_DOWN C_VOLUME_UP>;
        };

        number_layer {
            bindings = <
&kp N1   &kp N2   &kp N3
&trans   &none    &kp BSPC
            >;
        };

        MOUSE {
            bindings = <
&trans &trans &trans
&trans &trans &trans
            >;
        };
    };

    combos {
        compatible = "zmk,combos";
        combo_jk {
            timeout-ms = <50>;
            key-positions = <1 2>;
            bindings = <&kp ESC>;
        };
    };
};
`;

describe("parseKeymap", () => {
  it("captures #define values", () => {
    const doc = parseKeymap(SAMPLE);
    expect(doc.defines.MOUSE).toBe(4);
    expect(doc.defines.FN).toBe(5);
  });

  it("parses all layer names in source order", () => {
    const doc = parseKeymap(SAMPLE);
    expect(doc.layers).toHaveLength(3);
    expect(doc.layers.map((l) => l.name)).toEqual([
      "default_layer",
      "number_layer",
      "MOUSE",
    ]);
  });

  it("parses individual key bindings with their params", () => {
    const doc = parseKeymap(SAMPLE);
    const layer0 = doc.layers[0];
    expect(layer0.bindings[0]).toEqual({
      behavior: "kp",
      params: ["A"],
      raw: "&kp A",
    });
    expect(layer0.bindings[3]).toEqual({
      behavior: "mo",
      params: ["1"],
      raw: "&mo 1",
    });
    expect(layer0.bindings[4]).toEqual({
      behavior: "lt",
      params: ["FN", "SPACE"],
      raw: "&lt FN SPACE",
    });
  });

  it("parses sensor-bindings when present and leaves it null otherwise", () => {
    const doc = parseKeymap(SAMPLE);
    expect(doc.layers[0].sensorBindings).toEqual({
      behavior: "inc_dec_kp",
      params: ["C_VOLUME_DOWN", "C_VOLUME_UP"],
      raw: "&inc_dec_kp C_VOLUME_DOWN C_VOLUME_UP",
    });
    expect(doc.layers[1].sensorBindings).toBeNull();
  });

  it("parses combos", () => {
    const doc = parseKeymap(SAMPLE);
    expect(doc.combos).toHaveLength(1);
    expect(doc.combos[0]).toMatchObject({
      name: "combo_jk",
      keyPositions: [1, 2],
      bindings: "&kp ESC",
      timeoutMs: 50,
    });
  });

  it("recognizes #define-aligned layer names via displayName", () => {
    const doc = parseKeymap(SAMPLE);
    // MOUSE is layer index 2 here, not 4, so the define doesn't align;
    // the parser falls back to a humanized form.
    expect(doc.layers[2].displayName).toBe("MOUSE");
  });

  it("keeps the original source text for round-trip", () => {
    const doc = parseKeymap(SAMPLE);
    expect(doc.originalText).toBe(SAMPLE);
  });
});
