"use client";

import { starterPlan, type RoomPlan } from "./plan";
import { PlanCanvas } from "./plan-canvas";
import { PlanGuide } from "./plan-guide";
import { PlanInspector } from "./plan-inspector";
import { RoomScene } from "./room-scene";
import { Small } from "./controls";
import { usePlan } from "./use-plan";

export function RoomBuilder({ initial }: { initial: RoomPlan }) {
  const p = usePlan(initial);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Small
          onClick={() => p.setMode(p.mode === "draw" ? "edit" : "draw")}
          solid={p.mode === "draw"}
        >
          {p.mode === "draw" ? "drawing · click to add corners" : "draw corners"}
        </Small>
        <Small onClick={() => p.patch(starterPlan())}>reset to 4 x 3</Small>
        <Small
          onClick={() => p.patch({ points: [], walls: [], openings: [] })}
        >
          clear
        </Small>
        <span className="flex-1" />
        {p.savedAt && (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ color: "var(--lv-ink-2)" }}
          >
            saved
          </span>
        )}
        <Small onClick={() => void p.save()} disabled={p.saving || !p.closed} solid>
          {p.saving ? "saving…" : "save room"}
        </Small>
      </div>

      {p.error && (
        <p
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: "var(--lv-accent)" }}
        >
          {p.error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-4">
          <div
            className="aspect-[4/3] w-full border-[3px]"
            style={{ borderColor: "var(--lv-ink)" }}
          >
            <PlanCanvas
              plan={p.plan}
              segs={p.segs}
              mode={p.mode}
              selection={p.selection}
              onSelect={p.setSelection}
              onAddPoint={p.addPoint}
              onMovePoint={p.movePoint}
            />
          </div>

          <div
            className="flex flex-col gap-4 border-[3px] p-4"
            style={{ borderColor: "var(--lv-ink)" }}
          >
            <PlanGuide plan={p.plan} mode={p.mode} />
            <PlanInspector
              plan={p.plan}
              segs={p.segs}
              selection={p.selection}
              onPatch={p.patch}
              onWallLength={p.setWallLength}
              onWallColour={p.setWallColour}
              onPaintAll={p.paintAllWalls}
              onSplitWall={p.splitWall}
              onDeletePoint={p.deletePoint}
              onMovePoint={p.movePoint}
              onAddOpening={p.addOpening}
              onUpdateOpening={p.updateOpening}
              onRemoveOpening={p.removeOpening}
            />
          </div>
        </div>

        <div className="min-h-[420px] lg:min-h-0">
          <RoomScene plan={p.plan} />
        </div>
      </div>
    </div>
  );
}
