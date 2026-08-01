"use client";

import { useCallback, useEffect, useState } from "react";
import { uploadExtraAngles, removeAngles } from "@/features/items/angle-upload";
import type { CaptureAngle } from "@/features/items/capture/angles";
import { cutOutBackground, processItem } from "@/features/items/process-action";
import { saveProcessedItem } from "@/features/items/save-action";

const DB_NAME = "roomche-queue";
const STORE = "jobs";
const VERSION = 3;
const CONCURRENCY = 2;

export type JobStatus = "pending" | "running" | "failed" | "done";

export type JobShot = { blob: Blob; angle: CaptureAngle };

export type Job = {
  id: string;
  shots: JobShot[];
  status: JobStatus;
  error?: string;
  createdAt: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE);
      }
      db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const s = t.objectStore(STORE);
    const r = fn(s);
    if (r instanceof Promise) {
      r.then(resolve, reject);
      return;
    }
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function putJob(job: Job): Promise<void> {
  await tx("readwrite", (s) => s.put(job));
}

async function getAll(): Promise<Job[]> {
  return tx("readonly", (s) => s.getAll() as IDBRequest<Job[]>);
}

async function removeJob(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

export async function enqueue(shots: JobShot[]): Promise<void> {
  if (shots.length === 0) return;
  const job: Job = {
    id: crypto.randomUUID(),
    shots: [...shots].sort((a, b) => rank(a.angle) - rank(b.angle)),
    status: "pending",
    createdAt: Date.now(),
  };
  await putJob(job);
  emit();
}

export async function retryFailed(): Promise<void> {
  const jobs = await getAll();
  await Promise.all(
    jobs
      .filter((j) => j.status === "failed")
      .map((j) => putJob({ ...j, status: "pending", error: undefined })),
  );
  emit();
}

export async function clearDone(): Promise<void> {
  const jobs = await getAll();
  await Promise.all(jobs.filter((j) => j.status === "done").map((j) => removeJob(j.id)));
  emit();
}

function rank(angle: CaptureAngle): number {
  return angle === "front" ? 0 : 1;
}

async function cutOutExtras(
  extras: JobShot[],
  jobId: string,
): Promise<JobShot[]> {
  const out: JobShot[] = [];
  for (const [i, shot] of extras.entries()) {
    const fd = new FormData();
    fd.append(
      "photo",
      new File([shot.blob], `${jobId}-${i}.jpg`, {
        type: shot.blob.type || "image/jpeg",
      }),
    );
    const cut = await cutOutBackground(fd);
    if (!cut.ok) throw new Error(`angle ${shot.angle}: ${cut.error}`);
    out.push({
      blob: await (await fetch(cut.nobgDataUrl)).blob(),
      angle: shot.angle,
    });
  }
  return out;
}

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

async function runJob(job: Job): Promise<void> {
  await putJob({ ...job, status: "running" });
  emit();
  try {
    const [primary, ...extras] = job.shots;
    const file = new File([primary.blob], `capture-${job.id}.jpg`, {
      type: primary.blob.type || "image/jpeg",
    });
    const fd = new FormData();
    fd.append("photo", file);
    const result = await processItem(fd);
    if (!result.ok) throw new Error(result.error);
    const extraImages = await uploadExtraAngles(await cutOutExtras(extras, job.id));
    try {
      await saveProcessedItem({
        nobgDataUrl: result.nobgDataUrl,
        name: result.name,
        category: result.category,
        location: result.location,
        extraImages,
      });
    } catch (err) {
      await removeAngles(extraImages.map((e) => e.key));
      throw err;
    }
    await removeJob(job.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await putJob({ ...job, status: "failed", error: message });
  }
  emit();
}

let workerRunning = false;

async function drain(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
    while (true) {
      const jobs = await getAll();
      const running = jobs.filter((j) => j.status === "running").length;
      const slots = CONCURRENCY - running;
      const pending = jobs.filter((j) => j.status === "pending").slice(0, slots);
      if (pending.length === 0) break;
      await Promise.all(pending.map(runJob));
    }
  } finally {
    workerRunning = false;
  }
}

export type QueueSnapshot = {
  pending: number;
  running: number;
  failed: number;
  done: number;
  total: number;
};

function snapshotFrom(jobs: Job[]): QueueSnapshot {
  let pending = 0,
    running = 0,
    failed = 0,
    done = 0;
  for (const j of jobs) {
    if (j.status === "pending") pending++;
    else if (j.status === "running") running++;
    else if (j.status === "failed") failed++;
    else if (j.status === "done") done++;
  }
  return {
    pending,
    running,
    failed,
    done,
    total: pending + running + failed + done,
  };
}

export function useProcessQueue() {
  const [snap, setSnap] = useState<QueueSnapshot>({
    pending: 0,
    running: 0,
    failed: 0,
    done: 0,
    total: 0,
  });

  const refresh = useCallback(async () => {
    const jobs = await getAll();
    setSnap(snapshotFrom(jobs));
    if (jobs.some((j) => j.status === "pending")) void drain();
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => void refresh());
    const off = subscribe(() => void refresh());
    return () => {
      cancelAnimationFrame(id);
      off();
    };
  }, [refresh]);

  return { snap, retryFailed, clearDone };
}
