import { hammingDistance, type ScanFrame } from "./scan-frame";
import {
  MIN_MEGAPIXELS,
  SCAN_TARGETS,
  type ScanSubject,
  type ScanTarget,
} from "./scan-targets";

const SOFT_RATIO = 0.45;
const DUPE_BITS = 4;
const GAP_FACTOR = 2.2;
const GAP_FLOOR = 12;
const DRIFT_LIMIT = 26;

export type ScanReport = {
  count: number;
  min: number;
  ideal: number;
  soft: string[];
  duplicates: number;
  gaps: number;
  drift: number;
  smallest: number;
  ready: boolean;
  score: number;
  notes: string[];
};

export function buildReport(
  frames: ScanFrame[],
  subject: ScanSubject,
): ScanReport {
  const target = SCAN_TARGETS[subject];
  const ordered = [...frames].sort((a, b) => a.name.localeCompare(b.name));
  const count = ordered.length;

  const softLimit = median(ordered.map((f) => f.sharpness)) * SOFT_RATIO;
  const soft = ordered.filter((f) => f.sharpness < softLimit).map((f) => f.name);

  const steps: number[] = [];
  for (let i = 1; i < ordered.length; i += 1) {
    steps.push(hammingDistance(ordered[i - 1].hash, ordered[i].hash));
  }
  const typical = median(steps);
  const gapLimit = Math.max(GAP_FLOOR, typical * GAP_FACTOR);
  const jumps = steps.filter((d) => d > gapLimit).length;
  const gaps = Math.max(0, jumps - (target.flip ? 1 : 0));
  const duplicates = steps.filter((d) => d <= DUPE_BITS).length;

  const drift = stdDev(ordered.map((f) => f.luma));
  const smallest = ordered.length
    ? Math.min(...ordered.map((f) => f.megapixels))
    : 0;

  const ready =
    count >= target.min &&
    gaps === 0 &&
    soft.length <= Math.ceil(count * 0.05) &&
    drift <= DRIFT_LIMIT &&
    smallest >= MIN_MEGAPIXELS;

  return {
    count,
    min: target.min,
    ideal: target.ideal,
    soft,
    duplicates,
    gaps,
    drift,
    smallest,
    ready,
    score: score(count, target.min, target.ideal, soft.length, gaps),
    notes: notes({ count, target, soft, gaps, duplicates, drift, smallest }),
  };
}

function score(
  count: number,
  min: number,
  ideal: number,
  soft: number,
  gaps: number,
): number {
  const coverage = Math.min(1, count / ideal) * 100;
  const penalty = gaps * 12 + soft * 2 + (count < min ? 25 : 0);
  return Math.max(0, Math.min(100, Math.round(coverage - penalty)));
}

function notes(input: {
  count: number;
  target: ScanTarget;
  soft: string[];
  gaps: number;
  duplicates: number;
  drift: number;
  smallest: number;
}): string[] {
  const out: string[] = [];
  const { count, target, soft, gaps, duplicates, drift, smallest } = input;

  if (count < target.min) {
    out.push(`${target.min - count} more photos needed, aim for ${target.ideal}`);
  } else if (count < target.ideal) {
    out.push(`usable, but ${target.ideal - count} more would close the gaps`);
  }
  if (gaps > 0) {
    out.push(
      `${gaps} jump${gaps === 1 ? "" : "s"} in the orbit beyond the flip, you moved too far between shots there`,
    );
  }
  if (target.flip && count >= target.min) {
    out.push("both halves must overlap on the sides or they will not merge");
  }
  if (soft.length > 0) {
    out.push(`${soft.length} soft frame${soft.length === 1 ? "" : "s"}, reshoot or drop them`);
  }
  if (duplicates > count * 0.25) {
    out.push(`${duplicates} near-identical pairs, you stood still, spread them out`);
  }
  if (drift > DRIFT_LIMIT) {
    out.push("brightness swings across the set, lock exposure and fix the lighting");
  }
  if (smallest < MIN_MEGAPIXELS) {
    out.push(
      `smallest photo is ${smallest.toFixed(1)}mp, shoot from the camera app at full size`,
    );
  }
  if (out.length === 0) out.push("clean set, ready to reconstruct");
  return out;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
