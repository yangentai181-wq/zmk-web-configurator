import { describe, it, expect } from "vitest";
import { parseKeymap } from "./keymap-parser";
import {
  generateKeymap,
  makeBinding,
  parseRawBinding,
} from "./keymap-generator";

const SAMPLE = `/ {
    keymap {
        compatible = "zmk,keymap";

        default_layer {
            bindings = <
&kp A   &kp B   &kp C
            >;
        };

        number_layer {
            bindings = <
&kp N1   &kp N2   &kp N3
            >;
        };
    };
};
`;

describe("generateKeymap", () => {
  it("reproduces the original source when no edits are applied", () => {
    const doc = parseKeymap(SAMPLE);
    const out = generateKeymap(doc);
    // Should still parse to the same layer structure
    const reparsed = parseKeymap(out);
    expect(reparsed.layers.map((l) => l.bindings.map((b) => b.raw))).toEqual(
      doc.layers.map((l) => l.bindings.map((b) => b.raw)),
    );
  });

  it("substitutes only the modified layer's bindings", () => {
    const doc = parseKeymap(SAMPLE);
    // Change layer 0 key 1 from B to K
    doc.layers[0].bindings[1] = makeBinding("kp", ["K"]);
    const out = generateKeymap(doc);

    // Re-parse to verify
    const reparsed = parseKeymap(out);
    expect(reparsed.layers[0].bindings[1].raw).toBe("&kp K");
    // Other keys in layer 0 untouched
    expect(reparsed.layers[0].bindings[0].raw).toBe("&kp A");
    expect(reparsed.layers[0].bindings[2].raw).toBe("&kp C");
    // Layer 1 completely untouched
    expect(reparsed.layers[1].bindings.map((b) => b.raw)).toEqual([
      "&kp N1",
      "&kp N2",
      "&kp N3",
    ]);
  });

  it("preserves surrounding macros / combos / comments", () => {
    const src = `/ {
    macros {
        my_macro: my_macro {
            compatible = "zmk,behavior-macro";
        };
    };
    keymap {
        compatible = "zmk,keymap";
        default_layer {
            bindings = < &kp A >;
        };
    };
    combos {
        compatible = "zmk,combos";
    };
};
`;
    const doc = parseKeymap(src);
    doc.layers[0].bindings[0] = makeBinding("kp", ["B"]);
    const out = generateKeymap(doc);
    expect(out).toContain("my_macro");
    expect(out).toContain("zmk,combos");
    expect(out).toContain("&kp B");
    expect(out).not.toContain("&kp A");
  });
});

describe("makeBinding / parseRawBinding", () => {
  it("makeBinding normalizes raw representation", () => {
    expect(makeBinding("kp", ["A"])).toEqual({
      behavior: "kp",
      params: ["A"],
      raw: "&kp A",
    });
    expect(makeBinding("trans")).toEqual({
      behavior: "trans",
      params: [],
      raw: "&trans",
    });
  });

  it("parseRawBinding round-trips with makeBinding output", () => {
    const b = parseRawBinding("&lt FN SPACE");
    expect(b).toEqual({
      behavior: "lt",
      params: ["FN", "SPACE"],
      raw: "&lt FN SPACE",
    });
    expect(parseRawBinding("&trans")).toEqual({
      behavior: "trans",
      params: [],
      raw: "&trans",
    });
  });

  it("parseRawBinding returns null for empty input", () => {
    expect(parseRawBinding("")).toBeNull();
    expect(parseRawBinding("   ")).toBeNull();
  });
});
