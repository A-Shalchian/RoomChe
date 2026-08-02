"use client";

import type { RoomPlan } from "./plan";
import type { Mode } from "./use-plan";

type Stage = "empty" | "drawing" | "shaped" | "dressed";

function stageOf(plan: RoomPlan, mode: Mode): Stage {
  if (plan.points.length === 0) return "empty";
  if (mode === "draw" || plan.points.length < 3) return "drawing";
  if (plan.openings.length === 0) return "shaped";
  return "dressed";
}

const STEPS: Record<Stage, { title: string; lines: string[] }> = {
  empty: {
    title: "start at the door",
    lines: [
      "stand in the doorway looking into the room",
      "the wall you are standing in is wall 1, draw it first",
      "click its left corner, then its right corner, as you face in",
      "then keep going clockwise around the room",
    ],
  },
  drawing: {
    title: "keep going clockwise",
    lines: [
      "click each corner in turn, one click per corner",
      "do not click the first corner again, the shape closes itself",
      "faint grid is 25cm, bold grid is 1m, corners snap to 25cm",
      "rough is fine, you type the exact lengths next",
    ],
  },
  shaped: {
    title: "now make it true",
    lines: [
      "press draw corners again to stop adding",
      "click a wall to select it, then type its real length",
      "no tape measure: a normal step is about 0.75m",
      "do the two longest walls first, the rest falls into place",
      "then paint the wall and cut the door you walked in through",
    ],
  },
  dressed: {
    title: "finish it off",
    lines: [
      "a standard door is 0.9m wide and 2.05m tall",
      "a window sill is usually 0.9m off the floor, 1.2m tall",
      "drag a corner if a wall ended up in the wrong place",
      "save the room when it matches what you are standing in",
    ],
  },
};

export function PlanGuide({ plan, mode }: { plan: RoomPlan; mode: Mode }) {
  const stage = stageOf(plan, mode);
  const step = STEPS[stage];

  return (
    <div
      className="flex flex-col gap-2 border-l-[3px] pl-3"
      style={{ borderColor: "var(--lv-accent)" }}
    >
      <span
        className="font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{ color: "var(--lv-accent)" }}
      >
        {step.title}
      </span>
      <ol className="flex flex-col gap-1">
        {step.lines.map((line, i) => (
          <li
            key={line}
            className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed"
          >
            <span className="shrink-0" style={{ color: "var(--lv-ink-2)" }}>
              {i + 1}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
      {stage === "shaped" && (
        <p
          className="font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed"
          style={{ color: "var(--lv-ink-2)" }}
        >
          heads up: setting a length moves the far corner, so the next wall
          moves with it
        </p>
      )}
    </div>
  );
}
