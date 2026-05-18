import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BindingEditor } from "./BindingEditor";
import { makeBinding } from "@/lib/keymap-generator";

const LAYER_NAMES = ["Default", "Number", "Arrow", "Symbol", "MOUSE"];

describe("<BindingEditor>", () => {
  it("starts in the `kp` mode and pre-fills the existing keycode", () => {
    const onApply = vi.fn();
    const onCancel = vi.fn();
    render(
      <BindingEditor
        binding={makeBinding("kp", ["A"])}
        layerNames={LAYER_NAMES}
        onApply={onApply}
        onCancel={onCancel}
      />,
    );
    // Preview reflects the prefilled state
    expect(screen.getByText("&kp A")).toBeInTheDocument();
  });

  it("applies a new kp keycode through onApply", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <BindingEditor
        binding={makeBinding("kp", ["A"])}
        layerNames={LAYER_NAMES}
        onApply={onApply}
        onCancel={() => {}}
      />,
    );
    const input = screen.getByPlaceholderText(/A \/ N1 \/ LSHIFT/);
    await user.clear(input);
    await user.type(input, "K");
    await user.click(screen.getByRole("button", { name: "反映" }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "kp", params: ["K"], raw: "&kp K" }),
    );
  });

  it("switches to `mo` and applies a layer index", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <BindingEditor
        binding={makeBinding("kp", ["A"])}
        layerNames={LAYER_NAMES}
        onApply={onApply}
        onCancel={() => {}}
      />,
    );
    const behaviorSelect = screen.getByRole("combobox");
    await user.selectOptions(behaviorSelect, "mo");
    // Now layer picker should appear
    const layerSelect = screen.getAllByRole("combobox")[1];
    await user.selectOptions(layerSelect, "2");
    await user.click(screen.getByRole("button", { name: "反映" }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "mo", params: ["2"] }),
    );
  });

  it("disables Apply while custom raw input is empty/invalid", async () => {
    const user = userEvent.setup();
    render(
      <BindingEditor
        binding={makeBinding("kp", ["A"])}
        layerNames={LAYER_NAMES}
        onApply={() => {}}
        onCancel={() => {}}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox"), "custom");
    const raw = screen.getByPlaceholderText(/&bt BT_SEL 0/);
    await user.clear(raw);
    expect(screen.getByRole("button", { name: "反映" })).toBeDisabled();
    await user.type(raw, "&bt BT_SEL 0");
    expect(screen.getByRole("button", { name: "反映" })).not.toBeDisabled();
  });

  it("Cancel fires onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <BindingEditor
        binding={makeBinding("kp", ["A"])}
        layerNames={LAYER_NAMES}
        onApply={() => {}}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
