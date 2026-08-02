import path from "node:path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SCANS_ROOT = path.join(process.cwd(), ".scans");

export const JOBS_ROOT = path.join(SCANS_ROOT, "_jobs");

export function scanDir(setId: string): string {
  if (!UUID.test(setId)) throw new Error("bad scan id");
  return path.join(SCANS_ROOT, setId);
}

export function rawDir(setId: string): string {
  return path.join(scanDir(setId), "raw");
}

export function maskDir(setId: string): string {
  return path.join(scanDir(setId), "masks");
}

export function sourceDir(setId: string): string {
  return path.join(scanDir(setId), "source");
}

export function outputDir(setId: string): string {
  return path.join(scanDir(setId), "out");
}

export function glbPath(setId: string): string {
  return path.join(outputDir(setId), "model.glb");
}

export function planPath(setId: string): string {
  return path.join(outputDir(setId), "plan.json");
}

export function jobFile(jobId: string): string {
  if (!UUID.test(jobId)) throw new Error("bad job id");
  return path.join(JOBS_ROOT, `${jobId}.json`);
}

export function framePath(setId: string, index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 9999) {
    throw new Error("bad frame index");
  }
  return path.join(rawDir(setId), `${String(index).padStart(4, "0")}.jpg`);
}

export function videoPath(setId: string, extension: string): string {
  const clean = extension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  if (!clean) throw new Error("bad video extension");
  return path.join(sourceDir(setId), `clip.${clean}`);
}
