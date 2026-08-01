"use client";

import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  useProcessQueue,
  type JobSummary,
  type JobStatus,
} from "./process-queue";

const STATUS_COPY: Record<JobStatus, string> = {
  pending: "waiting",
  running: "processing",
  failed: "failed",
  done: "done",
};

export function QueueIndicator() {
  const router = useRouter();
  const { snap, retryFailed, dismissJob } = useProcessQueue();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const wasActive = useRef(0);

  const active = snap.pending + snap.running;
  const visible = active > 0 || snap.failed > 0;

  useEffect(() => {
    if (wasActive.current > 0 && active === 0) router.refresh();
    wasActive.current = active;
  }, [active, router]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <AnimatePresence onExitComplete={() => setOpen(false)}>
        {visible && (
          <motion.button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 border-[3px] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
          >
            {active > 0 && (
              <span className="flex items-center gap-2">
                <Spinner />
                processing {active}
              </span>
            )}
            {snap.failed > 0 && (
              <span style={{ color: "var(--lv-accent)" }}>
                ✕ {snap.failed} failed
              </span>
            )}
            <motion.span
              aria-hidden
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[9px] leading-none"
            >
              ▾
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && visible && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-2 max-h-80 w-72 overflow-y-auto border-[3px]"
            style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
          >
            {snap.jobs.map((job) => (
              <JobRow key={job.id} job={job} onDismiss={() => void dismissJob(job.id)} />
            ))}

            {snap.failed > 0 && (
              <button
                type="button"
                onClick={() => void retryFailed()}
                className="w-full border-t-[3px] px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.18em] transition-colors hover:[background:var(--lv-ink)] hover:[color:var(--lv-bg)]"
                style={{ borderColor: "var(--lv-ink)" }}
              >
                ↻ retry all failed
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JobRow({
  job,
  onDismiss,
}: {
  job: JobSummary;
  onDismiss: () => void;
}) {
  const failed = job.status === "failed";
  return (
    <div
      className="flex flex-col gap-1 border-b-[1px] px-3 py-2"
      style={{ borderColor: "var(--lv-rule)" }}
    >
      <div className="flex items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
        <span style={{ color: failed ? "var(--lv-accent)" : "var(--lv-ink)" }}>
          {STATUS_COPY[job.status]} · {job.shots} shot{job.shots === 1 ? "" : "s"}
        </span>
        {failed && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 transition-colors hover:[color:var(--lv-accent)]"
            style={{ color: "var(--lv-ink-2)" }}
            aria-label="dismiss"
          >
            ✕
          </button>
        )}
      </div>
      {job.error && (
        <p
          className="break-words font-mono text-[9px] leading-relaxed"
          style={{ color: "var(--lv-ink-2)" }}
        >
          {job.error}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <motion.span
      aria-hidden
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: "var(--lv-accent)" }}
      animate={{ opacity: [1, 0.2, 1] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
