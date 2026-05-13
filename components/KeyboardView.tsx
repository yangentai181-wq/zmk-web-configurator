"use client";

import type { Layer, PhysicalKey } from "@/lib/types";
import { categorize, categoryColor, describe } from "@/lib/zmk-bindings";

const KEY_W = 70;
const KEY_H = 70;
const GAP = 6;
const SPLIT_GAP = 60;
const PAD = 16;

export function KeyboardView({
  layout,
  layer,
  layerNames,
  selectedPos,
  onSelect,
}: {
  layout: PhysicalKey[];
  layer: Layer;
  layerNames: string[];
  selectedPos: number | null;
  onSelect: (pos: number | null) => void;
}) {
  // Compute pixel coordinates from logical x/y; insert split gap between col 5 and col 7.
  const positioned = layout.map((k) => {
    const xUnit = k.col >= 7 ? k.col - 1 : k.col; // collapse gap
    const splitOffset = k.col >= 7 ? SPLIT_GAP : 0;
    return {
      ...k,
      px: PAD + xUnit * (KEY_W + GAP) + splitOffset,
      py: PAD + (k.y - 1) * (KEY_H + GAP),
    };
  });

  const width = Math.max(...positioned.map((k) => k.px + KEY_W)) + PAD;
  const height = Math.max(...positioned.map((k) => k.py + KEY_H)) + PAD + 60;

  // Center of split for trackball/encoder graphics
  const leftMaxX = Math.max(
    ...positioned.filter((k) => k.side === "left").map((k) => k.px + KEY_W),
  );
  const rightMinX = Math.min(
    ...positioned.filter((k) => k.side === "right").map((k) => k.px),
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block w-full max-w-full"
        style={{ minWidth: 800 }}
      >
        {/* Side labels */}
        <text x={PAD} y={12} className="fill-ink-secondary" fontSize={10}>
          LEFT (Peripheral)
        </text>
        <text x={rightMinX} y={12} className="fill-ink-secondary" fontSize={10}>
          RIGHT (Central)
        </text>

        {/* Encoder indicator on left */}
        <g transform={`translate(${leftMaxX - 60}, ${height - 48})`}>
          <circle
            cx={20}
            cy={20}
            r={18}
            className="fill-orange-50"
            stroke="#F97316"
          />
          <text
            x={20}
            y={24}
            textAnchor="middle"
            fontSize={10}
            className="fill-accent"
          >
            ENC
          </text>
        </g>

        {/* Trackball indicator on right */}
        <g transform={`translate(${rightMinX + 14}, ${height - 48})`}>
          <circle
            cx={20}
            cy={20}
            r={18}
            className="fill-teal-50"
            stroke="#0D9488"
          />
          <text
            x={20}
            y={24}
            textAnchor="middle"
            fontSize={10}
            className="fill-primary"
          >
            TB
          </text>
        </g>

        {/* Keys */}
        {positioned.map((k) => {
          const binding = layer.bindings[k.position];
          if (!binding) return null;
          const cat = categorize(binding);
          const isSel = selectedPos === k.position;
          return (
            <KeyCap
              key={k.position}
              x={k.px}
              y={k.py}
              label={describe(binding, layerNames)}
              category={cat}
              selected={isSel}
              onClick={() => onSelect(isSel ? null : k.position)}
            />
          );
        })}
      </svg>
    </div>
  );
}

function KeyCap({
  x,
  y,
  label,
  category,
  selected,
  onClick,
}: {
  x: number;
  y: number;
  label: string;
  category: ReturnType<typeof categorize>;
  selected: boolean;
  onClick: () => void;
}) {
  const classes = categoryColor(category);
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      className="cursor-pointer"
    >
      <rect
        width={KEY_W}
        height={KEY_H}
        rx={10}
        className={[
          classes,
          selected ? "stroke-[3px] stroke-accent" : "stroke-[1px]",
        ].join(" ")}
        style={{ transition: "stroke 120ms, fill 120ms" }}
      />
      <foreignObject x={4} y={4} width={KEY_W - 8} height={KEY_H - 8}>
        <div
          className={[
            "flex h-full w-full items-center justify-center text-center text-[11px] leading-tight whitespace-pre-wrap break-words",
            selected ? "font-bold" : "font-medium",
          ].join(" ")}
        >
          {label || "—"}
        </div>
      </foreignObject>
    </g>
  );
}
