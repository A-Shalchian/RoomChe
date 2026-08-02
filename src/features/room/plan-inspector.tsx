"use client";

import { area, perimeter, type RoomPlan, type Segment } from "./plan";
import type { Selection } from "./use-plan";
import { Row, NumberField, ColourField, Small } from "./controls";

export function PlanInspector({
  plan,
  segs,
  selection,
  onPatch,
  onWallLength,
  onWallColour,
  onPaintAll,
  onSplitWall,
  onDeletePoint,
  onMovePoint,
  onAddOpening,
  onUpdateOpening,
  onRemoveOpening,
}: {
  plan: RoomPlan;
  segs: Segment[];
  selection: Selection;
  onPatch: (next: Partial<RoomPlan>) => void;
  onWallLength: (index: number, metres: number) => void;
  onWallColour: (index: number, colour: string) => void;
  onPaintAll: (colour: string) => void;
  onSplitWall: (index: number) => void;
  onDeletePoint: (index: number) => void;
  onMovePoint: (index: number, x: number, z: number) => void;
  onAddOpening: (wall: number, kind: "door" | "window") => void;
  onUpdateOpening: (id: string, next: Record<string, number>) => void;
  onRemoveOpening: (id: string) => void;
}) {
  if (selection?.kind === "wall") {
    const seg = segs[selection.index];
    if (!seg) return null;
    return (
      <Panel title={`wall ${selection.index + 1}`}>
        <NumberField
          label="length m"
          value={seg.length}
          step={0.05}
          onChange={(v) => onWallLength(selection.index, v)}
        />
        <ColourField
          label="paint"
          value={plan.walls[selection.index]?.colour ?? "#e8e4dc"}
          onChange={(c) => onWallColour(selection.index, c)}
        />
        <div className="flex flex-wrap gap-2">
          <Small onClick={() => onAddOpening(selection.index, "door")}>
            add door
          </Small>
          <Small onClick={() => onAddOpening(selection.index, "window")}>
            add window
          </Small>
          <Small onClick={() => onSplitWall(selection.index)}>split</Small>
        </div>
      </Panel>
    );
  }

  if (selection?.kind === "point") {
    const p = plan.points[selection.index];
    if (!p) return null;
    return (
      <Panel title={`corner ${selection.index + 1}`}>
        <NumberField
          label="x"
          value={p.x}
          step={0.25}
          onChange={(v) => onMovePoint(selection.index, v, p.z)}
        />
        <NumberField
          label="z"
          value={p.z}
          step={0.25}
          onChange={(v) => onMovePoint(selection.index, p.x, v)}
        />
        <Small onClick={() => onDeletePoint(selection.index)}>
          delete corner
        </Small>
      </Panel>
    );
  }

  if (selection?.kind === "opening") {
    const o = plan.openings.find((x) => x.id === selection.id);
    if (!o) return null;
    const wallLength = segs[o.wall]?.length ?? 0;
    return (
      <Panel title={o.kind}>
        <Row label="on">wall {o.wall + 1}, {wallLength.toFixed(2)} m</Row>
        <NumberField
          label="from corner"
          value={o.offset}
          step={0.05}
          onChange={(v) => onUpdateOpening(o.id, { offset: v })}
        />
        <NumberField
          label="width"
          value={o.width}
          step={0.05}
          onChange={(v) => onUpdateOpening(o.id, { width: v })}
        />
        <NumberField
          label="height"
          value={o.height}
          step={0.05}
          onChange={(v) => onUpdateOpening(o.id, { height: v })}
        />
        <NumberField
          label="sill"
          value={o.sill}
          step={0.05}
          onChange={(v) => onUpdateOpening(o.id, { sill: v })}
        />
        <Small onClick={() => onRemoveOpening(o.id)}>remove</Small>
      </Panel>
    );
  }

  return (
    <Panel title="room">
      <label className="flex items-center gap-2">
        <span
          className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--lv-ink-2)" }}
        >
          name
        </span>
        <input
          value={plan.name}
          onChange={(e) => onPatch({ name: e.target.value.slice(0, 60) })}
          className="min-w-0 flex-1 border-[2px] bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] outline-none"
          style={{ borderColor: "var(--lv-ink)", color: "var(--lv-ink)" }}
        />
      </label>
      <NumberField
        label="wall height"
        value={plan.wallHeight}
        step={0.05}
        onChange={(v) => onPatch({ wallHeight: Math.min(5, Math.max(1.5, v)) })}
      />
      <ColourField
        label="floor"
        value={plan.floorColour}
        onChange={(c) => onPatch({ floorColour: c })}
      />
      <ColourField
        label="all walls"
        value={plan.walls[0]?.colour ?? "#e8e4dc"}
        onChange={onPaintAll}
      />
      <Row label="area">{area(plan.points).toFixed(2)} m²</Row>
      <Row label="perimeter">{perimeter(plan.points).toFixed(2)} m</Row>
      <Row label="openings">
        {plan.openings.filter((o) => o.kind === "door").length} doors,{" "}
        {plan.openings.filter((o) => o.kind === "window").length} windows
      </Row>
      <Row label="tip">click a wall to paint it or cut an opening</Row>
    </Panel>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span
        className="font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{ color: "var(--lv-accent)" }}
      >
        ● {title}
      </span>
      {children}
    </div>
  );
}
