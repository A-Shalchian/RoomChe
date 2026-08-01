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
      void critiqueShot(dataUrl, angle).then((result) => {
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
