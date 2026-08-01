"use client";

import { useCallback, useMemo, useState } from "react";
import { analyzeFile, type ScanFrame } from "./scan-frame";
import { buildReport, type ScanReport } from "./scan-report";
import type { ScanSubject } from "./scan-targets";

const READ_CONCURRENCY = 4;
const UPLOAD_CONCURRENCY = 4;

export type ScanPhase = "idle" | "reading" | "ready" | "uploading" | "done";

export function useScanSet(subject: ScanSubject) {
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [frames, setFrames] = useState<ScanFrame[]>([]);
  const [progress, setProgress] = useState(0);
  const [unreadable, setUnreadable] = useState<string[]>([]);
  const [setId, setSetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const report = useMemo<ScanReport | null>(
    () => (frames.length > 0 ? buildReport(frames, subject) : null),
    [frames, subject],
  );

  const load = useCallback(async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const list = [...picked].sort((a, b) => a.name.localeCompare(b.name));
    setFiles(list);
    setFrames([]);
    setUnreadable([]);
    setSetId(null);
    setError(null);
    setProgress(0);
    setPhase("reading");

    const collected: ScanFrame[] = [];
    const skipped: string[] = [];
    let done = 0;
    await pool(list, READ_CONCURRENCY, async (file) => {
      const frame = await analyzeFile(file);
      if (frame) collected.push(frame);
      else skipped.push(file.name);
      done += 1;
      setProgress(done / list.length);
    });

    setFrames(collected);
    setUnreadable(skipped);
    setPhase("ready");
  }, []);

  const upload = useCallback(async () => {
    if (files.length === 0) return;
    const id = crypto.randomUUID();
    setSetId(id);
    setError(null);
    setProgress(0);
    setPhase("uploading");

    let done = 0;
    try {
      await pool(files, UPLOAD_CONCURRENCY, async (file, index) => {
        const body = new FormData();
        body.append("photo", file);
        body.append("index", String(index));
        const res = await fetch(`/api/scan/${id}/photo`, {
          method: "POST",
          body,
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({ error: res.status }));
          throw new Error(`${file.name}: ${detail.error}`);
        }
        done += 1;
        setProgress(done / files.length);
      });
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("ready");
    }
  }, [files]);

  const clear = useCallback(() => {
    setFiles([]);
    setFrames([]);
    setUnreadable([]);
    setSetId(null);
    setError(null);
    setProgress(0);
    setPhase("idle");
  }, []);

  return { phase, files, report, progress, unreadable, setId, error, load, upload, clear };
}

async function pool<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await fn(items[index], index);
    }
  });
  await Promise.all(workers);
}
