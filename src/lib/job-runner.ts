import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import {
  HEAVY_STAGES,
  STAGE_LABEL,
  listJobs,
  patchJob,
  readJob,
  stageOf,
  type ScanJob,
  type Stage,
} from "./jobs";
import { glbPath, rawDir, scanDir, sourceDir } from "./scans";

const HEAVY_SLOTS = 1;
const LIGHT_SLOTS = 2;
const TICK_MS = 1500;

type Runner = {
  running: Map<string, ChildProcess>;
  claimed: Set<string>;
  timer: NodeJS.Timeout | null;
};

const globalRef = globalThis as typeof globalThis & {
  __roomcheJobRunner?: Runner;
};

function runner(): Runner {
  globalRef.__roomcheJobRunner ??= {
    running: new Map(),
    claimed: new Set(),
    timer: null,
  };
  return globalRef.__roomcheJobRunner;
}

export function ensureRunner(): void {
  const state = runner();
  if (state.timer) return;
  state.timer = setInterval(() => void tick(), TICK_MS);
  state.timer.unref?.();
  void tick();
}

export function cancelRunning(jobId: string): boolean {
  const child = runner().running.get(jobId);
  if (!child) return false;
  child.kill();
  return true;
}

async function tick(): Promise<void> {
  const state = runner();
  const jobs = await listJobs();

  for (const job of jobs) {
    if (job.cancelRequested && state.running.has(job.id)) {
      cancelRunning(job.id);
    }
  }

  let heavy = 0;
  let light = 0;
  for (const id of state.claimed) {
    const job = jobs.find((j) => j.id === id);
    const stage = job ? stageOf(job) : null;
    if (stage && HEAVY_STAGES.has(stage)) heavy += 1;
    else light += 1;
  }

  const waiting = jobs
    .filter(
      (j) =>
        j.state === "queued" && !j.cancelRequested && !state.claimed.has(j.id),
    )
    .sort((a, b) => a.createdAt - b.createdAt);

  for (const job of waiting) {
    const stage = stageOf(job);
    if (!stage) continue;
    if (HEAVY_STAGES.has(stage)) {
      if (heavy >= HEAVY_SLOTS) continue;
      heavy += 1;
    } else {
      if (light >= LIGHT_SLOTS) continue;
      light += 1;
    }
    state.claimed.add(job.id);
    void start(job, stage);
  }
}

async function start(job: ScanJob, stage: Stage): Promise<void> {
  const state = runner();

  const updated = await patchJob(job.id, {
    state: "running",
    progress: 0,
    message: STAGE_LABEL[stage],
    startedAt: job.startedAt ?? Date.now(),
  });
  if (!updated) {
    state.claimed.delete(job.id);
    return;
  }

  const script = path.join(process.cwd(), "scripts", SCRIPTS[stage]);
  const child = spawn("python", ["-u", script, ...argsFor(stage, updated)], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  state.running.set(job.id, child);

  let stderr = "";
  let tail = "";
  child.stdout.on("data", (buffer: Buffer) => {
    tail += buffer.toString();
    const lines = tail.split(/\r?\n/);
    tail = lines.pop() ?? "";
    for (const line of lines) void consume(job.id, line);
  });
  child.stderr.on("data", (buffer: Buffer) => {
    stderr = (stderr + buffer.toString()).slice(-4000);
  });

  child.on("error", (err) => void finish(job.id, stage, 1, err.message));
  child.on("close", (code) => void finish(job.id, stage, code ?? 1, stderr));
}

async function consume(jobId: string, line: string): Promise<void> {
  const match = line.match(/^PROGRESS\s+([0-9.]+)\s*(.*)$/);
  if (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      await patchJob(jobId, {
        progress: Math.min(1, Math.max(0, value)),
        message: match[2].trim().slice(0, 120) || "working",
      });
    }
    return;
  }
  const frames = line.match(/^FRAMES\s+(\d+)$/);
  if (frames) await patchJob(jobId, { frames: Number(frames[1]) });
}

async function finish(
  jobId: string,
  stage: Stage,
  code: number,
  stderr: string,
): Promise<void> {
  const state = runner();
  state.running.delete(jobId);
  state.claimed.delete(jobId);

  const job = await readJob(jobId);
  if (!job) return;

  if (job.cancelRequested) {
    await patchJob(jobId, {
      state: "cancelled",
      message: "cancelled",
      endedAt: Date.now(),
    });
    return;
  }

  if (code !== 0) {
    await patchJob(jobId, {
      state: "failed",
      error: `${stage} exited ${code}: ${readableError(stderr)}`,
      message: `${stage} failed`,
      endedAt: Date.now(),
    });
    return;
  }

  const nextIndex = job.stageIndex + 1;
  if (nextIndex >= job.stages.length) {
    await patchJob(jobId, {
      state: "done",
      stageIndex: job.stageIndex,
      progress: 1,
      message: "ready",
      glb: stage === "bake" || stage === "aimesh" ? glbPath(job.setId) : job.glb,
      endedAt: Date.now(),
    });
    return;
  }

  await patchJob(jobId, {
    state: "queued",
    stageIndex: nextIndex,
    progress: 0,
    message: `queued for ${STAGE_LABEL[job.stages[nextIndex]]}`,
    glb: stage === "bake" || stage === "aimesh" ? glbPath(job.setId) : job.glb,
  });
}

const SCRIPTS: Record<Stage, string> = {
  extract: "extract_frames.py",
  reconstruct: "reconstruct.py",
  bake: "bake_glb.py",
  aimesh: "ai_mesh.py",
};

function argsFor(stage: Stage, job: ScanJob): string[] {
  const dir = scanDir(job.setId);
  switch (stage) {
    case "extract":
      return [
        sourceDir(job.setId),
        rawDir(job.setId),
        "--target",
        String(job.targetFrames),
      ];
    case "reconstruct":
      return [
        dir,
        "--max-dim",
        String(job.maxDim),
        ...(job.masks ? ["--masks"] : []),
        ...(job.sequential ? ["--sequential"] : []),
      ];
    case "bake":
      return [dir, "--out", glbPath(job.setId)];
    case "aimesh":
      return [rawDir(job.setId), "--out", glbPath(job.setId)];
  }
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
  return (lines.at(-1) ?? "unknown failure").slice(0, 200);
}
