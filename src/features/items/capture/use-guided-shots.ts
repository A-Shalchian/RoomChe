"use client";

import { useCallback, useRef, useState } from "react";
import type { CaptureAngle } from "./angles";
import { directNextShot, endGuidedSession, type Direction } from "./direct-action";
import { checkShot, type ShotCheck } from "./shot-check";

const BLOCKING_FLAGS = new Set(["blurry", "dark", "bright", "cut-off"]);
const DIRECTOR_MAX_DIM = 1024;

export type GuidedShot = {
  id: string;
  dataUrl: string;
  angle: CaptureAngle;
  check: ShotCheck | null;
};

export type GuidedState = {
  shots: GuidedShot[];
  pending: GuidedShot | null;
  direction: Direction | null;
  thinking: boolean;
  error: string | null;
};

const OPENING = "point at the whole object and take one photo";

export function useGuidedShots() {
  const session = useRef(crypto.randomUUID());
  const [shots, setShots] = useState<GuidedShot[]>([]);
  const [pending, setPending] = useState<GuidedShot | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback((canvas: HTMLCanvasElement, dataUrl: string) => {
    const check = checkShot(canvas);
    const shot: GuidedShot = {
      id: crypto.randomUUID(),
      dataUrl,
      angle: "front",
      check,
    };
    setPending(shot);
    setError(null);

    if (check?.flags.some((f) => BLOCKING_FLAGS.has(f))) return;

    setThinking(true);
    void directNextShot(session.current, shrink(canvas)).then((result) => {
      setThinking(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDirection(result.direction);
      if (result.direction.angle !== "unclear") {
        setPending((prev) =>
          prev && prev.id === shot.id
            ? { ...prev, angle: result.direction.angle as CaptureAngle }
            : prev,
        );
      }
    });
  }, []);

  const accept = useCallback(() => {
    setPending((prev) => {
      if (prev) setShots((all) => [...all, prev]);
      return null;
    });
  }, []);

  const discard = useCallback(() => {
    setPending(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    void endGuidedSession(session.current);
    session.current = crypto.randomUUID();
    setShots([]);
    setPending(null);
    setDirection(null);
    setThinking(false);
    setError(null);
  }, []);

  const headline =
    pending && thinking
      ? "reading the shot"
      : pending && error
        ? "could not read the shot, keep it or retake"
        : direction?.retake
          ? direction.retake
          : direction
            ? direction.instruction
            : OPENING;

  return {
    shots,
    pending,
    direction,
    thinking,
    error,
    headline,
    blocked: blockingCopy(pending),
    capture,
    accept,
    discard,
    reset,
  };
}

function blockingCopy(pending: GuidedShot | null): string | null {
  const flag = pending?.check?.flags.find((f) => BLOCKING_FLAGS.has(f));
  if (!flag) return null;
  return {
    blurry: "out of focus, hold still and tap to refocus",
    dark: "too dark, add light or move to a window",
    bright: "blown out, kill the direct light",
    "cut-off": "the object is cropped, back up",
  }[flag as "blurry" | "dark" | "bright" | "cut-off"];
}

function shrink(source: HTMLCanvasElement): string {
  const scale = Math.min(
    1,
    DIRECTOR_MAX_DIM / Math.max(source.width, source.height),
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
