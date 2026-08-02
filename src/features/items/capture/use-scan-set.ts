"use client";

import { useCallback, useMemo, useState } from "react";
import {
  sendPhotos,
  sendVideo,
  startJob,
  type JobRoute,
} from "@/features/items/scan3d/send-scan";
import { analyzeFile, type ScanFrame } from "./scan-frame";
import { buildReport, type ScanReport } from "./scan-report";
import { SCAN_TARGETS, type ScanSubject } from "./scan-targets";

const READ_CONCURRENCY = 4;

export type ScanPhase = "idle" | "reading" | "ready" | "uploading" | "done";
export type ScanSource = "photos" | "video";

export function useScanSet(subject: ScanSubject, label: string) {
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [source, setSource] = useState<ScanSource>("photos");
  const [files, setFiles] = useState<File[]>([]);
  const [clip, setClip] = useState<File | null>(null);
  const [frames, setFrames] = useState<ScanFrame[]>([]);
  const [progress, setProgress] = useState(0);
  const [unreadable, setUnreadable] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const report = useMemo<ScanReport | null>(
    () => (frames.length > 0 ? buildReport(frames, subject) : null),
    [frames, subject],
  );

  const clear = useCallback(() => {
    setFiles([]);
    setClip(null);
    setFrames([]);
    setUnreadable([]);
    setError(null);
    setProgress(0);
    setPhase("idle");
  }, []);

  const loadPhotos = useCallback(async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const list = [...picked].sort((a, b) => a.name.localeCompare(b.name));
    setSource("photos");
    setClip(null);
    setFiles(list);
    setFrames([]);
    setUnreadable([]);
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

  const loadVideo = useCallback((picked: FileList | null) => {
    const file = picked?.[0];
    if (!file) return;
    setSource("video");
    setFiles([]);
    setFrames([]);
    setUnreadable([]);
    setError(null);
    setProgress(0);
    setClip(file);
    setPhase("ready");
  }, []);

  const send = useCallback(
    async (route: JobRoute, targetFrames: number) => {
      if (source === "photos" ? files.length === 0 : !clip) return;
      const setId = crypto.randomUUID();
      setError(null);
      setProgress(0);
      setPhase("uploading");

      try {
        if (source === "video" && clip) {
          await sendVideo(setId, clip);
          setProgress(1);
        } else {
          await sendPhotos(setId, files, setProgress);
        }

        await startJob({
          setId,
          label: label.trim() || SCAN_TARGETS[subject].label,
          subject,
          source,
          route,
          targetFrames,
        });
        setPhase("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("ready");
      }
    },
    [clip, files, label, source, subject],
  );

  return {
    phase,
    source,
    files,
    clip,
    report,
    progress,
    unreadable,
    error,
    loadPhotos,
    loadVideo,
    send,
    clear,
  };
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
