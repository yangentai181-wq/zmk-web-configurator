import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeyDetail } from "./KeyDetail";
import { makeBinding } from "@/lib/keymap-generator";
import type { Layer, PhysicalKey } from "@/lib/types";

const LAYOUT: PhysicalKey[] = [
  { position: 0, row: 1, col: 0, x: 0, y: 1, side: "left" },
  { position: 1, row: 1, col: 1, x: 1, y: 1, side: "left" },
];

const LAYER: Layer = {
  index: 0,
  name: "default_layer",
  displayName: "Default",
  bindings: [makeBinding("kp", ["A"]), makeBinding("kp", ["B"])],
  sensorBindings: null,
};

const LAYER_NAMES = ["Default"];

describe("<KeyDetail>", () => {
  it("shows a placeholder when no key is selected", () => {
    render(
      <KeyDetail
        layout={LAYOUT}
        layer={LAYER}
        layerNames={LAYER_NAMES}
        selectedPos={null}
      />,
    );
    expect(screen.getByText(/盤面のキーをクリック/)).toBeInTheDocument();
  });

  it("renders the selected binding's behavior and params", () => {
    render(
      <KeyDetail
        layout={LAYOUT}
        layer={LAYER}
        layerNames={LAYER_NAMES}
        selectedPos={1}
      />,
    );
    expect(screen.getByText("&kp")).toBeInTheDocument();
    // params block lists the params (here just "B"); the raw block also
    // contains "B" inside "&kp B", so we don't insist on uniqueness.
    expect(screen.getAllByText("B").length).toBeGreaterThan(0);
    // raw block — full string match is unique
    expect(screen.getByText("&kp B")).toBeInTheDocument();
  });

  it("shows the 'edited' badge when isEdited is true", () => {
    render(
      <KeyDetail
        layout={LAYOUT}
        layer={LAYER}
        layerNames={LAYER_NAMES}
        selectedPos={0}
        isEdited
        onEditBinding={() => {}}
        onResetBinding={() => {}}
      />,
    );
    expect(screen.getByText("編集済")).toBeInTheDocument();
    // Reset button only appears when isEdited
    expect(screen.getByRole("button", { name: "戻す" })).toBeInTheDocument();
  });

  it("opens the BindingEditor when Edit is clicked", async () => {
    const user = userEvent.setup();
    render(
      <KeyDetail
        layout={LAYOUT}
        layer={LAYER}
        layerNames={LAYER_NAMES}
        selectedPos={0}
        onEditBinding={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "編集" }));
    // Editor shows Apply/Cancel
    expect(screen.getByRole("button", { name: "反映" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
  });

  it("propagates Apply back through onEditBinding with the chosen position", async () => {
    const user = userEvent.setup();
    const onEditBinding = vi.fn();
    render(
      <KeyDetail
        layout={LAYOUT}
        layer={LAYER}
        layerNames={LAYER_NAMES}
        selectedPos={0}
        onEditBinding={onEditBinding}
      />,
    );
    await user.click(screen.getByRole("button", { name: "編集" }));
    // Change keycode to K
    const input = screen.getByPlaceholderText(/A \/ N1 \/ LSHIFT/);
    await user.clear(input);
    await user.type(input, "K");
    await user.click(screen.getByRole("button", { name: "反映" }));
    expect(onEditBinding).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ behavior: "kp", params: ["K"] }),
    );
  });
});
