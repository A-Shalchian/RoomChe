"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { computeStats } from "./stats";
import type { DashboardItem } from "./types";

export function StatStrip({ items, now }: { items: DashboardItem[]; now: number }) {
  const stats = useMemo(() => computeStats(items, now), [items, now]);
  if (stats.total === 0) return null;

  const cards: { value: string; label: string; accent?: boolean }[] = [];

  if (stats.letGo.length > 0) {
    cards.push({
      value: String(stats.letGo.length),
      label:
        stats.oldestLetGoDays !== null
          ? `flagged to let go · oldest ${stats.oldestLetGoDays}d`
          : "flagged to let go",
      accent: true,
    });
  }

  if (stats.unjudged > 0) {
    cards.push({
      value: String(stats.unjudged),
      label: "still undecided",
    });
  }

  if (stats.untouched.length > 0) {
    cards.push({
      value: String(stats.untouched.length),
      label: "never looked at again",
    });
  }

  if (stats.topLocation) {
    cards.push({
      value: String(stats.topLocation.count),
      label: `pile up in ${stats.topLocation.name}`,
    });
  }

  if (cards.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="mt-7 grid grid-cols-2 gap-[3px] border-[3px] sm:grid-cols-4"
      style={{ borderColor: "var(--lv-ink)", background: "var(--lv-ink)" }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          className="flex flex-col gap-1 px-4 py-3"
          style={{ background: "var(--lv-bg)" }}
        >
          <span
            className="font-mono text-[26px] leading-none tabular-nums"
            style={{ color: c.accent ? "var(--lv-accent)" : "var(--lv-ink)" }}
          >
            {c.value}
          </span>
          <span className="font-mono text-[9px] uppercase leading-tight tracking-[0.16em] text-[color:var(--lv-ink-2)]">
            {c.label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}
