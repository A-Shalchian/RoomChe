"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type JobView = {
  id: string;
  setId: string;
  label: string;
  route: "photogrammetry" | "ai";
  stages: string[];
  stageIndex: number;
  state: "queued" | "running" | "failed" | "done" | "cancelled";
  progress: number;
  message: string;
  error: string | null;
  frames: number | null;
  glb: string | null;
  createdAt: number;
};

const IDLE_MS = 8000;
const BUSY_MS = 2000;

export function useJobs() {
  const [jobs, setJobs] = useState<JobView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs", { cache: "no-store" });
      if (!res.ok) throw new Error(`jobs request failed with ${res.status}`);
      const data = (await res.json()) as { jobs: JobView[] };
      setJobs(data.jobs);
      setError(null);
      return data.jobs;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function loop() {
      const current = await refresh();
      if (!alive) return;
      const busy = current.some(
        (j) => j.state === "queued" || j.state === "running",
      );
      timer.current = setTimeout(loop, busy ? BUSY_MS : IDLE_MS);
    }

    void loop();
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  const dismiss = useCallback(
    async (id: string) => {
      await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      await refresh();
    },
    [refresh],
  );

  const active = jobs.filter(
    (j) => j.state === "queued" || j.state === "running",
  ).length;

  return { jobs, active, error, refresh, dismiss };
}
