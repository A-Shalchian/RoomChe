"use client";

import { useRef, useState } from "react";
import { bounds, GRID, type Point, type RoomPlan, type Segment } from "./plan";
import type { Mode, Selection } from "./use-plan";

const MARGIN = 1.2;
const HANDLE = 0.12;
const ASPECT = 4 / 3;

function ticks(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = Math.floor(from / step) * step; v <= to + step; v += step) {
    out.push(Number(v.toFixed(3)));
  }
  return out;
}

export function PlanCanvas({
  plan,
  segs,
  mode,
  selection,
  onSelect,
  onAddPoint,
  onMovePoint,
}: {
  plan: RoomPlan;
  segs: Segment[];
  mode: Mode;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onAddPoint: (x: number, z: number) => void;
  onMovePoint: (index: number, x: number, z: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const box = bounds(plan.points);
  const view = (() => {
    let x = box.minX - MARGIN;
    let y = box.minZ - MARGIN;
    let w = Math.max(2, box.maxX - box.minX) + MARGIN * 2;
    let h = Math.max(2, box.maxZ - box.minZ) + MARGIN * 2;
    if (w / h < ASPECT) {
      const next = h * ASPECT;
      x -= (next - w) / 2;
      w = next;
    } else {
      const next = w / ASPECT;
      y -= (next - h) / 2;
      h = next;
    }
    return { x, y, w, h };
  })();

  function toWorld(e: { clientX: number; clientY: number }): Point | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, z: p.y };
  }

  function onCanvasClick(e: React.MouseEvent) {
    if (mode !== "draw") {
      onSelect(null);
      return;
    }
    const world = toWorld(e);
    if (world) onAddPoint(world.x, world.z);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragging === null) return;
    const world = toWorld(e);
    if (world) onMovePoint(dragging, world.x, world.z);
  }

  const minorX = ticks(view.x, view.x + view.w, GRID);
  const minorY = ticks(view.y, view.y + view.h, GRID);
  const majorX = ticks(view.x, view.x + view.w, 1);
  const majorY = ticks(view.y, view.y + view.h, 1);

  return (
    <svg
      ref={svgRef}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      className="h-full w-full touch-none"
      style={{ background: "var(--lv-bg)", cursor: mode === "draw" ? "crosshair" : "default" }}
      onClick={onCanvasClick}
      onPointerMove={onPointerMove}
      onPointerUp={() => setDragging(null)}
      onPointerLeave={() => setDragging(null)}
    >
      <g stroke="var(--lv-rule)" strokeWidth={0.008} opacity={0.45}>
        {minorX.map((g) => (
          <line key={`mv${g}`} x1={g} y1={view.y} x2={g} y2={view.y + view.h} />
        ))}
        {minorY.map((g) => (
          <line key={`mh${g}`} x1={view.x} y1={g} x2={view.x + view.w} y2={g} />
        ))}
      </g>
      <g stroke="var(--lv-rule)" strokeWidth={0.018}>
        {majorX.map((g) => (
          <line key={`v${g}`} x1={g} y1={view.y} x2={g} y2={view.y + view.h} />
        ))}
        {majorY.map((g) => (
          <line key={`h${g}`} x1={view.x} y1={g} x2={view.x + view.w} y2={g} />
        ))}
      </g>

      {plan.points.length >= 3 && (
        <polygon
          points={plan.points.map((p) => `${p.x},${p.z}`).join(" ")}
          fill={plan.floorColour}
          fillOpacity={0.35}
          stroke="none"
        />
      )}

      {segs.map((seg) => {
        const active = selection?.kind === "wall" && selection.index === seg.index;
        return (
          <g key={seg.index}>
            <line
              x1={seg.a.x}
              y1={seg.a.z}
              x2={seg.b.x}
              y2={seg.b.z}
              stroke={plan.walls[seg.index]?.colour ?? "#999999"}
              strokeWidth={active ? 0.18 : 0.12}
              strokeLinecap="square"
            />
            <line
              x1={seg.a.x}
              y1={seg.a.z}
              x2={seg.b.x}
              y2={seg.b.z}
              stroke="transparent"
              strokeWidth={0.4}
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ kind: "wall", index: seg.index });
              }}
            />
            {active && (
              <text
                x={seg.mid.x}
                y={seg.mid.z - 0.18}
                textAnchor="middle"
                fontSize={0.26}
                fill="var(--lv-accent)"
                style={{ fontFamily: "monospace" }}
              >
                {seg.length.toFixed(2)}m
              </text>
            )}
          </g>
        );
      })}

      {plan.openings.map((o) => {
        const seg = segs[o.wall];
        if (!seg || seg.length === 0) return null;
        const dx = (seg.b.x - seg.a.x) / seg.length;
        const dz = (seg.b.z - seg.a.z) / seg.length;
        const active = selection?.kind === "opening" && selection.id === o.id;
        return (
          <line
            key={o.id}
            x1={seg.a.x + dx * o.offset}
            y1={seg.a.z + dz * o.offset}
            x2={seg.a.x + dx * (o.offset + o.width)}
            y2={seg.a.z + dz * (o.offset + o.width)}
            stroke={o.kind === "door" ? "var(--lv-accent)" : "#5aa9d6"}
            strokeWidth={active ? 0.22 : 0.16}
            strokeLinecap="butt"
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect({ kind: "opening", id: o.id });
            }}
          />
        );
      })}

      {plan.points.map((p, i) => {
        const active = selection?.kind === "point" && selection.index === i;
        return (
          <circle
            key={`${p.x}-${p.z}-${i}`}
            cx={p.x}
            cy={p.z}
            r={active ? HANDLE * 1.4 : HANDLE}
            fill={active ? "var(--lv-accent)" : "var(--lv-bg)"}
            stroke="var(--lv-ink)"
            strokeWidth={0.04}
            style={{ cursor: "grab" }}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as Element).releasePointerCapture?.(e.pointerId);
              setDragging(i);
              onSelect({ kind: "point", index: i });
            }}
            onClick={(e) => e.stopPropagation()}
          />
        );
      })}

      {mode === "draw" && plan.points.length > 0 && (
        <text
          x={view.x + 0.3}
          y={view.y + 0.5}
          fontSize={0.3}
          fill="var(--lv-ink-2)"
          style={{ fontFamily: "monospace" }}
        >
          {plan.points.length} corners, snapping to {GRID}m
        </text>
      )}
    </svg>
  );
}
