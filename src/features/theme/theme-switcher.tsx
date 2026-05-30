"use client";

import { motion } from "motion/react";
import type { Mode } from "./config";

export function ThemeSwitcher({
  mode,
  onToggle,
}: {
  mode: Mode;
  onToggle: () => void;
}) {
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "switch to light mode" : "switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "switch to light" : "switch to dark"}
      className="group relative inline-flex items-center gap-2 overflow-hidden border-[3px] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em]"
      style={{ borderColor: "var(--lv-ink)", background: "var(--lv-bg)" }}
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
        style={{ background: "var(--lv-accent)" }}
      />
      <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center transition-colors duration-300 group-hover:text-[color:var(--lv-bg)]">
        <motion.span
          key={mode}
          initial={{ rotate: -120, opacity: 0, scale: 0.4 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.2, 0.65, 0.3, 1] }}
          className="absolute inset-0 flex items-center justify-center text-[13px] leading-none"
        >
          {isDark ? "☾" : "☀"}
        </motion.span>
      </span>
      <span className="relative inline-block min-w-[2.6em] text-left transition-colors duration-300 group-hover:text-[color:var(--lv-bg)]">
        {isDark ? "dark" : "light"}
      </span>
    </button>
  );
}
