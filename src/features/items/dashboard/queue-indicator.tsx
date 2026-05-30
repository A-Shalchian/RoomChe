"use client";

import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useProcessQueue } from "./process-queue";

export function QueueIndicator() {
  const router = useRouter();
  const { snap, retryFailed, clearDone } = useProcessQueue();
  const active = snap.pending + snap.running;
  const visible = active > 0 || snap.failed > 0;

  useEffect(() => {
    if (active === 0 && snap.done === 0) return;
    if (active === 0 && snap.done > 0) {
      router.refresh();
      void clearDone();
    }
  }, [active, snap.done, router, clearDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
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
            <button
              type="button"
              onClick={() => void retryFailed()}
              className="inline-flex items-center gap-1.5 transition-colors hover:[color:var(--lv-accent)]"
              style={{ color: "var(--lv-accent)" }}
              title="retry failed"
            >
              ✕ {snap.failed} failed
              <span className="opacity-60">↻</span>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
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
