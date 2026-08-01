"use client";

import { CAPTURE_ANGLES, ANGLE_HINTS, type CaptureAngle } from "@/features/items/capture/angles";
import type { Coverage, ReviewedShot } from "@/features/items/capture/coverage";
import { isUsable } from "@/features/items/capture/coverage";
import { FLAG_COPY } from "@/features/items/capture/shot-check";

export function CaptureCoach({
  coverage,
  pending,
  nextAngle,
}: {
  coverage: Coverage;
  pending: ReviewedShot | null;
  nextAngle: CaptureAngle;
}) {
  return (
    <div
      className="flex flex-col gap-3 border-t-[3px] px-4 py-3"
      style={{ borderColor: "var(--lv-ink)" }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {CAPTURE_ANGLES.map((angle) => (
          <AngleChip
            key={angle}
            angle={angle}
            state={
              coverage.covered.includes(angle)
                ? "done"
                : angle === nextAngle
                  ? "next"
                  : "todo"
            }
          />
        ))}
        <span
          className="ml-auto font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color: coverage.ready ? "var(--lv-accent)" : "var(--lv-ink)" }}
        >
          3d ready {coverage.score}%
        </span>
      </div>

      {pending ? (
        <PendingReview shot={pending} />
      ) : (
        <Line label="next">
          {nextAngle} · {ANGLE_HINTS[nextAngle]}
        </Line>
      )}

      <Line label="status">{coverage.headline}</Line>

      {coverage.surfaceWarning && (
        <Line label="warning" accent>
          {coverage.surfaceWarning}
        </Line>
      )}
    </div>
  );
}

function PendingReview({ shot }: { shot: ReviewedShot }) {
  const flags = shot.check?.flags ?? [];
  const problems = shot.critique?.problems ?? [];
  const good = flags.length === 0 && isUsable(shot);

  const wrongAngle =
    shot.critique &&
    shot.critique.angle !== "unclear" &&
    shot.critique.angle !== shot.angle;

  return (
    <div className="flex flex-col gap-1.5">
      <Line label="this shot" accent={!good}>
        {shot.critiquing
          ? flags.length > 0
            ? `${FLAG_COPY[flags[0]]} · still reading…`
            : "reading the shot…"
          : good
            ? `usable ${shot.critique?.angle ?? shot.angle} view of ${shot.critique?.subject ?? "it"}`
            : (flags.map((f) => FLAG_COPY[f]).concat(problems)[0] ?? "retake this one")}
      </Line>

      {wrongAngle && (
        <Line label="heads up" accent>
          reads as the {shot.critique?.angle}, not the {shot.angle}
        </Line>
      )}

      {!shot.critiquing && shot.critique?.fix && (
        <Line label="fix">{shot.critique.fix}</Line>
      )}
    </div>
  );
}

function AngleChip({
  angle,
  state,
}: {
  angle: CaptureAngle;
  state: "done" | "next" | "todo";
}) {
  return (
    <span
      className="border-[2px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
      style={{
        borderColor: state === "todo" ? "color-mix(in srgb, var(--lv-ink) 35%, transparent)" : "var(--lv-ink)",
        background: state === "done" ? "var(--lv-ink)" : "transparent",
        color:
          state === "done"
            ? "var(--lv-bg)"
            : state === "next"
              ? "var(--lv-accent)"
              : "color-mix(in srgb, var(--lv-ink) 45%, transparent)",
      }}
    >
      {angle}
    </span>
  );
}

function Line({
  label,
  children,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <p className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed">
      <span style={{ color: "color-mix(in srgb, var(--lv-ink) 50%, transparent)" }}>
        {label}
      </span>
      <span style={{ color: accent ? "var(--lv-accent)" : "var(--lv-ink)" }}>
        {children}
      </span>
    </p>
  );
}
