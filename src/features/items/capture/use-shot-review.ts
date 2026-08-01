"use client";

import { useCallback, useMemo, useState } from "react";
import { CAPTURE_ANGLES, REQUIRED_ANGLES, type CaptureAngle } from "./angles";
import { assess, resolveAngle, type ReviewedShot } from "./coverage";
import { critiqueShot } from "./critique-action";
import { checkShot } from "./shot-check";

export function useShotReview() {
  const [kept, setKept] = useState<ReviewedShot[]>([]);
  const [pending, setPending] = useState<ReviewedShot | null>(null);

  const all = useMemo(
    () => (pending ? [...kept, pending] : kept),
    [kept, pending],
  );
  const coverage = useMemo(() => assess(all), [all]);

  const nextAngle = useMemo<CaptureAngle>(() => {
    const taken = kept.map(resolveAngle);
    const missing = REQUIRED_ANGLES.find((a) => !taken.includes(a));
    if (missing) return missing;
    return CAPTURE_ANGLES.find((a) => !taken.includes(a)) ?? "detail";
  }, [kept]);

  const patch = useCallback((id: string, next: Partial<ReviewedShot>) => {
    setPending((prev) => (prev && prev.id === id ? { ...prev, ...next } : prev));
    setKept((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...next } : s)),
    );
  }, []);

  const capture = useCallback(
    (canvas: HTMLCanvasElement, dataUrl: string, angle: CaptureAngle) => {
      const shot: ReviewedShot = {
        id: crypto.randomUUID(),
        dataUrl,
        angle,
        check: checkShot(canvas),
        critique: null,
        critiquing: true,
      };
      setPending(shot);
      void critiqueShot(shrink(canvas), angle).then((result) => {
        patch(shot.id, {
          critiquing: false,
          critique: result.ok ? result.critique : null,
        });
      });
    },
    [patch],
  );

  const accept = useCallback(() => {
    setPending((prev) => {
      if (prev) setKept((shots) => [...shots, prev]);
      return null;
    });
  }, []);

  const discard = useCallback(() => setPending(null), []);

  const reset = useCallback(() => {
    setKept([]);
    setPending(null);
  }, []);

  return { kept, pending, all, coverage, nextAngle, capture, accept, discard, reset };
}

const CRITIQUE_MAX_DIM = 1024;

function shrink(source: HTMLCanvasElement): string {
  const scale = Math.min(
    1,
    CRITIQUE_MAX_DIM / Math.max(source.width, source.height),
  );
  if (scale === 1) return source.toDataURL("image/jpeg", 0.8);
  const small = document.createElement("canvas");
  small.width = Math.round(source.width * scale);
  small.height = Math.round(source.height * scale);
  const ctx = small.getContext("2d");
  if (!ctx) return source.toDataURL("image/jpeg", 0.8);
  ctx.drawImage(source, 0, 0, small.width, small.height);
  return small.toDataURL("image/jpeg", 0.8);
}
