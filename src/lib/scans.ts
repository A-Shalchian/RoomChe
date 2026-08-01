import path from "node:path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SCANS_ROOT = path.join(process.cwd(), ".scans");

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

export function framePath(setId: string, index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 9999) {
    throw new Error("bad frame index");
  }
  return path.join(rawDir(setId), `${String(index).padStart(4, "0")}.jpg`);
}
