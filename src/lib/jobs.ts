import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { JOBS_ROOT, jobFile } from "./scans";

export const STAGES = ["extract", "reconstruct", "bake", "aimesh", "roomplan"] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  extract: "pulling frames",
  reconstruct: "solving cameras",
  bake: "baking a glb",
  aimesh: "ai mesh",
  roomplan: "measuring the room",
};

export const HEAVY_STAGES: ReadonlySet<Stage> = new Set<Stage>([
  "reconstruct",
  "bake",
  "aimesh",
  "roomplan",
]);

export const JOB_STATES = [
  "queued",
  "running",
  "failed",
  "done",
  "cancelled",
] as const;

export type JobState = (typeof JOB_STATES)[number];

export const jobSchema = z.object({
  id: z.string(),
  setId: z.string(),
  label: z.string(),
  route: z.enum(["photogrammetry", "ai", "frames", "roomplan"]),
  stages: z.array(z.enum(STAGES)).min(1),
  stageIndex: z.number().int().min(0),
  state: z.enum(JOB_STATES),
  progress: z.number().min(0).max(1),
  message: z.string(),
  error: z.string().nullable(),
  frames: z.number().int().nullable(),
  glb: z.string().nullable(),
  maxDim: z.number().int(),
  masks: z.boolean(),
  sequential: z.boolean(),
  sparseOnly: z.boolean(),
  ceiling: z.number(),
  targetFrames: z.number().int(),
  cancelRequested: z.boolean(),
  createdAt: z.number(),
  startedAt: z.number().nullable(),
  endedAt: z.number().nullable(),
});

export type ScanJob = z.infer<typeof jobSchema>;

export type NewJob = {
  setId: string;
  label: string;
  route: ScanJob["route"];
  stages: Stage[];
  maxDim?: number;
  masks?: boolean;
  sequential?: boolean;
  sparseOnly?: boolean;
  ceiling?: number;
  targetFrames?: number;
};

const locks = new Map<string, Promise<unknown>>();

function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(id) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  locks.set(
    id,
    next.catch(() => undefined),
  );
  return next;
}

export async function createJob(input: NewJob): Promise<ScanJob> {
  const job: ScanJob = {
    id: crypto.randomUUID(),
    setId: input.setId,
    label: input.label.trim().slice(0, 80) || "untitled",
    route: input.route,
    stages: input.stages,
    stageIndex: 0,
    state: "queued",
    progress: 0,
    message: "waiting for a slot",
    error: null,
    frames: null,
    glb: null,
    maxDim: input.maxDim ?? 2000,
    masks: input.masks ?? false,
    sequential: input.sequential ?? false,
    sparseOnly: input.sparseOnly ?? false,
    ceiling: input.ceiling ?? 2.4,
    targetFrames: input.targetFrames ?? 120,
    cancelRequested: false,
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
  };
  await mkdir(JOBS_ROOT, { recursive: true });
  await save(job);
  return job;
}

export async function readJob(id: string): Promise<ScanJob | null> {
  try {
    const parsed = jobSchema.safeParse(
      JSON.parse(await readFile(jobFile(id), "utf8")),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function listJobs(): Promise<ScanJob[]> {
  let names: string[];
  try {
    names = await readdir(JOBS_ROOT);
  } catch {
    return [];
  }
  const jobs = await Promise.all(
    names
      .filter((n) => n.endsWith(".json"))
      .map((n) => readJob(path.basename(n, ".json"))),
  );
  return jobs
    .filter((j): j is ScanJob => j !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function patchJob(
  id: string,
  patch: Partial<ScanJob>,
): Promise<ScanJob | null> {
  return withLock(id, async () => {
    const current = await readJob(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    await save(next);
    return next;
  });
}

export async function deleteJob(id: string): Promise<void> {
  await unlink(jobFile(id)).catch(() => undefined);
}

export function stageOf(job: ScanJob): Stage | null {
  return job.stages[job.stageIndex] ?? null;
}

export function isOpen(job: ScanJob): boolean {
  return job.state === "queued" || job.state === "running";
}

async function save(job: ScanJob): Promise<void> {
  const target = jobFile(job.id);
  const temp = `${target}.${process.pid}.tmp`;
  await mkdir(JOBS_ROOT, { recursive: true });
  await writeFile(temp, JSON.stringify(job, null, 2), "utf8");
  await rename(temp, target);
}
