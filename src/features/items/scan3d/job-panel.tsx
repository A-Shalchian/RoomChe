"use client";

import Link from "next/link";
import { useJobs, type JobView } from "./use-jobs";

const STAGE_COPY: Record<string, string> = {
  extract: "frames",
  reconstruct: "solve",
  bake: "glb",
  aimesh: "ai mesh",
};

export function JobPanel() {
  const { jobs, error, dismiss } = useJobs();

  if (jobs.length === 0 && !error) return null;

  return (
    <section
      className="flex flex-col gap-3 border-[3px] p-4"
      style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
    >
      <header className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
        <span aria-hidden style={{ color: "var(--lv-accent)" }}>
          ●
        </span>
        workstation queue
      </header>

      {error && (
        <p
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: "var(--lv-accent)" }}
        >
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} onDismiss={() => void dismiss(job.id)} />
        ))}
      </ul>
    </section>
  );
}

function JobRow({ job, onDismiss }: { job: JobView; onDismiss: () => void }) {
  const open = job.state === "queued" || job.state === "running";
  const trail = job.stages
    .map((stage, index) => {
      const mark = index < job.stageIndex ? "·" : index === job.stageIndex ? "▸" : " ";
      return `${mark}${STAGE_COPY[stage] ?? stage}`;
    })
    .join(" ");

  return (
    <li
      className="flex flex-col gap-1.5 border-[2px] px-3 py-2"
      style={{ borderColor: "var(--lv-rule)" }}
    >
      <div className="flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
        <span className="truncate">{job.label}</span>
        <span
          className="shrink-0"
          style={{
            color: job.state === "failed" ? "var(--lv-accent)" : "var(--lv-ink-2)",
          }}
        >
          {job.state}
        </span>
      </div>

      <p
        className="font-mono text-[10px] uppercase tracking-[0.16em]"
        style={{ color: "var(--lv-ink-2)" }}
      >
        {trail}
      </p>

      {open && (
        <div className="h-1.5 w-full" style={{ background: "var(--lv-rule)" }}>
          <div
            className="h-full transition-[width] duration-500"
            style={{
              width: `${Math.round(job.progress * 100)}%`,
              background: "var(--lv-accent)",
            }}
          />
        </div>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.16em]">
        {job.error ?? job.message}
        {job.frames !== null && !job.error && ` · ${job.frames} frames`}
      </p>

      <div className="flex gap-2">
        {job.state === "done" && job.glb && (
          <Link
            href={`/app/room/3d?set=${job.setId}`}
            className="border-[2px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)]"
            style={{ borderColor: "var(--lv-ink)" }}
          >
            open in 3d
          </Link>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="border-[2px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)]"
          style={{ borderColor: "var(--lv-ink)" }}
        >
          {open ? "stop" : "dismiss"}
        </button>
      </div>
    </li>
  );
}
