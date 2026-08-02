"use client";

import type { ScanSubject } from "@/features/items/capture/scan-targets";

export type JobRoute = "photogrammetry" | "ai" | "frames" | "roomplan";

export type StartJobInput = {
  setId: string;
  label: string;
  subject: ScanSubject;
  source: "video" | "photos";
  route: JobRoute;
  maxDim?: number;
  targetFrames?: number;
  ceiling?: number;
};

const UPLOAD_CONCURRENCY = 4;

export async function sendPhotos(
  setId: string,
  files: Blob[],
  onProgress?: (fraction: number) => void,
): Promise<void> {
  let done = 0;
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(UPLOAD_CONCURRENCY, files.length) },
    async () => {
      while (cursor < files.length) {
        const index = cursor;
        cursor += 1;
        const body = new FormData();
        body.append("photo", files[index], `${index}.jpg`);
        body.append("index", String(index));
        const res = await fetch(`/api/scan/${setId}/photo`, {
          method: "POST",
          body,
        });
        if (!res.ok) throw new Error(await errorOf(res));
        done += 1;
        onProgress?.(done / files.length);
      }
    },
  );

  await Promise.all(workers);
}

export async function sendVideo(setId: string, file: File): Promise<void> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const res = await fetch(`/api/scan/${setId}/video?ext=${ext}`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body: file,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  if (!res.ok) throw new Error(await errorOf(res));
}

export async function startJob(input: StartJobInput): Promise<string> {
  const res = await fetch("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await errorOf(res));
  const data = (await res.json()) as { job: { id: string } };
  return data.job.id;
}

async function errorOf(res: Response): Promise<string> {
  const detail = (await res.json().catch(() => null)) as { error?: string } | null;
  return detail?.error ?? `request failed with ${res.status}`;
}
