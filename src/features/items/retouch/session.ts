import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RetouchOp } from "./ops";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Turn = { role: "you" | "claude"; text: string };

export function sessionDir(sessionId: string): string {
  if (!UUID.test(sessionId)) throw new Error("bad session id");
  return path.join(tmpdir(), `roomche-retouch-${sessionId}`);
}

export async function versions(sessionId: string): Promise<string[]> {
  const dir = sessionDir(sessionId);
  const names = await readdir(dir).catch(() => [] as string[]);
  return names.filter((n) => n.endsWith(".png")).sort();
}

export async function latestPath(sessionId: string): Promise<string | null> {
  const all = await versions(sessionId);
  const last = all.at(-1);
  return last ? path.join(sessionDir(sessionId), last) : null;
}

export async function writeVersion(
  sessionId: string,
  data: Buffer,
): Promise<string> {
  const dir = sessionDir(sessionId);
  await mkdir(dir, { recursive: true });
  const index = (await versions(sessionId)).length;
  const file = path.join(dir, `${String(index).padStart(3, "0")}.png`);
  await writeFile(file, data);
  return file;
}

export async function dropLatest(sessionId: string): Promise<void> {
  const all = await versions(sessionId);
  if (all.length <= 1) return;
  await unlink(path.join(sessionDir(sessionId), all[all.length - 1])).catch(
    () => undefined,
  );
}

export async function readHistory(sessionId: string): Promise<Turn[]> {
  const file = path.join(sessionDir(sessionId), "history.json");
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as Turn[];
    return Array.isArray(parsed) ? parsed.slice(-12) : [];
  } catch {
    return [];
  }
}

export async function appendHistory(
  sessionId: string,
  turns: Turn[],
): Promise<void> {
  const existing = await readHistory(sessionId);
  await writeFile(
    path.join(sessionDir(sessionId), "history.json"),
    JSON.stringify([...existing, ...turns].slice(-24)),
    "utf8",
  );
}

export async function asDataUrl(file: string): Promise<string> {
  return `data:image/png;base64,${(await readFile(file)).toString("base64")}`;
}

export function applyOps(
  source: string,
  target: string,
  opsFile: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), "scripts", "photo_edit.py");
    const child = spawn(
      "python",
      ["-u", script, source, target, "--ops", opsFile],
      { stdio: "pipe", env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
    );
    let stderr = "";
    child.stderr.on("data", (b: Buffer) => (stderr += b.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(readableError(stderr)));
    });
  });
}

export async function writeOps(
  sessionId: string,
  ops: RetouchOp[],
): Promise<string> {
  const file = path.join(sessionDir(sessionId), "ops.json");
  await writeFile(file, JSON.stringify(ops), "utf8");
  return file;
}

const NULLS = new RegExp(String.fromCharCode(0), "g");
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, "g");

function readableError(raw: string): string {
  const lines = raw
    .replace(NULLS, "")
    .replace(ANSI, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (lines.at(-1) ?? "the edit failed").slice(0, 180);
}
