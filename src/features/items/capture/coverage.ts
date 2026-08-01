import { REQUIRED_ANGLES, type CaptureAngle } from "./angles";
import type { Critique } from "./critique-action";
import type { ShotCheck } from "./shot-check";

export type ReviewedShot = {
  id: string;
  dataUrl: string;
  angle: CaptureAngle;
  check: ShotCheck | null;
  critique: Critique | null;
  critiquing: boolean;
};

export type Coverage = {
  covered: CaptureAngle[];
  missing: CaptureAngle[];
  weak: number;
  score: number;
  ready: boolean;
  headline: string;
  surfaceWarning: string | null;
};

const BLOCKING_FLAGS = new Set(["blurry", "dark", "bright", "cut-off"]);

export function resolveAngle(shot: ReviewedShot): CaptureAngle {
  const detected = shot.critique?.angle;
  if (!detected || detected === "unclear") return shot.angle;
  return detected;
}

export function isUsable(shot: ReviewedShot): boolean {
  if (shot.critique?.verdict === "retake") return false;
  if (shot.critique?.cropped || shot.critique?.occluded) return false;
  return !shot.check?.flags.some((f) => BLOCKING_FLAGS.has(f));
}

export function assess(shots: ReviewedShot[]): Coverage {
  const covered: CaptureAngle[] = [];
  let weak = 0;

  for (const shot of shots) {
    if (!isUsable(shot)) {
      weak += 1;
      continue;
    }
    const angle = resolveAngle(shot);
    if (!covered.includes(angle)) covered.push(angle);
  }

  const missing = REQUIRED_ANGLES.filter((a) => !covered.includes(a));
  const bonus = covered.filter((a) => !REQUIRED_ANGLES.includes(a)).length;
  const ready = missing.length === 0;
  const score = Math.min(
    100,
    Math.round((covered.filter((a) => REQUIRED_ANGLES.includes(a)).length / REQUIRED_ANGLES.length) * 80) +
      bonus * 10,
  );

  return {
    covered,
    missing,
    weak,
    score,
    ready,
    headline: headline(shots.length, missing, weak, ready),
    surfaceWarning: surfaceWarning(shots),
  };
}

function headline(
  total: number,
  missing: CaptureAngle[],
  weak: number,
  ready: boolean,
): string {
  if (total === 0) return "start with the front";
  if (weak > 0 && missing.length > 0) {
    return `${weak} shot${weak === 1 ? "" : "s"} need redoing, still missing ${missing.join(", ")}`;
  }
  if (weak > 0) return `${weak} shot${weak === 1 ? "" : "s"} need redoing`;
  if (ready) return "enough for a 3d model, extra angles only make it better";
  return `still need ${missing.join(", ")}`;
}

function surfaceWarning(shots: ReviewedShot[]): string | null {
  const surfaces = shots.map((s) => s.critique?.surface).filter(Boolean);
  if (surfaces.includes("transparent")) {
    return "transparent surfaces do not reconstruct. expect a rough shape at best";
  }
  if (surfaces.includes("glossy") || surfaces.includes("mixed")) {
    return "shiny surface: shoot in soft even light and add two extra angles";
  }
  return null;
}
