import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayerTabs } from "./LayerTabs";
import type { Layer } from "@/lib/types";

const LAYERS: Layer[] = [
  {
    index: 0,
    name: "default_layer",
    displayName: "Default",
    bindings: [],
    sensorBindings: null,
  },
  {
    index: 1,
    name: "number_layer",
    displayName: "Number",
    bindings: [],
    sensorBindings: null,
  },
  {
    index: 2,
    name: "fn_layer",
    displayName: "FN",
    bindings: [],
    sensorBindings: null,
  },
];

describe("<LayerTabs>", () => {
  it("renders one button per layer with the displayName visible", () => {
    render(<LayerTabs layers={LAYERS} active={0} onChange={() => {}} />);
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText("Number")).toBeInTheDocument();
    expect(screen.getByText("FN")).toBeInTheDocument();
  });

  it("fires onChange with the clicked layer index", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LayerTabs layers={LAYERS} active={0} onChange={onChange} />);
    await user.click(screen.getByText("Number"));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("highlights the live-active layer with an accent dot when not selected", () => {
    const activeLayers = new Set<number>([1]);
    render(
      <LayerTabs
        layers={LAYERS}
        active={0}
        activeLayers={activeLayers}
        onChange={() => {}}
      />,
    );
    // The accent dot is an empty span with aria-label="active layer"
    expect(screen.getByLabelText("active layer")).toBeInTheDocument();
  });

  it("does NOT show the accent dot on the selected layer (its color already changes)", () => {
    const activeLayers = new Set<number>([0]);
    render(
      <LayerTabs
        layers={LAYERS}
        active={0}
        activeLayers={activeLayers}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByLabelText("active layer")).not.toBeInTheDocument();
  });
});
