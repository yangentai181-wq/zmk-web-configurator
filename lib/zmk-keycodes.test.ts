import { describe, it, expect } from "vitest";
import { encodeKeyCode, encodeModifier } from "./zmk-keycodes";

describe("encodeKeyCode", () => {
  it("encodes plain letters on the keyboard usage page (0x07)", () => {
    expect(encodeKeyCode("A")).toBe(0x00070004);
    expect(encodeKeyCode("K")).toBe(0x0007000e);
    expect(encodeKeyCode("Z")).toBe(0x0007001d);
  });

  it("encodes ZMK-style number keys (N1..N0)", () => {
    expect(encodeKeyCode("N1")).toBe(0x0007001e);
    expect(encodeKeyCode("N0")).toBe(0x00070027);
  });

  it("encodes common control keys", () => {
    expect(encodeKeyCode("ENTER")).toBe(0x00070028);
    expect(encodeKeyCode("ESC")).toBe(0x00070029);
    expect(encodeKeyCode("TAB")).toBe(0x0007002b);
    expect(encodeKeyCode("SPACE")).toBe(0x0007002c);
    expect(encodeKeyCode("BSPC")).toBe(0x0007002a);
  });

  it("encodes consumer-page media keys with usage page 0x0C", () => {
    expect(encodeKeyCode("C_VOLUME_UP")).toBe(0x000c00e9);
    expect(encodeKeyCode("C_VOLUME_DOWN")).toBe(0x000c00ea);
    expect(encodeKeyCode("C_MUTE")).toBe(0x000c00e2);
    expect(encodeKeyCode("C_PLAY_PAUSE")).toBe(0x000c00cd);
  });

  it("encodes modifier names as their HID usage on page 0x07", () => {
    // LSHIFT → usage 0xE1
    expect(encodeKeyCode("LSHIFT")).toBe(0x000700e1);
    expect(encodeKeyCode("LCTRL")).toBe(0x000700e0);
    expect(encodeKeyCode("LCMD")).toBe(0x000700e3);
  });

  it("applies the explicit modifier mask in the high byte for LC()/LS()/...", () => {
    // LC(A) = Ctrl + A: bit24=LCTRL(0x01), low=Keyboard A
    expect(encodeKeyCode("LC(A)")).toBe(0x01000000 | 0x00070004);
    // LS(TAB) = Shift + Tab
    expect(encodeKeyCode("LS(TAB)")).toBe(0x02000000 | 0x0007002b);
    // Nested LC(LS(TAB)) = Ctrl+Shift+Tab
    expect(encodeKeyCode("LC(LS(TAB))")).toBe(
      0x01000000 | 0x02000000 | 0x0007002b,
    );
  });

  it("returns null for unknown keycodes", () => {
    expect(encodeKeyCode("NOT_A_REAL_KEY")).toBeNull();
    expect(encodeKeyCode("")).toBeNull();
  });
});

describe("encodeModifier", () => {
  it("returns the modifier bit position used by &mt", () => {
    expect(encodeModifier("LSHIFT")).toBe(0x02);
    expect(encodeModifier("LCTRL")).toBe(0x01);
    expect(encodeModifier("LALT")).toBe(0x04);
    expect(encodeModifier("LCMD")).toBe(0x08);
    expect(encodeModifier("RSHIFT")).toBe(0x20);
  });

  it("returns null for non-modifier names", () => {
    expect(encodeModifier("A")).toBeNull();
    expect(encodeModifier("SPACE")).toBeNull();
  });
});
