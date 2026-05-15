"use client";

import { useEffect, useState } from "react";
import type { Layer, PhysicalKey } from "@/lib/types";
import type { EncoderSample, PointerSample } from "@/lib/use-webhid";
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
  pressed,
  pointer,
  encoders,
  comboSelectMode,
  selectedComboKeys,
  comboHighlightKeys,
  onSelect,
  onToggleComboKey,
}: {
  layout: PhysicalKey[];
  layer: Layer;
  layerNames: string[];
  selectedPos: number | null;
  pressed?: ReadonlySet<number>;
  pointer?: PointerSample | null;
  encoders?: Readonly<Record<number, EncoderSample>>;
  /** When true, key clicks toggle membership in `selectedComboKeys` instead of moving `selectedPos`. */
  comboSelectMode?: boolean;
  selectedComboKeys?: ReadonlySet<number>;
  /** Keys that belong to existing combos (faint outline so users can see what's already used). */
  comboHighlightKeys?: ReadonlySet<number>;
  onSelect: (pos: number | null) => void;
  onToggleComboKey?: (pos: number) => void;
}) {
  // Tick the wall clock every 80ms so the live indicators fade out smoothly
  // even when no new HID frame arrives.
  const now = useNow(80);
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

        {/* Encoder indicator on left (live: rotation arrow + delta number) */}
        <EncoderMarker
          x={leftMaxX - 60}
          y={height - 48}
          sample={encoders?.[0]}
          now={now}
        />

        {/* Trackball indicator on right (live: velocity vector arrow) */}
        <TrackballMarker
          x={rightMinX + 14}
          y={height - 48}
          pointer={pointer ?? null}
          now={now}
        />

        {/* Keys */}
        {positioned.map((k) => {
          const binding = layer.bindings[k.position];
          if (!binding) return null;
          const cat = categorize(binding);
          const isPressed = pressed?.has(k.position) ?? false;
          const inCombo = comboSelectMode
            ? (selectedComboKeys?.has(k.position) ?? false)
            : false;
          const inExistingCombo = comboHighlightKeys?.has(k.position) ?? false;
          const isSel = !comboSelectMode && selectedPos === k.position;
          return (
            <KeyCap
              key={k.position}
              x={k.px}
              y={k.py}
              label={describe(binding, layerNames)}
              category={cat}
              selected={isSel}
              pressed={isPressed}
              comboSelected={inCombo}
              comboHinted={inExistingCombo}
              onClick={() =>
                comboSelectMode
                  ? onToggleComboKey?.(k.position)
                  : onSelect(isSel ? null : k.position)
              }
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
  pressed,
  comboSelected,
  comboHinted,
  onClick,
}: {
  x: number;
  y: number;
  label: string;
  category: ReturnType<typeof categorize>;
  selected: boolean;
  pressed: boolean;
  comboSelected?: boolean;
  comboHinted?: boolean;
  onClick: () => void;
}) {
  // visual priority:
  //   pressed (teal fill, live)  >  comboSelected (orange fill, picking)
  //   >  selected (orange stroke, detail view)  >  base color
  const classes = pressed
    ? "fill-primary stroke-primary"
    : comboSelected
      ? "fill-accent stroke-accent"
      : categoryColor(category);
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
          selected
            ? "stroke-[3px] stroke-accent"
            : comboHinted
              ? "stroke-[2px] stroke-accent/40"
              : "stroke-[1px]",
        ].join(" ")}
        style={{ transition: "stroke 80ms, fill 80ms" }}
      />
      <foreignObject x={4} y={4} width={KEY_W - 8} height={KEY_H - 8}>
        <div
          className={[
            "flex h-full w-full items-center justify-center text-center text-[11px] leading-tight whitespace-pre-wrap break-words",
            pressed
              ? "font-bold text-white"
              : selected
                ? "font-bold"
                : "font-medium",
          ].join(" ")}
        >
          {label || "—"}
        </div>
      </foreignObject>
    </g>
  );
}

const TB_RADIUS = 18;
const POINTER_FADE_MS = 400;
const POINTER_ARROW_GAIN = 0.6;
const POINTER_ARROW_MAX = 32;

function TrackballMarker({
  x,
  y,
  pointer,
  now,
}: {
  x: number;
  y: number;
  pointer: PointerSample | null;
  now: number;
}) {
  const elapsed = pointer ? now - pointer.at : Infinity;
  const fresh = pointer && elapsed < POINTER_FADE_MS;
  const fade = fresh ? 1 - elapsed / POINTER_FADE_MS : 0;

  let ax = 0;
  let ay = 0;
  if (fresh && pointer) {
    const mag = Math.hypot(pointer.dx, pointer.dy);
    const scale =
      mag > 0 ? Math.min(POINTER_ARROW_MAX, mag * POINTER_ARROW_GAIN) / mag : 0;
    ax = pointer.dx * scale;
    ay = pointer.dy * scale;
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <defs>
        <marker
          id="tb-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0D9488" />
        </marker>
      </defs>
      <circle
        cx={20}
        cy={20}
        r={TB_RADIUS}
        className="fill-teal-50"
        stroke="#0D9488"
        strokeOpacity={0.4 + 0.6 * fade}
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
      {fresh && (ax !== 0 || ay !== 0) && (
        <line
          x1={20}
          y1={20}
          x2={20 + ax}
          y2={20 + ay}
          stroke="#0D9488"
          strokeWidth={2}
          strokeOpacity={fade}
          markerEnd="url(#tb-arrow)"
        />
      )}
    </g>
  );
}

const ENC_RADIUS = 18;
const ENCODER_FADE_MS = 600;

function EncoderMarker({
  x,
  y,
  sample,
  now,
}: {
  x: number;
  y: number;
  sample?: EncoderSample;
  now: number;
}) {
  const elapsed = sample ? now - sample.at : Infinity;
  const fresh = sample && elapsed < ENCODER_FADE_MS;
  const fade = fresh ? 1 - elapsed / ENCODER_FADE_MS : 0;
  const symbol = !fresh ? "" : sample!.delta > 0 ? "↻" : "↺";

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle
        cx={20}
        cy={20}
        r={ENC_RADIUS}
        className="fill-orange-50"
        stroke="#F97316"
        strokeOpacity={0.4 + 0.6 * fade}
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
      {fresh && (
        <text
          x={45}
          y={26}
          fontSize={18}
          fill="#F97316"
          opacity={fade}
          fontWeight="bold"
        >
          {symbol}
        </text>
      )}
    </g>
  );
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
